import re
from typing import Optional

from ..models import SearchResult
from .featherless import FeatherlessError, chat_completion

_PATH_PATTERN = re.compile(
    r"\b[a-zA-Z0-9_.-]+[/\\][a-zA-Z0-9_./\\]+|\b[a-zA-Z0-9_.-]+\.(?:py|js|ts|json|tsx|jsx|html|css|md)\b"
)
_BACKTICK_PATTERN = re.compile(r"`([^`\n]+)`")


def _build_evidence(results: list[SearchResult], max_chars: int = 6000) -> str:
    """Format retrieved results into a numbered evidence block."""
    blocks: list[str] = []
    current_chars = 0

    for i, res in enumerate(results, 1):
        sym = res.symbol if res.symbol else "unknown"
        header = f"[{i}] {res.file_path}:{res.start_line}-{res.end_line} ({sym}, {res.kind})"
        lines = res.code.splitlines()
        if len(lines) > 40:
            snippet = "\n".join(lines[:40]) + "\n...truncated"
        else:
            snippet = res.code
        block = f"{header}\n```\n{snippet}\n```"

        if current_chars + len(block) + 2 > max_chars:
            if not blocks:
                blocks.append(block[:max_chars])
            break

        blocks.append(block)
        current_chars += len(block) + 2

    return "\n\n".join(blocks)


def _validate_hallucinations(explanation: str, evidence: str) -> str:
    """Validate explanation against retrieved evidence.
    
    If path-like strings or backticked identifiers appear in explanation
    that are not in the evidence, appends verification note.
    """
    has_unverified = False

    # Check backticked identifiers
    backticked = _BACKTICK_PATTERN.findall(explanation)
    for ident in backticked:
        ident_clean = ident.strip()
        if ident_clean and ident_clean not in evidence:
            has_unverified = True
            break

    # Check path-like strings
    if not has_unverified:
        paths = _PATH_PATTERN.findall(explanation)
        for p in paths:
            p_clean = p.strip()
            # Normalize slashes for comparison
            p_norm = p_clean.replace("\\", "/")
            evidence_norm = evidence.replace("\\", "/")
            if p_norm not in evidence_norm:
                has_unverified = True
                break

    if has_unverified:
        note = "\n\n(Note: some references were not verified against retrieved code.)"
        if note.strip() not in explanation:
            explanation = explanation + note

    return explanation


async def explain(
    query: str, results: list[SearchResult]
) -> tuple[Optional[str], Optional[str]]:
    """Generate an AI explanation grounded strictly in retrieved results.
    
    Returns (explanation, error). NEVER raises an exception.
    """
    if not results:
        return None, "AI explanation unavailable: no search results provided"

    try:
        evidence = _build_evidence(results, max_chars=6000)

        system_prompt = (
            "You are a code-navigation assistant. Answer ONLY from the numbered evidence. "
            "Cite evidence by [n] with its exact path:start-end (e.g. [1] path/to/file:10-25). "
            "Do NOT invent file paths, function names, or line numbers; refer to code only by its [n] and the symbol/path:lines shown. "
            "If the evidence does not clearly answer the question or is weak, say clearly that it is not clearly found in this repo. "
            "3-6 sentences, plain language, mention which files/functions to read first."
        )

        user_message = (
            f"Retrieved evidence:\n{evidence}\n\n"
            f"User Question: {query}\n\n"
            "Explain how the retrieved code addresses this question."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]

        raw_explanation = await chat_completion(
            messages=messages,
            max_tokens=500,
            temperature=0.2,
        )

        validated_explanation = _validate_hallucinations(raw_explanation, evidence)
        return validated_explanation, None

    except FeatherlessError as fe:
        return None, f"AI explanation unavailable: {str(fe)}"
    except Exception as exc:
        return None, f"AI explanation unavailable: {str(exc)}"
