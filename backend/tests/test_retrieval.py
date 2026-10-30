import os
import pytest
from unittest.mock import AsyncMock, patch
import httpx

from app.ai.explainer import explain, _validate_hallucinations
from app.ai.featherless import FeatherlessError, chat_completion
from app.models import Chunk, RepoIndex, SearchResult
from app.retrieval.ranking import (
    BM25,
    LEXICAL_WEIGHT,
    PATH_WEIGHT,
    PURE_STOPWORDS,
    QUERY_STOPWORDS,
    SEM_LEXICAL_WEIGHT,
    SEM_PATH_WEIGHT,
    SEM_SEMANTIC_WEIGHT,
    SEM_SYMBOL_WEIGHT,
    SYMBOL_WEIGHT,
    combine,
    filter_query_tokens,
    light_stem,
    min_max_normalize,
    tokenize,
)
from app.retrieval.search import SearchEngine, get_engine
from tests.fixtures_retrieval.sample_repo import create_sample_repo_index


# -------------------------------------------------------------------------
# 1. Tokenizer Tests
# -------------------------------------------------------------------------
def test_tokenizer_camel_pascal_snake_kebab():
    # camelCase
    assert tokenize("verifyToken") == ["verify", "token", "verifytoken"]
    # PascalCase
    assert tokenize("AuthService") == ["auth", "service", "authservice"]
    # snake_case
    assert tokenize("verify_token") == ["verify", "token"]
    # kebab-case
    assert tokenize("auth-service-handler") == ["auth", "service", "handler"]
    # dotted paths
    assert tokenize("api.v1.auth.routes") == ["api", "v1", "auth", "route"]
    # slashes
    assert tokenize("backend/routes/auth.py") == ["backend", "route", "auth", "py"]


def test_tokenizer_length_and_digits():
    # Single letter dropped, digit kept
    assert tokenize("x = 1") == ["1"]
    assert tokenize("a b c 9 42") == ["9", "42"]


def test_tokenizer_stemming():
    # Conservative stemming
    assert light_stem("authentication") == "authenticat"
    assert light_stem("authenticate") == "authenticat"
    assert light_stem("authenticating") == "authenticat"
    assert light_stem("authenticated") == "authenticat"
    assert light_stem("tokens") == "token"
    assert light_stem("indexes") == "index"
    assert light_stem("classes") == "class"
    assert light_stem("running") == "run"


# -------------------------------------------------------------------------
# 2. BM25 Ordering Tests
# -------------------------------------------------------------------------
def test_bm25_ordering_on_tiny_corpus():
    corpus = [
        ["login", "auth", "token", "jwt"],
        ["database", "pool", "session", "connection"],
        ["utils", "hash", "string", "helper"],
    ]
    bm25 = BM25(corpus)

    scores_login = bm25.score_all(["login"])
    assert scores_login[0] > 0
    assert scores_login[1] == 0.0
    assert scores_login[2] == 0.0
    assert scores_login[0] > scores_login[1]

    scores_db = bm25.score_all(["database", "session"])
    assert scores_db[1] > scores_db[0]
    assert scores_db[1] > scores_db[2]


def test_bm25_empty_and_zero_len():
    # Empty corpus
    bm_empty = BM25([])
    assert bm_empty.score(["test"], 0) == 0.0
    assert bm_empty.score_all(["test"]) == []

    # Zero length document
    bm_zero = BM25([[], ["valid", "token"]])
    assert bm_zero.score(["valid"], 0) == 0.0
    assert bm_zero.score(["valid"], 1) > 0.0


# -------------------------------------------------------------------------
# 3. Normalization Edge Cases
# -------------------------------------------------------------------------
def test_normalization_edge_cases():
    assert min_max_normalize([]) == []
    assert min_max_normalize([0.0, 0.0, 0.0]) == [0.0, 0.0, 0.0]
    assert min_max_normalize([4.5, 4.5, 4.5]) == [0.0, 0.0, 0.0]
    assert min_max_normalize([10.0]) == [0.0]
    assert min_max_normalize([1.0, 3.0]) == [0.0, 1.0]
    norm = min_max_normalize([10.0, 20.0, 30.0])
    assert [round(x, 4) for x in norm] == [0.0, 0.5, 1.0]


