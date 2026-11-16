"""
Client for Nebius AI API interactions enforcing the 3-model policy with strict boundary validation.
"""
import base64
import io
import json
import logging
import math
import os
import urllib.request
import urllib.error
from pathlib import Path
from typing import Generator, List, Optional, Union, Dict, Any

from app.services.nebius_config import NebiusConfig, ModelConfig, _resolve_api_key
from app.services.nebius_policy import (
    NebiusOperation,
    PinnedModelRoute,
    PINNED_ROUTES,
    validate_operation_route,
    validate_outbound_request,
    PolicyViolationError,
)

logger = logging.getLogger(__name__)


def _sanitize_log_metadata(meta: Dict[str, Any]) -> Dict[str, Any]:
    """Redact sensitive credentials, prompt text, embeddings, and image payloads from logs."""
    safe = {}
    for k, v in meta.items():
        if k in ("api_key", "authorization", "token", "password"):
            safe[k] = "[REDACTED]"
        elif k in ("prompt", "messages", "text", "content"):
            safe[k] = f"[TEXT: {len(str(v))} chars]"
        elif k in ("image_data", "image_base64", "file_data"):
            safe[k] = f"[IMAGE_BYTES: {len(v) if hasattr(v, '__len__') else 'present'}]"
        elif k in ("embedding", "embeddings", "vectors"):
            safe[k] = "[EMBEDDING_VECTORS]"
        else:
            safe[k] = v
    return safe


class SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Prevent redirects from escaping approved Nebius regional endpoints or changing schemes."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        from app.services.nebius_policy import APPROVED_HOSTS
        from urllib.parse import urlparse
        parsed = urlparse(newurl)
        if parsed.scheme.lower() != "https" or parsed.netloc.lower() not in APPROVED_HOSTS:
            logger.error("Security alert: Attempted unauthorized redirect to %s", newurl)
            raise PolicyViolationError(f"Unauthorized redirect target: {newurl}")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class NebiusClient:
    """
    Client for Nebius AI Token Factory enforcing strictly three pinned models across two regions:
    1. General Text / Chat: openai/gpt-oss-120b in eu-north1 (POST /chat/completions)
    2. Embeddings: Qwen/Qwen3-Embedding-8B in eu-north1 (POST /embeddings)
    3. Vision Analysis: Qwen/Qwen3.8-27B in us-central1 (POST /chat/completions)
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        config: Optional[NebiusConfig] = None
    ):
        self._config = config or NebiusConfig.default()
        if api_key is not None:
            self._config.api_key = api_key

        self._eu_client = None
        self._us_client = None
        self._sdk_available = False

        self._initialize_clients()

    def _initialize_clients(self) -> None:
        """Initialize regional OpenAI SDK clients with disabled SDK-internal retries."""
        api_key = (self._config.api_key or "").strip()
        if not api_key:
            api_key = _resolve_api_key()
            self._config.api_key = api_key

        if not api_key:
            logger.info("Nebius API key not set. SDK clients not initialized.")
            return

        try:
            from openai import OpenAI
            import httpx

            # EU Client: General Text & Embeddings
            eu_http_client = httpx.Client(
                timeout=httpx.Timeout(self._config.timeout or 60.0, connect=15.0),
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
                trust_env=True
            )
            self._eu_client = OpenAI(
                api_key=api_key,
                base_url=self._config.eu_base_url,
                max_retries=0,  # Application owns retry budget
                http_client=eu_http_client
            )

            # US Client: Vision Analysis
            us_http_client = httpx.Client(
                timeout=httpx.Timeout(self._config.timeout or 60.0, connect=15.0),
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
                trust_env=True
            )
            self._us_client = OpenAI(
                api_key=api_key,
                base_url=self._config.us_base_url,
                max_retries=0,  # Application owns retry budget
                http_client=us_http_client
            )

            self._sdk_available = True
            logger.info(
                "Nebius SDK initialized: EU (eu-north1) and US (us-central1) with max_retries=0"
            )
        except Exception as e:
            logger.warning("OpenAI SDK init not available (%s). Using zero-dependency direct HTTP.", e)
            self._eu_client = None
            self._us_client = None
            self._sdk_available = False

    @property
    def config(self) -> NebiusConfig:
        return self._config

    def _call_direct_http(
        self,
        route: PinnedModelRoute,
        payload: dict,
        timeout: Optional[float] = None
    ) -> dict:
        """
        Execute raw HTTP POST request to verified Nebius Token Factory endpoint.
        Validates the outbound URL and serialized model immediately prior to dispatch.
        """
        api_key = (self._config.api_key or _resolve_api_key()).strip()
        if not api_key:
            raise RuntimeError("Nebius API key is missing. Set NEBIUS_API_KEY environment variable.")

        url = route.full_url
        model_name = payload.get("model", "")
        
        # Immediate outbound firewall check
        validate_outbound_request(url, model_name, route.operation)

        serialized = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=serialized,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
                "User-Agent": "KnowRizon-AI/2.0"
            },
            method="POST"
        )

        opener = urllib.request.build_opener(SafeRedirectHandler())
        call_timeout = timeout or self._config.timeout or 60.0

        try:
            with opener.open(req, timeout=call_timeout) as resp:
                resp_bytes = resp.read()
                return json.loads(resp_bytes.decode("utf-8"))
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8", errors="ignore")
            logger.error("Nebius HTTP %d at %s: [Body size %d]", he.code, url, len(err_body))
            raise RuntimeError(f"Nebius HTTP {he.code} {he.reason}: {err_body}") from he
        except Exception as ex:
            logger.error("Nebius direct HTTP connection to %s failed: %s", url, ex)
            raise

    # ══════════════════════════════════════════════════════════════
    # CAPABILITY 1: GENERAL TEXT / TUTORING / QUIZZES
    # ══════════════════════════════════════════════════════════════

    def chat_completion(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        use_fallback: bool = False,
        feature: str = "chat"
    ) -> Union[str, Generator[str, None, None]]:
        """
        Generate text completion strictly using 'openai/gpt-oss-120b' at the EU endpoint.
        Reject all aliases, overrides, or cross-operation substitutions.
        """
        route = validate_operation_route(NebiusOperation.GENERAL_TEXT, model_id=model)
        temp = temperature if temperature is not None else self._config.tutor_model.temperature
        tokens = max_tokens if max_tokens is not None else self._config.tutor_model.max_tokens

        log_meta = {
            "feature": feature,
            "operation": route.operation.value,
            "model_id": route.model_id,
            "region": route.region,
            "stream": stream
        }
        logger.info("Executing General Text request: %s", _sanitize_log_metadata(log_meta))

        # 1. Prefer OpenAI SDK if initialized
        if self._sdk_available and self._eu_client is not None:
            try:
                response = self._eu_client.chat.completions.create(
                    model=route.model_id,
                    messages=messages,
                    temperature=temp,
                    max_tokens=tokens,
                    stream=stream
                )
                if stream:
                    return self._stream_response(response)
                return response.choices[0].message.content or ""
            except Exception as e:
                logger.error("OpenAI SDK general chat failed: %s", e)
                raise

        # 2. Direct HTTP implementation
        payload = {
            "model": route.model_id,
            "messages": messages,
            "temperature": temp,
            "max_tokens": tokens
        }
        res_data = self._call_direct_http(route, payload)
        content = res_data["choices"][0]["message"]["content"] or ""

        if stream:
            def _fake_stream():
                words = content.split(" ")
                for i, w in enumerate(words):
                    yield w + (" " if i < len(words) - 1 else "")
            return _fake_stream()

        return content

    def _stream_response(self, response) -> Generator[str, None, None]:
        """Stream chunks safely. Once output starts, report interruption without replaying."""
        yielded_any = False
        try:
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    yielded_any = True
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error("Stream interrupted during generation: %s", e)
            if yielded_any:
                yield "\n\n[Generation interrupted due to connection drop]"
            raise

    # ══════════════════════════════════════════════════════════════
    # CAPABILITY 2: VISION ANALYSIS (IMAGES & VIDEO FRAMES)
    # ══════════════════════════════════════════════════════════════

    def vision_completion(
        self,
        prompt: str,
        image_data: Union[bytes, str],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        use_fallback: bool = False,
        feature: str = "vision"
    ) -> str:
        """
        Analyze visual materials strictly using 'Qwen/Qwen3.8-27B' at the US endpoint.
        Receives real image bytes or video frames. Rejects empty data, text-only placeholders.
        """
        route = validate_operation_route(NebiusOperation.VISION, model_id=model)
        temp = temperature if temperature is not None else self._config.vision_model.temperature
        tokens = max_tokens if max_tokens is not None else self._config.vision_model.max_tokens

        # Process and validate image input
        raw_bytes: bytes = b""
        mime_type = "image/png"

        if isinstance(image_data, bytes):
            raw_bytes = image_data
        elif isinstance(image_data, str):
            if image_data.startswith("data:") and ";base64," in image_data:
                header, b64_str = image_data.split(";base64,", 1)
                mime_type = header.replace("data:", "")
                raw_bytes = base64.b64decode(b64_str)
            elif os.path.exists(image_data):
                with open(image_data, "rb") as f:
                    raw_bytes = f.read()
            else:
                # Direct base64 string
                try:
                    raw_bytes = base64.b64decode(image_data)
                except Exception:
                    raise ValueError("image_data string is neither an existing file path nor valid base64.")
        else:
            raise ValueError(f"Unsupported image_data type: {type(image_data)}")

        if not raw_bytes or len(raw_bytes) < 8:
            raise ValueError("image_data contains insufficient bytes for vision processing.")

        # Detect or verify format from magic bytes
        if raw_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            mime_type = "image/png"
        elif raw_bytes.startswith(b"\xff\xd8\xff"):
            mime_type = "image/jpeg"
        elif raw_bytes.startswith(b"GIF8"):
            mime_type = "image/gif"
        elif raw_bytes.startswith(b"RIFF") and b"WEBP" in raw_bytes[:16]:
            mime_type = "image/webp"
        elif raw_bytes.startswith(b"BM"):
            mime_type = "image/bmp"

        # Bound payload size: max 12 MB
        if len(raw_bytes) > 12 * 1024 * 1024:
            try:
                from PIL import Image
                img = Image.open(io.BytesIO(raw_bytes))
                img.thumbnail((1600, 1600))
                out_buf = io.BytesIO()
                img.save(out_buf, format="PNG")
                raw_bytes = out_buf.getvalue()
                mime_type = "image/png"
            except Exception as e:
                logger.warning("Could not downscale large image: %s", e)

        image_base64 = base64.b64encode(raw_bytes).decode("utf-8")
        data_url = f"data:{mime_type};base64,{image_base64}"

        vision_messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url}
                    }
                ]
            }
        ]

        log_meta = {
            "feature": feature,
            "operation": route.operation.value,
            "model_id": route.model_id,
            "region": route.region,
            "bytes_size": len(raw_bytes),
            "mime_type": mime_type
        }
        logger.info("Executing Vision request: %s", _sanitize_log_metadata(log_meta))

        # 1. Prefer OpenAI SDK US client if available
        if self._sdk_available and self._us_client is not None:
            try:
                response = self._us_client.chat.completions.create(
                    model=route.model_id,
                    messages=vision_messages,
                    temperature=temp,
                    max_tokens=tokens
                )
                content = response.choices[0].message.content or ""
                if not content.strip():
                    raise RuntimeError("Nebius vision model returned an empty response.")
                return content
            except Exception as e:
                logger.error("OpenAI SDK vision call failed: %s", e)
                raise

        # 2. Direct HTTP to US endpoint
        payload = {
            "model": route.model_id,
            "messages": vision_messages,
            "temperature": temp,
            "max_tokens": tokens
        }
        res_data = self._call_direct_http(route, payload)
        content = res_data["choices"][0]["message"]["content"] or ""
        if not content.strip():
            raise RuntimeError("Nebius vision model returned an empty response.")
        return content

    # ══════════════════════════════════════════════════════════════
    # CAPABILITY 3: TEXT EMBEDDINGS (RETRIEVAL & VECTOR SEARCH)
    # ══════════════════════════════════════════════════════════════

    def create_embedding(
        self,
        text: Union[str, List[str]],
        model: Optional[str] = None,
        use_fallback: bool = False,
        feature: str = "embeddings"
    ) -> Union[List[float], List[List[float]]]:
        """
        Generate embeddings strictly using 'Qwen/Qwen3-Embedding-8B' at the EU endpoint.
        Validates response count, non-zero float contents, and exact 4,096 dimension.
        NEVER returns fabricated zero-vectors.
        """
        route = validate_operation_route(NebiusOperation.EMBEDDINGS, model_id=model)
        is_batch = isinstance(text, list)
        inputs = [t.strip() for t in text] if is_batch else [str(text).strip()]

        if not inputs or any(len(t) == 0 for t in inputs):
            raise ValueError("Embedding input text cannot be empty.")

        log_meta = {
            "feature": feature,
            "operation": route.operation.value,
            "model_id": route.model_id,
            "region": route.region,
            "input_count": len(inputs)
        }
        logger.info("Executing Embedding request: %s", _sanitize_log_metadata(log_meta))

        embeddings: List[List[float]] = []

        # 1. Prefer OpenAI SDK EU client
        if self._sdk_available and self._eu_client is not None:
            try:
                response = self._eu_client.embeddings.create(
                    model=route.model_id,
                    input=inputs
                )
                data_items = sorted(response.data, key=lambda x: x.index)
                embeddings = [item.embedding for item in data_items]
            except Exception as e:
                logger.error("OpenAI SDK embedding call failed: %s", e)
                raise
        else:
            # 2. Direct HTTP to EU /embeddings endpoint
            payload = {
                "model": route.model_id,
                "input": inputs if is_batch else inputs[0]
            }
            res_data = self._call_direct_http(route, payload)
            data_items = sorted(res_data.get("data", []), key=lambda x: x.get("index", 0))
            embeddings = [item.get("embedding", []) for item in data_items]

        # Rigorous validation of returned vectors
        expected_dim = route.expected_dim or 4096
        if len(embeddings) != len(inputs):
            raise RuntimeError(
                f"Nebius embedding count mismatch: expected {len(inputs)}, got {len(embeddings)}."
            )

        for idx, vec in enumerate(embeddings):
            if not isinstance(vec, list) or len(vec) != expected_dim:
                raise RuntimeError(
                    f"Nebius embedding dimension mismatch for item {idx}: "
                    f"expected {expected_dim}, got {len(vec) if isinstance(vec, list) else type(vec)}."
                )
            if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in vec):
                raise RuntimeError(f"Embedding contains non-finite numeric values at item {idx}.")
            if all(v == 0.0 for v in vec):
                raise RuntimeError(f"Rejected invalid all-zero embedding returned from provider at item {idx}.")

        return embeddings if is_batch else embeddings[0]


# Global singleton instance
nebius_client = NebiusClient()

