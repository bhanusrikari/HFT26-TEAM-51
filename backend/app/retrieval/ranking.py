import math
import re
from collections import Counter
from typing import Optional

# Weights without embeddings
LEXICAL_WEIGHT = 0.70
SYMBOL_WEIGHT = 0.20
PATH_WEIGHT = 0.10

# Weights with embeddings
SEM_LEXICAL_WEIGHT = 0.40
SEM_SYMBOL_WEIGHT = 0.25
SEM_PATH_WEIGHT = 0.10
SEM_SEMANTIC_WEIGHT = 0.25

# Query stopwords for natural language questions
QUERY_STOPWORDS = {
    "where", "what", "how", "is", "are", "the", "a", "an", "of", "in", "to",
    "does", "do", "which", "file", "code", "implemented", "implementation",
    "handle", "handled", "handles", "function", "class", "find", "show", "me",
    "used", "work", "works"
}

PURE_STOPWORDS = {"the", "a", "an"}

_TOKEN_PATTERN = re.compile(r"[a-zA-Z0-9]+")
_CAMEL_DETECT = re.compile(r"[a-z][A-Z]|[A-Z]{2,}[a-z]")
_CAMEL_SPLIT = re.compile(r"[A-Z]+(?=[A-Z][a-z0-9])|[A-Z]?[a-z0-9]+|[A-Z]+")


def light_stem(w: str) -> str:
    """Light, conservative, deterministic stemmer.
    
    Reduces plurals ('s', 'es', 'ies'), 'ing', 'ed', and maps words like
    'authentication' and 'authenticate' to a common stem 'authenticat'.
    """
    if len(w) <= 3:
        return w
    if w.endswith("ation") and len(w) > 6:
        return w[:-3]  # e.g. authentication -> authenticat
    if w.endswith("ate") and len(w) > 5:
        return w[:-1]  # e.g. authenticate -> authenticat
    if w.endswith("ing") and len(w) > 4:
        w2 = w[:-3]
        if len(w2) >= 3 and w2[-1] == w2[-2] and w2[-1] not in "aeiouy":
            return w2[:-1]
        return w2
    if w.endswith("ed") and len(w) > 4:
        w2 = w[:-2]
        if len(w2) >= 3 and w2[-1] == w2[-2] and w2[-1] not in "aeiouy":
            return w2[:-1]
        return w2
    if w.endswith("sses"):
        return w[:-2]
    if w.endswith(("xes", "shes", "ches", "zes")) and len(w) > 4:
        return w[:-2]
    if w.endswith("ies") and len(w) > 4:
        return w[:-3] + "y"
    if w.endswith("s") and not w.endswith(("ss", "us", "is", "as", "os")):
        return w[:-1]
    return w


# Precomputed stemmed stopwords for fast filtering
_STEMMED_QUERY_STOPWORDS = {light_stem(w) for w in QUERY_STOPWORDS} | QUERY_STOPWORDS


def tokenize(text: str) -> list[str]:
    """Tokenize code or query text into normalized, stemmed tokens.
    
    Splits snake_case, kebab-case, dots, slashes, camelCase/PascalCase
    (keeping both sub-tokens and the whole lowercase identifier for camelCase).
    Drops tokens of length 1 except digits.
    Applies light stemming.
    """
    if not text:
        return []

    raw_tokens = _TOKEN_PATTERN.findall(text)
    out: list[str] = []
    
    for raw in raw_tokens:
        if _CAMEL_DETECT.search(raw):
            parts = _CAMEL_SPLIT.findall(raw)
            for p in parts:
                low = p.lower()
                if len(low) > 1 or low.isdigit():
                    out.append(light_stem(low))
            full_low = raw.lower()
            if len(full_low) > 1 or full_low.isdigit():
                stemmed_full = light_stem(full_low)
                if stemmed_full not in out:
                    out.append(stemmed_full)
        else:
            low = raw.lower()
            if len(low) > 1 or low.isdigit():
                out.append(light_stem(low))
                
    return out


def filter_query_tokens(raw_tokens: list[str]) -> list[str]:
    """Filter query tokens based on query length (NL vs keyword).
    
    If query has < 3 tokens, it is treated as a keyword query and only pure
    stopwords like 'the', 'a', 'an' are removed.
    If >= 3 tokens, full QUERY_STOPWORDS are removed.
    """
    if not raw_tokens:
        return []

    if len(raw_tokens) < 3:
        filtered = [t for t in raw_tokens if t not in PURE_STOPWORDS]
        return filtered if filtered else raw_tokens

    filtered = [
        t for t in raw_tokens
        if t not in QUERY_STOPWORDS and t not in _STEMMED_QUERY_STOPWORDS
    ]
    return filtered


