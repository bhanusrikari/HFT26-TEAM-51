import fnmatch
import hashlib
import logging
import os
import tempfile
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional, Tuple

from ..models import Chunk, FileRecord, RepoIndex
from .filters import (
    classify_file,
    get_max_file_bytes,
    should_skip_dir,
)
from .parser import parse_file
from .sources import (
    clone_github_shallow,
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

# Content-hash cache: sha256 -> (chunks_template, line_count)
_CONTENT_CHUNK_CACHE: dict[str, tuple[list[Chunk], int]] = {}

def get_priority(language: str) -> int:
    return LANGUAGE_PRIORITY.get(language, 3)

def load_gitignore_patterns(root_dir: str) -> List[str]:
    """Parse .gitignore file at root_dir if it exists."""
    patterns = []
    gitignore_path = os.path.join(root_dir, ".gitignore")
    if os.path.isfile(gitignore_path):
        try:
            with open(gitignore_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    stripped = line.strip()
                    if stripped and not stripped.startswith("#"):
                        patterns.append(stripped)
        except OSError:
            pass
    return patterns

def is_gitignored(rel_path: str, patterns: List[str]) -> bool:
    """Check if rel_path matches any .gitignore pattern."""
    if not patterns:
        return False
    parts = rel_path.split("/")
    base_name = parts[-1]
    for pat in patterns:
        clean_pat = pat.rstrip("/")
        if fnmatch.fnmatch(rel_path, clean_pat) or fnmatch.fnmatch(base_name, clean_pat):
            return True
        if "/" not in clean_pat and any(fnmatch.fnmatch(p, clean_pat) for p in parts):
            return True
    return False

def _process_single_file(item: Tuple[str, str, str, int]) -> Optional[Tuple[FileRecord, List[Chunk]]]:
    """Parse a single candidate file, utilizing content-hash caching."""
    rel_path, language, full_path, size_bytes = item
    try:
        with open(full_path, "rb") as f_bin:
            content_bytes = f_bin.read()
    except OSError:
        return None

    # Compute content hash
    content_hash = hashlib.sha256(content_bytes).hexdigest()
    if content_hash in _CONTENT_CHUNK_CACHE:
        template_chunks, line_count = _CONTENT_CHUNK_CACHE[content_hash]
        # Clone chunks with updated file_path
        file_chunks = [
            Chunk(
                chunk_id=f"{rel_path}:{c.start_line}-{c.end_line}",
                file_path=rel_path,
                language=c.language,
                symbol=c.symbol,
                kind=c.kind,
                start_line=c.start_line,
                end_line=c.end_line,
                code=c.code,
            )
            for c in template_chunks
        ]
        file_record = FileRecord(
            path=rel_path,
            language=language,
            size_bytes=size_bytes,
            line_count=line_count,
        )
        return file_record, file_chunks

    # Decode text
    try:
        text = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = content_bytes.decode("latin-1")
        except Exception:
            return None

    lines = text.splitlines()
    line_count = len(lines)
    file_chunks = parse_file(rel_path, language, text)
    _CONTENT_CHUNK_CACHE[content_hash] = (file_chunks, line_count)

    file_record = FileRecord(
        path=rel_path,
        language=language,
        size_bytes=size_bytes,
        line_count=line_count,
    )
    return file_record, file_chunks

def build_index(root_dir: str, name: str) -> RepoIndex:
    """
    Walk root_dir, filter files, parse into chunks, and construct RepoIndex.
    Uses parallel parsing, content-hash caching, and .gitignore respect.
    """
    t_start = time.perf_counter()
    _, _, max_files = get_limits()
    max_file_bytes = get_max_file_bytes()

    gitignore_patterns = load_gitignore_patterns(root_dir)

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

            if is_gitignored(rel_path, gitignore_patterns):
                skipped["excluded_dir"] += 1
                continue

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

    t_walk = time.perf_counter() - t_start

    # Sort candidates prioritizing source code over docs, then by relative path
    candidates.sort(key=lambda c: (get_priority(c[1]), c[0]))

    if len(candidates) > max_files:
        excess = len(candidates) - max_files
        skipped["limit"] += excess
        candidates = candidates[:max_files]

    # Parallel file parsing
    t_parse_start = time.perf_counter()
    files: List[FileRecord] = []
    chunks: List[Chunk] = []

    max_workers = min(8, os.cpu_count() or 4)
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        results = list(pool.map(_process_single_file, candidates))

    for res in results:
        if res is not None:
            file_rec, file_chunks = res
            files.append(file_rec)
            chunks.extend(file_chunks)

    t_parse = time.perf_counter() - t_parse_start
    t_total = time.perf_counter() - t_start

    if not chunks:
        raise ValueError("No indexable source files found")

    repo_id = uuid.uuid4().hex[:8]
    logger.info(
        "Indexed repo '%s' (%s) in %.3fs [walk=%.3fs, parse=%.3fs]: %d files, %d chunks, skipped: %s",
        name,
        repo_id,
        t_total,
        t_walk,
        t_parse,
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
    """Index a public GitHub repository by URL with shallow clone and zip fallback."""
    owner, repo, branch = parse_github_url(url)
    with tempfile.TemporaryDirectory() as tmp_dir:
        clone_dir = os.path.join(tmp_dir, "repo")
        if clone_github_shallow(owner, repo, branch, clone_dir):
            return build_index(clone_dir, name=repo)

        dest_zip = os.path.join(tmp_dir, f"{repo}.zip")
        download_github_zip(owner, repo, branch, dest_zip)
        extract_dir = os.path.join(tmp_dir, "extracted")
        os.makedirs(extract_dir, exist_ok=True)
        repo_root = extract_zip_safely(dest_zip, extract_dir)
        return build_index(repo_root, name=repo)
