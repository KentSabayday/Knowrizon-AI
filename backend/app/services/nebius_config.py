"""Configuration management for Nebius AI integration enforcing the 3-model policy."""
import json
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from app.services.nebius_policy import (
    PINNED_ROUTES,
    PinnedModelRoute,
    NebiusOperation,
    validate_operation_route,
    PolicyViolationError,
)

logger = logging.getLogger(__name__)


def _resolve_api_key() -> str:
    """Resolve Nebius API key strictly from environment or local .env files without hardcoded fallbacks."""
    key = os.environ.get("NEBIUS_API_KEY")
    if not key:
        from dotenv import load_dotenv
        backend_dir = Path(__file__).resolve().parent.parent.parent
        load_dotenv(dotenv_path=backend_dir / '.env')
        load_dotenv(dotenv_path=backend_dir.parent / '.env')
        load_dotenv()
        key = os.environ.get("NEBIUS_API_KEY", "")
    return (key or "").strip()


@dataclass
class ModelConfig:
    """Configuration for a specific AI model."""
    model_id: str
    temperature: float = 0.7
    max_tokens: int = 2048
    top_p: float = 1.0
    fallback_model_id: Optional[str] = None
    
    @classmethod
    def from_dict(cls, data: dict, operation: Optional[NebiusOperation] = None) -> "ModelConfig":
        """Create ModelConfig from dictionary, enforcing pinned model ID policy."""
        raw_id = data.get("model_id", "")
        # If operation is known, enforce exact pinned model
        if operation:
            pinned = PINNED_ROUTES[operation]
            model_id = pinned.model_id
            fallback_id = pinned.model_id
        else:
            model_id = raw_id
            fallback_id = data.get("fallback_model_id")

        return cls(
            model_id=model_id,
            temperature=float(data.get("temperature", 0.7)),
            max_tokens=int(data.get("max_tokens", 2048)),
            top_p=float(data.get("top_p", 1.0)),
            fallback_model_id=fallback_id
        )
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        result = {
            "model_id": self.model_id,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "top_p": self.top_p
        }
        if self.fallback_model_id:
            result["fallback_model_id"] = self.fallback_model_id
        return result
    
    def get_model_id_with_fallback(self, use_fallback: bool = False) -> str:
        """Get the model ID. Fallback is strictly the same pinned model."""
        if use_fallback and self.fallback_model_id:
            return self.fallback_model_id
        return self.model_id


