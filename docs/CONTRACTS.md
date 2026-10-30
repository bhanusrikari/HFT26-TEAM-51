# RepoLens API and Module Contracts (FROZEN)

## HTTP API
- GET  /api/health -> {"status":"ok"}
- POST /api/repositories/upload (multipart field "file", .zip) -> Index response
- POST /api/repositories/github {"url":"https://github.com/owner/repo"} -> Index response
- GET  /api/repositories/{repo_id} -> Index response + "languages": {"python": 20} + "skipped": {"excluded_dir":0,"generated":0,"too_large":0,"binary":0,"unsupported":0,"limit":0}
- POST /api/search {"repo_id","query","top_k":5,"explain":true} -> Search response

Index response:
{"repo_id":"abc123","name":"sample-project","indexed_files":42,"indexed_chunks":125}

Search response:
{
  "query": "...",
  "results": [{
    "file_path": "backend/auth.py", "symbol": "verify_token", "kind": "function",
    "language": "python", "start_line": 10, "end_line": 25, "score": 0.94,
    "code": "def verify_token(token): ...", "match_reasons": ["lexical","symbol"]
  }],
  "explanation": "string or null",
  "explanation_error": "string or null",
  "result_count": 1
}

Errors: always {"detail": "message"} with 400 (bad input), 404 (unknown repo_id), 413 (too large), 502 (GitHub/upstream failure).
Search never returns 5xx just because the LLM failed: results are returned with explanation=null and explanation_error set.
File paths, line numbers and code always come from the index, never from the LLM.

## Python models
See backend/app/models.py (FileRecord, Chunk, RepoIndex, SearchResult). Do not edit.

## Function signatures
ingestion/indexer.py
  def index_zip(zip_path: str, name: str) -> RepoIndex      # ValueError on bad input
  def index_github(url: str) -> RepoIndex                   # ValueError (400) / RuntimeError (502)
retrieval/search.py
  def get_engine(index: RepoIndex) -> SearchEngine
  class SearchEngine: __init__(index); search(query: str, top_k: int = 5) -> list[SearchResult]
ai/explainer.py
  async def explain(query, results) -> tuple[Optional[str], Optional[str]]   # (explanation, error), never raises
ai/featherless.py
  async def chat_completion(messages, model=None, max_tokens=500, temperature=0.2) -> str   # raises FeatherlessError

## Ranking weights
Without embeddings: 0.70 lexical + 0.20 symbol + 0.10 path
With embeddings:    0.40 lexical + 0.25 symbol + 0.10 path + 0.25 semantic


## Contract v2 (additive; v1 endpoints remain backward-compatible)

### Authentication
Session-based via `httpOnly`, `SameSite=Lax` cookie (`repolens_session` containing JWT). Passwords hashed with bcrypt (cost >= 12). Login attempts rate-limited (max 10 failures per 5-minute window per IP).
- `POST /api/auth/signup` {"email", "password"} -> 201 {"id": 1, "email": "...", "created_at": "..."} + sets session cookie. 400 on invalid email/short password (<8 chars), 409 on duplicate email.
- `POST /api/auth/login` {"email", "password"} -> 200 {"id": 1, "email": "..."} + sets session cookie. 401 on bad credentials, 429 on rate limit.
- `POST /api/auth/logout` -> 200 {"detail": "Logged out"} + clears session cookie.
- `GET /api/auth/me` -> 200 {"id": 1, "email": "...", "created_at": "..."}. 401 if unauthenticated or expired.

### Per-User Repository Isolation
Authenticated requests isolate repositories and search history by user ID:
- `GET /api/repositories` -> 200 list of user's repositories `[{"repo_id", "name", "status", "progress", "error", "indexed_files", "indexed_chunks", "created_at"}]`.
- All `/api/repositories/{id}` and `/api/search` calls enforce ownership: return 404 if the repo belongs to another user.
- Unauthenticated / anonymous requests can access repositories created anonymously in the same server runtime (backward-compatible).

### Async Indexing & Status Tracking
- `POST /api/repositories/upload` (multipart "file", .zip) -> 202 {"repo_id": "...", "status": "queued"}. 400 for non-zip, 413 if > 50 MB.
- `POST /api/repositories/github` {"url": "..."} -> 202 {"repo_id": "...", "status": "queued"}. 400 for bad URL, 502 on GitHub rate-limit/network error.
- `GET /api/repositories/{repo_id}` -> 200 {
    "repo_id": "...",
    "name": "...",
    "status": "queued" | "cloning" | "parsing" | "embedding" | "ready" | "failed",
    "progress": 0.0 to 1.0,
    "error": "string or null",
    "indexed_files": 42,
    "indexed_chunks": 125,
    "languages": {"python": 20},
    "skipped": {"excluded_dir": 0, "generated": 0, "too_large": 0, "binary": 0, "unsupported": 0, "limit": 0}
  }

### Search v2 & Search History
- `POST /api/search` {
    "repo_id": "...",
    "query": "...",
    "top_k": 10,           // integer, 1..20, default 10
    "explain": true,       // boolean, default true
    "min_score": 0.35      // float 0.0..1.0, default 0.35
  }
  -> 200 {
    "query": "...",
    "results": [...],
    "explanation": "string or null",
    "explanation_error": "string or null",
    "result_count": 5,
    "low_relevance_count": 2   // count of candidate results hidden below min_score
  }
  Authenticated searches automatically save an entry to the user's search history.
- `GET /api/history?repo_id={optional}` -> 200 list of `[{"id": 1, "repo_id": "...", "query": "...", "result_count": 5, "timestamp": "..."}]` ordered latest first (limit 100).

### Benchmark
- `GET /api/benchmark` -> 200 latest benchmark results comparing RepoLens vs ripgrep across 10 labelled queries:
  {
    "repo": "sample-repo",
    "precision_at_5": 0.90,
    "index_time_seconds": 1.24,
    "queries": [
      {"query": "...", "repolens_top_files": [...], "grep_matches": [...], "precision": 1.0}
    ],
    "timestamp": "..."
  }
