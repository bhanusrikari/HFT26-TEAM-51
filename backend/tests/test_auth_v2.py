import io
import uuid
import zipfile
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app import database as db
import asyncio

@pytest.fixture(autouse=True)
def setup_db():
    asyncio.run(db.init_db())

def test_auth_signup_login_logout_me():
    client = TestClient(app)
    uid = uuid.uuid4().hex[:6]
    email = f"user_{uid}@example.com"
    pw = "password123"

    # 1. Signup
    res = client.post("/api/auth/signup", json={"email": email, "password": pw})
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == email
    assert "repolens_session" in res.cookies

    # 2. Get me
    res_me = client.get("/api/auth/me")
    assert res_me.status_code == 200
    assert res_me.json()["email"] == email

    # 3. Duplicate signup fails with 409
    res_dup = client.post("/api/auth/signup", json={"email": email, "password": pw})
    assert res_dup.status_code == 409

    # 4. Short password fails with 400
    res_short = client.post("/api/auth/signup", json={"email": f"bob_{uid}@example.com", "password": "short"})
    assert res_short.status_code == 400

    # 5. Logout
    res_logout = client.post("/api/auth/logout")
    assert res_logout.status_code == 200

    # 6. /me after logout fails with 401
    res_me_logged_out = client.get("/api/auth/me")
    assert res_me_logged_out.status_code == 401

    # 7. Login with wrong password fails with 401
    res_bad_pw = client.post("/api/auth/login", json={"email": email, "password": "wrongpassword"})
    assert res_bad_pw.status_code == 401

    # 8. Login with correct password succeeds
    res_login = client.post("/api/auth/login", json={"email": email, "password": pw})
    assert res_login.status_code == 200
    assert "repolens_session" in res_login.cookies


def test_per_user_isolation():
    client_a = TestClient(app)
    client_b = TestClient(app)

    uid_a = uuid.uuid4().hex[:6]
    uid_b = uuid.uuid4().hex[:6]

    # Register user A and user B
    res_a = client_a.post("/api/auth/signup", json={"email": f"usera_{uid_a}@example.com", "password": "password123"})
    assert res_a.status_code == 201
    res_b = client_b.post("/api/auth/signup", json={"email": f"userb_{uid_b}@example.com", "password": "password123"})
    assert res_b.status_code == 201

    # User A creates a repo
    bio = io.BytesIO()
    with zipfile.ZipFile(bio, "w") as zf:
        zf.writestr("test.py", "def my_func(): pass\n")
    bio.seek(0)

    res_up = client_a.post("/api/repositories/upload", files={"file": ("project.zip", bio.getvalue(), "application/zip")})
    assert res_up.status_code in (200, 202)
    repo_id = res_up.json()["repo_id"]

    # User A can get the repo
    res_get_a = client_a.get(f"/api/repositories/{repo_id}")
    assert res_get_a.status_code == 200

    # User B CANNOT see user A's repo -> 404
    res_get_b = client_b.get(f"/api/repositories/{repo_id}")
    assert res_get_b.status_code == 404

    # User B searching user A's repo gets 404
    res_search_b = client_b.post("/api/search", json={"repo_id": repo_id, "query": "my_func"})
    assert res_search_b.status_code == 404


def test_benchmark_endpoint():
    client = TestClient(app)
    res = client.get("/api/benchmark")
    assert res.status_code == 200
    data = res.json()
    assert "precision_at_5" in data
    assert "index_time_seconds" in data
    assert "queries" in data
