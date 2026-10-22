"""Dynamic Game Catalog & Custom Activities API endpoints for Fun Friday Activities Platform.

Allows Administrators to:
- Dynamically add new games for future events (e.g. Code Relay, Tech Trivia, Bug Bounty, System Design Pitch)
- Configure game format, default timer, icon, rules, and active/inactive status
- Activate any game as the current live activity
- Award custom scores to teams that automatically reflect on the authoritative leaderboard
"""

from datetime import datetime, timezone
from pathlib import Path
import re
import shutil
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.models import (
    Game,
    GameQuestion,
    GameQuestionBuzzer,
    GameState,
    LightningTalkTopic,
    Team,
    TeamGameScore,
    TechDetectiveQuestion,
    User,
)
from app.schemas.schemas import (
    AwardGameScoreRequest,
    BuzzerEntry,
    BuzzerQueueResponse,
    CreateGameQuestionRequest,
    CreateGameRequest,
    EvaluateCustomGameAnswerRequest,
    GameQuestionResponse,
    GameResponse,
    TeamGameScoreDetailResponse,
    TeamGameScoreResponse,
    UpdateGameQuestionRequest,
    UpdateGameRequest,
)

router = APIRouter(prefix="/games", tags=["Dynamic Game Catalog"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


DEFAULT_BUILTIN_GAMES = [
    {
        "id": "G01",
        "game_code": "tech-detective",
        "title": "Tech Detective",
        "subtitle": "Visual Clue Guessing & Buzzer Race",
        "description": "Teams race to press the buzzer and identify technologies, frameworks, and tools from image clues.",
        "game_type": "buzzer",
        "icon": "zap",
        "default_timer_seconds": 60,
        "rules": [
            "Admin sequentially unlocks one question at a time.",
            "Fastest 3 teams to press buzzer qualify to answer.",
            "1st team: +10 pts on correct, -2 on incorrect (passes to 2nd).",
            "2nd team: +9 pts on correct, -2 on incorrect (passes to 3rd).",
            "3rd team: +8 pts on correct, -2 on incorrect (round ends).",
        ],
        "is_active": True,
        "order_index": 1,
    },
    {
        "id": "G02",
        "game_code": "lightning-talks",
        "title": "Lightning Talks",
        "subtitle": "1-Minute Technical Speaking Challenge",
        "description": "Each participant explains an assigned technical concept without uttering the topic name or prohibited taboo words.",
        "game_type": "speech",
        "icon": "mic",
        "default_timer_seconds": 60,
        "rules": [
            "Conducted team-wise based on Tech Detective rankings.",
            "Each speaker has a 60-second countdown timer.",
            "Admin evaluates across 3 criteria: Time Management (10), Words Used (10), and Understandability (10).",
            "Points scored contribute directly to the participant's team total.",
        ],
        "is_active": True,
        "order_index": 2,
    },
]


def ensure_default_games(db: Session) -> None:
    """Auto-seed default built-in games if the games catalog is empty."""
    if db.query(Game).count() == 0:
        for g_data in DEFAULT_BUILTIN_GAMES:
            game = Game(
                id=g_data["id"],
                game_code=g_data["game_code"],
                title=g_data["title"],
                subtitle=g_data["subtitle"],
                description=g_data["description"],
                game_type=g_data["game_type"],
                icon=g_data["icon"],
                default_timer_seconds=g_data["default_timer_seconds"],
                rules=g_data["rules"],
                is_active=g_data["is_active"],
                order_index=g_data["order_index"],
                created_at=utc_now(),
            )
            db.add(game)
        db.commit()


def recalculate_all_team_totals(db: Session) -> None:
    """Recalculate total_score for all teams by summing Tech Detective + Lightning Talks + all Custom Game scores."""
    teams = db.query(Team).all()
    all_custom_scores = db.query(TeamGameScore).all()

    # team_id -> sum of custom scores
    custom_score_map: dict[str, int] = {}
    for cs in all_custom_scores:
        custom_score_map[cs.team_id] = custom_score_map.get(cs.team_id, 0) + cs.score

    for t in teams:
        custom_pts = custom_score_map.get(t.id, 0)
        t.total_score = t.tech_detective_score + t.lightning_talks_score + custom_pts

    db.commit()

    # Recalculate ranks
    sorted_teams = db.query(Team).order_by(Team.total_score.desc(), Team.id.asc()).all()
    for idx, t in enumerate(sorted_teams):
        t.rank = idx + 1
    db.commit()


@router.get("", response_model=list[GameResponse])
def list_games(db: Session = Depends(get_db)):
    """List all games in the platform catalog (built-in and custom added) with their question count."""
    ensure_default_games(db)
    state = db.query(GameState).filter(GameState.id == 1).first()
    active_code = state.current_game if state else "tech-detective"

    games = db.query(Game).order_by(Game.order_index.asc(), Game.created_at.asc()).all()
    td_count = db.query(TechDetectiveQuestion).count()
    lt_count = db.query(LightningTalkTopic).count()
    gq_rows = (
        db.query(GameQuestion.game_id, func.count(GameQuestion.id))
        .group_by(GameQuestion.game_id)
        .all()
    )
    gq_counts = {row[0]: row[1] for row in gq_rows}

    res = []
    for g in games:
        if g.id == "G01":
            q_cnt = td_count
        elif g.id == "G02":
            q_cnt = lt_count
        else:
            q_cnt = gq_counts.get(g.id, 0)

        is_active_game = (g.game_code == active_code or g.id == active_code)

        res.append(
            GameResponse(
                id=g.id,
                game_code=g.game_code,
                title=g.title,
                subtitle=g.subtitle,
                description=g.description,
                game_type=g.game_type,
                icon=g.icon,
                default_timer_seconds=g.default_timer_seconds,
                rules=g.rules,
                is_active=is_active_game,
                order_index=g.order_index,
                question_count=q_cnt,
                created_at=g.created_at,
            )
        )
    return res


@router.post("", response_model=GameResponse, status_code=status.HTTP_201_CREATED)
def create_game(
    payload: CreateGameRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin creates a new dynamic game activity for current or future events."""
    ensure_default_games(db)

    # Generate game code / slug
    if payload.game_code and payload.game_code.strip():
        code = re.sub(r"[^a-zA-Z0-9_-]", "-", payload.game_code.strip().lower())
    else:
        code = re.sub(r"[^a-zA-Z0-9_-]", "-", payload.title.strip().lower())
        code = re.sub(r"-+", "-", code).strip("-")

    existing = db.query(Game).filter(Game.game_code == code).first()
    if existing:
        code = f"{code}-{int(datetime.now().timestamp()) % 10000}"

    # Generate game ID
    count = db.query(Game).count() + 1
    game_id = f"G{count:02d}"
    while db.query(Game).filter(Game.id == game_id).first():
        count += 1
        game_id = f"G{count:02d}"

    max_order = db.query(Game).count()

    new_game = Game(
        id=game_id,
        game_code=code,
        title=payload.title.strip(),
        subtitle=payload.subtitle.strip() if payload.subtitle else None,
        description=payload.description.strip() if payload.description else None,
        game_type=payload.game_type,
        icon=payload.icon,
        default_timer_seconds=payload.default_timer_seconds,
        rules=payload.rules,
        is_active=payload.is_active,
        order_index=max_order + 1,
        created_at=utc_now(),
    )
    db.add(new_game)
    db.commit()
    db.refresh(new_game)
    return new_game


@router.put("/{game_id}", response_model=GameResponse)
def update_game(
    game_id: str,
    payload: UpdateGameRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin updates game rules, title, timer duration, or active status."""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    if payload.title is not None:
        game.title = payload.title.strip()
    if payload.subtitle is not None:
        game.subtitle = payload.subtitle.strip()
    if payload.description is not None:
        game.description = payload.description.strip()
    if payload.game_type is not None:
        game.game_type = payload.game_type
    if payload.icon is not None:
        game.icon = payload.icon
    if payload.default_timer_seconds is not None:
        game.default_timer_seconds = payload.default_timer_seconds
    if payload.rules is not None:
        game.rules = payload.rules
    if payload.is_active is not None:
        game.is_active = payload.is_active

    db.commit()
    db.refresh(game)
    return game


@router.delete("/{game_id}")
def delete_game(
    game_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin deletes a custom game."""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    # Clean up any custom scores for this game
    db.query(TeamGameScore).filter(TeamGameScore.game_code == game.game_code).delete()
    db.delete(game)
    db.commit()

    recalculate_all_team_totals(db)
    return {"message": f"Game '{game.title}' deleted successfully"}


@router.post("/{game_id}/activate")
def activate_game(
    game_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin sets this game as the active live activity."""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    state = db.query(GameState).filter(GameState.id == 1).first()
    if not state:
        state = GameState(id=1)
        db.add(state)

    state.current_game = game.game_code
    state.timer_game = game.game_code
    state.timer_total_duration = game.default_timer_seconds
    state.timer_seconds_remaining = float(game.default_timer_seconds)
    state.timer_is_running = False
    state.timer_end_time = None
    state.updated_at = utc_now()

    # Mark this game active and all other games inactive
    for g in db.query(Game).all():
        g.is_active = (g.id == game_id)

    db.commit()
    return {
        "message": f"Game '{game.title}' is now the active activity!",
        "game_code": game.game_code,
        "default_timer_seconds": game.default_timer_seconds,
    }


@router.get("/scores", response_model=list[TeamGameScoreDetailResponse])
def get_game_scores(
    game_code: str | None = None,
    db: Session = Depends(get_db),
):
    """Retrieve all team scores for custom games or a specific game."""
    if game_code == "tech-detective":
        teams = db.query(Team).all()
        return [
            TeamGameScoreDetailResponse(
                id=i + 1,
                team_id=t.id,
                game_code="tech-detective",
                score=t.tech_detective_score,
                notes=None,
                updated_at=None,
            )
            for i, t in enumerate(teams)
        ]
    elif game_code == "lightning-talks":
        teams = db.query(Team).all()
        return [
            TeamGameScoreDetailResponse(
                id=i + 1,
                team_id=t.id,
                game_code="lightning-talks",
                score=t.lightning_talks_score,
                notes=None,
                updated_at=None,
            )
            for i, t in enumerate(teams)
        ]

    query = db.query(TeamGameScore)
    if game_code:
        query = query.filter(TeamGameScore.game_code == game_code)
    scores = query.all()
    return [
        TeamGameScoreDetailResponse(
            id=s.id,
            team_id=s.team_id,
            game_code=s.game_code,
            score=s.score,
            notes=s.notes,
            updated_at=s.updated_at.isoformat() if s.updated_at else None,
        )
        for s in scores
    ]


@router.post("/scores", response_model=TeamGameScoreResponse)
def award_game_score(
    payload: AwardGameScoreRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin awards or edits a team's score for any game activity.
    
    Supports both incremental delta adjustments (e.g. +10, +5, -2) and absolute scores.
    Automatically recalculates total team score and updates the authoritative leaderboard!
    """
    team = db.query(Team).filter(Team.id == payload.team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    if payload.game_code == "tech-detective":
        if payload.is_incremental:
            team.tech_detective_score = max(0, team.tech_detective_score + payload.score)
        else:
            team.tech_detective_score = max(0, payload.score)
        final_score = team.tech_detective_score
    elif payload.game_code == "lightning-talks":
        if payload.is_incremental:
            team.lightning_talks_score = max(0, team.lightning_talks_score + payload.score)
        else:
            team.lightning_talks_score = max(0, payload.score)
        final_score = team.lightning_talks_score
    else:
        existing_score = db.query(TeamGameScore).filter(
            TeamGameScore.team_id == team.id,
            TeamGameScore.game_code == payload.game_code,
        ).first()

        if existing_score:
            if payload.is_incremental:
                existing_score.score = max(0, existing_score.score + payload.score)
            else:
                existing_score.score = max(0, payload.score)
            existing_score.notes = payload.notes
            existing_score.updated_at = utc_now()
            final_score = existing_score.score
        else:
            new_score_val = max(0, payload.score)
            new_score = TeamGameScore(
                team_id=team.id,
                game_code=payload.game_code,
                score=new_score_val,
                notes=payload.notes,
                updated_at=utc_now(),
            )
            db.add(new_score)
            final_score = new_score_val

    db.commit()
    recalculate_all_team_totals(db)
    db.refresh(team)

    return TeamGameScoreResponse(
        team_id=team.id,
        team_name=team.team_name,
        game_code=payload.game_code,
        score=final_score,
        total_team_score=team.total_score,
    )


@router.get("/scores/breakdown")
def get_all_game_scores_breakdown(db: Session = Depends(get_db)):
    """Return all scores per team for all custom games."""
    teams = db.query(Team).order_by(Team.total_score.desc()).all()
    custom_scores = db.query(TeamGameScore).all()

    # team_id -> {game_code: score}
    score_map: dict[str, dict[str, int]] = {t.id: {} for t in teams}
    for cs in custom_scores:
        if cs.team_id in score_map:
            score_map[cs.team_id][cs.game_code] = cs.score

    return [
        {
            "team_id": t.id,
            "team_name": t.team_name,
            "tech_detective_score": t.tech_detective_score,
            "lightning_talks_score": t.lightning_talks_score,
            "custom_game_scores": score_map.get(t.id, {}),
            "total_score": t.total_score,
            "rank": t.rank,
        }
        for t in teams
    ]


# ── Dynamic Question & Challenge Bank Endpoints ──────────────────────────────

@router.get("/{game_id_or_code}/questions", response_model=list[GameQuestionResponse])
def get_game_questions(game_id_or_code: str, db: Session = Depends(get_db)):
    """Retrieve all questions / challenges for a specific game."""
    game = (
        db.query(Game)
        .filter((Game.id == game_id_or_code) | (Game.game_code == game_id_or_code))
        .first()
    )
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    return (
        db.query(GameQuestion)
        .filter(GameQuestion.game_id == game.id)
        .order_by(GameQuestion.question_number.asc())
        .all()
    )


@router.post("/upload-media")
async def upload_media_file(
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
):
    """Admin uploads a media file (image, audio, or video) to be served statically."""
    ext = (file.filename.split(".")[-1] if "." in file.filename else "").lower()
    media_type = "none"
    if ext in ["jpg", "jpeg", "png", "webp", "gif", "svg"]:
        media_type = "image"
    elif ext in ["mp3", "wav", "ogg", "m4a", "aac", "flac"]:
        media_type = "audio"
    elif ext in ["mp4", "webm", "mov", "mkv", "avi", "ogv"]:
        media_type = "video"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported media file type. Supported: JPG, PNG, GIF, WEBP, SVG, MP3, WAV, OGG, M4A, AAC, MP4, WEBM, MOV.",
        )

    media_dir = Path(__file__).resolve().parent.parent.parent / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    clean_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", file.filename or "media")
    unique_filename = f"{uuid.uuid4().hex[:10]}_{clean_name}"
    dest_path = media_dir / unique_filename

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "url": f"/media/{unique_filename}",
        "media_type": media_type,
        "filename": file.filename,
    }


@router.post("/{id_or_code}/questions", response_model=GameQuestionResponse)
def create_game_question(
    id_or_code: str,
    payload: CreateGameQuestionRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin adds a new question or challenge to a specific game."""
    game = (
        db.query(Game)
        .filter((Game.id == id_or_code) | (Game.game_code == id_or_code))
        .first()
    )
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    count = db.query(GameQuestion).filter(GameQuestion.game_id == game.id).count()
    q_num = payload.question_number if payload.question_number is not None else (count + 1)
    q_id = f"GQ-{game.game_code}-{q_num}-{int(datetime.now().timestamp()) % 10000}"

    # Determine media URL and media type
    m_url = (payload.media_url or payload.image_url or "").strip() or None
    m_type = payload.media_type or "none"
    if m_type == "none" and m_url:
        lower_url = m_url.lower()
        if any(lower_url.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]) or lower_url.startswith("data:image"):
            m_type = "image"
        elif any(lower_url.endswith(ext) for ext in [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]) or lower_url.startswith("data:audio"):
            m_type = "audio"
        elif any(lower_url.endswith(ext) for ext in [".mp4", ".webm", ".mov", ".mkv"]) or lower_url.startswith("data:video"):
            m_type = "video"
        elif "youtube.com" in lower_url or "youtu.be" in lower_url:
            m_type = "youtube"
        else:
            m_type = "image"

    new_q = GameQuestion(
        id=q_id,
        game_id=game.id,
        game_code=game.game_code,
        question_number=q_num,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        question_type=payload.question_type or "quiz",
        options=payload.options or [],
        correct_answer=payload.correct_answer.strip() if payload.correct_answer else None,
        accepted_answers=payload.accepted_answers or [],
        image_url=m_url,
        media_type=m_type,
        media_url=m_url,
        points=payload.points,
        deduction=payload.deduction,
        time_limit_seconds=payload.time_limit_seconds or game.default_timer_seconds,
        is_unlocked=False,
        created_at=utc_now(),
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    return new_q


@router.put("/questions/{question_id}", response_model=GameQuestionResponse)
def update_game_question(
    question_id: str,
    payload: UpdateGameQuestionRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin updates an existing question or challenge."""
    q = db.query(GameQuestion).filter(GameQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    if payload.title is not None:
        q.title = payload.title.strip()
    if payload.question_number is not None:
        q.question_number = payload.question_number
    if payload.description is not None:
        q.description = payload.description.strip() if payload.description else None
    if payload.question_type is not None:
        q.question_type = payload.question_type
    if payload.options is not None:
        q.options = payload.options
    if payload.correct_answer is not None:
        q.correct_answer = payload.correct_answer.strip() if payload.correct_answer else None
    if payload.accepted_answers is not None:
        q.accepted_answers = payload.accepted_answers
    if payload.media_url is not None or payload.image_url is not None:
        m_url = (payload.media_url if payload.media_url is not None else payload.image_url)
        q.media_url = m_url.strip() if m_url else None
        q.image_url = q.media_url
        if payload.media_type is None and q.media_url:
            lower_url = q.media_url.lower()
            if any(lower_url.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]) or lower_url.startswith("data:image"):
                q.media_type = "image"
            elif any(lower_url.endswith(ext) for ext in [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]) or lower_url.startswith("data:audio"):
                q.media_type = "audio"
            elif any(lower_url.endswith(ext) for ext in [".mp4", ".webm", ".mov", ".mkv"]) or lower_url.startswith("data:video"):
                q.media_type = "video"
            elif "youtube.com" in lower_url or "youtu.be" in lower_url:
                q.media_type = "youtube"
    if payload.media_type is not None:
        q.media_type = payload.media_type
    if payload.points is not None:
        q.points = payload.points
    if payload.deduction is not None:
        q.deduction = payload.deduction
    if payload.time_limit_seconds is not None:
        q.time_limit_seconds = payload.time_limit_seconds

    db.commit()
    db.refresh(q)
    return q


@router.delete("/questions/{question_id}")
def delete_game_question(
    question_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin deletes a question from a game."""
    q = db.query(GameQuestion).filter(GameQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    db.delete(q)
    db.commit()
    return {"message": "Question deleted successfully", "question_id": question_id}


@router.post("/questions/{question_id}/unlock", response_model=GameQuestionResponse)
def unlock_game_question(
    question_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin unlocks a question, locking other questions for this game and making it live with a fresh buzzer queue."""
    q = db.query(GameQuestion).filter(GameQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    # Lock all other questions for this game
    db.query(GameQuestion).filter(GameQuestion.game_id == q.game_id).update({
        GameQuestion.is_unlocked: False,
        GameQuestion.is_buzzer_open: False,
    })
    q.is_unlocked = True
    q.unlocked_at = utc_now()
    q.is_completed = False
    q.is_buzzer_open = True
    q.current_answering_team_id = None
    q.current_answering_position = None

    # Clear previous buzzers for this question so fresh round begins
    db.query(GameQuestionBuzzer).filter(GameQuestionBuzzer.question_id == question_id).delete()

    db.commit()
    db.refresh(q)
    return q


@router.get("/{game_id_or_code}/active-question", response_model=GameQuestionResponse | None)
def get_active_game_question(game_id_or_code: str, db: Session = Depends(get_db)):
    """Get the currently unlocked question for this game."""
    game = (
        db.query(Game)
        .filter((Game.id == game_id_or_code) | (Game.game_code == game_id_or_code))
        .first()
    )
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    return (
        db.query(GameQuestion)
        .filter(GameQuestion.game_id == game.id, GameQuestion.is_unlocked == True)
        .first()
    )


# ── Custom Game Buzzer System ────────────────────────────────────────────────

@router.post("/{id_or_code}/buzz")
def press_game_buzzer(
    id_or_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Participant buzzer press for the active question in this game.
    Records up to 3 teams in chronological order. Once 3 teams buzz, automatically locks.
    """
    if not current_user.team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a team to press the buzzer",
        )

    team = db.query(Team).filter(Team.id == current_user.team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team not found")

    game = (
        db.query(Game)
        .filter((Game.id == id_or_code) | (Game.game_code == id_or_code))
        .first()
    )
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    active_q = (
        db.query(GameQuestion)
        .filter(GameQuestion.game_id == game.id, GameQuestion.is_unlocked == True)
        .first()
    )
    if not active_q or not active_q.is_buzzer_open or active_q.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Buzzer is currently locked or no question is active",
        )

    # Check if team already buzzed
    existing = (
        db.query(GameQuestionBuzzer)
        .filter(
            GameQuestionBuzzer.question_id == active_q.id,
            GameQuestionBuzzer.team_id == team.id,
        )
        .first()
    )
    if existing:
        return {
            "message": f"Team {team.team_name} already pressed the buzzer",
            "position": existing.position,
            "team_id": team.id,
        }

    current_count = (
        db.query(GameQuestionBuzzer)
        .filter(GameQuestionBuzzer.question_id == active_q.id)
        .count()
    )
    if current_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Buzzer is locked! The first 3 teams have already been recorded.",
        )

    new_position = current_count + 1
    entry = GameQuestionBuzzer(
        game_id=game.id,
        question_id=active_q.id,
        team_id=team.id,
        team_name=team.team_name,
        position=new_position,
        pressed_at=utc_now(),
    )
    db.add(entry)

    if new_position == 1:
        active_q.current_answering_team_id = team.id
        active_q.current_answering_position = 1

    if new_position == 3:
        active_q.is_buzzer_open = False

    db.commit()

    return {
        "message": f"Buzzer confirmed for {team.team_name}!",
        "position": new_position,
        "team_id": team.id,
    }


@router.get("/{id_or_code}/buzzer-queue/{question_id}", response_model=BuzzerQueueResponse)
def get_game_buzzer_queue(
    id_or_code: str,
    question_id: str,
    db: Session = Depends(get_db),
):
    """Get the current top-3 buzzer queue for a custom game question."""
    q = db.query(GameQuestion).filter(GameQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    buzzers = (
        db.query(GameQuestionBuzzer)
        .filter(GameQuestionBuzzer.question_id == question_id)
        .order_by(GameQuestionBuzzer.position.asc())
        .limit(3)
        .all()
    )

    entries = [
        BuzzerEntry(
            id=b.id,
            team_id=b.team_id,
            team_name=b.team_name,
            position=b.position,
            pressed_at=b.pressed_at,
        )
        for b in buzzers
    ]

    return BuzzerQueueResponse(
        question_id=question_id,
        is_buzzer_open=bool(q.is_buzzer_open and q.is_unlocked and not q.is_completed),
        buzzers=entries,
        current_answering_team_id=q.current_answering_team_id,
        current_answering_position=q.current_answering_position,
    )


@router.post("/{id_or_code}/evaluate")
def evaluate_game_answer(
    id_or_code: str,
    payload: EvaluateCustomGameAnswerRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin evaluates a team's answer in a custom game question.
    1st team: Correct = +points,     Incorrect = -deduction (passes to 2nd team)
    2nd team: Correct = +(points-1), Incorrect = -deduction (passes to 3rd team)
    3rd team: Correct = +(points-2), Incorrect = -deduction (round ends)
    """
    game = (
        db.query(Game)
        .filter((Game.id == id_or_code) | (Game.game_code == id_or_code))
        .first()
    )
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")

    q = db.query(GameQuestion).filter(GameQuestion.id == payload.question_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    team = db.query(Team).filter(Team.id == payload.team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    pos = payload.buzzer_position
    q_points = q.points if q.points > 0 else 10
    q_deduction = q.deduction if q.deduction > 0 else 2

    # Find or create TeamGameScore
    team_game_score = (
        db.query(TeamGameScore)
        .filter(TeamGameScore.team_id == team.id, TeamGameScore.game_code == game.game_code)
        .first()
    )
    if not team_game_score:
        team_game_score = TeamGameScore(
            team_id=team.id,
            game_code=game.game_code,
            score=0,
            notes="",
            updated_at=utc_now(),
        )
        db.add(team_game_score)

    if payload.is_correct:
        if pos == 1:
            points_awarded = q_points
        elif pos == 2:
            points_awarded = max(1, q_points - 1)
        else:
            points_awarded = max(1, q_points - 2)

        team_game_score.score += points_awarded
        team_game_score.updated_at = utc_now()
        team.total_score += points_awarded

        q.is_completed = True
        q.is_buzzer_open = False
        q.current_answering_team_id = None
        q.current_answering_position = None

        db.commit()
        recalculate_all_team_totals(db)
        return {
            "message": f"Correct! Awarded {points_awarded} pts to {team.team_name}.",
            "is_correct": True,
            "points_awarded": points_awarded,
            "next_answering_team_id": None,
            "is_completed": True,
        }
    else:
        points_awarded = -abs(q_deduction)
        team_game_score.score = max(0, team_game_score.score + points_awarded)
        team_game_score.updated_at = utc_now()
        team.total_score = max(0, team.total_score + points_awarded)

        # Check for next team in queue
        next_team_id = None
        next_position = None
        if pos < 3:
            next_pos = pos + 1
            next_b = (
                db.query(GameQuestionBuzzer)
                .filter(
                    GameQuestionBuzzer.question_id == q.id,
                    GameQuestionBuzzer.position == next_pos,
                )
                .first()
            )
            if next_b:
                next_team_id = next_b.team_id
                next_position = next_pos
                q.current_answering_team_id = next_team_id
                q.current_answering_position = next_position
            else:
                q.is_buzzer_open = False
                q.current_answering_team_id = None
                q.current_answering_position = None
        else:
            q.is_buzzer_open = False
            q.current_answering_team_id = None
            q.current_answering_position = None

        db.commit()
        recalculate_all_team_totals(db)
        return {
            "message": f"Incorrect. Deducted {abs(points_awarded)} pts from {team.team_name}."
            + (f" Turn passes to position #{next_position}." if next_team_id else " All buzzed teams answered."),
            "is_correct": False,
            "points_awarded": points_awarded,
            "next_answering_team_id": next_team_id,
            "next_answering_position": next_position,
        }


@router.post("/{id_or_code}/reset-buzzer/{question_id}")
def reset_game_buzzer(
    id_or_code: str,
    question_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin resets the buzzer queue for a question in a custom game."""
    q = db.query(GameQuestion).filter(GameQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    db.query(GameQuestionBuzzer).filter(GameQuestionBuzzer.question_id == question_id).delete()
    q.is_buzzer_open = True
    q.is_completed = False
    q.current_answering_team_id = None
    q.current_answering_position = None
    db.commit()
    db.refresh(q)
    return {"message": "Buzzer queue reset and reopened for all teams", "question_id": question_id}

