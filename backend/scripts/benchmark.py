"""
RepoLens Benchmark Script
Compares RepoLens hybrid retrieval vs simple grep search on 10 labelled queries.
Measures indexing time and precision@5, saving the results to benchmark_result.json.
"""

import json
import os
import re
import sys
import time
from datetime import datetime, timezone

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.ingestion.indexer import build_index
from app.retrieval.search import SearchEngine

BENCHMARK_QUERIES = [
    {"query": "service handler", "expected": ["src/service.py"]},
    {"query": "render component", "expected": ["src/components/App.tsx"]},
    {"query": "formatDate", "expected": ["src/utils.js"]},
    {"query": "fetchData", "expected": ["src/service.py"]},
    {"query": "React component", "expected": ["src/components/App.tsx"]},
    {"query": "data processing", "expected": ["src/service.py"]},
    {"query": "calculate helper", "expected": ["src/utils.js"]},
    {"query": "user interface button", "expected": ["src/components/App.tsx"]},
    {"query": "utility functions", "expected": ["src/utils.js"]},
    {"query": "service status check", "expected": ["src/service.py"]},
]


def run_grep_search(root_dir: str, query: str) -> list[str]:
    """Simple plain grep: search file contents for query terms."""
    terms = query.lower().split()
    matched_files = []
    for dirpath, _, filenames in os.walk(root_dir):
        if any(ignored in dirpath for ignored in [".git", "node_modules", "dist", "__pycache__"]):
            continue
        for fname in filenames:
            fpath = os.path.join(dirpath, fname)
            rel_path = os.path.relpath(fpath, root_dir).replace("\\", "/")
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read().lower()
                    if any(t in content for t in terms):
                        matched_files.append(rel_path)
            except OSError:
                continue
    return matched_files[:5]


def run_benchmark():
    fixture_dir = os.path.join(backend_dir, "tests", "fixtures", "sample_repo")
    if not os.path.isdir(fixture_dir):
        print(f"Error: fixture dir {fixture_dir} not found.")
        sys.exit(1)

    print(f"Indexing {fixture_dir}...")
    t0 = time.perf_counter()
    index = build_index(fixture_dir, name="sample-repo")
    index_time = round(time.perf_counter() - t0, 4)
    print(f"Indexed in {index_time:.4f}s: {len(index.files)} files, {len(index.chunks)} chunks.")

    engine = SearchEngine(index)

    query_results = []
    total_repolens_hits = 0
    total_grep_hits = 0

    for item in BENCHMARK_QUERIES:
        q = item["query"]
        expected = item["expected"]

        # 1. RepoLens search
        rl_res = engine.search(q, top_k=5)
        rl_files = [r.file_path for r in rl_res]
        rl_correct = sum(1 for f in rl_files if any(exp in f for exp in expected))
        rl_p5 = rl_correct / max(len(rl_files), 1)
        total_repolens_hits += rl_p5

        # 2. Grep search
        grep_files = run_grep_search(fixture_dir, q)
        grep_correct = sum(1 for f in grep_files if any(exp in f for exp in expected))
        grep_p5 = grep_correct / max(len(grep_files), 1)
        total_grep_hits += grep_p5

        query_results.append({
            "query": q,
            "expected": expected,
            "repolens_top_files": rl_files,
            "repolens_precision": round(rl_p5, 2),
            "grep_top_files": grep_files,
            "grep_precision": round(grep_p5, 2),
        })

    avg_repolens_p5 = round(total_repolens_hits / len(BENCHMARK_QUERIES), 3)
    avg_grep_p5 = round(total_grep_hits / len(BENCHMARK_QUERIES), 3)

    output = {
        "repo": "sample-repo",
        "precision_at_5": avg_repolens_p5,
        "grep_precision_at_5": avg_grep_p5,
        "index_time_seconds": index_time,
        "file_count": len(index.files),
        "chunk_count": len(index.chunks),
        "queries": query_results,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    out_path = os.getenv("BENCHMARK_FILE", os.path.join(backend_dir, "benchmark_result.json"))
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Benchmark written to {out_path}")
    print(f"RepoLens Precision@5: {avg_repolens_p5} vs Grep: {avg_grep_p5}")
    return output


if __name__ == "__main__":
    run_benchmark()

