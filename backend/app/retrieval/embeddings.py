import logging
import math
import os
from typing import List, Optional

import httpx

from ..models import Chunk

logger = logging.getLogger(__name__)


def is_enabled() -> bool:
    """Check if embeddings are enabled via environment variable."""
    return os.getenv("EMBEDDINGS_ENABLED", "").strip().lower() == "true"


def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Compute cosine similarity safely without numpy/scipy dependencies."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm1 * norm2)))


def get_embedding(text: str) -> Optional[List[float]]:
    """Return embedding vector for text, or None if disabled or unavailable."""
    if not is_enabled():
        return None

    api_key = os.getenv("FEATHERLESS_API_KEY", "").strip()
    if not api_key:
        logger.warning("Embedding model or API key unavailable, degrading to keyword/BM25 ranking")
        return None

    base_url = os.getenv("FEATHERLESS_BASE_URL", "https://api.featherless.ai/v1").rstrip("/")
    model = os.getenv("FEATHERLESS_EMBEDDING_MODEL", "text-embedding-3-small")

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                f"{base_url}/embeddings",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={"input": text[:2000], "model": model},
            )
            if resp.status_code == 200:
                data = resp.json()
                if "data" in data and len(data["data"]) > 0:
                    return data["data"][0].get("embedding")
            logger.warning(
                "Embedding API returned status %d, degrading to keyword/BM25 ranking",
                resp.status_code,
            )
            return None
    except Exception as e:
        logger.warning(
            "Embedding model call failed (%s), degrading to keyword/BM25 ranking", e
        )
        return None


def get_chunk_embeddings(chunks: List[Chunk]) -> Optional[List[List[float]]]:
    """Return embeddings for a list of chunks, or None if disabled or unavailable."""
    if not is_enabled():
        return None

    api_key = os.getenv("FEATHERLESS_API_KEY", "").strip()
    if not api_key:
        logger.warning("Embedding model or API key unavailable, degrading to keyword/BM25 ranking")
        return None

    if not chunks:
        return []

    # Attempt batch embedding
    base_url = os.getenv("FEATHERLESS_BASE_URL", "https://api.featherless.ai/v1").rstrip("/")
    model = os.getenv("FEATHERLESS_EMBEDDING_MODEL", "text-embedding-3-small")

    try:
        texts = [c.code[:1000] for c in chunks]
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{base_url}/embeddings",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={"input": texts, "model": model},
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("data", [])
                if len(items) == len(chunks):
                    return [item["embedding"] for item in items]
            logger.warning(
                "Batch embedding API returned status %d, degrading to keyword/BM25 ranking",
                resp.status_code,
            )
            return None
    except Exception as e:
        logger.warning(
            "Batch embedding call failed (%s), degrading to keyword/BM25 ranking", e
        )
        return None


def compute_semantic_scores(
    query: str,
    chunks: List[Chunk],
    chunk_embeddings: Optional[List[List[float]]] = None,
) -> Optional[List[float]]:
    """Compute semantic similarity scores between query and chunks.
    
    Returns None if embeddings are disabled, unavailable, or fail.
    """
    if not is_enabled() or chunk_embeddings is None:
        return None

    if len(chunk_embeddings) != len(chunks):
        logger.warning("Chunk embedding length mismatch, degrading to keyword/BM25 ranking")
        return None

    q_emb = get_embedding(query)
    if q_emb is None:
        logger.warning("Query embedding unavailable, degrading to keyword/BM25 ranking")
        return None

    scores = []
    for c_emb in chunk_embeddings:
        sim = _cosine_similarity(q_emb, c_emb)
        scores.append(round(sim, 4))

    return scores