# -------------------------------------------------------------------------
# 4. Weights Sum Correctness
# -------------------------------------------------------------------------
def test_weights_sum_correctness():
    assert round(LEXICAL_WEIGHT + SYMBOL_WEIGHT + PATH_WEIGHT, 6) == 1.00
    assert (
        round(
            SEM_LEXICAL_WEIGHT
            + SEM_SYMBOL_WEIGHT
            + SEM_PATH_WEIGHT
            + SEM_SEMANTIC_WEIGHT,
            6,
        )
        == 1.00
    )

    # Test combine calculations
    comb_no_sem = combine(1.0, 0.5, 0.2)
    assert round(comb_no_sem, 4) == round(0.70 * 1.0 + 0.20 * 0.5 + 0.10 * 0.2, 4)

    comb_with_sem = combine(1.0, 0.5, 0.2, 0.8)
    assert round(comb_with_sem, 4) == round(
        0.40 * 1.0 + 0.25 * 0.5 + 0.10 * 0.2 + 0.25 * 0.8, 4
    )


# -------------------------------------------------------------------------
# 5. NL vs Keyword Query Handling
# -------------------------------------------------------------------------
def test_nl_vs_keyword_queries():
    # Keyword query < 3 tokens: preserves query stopwords like 'find'
    kw_tokens = tokenize("find login")
    filtered_kw = filter_query_tokens(kw_tokens)
    assert "find" in filtered_kw
    assert "login" in filtered_kw

    # Keyword query < 3 tokens: strips pure stopword 'the'
    kw_the = tokenize("the login")
    filtered_the = filter_query_tokens(kw_the)
    assert "the" not in filtered_the
    assert "login" in filtered_the

    # Natural language query >= 3 tokens: strips full QUERY_STOPWORDS
    nl_tokens = tokenize("where is authentication handled")
    filtered_nl = filter_query_tokens(nl_tokens)
    assert "where" not in filtered_nl
    assert "is" not in filtered_nl
    assert "handl" not in filtered_nl
    assert "authenticat" in filtered_nl


# -------------------------------------------------------------------------
# 6. Exact-Symbol Queries Rank First
# -------------------------------------------------------------------------
def test_exact_symbol_queries_rank_first():
    index = create_sample_repo_index()
    engine = SearchEngine(index)

    # Exact symbol query
    results = engine.search("verify_token", top_k=5)
    assert len(results) > 0
    top = results[0]
    assert "verify_token" in (top.symbol or "")
    assert "symbol" in top.match_reasons

    # Check AuthService query
    results_auth = engine.search("AuthService", top_k=3)
    assert len(results_auth) > 0
    assert "AuthService" in (results_auth[0].symbol or "")


# -------------------------------------------------------------------------
# 7. Path-Matching Queries
# -------------------------------------------------------------------------
def test_path_matching_queries():
    index = create_sample_repo_index()
    engine = SearchEngine(index)

    # "where is login route" should find backend/routes/auth_routes.py
    results = engine.search("where is login route", top_k=3)
    assert len(results) > 0
    top_paths = [r.file_path for r in results]
    assert "backend/routes/auth_routes.py" in top_paths

    # "database session" should match backend/db/session.py
    results_db = engine.search("database session get_db", top_k=3)
    assert len(results_db) > 0
    assert any("backend/db/session.py" == r.file_path for r in results_db)


# -------------------------------------------------------------------------
# 8. Dedup and Diversity Rules
# -------------------------------------------------------------------------
def test_dedup_nested_ranges():
    # Chunk A enclosing Chunk B in same file
    chunk_parent = Chunk(
        chunk_id="parent_class",
        file_path="app/test.py",
        language="python",
        symbol="MyClass",
        kind="class",
        start_line=1,
        end_line=50,
        code="class MyClass:\n    def target_method(self):\n        pass",
    )
    chunk_child = Chunk(
        chunk_id="child_method",
        file_path="app/test.py",
        language="python",
        symbol="MyClass.target_method",
        kind="method",
        start_line=2,
        end_line=4,
        code="    def target_method(self):\n        pass",
    )
    idx = RepoIndex(
        repo_id="test-dedup",
        name="test-dedup",
        files=[],
        chunks=[chunk_parent, chunk_child],
    )
    engine = SearchEngine(idx)

    # Method has exact symbol match, higher score; parent contains child -> child kept
    results = engine.search("target_method", top_k=5)
    assert len(results) == 1
    assert results[0].start_line == 2
    assert results[0].end_line == 4


