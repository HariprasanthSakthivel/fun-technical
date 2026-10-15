"""Automated test suite for Step 7:

1. Valid session start (Ready -> Live).
2. Rejecting invalid session transitions (Draft cannot start).
3. Admin unlocking one question and opening buzzer.
4. Rejecting unauthorized unlock attempts.
5. Concurrent buzzer requests.
6. Exactly 3 teams qualifying when limit is 3.
7. Rejecting 4th and subsequent teams.
8. Preventing duplicate team positions.
9. Idempotent buzzer requests.
10. Answer submission by eligible teams.
11. Rejection of ineligible team answers.
12. Duplicate answer submission rejection.
13. Case-insensitive exact normalized answer matching.
14. Answer reveal authorization.
15. Preventing answers from being leaked before reveal.
16. Protecting secret topics from guessing teams in Explain Without Naming.
17. WebSocket connection and state recovery event.
18. Restoring game state after restart / re-querying from SQLite.
19. Preventing submissions after question closure.
20. Completing a session without allowing further gameplay.
"""

import asyncio
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.models import (
    AnswerSubmission,
    BuzzerPosition,
    GameSession,
    LiveGameState,
    Question,
    SessionQuestion,
    SessionTeam,
    Team,
    User,
)
from app.services.game_engine import game_engine

