// Realistic mock fixtures & simulator for RepoLens frontend
// Strictly adheres to docs/CONTRACTS.md (v1 + v2)

export const MOCK_REPOSITORIES = {
  'repo-python-fastapi': {
    repo_id: 'repo-python-fastapi',
    name: 'repolens-backend',
    status: 'ready',
    progress: 1.0,
    error: null,
    indexed_files: 48,
    indexed_chunks: 164,
    languages: {
      python: 38,
      markdown: 6,
      json: 4,
    },
    skipped: {
      excluded_dir: 14,
      generated: 2,
      too_large: 0,
      binary: 3,
      unsupported: 1,
      limit: 0,
    },
    sampleQueries: [
      'Where is authentication implemented?',
      'How are search rankings calculated?',
      'Show repository indexing logic',
      'Where is the Featherless LLM client configured?',
    ],
  },
  'repo-typescript-gateway': {
    repo_id: 'repo-typescript-gateway',
    name: 'auth-gateway-ts',
    status: 'ready',
    progress: 1.0,
    error: null,
    indexed_files: 62,
    indexed_chunks: 210,
    languages: {
      typescript: 46,
      javascript: 8,
      json: 5,
      markdown: 3,
    },
    skipped: {
      excluded_dir: 22,
      generated: 4,
      too_large: 1,
      binary: 0,
      unsupported: 0,
      limit: 0,
    },
    sampleQueries: [
      'Where is JWT validation handled?',
      'Show rate limiting middleware',
      'How is Redis token revocation stored?',
      'Where is the password hashing routine?',
    ],
  },
  'repo-rust-storage': {
    repo_id: 'repo-rust-storage',
    name: 'minirust-kv-engine',
    status: 'ready',
    progress: 1.0,
    error: null,
    indexed_files: 35,
    indexed_chunks: 118,
    languages: {
      rust: 30,
      markdown: 3,
      toml: 2,
    },
    skipped: {
      excluded_dir: 8,
      generated: 0,
      too_large: 0,
      binary: 1,
      unsupported: 0,
      limit: 0,
    },
    sampleQueries: [
      'Where is the LSM storage engine implemented?',
      'How does Write-Ahead Logging work?',
      'Show memtable compaction logic',
    ],
  },
};

export const MOCK_HISTORY = [
  { id: 1, repo_id: 'repo-python-fastapi', query: 'Where is authentication implemented?', result_count: 5, timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, repo_id: 'repo-python-fastapi', query: 'How are search rankings calculated?', result_count: 4, timestamp: new Date(Date.now() - 7200000).toISOString() },
];

export const MOCK_BENCHMARK = {
  repo: 'sample-repo',
  precision_at_5: 0.88,
  grep_precision_at_5: 0.42,
  index_time_seconds: 0.045,
  file_count: 12,
  chunk_count: 48,
  queries: [
    { query: 'service handler', repolens_precision: 1.0, grep_precision: 0.4, repolens_top_files: ['src/service.py'], grep_top_files: ['src/service.py', 'README.md'] },
    { query: 'render component', repolens_precision: 1.0, grep_precision: 0.6, repolens_top_files: ['src/components/App.tsx'], grep_top_files: ['src/components/App.tsx'] },
    { query: 'formatDate', repolens_precision: 1.0, grep_precision: 0.5, repolens_top_files: ['src/utils.js'], grep_top_files: ['src/utils.js'] },
    { query: 'fetchData', repolens_precision: 0.8, grep_precision: 0.4, repolens_top_files: ['src/service.py'], grep_top_files: ['src/service.py'] },
    { query: 'React component', repolens_precision: 0.8, grep_precision: 0.2, repolens_top_files: ['src/components/App.tsx'], grep_top_files: [] },
  ],
  timestamp: new Date().toISOString(),
};

// Simulated mock user session
let mockLoggedInUser = {
  id: 1,
  email: 'developer@codered.io',
  created_at: new Date().toISOString(),
};

export function getMockUser() {
  return mockLoggedInUser;
}

export function setMockUser(user) {
  mockLoggedInUser = user;
}

