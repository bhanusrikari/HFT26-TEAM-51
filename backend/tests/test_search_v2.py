import pytest
from app.models import Chunk, RepoIndex
from app.retrieval.search import SearchEngine

def test_search_v2_overlap_dedup():
    # Two chunks from same file with overlapping line numbers: 10-25 and 15-30
    chunks = [
        Chunk("c1", "auth.py", "python", "login", "function", 10, 25, "def login(): token = create_token() # authentication logic"),
        Chunk("c2", "auth.py", "python", "login_inner", "function", 15, 30, "token = create_token() return token # authentication logic"),
        Chunk("c3", "users.py", "python", "get_user", "function", 1, 20, "def get_user(): return 'user' # authentication"),
    ]
    idx = RepoIndex(repo_id="test-overlap", name="test-overlap", files=[], chunks=chunks)
    engine = SearchEngine(idx)

    # Search: only one of c1 or c2 should be kept because lines 10-25 and 15-30 overlap
    results = engine.search("authentication token", top_k=5)
    auth_results = [r for r in results if r.file_path == "auth.py"]
    assert len(auth_results) == 1, f"Expected 1 chunk from auth.py after overlap dedup, got {len(auth_results)}"


def test_search_v2_min_score_cutoff_and_no_padding():
    chunks = [
        Chunk("c1", "a.py", "python", "match", "function", 1, 10, "keyword_alpha unique_alpha"),
        Chunk("c2", "b.py", "python", "weak", "function", 1, 10, "irrelevant code here without matching keywords"),
    ]
    idx = RepoIndex(repo_id="test-cutoff", name="test-cutoff", files=[], chunks=chunks)
    engine = SearchEngine(idx)

    # Request with min_score=0.99 (impossible for weak matches)
    results, low_rel = engine.search("keyword_alpha", top_k=5, min_score=0.99, return_counts=True)
    assert len(results) <= 1
    # Verify no padding with low relevance chunks occurred


def test_search_v2_per_file_cap_three():
    # 5 chunks in same file, top_k=10
    chunks = [
        Chunk(f"c_{i}", "server.py", "python", f"fn_{i}", "function", i * 30 + 1, i * 30 + 20, f"def fn_{i}(): handle_request() common_target")
        for i in range(5)
    ]
    idx = RepoIndex(repo_id="test-cap", name="test-cap", files=[], chunks=chunks)
    engine = SearchEngine(idx)

    results = engine.search("common_target handle_request", top_k=10)
    server_count = sum(1 for r in results if r.file_path == "server.py")
    assert server_count <= 3, f"Expected at most 3 chunks per file, got {server_count}"
