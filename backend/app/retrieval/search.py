import logging
import os
import re
from collections import Counter
from dataclasses import dataclass
from typing import Optional

from ..models import Chunk, RepoIndex, SearchResult
from . import embeddings
from .ranking import (
    BM25,
    combine,
    filter_query_tokens,
    min_max_normalize,
    tokenize,
)

logger = logging.getLogger(__name__)

# Global engine cache keyed by repo_id
_ENGINES: dict[str, "SearchEngine"] = {}


@dataclass
class _Candidate:
    chunk_idx: int
    chunk: Chunk
    lexical_raw: float
    lexical_norm: float
    symbol_score: float
    path_score: float
    semantic_score: Optional[float]
    final_score: float


def _is_exact_symbol_match(
    q_lower: str,
    q_norm: str,
    q_tokens: list[str],
    symbol: Optional[str],
) -> bool:
    """Check if query exactly matches symbol or its last segment."""
    if not symbol:
        return False
    s_lower = symbol.strip().lower()
    if q_lower == s_lower:
        return True
    last_segment = s_lower.split(".")[-1]
    if q_lower == last_segment:
        return True

    s_norm = s_lower.replace("_", "").replace("-", "")
    last_norm = last_segment.replace("_", "").replace("-", "")
    if q_norm and (q_norm == s_norm or q_norm == last_norm):
        return True

    for qt in q_tokens:
        if qt == s_norm or qt == last_norm or qt == s_lower or qt == last_segment:
            return True

    return False


def _is_basename_match(q_tokens_set: set[str], file_path: str) -> bool:
    """Check if any query token matches the file basename."""
    basename = os.path.basename(file_path)
    base_no_ext, _ = os.path.splitext(basename)
    base_tokens = set(tokenize(base_no_ext))
    return not base_tokens.isdisjoint(q_tokens_set)