def test_diversity_max_two_per_file():
    # 4 chunks in file1, 2 chunks in file2
    chunks = [
        Chunk(f"c1_{i}", "file1.py", "python", f"fn1_{i}", "function", i * 10, i * 10 + 5, f"def fn1_{i}(): pass common_token")
        for i in range(4)
    ]
    chunks.extend([
        Chunk(f"c2_{i}", "file2.py", "python", f"fn2_{i}", "function", i * 10, i * 10 + 5, f"def fn2_{i}(): pass common_token")
        for i in range(2)
    ]
    )
    idx = RepoIndex(repo_id="test-div", name="test-div", files=[], chunks=chunks)
    engine = SearchEngine(idx)

    # Request top_k=3: file1 would dominate, but diversity caps it at 2
    results = engine.search("common_token", top_k=3)
    assert len(results) == 3
    file1_count = sum(1 for r in results if r.file_path == "file1.py")
    file2_count = sum(1 for r in results if r.file_path == "file2.py")
    assert file1_count == 2
    assert file2_count == 1

    # If top_k=5, file1 provides its 3rd candidate to fill quota
    results_5 = engine.search("common_token", top_k=5)
    assert len(results_5) == 5


# -------------------------------------------------------------------------
# 9. Empty-Query and No-Match Behavior
# -------------------------------------------------------------------------
def test_empty_query_and_no_match():
    index = create_sample_repo_index()
    engine = SearchEngine(index)

    assert engine.search("") == []
    assert engine.search("   ") == []
    assert engine.search("\t\n") == []
    assert engine.search("nonexistent_symbol_xyz_12345_qwerty") == []


def test_performance_5000_chunks():
    import time
    # Generate 5,000 synthetic chunks
    synthetic_chunks = [
        Chunk(
            chunk_id=f"perf_{i}",
            file_path=f"backend/service_{i % 50}.py",
            language="python",
            symbol=f"function_{i}",
            kind="function",
            start_line=1,
            end_line=20,
            code=f"def function_{i}():\n    return calculate_hash(user_id_{i})",
        )
        for i in range(5000)
    ]
    idx = RepoIndex(
        repo_id="perf-repo",
        name="perf-repo",
        files=[],
        chunks=synthetic_chunks,
    )

    t0 = time.perf_counter()
    engine = SearchEngine(idx)
    index_time = time.perf_counter() - t0
    assert index_time < 1.0, f"Indexing 5000 chunks took {index_time:.3f}s (must be < 1.0s)"

    t0 = time.perf_counter()
    results = engine.search("calculate_hash user_id_100", top_k=5)
    query_time = time.perf_counter() - t0
    assert query_time < 0.100, f"Querying took {query_time:.4f}s (must be < 0.100s)"
    assert len(results) > 0


def test_get_engine_caching():
    index = create_sample_repo_index()
    eng1 = get_engine(index)
    eng2 = get_engine(index)
    assert eng1 is eng2


