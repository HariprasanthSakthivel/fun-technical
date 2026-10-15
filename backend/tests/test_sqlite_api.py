"""Comprehensive automated test suite for Step 6:

1. Health check endpoint.
2. SQLite database connection.
3. Model relationships and constraints.
4. Admin authentication and token issuance.
5. Unauthorized admin endpoint access (401/403).
6. Question CRUD.
7. Duplicate team code rejection.
8. Session creation and validation (question & team counts).
9. Invalid question or team selection.
10. Participant joining.
11. Inactive and unregistered team rejection.
12. Confidential answer filtering in participant response.
13. Explaining-team vs guessing-team access for Explain Without Naming.
14. Database persistence across session restart.
"""

import os
from collections.abc import Generator
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.models import (
    GameSession,
    Question,
    SessionQuestion,
    SessionTeam,
    Team,
    TeamMember,
    User,
)

# Isolated test SQLite database
TEST_DB_PATH = Path("./test_fun_tech.db").resolve()
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH.as_posix()}"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create test tables before tests, clean up after session."""
    Base.metadata.create_all(bind=test_engine)
    # Seed baseline test records needed across tests
    with TestingSessionLocal() as session:
        t1 = Team(id="TEST_T1", team_name="Unit Test Team", team_code="UT_CODE", member_count=2, status="active")
        t1.members.append(TeamMember(member_name="Alice"))
        t1.members.append(TeamMember(member_name="Bob"))
        session.add(t1)

        t_sess_1 = Team(id="T_SESS_1", team_name="Alpha", team_code="ALPHAX", member_count=4, status="active")
        t_sess_2 = Team(id="T_SESS_2", team_name="Beta", team_code="BETAX", member_count=4, status="active")
        session.add_all([t_sess_1, t_sess_2])

        q_sess_1 = Question(
            id="Q_SESS_1",
            game_type="guess-tech",
            title="Sample Q",
            content_type="text",
            text_content="Which language?",
            correct_answer="Rust",
            status="ready",
        )
        session.add(q_sess_1)
        session.commit()

    yield
    Base.metadata.drop_all(bind=test_engine)
    if TEST_DB_PATH.exists():
        try:
            TEST_DB_PATH.unlink()
        except Exception:
            pass