// Error simulation mode: 'none' | 'empty' | '404' | '502' | 'explanation_error'
let activeMockError = 'none';

export function setMockError(mode) {
  activeMockError = mode;
}

export function getMockError() {
  return activeMockError;
}

export async function simulateLatency(min = 300, max = 600) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Code results
const PYTHON_RESULTS_AUTH = [
  {
    file_path: 'backend/app/auth/security.py',
    symbol: 'verify_token',
    kind: 'function',
    language: 'python',
    start_line: 18,
    end_line: 42,
    score: 0.96,
    code: `def verify_token(token: str, credentials_exception: HTTPException) -> TokenData:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    return token_data`,
    match_reasons: ['lexical', 'symbol', 'path'],
  },
  {
    file_path: 'backend/app/auth/security.py',
    symbol: 'create_access_token',
    kind: 'function',
    language: 'python',
    start_line: 45,
    end_line: 60,
    score: 0.91,
    code: `def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)`,
    match_reasons: ['symbol', 'lexical'],
  },
  {
    file_path: 'backend/app/api.py',
    symbol: 'auth_router',
    kind: 'module',
    language: 'python',
    start_line: 85,
    end_line: 110,
    score: 0.82,
    code: `@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}`,
    match_reasons: ['path', 'lexical'],
  },
  {
    file_path: 'backend/app/models.py',
    symbol: 'User',
    kind: 'class',
    language: 'python',
    start_line: 12,
    end_line: 28,
    score: 0.74,
    code: `class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None`,
    match_reasons: ['lexical'],
  },
  {
    file_path: 'backend/app/config.py',
    symbol: 'Settings',
    kind: 'class',
    language: 'python',
    start_line: 5,
    end_line: 22,
    score: 0.68,
    code: `class Settings(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fallback-secret-for-dev")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24`,
    match_reasons: ['path'],
  },
];

const PYTHON_RESULTS_RANKING = [
  {
    file_path: 'backend/app/retrieval/ranking.py',
    symbol: 'compute_rank_score',
    kind: 'function',
    language: 'python',
    start_line: 24,
    end_line: 54,
    score: 0.98,
    code: `def compute_rank_score(lexical: float, symbol: float, path: float, semantic: Optional[float] = None) -> float:
    """Combines BM25 lexical, symbol matching, and path scores with strict weights."""
    if semantic is not None:
        return (0.40 * lexical) + (0.25 * symbol) + (0.10 * path) + (0.25 * semantic)
    return (0.70 * lexical) + (0.20 * symbol) + (0.10 * path)`,
    match_reasons: ['lexical', 'symbol', 'path'],
  },
  {
    file_path: 'backend/app/retrieval/search.py',
    symbol: 'SearchEngine.search',
    kind: 'method',
    language: 'python',
    start_line: 110,
    end_line: 145,
    score: 0.92,
    code: `def search(self, query: str, top_k: int = 10, min_score: float = 0.35) -> list[SearchResult]:
    candidates = self._gather_candidates(query)
    ranked = sorted(candidates, key=lambda c: -c.final_score)
    deduped = self._dedupe_overlapping(ranked)
    filtered = [c for c in deduped if c.final_score >= min_score]
    return [self._to_result(c) for c in filtered[:top_k]]`,
    match_reasons: ['symbol', 'lexical'],
  },
  {
    file_path: 'backend/app/retrieval/bm25.py',
    symbol: 'BM25Okapi',
    kind: 'class',
    language: 'python',
    start_line: 15,
    end_line: 45,
    score: 0.81,
    code: `class BM25Okapi:
    def __init__(self, corpus: list[list[str]], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.corpus_size = len(corpus)
        self.avgdl = sum(len(x) for x in corpus) / self.corpus_size`,
    match_reasons: ['lexical'],
  },
  {
    file_path: 'backend/app/api.py',
    symbol: 'search_endpoint',
    kind: 'function',
    language: 'python',
    start_line: 65,
    end_line: 82,
    score: 0.75,
    code: `@router.post("/search")
async def search(req: SearchReq):
    idx = store.get(req.repo_id)
    if not idx:
        raise HTTPException(404, "Repository not found")
    results = get_engine(idx).search(req.query, top_k=req.top_k, min_score=req.min_score)
    return {"query": req.query, "results": results, "result_count": len(results)}`,
    match_reasons: ['path'],
  },
];

