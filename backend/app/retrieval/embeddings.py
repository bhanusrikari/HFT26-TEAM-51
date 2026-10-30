import os
from typing import Optional
from ..models import Chunk


def is_enabled() -> bool:
    """Check if embeddings are enabled via environment variable."""
    return os.getenv("EMBEDDINGS_ENABLED", "").strip().lower() == "true"


def get_embedding(text: str) -> Optional[list[float]]:
    """Return embedding vector for text, or None if disabled/unsupported."""
    if not is_enabled():
        return None
    # Featherless does not provide a standard embedding endpoint;
    # return None safely without pulling heavy ML dependencies.
    return None


def get_chunk_embeddings(chunks: list[Chunk]) -> Optional[list[list[float]]]:
    """Return embeddings for a list of chunks, or None if disabled."""
    if not is_enabled():
        return None
    return None


def compute_semantic_scores(
    query: str,
    chunks: list[Chunk],
    chunk_embeddings: Optional[list[list[float]]] = None,
) -> Optional[list[float]]:
    """Compute semantic similarity scores between query and chunks.
    
    Returns None if embeddings are disabled or unavailable.
    """
    if not is_enabled():
        return None
    return None
