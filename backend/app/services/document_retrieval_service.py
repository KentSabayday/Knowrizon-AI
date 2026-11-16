"""
Document Retrieval Service for KnowRizon AI.

Strictly utilizes Nebius Token Factory model:
    - Exact Model ID: Qwen/Qwen3-Embedding-8B
    - Regional Endpoint: https://api.tokenfactory.eu-north1.nebius.com/v1/embeddings
    - Vector Dimension: 4,096 finite floating point numbers

Implements:
1. Passage chunking (~300 words, 50-word overlap).
2. Semantic vector indexing and in-memory cache keyed by content ID and model ID.
3. Cosine similarity query matching.
4. Labeled transparent local lexical fallback when embeddings are unavailable.
Never manufactures fake zero vectors.
"""
import math
import re
from typing import List, Dict, Any, Optional, Tuple
from app.services.nebius_client import nebius_client
from app.services.nebius_policy import PINNED_ROUTES, NebiusOperation

MODEL_ID = PINNED_ROUTES[NebiusOperation.EMBEDDINGS].model_id


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculate cosine similarity between two non-zero float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = 0.0
    norm1 = 0.0
    norm2 = 0.0
    for a, b in zip(v1, v2):
        dot += a * b
        norm1 += a * a
        norm2 += b * b
    if norm1 <= 0.0 or norm2 <= 0.0:
        return 0.0
    return dot / (math.sqrt(norm1) * math.sqrt(norm2))


def chunk_text(text: str, chunk_size: int = 300, overlap: int = 50) -> List[str]:
    """Split raw text into overlapping word passages."""
    if not text or not text.strip():
        return []
    words = re.findall(r'\S+', text)
    if not words:
        return []
    if len(words) <= chunk_size:
        return [" ".join(words)]

    chunks = []
    step = max(1, chunk_size - overlap)
    for i in range(0, len(words), step):
        passage = " ".join(words[i:i + chunk_size])
        chunks.append(passage)
        if i + chunk_size >= len(words):
            break
    return chunks


class DocumentRetrievalService:
    """Manages document chunking, semantic embedding generation, vector caching, and context retrieval."""

    def __init__(self):
        # Cache structure: { content_id: { "model_id": str, "chunks": List[Dict[str, Any]] } }
        self._index_cache: Dict[str, Dict[str, Any]] = {}

    def index_document(self, content_id: str, title: str, text: str) -> bool:
        """
        Chunks the document text and computes semantic embeddings via Qwen/Qwen3-Embedding-8B.
        Returns True if embeddings were successfully generated and cached.
        """
        if not text or not text.strip():
            return False

        passages = chunk_text(text, chunk_size=300, overlap=50)
        if not passages:
            return False

        # Attempt batch or per-passage embedding
        indexed_chunks = []
        try:
            for idx, passage in enumerate(passages):
                vector = nebius_client.create_embedding(passage)
                indexed_chunks.append({
                    "chunk_index": idx,
                    "text": passage,
                    "vector": vector,
                    "title": title
                })

            self._index_cache[str(content_id)] = {
                "model_id": MODEL_ID,
                "version": "1.0",
                "chunks": indexed_chunks
            }
            return True
        except Exception as e:
            # Embedding failed; store text passages without vector so lexical search can still run
            indexed_chunks = [
                {"chunk_index": idx, "text": p, "vector": None, "title": title}
                for idx, p in enumerate(passages)
            ]
            self._index_cache[str(content_id)] = {
                "model_id": MODEL_ID,
                "version": "lexical-fallback",
                "chunks": indexed_chunks,
                "error": str(e)
            }
            return False

    def retrieve_relevant_context(
        self,
        query: str,
        content_ids: List[str],
        top_k: int = 3
    ) -> Tuple[str, str]:
        """
        Retrieves the top_k relevant passages across the authorized content IDs.
        
        Returns:
            (context_text, retrieval_mode)
            where retrieval_mode is either 'semantic' or 'lexical_fallback'
        """
        if not query or not query.strip() or not content_ids:
            return "", "none"

        candidates = []
        for cid in content_ids:
            cached = self._index_cache.get(str(cid))
            if cached and "chunks" in cached:
                candidates.extend(cached["chunks"])

        if not candidates:
            return "", "none"

        # Try semantic search first
        query_vector = None
        try:
            query_vector = nebius_client.create_embedding(query)
        except Exception:
            query_vector = None

        if query_vector:
            scored = []
            for item in candidates:
                if item.get("vector"):
                    sim = cosine_similarity(query_vector, item["vector"])
                    scored.append((sim, item))

            if scored:
                scored.sort(key=lambda x: x[0], reverse=True)
                top_items = [item for _, item in scored[:top_k]]
                passages = [
                    f"[{item.get('title', 'Document')}, Passage {item.get('chunk_index', 0) + 1}]:\n{item['text']}"
                    for item in top_items
                ]
                return "\n\n".join(passages), "semantic"

        # Local Lexical Fallback (Keyword / BM25-lite overlap)
        tokens = set(re.findall(r'\w+', query.lower()))
        lexical_scored = []
        for item in candidates:
            text = item['text'].lower()
            overlap_score = sum(1 for t in tokens if t in text)
            lexical_scored.append((overlap_score, item))

        lexical_scored.sort(key=lambda x: x[0], reverse=True)
        top_items = [item for _, item in lexical_scored[:top_k]]
        passages = [
            f"[Local Lexical Retrieval — Semantic Embedding Unavailable]\n[{item.get('title', 'Document')}, Passage {item.get('chunk_index', 0) + 1}]:\n{item['text']}"
            for item in top_items
        ]
        return "\n\n".join(passages), "lexical_fallback"


# Singleton
retrieval_service = DocumentRetrievalService()