# -------------------------------------------------------------------------
# 10. Explainer Tests (Mocked Network)
# -------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_explainer_success(monkeypatch):
    monkeypatch.setenv("FEATHERLESS_API_KEY", "test-mock-key-123")

    fake_response = {
        "choices": [
            {
                "message": {
                    "content": "In [1] backend/auth.py:18-27, the `verify_token` function decodes JWT tokens."
                }
            }
        ]
    }

    mock_resp = httpx.Response(
        status_code=200,
        json=fake_response,
        request=httpx.Request("POST", "https://api.featherless.ai/v1/chat/completions"),
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        results = [
            SearchResult(
                file_path="backend/auth.py",
                symbol="verify_token",
                kind="method",
                language="python",
                start_line=18,
                end_line=27,
                score=0.95,
                code="def verify_token(token): return jwt.decode(token)",
                match_reasons=["lexical", "symbol"],
            )
        ]
        explanation, err = await explain("how to verify token?", results)
        assert err is None
        assert explanation is not None
        assert "verify_token" in explanation


@pytest.mark.asyncio
async def test_explainer_missing_key(monkeypatch):
    monkeypatch.setenv("FEATHERLESS_API_KEY", "")
    results = [
        SearchResult(
            file_path="backend/auth.py",
            symbol="verify_token",
            kind="method",
            language="python",
            start_line=18,
            end_line=27,
            score=0.95,
            code="def verify_token(): pass",
            match_reasons=["symbol"],
        )
    ]
    explanation, err = await explain("test", results)
    assert explanation is None
    assert err is not None
    assert "FEATHERLESS_API_KEY is not set" in err


@pytest.mark.asyncio
async def test_explainer_timeout_and_retry(monkeypatch):
    monkeypatch.setenv("FEATHERLESS_API_KEY", "test-mock-key")

    mock_req = httpx.Request("POST", "https://api.featherless.ai/v1/chat/completions")
    mock_resp = httpx.Response(
        status_code=200,
        json={"choices": [{"message": {"content": "Resolved after retry [1]"}}]},
        request=mock_req,
    )

    # First call times out, second call succeeds
    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [
            httpx.TimeoutException("Read timeout", request=mock_req),
            mock_resp,
        ]
        results = [
            SearchResult(
                file_path="backend/auth.py",
                symbol="verify_token",
                kind="method",
                language="python",
                start_line=18,
                end_line=27,
                score=0.95,
                code="def verify_token(): pass",
                match_reasons=["symbol"],
            )
        ]
        explanation, err = await explain("test retry", results)
        assert err is None
        assert "Resolved after retry [1]" in (explanation or "")
        assert mock_post.call_count == 2


@pytest.mark.asyncio
async def test_explainer_429_retry(monkeypatch):
    monkeypatch.setenv("FEATHERLESS_API_KEY", "test-mock-key")

    mock_req = httpx.Request("POST", "https://api.featherless.ai/v1/chat/completions")
    resp_429 = httpx.Response(status_code=429, request=mock_req)
    resp_200 = httpx.Response(
        status_code=200,
        json={"choices": [{"message": {"content": "Success after 429 backoff [1]"}}]},
        request=mock_req,
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [resp_429, resp_200]
        results = [
            SearchResult(
                file_path="backend/auth.py",
                symbol="test_sym",
                kind="function",
                language="python",
                start_line=1,
                end_line=10,
                score=0.8,
                code="def test_sym(): pass",
                match_reasons=["symbol"],
            )
        ]
        explanation, err = await explain("query", results)
        assert err is None
        assert "Success after 429" in (explanation or "")
        assert mock_post.call_count == 2


@pytest.mark.asyncio
async def test_explainer_malformed_json(monkeypatch):
    monkeypatch.setenv("FEATHERLESS_API_KEY", "test-mock-key")

    mock_req = httpx.Request("POST", "https://api.featherless.ai/v1/chat/completions")
    # Response without choices
    bad_resp = httpx.Response(status_code=200, json={"status": "unexpected"}, request=mock_req)

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = bad_resp
        results = [
            SearchResult(
                file_path="backend/auth.py",
                symbol="test_sym",
                kind="function",
                language="python",
                start_line=1,
                end_line=10,
                score=0.8,
                code="def test_sym(): pass",
                match_reasons=["symbol"],
            )
        ]
        explanation, err = await explain("query", results)
        assert explanation is None
        assert err is not None
        assert "AI explanation unavailable" in err


def test_explainer_hallucinated_path_flagging():
    evidence = "[1] backend/auth.py:10-20 (login, function)\n```\ndef login(): pass\n```"
    
    # Valid explanation (only references backend/auth.py and login)
    good_text = "See [1] backend/auth.py where `login` is defined."
    validated_good = _validate_hallucinations(good_text, evidence)
    assert "(Note: some references were not verified" not in validated_good

    # Hallucinated path
    hallucinated_path = "See [1] and also check backend/secret_vault/keys.py."
    validated_bad_path = _validate_hallucinations(hallucinated_path, evidence)
    assert "(Note: some references were not verified against retrieved code.)" in validated_bad_path

    # Hallucinated backticked identifier
    hallucinated_ident = "In [1], run `super_unknown_crypto_hash` to proceed."
    validated_bad_ident = _validate_hallucinations(hallucinated_ident, evidence)
    assert "(Note: some references were not verified against retrieved code.)" in validated_bad_ident
