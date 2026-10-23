"""Comprehensive automated tests for Fun Friday Activities Platform.

Tests:
1. Health check.
2. Participant and Admin authentication.
3. Logged-in users listing for admin dashboard.
4. Random team division (even / odd rules: 2 per team, 1 of 3 if odd).
5. Team name editing.
6. Game 1: Tech Detective (unlocking, confidential answer stripping, buzzer race top 3, scoring).
7. Game 2: Lightning Talks (topic assignment, 3-criteria evaluation, score aggregation).
8. Final Combined Leaderboard (Game 1 + Game 2 rankings, admin score editing).
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.main import app
from app.models.models import (
    GameState,
    LightningTalkTopic,
    Team,
    TechDetectiveQuestion,
    User,
)
from app.core.security import hash_password

from sqlalchemy.pool import StaticPool

# In-memory SQLite for testing with StaticPool
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    with TestingSessionLocal() as db:
        # Admin
        admin = User(
            username="admin",
            display_name="Admin",
            password_hash=hash_password("admin123"),
            role="admin",
            is_active=True,
            is_logged_in=True,
        )
        db.add(admin)

        # 6 participants
        for i in range(1, 7):
            u = User(
                username=f"user{i}",
                display_name=f"Participant {i}",
                password_hash=hash_password("pass123"),
                role="participant",
                is_active=True,
                is_logged_in=(i <= 4),  # 4 logged in initially
            )
            db.add(u)

        # Tech Detective Question
        q = TechDetectiveQuestion(
            id="TD01",
            question_number=1,
            title="Identify this technology",
            technology_name="Docker",
            images=[{"id": 1, "url": "data:image/svg+xml;base64,abc", "caption": "Clue 1"},
                    {"id": 2, "url": "data:image/svg+xml;base64,def", "caption": "Clue 2"}],
            accepted_answers=["docker", "dockerfile"],
            is_unlocked=False,
        )
        db.add(q)

        # Lightning topic
        for j in range(1, 10):
            db.add(
                LightningTalkTopic(
                    id=f"LT{j:02d}",
                    topic_name=f"Topic {j}",
                    description=f"Description {j}",
                    prohibited_words=["forbidden"],
                    is_unlocked=False,
                )
            )

        db.add(GameState(id=1, current_game="lobby"))
        db.commit()


def get_token(username="admin", password="admin123"):
    res = client.post("/api/auth/login", json={"username": username, "password": password})
    return res.json()["access_token"]


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_auth_and_logged_in_users():
    admin_token = get_token("admin", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/auth/logged-in-users", headers=headers)
    assert res.status_code == 200
    logged_in = res.json()
    assert len(logged_in) == 4  # users 1 to 4


def test_random_team_formation_even():
    admin_token = get_token("admin", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 4 logged-in users -> exactly 2 teams of 2 members
    res = client.post("/api/teams/randomize", json={}, headers=headers)
    assert res.status_code == 200
    teams = res.json()
    assert len(teams) == 2
    assert len(teams[0]["members"]) == 2
    assert len(teams[1]["members"]) == 2


def test_random_team_formation_odd():
    # Log in user 5 -> 5 logged-in users
    client.post("/api/auth/login", json={"username": "user5", "password": "pass123"})

    admin_token = get_token("admin", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 5 users -> 2 teams: 1 team of 2, 1 team of 3
    res = client.post("/api/teams/randomize", json={}, headers=headers)
    assert res.status_code == 200
    teams = res.json()
    assert len(teams) == 2
    lens = sorted([len(t["members"]) for t in teams])
    assert lens == [2, 3]


def test_random_team_formation_11_participants():
    admin_token = get_token("admin", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Add 5 more users so there are 11 participants total
    for k in range(7, 12):
        client.post(
            "/api/auth/register",
            json={"username": f"user{k}", "display_name": f"Participant {k}", "password": "pass123"},
        )

    # 11 participants with team_size = 2 -> Exactly 5 teams (4 of 2, 1 of 3)
    res = client.post("/api/teams/randomize", json={"team_size": 2, "include_all": True}, headers=headers)
    assert res.status_code == 200
    teams = res.json()
    assert len(teams) == 5  # Exactly 5 teams! NOT 6 teams!
    lens = sorted([len(t["members"]) for t in teams])
    assert lens == [2, 2, 2, 2, 3]  # One team has 3 members, four teams have 2 members!

    # Clean up temporary users 7-11
    with TestingSessionLocal() as db:
        db.query(User).filter(User.username.in_([f"user{k}" for k in range(7, 12)])).delete(synchronize_session=False)
        db.commit()


def test_random_team_formation_custom_size():
    # Log in user 6 -> 6 logged-in users
    client.post("/api/auth/login", json={"username": "user6", "password": "pass123"})

    admin_token = get_token("admin", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 6 users with team_size = 3 -> exactly 2 teams of 3
    res = client.post("/api/teams/randomize", json={"team_size": 3}, headers=headers)
    assert res.status_code == 200
    teams = res.json()
    assert len(teams) == 2
    assert len(teams[0]["members"]) == 3
    assert len(teams[1]["members"]) == 3

    # Reset back to 2 per team so subsequent tests continue with expected teams
    res2 = client.post("/api/teams/randomize", json={"team_size": 2}, headers=headers)
    assert res2.status_code == 200



def test_edit_team_name():
    admin_token = get_token("admin", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Admin can edit any team name
    res = client.put("/api/teams/T01/name", json={"team_name": "Cyber Hawks"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["team_name"] == "Cyber Hawks"

    # 2. Participant can edit their own team's name (via ID and via 'my-team')
    u1_token = get_token("user1", "pass123")
    u1_headers = {"Authorization": f"Bearer {u1_token}"}
    my_team_res = client.get("/api/teams/my-team", headers=u1_headers)
    assert my_team_res.status_code == 200
    u1_team = my_team_res.json()
    u1_team_id = u1_team["id"]

    res_part = client.put(f"/api/teams/{u1_team_id}/name", json={"team_name": "Pixel Warriors"}, headers=u1_headers)
    assert res_part.status_code == 200
    assert res_part.json()["team_name"] == "Pixel Warriors"

    # Also works via /api/teams/my-team/name
    res_my_team = client.put("/api/teams/my-team/name", json={"team_name": "Cyber Mavericks"}, headers=u1_headers)
    assert res_my_team.status_code == 200
    assert res_my_team.json()["team_name"] == "Cyber Mavericks"

    # 3. Participant cannot edit a different team
    other_team_res = client.get("/api/teams")
    other_team = next(t for t in other_team_res.json() if t["id"] != u1_team_id)
    res_forbidden = client.put(f"/api/teams/{other_team['id']}/name", json={"team_name": "Hacked Name"}, headers=u1_headers)
    assert res_forbidden.status_code == 403
    assert "You can only edit your own team's name" in res_forbidden.json()["detail"]


def test_tech_detective_unlock_and_confidentiality():
    admin_token = get_token("admin", "admin123")
    user_token = get_token("user1", "pass123")

    # Participant cannot see question before unlock
    res = client.get("/api/tech-detective/active-question", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    assert res.json() is None

    # Admin unlocks TD01
    res = client.post("/api/tech-detective/unlock/TD01", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

    # Participant now sees question WITHOUT technology_name or accepted_answers
    res = client.get("/api/tech-detective/active-question", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "TD01"
    assert "technology_name" not in data
    assert "accepted_answers" not in data
    assert len(data["images"]) == 2


def test_tech_detective_buzzer_and_scoring():
    u1_token = get_token("user1", "pass123")
    admin_token = get_token("admin", "admin123")

    # Team of user 1 presses buzzer
    res = client.post("/api/tech-detective/buzz", headers={"Authorization": f"Bearer {u1_token}"})
    assert res.status_code == 200
    assert res.json()["position"] == 1

    # Admin evaluates 1st team as Correct -> +10 points
    res = client.post(
        "/api/tech-detective/evaluate",
        json={"team_id": "T01", "buzzer_position": 1, "is_correct": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["points_awarded"] == 10
    assert res.json()["new_score"] == 10


def test_lightning_talks_topic_assignment_and_scoring():
    admin_token = get_token("admin", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    u1_token = get_token("user1", "pass123")
    u1_profile = client.get("/api/auth/me", headers={"Authorization": f"Bearer {u1_token}"}).json()
    u1_id = u1_profile["id"]

    # Admin manually assigns a topic to user 1 in team T01
    res = client.post(
        "/api/lightning-talks/manual-assign",
        json={
            "user_id": u1_id,
            "team_id": "T01",
            "topic_name": "Enterprise AI Orchestration",
            "prohibited_words": ["automation", "database"],
        },
        headers=headers,
    )
    assert res.status_code == 200
    topic_data = res.json()
    assert topic_data["topic_name"] == "Enterprise AI Orchestration"
    topic_id = topic_data["id"]

    # Unlock topic
    res = client.post(f"/api/lightning-talks/unlock/{topic_id}", headers=headers)
    assert res.status_code == 200

    # User 1 (assigned speaker) sees the topic and prohibited words
    res_u1 = client.get("/api/lightning-talks/active-topic", headers={"Authorization": f"Bearer {u1_token}"})
    assert res_u1.status_code == 200
    u1_topic = res_u1.json()
    assert u1_topic["is_my_turn"] is True
    assert u1_topic["topic_name"] == "Enterprise AI Orchestration"
    assert "automation" in u1_topic["prohibited_words"]

    # User 2 (audience/other participant) does NOT see the topic name or prohibited words
    u2_token = get_token("user2", "pass123")
    res_u2 = client.get("/api/lightning-talks/active-topic", headers={"Authorization": f"Bearer {u2_token}"})
    assert res_u2.status_code == 200
    u2_topic = res_u2.json()
    assert u2_topic["is_my_turn"] is False
    assert u2_topic["topic_name"] == ""  # Redacted!
    assert u2_topic["prohibited_words"] == []  # Redacted!
    assert u2_topic["active_speaker_name"] is not None

    # Evaluate speech on 3 criteria: Time=8, Words=9, Understandability=9 -> 26 pts
    res = client.post(
        "/api/lightning-talks/evaluate",
        json={
            "user_id": u1_id,
            "team_id": "T01",
            "topic_id": topic_id,
            "time_management_score": 8,
            "words_used_score": 9,
            "understandability_score": 9,
        },
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["total_speech_score"] == 26


def test_final_combined_leaderboard():
    admin_token = get_token("admin", "admin123")
    res = client.get("/api/leaderboard/final")
    assert res.status_code == 200
    board = res.json()
    assert len(board) >= 1
    # T01 has 10 from Tech Detective + 26 from Lightning Talks = 36 total
    t1 = next(t for t in board if t["team_id"] == "T01")
    assert t1["tech_detective_score"] == 10
    assert t1["lightning_talks_score"] == 26
    assert t1["total_score"] == 36


def test_synchronized_game_timer():
    admin_token = get_token("admin", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Public/participant can read timer
    res = client.get("/api/timer")
    assert res.status_code == 200
    timer_data = res.json()
    assert "total_duration" in timer_data
    assert "is_running" in timer_data

    # Admin sets dynamic duration (e.g. 2 minutes = 120s)
    res = client.post(
        "/api/timer/control",
        json={"action": "set_duration", "duration_seconds": 120, "game": "all"},
        headers=admin_headers,
    )
    assert res.status_code == 200
    assert res.json()["total_duration"] == 120
    assert res.json()["is_running"] is False

    # Admin starts timer
    res = client.post(
        "/api/timer/control",
        json={"action": "start"},
        headers=admin_headers,
    )
    assert res.status_code == 200
    assert res.json()["is_running"] is True
    assert res.json()["end_time"] is not None

    # Admin pauses timer
    res = client.post(
        "/api/timer/control",
        json={"action": "pause"},
        headers=admin_headers,
    )
    assert res.status_code == 200
    assert res.json()["is_running"] is False

    # Participant cannot control timer (403 forbidden)
    p_token = get_token("user1", "pass123")
    res = client.post(
        "/api/timer/control",
        json={"action": "start"},
        headers={"Authorization": f"Bearer {p_token}"},
    )
    assert res.status_code == 403


def test_dynamic_games_catalog_and_custom_scoring():
    """Test dynamic game creation, activation, and custom score awarding for future events."""
    admin_token = get_token("admin", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    # 1. List games - auto-seeds default games
    res = client.get("/api/games")
    assert res.status_code == 200
    games = res.json()
    assert len(games) >= 2
    codes = [g["game_code"] for g in games]
    assert "tech-detective" in codes
    assert "lightning-talks" in codes

    # 2. Admin adds a new custom game
    create_res = client.post(
        "/api/games",
        json={
            "title": "Code Relay Challenge",
            "game_code": "code-relay",
            "subtitle": "Collaborative Speed Coding",
            "description": "Teams take turns writing code snippets to solve an algorithmic puzzle.",
            "game_type": "challenge",
            "icon": "code",
            "default_timer_seconds": 180,
            "rules": [
                "Each team member codes for 60 seconds then hands off to teammate.",
                "Tests must pass completely within 3 minutes.",
            ],
            "is_active": True,
        },
        headers=admin_headers,
    )
    assert create_res.status_code == 201
    created_game = create_res.json()
    assert created_game["game_code"] == "code-relay"
    assert created_game["title"] == "Code Relay Challenge"
    assert created_game["default_timer_seconds"] == 180

    # 3. Activate the new game
    act_res = client.post(f"/api/games/{created_game['id']}/activate", headers=admin_headers)
    assert act_res.status_code == 200

    # 4. Award custom score to Team 1 for the new game
    # Ensure a team exists
    teams_res = client.get("/api/teams")
    assert teams_res.status_code == 200
    teams = teams_res.json()
    assert len(teams) > 0
    target_team = teams[0]
    initial_total = target_team["total_score"]

    score_res = client.post(
        "/api/games/scores",
        json={
            "team_id": target_team["id"],
            "game_code": "code-relay",
            "score": 25,
            "notes": "Fastest passing test suite in relay!",
        },
        headers=admin_headers,
    )
    assert score_res.status_code == 200
    score_data = score_res.json()
    assert score_data["score"] == 25
    assert score_data["team_id"] == target_team["id"]

    # 5. Verify the leaderboard total score includes the custom score
    leaderboard_res = client.get("/api/leaderboard/final")
    assert leaderboard_res.status_code == 200
    updated_teams = leaderboard_res.json()
    matching_team = next(t for t in updated_teams if t["team_id"] == target_team["id"])
    assert matching_team["total_score"] == initial_total + 25


def test_multimedia_upload_and_custom_game_questions():
    import io
    admin_token = get_token("admin", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Upload mock audio file
    audio_bytes = io.BytesIO(b"RIFF....WAVEfmt ....data....")
    upload_res = client.post(
        "/api/games/upload-media",
        files={"file": ("tech_dialup.wav", audio_bytes, "audio/wav")},
        headers=admin_headers,
    )
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert upload_data["media_type"] == "audio"
    assert upload_data["url"].startswith("/media/")

    # Ensure a test game exists
    client.post(
        "/api/games",
        json={"title": "Sound & Media Quiz", "game_code": "media-quiz"},
        headers=admin_headers,
    )

    # 2. Add question with this uploaded audio
    q_res = client.post(
        "/api/games/media-quiz/questions",
        json={
            "title": "Guess the 90s Vintage Modem Sound",
            "description": "Listen to the dialup handshake sound and identify the modem standard.",
            "question_type": "audio-quiz",
            "media_type": upload_data["media_type"],
            "media_url": upload_data["url"],
            "options": ["V.90 (56 kbps)", "V.34 (28.8 kbps)", "Bell 103 (300 baud)", "ISDN"],
            "correct_answer": "V.90 (56 kbps)",
            "points": 15,
            "deduction": 3,
            "time_limit_seconds": 45,
        },
        headers=admin_headers,
    )
    assert q_res.status_code == 200
    q_data = q_res.json()
    assert q_data["media_type"] == "audio"
    assert q_data["media_url"] == upload_data["url"]
    assert q_data["points"] == 15

    # 3. Add question with YouTube URL and verify auto-detection
    yt_res = client.post(
        "/api/games/media-quiz/questions",
        json={
            "title": "System Architecture Breakdown Video",
            "description": "Watch this 30s clip and identify the distributed bottleneck.",
            "media_url": "https://www.youtube.com/watch?v=3fZpP46p0aQ",
            "points": 20,
        },
        headers=admin_headers,
    )
    assert yt_res.status_code == 200
    yt_data = yt_res.json()
    assert yt_data["media_type"] == "youtube"
    assert "youtube.com" in yt_data["media_url"]


def test_custom_game_buzzer_race_and_evaluation():
    admin_token = get_token("admin", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Ensure teams are randomized so user1 is in a team
    client.post("/api/teams/randomize", json={}, headers=admin_headers)

    # Participant token
    p_token = get_token("user1", "pass123")
    p_headers = {"Authorization": f"Bearer {p_token}"}

    # Create a custom test game
    g_res = client.post(
        "/api/games",
        json={"title": "Speedrun Buzzer Arena", "game_code": "buzzer-arena"},
        headers=admin_headers,
    )
    assert g_res.status_code in (200, 201)

    # Add a question
    q_res = client.post(
        "/api/games/buzzer-arena/questions",
        json={
            "title": "What protocol powers the web?",
            "correct_answer": "HTTP",
            "points": 10,
            "deduction": 2,
        },
        headers=admin_headers,
    )
    assert q_res.status_code in (200, 201)
    q_data = q_res.json()

    # Unlock the question -> opens buzzer
    unlock_res = client.post(
        f"/api/games/questions/{q_data['id']}/unlock",
        headers=admin_headers,
    )
    assert unlock_res.status_code == 200
    assert unlock_res.json()["is_unlocked"] is True
    assert unlock_res.json()["is_buzzer_open"] is True

    # Participant presses buzzer
    buzz_res = client.post(
        "/api/games/buzzer-arena/buzz",
        headers=p_headers,
    )
    assert buzz_res.status_code == 200
    buzz_data = buzz_res.json()
    assert buzz_data["position"] == 1

    # Check buzzer queue
    queue_res = client.get(
        f"/api/games/buzzer-arena/buzzer-queue/{q_data['id']}",
        headers=admin_headers,
    )
    assert queue_res.status_code == 200
    queue_data = queue_res.json()
    assert len(queue_data["buzzers"]) == 1
    assert queue_data["buzzers"][0]["position"] == 1
    assert queue_data["current_answering_position"] == 1

    # Admin evaluates correct
    team_id = buzz_data["team_id"]
    eval_res = client.post(
        "/api/games/buzzer-arena/evaluate",
        json={
            "question_id": q_data["id"],
            "team_id": team_id,
            "buzzer_position": 1,
            "is_correct": True,
        },
        headers=admin_headers,
    )
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert eval_data["is_correct"] is True
    assert eval_data["points_awarded"] == 10


def test_lightning_talks_buzzer_and_scoring():
    admin_token = get_token("admin", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Ensure 6 users exist and are assigned to teams T01, T02, T03 (2 each)
    client.post("/api/teams/randomize", json={"team_size": 2, "include_all": True}, headers=admin_headers)

    # Get team list to identify team IDs
    teams_res = client.get("/api/teams")
    assert teams_res.status_code == 200
    teams = teams_res.json()
    assert len(teams) >= 3
    t1 = teams[0]
    t2 = teams[1]
    t3 = teams[2]

    # Pick speaker user from Team 1
    speaker_user = t1["members"][0]
    teammate_user = t1["members"][1]
    # Pick audience users from Team 2 and Team 3
    audience_u2 = t2["members"][0]
    audience_u3 = t3["members"][0]

    speaker_token = get_token(speaker_user["username"], "pass123")
    teammate_token = get_token(teammate_user["username"], "pass123")
    audience_u2_token = get_token(audience_u2["username"], "pass123")
    audience_u3_token = get_token(audience_u3["username"], "pass123")

    # Assign topic to speaker and unlock
    assign_res = client.post(
        "/api/lightning-talks/manual-assign",
        json={
            "user_id": speaker_user["id"],
            "team_id": t1["id"],
            "topic_name": "Kubernetes Architecture",
            "prohibited_words": ["docker", "cluster"],
        },
        headers=admin_headers,
    )
    assert assign_res.status_code == 200
    topic_id = assign_res.json()["id"]

    unlock_res = client.post(f"/api/lightning-talks/unlock/{topic_id}", headers=admin_headers)
    assert unlock_res.status_code == 200
    assert unlock_res.json()["is_buzzer_open"] is True

    # 1. Admin can lock the buzzer while speaker is talking
    lock_res = client.post(f"/api/lightning-talks/lock-buzzer/{topic_id}", headers=admin_headers)
    assert lock_res.status_code == 200
    assert lock_res.json()["is_buzzer_open"] is False

    # While locked, audience buzzing fails
    buzz_locked = client.post(
        "/api/lightning-talks/buzz",
        headers={"Authorization": f"Bearer {audience_u2_token}"},
    )
    assert buzz_locked.status_code == 400
    assert "Buzzer is currently locked or topic guessing has not opened yet" in buzz_locked.json()["detail"]

    # 2. Admin opens buzzer for topic guessing
    open_res = client.post(
        f"/api/lightning-talks/open-buzzer/{topic_id}",
        headers=admin_headers,
    )
    assert open_res.status_code == 200
    assert open_res.json()["is_buzzer_open"] is True

    # 3. Speaker's own team member tries to buzz -> forbidden
    buzz_own_team = client.post(
        "/api/lightning-talks/buzz",
        headers={"Authorization": f"Bearer {teammate_token}"},
    )
    assert buzz_own_team.status_code == 400
    assert "cannot guess your own topic" in buzz_own_team.json()["detail"]

    # 4. Audience Team 2 buzzes in -> Position 1
    buzz1 = client.post(
        "/api/lightning-talks/buzz",
        headers={"Authorization": f"Bearer {audience_u2_token}"},
    )
    assert buzz1.status_code == 200
    assert buzz1.json()["position"] == 1
    assert buzz1.json()["team_id"] == t2["id"]

    # 5. Audience Team 2 tries to buzz again -> idempotent response with existing position
    buzz_dup = client.post(
        "/api/lightning-talks/buzz",
        headers={"Authorization": f"Bearer {audience_u2_token}"},
    )
    assert buzz_dup.status_code == 200
    assert buzz_dup.json()["position"] == 1
    assert "already pressed" in buzz_dup.json()["message"]

    # 6. Audience Team 3 buzzes in -> Position 2
    buzz2 = client.post(
        "/api/lightning-talks/buzz",
        headers={"Authorization": f"Bearer {audience_u3_token}"},
    )
    assert buzz2.status_code == 200
    assert buzz2.json()["position"] == 2
    assert buzz2.json()["team_id"] == t3["id"]

    # 7. Check buzzer queue
    queue_res = client.get(
        f"/api/lightning-talks/buzzer-queue/{topic_id}",
        headers=admin_headers,
    )
    assert queue_res.status_code == 200
    queue = queue_res.json()
    assert len(queue["buzzers"]) == 2
    assert queue["current_answering_position"] == 1

    # Record initial scores
    t2_initial_score = client.get("/api/teams").json()
    t2_score_before = next(t["lightning_talks_score"] for t in t2_initial_score if t["id"] == t2["id"])
    t3_score_before = next(t["lightning_talks_score"] for t in t2_initial_score if t["id"] == t3["id"])

    # 8. Admin evaluates Team 2 as Incorrect -> -5 points penalty
    eval1 = client.post(
        "/api/lightning-talks/evaluate-guess",
        json={
            "topic_id": topic_id,
            "team_id": t2["id"],
            "buzzer_position": 1,
            "is_correct": False,
        },
        headers=admin_headers,
    )
    assert eval1.status_code == 200
    assert eval1.json()["is_correct"] is False
    assert eval1.json()["points_awarded"] == -5
    assert eval1.json()["next_position"] == 2

    # Verify Team 2 lost 5 points
    teams_after_eval1 = client.get("/api/teams").json()
    t2_score_after = next(t["lightning_talks_score"] for t in teams_after_eval1 if t["id"] == t2["id"])
    assert t2_score_after == t2_score_before - 5

    # 9. Admin evaluates Team 3 as Correct -> +10 points award
    eval2 = client.post(
        "/api/lightning-talks/evaluate-guess",
        json={
            "topic_id": topic_id,
            "team_id": t3["id"],
            "buzzer_position": 2,
            "is_correct": True,
        },
        headers=admin_headers,
    )
    assert eval2.status_code == 200
    assert eval2.json()["is_correct"] is True
    assert eval2.json()["points_awarded"] == 10

    # Verify Team 3 gained 10 points
    teams_after_eval2 = client.get("/api/teams").json()
    t3_score_after = next(t["lightning_talks_score"] for t in teams_after_eval2 if t["id"] == t3["id"])
    assert t3_score_after == t3_score_before + 10


def test_reset_users_preserves_questions():
    admin_token = get_token("admin", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Ensure a question exists
    q_res = client.get("/api/tech-detective/questions/admin", headers=admin_headers)
    assert q_res.status_code == 200
    initial_q_count = len(q_res.json())

    # Ensure participants and teams exist
    client.post("/api/teams/randomize", json={"team_size": 2, "include_all": True}, headers=admin_headers)
    teams_before = client.get("/api/teams").json()
    assert len(teams_before) > 0

    # Reset USERS only
    reset_res = client.post(
        "/api/auth/reset-database",
        json={"target": "users"},
        headers=admin_headers,
    )
    assert reset_res.status_code == 200
    assert reset_res.json()["target"] == "users"

    # Verify participants and teams are cleared
    teams_after = client.get("/api/teams").json()
    assert len(teams_after) == 0

    # Verify questions are PRESERVED!
    q_after = client.get("/api/tech-detective/questions/admin", headers=admin_headers)
    assert q_after.status_code == 200
    assert len(q_after.json()) == initial_q_count


def test_reset_questions_preserves_users():
    admin_token = get_token("admin", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Register 2 users and randomize into team
    client.post("/api/auth/register", json={"username": "reset_u1", "display_name": "Reset U1", "password": "pass"})
    client.post("/api/auth/register", json={"username": "reset_u2", "display_name": "Reset U2", "password": "pass"})
    client.post("/api/teams/randomize", json={"team_size": 2, "include_all": True}, headers=admin_headers)

    teams_before = client.get("/api/teams").json()
    assert len(teams_before) > 0

    # Reset QUESTIONS only
    reset_res = client.post(
        "/api/auth/reset-database",
        json={"target": "questions"},
        headers=admin_headers,
    )
    assert reset_res.status_code == 200
    assert reset_res.json()["target"] == "questions"

    # Verify questions and topics are cleared
    q_after = client.get("/api/tech-detective/questions/admin", headers=admin_headers)
    assert len(q_after.json()) == 0

    # Verify teams and users are PRESERVED!
    teams_after = client.get("/api/teams").json()
    assert len(teams_after) == len(teams_before)
    # Team scores were reset to 0
    assert teams_after[0]["total_score"] == 0


