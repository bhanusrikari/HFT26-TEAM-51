from typing import Optional
from .models import RepoIndex
_REPOS: dict = {}
def save(index: RepoIndex) -> None: _REPOS[index.repo_id] = index
def get(repo_id: str) -> Optional[RepoIndex]: return _REPOS.get(repo_id)

