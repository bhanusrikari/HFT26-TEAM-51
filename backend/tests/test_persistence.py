import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app import database as db
from app import store
import asyncio

def test_sessions_and_history_survive_restart():
    asyncio.run(db.init_db())
    client = TestClient(app)

    uid = uuid.uuid4().hex[:6]
    email = f"persist_{uid}@example.com"
    pw = "password123"

    # 1. Signup & obtain session
    res_signup = client.post("/api/auth/signup", json={"email": email, "password": pw})
    assert res_signup.status_code == 201
    user_id = res_signup.json()["id"]

    # 2. Upload sample repo
    import io, zipfile
    bio = io.BytesIO()
    with zipfile.ZipFile(bio, "w") as zf:
        zf.writestr("core.py", "def compute_tax(amount): return amount * 0.2\n")
    bio.seek(0)

    res_up = client.post(
        "/api/repositories/upload",
        files={"file": ("tax_project.zip", bio.getvalue(), "application/zip")},
    )
    assert res_up.status_code in (200, 202)
    repo_id = res_up.json()["repo_id"]

    # 3. Perform search to generate history
    res_search = client.post("/api/search", json={"repo_id": repo_id, "query": "compute_tax", "explain": False})
    assert res_search.status_code == 200

    # 4. Verify history exists in DB
    history_before = client.get(f"/api/history?repo_id={repo_id}").json()
    assert len(history_before) >= 1
    assert history_before[0]["query"] == "compute_tax"

    # -------------------------------------------------------------
    # SIMULATE BACKEND RESTART:
    # Clear in-memory repos dictionary and in-memory caches
    # -------------------------------------------------------------
    store._REPOS.clear()

    # Create a fresh client instance (simulating new process/connection)
    # with the same cookie
    restart_client = TestClient(app)
    restart_client.cookies = client.cookies

    # 5. Session survives: /api/auth/me succeeds with same user
    res_me = restart_client.get("/api/auth/me")
    assert res_me.status_code == 200
    assert res_me.json()["email"] == email

    # 6. History survives: /api/history returns persisted searches from SQLite
    history_after = restart_client.get(f"/api/history?repo_id={repo_id}").json()
    assert len(history_after) >= 1
    assert history_after[0]["query"] == "compute_tax"

    # 7. Repository index survives: /api/search succeeds from disk cache
    res_search_after = restart_client.post("/api/search", json={"repo_id": repo_id, "query": "compute_tax", "explain": False})
    assert res_search_after.status_code == 200
    assert len(res_search_after.json()["results"]) >= 1

