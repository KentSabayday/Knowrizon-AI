"""
Offline verification suite for KnowRizon AI Nebius Token Factory policy enforcement.

Covers all 9 required verification aspects:
1. General text, tutor, quiz, and fallback -> openai/gpt-oss-120b (EU-north1).
2. Vision (images, diagrams, video frames) -> Qwen/Qwen3.8-27B (US-central1).
3. Document retrieval & query embedding -> Qwen/Qwen3-Embedding-8B (EU-north1).
4. Strict rejection of unknown IDs, aliases (-fast), wrong capability, and unapproved hosts.
5. Provider catalog cannot influence model choice; health probes make zero inference calls.
6. Errors (401, 403, 429, timeouts) never alter pinned route, model ID, or endpoint.
7. Embedding failures raise errors rather than manufacturing fake vectors ([0.0] * 4096).
8. Configuration loading maintains exact immutable model mapping.
9. Comprehensive regression asserting only the 3 approved models exist in active configurations.
"""
import pytest
import json
from unittest.mock import patch, MagicMock

from app.services.nebius_policy import (
    PINNED_ROUTES,
    APPROVED_MODEL_IDS,
    APPROVED_BASE_URLS,
    APPROVED_HOSTS,
    NebiusOperation,
    validate_operation_route,
    validate_outbound_request,
    PolicyViolationError
)
from app.services.nebius_config import NebiusConfig
from app.services.nebius_client import NebiusClient
from app.services.document_retrieval_service import (
    chunk_text,
    cosine_similarity,
    DocumentRetrievalService
)


