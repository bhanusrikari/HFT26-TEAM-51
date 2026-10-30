import os
from typing import Optional, Tuple

EXCLUDED_DIRS = {
    ".git", "node_modules", "dist", "build", "out", "target",
    "__pycache__", ".venv", "venv", "env", ".next", ".nuxt",
    "coverage", "vendor", ".idea", ".vscode", ".pytest_cache",
    ".mypy_cache", ".gradle", "bin", "obj", "site-packages", ".tox"
}

LOCK_FILES = {
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "poetry.lock",
    "pipfile.lock",
}

GENERATED_SUFFIXES = (
    ".min.js",
    ".min.css",
    ".map",
    ".pyc",
    ".class",
    ".o",
    ".so",
    ".dll",
    ".dylib",
    ".exe",
)

BINARY_EXTENSIONS = (
    # Images
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".svg", ".tiff",
    # Fonts
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    # Archives
    ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar",
    # Audio / Video / Doc
    ".mp3", ".mp4", ".wav", ".avi", ".mov", ".mkv", ".flac", ".pdf",
)

EXTENSION_LANGUAGE_MAP = {
    # Python
    ".py": "python",
    # JavaScript
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    # TypeScript
    ".ts": "typescript",
    ".tsx": "typescript",
    # Java
    ".java": "java",
    # Go
    ".go": "go",
    # Rust
    ".rs": "rust",
    # C
    ".c": "c",
    ".h": "c",
    # C++
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".hpp": "cpp",
    ".hxx": "cpp",
    # C#
    ".cs": "csharp",
    # Ruby
    ".rb": "ruby",
    # PHP
    ".php": "php",
    # Kotlin
    ".kt": "kotlin",
    ".kts": "kotlin",
    # Swift
    ".swift": "swift",
    # Markdown
    ".md": "markdown",
    # Text
    ".txt": "text",
    ".rst": "text",
    # Config
    ".json": "config",
    ".yaml": "config",
    ".yml": "config",
    ".toml": "config",
    ".ini": "config",
    ".cfg": "config",
    # Web
    ".html": "web",
    ".css": "web",
    ".scss": "web",
    ".sass": "web",
    ".less": "web",
    # Shell
    ".sh": "shell",
    ".bash": "shell",
    ".zsh": "shell",
}

SPECIAL_FILENAMES = {
    "dockerfile": "config",
    "containerfile": "config",
    "makefile": "config",
}

DEFAULT_MAX_FILE_BYTES = 300000  # 300 KB

def get_max_file_bytes() -> int:
    try:
        return int(os.getenv("MAX_FILE_BYTES", str(DEFAULT_MAX_FILE_BYTES)))
    except ValueError:
        return DEFAULT_MAX_FILE_BYTES

def should_skip_dir(name: str) -> bool:
    """Return True if directory name should be excluded from traversal."""
    return name.lower() in EXCLUDED_DIRS

def classify_file(
    rel_path: str,
    size_bytes: int,
    head_bytes: bytes,
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Classify a file for inclusion in the index.
    Returns: (include, language, reason)
    Reason values (used in RepoIndex.skipped):
      'excluded_dir', 'generated', 'too_large', 'binary', 'unsupported', 'limit'
    """
    # 1. Check directory path components
    normalized_path = rel_path.replace("\\", "/")
    parts = normalized_path.split("/")
    for dir_part in parts[:-1]:
        if should_skip_dir(dir_part):
            return False, None, "excluded_dir"

    # 2. Check file size
    max_file_bytes = get_max_file_bytes()
    if size_bytes > max_file_bytes:
        return False, None, "too_large"

    filename = parts[-1].lower() if parts else ""

    # 3. Check for generated / minified / lock files
    if filename in LOCK_FILES:
        return False, None, "generated"

    for suffix in GENERATED_SUFFIXES:
        if filename.endswith(suffix):
            return False, None, "generated"

    # 4. Check for known binary extensions
    for ext in BINARY_EXTENSIONS:
        if filename.endswith(ext):
            return False, None, "binary"

    # 5. Check first 2KB for generated markers
    head_2k = head_bytes[:2048]
    try:
        head_text = head_2k.decode("utf-8", errors="ignore")
    except Exception:
        head_text = ""

    if (
        "DO NOT EDIT" in head_text
        or "@generated" in head_text
        or "Code generated" in head_text
    ):
        return False, None, "generated"

    # 6. Check for NUL byte in first 4KB (binary indicator)
    if b"\x00" in head_bytes[:4096]:
        return False, None, "binary"

    # 7. Language determination
    language: Optional[str] = SPECIAL_FILENAMES.get(filename)
    if not language:
        ext = os.path.splitext(filename)[1]
        language = EXTENSION_LANGUAGE_MAP.get(ext)

    if not language:
        return False, None, "unsupported"

    # 8. Encoding check (UTF-8 with Latin-1 fallback for text-like extensions)
    try:
        head_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            head_bytes.decode("latin-1")
        except Exception:
            return False, None, "binary"

    return True, language, None
