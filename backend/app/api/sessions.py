"""Game Session Management API endpoints."""

import random
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.models import GameSession, Question, SessionQuestion, SessionTeam, Team, User
from app.schemas.schemas import SessionCreate, SessionResponse, SessionUpdate

router = APIRouter(prefix="/sessions", tags=["Sessions"])


def generate_session_code(game_type: str, db: Session) -> str:
    """Generate readable unique session code like TECH-4821 or EXPL-9142."""
    prefix = "TECH" if game_type == "guess-tech" else "EXPL"
    for _ in range(50):
        code = f"{prefix}-{random.randint(1000, 9999)}"
        if not db.query(GameSession).filter(GameSession.session_code == code).first():
            return code
    return f"{prefix}-{random.randint(10000, 99999)}"


def generate_session_id(db: Session) -> str:
    """Generate next S01 style identifier."""
    sessions = db.query(GameSession.id).all()
    nums = []
    for (s_id,) in sessions:
        digits = "".join(ch for ch in s_id if ch.isdigit())
        if digits:
            nums.append(int(digits))
    next_num = max(nums, default=0) + 1
    return f"S{next_num:02d}"


def serialize_session(session: GameSession) -> SessionResponse:
    """Convert GameSession model into SessionResponse with question & team lists."""
    q_ids = [sq.question_id for sq in session.session_questions]
    t_ids = [st.team_id for st in session.session_teams]

    return SessionResponse(
        id=session.id,
        session_code=session.session_code,
        session_name=session.session_name,
        description=session.description,
        game_type=session.game_type,
        status=session.status,
        scheduled_at=session.scheduled_at,
        game_rules=session.game_rules,
        created_at=session.created_at,
        updated_at=session.updated_at,
        question_ids=q_ids,
        team_ids=t_ids,
        total_questions=len(q_ids),
    )


@router.get("", response_model=list[SessionResponse])
def list_sessions(
    status_filter: str | None = Query(None, alias="status"),
    game_type: str | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """List all game sessions with optional filtering (Admin only)."""
    query = db.query(GameSession)

    if status_filter:
        query = query.filter(GameSession.status == status_filter)
    if game_type:
        query = query.filter(GameSession.game_type == game_type)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            GameSession.session_name.ilike(search_term)
            | GameSession.session_code.ilike(search_term)
        )

    sessions = query.order_by(GameSession.created_at.desc()).offset(skip).limit(limit).all()
    return [serialize_session(s) for s in sessions]


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Retrieve details of a specific game session (Admin only)."""
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found",
        )
    return serialize_session(session)


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    data: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new session, validating questions and teams using a transaction (Admin only)."""
    s_id = data.id or generate_session_id(db)
    s_code = generate_session_code(data.game_type, db)

    # Validate Ready status requirements: at least 1 question, at least 2 active teams
    if data.status == "ready":
        if not data.question_ids or len(data.question_ids) < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A Ready session requires at least one question.",
            )
        if not data.team_ids or len(data.team_ids) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A Ready session requires at least two participating teams.",
            )

    # Validate questions exist and match game type
    valid_questions = []
    if data.question_ids:
        for q_id in data.question_ids:
            q = db.query(Question).filter(Question.id == q_id).first()
            if not q:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Question '{q_id}' does not exist.",
                )
            if q.game_type != data.game_type:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Question '{q_id}' belongs to '{q.game_type}', not '{data.game_type}'.",
                )
            if data.status == "ready" and q.status != "ready":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Question '{q_id}' is not in Ready status.",
                )
            valid_questions.append(q)

    # Validate teams exist and are active
    valid_teams = []
    if data.team_ids:
        for t_id in data.team_ids:
            t = db.query(Team).filter(Team.id == t_id).first()
            if not t:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Team '{t_id}' does not exist.",
                )
            if t.status == "inactive":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Team '{t.team_name}' is inactive and cannot participate.",
                )
            valid_teams.append(t)

    # Create session within transaction
    new_session = GameSession(
        id=s_id,
        session_code=s_code,
        session_name=data.session_name.strip(),
        description=data.description.strip() if data.description else None,
        game_type=data.game_type,
        status=data.status,
        scheduled_at=data.scheduled_at,
        game_rules=data.game_rules or {
            "maxEligibleTeams": 3,
            "answerSubmission": "eligible_only",
            "correctAnswerReveal": "manual",
            "questionProgression": "manual",
            "scoreboardVisibility": "hidden",
            "questionTimerSeconds": 60,
            "enableBuzzer": True,
        },
        created_by=current_user.username,
    )

    # Attach ordered questions without duplicating question rows
    for idx, q_id in enumerate(data.question_ids):
        new_session.session_questions.append(
            SessionQuestion(question_id=q_id, question_order=idx + 1)
        )

    # Attach participating teams
    for t_id in data.team_ids:
        new_session.session_teams.append(
            SessionTeam(team_id=t_id, participation_status="registered")
        )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return serialize_session(new_session)


@router.put("/{session_id}", response_model=SessionResponse)
def update_session(
    session_id: str,
    data: SessionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Update session details, question order, or participating teams (Admin only)."""
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found",
        )

    if data.session_name is not None:
        session.session_name = data.session_name.strip()
    if data.description is not None:
        session.description = data.description.strip() or None
    if data.game_type is not None:
        session.game_type = data.game_type
    if data.status is not None:
        session.status = data.status
    if data.scheduled_at is not None:
        session.scheduled_at = data.scheduled_at
    if data.game_rules is not None:
        session.game_rules = data.game_rules

    # Update questions if provided
    if data.question_ids is not None:
        db.query(SessionQuestion).filter(SessionQuestion.session_id == session_id).delete()
        for idx, q_id in enumerate(data.question_ids):
            session.session_questions.append(
                SessionQuestion(question_id=q_id, question_order=idx + 1)
            )

    # Update teams if provided
    if data.team_ids is not None:
        db.query(SessionTeam).filter(SessionTeam.session_id == session_id).delete()
        for t_id in data.team_ids:
            session.session_teams.append(
                SessionTeam(team_id=t_id, participation_status="registered")
            )

    db.commit()
    db.refresh(session)
    return serialize_session(session)


@router.post("/{session_id}/ready", response_model=SessionResponse)
def mark_session_ready(
    session_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Transition session from Draft to Ready."""
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found",
        )

    if len(session.session_questions) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot mark session Ready without at least one question.",
        )
    if len(session.session_teams) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot mark session Ready without at least two participating teams.",
        )

    session.status = "ready"
    db.commit()
    db.refresh(session)
    return serialize_session(session)


@router.post("/{session_id}/start", response_model=SessionResponse)
def start_session(
    session_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Start game session (Ready -> Live transition)."""
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found",
        )

    if session.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start session in '{session.status}' status. Must be 'ready'.",
        )

    session.status = "live"
    db.commit()
    db.refresh(session)
    return serialize_session(session)


@router.post("/{session_id}/cancel", response_model=SessionResponse)
def cancel_session(
    session_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Cancel game session."""
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found",
        )

    session.status = "cancelled"
    db.commit()
    db.refresh(session)
    return serialize_session(session)
