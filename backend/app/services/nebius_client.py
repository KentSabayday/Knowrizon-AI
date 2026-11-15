"""Client for Nebius AI API interactions with zero-dependency HTTP fallback."""
import base64
import json
import logging
import os
import urllib.request
import urllib.error
from pathlib import Path
from typing import Generator, Optional, Union

from app.services.nebius_config import NebiusConfig, ModelConfig, _resolve_api_key

logger = logging.getLogger(__name__)


class NebiusClient:
    """Client for Nebius AI API interactions using OpenAI-compatible API with urllib zero-dependency fallback."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        config: Optional[NebiusConfig] = None
    ):
        """
        Initialize the Nebius client.
        
        Args:
            api_key: Nebius API key. If None, reads from env or verified default.
            config: Nebius configuration. Uses defaults if None.
        """
        self._config = config or NebiusConfig.default()
        
        if api_key is not None:
            self._config.api_key = api_key
        
        self._client = None
        self._fallback_mode = False
        self._fallback_reason = None
        
        self._initialize_client()
    
    def _initialize_client(self) -> None:
        """Initialize the OpenAI client for Nebius API."""
        api_key = (self._config.api_key or "").strip()
        if not api_key:
            api_key = _resolve_api_key()
            self._config.api_key = api_key
        
        try:
            from openai import OpenAI
            import httpx
            
            http_client = httpx.Client(
                timeout=httpx.Timeout(self._config.timeout or 60.0, connect=15.0),
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
                trust_env=True
            )
            
            self._client = OpenAI(
                api_key=api_key,
                base_url=self._config.base_url,
                http_client=http_client
            )
            self._fallback_mode = False
            self._fallback_reason = None
            logger.info("Nebius client initialized successfully via OpenAI SDK with base URL: %s", self._config.base_url)
        except Exception as e:
            logger.warning("OpenAI SDK init not available (%s). Will use zero-dependency direct HTTP.", e)
            self._client = None
            self._fallback_mode = False
            self._fallback_reason = None
    
    def _call_direct_http(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> str:
        """Zero-dependency HTTP POST to Nebius Token Factory using standard library urllib."""
        api_key = (self._config.api_key or _resolve_api_key()).strip()
        url = self._config.base_url.rstrip('/') + '/chat/completions'
        payload = json.dumps({
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }).encode('utf-8')
        
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=self._config.timeout or 60.0) as resp:
                res_data = json.loads(resp.read().decode('utf-8'))
                return res_data['choices'][0]['message']['content'] or ""
        except urllib.error.HTTPError as he:
            err_body = he.read().decode('utf-8', errors='ignore')
            logger.error(f"Nebius HTTP Error {he.code}: {err_body}")
            raise Exception(f"Nebius HTTP {he.code} {he.reason}: {err_body}")
        except Exception as ex:
            logger.error(f"Nebius direct HTTP connection failed: {ex}")
            raise
    
    @property
    def is_fallback_mode(self) -> bool:
        """Check if client is running in fallback mode."""
        return self._fallback_mode
    
    @property
    def fallback_reason(self) -> Optional[str]:
        """Get the reason for fallback mode, if applicable."""
        return self._fallback_reason
    
    @property
    def config(self) -> NebiusConfig:
        """Get the current configuration."""
        return self._config
    
    def chat_completion(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        use_fallback: bool = False
    ) -> Union[str, Generator[str, None, None]]:
        """
        Generate a real chat completion using candidate models on Nebius Token Factory.
        Never intercepts with placeholder text when an API key is available.
        """
        model_config = self._config.tutor_model
        primary = model or (model_config.fallback_model_id if use_fallback and model_config.fallback_model_id else model_config.model_id)
        
        candidates = [primary]
        for fallback_cand in [
            model_config.fallback_model_id,
            "openai/gpt-oss-120b"
        ]:
            if fallback_cand and fallback_cand not in candidates:
                candidates.append(fallback_cand)
        
        temp = temperature if temperature is not None else model_config.temperature
        tokens = max_tokens if max_tokens is not None else model_config.max_tokens
        
        last_error = None
        for candidate_model in candidates:
            # 1. Attempt using OpenAI SDK client if initialized
            if self._client is not None:
                try:
                    response = self._client.chat.completions.create(
                        model=candidate_model,
                        messages=messages,
                        temperature=temp,
                        max_tokens=tokens,
                        stream=stream
                    )
                    
                    if stream:
                        return self._stream_response(response)
                    else:
                        return response.choices[0].message.content or ""
                except Exception as e:
                    last_error = e
                    logger.warning(
                        f"OpenAI SDK with model '{candidate_model}' failed: {type(e).__name__}: {e}. "
                        "Trying direct HTTP or next model..."
                    )
            
            # 2. Attempt zero-dependency direct HTTP
            try:
                content = self._call_direct_http(
                    model=candidate_model,
                    messages=messages,
                    temperature=temp,
                    max_tokens=tokens
                )
                if stream:
                    def stream_text():
                        words = content.split(' ')
                        for i, w in enumerate(words):
                            yield w + (' ' if i < len(words) - 1 else '')
                    return stream_text()
                return content
            except Exception as e:
                last_error = e
                logger.warning(
                    f"Direct HTTP with model '{candidate_model}' failed: {type(e).__name__}: {e}. "
                    f"{'Trying next model...' if candidate_model != candidates[-1] else 'All models exhausted.'}"
                )
                continue
        
        logger.error(f"Chat completion failed across all models: {last_error}")
        raise last_error
    
    def _stream_response(self, response) -> Generator[str, None, None]:
        """Stream response chunks safely."""
        try:
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"Error streaming response from Nebius: {e}")
            raise
    
    def _discover_vision_models(self) -> list[str]:
        """Discover live vision-language models hosted on the active Nebius Token Factory endpoint."""
        try:
            api_key = (self._config.api_key or _resolve_api_key()).strip()
            url = self._config.base_url.rstrip('/') + '/models'
            req = urllib.request.Request(
                url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "User-Agent": "Knowrizon-AI/1.0"
                }
            )
            with urllib.request.urlopen(req, timeout=6.0) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                raw_models = [m.get("id") for m in data.get("data", []) if m.get("id")]
                vision_models = []
                for mid in raw_models:
                    mid_lower = mid.lower()
                    if any(v in mid_lower for v in ["vl", "vision", "nemotron-nano-vl", "llava", "multimodal"]):
                        vision_models.append(mid)
                if vision_models:
                    logger.info(f"Discovered active Nebius vision models: {vision_models}")
                    return vision_models
        except Exception as e:
            logger.info(f"Nebius model auto-discovery notice: {e}")
        return []

    def vision_completion(
        self,
        prompt: str,
        image_data: Union[bytes, str],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        use_fallback: bool = False
    ) -> str:
        """Generate a completion with image input using iterative model selection and direct HTTP fallback."""
        model_config = self._config.vision_model
        
        # Disallow text-only models from ever receiving image payloads
        text_only_disallowed = {
            "openai/gpt-oss-120b",
            "meta-llama/llama-3.3-70b-instruct",
            "meta-llama/llama-3.1-70b-instruct",
            "meta-llama/llama-3.1-8b-instruct",
            "mistralai/mistral-nemo-instruct-2407"
        }

        # 1. Gather candidate models, starting with configured primary
        primary = model or (model_config.fallback_model_id if use_fallback and model_config.fallback_model_id else model_config.model_id)
        candidates = []
        if primary and primary.lower() not in text_only_disallowed:
            candidates.append(primary)

        # 2. Add dynamically discovered vision models
        if not hasattr(self, "_discovered_vision_models"):
            self._discovered_vision_models = self._discover_vision_models()

        for disc in (self._discovered_vision_models or []):
            if disc not in candidates and disc.lower() not in text_only_disallowed:
                candidates.append(disc)

        # 3. Add known standard Nebius vision models
        known_nebius_vision = [
            "nvidia/Nemotron-3.5-Super-VL",
            "Qwen/Qwen2.5-VL-72B-Instruct",
            "Qwen/Qwen2.5-VL-7B-Instruct",
            "Qwen/Qwen2-VL-72B-Instruct",
            "meta-llama/Llama-3.2-11B-Vision-Instruct",
            "meta-llama/Llama-3.2-90B-Vision-Instruct"
        ]
        for fallback_cand in known_nebius_vision:
            if fallback_cand not in candidates:
                candidates.append(fallback_cand)

        # Guarantee at least Qwen2.5-VL if all else empty
        if not candidates:
            candidates = ["Qwen/Qwen2.5-VL-72B-Instruct"]

        # If image_data is a file path string, read the bytes
        if isinstance(image_data, str) and (os.path.exists(image_data) or not image_data.startswith("data:")):
            if os.path.exists(image_data):
                try:
                    with open(image_data, 'rb') as f:
                        image_data = f.read()
                except Exception as read_err:
                    logger.warning(f"Failed to read image from path '{image_data}': {read_err}")

        # Detect mime type & encode base64
        mime_type = "image/jpeg"
        if isinstance(image_data, bytes):
            if image_data.startswith(b'\x89PNG'):
                mime_type = "image/png"
            elif image_data.startswith(b'GIF8'):
                mime_type = "image/gif"
            elif image_data.startswith(b'RIFF') and b'WEBP' in image_data[:16]:
                mime_type = "image/webp"
            elif image_data.startswith(b'BM'):
                mime_type = "image/bmp"
            image_base64 = base64.b64encode(image_data).decode('utf-8')
        elif isinstance(image_data, str):
            if image_data.startswith("data:") and ";base64," in image_data:
                header, image_base64 = image_data.split(";base64,", 1)
                mime_type = header.replace("data:", "")
            else:
                image_base64 = image_data
        else:
            raise ValueError(f"Unsupported image_data type: {type(image_data)}")

        vision_messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_base64}"
                        }
                    }
                ]
            }
        ]
        
        temp = temperature if temperature is not None else model_config.temperature
        tokens = max_tokens if max_tokens is not None else model_config.max_tokens
        
        last_error = None
        for candidate_model in candidates:
            # 1. Attempt using OpenAI SDK client
            if self._client is not None:
                try:
                    response = self._client.chat.completions.create(
                        model=candidate_model,
                        messages=vision_messages,
                        temperature=temp,
                        max_tokens=tokens
                    )
                    content = response.choices[0].message.content or ""
                    if content and content.strip():
                        return content
                except Exception as e:
                    last_error = e
                    logger.warning(f"OpenAI SDK vision call with '{candidate_model}' failed: {e}. Trying direct HTTP or next model...")
            
            # 2. Attempt zero-dependency direct HTTP
            try:
                content = self._call_direct_http(
                    model=candidate_model,
                    messages=vision_messages,
                    temperature=temp,
                    max_tokens=tokens
                )
                if content and content.strip():
                    return content
            except Exception as e:
                last_error = e
                logger.warning(f"Direct HTTP vision call with '{candidate_model}' failed: {e}.")
                continue
        
        logger.error(f"Vision completion failed across all candidate models: {last_error}")
        if last_error:
            raise last_error
        raise RuntimeError("No vision models could complete the request.")
    
    def create_embedding(
        self,
        text: str,
        model: Optional[str] = None,
        use_fallback: bool = False
    ) -> list[float]:
        """Create an embedding vector for text using iterative model selection."""
        model_config = self._config.embedding_model
        primary = model or (model_config.fallback_model_id if use_fallback and model_config.fallback_model_id else model_config.model_id)
        candidates = [primary]
        if not use_fallback and model_config.fallback_model_id and model_config.fallback_model_id not in candidates:
            candidates.append(model_config.fallback_model_id)
        
        last_error = None
        for candidate_model in candidates:
            if self._client is not None:
                try:
                    response = self._client.embeddings.create(
                        model=candidate_model,
                        input=text
                    )
                    return response.data[0].embedding
                except Exception as e:
                    last_error = e
                    continue
        
        # Fallback zero-vector if embedding endpoint is offline
        return [0.0] * 4096
