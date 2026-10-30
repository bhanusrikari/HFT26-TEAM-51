import logging
import os
import tempfile
import uuid
from typing import Dict, List, Tuple

from ..models import Chunk, FileRecord, RepoIndex
from .filters import (
    classify_file,
    get_max_file_bytes,
    should_skip_dir,
)
from .parser import parse_file
from .sources import (
    download_github_zip,
    extract_zip_safely,
    get_limits,
    parse_github_url,
)

logger = logging.getLogger(__name__)

LANGUAGE_PRIORITY = {
    # Tier 0: Core source code
    "python": 0,
    "javascript": 0,
    "typescript": 0,
    "java": 0,
    "go": 0,
    "rust": 0,
    "c": 0,
    "cpp": 0,
    "csharp": 0,
    "ruby": 0,
    "php": 0,
    "kotlin": 0,
    "swift": 0,
    # Tier 1: Web, Config & Shell
    "web": 1,
    "config": 1,
    "shell": 1,
    # Tier 2: Docs & Text
    "markdown": 2,
    "text": 2,
}

def get_priority(language: str) -> int:
    return LANGUAGE_PRIORITY.get(language, 3)

def build_index(root_dir: str, name: str) -> RepoIndex:
    """
    Walk root_dir, filter files, parse into chunks, and construct RepoIndex.
    Deterministic sorting, priority ranking against MAX_FILES, and tracking
    of all skipped categories.
    """
    _, _, max_files = get_limits()
    max_file_bytes = get_max_file_bytes()

    skipped: Dict[str, int] = {
        "excluded_dir": 0,
        "generated": 0,
        "too_large": 0,
        "binary": 0,
        "unsupported": 0,
        "limit": 0,
    }

    # Candidate list: (rel_path, language, full_path, size_bytes)
    candidates: List[Tuple[str, str, str, int]] = []

    for dirpath, dirnames, filenames in os.walk(root_dir, topdown=True):
        # Prune and count skipped directories
        excluded = [d for d in dirnames if should_skip_dir(d)]
        skipped["excluded_dir"] += len(excluded)
        dirnames[:] = [d for d in dirnames if not should_skip_dir(d)]

        dirnames.sort()
        filenames.sort()

        for fname in filenames:
            full_path = os.path.join(dirpath, fname)
            rel_path = os.path.relpath(full_path, root_dir).replace("\\", "/")

            try:
                size_bytes = os.path.getsize(full_path)
            except OSError:
                continue

            if size_bytes > max_file_bytes:
                skipped["too_large"] += 1
                continue

            head_bytes = b""
            try:
                with open(full_path, "rb") as f_in:
                    head_bytes = f_in.read(4096)
            except OSError:
                skipped["binary"] += 1
                continue

            include, language, reason = classify_file(rel_path, size_bytes, head_bytes)
            if not include:
                if reason in skipped:
                    skipped[reason] += 1
                else:
                    skipped["unsupported"] += 1
                continue

            if language:
                candidates.append((rel_path, language, full_path, size_bytes))

    # Sort candidates prioritizing source code over docs, then by relative path
    candidates.sort(key=lambda c: (get_priority(c[1]), c[0]))

    if len(candidates) > max_files:
        excess = len(candidates) - max_files
        skipped["limit"] += excess
        candidates = candidates[:max_files]

    # Process kept files
    files: List[FileRecord] = []
    chunks: List[Chunk] = []

    for rel_path, language, full_path, size_bytes in candidates:
        text = ""
        try:
            with open(full_path, "r", encoding="utf-8") as f_txt:
                text = f_txt.read()
        except UnicodeDecodeError:
            try:
                with open(full_path, "r", encoding="latin-1") as f_txt:
                    text = f_txt.read()
            except Exception:
                skipped["binary"] += 1
                continue
        except OSError:
            continue

        lines = text.splitlines()
        line_count = len(lines)

        file_chunks = parse_file(rel_path, language, text)
        files.append(
            FileRecord(
                path=rel_path,
                language=language,
                size_bytes=size_bytes,
                line_count=line_count,
            )
        )
        chunks.extend(file_chunks)

    if not chunks:
        raise ValueError("No indexable source files found")

    repo_id = uuid.uuid4().hex[:8]
    logger.info(
        "Indexed repo '%s' (%s): %d files, %d chunks, skipped: %s",
        name,
        repo_id,
        len(files),
        len(chunks),
        skipped,
    )

    return RepoIndex(
        repo_id=repo_id,
        name=name,
        files=files,
        chunks=chunks,
        skipped=skipped,
    )

def index_zip(zip_path: str, name: str) -> RepoIndex:
    """Index a local zip archive."""
    if not zip_path or not os.path.isfile(zip_path):
        raise ValueError(f"ZIP file does not exist: {zip_path}")

    with tempfile.TemporaryDirectory() as tmp_dir:
        repo_root = extract_zip_safely(zip_path, tmp_dir)
        return build_index(repo_root, name=name)

def index_github(url: str) -> RepoIndex:
    """Index a public GitHub repository by URL."""
    owner, repo, branch = parse_github_url(url)
    with tempfile.TemporaryDirectory() as tmp_dir:
        dest_zip = os.path.join(tmp_dir, f"{repo}.zip")
        download_github_zip(owner, repo, branch, dest_zip)
        extract_dir = os.path.join(tmp_dir, "extracted")
        os.makedirs(extract_dir, exist_ok=True)
        repo_root = extract_zip_safely(dest_zip, extract_dir)
        return build_index(repo_root, name=repo)
