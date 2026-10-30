import ast
import re
from typing import List, Optional, Tuple

from ..models import Chunk


def split_large_chunks(chunks: List[Chunk], all_lines: List[str]) -> List[Chunk]:
    """
    Any chunk longer than 120 lines is split into consecutive 80-line parts
    keeping the same symbol (parts after the first still have the symbol; kind unchanged).
    """
    total_lines = len(all_lines)
    result: List[Chunk] = []
    for c in chunks:
        # Clamp start and end lines to valid ranges
        s_line = max(1, min(c.start_line, total_lines))
        e_line = max(s_line, min(c.end_line, total_lines))

        num_lines = e_line - s_line + 1
        if num_lines <= 120:
            sub_code = "\n".join(all_lines[s_line - 1 : e_line])
            result.append(
                Chunk(
                    chunk_id=f"{c.file_path}:{s_line}-{e_line}",
                    file_path=c.file_path,
                    language=c.language,
                    symbol=c.symbol,
                    kind=c.kind,
                    start_line=s_line,
                    end_line=e_line,
                    code=sub_code,
                )
            )
        else:
            curr_start = s_line
            while curr_start <= e_line:
                curr_end = min(e_line, curr_start + 79)
                sub_code = "\n".join(all_lines[curr_start - 1 : curr_end])
                result.append(
                    Chunk(
                        chunk_id=f"{c.file_path}:{curr_start}-{curr_end}",
                        file_path=c.file_path,
                        language=c.language,
                        symbol=c.symbol,
                        kind=c.kind,
                        start_line=curr_start,
                        end_line=curr_end,
                        code=sub_code,
                    )
                )
                curr_start = curr_end + 1
    return result


def find_closing_brace_line(
    text: str,
    open_brace_char_index: int,
    start_line: int,
    all_lines: List[str],
    max_lines: int = 150,
) -> int:
    """
    Find matching closing brace skipping string literals, template literals,
    single-line comments (//), and multi-line comments (/* */).
    If no balanced end is found within max_lines lines, returns a 60-line fallback window.
    """
    total_lines = len(all_lines)
    fallback_end = min(total_lines, start_line + 59)
    n = len(text)
    i = open_brace_char_index
    depth = 0
    template_stack: List[int] = []
    in_template = False

    while i < n:
        ch = text[i]

        curr_line = text[:i].count("\n") + 1
        if curr_line - start_line > max_lines:
            return fallback_end

        if ch == "/" and i + 1 < n:
            next_ch = text[i + 1]
            if next_ch == "/":
                eol = text.find("\n", i + 2)
                i = eol if eol != -1 else n
                continue
            elif next_ch == "*":
                end_comment = text.find("*/", i + 2)
                i = end_comment + 2 if end_comment != -1 else n
                continue

        if ch in ('"', "'"):
            quote = ch
            i += 1
            while i < n:
                if text[i] == "\\":
                    i += 2
                    continue
                if text[i] == quote or text[i] == "\n":
                    break
                i += 1
            i += 1
            continue

        if ch == "`":
            in_template = not in_template
            i += 1
            continue

        if in_template:
            if ch == "\\" and i + 1 < n:
                i += 2
                continue
            if ch == "$" and i + 1 < n and text[i + 1] == "{":
                template_stack.append(depth + 1)
                depth += 1
                i += 2
                in_template = False
                continue
            i += 1
            continue

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if template_stack and depth < template_stack[-1]:
                template_stack.pop()
                in_template = True
            if depth == 0:
                end_line = text[:i].count("\n") + 1
                return max(start_line, min(total_lines, end_line))

        i += 1

    return fallback_end