class BM25:
    """Okapi BM25 implementation with precomputed IDF and document lengths.
    
    Handles empty corpora and zero-length documents safely.
    """
    def __init__(self, corpus: list[list[str]], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.corpus_size = len(corpus)
        self.doc_lens = [len(doc) for doc in corpus]
        total_len = sum(self.doc_lens)
        self.avgdl = total_len / self.corpus_size if self.corpus_size > 0 else 0.0

        self.doc_freqs: Counter[str] = Counter()
        self.doc_term_freqs: list[Counter[str]] = []
        # Inverted index: term -> list of (doc_idx, tf) for fast lookups
        self.inverted_index: dict[str, list[tuple[int, int]]] = {}

        for doc_idx, doc in enumerate(corpus):
            tf = Counter(doc)
            self.doc_term_freqs.append(tf)
            for term, count in tf.items():
                self.doc_freqs[term] += 1
                if term not in self.inverted_index:
                    self.inverted_index[term] = []
                self.inverted_index[term].append((doc_idx, count))

        # Lucene/Okapi non-negative IDF: ln(1 + (N - df + 0.5) / (df + 0.5))
        self.idf: dict[str, float] = {}
        if self.corpus_size > 0:
            for term, freq in self.doc_freqs.items():
                self.idf[term] = math.log(
                    1.0 + (self.corpus_size - freq + 0.5) / (freq + 0.5)
                )

    def score(self, query_tokens: list[str], doc_idx: int) -> float:
        """Compute BM25 score for a specific document against query tokens."""
        if self.corpus_size == 0 or doc_idx >= self.corpus_size:
            return 0.0
        doc_len = self.doc_lens[doc_idx]
        if doc_len == 0 or self.avgdl == 0.0:
            return 0.0

        tf_dict = self.doc_term_freqs[doc_idx]
        len_norm = 1.0 - self.b + self.b * (doc_len / self.avgdl)
        total_score = 0.0

        for q in query_tokens:
            if q not in tf_dict:
                continue
            tf = tf_dict[q]
            idf = self.idf.get(q, 0.0)
            total_score += idf * (tf * (self.k1 + 1.0)) / (tf + self.k1 * len_norm)

        return total_score

    def score_all(self, query_tokens: list[str]) -> list[float]:
        """Compute BM25 scores for all documents in the corpus."""
        if self.corpus_size == 0 or not query_tokens:
            return [0.0] * self.corpus_size

        scores = [0.0] * self.corpus_size
        if self.avgdl == 0.0:
            return scores

        # Use inverted index to score only documents containing query tokens
        q_counts = Counter(query_tokens)
        for q, q_mult in q_counts.items():
            if q not in self.inverted_index:
                continue
            idf = self.idf.get(q, 0.0)
            postings = self.inverted_index[q]
            for doc_idx, tf in postings:
                doc_len = self.doc_lens[doc_idx]
                if doc_len == 0:
                    continue
                len_norm = 1.0 - self.b + self.b * (doc_len / self.avgdl)
                term_score = idf * (tf * (self.k1 + 1.0)) / (tf + self.k1 * len_norm)
                scores[doc_idx] += term_score * q_mult

        return scores


def min_max_normalize(scores: list[float]) -> list[float]:
    """Min-max normalize a list of scores to [0.0, 1.0].
    
    If all scores are equal or all zero, returns all zeros.
    """
    if not scores:
        return []
    min_s = min(scores)
    max_s = max(scores)
    if max_s == min_s:
        return [0.0] * len(scores)
    range_s = max_s - min_s
    return [(s - min_s) / range_s for s in scores]


def combine(
    lexical: float,
    symbol: float,
    path: float,
    semantic: Optional[float] = None
) -> float:
    """Combine score components into a single scalar score in [0.0, 1.0].
    
    Without embeddings: 0.70*lexical + 0.20*symbol + 0.10*path
    With embeddings:    0.40*lexical + 0.25*symbol + 0.10*path + 0.25*semantic
    """
    if semantic is not None:
        return (
            SEM_LEXICAL_WEIGHT * lexical
            + SEM_SYMBOL_WEIGHT * symbol
            + SEM_PATH_WEIGHT * path
            + SEM_SEMANTIC_WEIGHT * semantic
        )
    return (
        LEXICAL_WEIGHT * lexical
        + SYMBOL_WEIGHT * symbol
        + PATH_WEIGHT * path
    )
