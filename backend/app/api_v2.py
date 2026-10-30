"""
RepoLens API v2 router.
All v1 endpoints remain on /api/* (backward-compatible).
New v2 additions are also on /api/* (auth, repo list, history, benchmark).
Auth uses httpOnly JWT cookies.
"""

import os
import shutil
import tempfile
import uuid
from collections import Counter
from dataclasses import asdict
from typing import Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from pydantic import BaseModel

from . import database as db
from . import store
from . import tasks as bg_tasks
from .auth import (
    COOKIE_NAME,
    clear_auth_cookie,
    create_token,
    get_current_user,
    login_handler,
    optional_current_user,
    set_auth_cookie,
    signup_handler,
)
from .ingestion import indexer
from .retrieval.search import get_engine
from .ai.explainer import explain as explain_fn

router = APIRouter(prefix="/api")

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))  # 50 MB

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class SignupReq(BaseModel):
    email: str
    password: str


class LoginReq(BaseModel):
    email: str
    password: str


class GithubReq(BaseModel):
    url: str


class SearchReq(BaseModel):
    repo_id: str
    query: str
    top_k: int = 5
    explain: bool = True
    min_score: float = 0.35


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@router.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Auth endpoints (v2)
# ---------------------------------------------------------------------------


@router.post("/auth/signup", status_code=status.HTTP_201_CREATED)
async def signup(req: SignupReq, response: Response):
    user = await signup_handler(req.email, req.password)
    token = create_token(user["id"])
    set_auth_cookie(response, token)
    return {"id": user["id"], "email": user["email"], "created_at": user["created_at"]}


@router.post("/auth/login")
async def login(req: LoginReq, request: Request, response: Response):
    user = await login_handler(request, req.email, req.password)
    token = create_token(user["id"])
    set_auth_cookie(response, token)
    return {"id": user["id"], "email": user["email"]}


@router.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookie(response)
    return {"detail": "Logged out"}


@router.get("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return {"id": current_user["id"], "email": current_user["email"], "created_at": current_user["created_at"]}


# ---------------------------------------------------------------------------
# Repository list (v2)
# ---------------------------------------------------------------------------


@router.get("/repositories")
async def list_repositories(current_user: dict = Depends(get_current_user)):
    repos = await db.list_repos(current_user["id"])
    return repos


# ---------------------------------------------------------------------------
# Upload ZIP (v2 async; v1-compatible response shape when ready)
# ---------------------------------------------------------------------------


@router.post("/repositories/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload(
    background_tasks: BackgroundTasks,
    request: Request,
    file: UploadFile = File(...),
    current_user: Optional[dict] = Depends(optional_current_user),
):
    if not (file.filename or "").lower().endswith(".zip"):
        raise HTTPException(400, "Please upload a .zip file")

    # Read body to enforce size limit before saving
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"File exceeds {MAX_UPLOAD_BYTES // (1024*1024)} MB limit")

    # Save to temp file (the background task will clean it up)
    tmp = tempfile.NamedTemporaryFile(suffix=".zip", delete=False)
    tmp.write(content)
    tmp.flush()
    tmp.close()

    repo_id = uuid.uuid4().hex[:8]
    name = os.path.splitext(file.filename)[0]

    # If authenticated, persist metadata so user can poll status
    user_id = current_user["id"] if current_user else None
    if user_id:
        await db.create_repo(repo_id, user_id, name)
        background_tasks.add_task(bg_tasks.run_zip_indexing, repo_id, tmp.name, name, user_id)
        return {"repo_id": repo_id, "status": "queued"}
    else:
        # Anonymous: index synchronously (v1 compat) but still in BG so we
        # return 202; client must poll GET /api/repositories/{id}
        # For anonymous we do a best-effort sync index and save in-memory.
        # Register a pseudo-db entry so polling works.
        # We use user_id=0 sentinel (no FK since no row in users table).
        # Simple approach: just do it sync for anonymous users.
        try:
            idx = indexer.index_zip(tmp.name, name=name)
            idx.repo_id = repo_id
            store.save(idx)
        except ValueError as e:
            raise HTTPException(400, str(e))
        finally:
            try:
                os.unlink(tmp.name)
            except OSError:
                pass
        from collections import Counter
        languages = dict(Counter(f.language for f in idx.files))
        return {
            "repo_id": repo_id,
            "name": idx.name,
            "indexed_files": len(idx.files),
            "indexed_chunks": len(idx.chunks),
            "status": "ready",
        }


# ---------------------------------------------------------------------------
# GitHub indexing (v2 async)
# ---------------------------------------------------------------------------