const TS_RESULTS = [
  {
    file_path: 'src/middleware/jwt.ts',
    symbol: 'authenticateJWT',
    kind: 'function',
    language: 'typescript',
    start_line: 14,
    end_line: 40,
    score: 0.95,
    code: `export async function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Missing or malformed Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ detail: 'Token expired or signature invalid' });
  }
}`,
    match_reasons: ['lexical', 'symbol', 'path'],
  },
  {
    file_path: 'src/services/tokens.ts',
    symbol: 'signTokenPair',
    kind: 'function',
    language: 'typescript',
    start_line: 32,
    end_line: 52,
    score: 0.89,
    code: `export function signTokenPair(user: User): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
  const refreshToken = crypto.randomBytes(40).toString('hex');
  return { accessToken, refreshToken };
}`,
    match_reasons: ['symbol', 'lexical'],
  },
];

export function getMockSearchResponse(repoId, query, topK = 10, explain = true, minScore = 0.35) {
  if (activeMockError === '404') {
    const error = new Error('Repository not found');
    error.status = 404;
    error.detail = 'Repository not found';
    throw error;
  }
  if (activeMockError === '502') {
    const error = new Error('GitHub API rate limit exceeded or upstream failure');
    error.status = 502;
    error.detail = 'GitHub API rate limit exceeded or upstream failure';
    throw error;
  }
  if (activeMockError === 'empty') {
    return {
      query,
      results: [],
      explanation: null,
      explanation_error: null,
      result_count: 0,
      low_relevance_count: 0,
    };
  }

  const q = (query || '').toLowerCase();
  let baseResults = PYTHON_RESULTS_AUTH;

  if (repoId === 'repo-typescript-gateway') {
    baseResults = TS_RESULTS;
  } else if (q.includes('rank') || q.includes('search') || q.includes('score')) {
    baseResults = PYTHON_RESULTS_RANKING;
  } else if (q.includes('auth') || q.includes('token') || q.includes('login') || q.includes('jwt')) {
    baseResults = PYTHON_RESULTS_AUTH;
  } else {
    baseResults = PYTHON_RESULTS_RANKING;
  }

  const passing = baseResults.filter(r => r.score >= minScore);
  const lowRelevanceCount = baseResults.length - passing.length;
  const slicedResults = passing.slice(0, Math.max(1, Math.min(topK, 20)));

  let explanation = null;
  let explanationError = null;

  if (activeMockError === 'explanation_error') {
    explanation = null;
    explanationError = 'Featherless LLM quota exceeded (HTTP 429). Code snippets returned normally.';
  } else if (explain && slicedResults.length > 0) {
    if (slicedResults[0].language === 'typescript') {
      explanation = `Authentication is anchored in [1] \`authenticateJWT\` within \`src/middleware/jwt.ts:14-40\`, which verifies incoming Bearer tokens against the secret key. Refresh tokens and signing are handled in [2] \`signTokenPair\` in \`src/services/tokens.ts:32-52\`.`;
    } else if (q.includes('rank') || q.includes('search')) {
      explanation = `Search ranking is calculated directly in [1] \`compute_rank_score\` within \`backend/app/retrieval/ranking.py:24-54\`. It combines lexical tokens, symbol matches, and path matches. Results are collected and sorted in [2] \`SearchEngine.search\` in \`backend/app/retrieval/search.py:110-145\`.`;
    } else {
      explanation = `Authentication is implemented primarily in [1] \`verify_token\` in \`backend/app/auth/security.py:18-42\`, where incoming JWT bearer tokens are validated for expiry. Token issuance is handled in [2] \`create_access_token\` at \`backend/app/auth/security.py:45-60\`.`;
    }
  }

  return {
    query,
    results: slicedResults,
    explanation,
    explanation_error: explanationError,
    result_count: slicedResults.length,
    low_relevance_count: lowRelevanceCount,
  };
}
