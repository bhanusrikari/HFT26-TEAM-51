from dataclasses import dataclass, field
from typing import Optional

@dataclass
class FileRecord:
    path: str
    language: str
    size_bytes: int
    line_count: int

@dataclass
class Chunk:
    chunk_id: str
    file_path: str
    language: str
    symbol: Optional[str]
    kind: str          # function | class | method | module | block
    start_line: int    # 1-based inclusive
    end_line: int
    code: str

@dataclass
class RepoIndex:
    repo_id: str
    name: str
    files: list = field(default_factory=list)
    chunks: list = field(default_factory=list)
    skipped: dict = field(default_factory=dict)

@dataclass
class SearchResult:
    file_path: str
    symbol: Optional[str]
    kind: str
    language: str
    start_line: int
    end_line: int
    score: float
    code: str
    match_reasons: list = field(default_factory=list)