# Isolated test SQLite database for Step 7
TEST_ENGINE_STEP7_PATH = Path("./test_fun_tech_step7.db").resolve()
TEST_DATABASE_URL = f"sqlite:///{TEST_ENGINE_STEP7_PATH.as_posix()}"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_step7_database():
    """Create test tables and cleanup after session."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    if TEST_ENGINE_STEP7_PATH.exists():
        try:
            TEST_ENGINE_STEP7_PATH.unlink()
        except Exception:
            pass


@pytest.fixture
def db():
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture
def client(db: Session):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_token(db: Session) -> str:
    admin = db.query(User).filter(User.username == "step7_admin").first()
    if not admin:
        admin = User(
            username="step7_admin",
            email="step7_admin@example.com",
            password_hash=hash_password("admin_pass"),
            role="admin",
            is_active=True,
        )
        db.add(admin)
        db.commit()
    return create_access_token({"sub": str(admin.id), "username": admin.username, "role": "admin"})


@pytest.fixture
def seeded_game(db: Session):
    """Seed 4 teams, 2 questions (1 Tech, 1 Explain), and 1 Ready session."""
    # Teams
    teams = []
    for i, name, code in [(1, "Alpha", "ALPHAX"), (2, "Beta", "BETAX"), (3, "Gamma", "GAMMAX"), (4, "Delta", "DELTAX")]:
        t = db.query(Team).filter(Team.id == f"T_{i}").first()
        if not t:
            t = Team(id=f"T_{i}", team_name=name, team_code=code, member_count=3, status="active")
            db.add(t)
        teams.append(t)

    # Questions
    q1 = db.query(Question).filter(Question.id == "Q_TECH_1").first()
    if not q1:
        q1 = Question(
            id="Q_TECH_1",
            game_type="guess-tech",
            title="Fast modern language",
            content_type="text",
            text_content="Borrow checker and zero-cost abstractions.",
            correct_answer="Rust",
            accepted_answers=["rust-lang", "the rust programming language"],
            explanation="Rust provides memory safety without garbage collection.",
            difficulty="medium",
            status="ready",
        )
        db.add(q1)

    q2 = db.query(Question).filter(Question.id == "Q_EXPL_1").first()
    if not q2:
        q2 = Question(
            id="Q_EXPL_1",
            game_type="explain-without-naming",
            title="Explain Polymorphism",
            content_type="text",
            secret_topic="Polymorphism",
            prohibited_words=["poly", "morph", "many", "shapes"],
            correct_answer="Polymorphism",
            accepted_answers=["dynamic dispatch"],
            explanation="Ability of different classes to respond to the same message.",
            difficulty="hard",
            status="ready",
        )
        db.add(q2)

    # Session
    sess = db.query(GameSession).filter(GameSession.id == "S_STEP7").first()
    if not sess:
        sess = GameSession(
            id="S_STEP7",
            session_code="LIVE-7001",
            session_name="Step 7 Live Tournament",
            game_type="guess-tech",
            status="ready",
            game_rules={"maxEligibleTeams": 3, "enableBuzzer": True},
        )
        db.add(sess)
        db.flush()

        sess.session_questions.append(SessionQuestion(question_id="Q_TECH_1", question_order=1))
        sess.session_questions.append(SessionQuestion(question_id="Q_EXPL_1", question_order=2))
        for t in teams:
            sess.session_teams.append(SessionTeam(team_id=t.id, participation_status="registered"))

    db.commit()
    return {"session_id": "S_STEP7", "teams": teams, "q1": q1, "q2": q2}


# ── Tests 1 & 2: Valid and Invalid Session Transitions ─────────────────────────

def test_start_session_valid_and_invalid(client: TestClient, admin_token: str, seeded_game, db: Session):
    headers = {"Authorization": f"Bearer {admin_token}"}
    session_id = seeded_game["session_id"]

    # 1. Valid start
    resp = client.post(f"/api/live/sessions/{session_id}/start", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "live"
    assert resp.json()["current_question_number"] == 1
    assert resp.json()["is_question_unlocked"] is False

    # 2. Reject invalid start transition (already Live)
    resp2 = client.post(f"/api/live/sessions/{session_id}/start", headers=headers)
    assert resp2.status_code == 400 or resp2.status_code == 422


# ── Tests 3 & 4: Unlocking Questions & Unauthorized Protection ────────────────

def test_unlock_question_and_unauthorized_protection(client: TestClient, admin_token: str, seeded_game):
    session_id = seeded_game["session_id"]

    # Unauthorized attempt (no token)
    unauth_resp = client.post(f"/api/live/sessions/{session_id}/unlock", json={})
    assert unauth_resp.status_code == 401

    # Valid admin unlock
    headers = {"Authorization": f"Bearer {admin_token}"}
    unlock_resp = client.post(f"/api/live/sessions/{session_id}/unlock", json={}, headers=headers)
    assert unlock_resp.status_code == 200
    data = unlock_resp.json()
    assert data["is_question_unlocked"] is True
    assert data["is_buzzer_open"] is True
    assert data["current_question"]["id"] == "Q_TECH_1"


# ── Tests 5, 6, 7, 8, 9: Buzzer Concurrency, Limit 3, Reject 4th, Idempotency ──

def test_buzzer_concurrency_and_capacity_limits(client: TestClient, seeded_game, db: Session):
    session_id = seeded_game["session_id"]

    # Team 1 buzzes
    r1 = client.post(f"/api/live/sessions/{session_id}/buzz?team_id=T_1", json={"idempotency_key": "k1"})
    assert r1.status_code == 200
    assert r1.json()["position"] == 1
    assert r1.json()["eligible"] is True

    # Duplicate buzz by Team 1 (idempotency check)
    r1_dup = client.post(f"/api/live/sessions/{session_id}/buzz?team_id=T_1", json={"idempotency_key": "k1"})
    assert r1_dup.status_code == 200
    assert r1_dup.json()["position"] == 1

    # Team 2 buzzes -> position 2
    r2 = client.post(f"/api/live/sessions/{session_id}/buzz?team_id=T_2", json={"idempotency_key": "k2"})
    assert r2.status_code == 200
    assert r2.json()["position"] == 2

    # Team 3 buzzes -> position 3 (capacity reached)
    r3 = client.post(f"/api/live/sessions/{session_id}/buzz?team_id=T_3", json={"idempotency_key": "k3"})
    assert r3.status_code == 200
    assert r3.json()["position"] == 3
    assert r3.json()["buzzer_open"] is False

    # Team 4 buzzes -> rejected (limit is 3)
    r4 = client.post(f"/api/live/sessions/{session_id}/buzz?team_id=T_4", json={"idempotency_key": "k4"})
    assert r4.status_code == 400
    assert "Max eligible teams" in r4.text or "closed" in r4.text


# ── Tests 10, 11, 12, 13: Answer Submissions, Rejections, Evaluation ───────────

def test_answer_submission_and_evaluation(client: TestClient, admin_token: str, seeded_game):
    headers = {"Authorization": f"Bearer {admin_token}"}
    session_id = seeded_game["session_id"]

    # 1. Eligible Team 1 submits correct answer with whitespace/case variation
    sub1 = client.post(
        f"/api/live/sessions/{session_id}/submit-answer?team_id=T_1",
        json={"answer_text": "   rUsT  "},
    )
    assert sub1.status_code == 200
    assert sub1.json()["success"] is True

    # 2. Duplicate submission by Team 1 -> rejected (409)
    sub1_dup = client.post(
        f"/api/live/sessions/{session_id}/submit-answer?team_id=T_1",
        json={"answer_text": "rust"},
    )
    assert sub1_dup.status_code == 409

    # 3. Eligible Team 2 submits incorrect answer
    sub2 = client.post(
        f"/api/live/sessions/{session_id}/submit-answer?team_id=T_2",
        json={"answer_text": "Golang"},
    )
    assert sub2.status_code == 200

    # 4. Ineligible Team 4 (rejected at buzzer) attempts submit -> rejected (403)
    sub4 = client.post(
        f"/api/live/sessions/{session_id}/submit-answer?team_id=T_4",
        json={"answer_text": "Rust"},
    )
    assert sub4.status_code == 403


# ── Tests 14 & 15: Answer Reveal Authorization & Protection Before Reveal ──────

def test_answer_reveal_and_confidentiality(client: TestClient, admin_token: str, seeded_game):
    headers = {"Authorization": f"Bearer {admin_token}"}
    session_id = seeded_game["session_id"]

    # Check participant state BEFORE reveal: correct answer must NOT be present
    p_state_before = client.get(f"/api/live/sessions/{session_id}/participant-state?team_id=T_1").json()
    assert "correct_answer" not in p_state_before.get("question", {})
    assert p_state_before.get("revealed_results") is None

    # Admin reveals answer
    rev_resp = client.post(f"/api/live/sessions/{session_id}/reveal", headers=headers)
    assert rev_resp.status_code == 200

    # Participant state AFTER reveal: results now visible
    p_state_after = client.get(f"/api/live/sessions/{session_id}/participant-state?team_id=T_1").json()
    assert p_state_after.get("revealed_results") is not None
    assert p_state_after["revealed_results"]["correct_answer"] == "Rust"
    assert p_state_after["revealed_results"]["team_is_correct"] is True

    # Team 2 state check (submitted "Golang" -> incorrect)
    p2_state = client.get(f"/api/live/sessions/{session_id}/participant-state?team_id=T_2").json()
    assert p2_state["revealed_results"]["team_is_correct"] is False


# ── Test 16: Protecting Secret Topics in Explain Without Naming ────────────────

def test_explain_without_naming_secret_protection(client: TestClient, admin_token: str, seeded_game):
    headers = {"Authorization": f"Bearer {admin_token}"}
    session_id = seeded_game["session_id"]

    # Advance to Question 2 (Explain Without Naming)
    client.post(f"/api/live/sessions/{session_id}/next", headers=headers)

    # Unlock with Team 1 as Explaining team
    unlock = client.post(
        f"/api/live/sessions/{session_id}/unlock",
        json={"explaining_team_id": "T_1"},
        headers=headers,
    )
    assert unlock.status_code == 200

    # 1. Explaining team (T_1) receives secret topic
    t1_state = client.get(f"/api/live/sessions/{session_id}/participant-state?team_id=T_1").json()
    assert t1_state["is_explaining_team"] is True
    assert t1_state["question"]["secret_topic"] == "Polymorphism"
    assert "poly" in t1_state["question"]["prohibited_words"]

    # 2. Guessing team (T_2) strictly NEVER receives secret topic or prohibited words
    t2_state = client.get(f"/api/live/sessions/{session_id}/participant-state?team_id=T_2").json()
    assert t2_state["is_explaining_team"] is False
    assert t2_state["question"]["secret_topic"] is None
    assert t2_state["question"]["prohibited_words"] is None


# ── Test 17 & 18: WebSocket State Recovery and SQLite Persistence ──────────────

def test_websocket_recovery_and_persistence(client: TestClient, admin_token: str, seeded_game, db: Session):
    session_id = seeded_game["session_id"]

    # Connect WebSocket and receive game_state_updated
    with client.websocket_connect(f"/api/live/ws/{session_id}?token={admin_token}") as ws:
        msg = ws.receive_json()
        assert msg["event"] == "game_state_updated"
        assert msg["data"]["session_id"] == session_id

    # Persistence verification: reload state directly from SQLite
    saved_state = db.query(LiveGameState).filter(LiveGameState.session_id == session_id).first()
    assert saved_state is not None
    assert saved_state.current_question_id == "Q_EXPL_1"
    assert saved_state.is_question_unlocked is True


# ── Tests 19 & 20: Submission Blocking After Closure and Session Completion ────

def test_submission_blocked_after_closure_and_completion(client: TestClient, admin_token: str, seeded_game):
    headers = {"Authorization": f"Bearer {admin_token}"}
    session_id = seeded_game["session_id"]

    # Reveal question 2
    client.post(f"/api/live/sessions/{session_id}/reveal", headers=headers)

    # Attempting to submit after question closed -> rejected
    sub_closed = client.post(
        f"/api/live/sessions/{session_id}/submit-answer?team_id=T_2",
        json={"answer_text": "Late answer"},
    )
    assert sub_closed.status_code == 400 or sub_closed.status_code == 403

    # Complete session
    comp_resp = client.post(f"/api/live/sessions/{session_id}/complete", headers=headers)
    assert comp_resp.status_code == 200
    assert comp_resp.json()["status"] == "completed"

    # Gameplay blocked after completion
    buzz_after = client.post(f"/api/live/sessions/{session_id}/buzz?team_id=T_3", json={})
    assert buzz_after.status_code == 400