class SearchEngine:
    def __init__(self, index: RepoIndex):
        self.index = index
        self.chunks: list[Chunk] = index.chunks

        self.lexical_docs: list[list[str]] = []
        self.symbol_tokens: list[list[str]] = []
        self.symbol_tokens_sets: list[set[str]] = []
        self.path_tokens: list[list[str]] = []
        self.path_tokens_sets: list[set[str]] = []
        self.corpus_vocab: set[str] = set()

        for chunk in self.chunks:
            code_t = tokenize(chunk.code)
            sym_t = tokenize(chunk.symbol) if chunk.symbol else []
            path_t = tokenize(chunk.file_path)

            # lexical doc = tokens(code) + tokens(symbol)*3 + tokens(file_path)*1
            lex_doc = code_t + (sym_t * 3) + path_t

            self.lexical_docs.append(lex_doc)
            self.symbol_tokens.append(sym_t)
            self.symbol_tokens_sets.append(set(sym_t))
            self.path_tokens.append(path_t)
            self.path_tokens_sets.append(set(path_t))
            self.corpus_vocab.update(lex_doc)

        self.bm25 = BM25(self.lexical_docs)
        self.chunk_embeddings = embeddings.get_chunk_embeddings(self.chunks)

    def search(self, query: str, top_k: int = 5) -> list[SearchResult]:
        if not query or not query.strip():
            return []

        raw_q_tokens = tokenize(query)
        if not raw_q_tokens:
            return []

        q_tokens = filter_query_tokens(raw_q_tokens)
        if not q_tokens:
            return []

        # If none of the query tokens exist in the corpus vocabulary, return []
        if not any(qt in self.corpus_vocab for qt in q_tokens):
            return []

        q_tokens_set = set(q_tokens)
        total_q = float(len(q_tokens))
        q_lower = query.strip().lower()
        q_norm = re.sub(r"[^a-zA-Z0-9]", "", q_lower)
        bm25_scores = self.bm25.score_all(q_tokens)
        sem_scores = embeddings.compute_semantic_scores(
            query, self.chunks, self.chunk_embeddings
        )

        candidates: list[_Candidate] = []

        for idx, chunk in enumerate(self.chunks):
            lex_raw = bm25_scores[idx]
            sym_set = self.symbol_tokens_sets[idx]
            path_set = self.path_tokens_sets[idx]

            has_sym_overlap = bool(sym_set and not sym_set.isdisjoint(q_tokens_set))
            has_path_overlap = bool(path_set and not path_set.isdisjoint(q_tokens_set))

            # Fast path: if no lexical score and no token overlap with symbol/path, skip expensive checks
            if lex_raw == 0.0 and not has_sym_overlap and not has_path_overlap:
                continue

            # Symbol score
            if sym_set:
                sym_overlap = sum(1 for qt in q_tokens if qt in sym_set)
                sym_score = sym_overlap / total_q
                if _is_exact_symbol_match(q_lower, q_norm, q_tokens, chunk.symbol):
                    sym_score = min(1.0, sym_score + 0.5)
            else:
                sym_score = 0.0

            # Path score
            if path_set:
                path_overlap = sum(1 for qt in q_tokens if qt in path_set)
                path_score = path_overlap / total_q
                if _is_basename_match(q_tokens_set, chunk.file_path):
                    path_score = min(1.0, path_score + 0.3)
            else:
                path_score = 0.0

            sem_score = sem_scores[idx] if sem_scores is not None else None

            candidates.append(
                _Candidate(
                    chunk_idx=idx,
                    chunk=chunk,
                    lexical_raw=lex_raw,
                    lexical_norm=0.0,
                    symbol_score=sym_score,
                    path_score=path_score,
                    semantic_score=sem_score,
                    final_score=0.0,
                )
            )

        if not candidates:
            return []

        # Normalize lexical across candidates
        raw_lex_list = [c.lexical_raw for c in candidates]
        norm_lex_list = min_max_normalize(raw_lex_list)

        for c, norm_lex in zip(candidates, norm_lex_list):
            c.lexical_norm = norm_lex
            score = combine(
                lexical=c.lexical_norm,
                symbol=c.symbol_score,
                path=c.path_score,
                semantic=c.semantic_score,
            )
            c.final_score = min(1.0, max(0.0, score))

        # Sort descending by score; tie-break by shorter chunk, then path
        candidates.sort(
            key=lambda c: (
                -round(c.final_score, 6),
                (c.chunk.end_line - c.chunk.start_line + 1),
                c.chunk.file_path,
                c.chunk.start_line,
            )
        )

        # Dedup: if two results are from the same file and one range contains the other,
        # keep the higher-scoring one (prefer the more specific/smaller on ties).
        deduped: list[_Candidate] = []
        file_accepted_ranges: dict[str, list[tuple[int, int]]] = {}
        for cand in candidates:
            path = cand.chunk.file_path
            cand_s, cand_e = cand.chunk.start_line, cand.chunk.end_line
            enclosed_or_enclosing = False
            if path in file_accepted_ranges:
                for acc_s, acc_e in file_accepted_ranges[path]:
                    if (cand_s <= acc_s and cand_e >= acc_e) or (acc_s <= cand_s and acc_e >= cand_e):
                        enclosed_or_enclosing = True
                        break
            if not enclosed_or_enclosing:
                deduped.append(cand)
                if path not in file_accepted_ranges:
                    file_accepted_ranges[path] = []
                file_accepted_ranges[path].append((cand_s, cand_e))
                if len(deduped) >= top_k * 5:
                    break

        # Diversity: at most 2 results per file unless that would leave fewer than top_k results.
        selected: list[_Candidate] = []
        file_counts: Counter[str] = Counter()
        deferred: list[_Candidate] = []

        for cand in deduped:
            path = cand.chunk.file_path
            if file_counts[path] < 2:
                selected.append(cand)
                file_counts[path] += 1
                if len(selected) == top_k:
                    break
            else:
                deferred.append(cand)

        if len(selected) < top_k:
            for cand in deferred:
                selected.append(cand)
                if len(selected) == top_k:
                    break

        # Final sort to ensure returned results are strictly ordered by score
        selected.sort(
            key=lambda c: (
                -round(c.final_score, 6),
                (c.chunk.end_line - c.chunk.start_line + 1),
                c.chunk.file_path,
                c.chunk.start_line,
            )
        )

        # Build final SearchResult objects
        results: list[SearchResult] = []
        for cand in selected:
            reasons: list[str] = []
            if cand.lexical_norm > 0.15:
                reasons.append("lexical")
            if cand.symbol_score > 0.15:
                reasons.append("symbol")
            if cand.path_score > 0.15:
                reasons.append("path")
            if cand.semantic_score is not None and cand.semantic_score > 0.15:
                reasons.append("semantic")

            if not reasons:
                comps = [
                    ("lexical", cand.lexical_norm),
                    ("symbol", cand.symbol_score),
                    ("path", cand.path_score),
                ]
                if cand.semantic_score is not None:
                    comps.append(("semantic", cand.semantic_score))
                reasons.append(max(comps, key=lambda x: x[1])[0])

            results.append(
                SearchResult(
                    file_path=cand.chunk.file_path,
                    symbol=cand.chunk.symbol,
                    kind=cand.chunk.kind,
                    language=cand.chunk.language,
                    start_line=cand.chunk.start_line,
                    end_line=cand.chunk.end_line,
                    score=round(cand.final_score, 4),
                    code=cand.chunk.code,
                    match_reasons=reasons,
                )
            )

        return results


def get_engine(index: RepoIndex) -> SearchEngine:
    """Retrieve or initialize SearchEngine for the given RepoIndex (cached by repo_id)."""
    if index.repo_id not in _ENGINES or _ENGINES[index.repo_id].index is not index:
        _ENGINES[index.repo_id] = SearchEngine(index)
    return _ENGINES[index.repo_id]
