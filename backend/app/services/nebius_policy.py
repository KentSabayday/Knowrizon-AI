"""
Nebius Token Factory Model Policy & Outbound Request Boundary.

Enforces strictly and immutably three approved Nebius Token Factory models:
1. General Text / Tutoring / Quizzes:
   - Operation: 'general_text'
   - Exact Model ID: 'openai/gpt-oss-120b'
   - Regional Base URL: 'https://api.tokenfactory.eu-north1.nebius.com/v1/'
   - API Path: '/chat/completions'

2. Text Embeddings & Retrieval:
   - Operation: 'embeddings'
   - Exact Model ID: 'Qwen/Qwen3-Embedding-8B'
   - Regional Base URL: 'https://api.tokenfactory.eu-north1.nebius.com/v1/'
   - API Path: '/embeddings'
   - Expected Vector Dimension: 4,096

3. Vision / Images / Video Frames:
   - Operation: 'vision'
   - Exact Model ID: 'Qwen/Qwen3.8-27B'
   - Regional Base URL: 'https://api.tokenfactory.us-central1.nebius.com/v1/'
   - API Path: '/chat/completions'

All other IDs, aliases (-fast), variants, empty strings, and cross-operation
substitutions are strictly rejected before any network I/O.
"""
from dataclasses import dataclass
from enum import Enum
import re
from typing import Final, Optional, Set, Tuple, Union
from urllib.parse import urlparse


class NebiusOperation(str, Enum):
    """Canonical operations supported by the Nebius Token Factory integration."""
    GENERAL_TEXT = "general_text"
    EMBEDDINGS = "embeddings"
    VISION = "vision"


@dataclass(frozen=True)
class PinnedModelRoute:
    """Immutable route configuration for an approved Nebius capability."""
    operation: NebiusOperation
    model_id: str
    base_url: str
    api_path: str
    region: str
    expected_dim: Optional[int] = None
    description: str = ""

    @property
    def full_url(self) -> str:
        """Construct canonical full endpoint URL ensuring exactly one /v1 prefix."""
        base = self.base_url.rstrip("/")
        path = self.api_path.lstrip("/")
        return f"{base}/{path}"


# The three immutable, server-side pinned routes
PINNED_ROUTES: Final[dict[NebiusOperation, PinnedModelRoute]] = {
    NebiusOperation.GENERAL_TEXT: PinnedModelRoute(
        operation=NebiusOperation.GENERAL_TEXT,
        model_id="openai/gpt-oss-120b",
        base_url="https://api.tokenfactory.eu-north1.nebius.com/v1/",
        api_path="/chat/completions",
        region="eu-north1",
        description="General text, tutoring, quizzes, text content processing, and general text retries or fallback"
    ),
    NebiusOperation.EMBEDDINGS: PinnedModelRoute(
        operation=NebiusOperation.EMBEDDINGS,
        model_id="Qwen/Qwen3-Embedding-8B",
        base_url="https://api.tokenfactory.eu-north1.nebius.com/v1/",
        api_path="/embeddings",
        region="eu-north1",
        expected_dim=4096,
        description="Text embeddings for documents and retrieval queries"
    ),
    NebiusOperation.VISION: PinnedModelRoute(
        operation=NebiusOperation.VISION,
        model_id="Qwen/Qwen3.8-27B",
        base_url="https://api.tokenfactory.us-central1.nebius.com/v1/",
        api_path="/chat/completions",
        region="us-central1",
        description="Images, diagrams, rendered PDF pages, and video frame analysis"
    ),
}

# Approved Exact Case-Sensitive Model IDs
APPROVED_MODEL_IDS: Final[Set[str]] = frozenset([
    "openai/gpt-oss-120b",
    "Qwen/Qwen3-Embedding-8B",
    "Qwen/Qwen3.8-27B"
])

# Approved Regional Base URLs (HTTPS only)
APPROVED_BASE_URLS: Final[Set[str]] = frozenset([
    "https://api.tokenfactory.eu-north1.nebius.com/v1/",
    "https://api.tokenfactory.us-central1.nebius.com/v1/"
])

# Approved Hostnames for outbound request firewall
APPROVED_HOSTS: Final[Set[str]] = frozenset([
    "api.tokenfactory.eu-north1.nebius.com",
    "api.tokenfactory.us-central1.nebius.com"
])


class PolicyViolationError(ValueError):
    """Raised when an outbound request attempts to violate the Nebius Model Policy."""
    pass


