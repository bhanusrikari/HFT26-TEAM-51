// Realistic mock fixtures & simulator for RepoLens frontend
// Strictly adheres to docs/CONTRACTS.md

export const MOCK_REPOSITORIES = {
  'repo-python-fastapi': {
    repo_id: 'repo-python-fastapi',
    name: 'repolens-backend',
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
    indexed_files: 35,
    indexed_chunks: 118,
    languages: {
      rust: 29,
      markdown: 4,
      json: 2,
    },
    skipped: {
      excluded_dir: 8,
      generated: 0,
      too_large: 0,
      binary: 2,
      unsupported: 0,
      limit: 0,
    },
    sampleQueries: [
      'Where is write-ahead logging implemented?',
      'How does LSM compaction run?',
      'Show Bloom filter lookup',
      'Where are Raft heartbeat messages handled?',
    ],
  },
};

// Error simulation states: 'none' | 'empty' | '404' | '502' | 'explanation_error'
let activeMockError = 'none';

export function setMockError(mode) {
  activeMockError = mode;
}

export function getMockError() {
  return activeMockError;
}

// Simulated latency between 600ms and 1200ms
export function simulateLatency() {
  const ms = Math.floor(Math.random() * (1200 - 600 + 1)) + 600;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 5 high-quality Python code snippets for repolens-backend queries
const PYTHON_RESULTS_AUTH = [
  {
    file_path: 'backend/app/auth/security.py',
    symbol: 'verify_token',
    kind: 'function',
    language: 'python',
    start_line: 14,
    end_line: 38,
    score: 0.96,
    code: `async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security_scheme)) -> TokenPayload:
    """Validate Bearer JWT against SECRET_KEY and ensure token has not expired."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token: missing subject claim")
        return TokenPayload(user_id=user_id, roles=payload.get("roles", []))
    except JWTError as exc:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        )`,
    match_reasons: ['lexical', 'symbol', 'semantic'],
  },
  {
    file_path: 'backend/app/auth/security.py',
    symbol: 'create_access_token',
    kind: 'function',
    language: 'python',
    start_line: 42,
    end_line: 58,
    score: 0.91,
    code: `def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate signed HS256 JWT access token with expiry."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt`,
    match_reasons: ['symbol', 'lexical'],
  },
  {
    file_path: 'backend/app/api.py',
    symbol: 'auth_router',
    kind: 'module',
    language: 'python',
    start_line: 28,
    end_line: 52,
    score: 0.88,
    code: `@router.post("/login", response_model=TokenResponse)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=400,
            detail="Incorrect username or password",
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}`,
    match_reasons: ['lexical', 'path'],
  },
  {
    file_path: 'backend/app/auth/dependencies.py',
    symbol: 'get_current_active_user',
    kind: 'function',
    language: 'python',
    start_line: 12,
    end_line: 26,
    score: 0.82,
    code: `async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")
    return current_user`,
    match_reasons: ['symbol'],
  },
  {
    file_path: 'backend/app/config.py',
    symbol: 'Settings',
    kind: 'class',
    language: 'python',
    start_line: 8,
    end_line: 22,
    score: 0.74,
    code: `class Settings(BaseSettings):
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5173"]`,
    match_reasons: ['lexical', 'semantic'],
  },
];

// 5 high-quality Python code snippets for search ranking
const PYTHON_RESULTS_RANKING = [
  {
    file_path: 'backend/app/retrieval/ranking.py',
    symbol: 'compute_rank_score',
    kind: 'function',
    language: 'python',
    start_line: 18,
    end_line: 45,
    score: 0.98,
    code: `def compute_rank_score(query_tokens: set[str], chunk: Chunk, embedding_sim: Optional[float] = None) -> tuple[float, list[str]]:
    """Calculates weighted relevance score adhering strictly to the FROZEN contract:
    - Without embeddings: 0.70 lexical + 0.20 symbol + 0.10 path
    - With embeddings:    0.40 lexical + 0.25 symbol + 0.10 path + 0.25 semantic
    """
    reasons = []
    lexical = score_lexical_match(query_tokens, chunk.code)
    if lexical > 0.2: reasons.append("lexical")
    
    symbol_score = score_symbol_match(query_tokens, chunk.symbol or "")
    if symbol_score > 0.2: reasons.append("symbol")
    
    path_score = score_path_match(query_tokens, chunk.file_path)
    if path_score > 0.2: reasons.append("path")
    
    if embedding_sim is not None:
        if embedding_sim > 0.5: reasons.append("semantic")
        total = (0.40 * lexical) + (0.25 * symbol_score) + (0.10 * path_score) + (0.25 * embedding_sim)
    else:
        total = (0.70 * lexical) + (0.20 * symbol_score) + (0.10 * path_score)
        
    return min(1.0, max(0.0, total)), reasons`,
    match_reasons: ['lexical', 'symbol', 'semantic'],
  },
  {
    file_path: 'backend/app/retrieval/search.py',
    symbol: 'SearchEngine',
    kind: 'class',
    language: 'python',
    start_line: 22,
    end_line: 49,
    score: 0.93,
    code: `class SearchEngine:
    def __init__(self, index: RepoIndex):
        self.index = index
        self.query_preprocessor = QueryTokenizer()
        
    def search(self, query: str, top_k: int = 5) -> list[SearchResult]:
        tokens = self.query_preprocessor.tokenize(query)
        scored_chunks: list[SearchResult] = []
        for chunk in self.index.chunks:
            score, reasons = compute_rank_score(tokens, chunk)
            if score > 0.05:
                scored_chunks.append(SearchResult(
                    file_path=chunk.file_path,
                    symbol=chunk.symbol,
                    kind=chunk.kind,
                    language=chunk.language,
                    start_line=chunk.start_line,
                    end_line=chunk.end_line,
                    score=round(score, 2),
                    code=chunk.code,
                    match_reasons=reasons
                ))
        return sorted(scored_chunks, key=lambda s: s.score, reverse=True)[:top_k]`,
    match_reasons: ['lexical', 'symbol'],
  },
  {
    file_path: 'backend/app/retrieval/embeddings.py',
    symbol: 'cosine_similarity',
    kind: 'function',
    language: 'python',
    start_line: 30,
    end_line: 44,
    score: 0.86,
    code: `def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    """Compute normalized vector cosine similarity."""
    dot = np.dot(v1, v2)
    norm = np.linalg.norm(v1) * np.linalg.norm(v2)
    if norm == 0:
        return 0.0
    return float(dot / norm)`,
    match_reasons: ['semantic'],
  },
  {
    file_path: 'backend/app/api.py',
    symbol: 'search',
    kind: 'function',
    language: 'python',
    start_line: 65,
    end_line: 77,
    score: 0.82,
    code: `@router.post("/search")
async def search(req: SearchReq):
    idx = store.get(req.repo_id)
    if not idx: raise HTTPException(404, "Repository not found")
    if not req.query.strip(): raise HTTPException(400, "Query is empty")
    results = get_engine(idx).search(req.query, top_k=max(1, min(req.top_k, 20)))
    explanation, err = None, None
    if req.explain and results:
        explanation, err = await explain_fn(req.query, results)
    return {"query": req.query, "results": [asdict(r) for r in results],
            "explanation": explanation, "explanation_error": err,
            "result_count": len(results)}`,
    match_reasons: ['path', 'symbol'],
  },
  {
    file_path: 'backend/app/models.py',
    symbol: 'SearchResult',
    kind: 'class',
    language: 'python',
    start_line: 31,
    end_line: 41,
    score: 0.77,
    code: `@dataclass
class SearchResult:
    file_path: str
    symbol: Optional[str]
    kind: str
    language: str
    start_line: int
    end_line: int
    score: float
    code: str
    match_reasons: list = field(default_factory=list)`,
    match_reasons: ['symbol', 'lexical'],
  },
];

// TypeScript snippets for auth-gateway-ts
const TS_RESULTS = [
  {
    file_path: 'src/middleware/jwt.ts',
    symbol: 'authenticateJWT',
    kind: 'function',
    language: 'typescript',
    start_line: 12,
    end_line: 39,
    score: 0.95,
    code: `export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const isRevoked = await redisClient.get(\`revoked:\${token}\`);
    if (isRevoked) {
      return res.status(401).json({ detail: 'Token has been revoked' });
    }
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ detail: 'Invalid or expired token' });
  }
};`,
    match_reasons: ['lexical', 'symbol', 'semantic'],
  },
  {
    file_path: 'src/services/token.ts',
    symbol: 'signTokenPair',
    kind: 'function',
    language: 'typescript',
    start_line: 25,
    end_line: 48,
    score: 0.89,
    code: `export function signTokenPair(user: User): TokenPair {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, roles: user.roles },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = crypto.randomBytes(40).toString('hex');
  await redisClient.setEx(\`refresh:\${refreshToken}\`, 60 * 60 * 24 * 7, user.id);

  return { accessToken, refreshToken, expiresIn: 900 };
}`,
    match_reasons: ['symbol', 'lexical'],
  },
  {
    file_path: 'src/middleware/rateLimiter.ts',
    symbol: 'rateLimiter',
    kind: 'function',
    language: 'typescript',
    start_line: 8,
    end_line: 28,
    score: 0.84,
    code: `export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Too many requests from this IP, please try again after 15 minutes' },
});`,
    match_reasons: ['path', 'symbol'],
  },
  {
    file_path: 'src/security/passwords.ts',
    symbol: 'hashPassword',
    kind: 'function',
    language: 'typescript',
    start_line: 10,
    end_line: 24,
    score: 0.80,
    code: `export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}`,
    match_reasons: ['symbol'],
  },
  {
    file_path: 'src/types/auth.ts',
    symbol: 'UserPayload',
    kind: 'block',
    language: 'typescript',
    start_line: 5,
    end_line: 18,
    score: 0.73,
    code: `export interface UserPayload {
  sub: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}`,
    match_reasons: ['lexical'],
  },
];

// Helper to choose results and generate explanation based on repo and query
export function getMockSearchResponse(repoId, query, topK = 5, explain = true) {
  // Check error simulations
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
    // Dynamic match: mix or prioritize
    baseResults = PYTHON_RESULTS_RANKING;
  }

  const slicedResults = baseResults.slice(0, Math.max(1, Math.min(topK, 20)));

  let explanation = null;
  let explanationError = null;

  if (activeMockError === 'explanation_error') {
    explanation = null;
    explanationError = 'Featherless LLM quota exceeded (HTTP 429). Code snippets returned normally.';
  } else if (explain && slicedResults.length > 0) {
    if (slicedResults[0].language === 'typescript') {
      explanation = `Authentication is anchored in [1] \`authenticateJWT\` within \`src/middleware/jwt.ts\`, which verifies incoming Bearer tokens against the secret key and checks active revocation in Redis. Refresh tokens and signing are handled in [2] \`signTokenPair\`. Additional perimeter defense is provided by [3] rate-limiting middleware, while credentials undergo bcrypt salt hashing in [4].`;
    } else if (q.includes('rank') || q.includes('search')) {
      explanation = `Search ranking is calculated directly in [1] \`compute_rank_score\` within \`backend/app/retrieval/ranking.py\`. It combines lexical tokens (0.70/0.40), symbol matches (0.20/0.25), path matches (0.10), and vector embeddings (0.25) when available. Results are collected and sorted in descending order by [2] \`SearchEngine.search\`, and exposed via the HTTP contract in [4] \`backend/app/api.py\`.`;
    } else {
      explanation = `Authentication is implemented primarily in [1] \`verify_token\` in \`backend/app/auth/security.py\`, where incoming JWT bearer tokens are validated for expiry and cryptographic integrity. Token issuance is handled in [2] \`create_access_token\`, while [3] \`auth_router\` in \`backend/app/api.py\` exposes the \`/login\` OAuth2 endpoint. Global configuration parameters like \`SECRET_KEY\` and algorithm specifications are declared in [5] \`backend/app/config.py\`.`;
    }
  }

  return {
    query,
    results: slicedResults,
    explanation,
    explanation_error: explanationError,
    result_count: slicedResults.length,
  };
}