@router.post("/repositories/github", status_code=status.HTTP_202_ACCEPTED)
async def github(
    req: GithubReq,
    background_tasks: BackgroundTasks,
    current_user: Optional[dict] = Depends(optional_current_user),
):
    repo_id = uuid.uuid4().hex[:8]

    user_id = current_user["id"] if current_user else None
    if user_id:
        # Quick URL validation before accepting
        from .ingestion.sources import parse_github_url
        try:
            parse_github_url(req.url)
        except ValueError as e:
            raise HTTPException(400, str(e))

        # Extract repo name for display
        _, repo_name, _ = __import__(
            "backend.app.ingestion.sources", fromlist=["parse_github_url"]
        ).parse_github_url(req.url) if False else (None, req.url.rstrip("/").split("/")[-1].removesuffix(".git"), None)

        await db.create_repo(repo_id, user_id, repo_name)
        background_tasks.add_task(bg_tasks.run_github_indexing, repo_id, req.url, user_id)
        return {"repo_id": repo_id, "status": "queued"}
    else:
        # Anonymous: sync (v1 compat)
        from .ingestion import indexer as idx_mod
        try:
            idx = idx_mod.index_github(req.url)
        except ValueError as e:
            raise HTTPException(400, str(e))
        except RuntimeError as e:
            raise HTTPException(502, str(e))
        idx.repo_id = repo_id
        store.save(idx)
        from collections import Counter
        return {
            "repo_id": repo_id,
            "name": idx.name,
            "indexed_files": len(idx.files),
            "indexed_chunks": len(idx.chunks),
            "status": "ready",
        }


# ---------------------------------------------------------------------------
# Get repository (v2: includes status/progress; v1-compat when ready)
# ---------------------------------------------------------------------------


def _memory_summary(idx, detailed=False):
    out = {
        "repo_id": idx.repo_id,
        "name": idx.name,
        "indexed_files": len(idx.files),
        "indexed_chunks": len(idx.chunks),
        "status": "ready",
        "progress": 1.0,
    }
    if detailed:
        out["languages"] = dict(Counter(f.language for f in idx.files))
        out["skipped"] = idx.skipped
    return out


@router.get("/repositories/{repo_id}")
async def get_repo(
    repo_id: str,
    current_user: Optional[dict] = Depends(optional_current_user),
):
    # Try DB first (authenticated users)
    if current_user:
        row = await db.get_repo(repo_id, user_id=current_user["id"])
        if row:
            return row

    # Fall back to in-memory store (anonymous / v1)
    idx = store.get(repo_id)
    if idx:
        return _memory_summary(idx, detailed=True)

    raise HTTPException(404, "Repository not found")


# ---------------------------------------------------------------------------
# Search (v2: min_score, low_relevance_count, saves history)
# ---------------------------------------------------------------------------


@router.post("/search")
async def search(
    req: SearchReq,
    current_user: Optional[dict] = Depends(optional_current_user),
):
    # Ownership check for authenticated users
    idx = None
    if current_user:
        row = await db.get_repo(req.repo_id, user_id=current_user["id"])
        if row:
            if row.get("status") != "ready":
                raise HTTPException(400, f"Repository is not ready (status: {row.get('status')})")
            idx = store.get(req.repo_id)
        else:
            # Could be anonymous-uploaded repo in memory
            mem = store.get(req.repo_id)
            if not mem:
                raise HTTPException(404, "Repository not found")
            idx = mem
    else:
        idx = store.get(req.repo_id)
        if not idx:
            raise HTTPException(404, "Repository not found")

    if not req.query.strip():
        raise HTTPException(400, "Query is empty")

    top_k = max(1, min(req.top_k, 20))
    min_score = max(0.0, min(1.0, req.min_score))

    engine = get_engine(idx)
    # Fetch a larger pool so min_score filtering still leaves top_k results
    pool_size = max(top_k * 3, 30)
    all_results = engine.search(req.query, top_k=pool_size)

    # Apply min_score cutoff
    passing = [r for r in all_results if r.score >= min_score]
    low_relevance_count = len(all_results) - len(passing)
    results = passing[:top_k]

    explanation, err = None, None
    if req.explain and results:
        explanation, err = await explain_fn(req.query, results)

    # Save to search history if authenticated
    if current_user:
        try:
            await db.save_history(
                current_user["id"], req.repo_id, req.query, len(results)
            )
        except Exception:
            pass  # Never fail a search just because history save fails

    return {
        "query": req.query,
        "results": [asdict(r) for r in results],
        "explanation": explanation,
        "explanation_error": err,
        "result_count": len(results),
        "low_relevance_count": low_relevance_count,
    }


# ---------------------------------------------------------------------------
# Search history (v2)
# ---------------------------------------------------------------------------


@router.get("/history")
async def get_history(
    repo_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    history = await db.get_history(current_user["id"], repo_id=repo_id)
    return history


# ---------------------------------------------------------------------------
# Benchmark result (v2)
# ---------------------------------------------------------------------------


@router.get("/benchmark")
def get_benchmark():
    result = db.get_benchmark_result()
    if result is None:
        raise HTTPException(404, "No benchmark result available. Run backend/scripts/benchmark.py first.")
    return result