def normalize_operation(op: Union[str, NebiusOperation]) -> NebiusOperation:
    """Normalize input string to canonical NebiusOperation."""
    if isinstance(op, NebiusOperation):
        return op
    val = (op or "").strip().lower()
    if val in ("general_text", "general", "chat", "text", "tutor", "quiz", "content"):
        return NebiusOperation.GENERAL_TEXT
    elif val in ("embeddings", "embedding", "embed"):
        return NebiusOperation.EMBEDDINGS
    elif val in ("vision", "image", "video"):
        return NebiusOperation.VISION
    raise PolicyViolationError(
        f"Unknown or unsupported Nebius operation '{op}'. "
        f"Allowed operations: {[o.value for o in NebiusOperation]}"
    )


def validate_operation_route(
    operation: Union[str, NebiusOperation],
    model_id: Optional[str] = None,
    base_url: Optional[str] = None,
    api_path: Optional[str] = None
) -> PinnedModelRoute:
    """
    Validate that an operation, model ID, and endpoint adhere strictly to the 3-model policy.
    
    Rejects:
    - Any model ID that is not an approved ID.
    - Any approved ID used for the wrong operation (e.g. gpt-oss-120b for vision).
    - Model aliases (e.g. containing '-fast' or lowercase variants).
    - Non-approved base URLs or mismatched regions.
    - Path redirects.
    
    Returns:
        PinnedModelRoute: The verified immutable route.
        
    Raises:
        PolicyViolationError: If any field deviates from the pinned route.
    """
    canonical_op = normalize_operation(operation)
    route = PINNED_ROUTES[canonical_op]

    # Validate model_id if provided
    if model_id is not None:
        trimmed_id = str(model_id).strip()
        if not trimmed_id:
            raise PolicyViolationError(f"Model ID cannot be empty for operation '{canonical_op.value}'.")
        
        # Check exact case-sensitive match against the operation's pinned ID
        if trimmed_id != route.model_id:
            if trimmed_id in APPROVED_MODEL_IDS:
                raise PolicyViolationError(
                    f"Cross-operation violation: Model '{trimmed_id}' is an approved Nebius model, "
                    f"but is invalid for operation '{canonical_op.value}'. "
                    f"Exact required model for '{canonical_op.value}' is '{route.model_id}'."
                )
            raise PolicyViolationError(
                f"Unauthorized model ID '{trimmed_id}' for operation '{canonical_op.value}'. "
                f"Must be exact pinned model '{route.model_id}'."
            )

    # Validate base_url if provided
    if base_url is not None:
        trimmed_url = str(base_url).strip()
        # Ensure trailing slash for normalized comparison
        if not trimmed_url.endswith("/"):
            trimmed_url += "/"
        if trimmed_url != route.base_url:
            raise PolicyViolationError(
                f"Regional endpoint mismatch: Base URL '{base_url}' is not allowed for operation "
                f"'{canonical_op.value}'. Exact required base URL is '{route.base_url}'."
            )

    # Validate api_path if provided
    if api_path is not None:
        trimmed_path = "/" + str(api_path).strip().lstrip("/")
        if trimmed_path != route.api_path:
            raise PolicyViolationError(
                f"API path mismatch: Path '{api_path}' is invalid for operation '{canonical_op.value}'. "
                f"Exact required path is '{route.api_path}'."
            )

    return route


def validate_outbound_request(url: str, serialized_model: str, expected_op: NebiusOperation) -> PinnedModelRoute:
    """
    Firewall guard executed immediately before network dispatch (urllib or HTTP client).
    Verifies destination host, path, HTTPS scheme, and serialized model name.
    """
    parsed = urlparse(url)
    if parsed.scheme.lower() != "https":
        raise PolicyViolationError(f"Insecure scheme '{parsed.scheme}'. Nebius requests must use HTTPS.")
    
    if parsed.netloc.lower() not in APPROVED_HOSTS:
        raise PolicyViolationError(
            f"Blocked outbound host '{parsed.netloc}'. Must be an approved Nebius host: {list(APPROVED_HOSTS)}"
        )
    
    route = PINNED_ROUTES[expected_op]
    
    # Path check: must end with the pinned api_path
    if not parsed.path.rstrip("/").endswith(route.api_path.lstrip("/")):
        raise PolicyViolationError(
            f"Blocked path '{parsed.path}' for operation '{expected_op.value}'. Expected '{route.api_path}'."
        )
    
    if serialized_model != route.model_id:
        raise PolicyViolationError(
            f"Payload model mismatch: Serialized '{serialized_model}' does not match pinned '{route.model_id}'."
        )
        
    return route
