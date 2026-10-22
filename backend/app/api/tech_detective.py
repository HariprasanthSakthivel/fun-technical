"""Game 1: Tech Detective API endpoints for Fun Friday Activities Platform.

Handles:
- Image-based technology questions (2-4 images each).
- Admin sequential question unlocking (only 1 unlocked at a time).
- Concurrent buzzer queueing (strictly top 3 teams, auto-locking on 3rd).
- Ordered answer attempts:
    1st team: +10 on correct, -2 on incorrect -> passes to 2nd team
    2nd team: +9 on correct, -2 on incorrect -> passes to 3rd team
    3rd team: +8 on correct, -2 on incorrect -> round finishes
- Real-time leaderboard updates with Admin manual score editing.
- Transition to Game 2 (ranking teams for Lightning Talks order).
"""

from datetime import datetime, timezone
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.models import (
    GameState,
    Team,
    TechDetectiveAnswer,
    TechDetectiveBuzzer,
    TechDetectiveQuestion,
    User,
)
from app.schemas.schemas import (
    BuzzerEntry,
    BuzzerQueueResponse,
    EditTechScoreRequest,
    EvaluateAnswerRequest,
    QuestionCreateRequest,
    QuestionUpdateRequest,
    QuestionWiseScoreResponse,
    QuestionWiseTeamScore,
    TechDetectiveLeaderboardEntry,
    TechDetectiveQuestionAdminResponse,
    TechDetectiveQuestionParticipantResponse,
)

