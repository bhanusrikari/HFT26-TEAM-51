"""
Background task runner for async repository indexing (v2).
Each indexing job runs in a ThreadPoolExecutor so the event loop stays free.
Progress is written back to the database after each stage.
"""

import asyncio
import logging
import os
import shutil
import tempfile
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from . import database as db
from . import store
from .ingestion import indexer
from .ingestion.sources import download_github_zip, extract_zip_safely, parse_github_url
from .retrieval.search import get_engine

logger = logging.getLogger(__name__)

_TASK_EXECUTOR = ThreadPoolExecutor(max_workers=2, thread_name_prefix="indexer")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _set_status(repo_id: str, status: str, progress: float, error: Optional[str] = None, **kwargs):
    await db.update_repo_status(repo_id, status=status, progress=progress, error=error, **kwargs)


# ---------------------------------------------------------------------------
# Zip indexing task
# ---------------------------------------------------------------------------

def _index_zip_sync(repo_id: str, zip_path: str, name: str):
    """Synchronous indexing; called in thread pool."""
    try:
        return indexer.index_zip(zip_path, name=name)
    finally:
        # Clean up temp file after use
        try:
            os.unlink(zip_path)
        except OSError:
            pass


async def run_zip_indexing(repo_id: str, zip_path: str, name: str, user_id: int):
    loop = asyncio.get_event_loop()
    try:
        await _set_status(repo_id, "parsing", 0.1)
        t0 = time.perf_counter()

        idx = await loop.run_in_executor(
            _TASK_EXECUTOR, _index_zip_sync, repo_id, zip_path, name
        )
        # Override the generated repo_id with our pre-assigned one so the
        # client can poll with the id it received at 202.
        idx.repo_id = repo_id

        elapsed = time.perf_counter() - t0
        logger.info("ZIP indexing done in %.2fs: %d files, %d chunks", elapsed, len(idx.files), len(idx.chunks))

        from collections import Counter
        languages = dict(Counter(f.language for f in idx.files))

        await _set_status(
            repo_id, "ready", 1.0,
            indexed_files=len(idx.files),
            indexed_chunks=len(idx.chunks),
            languages=languages,
            skipped=idx.skipped,
        )
        store.save(idx)

    except ValueError as e:
        await _set_status(repo_id, "failed", 0.0, error=str(e))
        logger.error("ZIP indexing failed (ValueError): %s", e)
    except Exception as e:
        await _set_status(repo_id, "failed", 0.0, error=f"Unexpected error: {e}")
        logger.exception("ZIP indexing failed unexpectedly")


# ---------------------------------------------------------------------------
# GitHub indexing task
# ---------------------------------------------------------------------------

def _index_github_sync(repo_id: str, owner: str, repo: str, branch: Optional[str], name: str):
    """Synchronous GitHub download + indexing; called in thread pool."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        dest_zip = os.path.join(tmp_dir, f"{repo}.zip")
        download_github_zip(owner, repo, branch, dest_zip)
        extract_dir = os.path.join(tmp_dir, "extracted")
        os.makedirs(extract_dir, exist_ok=True)
        repo_root = extract_zip_safely(dest_zip, extract_dir)
        return indexer.build_index(repo_root, name=name)


async def run_github_indexing(repo_id: str, url: str, user_id: int):
    loop = asyncio.get_event_loop()
    try:
        owner, repo, branch = parse_github_url(url)
        name = repo

        await _set_status(repo_id, "cloning", 0.05)
        t0 = time.perf_counter()

        idx = await loop.run_in_executor(
            _TASK_EXECUTOR, _index_github_sync, repo_id, owner, repo, branch, name
        )
        idx.repo_id = repo_id

        elapsed = time.perf_counter() - t0
        logger.info("GitHub indexing done in %.2fs: %d files, %d chunks", elapsed, len(idx.files), len(idx.chunks))

        from collections import Counter
        languages = dict(Counter(f.language for f in idx.files))

        await _set_status(
            repo_id, "ready", 1.0,
            indexed_files=len(idx.files),
            indexed_chunks=len(idx.chunks),
            languages=languages,
            skipped=idx.skipped,
        )
        store.save(idx)

    except ValueError as e:
        await _set_status(repo_id, "failed", 0.0, error=str(e))
        logger.error("GitHub indexing failed (ValueError): %s", e)
    except RuntimeError as e:
        await _set_status(repo_id, "failed", 0.0, error=str(e))
        logger.error("GitHub indexing failed (RuntimeError): %s", e)
    except Exception as e:
        await _set_status(repo_id, "failed", 0.0, error=f"Unexpected error: {e}")
        logger.exception("GitHub indexing failed unexpectedly")