def parse_python(rel_path: str, text: str, all_lines: List[str]) -> List[Chunk]:
    """Parse Python source using the ast module."""
    try:
        tree = ast.parse(text)
    except (SyntaxError, ValueError, Exception):
        return parse_generic(rel_path, "python", text, all_lines)

    total_lines = len(all_lines)
    if total_lines == 0:
        return []

    covered = [False] * (total_lines + 1)
    chunks: List[Chunk] = []

    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            dec_lines = [d.lineno for d in node.decorator_list if hasattr(d, "lineno")]
            start_l = min(dec_lines + [node.lineno])
            end_l = getattr(node, "end_lineno", node.lineno)

            start_l = max(1, min(start_l, total_lines))
            end_l = max(start_l, min(end_l, total_lines))
            symbol = node.name
            kind = "function"

            for line_idx in range(start_l, end_l + 1):
                covered[line_idx] = True

            code = "\n".join(all_lines[start_l - 1 : end_l])
            chunks.append(
                Chunk(
                    chunk_id=f"{rel_path}:{start_l}-{end_l}",
                    file_path=rel_path,
                    language="python",
                    symbol=symbol,
                    kind=kind,
                    start_line=start_l,
                    end_line=end_l,
                    code=code,
                )
            )

        elif isinstance(node, ast.ClassDef):
            dec_lines = [d.lineno for d in node.decorator_list if hasattr(d, "lineno")]
            class_start = max(1, min(min(dec_lines + [node.lineno]), total_lines))
            class_name = node.name

            methods = [
                m
                for m in node.body
                if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef))
            ]

            if methods:
                first_m = methods[0]
                m_dec_lines = [d.lineno for d in first_m.decorator_list if hasattr(d, "lineno")]
                first_m_start = min(m_dec_lines + [first_m.lineno])
                class_end = max(class_start, min(total_lines, first_m_start - 1))
                while class_end > class_start and not all_lines[class_end - 1].strip():
                    class_end -= 1
            else:
                raw_end = getattr(node, "end_lineno", node.lineno)
                class_end = max(class_start, min(total_lines, raw_end))

            for line_idx in range(class_start, class_end + 1):
                covered[line_idx] = True

            class_code = "\n".join(all_lines[class_start - 1 : class_end])
            chunks.append(
                Chunk(
                    chunk_id=f"{rel_path}:{class_start}-{class_end}",
                    file_path=rel_path,
                    language="python",
                    symbol=class_name,
                    kind="class",
                    start_line=class_start,
                    end_line=class_end,
                    code=class_code,
                )
            )

            for m in methods:
                m_dec_lines = [d.lineno for d in m.decorator_list if hasattr(d, "lineno")]
                m_start = max(1, min(min(m_dec_lines + [m.lineno]), total_lines))
                m_end = max(m_start, min(getattr(m, "end_lineno", m.lineno), total_lines))
                m_symbol = f"{class_name}.{m.name}"

                for line_idx in range(m_start, m_end + 1):
                    covered[line_idx] = True

                m_code = "\n".join(all_lines[m_start - 1 : m_end])
                chunks.append(
                    Chunk(
                        chunk_id=f"{rel_path}:{m_start}-{m_end}",
                        file_path=rel_path,
                        language="python",
                        symbol=m_symbol,
                        kind="method",
                        start_line=m_start,
                        end_line=m_end,
                        code=m_code,
                    )
                )

    has_symbols = len(chunks) > 0
    line = 1
    while line <= total_lines:
        if not covered[line]:
            span_start = line
            while line <= total_lines and not covered[line]:
                line += 1
            span_end = line - 1

            s = span_start
            while s <= span_end and not all_lines[s - 1].strip():
                s += 1
            e = span_end
            while e >= s and not all_lines[e - 1].strip():
                e -= 1

            if s <= e:
                non_blank = sum(1 for idx in range(s, e + 1) if all_lines[idx - 1].strip())
                if non_blank >= 3 or not has_symbols:
                    code = "\n".join(all_lines[s - 1 : e])
                    chunks.append(
                        Chunk(
                            chunk_id=f"{rel_path}:{s}-{e}",
                            file_path=rel_path,
                            language="python",
                            symbol=None,
                            kind="module",
                            start_line=s,
                            end_line=e,
                            code=code,
                        )
                    )
        else:
            line += 1

    chunks.sort(key=lambda c: c.start_line)
    return chunks


