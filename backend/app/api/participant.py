"""Participant API endpoints for joining sessions and retrieving authorized question clues.

Strictly protects confidential answers and enforces team authorization on every request.
"""

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, decode_access_token
from app.models.models import GameSession, Question, SessionQuestion, SessionTeam, Team
from app.schemas.schemas import ParticipantJoinRequest, ParticipantJoinResponse, ParticipantQuestionResponse

router = APIRouter(prefix="/participant", tags=["Participant"])


def get_participant_team(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> dict:
    """Dependency: Extract and validate participant token claims."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Participant token required",
        )

    token = authorization.split(" ")[1]
    claims = decode_access_token(token)
    if not claims or claims.get("role") != "participant":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired participant token",
        )

    return claims


@router.post("/join", response_model=ParticipantJoinResponse)
def join_session(data: ParticipantJoinRequest, db: Session = Depends(get_db)):
    """Join an active or ready game session using session code and team code."""
    s_code = data.session_code.strip().upper()
    t_code = data.team_code.strip().upper()

    # 1. Validate session
    session = db.query(GameSession).filter(GameSession.session_code == s_code).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with code '{s_code}' was not found.",
        )

    if session.status not in ("ready", "live"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot join session in '{session.status}' status. Must be Ready or Live.",
        )

    # 2. Validate team
    team = db.query(Team).filter(Team.team_code == t_code).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with code '{t_code}' was not found.",
        )

    if team.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team '{team.team_name}' is inactive and cannot participate.",
        )

    # 3. Validate team registration for this session
    session_team = (
        db.query(SessionTeam)
        .filter(SessionTeam.session_id == session.id, SessionTeam.team_id == team.id)
        .first()
    )
    if not session_team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Team '{team.team_name}' is not registered to participate in '{session.session_name}'.",
        )

    # Issue participant token
    token = create_access_token(
        {
            "sub": team.id,
            "session_id": session.id,
            "session_code": session.session_code,
            "team_id": team.id,
            "team_name": team.team_name,
            "role": "participant",
        },
        expires_in_minutes=60 * 12,
    )

    return ParticipantJoinResponse(
        session_id=session.id,
        session_code=session.session_code,
        session_name=session.session_name,
        game_type=session.game_type,
        session_status=session.status,
        team_id=team.id,
        team_name=team.team_name,
        team_code=team.team_code,
        participating_teams_count=len(session.session_teams),
        total_questions_count=len(session.session_questions),
        participant_token=token,
    )


@router.get(
    "/sessions/{session_code}/current-question",
    response_model=ParticipantQuestionResponse,
)
def get_current_question(
    session_code: str,
    db: Session = Depends(get_db),
    participant: dict = Depends(get_participant_team),
):
    """Retrieve only authorized public question clues for the active question.

    - Excludes correct_answer, accepted_answers, and explanation unconditionally.
    - Excludes secret_topic and prohibited_words from guessing teams for Explain Without Naming.
    - Explaining team receives secret topic and prohibited words.
    """
    s_code = session_code.strip().upper()
    session = db.query(GameSession).filter(GameSession.session_code == s_code).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if participant.get("session_id") != session.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Participant token does not belong to this session",
        )

    if session.status != "live":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session is currently {session.status}. Waiting for organizer to start.",
        )

    # Until real-time progression in Step 7, get the first question in order
    first_sq = (
        db.query(SessionQuestion)
        .filter(SessionQuestion.session_id == session.id)
        .order_by(SessionQuestion.question_order.asc())
        .first()
    )
    if not first_sq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No questions configured for this session",
        )

    question = db.query(Question).filter(Question.id == first_sq.question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Question not found"
        )

    # Check if this team is the designated explaining team (first team in roster by default)
    is_explaining_team = False
    if session.game_type == "explain-without-naming":
        first_team = (
            db.query(SessionTeam)
            .filter(SessionTeam.session_id == session.id)
            .order_by(SessionTeam.id.asc())
            .first()
        )
        if first_team and first_team.team_id == participant.get("team_id"):
            is_explaining_team = True

    response = ParticipantQuestionResponse(
        id=question.id,
        game_type=question.game_type,
        title=question.title,
        instructions=question.instructions,
        content_type=question.content_type,
        text_content=question.text_content,
        images_data=question.images_data,
        difficulty=question.difficulty,
        question_order=first_sq.question_order,
        is_explaining_team=is_explaining_team,
    )

    # Reveal secret topic & prohibited words ONLY to explaining team
    if is_explaining_team:
        response.secret_topic = question.secret_topic
        response.prohibited_words = question.prohibited_words
        response.topic_description = question.topic_description

    return response
