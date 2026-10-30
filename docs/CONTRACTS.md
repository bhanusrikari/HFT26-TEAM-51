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