def parse_javascript_typescript(rel_path: str, language: str, text: str, all_lines: List[str]) -> List[Chunk]:
    """Parse JavaScript and TypeScript source files using regex and brace matching."""
    total_lines = len(all_lines)
    if total_lines == 0:
        return []

    covered = [False] * (total_lines + 1)
    chunks: List[Chunk] = []

    class_pattern = re.compile(r"^(?:export\s+(?:default\s+)?)?class\s+([A-Za-z_$][A-Za-z0-9_$]*)", re.MULTILINE)
    fn_pattern = re.compile(
        r"^(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(",
        re.MULTILINE,
    )
    var_fn_pattern = re.compile(
        r"^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][A-Za-z0-9_$]*)\s*=>",
        re.MULTILINE,
    )
    var_named_fn_pattern = re.compile(
        r"^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?function",
        re.MULTILINE,
    )
    method_pattern = re.compile(
        r"^[ \t]+(?:(?:async|get|set|static)\s+)*([A-Za-z_$][A-Za-z0-9_$]*)\s*\([^)]*\)\s*\{",
        re.MULTILINE,
    )

    # 1. Detect Classes
    for match in class_pattern.finditer(text):
        symbol = match.group(1)
        start_char = match.start()
        start_line = max(1, min(total_lines, text[:start_char].count("\n") + 1))

        brace_idx = text.find("{", start_char)
        if brace_idx == -1:
            continue

        class_end_line = find_closing_brace_line(text, brace_idx, start_line, all_lines)

        # Look for methods inside the class body
        body_start = brace_idx + 1
        # Find closing brace char index for class body
        close_brace_line = class_end_line
        body_end = len(text)
        # Search for closing brace on or before class_end_line
        curr = body_start
        depth = 1
        while curr < len(text):
            ch = text[curr]
            if ch in ('"', "'", "`"):
                # Skip string literal
                q = ch
                curr += 1
                while curr < len(text):
                    if text[curr] == "\\":
                        curr += 2
                        continue
                    if text[curr] == q:
                        break
                    curr += 1
            elif ch == "/" and curr + 1 < len(text) and text[curr + 1] == "/":
                eol = text.find("\n", curr + 2)
                curr = eol if eol != -1 else len(text)
                continue
            elif ch == "/" and curr + 1 < len(text) and text[curr + 1] == "*":
                eoc = text.find("*/", curr + 2)
                curr = eoc + 2 if eoc != -1 else len(text)
                continue
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    body_end = curr
                    break
            curr += 1

        class_body = text[body_start:body_end]
        methods_found = []
        for m_match in method_pattern.finditer(class_body):
            m_name = m_match.group(1)
            if m_name in ("if", "for", "while", "switch", "catch"):
                continue
            m_start_char = body_start + m_match.start()
            m_start_line = max(1, min(total_lines, text[:m_start_char].count("\n") + 1))
            m_brace_idx = text.find("{", m_start_char)
            if m_brace_idx != -1:
                m_end_line = find_closing_brace_line(text, m_brace_idx, m_start_line, all_lines)
                methods_found.append((m_name, m_start_line, m_end_line))

        if methods_found:
            first_m_start = min(m[1] for m in methods_found)
            header_end = max(start_line, min(total_lines, first_m_start - 1))
            while header_end > start_line and not all_lines[header_end - 1].strip():
                header_end -= 1
        else:
            header_end = class_end_line

        for idx in range(start_line, header_end + 1):
            covered[idx] = True
        chunks.append(
            Chunk(
                chunk_id=f"{rel_path}:{start_line}-{header_end}",
                file_path=rel_path,
                language=language,
                symbol=symbol,
                kind="class",
                start_line=start_line,
                end_line=header_end,
                code="\n".join(all_lines[start_line - 1 : header_end]),
            )
        )

        for m_name, m_start, m_end in methods_found:
            m_start = max(1, min(total_lines, m_start))
            m_end = max(m_start, min(total_lines, m_end))
            for idx in range(m_start, m_end + 1):
                covered[idx] = True
            chunks.append(
                Chunk(
                    chunk_id=f"{rel_path}:{m_start}-{m_end}",
                    file_path=rel_path,
                    language=language,
                    symbol=f"{symbol}.{m_name}",
                    kind="method",
                    start_line=m_start,
                    end_line=m_end,
                    code="\n".join(all_lines[m_start - 1 : m_end]),
                )
            )

    # 2. Detect Named Functions
    for match in fn_pattern.finditer(text):
        start_char = match.start()
        start_line = max(1, min(total_lines, text[:start_char].count("\n") + 1))
        if covered[start_line]:
            continue

        symbol = match.group(1)
        brace_idx = text.find("{", start_char)
        if brace_idx == -1:
            end_line = min(total_lines, start_line + 20)
        else:
            end_line = find_closing_brace_line(text, brace_idx, start_line, all_lines)

        end_line = max(start_line, min(total_lines, end_line))
        for idx in range(start_line, end_line + 1):
            covered[idx] = True

        chunks.append(
            Chunk(
                chunk_id=f"{rel_path}:{start_line}-{end_line}",
                file_path=rel_path,
                language=language,
                symbol=symbol,
                kind="function",
                start_line=start_line,
                end_line=end_line,
                code="\n".join(all_lines[start_line - 1 : end_line]),
            )
        )

    # 3. Detect Arrow Functions and Function Expressions
    for pat in (var_fn_pattern, var_named_fn_pattern):
        for match in pat.finditer(text):
            start_char = match.start()
            start_line = max(1, min(total_lines, text[:start_char].count("\n") + 1))
            if covered[start_line]:
                continue

            symbol = match.group(1)
            brace_idx = text.find("{", match.end())
            if brace_idx != -1 and (brace_idx - match.end() < 100):
                end_line = find_closing_brace_line(text, brace_idx, start_line, all_lines)
            else:
                end_line = start_line
                while end_line <= min(total_lines, start_line + 5):
                    if ";" in all_lines[end_line - 1]:
                        break
                    end_line += 1
                end_line = min(end_line, total_lines)

            end_line = max(start_line, min(total_lines, end_line))
            for idx in range(start_line, end_line + 1):
                covered[idx] = True

            chunks.append(
                Chunk(
                    chunk_id=f"{rel_path}:{start_line}-{end_line}",
                    file_path=rel_path,
                    language=language,
                    symbol=symbol,
                    kind="function",
                    start_line=start_line,
                    end_line=end_line,
                    code="\n".join(all_lines[start_line - 1 : end_line]),
                )
            )

    # 4. Remaining module-level code
    has_symbols = len(chunks) > 0
    line = 1
    while line <= total_lines:
        if not covered[line]:
            span_start = line
            while line <= total_lines and not covered[line]:
                line += 1
            span_end = line - 1

            s = span_start
            while s <= span_end and not all_lines[s - 1].strip():
                s += 1
            e = span_end
            while e >= s and not all_lines[e - 1].strip():
                e -= 1

            if s <= e:
                non_blank = sum(1 for idx in range(s, e + 1) if all_lines[idx - 1].strip())
                if non_blank >= 3 or not has_symbols:
                    chunks.append(
                        Chunk(
                            chunk_id=f"{rel_path}:{s}-{e}",
                            file_path=rel_path,
                            language=language,
                            symbol=None,
                            kind="module",
                            start_line=s,
                            end_line=e,
                            code="\n".join(all_lines[s - 1 : e]),
                        )
                    )
        else:
            line += 1

    chunks.sort(key=lambda c: c.start_line)
    return chunks