router = APIRouter(prefix="/tech-detective", tags=["Game 1: Tech Detective"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_or_create_game_state(db: Session) -> GameState:
    state = db.query(GameState).filter(GameState.id == 1).first()
    if not state:
        state = GameState(id=1, current_game="tech-detective", is_buzzer_open=False)
        db.add(state)
        db.commit()
        db.refresh(state)
    return state


def recalculate_ranks(db: Session) -> None:
    teams = db.query(Team).order_by(Team.tech_detective_score.desc(), Team.id.asc()).all()
    for idx, team in enumerate(teams):
        team.rank = idx + 1
    db.commit()


# ── Questions Endpoints ────────────────────────────────────────────────────────

@router.get("/questions/admin", response_model=list[TechDetectiveQuestionAdminResponse])
def get_all_questions_admin(
    _: User = Depends(require_admin), db: Session = Depends(get_db)
):
    """Admin view: List all questions with full metadata and solutions."""
    return db.query(TechDetectiveQuestion).order_by(TechDetectiveQuestion.question_number.asc()).all()


@router.post("/questions", response_model=TechDetectiveQuestionAdminResponse)
def create_question(
    payload: QuestionCreateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Format images array
    formatted_images = [
        {"id": i + 1, "url": img_url, "caption": f"Image {i+1}"}
        for i, img_url in enumerate(payload.images)
    ]

    existing = db.query(TechDetectiveQuestion).filter(
        TechDetectiveQuestion.question_number == payload.question_number
    ).first()
    if existing:
        existing.title = payload.title.strip()
        existing.technology_name = payload.technology_name.strip()
        existing.images = formatted_images
        existing.accepted_answers = payload.accepted_answers or [payload.technology_name.strip().lower()]
        existing.points = payload.points
        existing.deduction = payload.deduction
        db.commit()
        db.refresh(existing)
        return existing

    qid = f"TD{payload.question_number:02d}"
    # Verify id uniqueness
    if db.query(TechDetectiveQuestion).filter(TechDetectiveQuestion.id == qid).first():
        qid = f"TD{payload.question_number}_{int(datetime.now().timestamp())}"

    new_q = TechDetectiveQuestion(
        id=qid,
        question_number=payload.question_number,
        title=payload.title.strip(),
        technology_name=payload.technology_name.strip(),
        images=formatted_images,
        accepted_answers=payload.accepted_answers or [payload.technology_name.strip().lower()],
        points=payload.points,
        deduction=payload.deduction,
        is_unlocked=False,
        is_completed=False,
        created_at=utc_now(),
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    return new_q


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint: Delete a Tech Detective question."""
    q = db.query(TechDetectiveQuestion).filter(TechDetectiveQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    db.delete(q)
    db.commit()
    return {"message": f"Question {question_id} deleted successfully"}


@router.get("/active-question", response_model=TechDetectiveQuestionParticipantResponse | None)
def get_active_question(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Participant view: Returns ONLY the currently unlocked question without answers."""
    q = db.query(TechDetectiveQuestion).filter(TechDetectiveQuestion.is_unlocked.is_(True)).first()
    if not q:
        return None

    return TechDetectiveQuestionParticipantResponse(
        id=q.id,
        question_number=q.question_number,
        title=q.title,
        images=q.images,
        points=q.points,
        is_unlocked=q.is_unlocked,
    )


@router.get("/score-breakdown", response_model=QuestionWiseScoreResponse)
def get_question_wise_score_breakdown(db: Session = Depends(get_db)):
    """Return Question-Wise Marks breakdown for each team across all Tech Detective questions."""
    questions = db.query(TechDetectiveQuestion).order_by(TechDetectiveQuestion.question_number.asc()).all()
    teams = db.query(Team).order_by(Team.tech_detective_score.desc(), Team.id.asc()).all()
    answers = db.query(TechDetectiveAnswer).all()

    # Map question_id to question_number
    q_map = {q.id: q.question_number for q in questions}

    # Aggregate scores: team_id -> {question_number: total_points}
    team_q_scores: dict[str, dict[str, int]] = {t.id: {} for t in teams}
    for ans in answers:
        q_num = q_map.get(ans.question_id)
        if q_num is not None and ans.team_id in team_q_scores:
            key = str(q_num)
            team_q_scores[ans.team_id][key] = team_q_scores[ans.team_id].get(key, 0) + ans.points_awarded

    team_scores_list = [
        QuestionWiseTeamScore(
            team_id=t.id,
            team_name=t.team_name,
            question_scores=team_q_scores.get(t.id, {}),
            total_score=t.tech_detective_score,
        )
        for t in teams
    ]

    q_meta = [
        {"id": q.id, "question_number": q.question_number, "title": q.title, "points": q.points}
        for q in questions
    ]

    return QuestionWiseScoreResponse(questions=q_meta, team_scores=team_scores_list)


@router.post("/unlock/{question_id}")
def unlock_question(
    question_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin locks all previous questions and unlocks the requested question one-by-one.
    
    Opens the buzzer for all teams simultaneously.
    """
    target = db.query(TechDetectiveQuestion).filter(TechDetectiveQuestion.id == question_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    # Lock all questions
    db.query(TechDetectiveQuestion).update({TechDetectiveQuestion.is_unlocked: False})

    # Unlock the single target question
    target.is_unlocked = True
    target.unlocked_at = utc_now()

    # Clear buzzers for this question so fresh round begins
    db.query(TechDetectiveBuzzer).filter(TechDetectiveBuzzer.question_id == question_id).delete()

    # Update global game state
    state = get_or_create_game_state(db)
    state.current_game = "tech-detective"
    state.active_question_id = question_id
    state.is_buzzer_open = True
    state.current_answering_team_id = None
    state.current_answering_position = None
    state.updated_at = utc_now()

    db.commit()
    db.refresh(target)

    return {
        "message": f"Question {target.question_number} unlocked and buzzer open",
        "question_id": target.id,
        "question_number": target.question_number,
    }


# ── Buzzer System ──────────────────────────────────────────────────────────────

@router.post("/buzz")
def press_buzzer(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Participant buzzer press.
    
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

    state = get_or_create_game_state(db)
    if not state.is_buzzer_open or not state.active_question_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Buzzer is currently locked or no question is active",
        )

    q_id = state.active_question_id

    # Check if team already buzzed for this question
    existing = (
        db.query(TechDetectiveBuzzer)
        .filter(TechDetectiveBuzzer.question_id == q_id, TechDetectiveBuzzer.team_id == team.id)
        .first()
    )
    if existing:
        return {
            "message": f"Team {team.team_name} already pressed the buzzer",
            "position": existing.position,
            "team_id": team.id,
        }

    # Count how many teams have buzzed
    current_count = (
        db.query(TechDetectiveBuzzer)
        .filter(TechDetectiveBuzzer.question_id == q_id)
        .count()
    )

    if current_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Buzzer is locked! The first 3 teams have already been recorded.",
        )

    new_position = current_count + 1
    buzzer_entry = TechDetectiveBuzzer(
        question_id=q_id,
        team_id=team.id,
        team_name=team.team_name,
        position=new_position,
        pressed_at=utc_now(),
    )
    db.add(buzzer_entry)

    # If first team, assign answering opportunity to this team
    if new_position == 1:
        state.current_answering_team_id = team.id
        state.current_answering_position = 1

    # If 3rd team, auto-lock buzzer for remaining teams
    if new_position == 3:
        state.is_buzzer_open = False

    db.commit()

    return {
        "message": f"Buzzer confirmed for {team.team_name}!",
        "position": new_position,
        "team_id": team.id,
    }


@router.get("/buzzer-queue/{question_id}", response_model=BuzzerQueueResponse)
def get_buzzer_queue(question_id: str, db: Session = Depends(get_db)):
    """Get the current top-3 buzzer queue for a question."""
    buzzers = (
        db.query(TechDetectiveBuzzer)
        .filter(TechDetectiveBuzzer.question_id == question_id)
        .order_by(TechDetectiveBuzzer.position.asc())
        .limit(3)
        .all()
    )

    state = get_or_create_game_state(db)
    is_open = state.is_buzzer_open and state.active_question_id == question_id

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
        is_buzzer_open=is_open,
        buzzers=entries,
        current_answering_team_id=state.current_answering_team_id,
        current_answering_position=state.current_answering_position,
    )


# ── Answer Evaluation & Scoring ───────────────────────────────────────────────

@router.post("/evaluate")
def evaluate_answer(
    payload: EvaluateAnswerRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin evaluates an answer according to the exact buzzer position rules:
    
    1st team: Correct = +10 pts, Incorrect = -2 pts (passes to 2nd team)
    2nd team: Correct = +9 pts,  Incorrect = -2 pts (passes to 3rd team)
    3rd team: Correct = +8 pts,  Incorrect = -2 pts (round ends)
    """
    state = get_or_create_game_state(db)
    q_id = state.active_question_id
    if not q_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active question")

    question = db.query(TechDetectiveQuestion).filter(TechDetectiveQuestion.id == q_id).first()
    team = db.query(Team).filter(Team.id == payload.team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    pos = payload.buzzer_position
    if pos not in (1, 2, 3):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid buzzer position")

    # Scoring calculation based on question's configurable marks
    q_points = question.points if question else 10
    q_deduction = question.deduction if question else 2

    points_awarded = 0
    next_position = None
    next_team_id = None

    if payload.is_correct:
        # Correct answers: Pos 1 gets full marks, Pos 2 gets -1, Pos 3 gets -2
        if pos == 1:
            points_awarded = q_points
        elif pos == 2:
            points_awarded = max(1, q_points - 1)
        else:
            points_awarded = max(1, q_points - 2)

        team.tech_detective_score += points_awarded
        team.total_score += points_awarded

        # Round completed
        if question:
            question.is_completed = True
        state.is_buzzer_open = False
        state.current_answering_team_id = None
        state.current_answering_position = None

    else:
        # Incorrect answer: deduction based on question's configured penalty
        points_awarded = -abs(q_deduction)
        team.tech_detective_score += points_awarded
        team.total_score += points_awarded

        # Check if next team in queue gets an opportunity
        if pos < 3:
            next_pos = pos + 1
            next_buzzer = (
                db.query(TechDetectiveBuzzer)
                .filter(
                    TechDetectiveBuzzer.question_id == q_id,
                    TechDetectiveBuzzer.position == next_pos,
                )
                .first()
            )
            if next_buzzer:
                state.current_answering_team_id = next_buzzer.team_id
                state.current_answering_position = next_pos
                next_position = next_pos
                next_team_id = next_buzzer.team_id
            else:
                # No next team buzzed yet; wait or keep answering slot open
                state.current_answering_team_id = None
                state.current_answering_position = next_pos
                next_position = next_pos
        else:
            # 3rd team failed; question round completed
            if question:
                question.is_completed = True
            state.is_buzzer_open = False
            state.current_answering_team_id = None
            state.current_answering_position = None

    # Record submission log
    ans_record = TechDetectiveAnswer(
        question_id=q_id,
        team_id=team.id,
        buzzer_position=pos,
        answer_text=payload.answer_text or "",
        is_correct=payload.is_correct,
        points_awarded=points_awarded,
        evaluated_at=utc_now(),
    )
    db.add(ans_record)

    db.commit()
    recalculate_ranks(db)

    return {
        "success": True,
        "team_id": team.id,
        "team_name": team.team_name,
        "buzzer_position": pos,
        "is_correct": payload.is_correct,
        "points_awarded": points_awarded,
        "new_score": team.tech_detective_score,
        "next_team_id": next_team_id,
        "next_position": next_position,
        "is_question_completed": question.is_completed if question else False,
    }


# ── Leaderboard Endpoints ──────────────────────────────────────────────────────

@router.get("/leaderboard", response_model=list[TechDetectiveLeaderboardEntry])
def get_tech_detective_leaderboard(db: Session = Depends(get_db)):
    """Both Admin and Participants can view the Tech Detective leaderboard."""
    teams = db.query(Team).order_by(Team.tech_detective_score.desc(), Team.id.asc()).all()
    return [
        TechDetectiveLeaderboardEntry(
            rank=idx + 1,
            team_id=t.id,
            team_name=t.team_name,
            score=t.tech_detective_score,
        )
        for idx, t in enumerate(teams)
    ]


@router.put("/leaderboard/{team_id}", response_model=TechDetectiveLeaderboardEntry)
def edit_tech_detective_score(
    team_id: str,
    payload: EditTechScoreRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin has permission to edit the Tech Detective leaderboard score directly."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    diff = payload.score - team.tech_detective_score
    team.tech_detective_score = payload.score
    team.total_score += diff

    db.commit()
    recalculate_ranks(db)
    db.refresh(team)

    return TechDetectiveLeaderboardEntry(
        rank=team.rank,
        team_id=team.id,
        team_name=team.team_name,
        score=team.tech_detective_score,
    )


@router.post("/transition-to-game2")
def transition_to_lightning_talks(
    _: User = Depends(require_admin), db: Session = Depends(get_db)
):
    """Admin finishes Tech Detective and transitions to Game 2 (Lightning Talks).
    
    Locks all questions and sets current_game = 'lightning-talks'.
    """
    db.query(TechDetectiveQuestion).update({TechDetectiveQuestion.is_unlocked: False})
    state = get_or_create_game_state(db)
    state.current_game = "lightning-talks"
    state.is_buzzer_open = False
    state.active_question_id = None
    state.current_answering_team_id = None
    state.current_answering_position = None
    state.updated_at = utc_now()

    recalculate_ranks(db)
    db.commit()

    return {"message": "Successfully transitioned to Game 2: Lightning Talks"}
