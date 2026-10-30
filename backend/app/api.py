import os, shutil, tempfile
from collections import Counter
from dataclasses import asdict
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from . import store
from .ingestion import indexer
from .retrieval.search import get_engine
from .ai.explainer import explain as explain_fn

router = APIRouter(prefix="/api")

class GithubReq(BaseModel):
    url: str

class SearchReq(BaseModel):
    repo_id: str
    query: str
    top_k: int = 5
    explain: bool = True

def _summary(idx, detailed=False):
    out = {"repo_id": idx.repo_id, "name": idx.name,
           "indexed_files": len(idx.files), "indexed_chunks": len(idx.chunks)}
    if detailed:
        out["languages"] = dict(Counter(f.language for f in idx.files))
        out["skipped"] = idx.skipped
    return out

@router.get("/health")
def health(): return {"status": "ok"}

@router.post("/repositories/upload")
async def upload(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".zip"):
        raise HTTPException(400, "Please upload a .zip file")
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
    try:
        idx = indexer.index_zip(tmp.name, name=os.path.splitext(file.filename)[0])
    except ValueError as e:
        raise HTTPException(400, str(e))
    finally:
        os.unlink(tmp.name)
    store.save(idx)
    return _summary(idx)

@router.post("/repositories/github")
def github(req: GithubReq):
    try:
        idx = indexer.index_github(req.url)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(502, str(e))
    store.save(idx)
    return _summary(idx)

@router.get("/repositories/{repo_id}")
def get_repo(repo_id: str):
    idx = store.get(repo_id)
    if not idx: raise HTTPException(404, "Repository not found")
    return _summary(idx, detailed=True)

@router.post("/search")
async def search(req: SearchReq):
    idx = store.get(req.repo_id)
    if not idx: raise HTTPException(404, "Repository not found")
    if not req.query.strip(): raise HTTPException(400, "Query is empty")
    results = get_engine(idx).search(req.query, top_k=max(1, min(req.top_k, 20)))
    explanation, err = None, None
    if req.explain and results:
        explanation, err = await explain_fn(req.query, results)
    return {"query": req.query, "results": [asdict(r) for r in results],
            "explanation": explanation, "explanation_error": err,
            "result_count": len(results)}

