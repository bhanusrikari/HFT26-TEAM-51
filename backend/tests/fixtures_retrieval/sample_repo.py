"""Realistic hand-made RepoIndex fixture for RepoLens retrieval tests.

Contains realistic auth, db, routes, models, and utils chunks with exact line ranges.
"""

from app.models import Chunk, FileRecord, RepoIndex


def create_sample_repo_index() -> RepoIndex:
    files = [
        FileRecord(path="backend/auth.py", language="python", size_bytes=3200, line_count=120),
        FileRecord(path="backend/routes/auth_routes.py", language="python", size_bytes=2800, line_count=95),
        FileRecord(path="backend/db/session.py", language="python", size_bytes=1500, line_count=60),
        FileRecord(path="backend/db/models.py", language="python", size_bytes=2400, line_count=85),
        FileRecord(path="backend/utils/helpers.py", language="python", size_bytes=1900, line_count=70),
        FileRecord(path="backend/routes/items.py", language="python", size_bytes=2100, line_count=80),
    ]

    chunks = [
        # --- backend/auth.py ---
        Chunk(
            chunk_id="auth_1",
            file_path="backend/auth.py",
            language="python",
            symbol="AuthService",
            kind="class",
            start_line=10,
            end_line=75,
            code="""class AuthService:
    \"\"\"Handles user authentication, JWT generation, and credential verification.\"\"\"
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm

    def verify_token(self, token: str) -> dict:
        \"\"\"Verify JWT token and return payload.\"\"\"
        try:
            return jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token expired")
        except jwt.InvalidTokenError:
            raise AuthenticationError("Invalid token")

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        \"\"\"Generate a signed JWT access token.\"\"\"
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)""",
        ),
        Chunk(
            chunk_id="auth_2",
            file_path="backend/auth.py",
            language="python",
            symbol="AuthService.verify_token",
            kind="method",
            start_line=18,
            end_line=27,
            code="""    def verify_token(self, token: str) -> dict:
        \"\"\"Verify JWT token and return payload.\"\"\"
        try:
            return jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token expired")
        except jwt.InvalidTokenError:
            raise AuthenticationError("Invalid token")""",
        ),
        Chunk(
            chunk_id="auth_3",
            file_path="backend/auth.py",
            language="python",
            symbol="AuthService.create_access_token",
            kind="method",
            start_line=29,
            end_line=36,
            code="""    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        \"\"\"Generate a signed JWT access token.\"\"\"
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)""",
        ),
        Chunk(
            chunk_id="auth_4",
            file_path="backend/auth.py",
            language="python",
            symbol="hash_password",
            kind="function",
            start_line=80,
            end_line=88,
            code="""def hash_password(plain_password: str) -> str:
    \"\"\"Hash a password using bcrypt with standard salt rounds.\"\"\"
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")""",
        ),
        Chunk(
            chunk_id="auth_5",
            file_path="backend/auth.py",
            language="python",
            symbol="verify_password",
            kind="function",
            start_line=90,
            end_line=98,
            code="""def verify_password(plain_password: str, hashed_password: str) -> bool:
    \"\"\"Verify plain password against hashed password.\"\"\"
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))""",
        ),
        Chunk(
            chunk_id="auth_6",
            file_path="backend/auth.py",
            language="python",
            symbol="AuthenticationError",
            kind="class",
            start_line=102,
            end_line=106,
            code="""class AuthenticationError(Exception):
    \"\"\"Raised when authentication fails due to invalid credentials or token.\"\"\"
    pass""",
        ),

        # --- backend/routes/auth_routes.py ---
        Chunk(
            chunk_id="route_auth_1",
            file_path="backend/routes/auth_routes.py",
            language="python",
            symbol="login_route",
            kind="function",
            start_line=15,
            end_line=38,
            code="""@router.post("/login")
async def login_route(req: LoginRequest, db: Session = Depends(get_db)):
    \"\"\"Authenticate user credentials and issue access token.\"\"\"
    user = authenticate_user(db, req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = auth_service.create_access_token(data={"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}""",
        ),
        Chunk(
            chunk_id="route_auth_2",
            file_path="backend/routes/auth_routes.py",
            language="python",
            symbol="register_user_route",
            kind="function",
            start_line=40,
            end_line=62,
            code="""@router.post("/register")
async def register_user_route(req: RegisterRequest, db: Session = Depends(get_db)):
    \"\"\"Register a new user account.\"\"\"
    existing = get_user_by_email(db, req.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(req.password)
    new_user = create_user_record(db, username=req.username, email=req.email, hashed_password=hashed)
    return {"id": new_user.id, "username": new_user.username}""",
        ),
        Chunk(
            chunk_id="route_auth_3",
            file_path="backend/routes/auth_routes.py",
            language="python",
            symbol="refresh_token_route",
            kind="function",
            start_line=65,
            end_line=82,
            code="""@router.post("/refresh")
async def refresh_token_route(refresh_token: str = Header(...)):
    \"\"\"Issue a fresh access token using a valid refresh token.\"\"\"
    try:
        payload = auth_service.verify_token(refresh_token)
        new_token = auth_service.create_access_token(data={"sub": payload["sub"]})
        return {"access_token": new_token}
    except AuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e))""",
        ),

        # --- backend/db/session.py ---
        Chunk(
            chunk_id="db_sess_1",
            file_path="backend/db/session.py",
            language="python",
            symbol="create_db_engine",
            kind="function",
            start_line=10,
            end_line=22,
            code="""def create_db_engine(database_url: str):
    \"\"\"Initialize SQLAlchemy database engine with connection pooling.\"\"\"
    return create_engine(
        database_url,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
    )""",
        ),
        Chunk(
            chunk_id="db_sess_2",
            file_path="backend/db/session.py",
            language="python",
            symbol="get_db",
            kind="function",
            start_line=25,
            end_line=36,
            code="""def get_db():
    \"\"\"Yield a transactional database session and ensure clean closing.\"\"\"
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()""",
        ),
        Chunk(
            chunk_id="db_sess_3",
            file_path="backend/db/session.py",
            language="python",
            symbol="init_db_tables",
            kind="function",
            start_line=40,
            end_line=55,
            code="""def init_db_tables(engine):
    \"\"\"Create all database tables defined in metadata.\"\"\"
    Base.metadata.create_all(bind=engine)""",
        ),

        # --- backend/db/models.py ---
        Chunk(
            chunk_id="db_models_1",
            file_path="backend/db/models.py",
            language="python",
            symbol="User",
            kind="class",
            start_line=12,
            end_line=45,
            code="""class User(Base):
    \"\"\"Database model representing an application user.\"\"\"
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)""",
        ),
        Chunk(
            chunk_id="db_models_2",
            file_path="backend/db/models.py",
            language="python",
            symbol="TokenRecord",
            kind="class",
            start_line=48,
            end_line=65,
            code="""class TokenRecord(Base):
    \"\"\"Database model tracking issued session tokens.\"\"\"
    __tablename__ = "token_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_jti = Column(String(64), unique=True, index=True)
    revoked = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)""",
        ),
        Chunk(
            chunk_id="db_models_3",
            file_path="backend/db/models.py",
            language="python",
            symbol="authenticate_user",
            kind="function",
            start_line=68,
            end_line=82,
            code="""def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    \"\"\"Lookup user by username and verify password.\"\"\"
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user""",
        ),

        # --- backend/utils/helpers.py ---
        Chunk(
            chunk_id="utils_1",
            file_path="backend/utils/helpers.py",
            language="python",
            symbol="sanitize_string",
            kind="function",
            start_line=8,
            end_line=20,
            code="""def sanitize_string(val: str) -> str:
    \"\"\"Strip unsafe control characters and trim whitespace.\"\"\"
    if not val:
        return ""
    cleaned = re.sub(r"[\\x00-\\x1f\\x7f-\\x9f]", "", val)
    return cleaned.strip()""",
        ),
        Chunk(
            chunk_id="utils_2",
            file_path="backend/utils/helpers.py",
            language="python",
            symbol="calculate_hash",
            kind="function",
            start_line=24,
            end_line=35,
            code="""def calculate_hash(data: bytes, algorithm: str = "sha256") -> str:
    \"\"\"Compute cryptographic hash of raw bytes.\"\"\"
    hasher = hashlib.new(algorithm)
    hasher.update(data)
    return hasher.hexdigest()""",
        ),
        Chunk(
            chunk_id="utils_3",
            file_path="backend/utils/helpers.py",
            language="python",
            symbol="format_timestamp",
            kind="function",
            start_line=38,
            end_line=50,
            code="""def format_timestamp(dt: Optional[datetime] = None) -> str:
    \"\"\"Format datetime to ISO-8601 UTC string.\"\"\"
    target = dt or datetime.utcnow()
    return target.isoformat() + "Z" """,
        ),

        # --- backend/routes/items.py ---
        Chunk(
            chunk_id="items_1",
            file_path="backend/routes/items.py",
            language="python",
            symbol="list_items_route",
            kind="function",
            start_line=12,
            end_line=30,
            code="""@router.get("/items")
def list_items_route(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    \"\"\"Retrieve paginated list of items from database.\"\"\"
    items = db.query(Item).offset(skip).limit(limit).all()
    return {"items": items, "count": len(items)}""",
        ),
        Chunk(
            chunk_id="items_2",
            file_path="backend/routes/items.py",
            language="python",
            symbol="create_item_route",
            kind="function",
            start_line=33,
            end_line=52,
            code="""@router.post("/items")
def create_item_route(req: CreateItemRequest, db: Session = Depends(get_db)):
    \"\"\"Create a new item associated with user.\"\"\"
    item = Item(name=req.name, description=req.description, price=req.price)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item""",
        ),
        Chunk(
            chunk_id="items_3",
            file_path="backend/routes/items.py",
            language="python",
            symbol="get_item_by_id",
            kind="function",
            start_line=55,
            end_line=72,
            code="""@router.get("/items/{item_id}")
def get_item_by_id(item_id: int, db: Session = Depends(get_db)):
    \"\"\"Fetch single item by primary key identifier.\"\"\"
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item""",
        ),
    ]

    return RepoIndex(
        repo_id="fixture-repo-123",
        name="sample-backend-repo",
        files=files,
        chunks=chunks,
        skipped={},
    )
