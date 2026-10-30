"""Smoke test script for human quality verification.

Builds sample RepoIndex fixture and executes 5 diverse search queries,
printing the top-5 results with their ranks, scores, match reasons,
file paths, line numbers, and symbol names.
"""

import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.retrieval.search import SearchEngine
from tests.fixtures_retrieval.sample_repo import create_sample_repo_index


def run_smoke_test():
    index = create_sample_repo_index()
    engine = SearchEngine(index)

    sample_queries = [
        "where is login route",
        "verify JWT token",
        "database session connection pool",
        "hash password with salt",
        "AuthService.create_access_token",
    ]

    print("=" * 70)
    print("RepoLens Retrieval Smoke Test (Top-5 Results)")
    print(f"Total indexed chunks: {len(index.chunks)} across {len(index.files)} files")
    print("=" * 70)

    for q_idx, query in enumerate(sample_queries, 1):
        print(f"\n[Query {q_idx}]: \"{query}\"")
        results = engine.search(query, top_k=5)
        if not results:
            print("  (No results found)")
            continue

        for rank, res in enumerate(results, 1):
            sym = res.symbol or "<no symbol>"
            print(
                f"  {rank}. [{res.score:.4f}] {res.file_path}:{res.start_line}-{res.end_line} "
                f"| {res.kind} '{sym}' | reasons: {res.match_reasons}"
            )
            # Print brief preview of first code line
            first_line = res.code.strip().splitlines()[0] if res.code.strip() else ""
            print(f"     Preview: {first_line[:65]}...")

    print("\n" + "=" * 70)
    print("Smoke test completed successfully.")
    print("=" * 70)


if __name__ == "__main__":
    run_smoke_test()
