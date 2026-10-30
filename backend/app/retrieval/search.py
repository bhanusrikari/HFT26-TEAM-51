from ..models import RepoIndex, SearchResult
class SearchEngine:
    def __init__(self, index: RepoIndex): self.index = index
    def search(self, query: str, top_k: int = 5) -> list: return []
def get_engine(index: RepoIndex) -> SearchEngine: return SearchEngine(index)