def parse_markdown(rel_path: str, text: str, all_lines: List[str]) -> List[Chunk]:
    """Split markdown on headings (symbol = heading text, kind='block')."""
    total_lines = len(all_lines)
    if total_lines == 0:
        return []

    heading_indices: List[Tuple[int, str]] = []
    heading_re = re.compile(r"^(#{1,6})\s+(.+)$")

    for idx, line in enumerate(all_lines, start=1):
        m = heading_re.match(line)
        if m:
            heading_indices.append((idx, m.group(2).strip()))

    if not heading_indices:
        return parse_generic(rel_path, "markdown", text, all_lines)

    chunks: List[Chunk] = []

    first_heading_line = heading_indices[0][0]
    if first_heading_line > 1:
        s = 1
        while s < first_heading_line and not all_lines[s - 1].strip():
            s += 1
        e = first_heading_line - 1
        while e >= s and not all_lines[e - 1].strip():
            e -= 1
        if s <= e:
            chunks.append(
                Chunk(
                    chunk_id=f"{rel_path}:{s}-{e}",
                    file_path=rel_path,
                    language="markdown",
                    symbol=None,
                    kind="block",
                    start_line=s,
                    end_line=e,
                    code="\n".join(all_lines[s - 1 : e]),
                )
            )

    for i, (start_l, heading_text) in enumerate(heading_indices):
        end_l = heading_indices[i + 1][0] - 1 if i + 1 < len(heading_indices) else total_lines
        while end_l > start_l and not all_lines[end_l - 1].strip():
            end_l -= 1

        start_l = max(1, min(total_lines, start_l))
        end_l = max(start_l, min(total_lines, end_l))
        chunks.append(
            Chunk(
                chunk_id=f"{rel_path}:{start_l}-{end_l}",
                file_path=rel_path,
                language="markdown",
                symbol=heading_text,
                kind="block",
                start_line=start_l,
                end_line=end_l,
                code="\n".join(all_lines[start_l - 1 : end_l]),
            )
        )

    return chunks


