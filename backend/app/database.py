"""
SQLite database layer for RepoLens v2.
Tables: users, repositories, search_history
All I/O uses the stdlib sqlite3 via a thread-pool executor so async FastAPI
routes never block the event loop.
"""

import asyncio
import json
import logging
import os
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

logger = logging.getLogger(__name__)

DB_PATH = os.getenv("DB_PATH", "repolens.db")

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="db")


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

_SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    email        TEXT    NOT NULL UNIQUE,
    password_hash TEXT   NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS repositories (
    repo_id         TEXT PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    name            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'queued',   -- queued|cloning|parsing|embedding|ready|failed
    progress        REAL NOT NULL DEFAULT 0.0,
    error           TEXT,
    indexed_files   INTEGER,
    indexed_chunks  INTEGER,
    languages_json  TEXT,
    skipped_json    TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS search_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    repo_id      TEXT    NOT NULL REFERENCES repositories(repo_id),
    query        TEXT    NOT NULL,
    result_count INTEGER NOT NULL DEFAULT 0,
    timestamp    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
"""


# ---------------------------------------------------------------------------
# Low-level helpers (run in thread executor)
# ---------------------------------------------------------------------------

def _get_conn() -> sqlite3.Connection:
    """Open (or create) the SQLite database and return a connection."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _init_db_sync():
    conn = _get_conn()
    conn.executescript(_SCHEMA)
    conn.commit()
    conn.close()


async def init_db():
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(_executor, _init_db_sync)


def _run_sync(fn, *args):
    """Run *fn* with *args* inside the thread executor, return awaitable."""
    loop = asyncio.get_event_loop()
    return loop.run_in_executor(_executor, fn, *args)


# ---------------------------------------------------------------------------
# User operations
# ---------------------------------------------------------------------------

def _create_user_sync(email: str, password_hash: str) -> Optional[dict]:
    conn = _get_conn()
    try:
        cur = conn.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id, email, created_at",
            (email, password_hash),
        )
        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()


def _get_user_by_email_sync(email: str) -> Optional[dict]:
    conn = _get_conn()
    try:
        cur = conn.execute("SELECT * FROM users WHERE email = ?", (email,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def _get_user_by_id_sync(user_id: int) -> Optional[dict]:
    conn = _get_conn()
    try:
        cur = conn.execute("SELECT id, email, created_at FROM users WHERE id = ?", (user_id,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


async def create_user(email: str, password_hash: str) -> Optional[dict]:
    return await _run_sync(_create_user_sync, email, password_hash)


async def get_user_by_email(email: str) -> Optional[dict]:
    return await _run_sync(_get_user_by_email_sync, email)


async def get_user_by_id(user_id: int) -> Optional[dict]:
    return await _run_sync(_get_user_by_id_sync, user_id)


# ---------------------------------------------------------------------------
# Repository operations
# ---------------------------------------------------------------------------

def _create_repo_sync(repo_id: str, user_id: int, name: str) -> dict:
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT INTO repositories (repo_id, user_id, name, status, progress) VALUES (?, ?, ?, 'queued', 0.0)",
            (repo_id, user_id, name),
        )
        conn.commit()
        return {"repo_id": repo_id, "status": "queued"}
    finally:
        conn.close()


def _update_repo_status_sync(
    repo_id: str,
    status: str,
    progress: float,
    error: Optional[str] = None,
    indexed_files: Optional[int] = None,
    indexed_chunks: Optional[int] = None,
    languages: Optional[dict] = None,
    skipped: Optional[dict] = None,
):
    conn = _get_conn()
    try:
        conn.execute(
            """UPDATE repositories SET
                status=?, progress=?, error=?,
                indexed_files=?, indexed_chunks=?,
                languages_json=?, skipped_json=?
               WHERE repo_id=?""",
            (
                status,
                progress,
                error,
                indexed_files,
                indexed_chunks,
                json.dumps(languages) if languages is not None else None,
                json.dumps(skipped) if skipped is not None else None,
                repo_id,
            ),
        )
        conn.commit()
    finally:
        conn.close()


def _get_repo_sync(repo_id: str, user_id: Optional[int] = None) -> Optional[dict]:
    conn = _get_conn()
    try:
        if user_id is not None:
            cur = conn.execute(
                "SELECT * FROM repositories WHERE repo_id=? AND user_id=?",
                (repo_id, user_id),
            )
        else:
            cur = conn.execute("SELECT * FROM repositories WHERE repo_id=?", (repo_id,))
        row = cur.fetchone()
        if not row:
            return None
        r = dict(row)
        r["languages"] = json.loads(r.pop("languages_json") or "{}")
        r["skipped"] = json.loads(r.pop("skipped_json") or "{}")
        return r
    finally:
        conn.close()


def _list_repos_sync(user_id: int) -> list:
    conn = _get_conn()
    try:
        cur = conn.execute(
            "SELECT repo_id, name, status, progress, error, indexed_files, indexed_chunks, created_at "
            "FROM repositories WHERE user_id=? ORDER BY created_at DESC",
            (user_id,),
        )
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


async def create_repo(repo_id: str, user_id: int, name: str) -> dict:
    return await _run_sync(_create_repo_sync, repo_id, user_id, name)


async def update_repo_status(
    repo_id: str,
    status: str,
    progress: float,
    error: Optional[str] = None,
    indexed_files: Optional[int] = None,
    indexed_chunks: Optional[int] = None,
    languages: Optional[dict] = None,
    skipped: Optional[dict] = None,
):
    await _run_sync(
        _update_repo_status_sync,
        repo_id, status, progress, error,
        indexed_files, indexed_chunks, languages, skipped,
    )


async def get_repo(repo_id: str, user_id: Optional[int] = None) -> Optional[dict]:
    return await _run_sync(_get_repo_sync, repo_id, user_id)


async def list_repos(user_id: int) -> list:
    return await _run_sync(_list_repos_sync, user_id)


# ---------------------------------------------------------------------------
# Search history
# ---------------------------------------------------------------------------

def _save_history_sync(user_id: int, repo_id: str, query: str, result_count: int):
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT INTO search_history (user_id, repo_id, query, result_count) VALUES (?, ?, ?, ?)",
            (user_id, repo_id, query, result_count),
        )
        conn.commit()
    finally:
        conn.close()


def _get_history_sync(user_id: int, repo_id: Optional[str] = None) -> list:
    conn = _get_conn()
    try:
        if repo_id:
            cur = conn.execute(
                "SELECT id, repo_id, query, result_count, timestamp FROM search_history "
                "WHERE user_id=? AND repo_id=? ORDER BY timestamp DESC LIMIT 100",
                (user_id, repo_id),
            )
        else:
            cur = conn.execute(
                "SELECT id, repo_id, query, result_count, timestamp FROM search_history "
                "WHERE user_id=? ORDER BY timestamp DESC LIMIT 100",
                (user_id,),
            )
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


async def save_history(user_id: int, repo_id: str, query: str, result_count: int):
    await _run_sync(_save_history_sync, user_id, repo_id, query, result_count)


async def get_history(user_id: int, repo_id: Optional[str] = None) -> list:
    return await _run_sync(_get_history_sync, user_id, repo_id)


# ---------------------------------------------------------------------------
# Benchmark result
# ---------------------------------------------------------------------------

_BENCHMARK_FILE = os.path.join(os.path.dirname(DB_PATH), "benchmark_result.json")


def get_benchmark_result() -> Optional[dict]:
    path = os.getenv("BENCHMARK_FILE", _BENCHMARK_FILE)
    if not os.path.isfile(path):
        return None
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return None

