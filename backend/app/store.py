import logging
import os
import pickle
from typing import Optional
from .models import RepoIndex

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".repo_cache"))

_REPOS: dict[str, RepoIndex] = {}

def save(index: RepoIndex) -> None:
    _REPOS[index.repo_id] = index
    try:
        os.makedirs(CACHE_DIR, exist_ok=True)
        cache_path = os.path.join(CACHE_DIR, f"{index.repo_id}.pkl")
        with open(cache_path, "wb") as f:
            pickle.dump(index, f)
    except Exception as e:
        logger.warning("Failed to persist index %s to cache: %s", index.repo_id, e)

def get(repo_id: str) -> Optional[RepoIndex]:
    if repo_id in _REPOS:
        return _REPOS[repo_id]
    cache_path = os.path.join(CACHE_DIR, f"{repo_id}.pkl")
    if os.path.isfile(cache_path):
        try:
            with open(cache_path, "rb") as f:
                index = pickle.load(f)
                _REPOS[repo_id] = index
                return index
        except Exception as e:
            logger.warning("Failed to load cached index for %s: %s", repo_id, e)
    return None
