"""Authentication and participant session management for Fun Friday Activities Platform."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_user_optional, require_admin
from app.core.security import create_access_token, hash_password, verify_password
from app.models.models import (
    GameQuestion,
    GameQuestionBuzzer,
    GameState,
    LightningTalkBuzzer,
    LightningTalkScore,
    LightningTalkTopic,
    Team,
    TeamGameScore,
    TechDetectiveAnswer,
    TechDetectiveBuzzer,
    TechDetectiveQuestion,
    User,
)
from app.schemas.schemas import (
    LoginRequest,
    RegisterRequest,
    ResetDatabaseRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Participants"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/register", response_model=TokenResponse)
def register_participant(req: RegisterRequest, db: Session = Depends(get_db)):
    """Allow a real participant to register for the activity.
    
    Upon registration, participant is automatically logged in and appears on the
    Admin Dashboard logged-in users list.
    """
    username = req.username.strip().lower()
    existing = db.query(User).filter(User.username.ilike(username)).first()
    if existing:
        if existing.role == "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot register using an administrator username.",
            )
        # Seamlessly update and log in the participant without throwing an 'already taken' roadblock
        existing.password_hash = hash_password(req.password)
        existing.is_logged_in = True
        existing.last_login_at = utc_now()
        if req.display_name.strip():
            existing.display_name = req.display_name.strip()
        db.commit()
        db.refresh(existing)

        team_name = existing.team.team_name if existing.team else None
        token = create_access_token({
            "sub": str(existing.id),
            "username": existing.username,
            "role": existing.role,
            "team_id": existing.team_id,
        })
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user_id=existing.id,
            username=existing.username,
            display_name=existing.display_name,
            role=existing.role,
            team_id=existing.team_id,
            team_name=team_name,
        )

    user = User(
        username=username,
        display_name=req.display_name.strip(),
        email=req.email.strip() if req.email else f"{username}@axtrlabs.internal",
        password_hash=hash_password(req.password),
        role="participant",
        is_active=True,
        is_logged_in=True,
        last_login_at=utc_now(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "team_id": None,
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        display_name=user.display_name,
        role=user.role,
        team_id=None,
        team_name=None,
    )


@router.post("/login", response_model=TokenResponse)
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate either an Admin or a Participant using username and password.
    
    Upon successful login, participant is marked as is_logged_in=True and details
    appear in the Admin Dashboard Logged-in Users List.
    """
    username = creds.username.strip()
    user = db.query(User).filter(User.username.ilike(username)).first()

    if not user or not verify_password(creds.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated",
        )

    # Mark as logged in
    user.is_logged_in = True
    user.last_login_at = utc_now()
    db.commit()
    db.refresh(user)

    team_name = user.team.team_name if user.team else None

    token = create_access_token({
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "team_id": user.team_id,
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        display_name=user.display_name,
        role=user.role,
        team_id=user.team_id,
        team_name=team_name,
    )


@router.post("/logout")
def logout(
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Log out user and remove them from active logged-in users list."""
    if current_user:
        current_user.is_logged_in = False
        db.commit()
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get authenticated user profile."""
    team_name = current_user.team.team_name if current_user.team else None
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        is_logged_in=current_user.is_logged_in,
        last_login_at=current_user.last_login_at,
        team_id=current_user.team_id,
        team_name=team_name,
    )


@router.get("/logged-in-users", response_model=list[UserResponse])
def get_logged_in_users(
    all_users: bool = False,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint: View logged-in participants. Pass ?all_users=true to include offline participants."""
    query = db.query(User).filter(User.role == "participant")
    if not all_users:
        query = query.filter(User.is_logged_in.is_(True))
    participants = (
        query.order_by(User.is_logged_in.desc(), User.last_login_at.desc(), User.id.asc()).all()
    )

    result = []
    for p in participants:
        t_name = p.team.team_name if p.team else None
        result.append(
            UserResponse(
                id=p.id,
                username=p.username,
                display_name=p.display_name,
                email=p.email,
                role=p.role,
                is_active=p.is_active,
                is_logged_in=p.is_logged_in,
                last_login_at=p.last_login_at,
                team_id=p.team_id,
                team_name=t_name,
            )
        )
    return result


@router.get("/all-participants", response_model=list[UserResponse])
def get_all_participants(
    current_user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    """Admin endpoint: View all registered participants (online & offline)."""
    participants = db.query(User).filter(User.role == "participant").order_by(User.id.asc()).all()
    result = []
    for p in participants:
        t_name = p.team.team_name if p.team else None
        result.append(
            UserResponse(
                id=p.id,
                username=p.username,
                display_name=p.display_name,
                email=p.email,
                role=p.role,
                is_active=p.is_active,
                is_logged_in=p.is_logged_in,
                last_login_at=p.last_login_at,
                team_id=p.team_id,
                team_name=t_name,
            )
        )
    return result


@router.post("/reset-users")
def reset_users_endpoint(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint: Clear all participants, formed teams, and user scores, keeping questions & topics intact."""
    # 1. Clear participant buzzers & answers
    db.query(TechDetectiveBuzzer).delete()
    db.query(TechDetectiveAnswer).delete()
    db.query(LightningTalkBuzzer).delete()
    db.query(LightningTalkScore).delete()
    db.query(GameQuestionBuzzer).delete()
    db.query(TeamGameScore).delete()

    # 2. Reset active assignment/unlock states on topics and questions
    db.query(TechDetectiveQuestion).update({TechDetectiveQuestion.is_unlocked: False})
    db.query(LightningTalkTopic).update({
        LightningTalkTopic.assigned_user_id: None,
        LightningTalkTopic.assigned_team_id: None,
        LightningTalkTopic.is_unlocked: False,
        LightningTalkTopic.is_buzzer_open: False,
        LightningTalkTopic.current_answering_team_id: None,
        LightningTalkTopic.current_answering_position: None,
        LightningTalkTopic.is_completed: False,
    })
    db.query(GameQuestion).update({
        GameQuestion.is_unlocked: False,
        GameQuestion.is_completed: False,
        GameQuestion.current_answering_team_id: None,
        GameQuestion.current_answering_position: None,
    })

    # 3. Delete participants and teams
    db.query(User).filter(User.role == "participant").delete()
    db.query(Team).delete()

    # 4. Reset game state to lobby
    state = db.query(GameState).filter(GameState.id == 1).first()
    if state:
        state.current_game = "lobby"
        state.is_buzzer_open = False
        state.active_question_id = None
        state.active_topic_id = None
        state.current_answering_team_id = None
        state.current_answering_position = None

    db.commit()
    return {
        "success": True,
        "target": "users",
        "message": "Participants and teams have been reset successfully! All questions and topics were preserved.",
    }


@router.post("/reset-questions")
def reset_questions_endpoint(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint: Clear all questions, clues, and topics, keeping participants & teams intact."""
    # 1. Clear buzzers & answers
    db.query(TechDetectiveBuzzer).delete()
    db.query(TechDetectiveAnswer).delete()
    db.query(LightningTalkBuzzer).delete()
    db.query(LightningTalkScore).delete()
    db.query(GameQuestionBuzzer).delete()
    db.query(TeamGameScore).delete()

    # 2. Delete all questions and topics
    db.query(TechDetectiveQuestion).delete()
    db.query(LightningTalkTopic).delete()
    db.query(GameQuestion).delete()

    # 3. Reset team scores back to 0 so teams are ready for new questions
    teams = db.query(Team).all()
    for t in teams:
        t.tech_detective_score = 0
        t.lightning_talks_score = 0
        t.total_score = 0

    # 4. Reset game state
    state = db.query(GameState).filter(GameState.id == 1).first()
    if state:
        state.is_buzzer_open = False
        state.active_question_id = None
        state.active_topic_id = None
        state.current_answering_team_id = None
        state.current_answering_position = None

    db.commit()
    return {
        "success": True,
        "target": "questions",
        "message": "All questions and topics have been reset successfully! Teams and participants were preserved.",
    }


@router.post("/reset-database")
def reset_database_endpoint(
    payload: ResetDatabaseRequest | None = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint: Clear participants, teams, questions, and topics.
    
    Supports granular target via payload:
    - 'users': Resets participants and teams only.
    - 'questions': Resets questions and topics only.
    - 'all': Resets both users and questions (full clean slate).
    """
    target = payload.target if payload else "all"
    if target == "users":
        return reset_users_endpoint(current_user, db)
    elif target == "questions":
        return reset_questions_endpoint(current_user, db)

    # Full Reset ("all")
    db.query(TechDetectiveBuzzer).delete()
    db.query(TechDetectiveAnswer).delete()
    db.query(TechDetectiveQuestion).delete()
    db.query(LightningTalkBuzzer).delete()
    db.query(LightningTalkScore).delete()
    db.query(LightningTalkTopic).delete()
    db.query(GameQuestionBuzzer).delete()
    db.query(GameQuestion).delete()
    db.query(TeamGameScore).delete()
    db.query(User).filter(User.role == "participant").delete()
    db.query(Team).delete()

    state = db.query(GameState).filter(GameState.id == 1).first()
    if state:
        state.current_game = "lobby"
        state.is_buzzer_open = False
        state.active_question_id = None
        state.active_topic_id = None
        state.current_answering_team_id = None
        state.current_answering_position = None
    else:
        state = GameState(id=1, current_game="lobby", is_buzzer_open=False)
        db.add(state)

    db.commit()
    return {
        "success": True,
        "target": "all",
        "message": "Database reset successfully! All participants, teams, and questions cleared.",
    }