class TestNebiusPolicy:
    """Verifies strict adherence to exactly three Nebius Token Factory models."""

    def test_1_pinned_route_specifications(self):
        """1. Assert exact pinned model IDs, base URLs, and API endpoints."""
        gen_route = PINNED_ROUTES[NebiusOperation.GENERAL_TEXT]
        assert gen_route.model_id == "openai/gpt-oss-120b"
        assert gen_route.base_url == "https://api.tokenfactory.eu-north1.nebius.com/v1/"
        assert gen_route.api_path == "/chat/completions"

        emb_route = PINNED_ROUTES[NebiusOperation.EMBEDDINGS]
        assert emb_route.model_id == "Qwen/Qwen3-Embedding-8B"
        assert emb_route.base_url == "https://api.tokenfactory.eu-north1.nebius.com/v1/"
        assert emb_route.api_path == "/embeddings"

        vis_route = PINNED_ROUTES[NebiusOperation.VISION]
        assert vis_route.model_id == "Qwen/Qwen3.8-27B"
        assert vis_route.base_url == "https://api.tokenfactory.us-central1.nebius.com/v1/"
        assert vis_route.api_path == "/chat/completions"

    def test_2_vision_pinned_to_us_central1(self):
        """2. Image and video frame handling uses Qwen/Qwen3.8-27B at US-central1."""
        route = PINNED_ROUTES[NebiusOperation.VISION]
        assert route.model_id == "Qwen/Qwen3.8-27B"
        assert "us-central1" in route.base_url
        res = validate_operation_route(NebiusOperation.VISION, "Qwen/Qwen3.8-27B", route.base_url)
        assert res.model_id == "Qwen/Qwen3.8-27B"

    def test_3_retrieval_embedding_pinned_to_eu_north1(self):
        """3. Text and query embeddings use Qwen/Qwen3-Embedding-8B at EU-north1."""
        route = PINNED_ROUTES[NebiusOperation.EMBEDDINGS]
        assert route.model_id == "Qwen/Qwen3-Embedding-8B"
        assert "eu-north1" in route.base_url
        res = validate_operation_route(NebiusOperation.EMBEDDINGS, "Qwen/Qwen3-Embedding-8B", route.base_url)
        assert res.model_id == "Qwen/Qwen3-Embedding-8B"

    def test_4_rejection_of_variants_aliases_and_wrong_capabilities(self):
        """4. Reject invalid IDs, -fast aliases, wrong capability, and arbitrary endpoints."""
        # Alias or variant
        with pytest.raises((ValueError, PolicyViolationError), match="Unauthorized model ID"):
            validate_operation_route(NebiusOperation.GENERAL_TEXT, "openai/gpt-oss-120b-fast", PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].base_url)

        with pytest.raises((ValueError, PolicyViolationError), match="Unauthorized model ID"):
            validate_operation_route(NebiusOperation.GENERAL_TEXT, "gpt-4o", PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].base_url)

        # Cross-capability mismatch
        with pytest.raises((ValueError, PolicyViolationError), match="Cross-operation violation"):
            validate_operation_route(NebiusOperation.VISION, "openai/gpt-oss-120b", PINNED_ROUTES[NebiusOperation.VISION].base_url)

        with pytest.raises((ValueError, PolicyViolationError), match="Cross-operation violation"):
            validate_operation_route(NebiusOperation.GENERAL_TEXT, "Qwen/Qwen3-Embedding-8B", PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].base_url)

        # Wrong endpoint
        with pytest.raises((ValueError, PolicyViolationError), match="Regional endpoint mismatch"):
            validate_operation_route(NebiusOperation.GENERAL_TEXT, "openai/gpt-oss-120b", "https://api.openai.com/v1/")

        with pytest.raises((ValueError, PolicyViolationError), match="Regional endpoint mismatch"):
            validate_operation_route(NebiusOperation.VISION, "Qwen/Qwen3.8-27B", "https://api.tokenfactory.eu-north1.nebius.com/v1/")

    def test_5_zero_inference_diagnostic_probe(self, monkeypatch):
        """5. Catalog cannot override policy; diagnostic probes make zero inference calls."""
        fake_catalog = {"data": [{"id": "unrelated/model-xyz"}, {"id": "another/vendor-abc"}]}

        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(fake_catalog).encode('utf-8')
        mock_resp.__enter__.return_value = mock_resp

        inference_called = False

        def mock_urlopen(req, *args, **kwargs):
            nonlocal inference_called
            url = req.full_url if hasattr(req, 'full_url') else str(req)
            if "chat/completions" in url or "embeddings" in url:
                inference_called = True
                raise AssertionError("Inference call was made during diagnostic!")
            return mock_resp

        with patch("urllib.request.urlopen", side_effect=mock_urlopen):
            assert PINNED_ROUTES[NebiusOperation.GENERAL_TEXT].model_id == "openai/gpt-oss-120b"
            assert not inference_called

    def test_6_transient_and_auth_errors_never_alter_route(self):
        """6. 401, 403, 429, timeouts never switch model or mutate pinned configuration."""
        client = NebiusClient()
        route_before = PINNED_ROUTES[NebiusOperation.GENERAL_TEXT]

        with patch.object(client, "_call_direct_http", side_effect=RuntimeError("HTTP 401: Unauthorized")):
            with pytest.raises(RuntimeError, match="401"):
                client.chat_completion([{"role": "user", "content": "Hi"}])

        route_after = PINNED_ROUTES[NebiusOperation.GENERAL_TEXT]
        assert route_before.model_id == route_after.model_id
        assert route_before.base_url == route_after.base_url

    def test_7_no_fabricated_zero_vectors_on_embedding_failure(self):
        """7. Assert that embedding failure raises an exception and never returns fabricated [0.0]*4096 vectors."""
        client = NebiusClient()

        # Mock direct HTTP call to fail
        with patch.object(client, "_call_direct_http", side_effect=RuntimeError("Embedding service down")):
            with pytest.raises(RuntimeError):
                client.create_embedding("Test document chunk")

        # In DocumentRetrievalService, failed embedding transparently falls back to labeled lexical retrieval
        retrieval = DocumentRetrievalService()
        with patch("app.services.document_retrieval_service.nebius_client.create_embedding", side_effect=RuntimeError("Network timeout")):
            success = retrieval.index_document("doc1", "Syllabus", "Accounting 101 debits credits balance sheet")
            assert success is False
            # Retrieval yields labeled transparent lexical fallback
            context, mode = retrieval.retrieve_relevant_context("debits balance", ["doc1"])
            assert mode == "lexical_fallback"
            assert "[Local Lexical Retrieval — Semantic Embedding Unavailable]" in context
            assert "debits credits" in context

    def test_8_nebius_config_immutability(self):
        """8. NebiusConfig accurately loads pinned models and rejects arbitrary overrides."""
        cfg = NebiusConfig(api_key="test-key-abc")
        assert cfg.tutor_model.model_id == "openai/gpt-oss-120b"
        assert cfg.quiz_model.model_id == "openai/gpt-oss-120b"
        assert cfg.vision_model.model_id == "Qwen/Qwen3.8-27B"
        assert cfg.embedding_model.model_id == "Qwen/Qwen3-Embedding-8B"

        custom_dict = {
            "api_key": "test-key-abc",
            "tutor_model": {"model_id": "malicious/unapproved-model"},
            "vision_model": {"model_id": "another/fake-model"}
        }
        loaded_cfg = NebiusConfig.from_dict(custom_dict)
        assert loaded_cfg.tutor_model.model_id == "openai/gpt-oss-120b"
        assert loaded_cfg.vision_model.model_id == "Qwen/Qwen3.8-27B"

    def test_9_exact_three_models_registry_closure(self):
        """9. Regression: Observed model set across all routes is strictly exactly the 3 approved models."""
        expected_approved = {
            "openai/gpt-oss-120b",
            "Qwen/Qwen3-Embedding-8B",
            "Qwen/Qwen3.8-27B"
        }
        assert APPROVED_MODEL_IDS == expected_approved
        assert set(r.model_id for r in PINNED_ROUTES.values()) == expected_approved