@dataclass
class NebiusConfig:
    """Configuration for Nebius AI integration with immutable regional endpoints."""
    api_key: Optional[str]
    base_url: str = "https://api.tokenfactory.eu-north1.nebius.com/v1/"
    eu_base_url: str = "https://api.tokenfactory.eu-north1.nebius.com/v1/"
    us_base_url: str = "https://api.tokenfactory.us-central1.nebius.com/v1/"
    tutor_model: ModelConfig = field(default_factory=lambda: ModelConfig(
        model_id=PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].model_id,
        temperature=0.7,
        max_tokens=2048,
        fallback_model_id=PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].model_id
    ))
    quiz_model: ModelConfig = field(default_factory=lambda: ModelConfig(
        model_id=PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].model_id,
        temperature=0.3,
        max_tokens=8192,
        fallback_model_id=PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].model_id
    ))
    content_model: ModelConfig = field(default_factory=lambda: ModelConfig(
        model_id=PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].model_id,
        temperature=0.5,
        max_tokens=4096,
        fallback_model_id=PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].model_id
    ))
    vision_model: ModelConfig = field(default_factory=lambda: ModelConfig(
        model_id=PINNED_ROUTES[NebiusOperation.VISION].model_id,
        temperature=0.5,
        max_tokens=2048,
        fallback_model_id=PINNED_ROUTES[NebiusOperation.VISION].model_id
    ))
    embedding_model: ModelConfig = field(default_factory=lambda: ModelConfig(
        model_id=PINNED_ROUTES[NebiusOperation.EMBEDDINGS].model_id,
        fallback_model_id=PINNED_ROUTES[NebiusOperation.EMBEDDINGS].model_id
    ))
    retry_attempts: int = 3
    retry_delay: float = 1.0
    max_retry_delay: float = 30.0
    timeout: float = 60.0
    
    @classmethod
    def from_dict(cls, data: dict) -> "NebiusConfig":
        """Load configuration from a dictionary while enforcing the exact 3-model policy."""
        nebius_data = data.get("nebius", data)
        models_data = nebius_data.get("models", {})
        retry_data = nebius_data.get("retry", {})
        
        api_key = data.get("api_key") or _resolve_api_key()
        
        eu_url = PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].base_url
        us_url = PINNED_ROUTES[NebiusOperation.VISION].base_url
        
        tutor_data = models_data.get("tutor", {})
        quiz_data = models_data.get("quiz", {})
        content_data = models_data.get("content", {})
        vision_data = models_data.get("vision", {})
        embedding_data = models_data.get("embedding", {})

        return cls(
            api_key=api_key,
            base_url=eu_url,
            eu_base_url=eu_url,
            us_base_url=us_url,
            tutor_model=ModelConfig.from_dict(tutor_data, NebiusOperation.GENERAL_TEXT),
            quiz_model=ModelConfig.from_dict(quiz_data, NebiusOperation.GENERAL_TEXT),
            content_model=ModelConfig.from_dict(content_data, NebiusOperation.GENERAL_TEXT),
            vision_model=ModelConfig.from_dict(vision_data, NebiusOperation.VISION),
            embedding_model=ModelConfig.from_dict(embedding_data, NebiusOperation.EMBEDDINGS),
            retry_attempts=retry_data.get("max_attempts", 3),
            retry_delay=retry_data.get("base_delay", 1.0),
            max_retry_delay=retry_data.get("max_delay", 30.0),
            timeout=float(nebius_data.get("timeout", 60.0))
        )

    @classmethod
    def from_file(cls, path: str) -> "NebiusConfig":
        """Load configuration from JSON file while enforcing the exact 3-model policy."""
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return cls.from_dict(data)
    
    @classmethod
    def default(cls) -> "NebiusConfig":
        """Create default configuration adhering to the 3-model policy."""
        api_key = _resolve_api_key()
        eu_url = PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].base_url
        us_url = PINNED_ROUTES[NebiusOperation.VISION].base_url
        
        return cls(
            api_key=api_key,
            base_url=eu_url,
            eu_base_url=eu_url,
            us_base_url=us_url,
            tutor_model=cls._default_tutor_model(),
            quiz_model=cls._default_quiz_model(),
            content_model=cls._default_content_model(),
            vision_model=cls._default_vision_model(),
            embedding_model=cls._default_embedding_model()
        )
    
    @staticmethod
    def _default_tutor_model() -> ModelConfig:
        return ModelConfig(
            model_id=PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].model_id,
            temperature=0.7,
            max_tokens=2048,
            fallback_model_id=PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].model_id
        )
    
    @staticmethod
    def _default_quiz_model() -> ModelConfig:
        return ModelConfig(
            model_id=PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].model_id,
            temperature=0.3,
            max_tokens=8192,
            fallback_model_id=PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].model_id
        )
    
    @staticmethod
    def _default_content_model() -> ModelConfig:
        return ModelConfig(
            model_id=PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].model_id,
            temperature=0.5,
            max_tokens=4096,
            fallback_model_id=PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].model_id
        )
    
    @staticmethod
    def _default_vision_model() -> ModelConfig:
        return ModelConfig(
            model_id=PINNED_ROUTES[NebiusOperation.VISION].model_id,
            temperature=0.5,
            max_tokens=2048,
            fallback_model_id=PINNED_ROUTES[NebiusOperation.VISION].model_id
        )
    
    @staticmethod
    def _default_embedding_model() -> ModelConfig:
        return ModelConfig(
            model_id=PINNED_ROUTES[NebiusOperation.EMBEDDINGS].model_id,
            fallback_model_id=PINNED_ROUTES[NebiusOperation.EMBEDDINGS].model_id
        )
    
    def has_api_key(self) -> bool:
        """Check if API key is configured."""
        return self.api_key is not None and len(self.api_key) > 0
    
    def get_route_for_operation(self, operation: NebiusOperation) -> PinnedModelRoute:
        """Retrieve the immutable PinnedModelRoute for an operation."""
        return validate_operation_route(operation)

    def to_dict(self) -> dict:
        """Convert configuration to dictionary."""
        return {
            "nebius": {
                "base_url": self.base_url,
                "regional_base_urls": {
                    "eu": self.eu_base_url,
                    "us": self.us_base_url
                },
                "models": {
                    "tutor": self.tutor_model.to_dict(),
                    "quiz": self.quiz_model.to_dict(),
                    "content": self.content_model.to_dict(),
                    "vision": self.vision_model.to_dict(),
                    "embedding": self.embedding_model.to_dict()
                },
                "retry": {
                    "max_attempts": self.retry_attempts,
                    "base_delay": self.retry_delay,
                    "max_delay": self.max_retry_delay
                },
                "timeout": self.timeout
            }
        }