def parse_generic(rel_path: str, language: str, text: str, all_lines: List[str]) -> List[Chunk]:
    """
    Generic chunker: windows of 40 lines with 5-line overlap.
    kind='block', symbol=None.
    """
    total_lines = len(all_lines)
    if total_lines == 0:
        return []

    window_size = 40
    overlap = 5
    step = window_size - overlap

    chunks: List[Chunk] = []
    start = 1
    while start <= total_lines:
        end = min(total_lines, start + window_size - 1)
        code = "\n".join(all_lines[start - 1 : end])
        chunks.append(
            Chunk(
                chunk_id=f"{rel_path}:{start}-{end}",
                file_path=rel_path,
                language=language,
                symbol=None,
                kind="block",
                start_line=start,
                end_line=end,
                code=code,
            )
        )
        if end >= total_lines:
            break
        start += step

    return chunks


def parse_other_code(rel_path: str, language: str, text: str, all_lines: List[str]) -> List[Chunk]:
    """Lightweight best-effort parsing for Go, Rust, Java, C/C++, C#, Ruby, PHP, etc."""
    return parse_generic(rel_path, language, text, all_lines)


def parse_file(rel_path: str, language: str, text: str) -> List[Chunk]:
    """
    Parse a file into semantic or windowed chunks.
    All line numbers are 1-based inclusive.
    Guarantees the exact line invariant:
      '\\n'.join(text.splitlines()[start - 1 : end]) == chunk.code
    """
    normalized_path = rel_path.replace("\\", "/")
    all_lines = text.splitlines()
    if not all_lines:
        return []

    if language == "python":
        raw_chunks = parse_python(normalized_path, text, all_lines)
    elif language in ("javascript", "typescript"):
        raw_chunks = parse_javascript_typescript(normalized_path, language, text, all_lines)
    elif language == "markdown":
        raw_chunks = parse_markdown(normalized_path, text, all_lines)
    elif language in ("go", "rust", "java", "c", "cpp", "csharp", "ruby", "php", "kotlin", "swift"):
        raw_chunks = parse_other_code(normalized_path, language, text, all_lines)
    else:
        raw_chunks = parse_generic(normalized_path, language, text, all_lines)

    return split_large_chunks(raw_chunks, all_lines)