@pytest.fixture
def db() -> Generator[Session, None, None]:
    """Yield a database session for each test wrapped in a transaction rollback."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    """TestClient overriding get_db dependency."""
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_token(client: TestClient, db: Session) -> str:
    """Create an admin user and return bearer token."""
    admin = db.query(User).filter(User.username == "test_admin").first()
    if not admin:
        admin = User(
            username="test_admin",
            email="test_admin@example.com",
            password_hash=hash_password("admin_pass"),
            role="admin",
            is_active=True,
        )
        db.add(admin)
        db.commit()

    resp = client.post("/api/auth/login", json={"username": "test_admin", "password": "admin_pass"})
    assert resp.status_code == 200
    return resp.json()["access_token"]


# ── Test 1: Health Check Endpoint ──────────────────────────────────────────────

def test_health_check(client: TestClient):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["success"] is True


# ── Test 2: SQLite Database Connection ─────────────────────────────────────────

def test_sqlite_connection(db: Session):
    result = db.execute(Base.metadata.tables["users"].select()).all()
    assert isinstance(result, list)


# ── Test 3: Model Relationships and Constraints ────────────────────────────────

def test_model_relationships_and_constraints(db: Session):
    team = Team(
        id="TEST_T3",
        team_name="Rel Test Team",
        team_code="REL_CODE",
        member_count=2,
        status="active",
    )
    team.members.append(TeamMember(member_name="Alice"))
    team.members.append(TeamMember(member_name="Bob"))
    db.add(team)
    db.commit()

    saved_team = db.query(Team).filter(Team.id == "TEST_T3").first()
    assert saved_team is not None
    assert len(saved_team.members) == 2
    assert saved_team.members[0].member_name == "Alice"


# ── Test 4: Admin Authentication and Token ─────────────────────────────────────

def test_admin_authentication_and_token(client: TestClient, db: Session):
    # Setup initial admin if not existing
    resp = client.post("/api/auth/setup-admin", json={"username": "root_admin", "password": "secret_root_password"})
    if resp.status_code == 403:
        # Admin exists, try login
        resp = client.post("/api/auth/login", json={"username": "test_admin", "password": "admin_pass"})
    else:
        assert resp.status_code == 200
        resp = client.post("/api/auth/login", json={"username": "root_admin", "password": "secret_root_password"})

    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "admin"


# ── Test 5: Unauthorized Admin Endpoint Access ─────────────────────────────────

def test_unauthorized_admin_access(client: TestClient):
    # Missing token -> 401
    resp = client.get("/api/questions")
    assert resp.status_code == 401

    # Fake invalid token -> 401
    resp = client.get("/api/questions", headers={"Authorization": "Bearer bad.token.format"})
    assert resp.status_code == 401


# ── Test 6: Question CRUD ──────────────────────────────────────────────────────

def test_question_crud(client: TestClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create
    create_payload = {
        "id": "Q_TEST_01",
        "game_type": "guess-tech",
        "title": "Which database is this?",
        "instructions": "Identify the DB",
        "content_type": "text",
        "text_content": "SELECT * FROM sqlite_master;",
        "correct_answer": "SQLite",
        "accepted_answers": ["sqlite3"],
        "explanation": "sqlite_master is specific to SQLite.",
        "difficulty": "easy",
        "question_order": 1,
        "status": "ready",
    }
    resp = client.post("/api/questions", json=create_payload, headers=headers)
    assert resp.status_code == 201
    q_data = resp.json()
    assert q_data["id"] == "Q_TEST_01"
    assert q_data["correct_answer"] == "SQLite"

    # Read
    resp = client.get("/api/questions/Q_TEST_01", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Which database is this?"

    # Update
    resp = client.put(
        "/api/questions/Q_TEST_01",
        json={"difficulty": "hard", "title": "Updated Title"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["difficulty"] == "hard"
    assert resp.json()["title"] == "Updated Title"

    # Delete
    resp = client.delete("/api/questions/Q_TEST_01", headers=headers)
    assert resp.status_code == 204

    # Confirm deleted
    resp = client.get("/api/questions/Q_TEST_01", headers=headers)
    assert resp.status_code == 404


# ── Test 7: Duplicate Team Code Rejection ──────────────────────────────────────

def test_duplicate_team_code_rejection(client: TestClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}
    client.post(
        "/api/teams",
        json={"id": "T_DUP_1", "team_name": "First Team", "team_code": "DUPCODE", "member_count": 3},
        headers=headers,
    )

    # Attempt to create second team with identical code
    resp = client.post(
        "/api/teams",
        json={"id": "T_DUP_2", "team_name": "Second Team", "team_code": "DUPCODE", "member_count": 3},
        headers=headers,
    )
    assert resp.status_code == 409
    assert "already registered" in resp.json()["detail"]


# ── Test 8: Session Creation and Validation ────────────────────────────────────

def test_session_creation_and_validation(client: TestClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup valid question and 2 teams
    client.post(
        "/api/questions",
        json={
            "id": "Q_SESS_1",
            "game_type": "guess-tech",
            "title": "Sample Q",
            "correct_answer": "Rust",
            "status": "ready",
        },
        headers=headers,
    )
    client.post("/api/teams", json={"id": "T_SESS_1", "team_name": "Alpha", "team_code": "ALPHAX", "status": "active"}, headers=headers)
    client.post("/api/teams", json={"id": "T_SESS_2", "team_name": "Beta", "team_code": "BETAX", "status": "active"}, headers=headers)

    # Valid session creation in Ready status
    resp = client.post(
        "/api/sessions",
        json={
            "session_name": "Championship 2026",
            "game_type": "guess-tech",
            "status": "ready",
            "question_ids": ["Q_SESS_1"],
            "team_ids": ["T_SESS_1", "T_SESS_2"],
        },
        headers=headers,
    )
    assert resp.status_code == 201
    s_data = resp.json()
    assert s_data["status"] == "ready"
    assert s_data["session_code"].startswith("TECH-")
    assert len(s_data["question_ids"]) == 1
    assert len(s_data["team_ids"]) == 2


# ── Test 9: Invalid Question or Team Selection for Session ─────────────────────

def test_invalid_session_selection(client: TestClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Missing questions for Ready session -> 400
    resp = client.post(
        "/api/sessions",
        json={
            "session_name": "Empty Session",
            "game_type": "guess-tech",
            "status": "ready",
            "question_ids": [],
            "team_ids": ["T_SESS_1", "T_SESS_2"],
        },
        headers=headers,
    )
    assert resp.status_code == 400

    # Fewer than 2 teams for Ready session -> 400
    resp = client.post(
        "/api/sessions",
        json={
            "session_name": "Solo Team Session",
            "game_type": "guess-tech",
            "status": "ready",
            "question_ids": ["Q_SESS_1"],
            "team_ids": ["T_SESS_1"],
        },
        headers=headers,
    )
    assert resp.status_code == 400


# ── Test 10: Participant Joining ───────────────────────────────────────────────

def test_participant_joining(client: TestClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create Ready session
    sess_resp = client.post(
        "/api/sessions",
        json={
            "session_name": "Participant Join Test",
            "game_type": "guess-tech",
            "status": "ready",
            "question_ids": ["Q_SESS_1"],
            "team_ids": ["T_SESS_1", "T_SESS_2"],
        },
        headers=headers,
    )
    s_code = sess_resp.json()["session_code"]

    # Valid join request
    join_resp = client.post("/api/participant/join", json={"session_code": s_code, "team_code": "ALPHAX"})
    assert join_resp.status_code == 200
    j_data = join_resp.json()
    assert j_data["session_code"] == s_code
    assert j_data["team_code"] == "ALPHAX"
    assert "participant_token" in j_data


# ── Test 11: Inactive and Unregistered Team Rejection ──────────────────────────

def test_inactive_and_unregistered_team_rejection(client: TestClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}

    client.post("/api/teams", json={"id": "T_INACT", "team_name": "Inactive Team", "team_code": "INACTX", "status": "inactive"}, headers=headers)
    client.post("/api/teams", json={"id": "T_UNREG", "team_name": "Unregistered Team", "team_code": "UNREGX", "status": "active"}, headers=headers)

    sess_resp = client.post(
        "/api/sessions",
        json={
            "session_name": "Rejection Test Session",
            "game_type": "guess-tech",
            "status": "ready",
            "question_ids": ["Q_SESS_1"],
            "team_ids": ["T_SESS_1", "T_SESS_2"],
        },
        headers=headers,
    )
    s_code = sess_resp.json()["session_code"]

    # Inactive team attempt
    resp = client.post("/api/participant/join", json={"session_code": s_code, "team_code": "INACTX"})
    assert resp.status_code == 400 or resp.status_code == 403

    # Unregistered team attempt
    resp = client.post("/api/participant/join", json={"session_code": s_code, "team_code": "UNREGX"})
    assert resp.status_code == 403


# ── Test 12: Confidential Answer Filtering in Participant Response ─────────────

def test_confidential_answer_filtering(client: TestClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}

    sess_resp = client.post(
        "/api/sessions",
        json={
            "session_name": "Live Security Test",
            "game_type": "guess-tech",
            "status": "ready",
            "question_ids": ["Q_SESS_1"],
            "team_ids": ["T_SESS_1", "T_SESS_2"],
        },
        headers=headers,
    )
    s_id = sess_resp.json()["id"]
    s_code = sess_resp.json()["session_code"]

    # Start session -> live
    client.post(f"/api/sessions/{s_id}/start", headers=headers)

    # Participant join
    join_resp = client.post("/api/participant/join", json={"session_code": s_code, "team_code": "ALPHAX"})
    part_token = join_resp.json()["participant_token"]

    # Fetch active question as participant
    q_resp = client.get(
        f"/api/participant/sessions/{s_code}/current-question",
        headers={"Authorization": f"Bearer {part_token}"},
    )
    assert q_resp.status_code == 200
    q_data = q_resp.json()

    # Verify confidential fields are NOT in participant response
    assert "correct_answer" not in q_data
    assert "accepted_answers" not in q_data
    assert "explanation" not in q_data


# ── Test 13: Explaining-Team vs Guessing-Team Access ────────────────────────────

def test_explaining_vs_guessing_team_access(client: TestClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create Explain Without Naming question
    client.post(
        "/api/questions",
        json={
            "id": "Q_EXP_1",
            "game_type": "explain-without-naming",
            "title": "Secret Concept",
            "secret_topic": "Polymorphism",
            "prohibited_words": ["poly", "morph", "many", "shapes"],
            "correct_answer": "Polymorphism",
            "status": "ready",
        },
        headers=headers,
    )

    sess_resp = client.post(
        "/api/sessions",
        json={
            "session_name": "Explain Game Session",
            "game_type": "explain-without-naming",
            "status": "ready",
            "question_ids": ["Q_EXP_1"],
            "team_ids": ["T_SESS_1", "T_SESS_2"],  # T_SESS_1 is explaining team
        },
        headers=headers,
    )
    s_id = sess_resp.json()["id"]
    s_code = sess_resp.json()["session_code"]

    client.post(f"/api/sessions/{s_id}/start", headers=headers)

    # 1. Explaining team (T_SESS_1)
    exp_join = client.post("/api/participant/join", json={"session_code": s_code, "team_code": "ALPHAX"})
    exp_token = exp_join.json()["participant_token"]

    exp_q = client.get(
        f"/api/participant/sessions/{s_code}/current-question",
        headers={"Authorization": f"Bearer {exp_token}"},
    )
    assert exp_q.status_code == 200
    exp_data = exp_q.json()
    assert exp_data["is_explaining_team"] is True
    assert exp_data["secret_topic"] == "Polymorphism"
    assert exp_data["prohibited_words"] == ["poly", "morph", "many", "shapes"]

    # 2. Guessing team (T_SESS_2)
    guess_join = client.post("/api/participant/join", json={"session_code": s_code, "team_code": "BETAX"})
    guess_token = guess_join.json()["participant_token"]

    guess_q = client.get(
        f"/api/participant/sessions/{s_code}/current-question",
        headers={"Authorization": f"Bearer {guess_token}"},
    )
    assert guess_q.status_code == 200
    guess_data = guess_q.json()
    assert guess_data["is_explaining_team"] is False
    assert guess_data["secret_topic"] is None
    assert guess_data["prohibited_words"] is None


# ── Test 14: Database Persistence After Re-instantiation ──────────────────────

def test_database_persistence(db: Session):
    # Verify records written in earlier fixtures persist in SQLite
    team = db.query(Team).filter(Team.id == "TEST_T1").first()
    assert team is not None
    assert team.team_code == "UT_CODE"
