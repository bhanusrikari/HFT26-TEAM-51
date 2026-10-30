"""
Authentication helpers for RepoLens v2.
- bcrypt password hashing
- JWT in httpOnly SameSite=Lax cookie
- Simple in-memory rate-limiter for login attempts (per IP)
"""

import logging
import os
import time
from collections import defaultdict
from typing import Optional

import bcrypt
import jwt
from fastapi import Cookie, Depends, HTTPException, Request, status

from . import database as db

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY", "repolens-insecure-secret-key-32-chars-minimum-prod")
ALGORITHM = "HS256"
TOKEN_EXPIRE_SECONDS = int(os.getenv("TOKEN_EXPIRE_SECONDS", str(7 * 24 * 3600)))  # 7 days
COOKIE_NAME = "repolens_session"

# ---------------------------------------------------------------------------
# Rate limiter (in-memory, per IP)
# ---------------------------------------------------------------------------

_MAX_FAILURES = int(os.getenv("LOGIN_MAX_FAILURES", "10"))
_WINDOW_SECONDS = int(os.getenv("LOGIN_WINDOW_SECONDS", "300"))  # 5 min

_failures: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(ip: str):
    now = time.monotonic()
    window_start = now - _WINDOW_SECONDS
    attempts = [t for t in _failures[ip] if t > window_start]
    _failures[ip] = attempts
    if len(attempts) >= _MAX_FAILURES:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 5 minutes.",
        )


def _record_failure(ip: str):
    _failures[ip].append(time.monotonic())


def _clear_failures(ip: str):
    _failures.pop(ip, None)


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_EXPIRE_SECONDS,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------

def set_auth_cookie(response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        max_age=TOKEN_EXPIRE_SECONDS,
        path="/",
    )


def clear_auth_cookie(response):
    response.delete_cookie(key=COOKIE_NAME, path="/")


# ---------------------------------------------------------------------------
# FastAPI dependency: current user
# ---------------------------------------------------------------------------

async def get_current_user(
    request: Request,
    repolens_session: Optional[str] = Cookie(default=None),
) -> dict:
    token = repolens_session
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    user_id = decode_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )
    user = await db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )
    return user


async def optional_current_user(
    request: Request,
    repolens_session: Optional[str] = Cookie(default=None),
) -> Optional[dict]:
    """Like get_current_user but returns None instead of raising."""
    if not repolens_session:
        return None
    user_id = decode_token(repolens_session)
    if user_id is None:
        return None
    return await db.get_user_by_id(user_id)


# ---------------------------------------------------------------------------
# Auth endpoint handlers (called from api_v2.py)
# ---------------------------------------------------------------------------

async def signup_handler(email: str, password: str):
    if not email or "@" not in email:
        raise HTTPException(400, "Invalid email address")
    if not password or len(password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    password_hash = hash_password(password)
    user = await db.create_user(email, password_hash)
    if user is None:
        raise HTTPException(409, "Email already registered")
    return user


async def login_handler(request: Request, email: str, password: str):
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    user = await db.get_user_by_email(email)
    if not user or not verify_password(password, user["password_hash"]):
        _record_failure(client_ip)
        raise HTTPException(401, "Invalid email or password")

    _clear_failures(client_ip)
    return user

