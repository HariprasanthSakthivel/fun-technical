"""Game 2: Lightning Talks API endpoints for Fun Friday Activities Platform.

Handles:
- Topic bank management.
- Non-duplicate topic assignment across all participants.
- Admin sequential topic unlocking for active speakers.
- 1-minute speech duration.
- Admin scoring based on 3 criteria:
    1. Time Management (1-minute utilization)
    2. Words Used (vocabulary & avoiding topic name)
    3. Understandability (clarity & comprehensibility)
- Aggregation of individual scores to team Lightning Talks score.
- Admin manual score editing.
"""

from datetime import datetime, timezone
import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.models import (
    GameState,
    LightningTalkBuzzer,
    LightningTalkScore,
    LightningTalkTopic,
    Team,
    User,
)
from app.schemas.schemas import (
    BuzzerEntry,
    BuzzerQueueResponse,
    CreateTopicRequest,
    EditLightningScoreRequest,
    EvaluateLightningGuessRequest,
    EvaluateLightningSpeechRequest,
    LightningLeaderboardEntry,
    LightningTopicAdminResponse,
    LightningTopicParticipantResponse,
    ManualTopicAssignRequest,
)

router = APIRouter(prefix="/lightning-talks", tags=["Game 2: Lightning Talks"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def recalculate_final_ranks(db: Session) -> None:
    teams = db.query(Team).order_by(Team.total_score.desc(), Team.id.asc()).all()
    for idx, team in enumerate(teams):
        team.rank = idx + 1
    db.commit()


@router.get("/topics/admin", response_model=list[LightningTopicAdminResponse])
def get_topics_admin(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin view: List all topics with assignment and unlock status."""
    topics = db.query(LightningTalkTopic).order_by(LightningTalkTopic.id.asc()).all()
    result = []
    for t in topics:
        u_name = t.assigned_user.display_name if t.assigned_user else None
        t_name = t.assigned_team.team_name if t.assigned_team else None
        result.append(
            LightningTopicAdminResponse(
                id=t.id,
                topic_name=t.topic_name,
                description=t.description,
                prohibited_words=t.prohibited_words,
                assigned_user_id=t.assigned_user_id,
                assigned_user_name=u_name,
                assigned_team_id=t.assigned_team_id,
                assigned_team_name=t_name,
                is_unlocked=t.is_unlocked,
                unlocked_at=t.unlocked_at,
                duration_seconds=t.duration_seconds,
                is_buzzer_open=bool(t.is_buzzer_open),
                current_answering_team_id=t.current_answering_team_id,
                current_answering_position=t.current_answering_position,
                is_completed=bool(t.is_completed),
            )
        )
    return result


@router.get("/active-topic", response_model=LightningTopicParticipantResponse | None)
def get_my_active_topic(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Participant view: Returns topic ONLY if assigned to the current participant.
    
    For all other participants (audience), topic details (name, prohibited words)
    are strictly hidden and redacted so only the assigned speaker can see them.
    """
    # 1. Check if current user has an unlocked topic assigned directly to them
    my_unlocked_topic = (
        db.query(LightningTalkTopic)
        .filter(
            LightningTalkTopic.assigned_user_id == current_user.id,
            LightningTalkTopic.is_unlocked.is_(True),
        )
        .first()
    )
    if my_unlocked_topic:
        return LightningTopicParticipantResponse(
            id=my_unlocked_topic.id,
            topic_name=my_unlocked_topic.topic_name,
            description=my_unlocked_topic.description,
            prohibited_words=my_unlocked_topic.prohibited_words or [],
            is_unlocked=my_unlocked_topic.is_unlocked,
            duration_seconds=my_unlocked_topic.duration_seconds,
            is_my_turn=True,
            active_speaker_name=current_user.display_name,
            active_speaker_team=current_user.team.team_name if current_user.team else None,
            assigned_team_id=my_unlocked_topic.assigned_team_id,
            is_buzzer_open=bool(my_unlocked_topic.is_buzzer_open),
            current_answering_team_id=my_unlocked_topic.current_answering_team_id,
            current_answering_position=my_unlocked_topic.current_answering_position,
            is_completed=bool(my_unlocked_topic.is_completed),
        )

    # 2. Check if another speaker's topic is currently unlocked on stage
    active_unlocked_topic = (
        db.query(LightningTalkTopic)
        .filter(LightningTalkTopic.is_unlocked.is_(True))
        .first()
    )
    if active_unlocked_topic and active_unlocked_topic.assigned_user_id != current_user.id:
        speaker = active_unlocked_topic.assigned_user
        team = active_unlocked_topic.assigned_team
        return LightningTopicParticipantResponse(
            id=active_unlocked_topic.id,
            topic_name="",  # STRICTLY REDACTED: Topic name hidden from other participants
            description=None,  # STRICTLY REDACTED
            prohibited_words=[],  # STRICTLY REDACTED: Taboo words hidden from other participants
            is_unlocked=True,
            duration_seconds=active_unlocked_topic.duration_seconds,
            is_my_turn=False,
            active_speaker_name=speaker.display_name if speaker else "Active Speaker",
            active_speaker_team=team.team_name if team else None,
            assigned_team_id=active_unlocked_topic.assigned_team_id,
            is_buzzer_open=bool(active_unlocked_topic.is_buzzer_open),
            current_answering_team_id=active_unlocked_topic.current_answering_team_id,
            current_answering_position=active_unlocked_topic.current_answering_position,
            is_completed=bool(active_unlocked_topic.is_completed),
        )

    # 3. Check if current user has a topic assigned directly to them (even if not yet unlocked)
    my_assigned_topic = (
        db.query(LightningTalkTopic)
        .filter(LightningTalkTopic.assigned_user_id == current_user.id)
        .first()
    )
    if my_assigned_topic:
        return LightningTopicParticipantResponse(
            id=my_assigned_topic.id,
            topic_name=my_assigned_topic.topic_name,
            description=my_assigned_topic.description,
            prohibited_words=my_assigned_topic.prohibited_words or [],
            is_unlocked=my_assigned_topic.is_unlocked,
            duration_seconds=my_assigned_topic.duration_seconds,
            is_my_turn=True,
            active_speaker_name=current_user.display_name,
            active_speaker_team=current_user.team.team_name if current_user.team else None,
            assigned_team_id=my_assigned_topic.assigned_team_id,
            is_buzzer_open=bool(my_assigned_topic.is_buzzer_open),
            current_answering_team_id=my_assigned_topic.current_answering_team_id,
            current_answering_position=my_assigned_topic.current_answering_position,
            is_completed=bool(my_assigned_topic.is_completed),
        )

    return None


@router.post("/topics", response_model=LightningTopicAdminResponse)
def create_topic(
    payload: CreateTopicRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin creates a new topic for Game 2 (can be in topic pool or assigned to a user)."""
    count = db.query(LightningTalkTopic).count() + 1
    topic_id = f"LT{count:02d}"
    while db.query(LightningTalkTopic).filter(LightningTalkTopic.id == topic_id).first():
        count += 1
        topic_id = f"LT{count:02d}"

    u_name = None
    t_name = None
    if payload.assigned_user_id:
        user = db.query(User).filter(User.id == payload.assigned_user_id).first()
        if user:
            u_name = user.display_name
    if payload.assigned_team_id:
        team = db.query(Team).filter(Team.id == payload.assigned_team_id).first()
        if team:
            t_name = team.team_name

    new_topic = LightningTalkTopic(
        id=topic_id,
        topic_name=payload.topic_name.strip(),
        description=payload.description or "",
        prohibited_words=payload.prohibited_words or [],
        assigned_user_id=payload.assigned_user_id,
        assigned_team_id=payload.assigned_team_id,
        is_unlocked=False,
        duration_seconds=60,
    )
    db.add(new_topic)
    db.commit()
    db.refresh(new_topic)

    return LightningTopicAdminResponse(
        id=new_topic.id,
        topic_name=new_topic.topic_name,
        description=new_topic.description,
        prohibited_words=new_topic.prohibited_words,
        assigned_user_id=new_topic.assigned_user_id,
        assigned_user_name=u_name,
        assigned_team_id=new_topic.assigned_team_id,
        assigned_team_name=t_name,
        is_unlocked=new_topic.is_unlocked,
        unlocked_at=new_topic.unlocked_at,
        duration_seconds=new_topic.duration_seconds,
    )


@router.delete("/topics/{topic_id}")
def delete_topic(
    topic_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin deletes a topic from Game 2."""
    topic = db.query(LightningTalkTopic).filter(LightningTalkTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    db.delete(topic)
    db.commit()
    return {"message": f"Topic '{topic.topic_name}' deleted"}


@router.post("/manual-assign", response_model=LightningTopicAdminResponse)
def manual_assign_topic(
    payload: ManualTopicAssignRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin manually assigns/sets a topic directly for a team member."""
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found")

    team = db.query(Team).filter(Team.id == payload.team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    topic = db.query(LightningTalkTopic).filter(
        LightningTalkTopic.assigned_user_id == user.id
    ).first()

    if not topic:
        # Check if topic already exists in unassigned pool
        pool_topic = db.query(LightningTalkTopic).filter(
            LightningTalkTopic.topic_name == payload.topic_name.strip(),
            LightningTalkTopic.assigned_user_id.is_(None),
        ).first()
        if pool_topic:
            topic = pool_topic
            topic.assigned_user_id = user.id
            topic.assigned_team_id = payload.team_id
        else:
            topic_id = f"LT_U{user.id}"
            topic = LightningTalkTopic(
                id=topic_id,
                topic_name=payload.topic_name.strip(),
                description=payload.description or "",
                prohibited_words=payload.prohibited_words or [],
                assigned_user_id=user.id,
                assigned_team_id=payload.team_id,
                is_unlocked=False,
                duration_seconds=60,
            )
            db.add(topic)
    else:
        topic.topic_name = payload.topic_name.strip()
        topic.assigned_team_id = payload.team_id
        if payload.description is not None:
            topic.description = payload.description
        if payload.prohibited_words is not None:
            topic.prohibited_words = payload.prohibited_words

    db.commit()
    db.refresh(topic)

    return LightningTopicAdminResponse(
        id=topic.id,
        topic_name=topic.topic_name,
        description=topic.description,
        prohibited_words=topic.prohibited_words,
        assigned_user_id=topic.assigned_user_id,
        assigned_user_name=user.display_name,
        assigned_team_id=topic.assigned_team_id,
        assigned_team_name=team.team_name,
        is_unlocked=topic.is_unlocked,
        unlocked_at=topic.unlocked_at,
        duration_seconds=topic.duration_seconds,
    )


@router.post("/unlock/{topic_id}")
def unlock_topic(
    topic_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin unlocks the topic for the designated participant.
    
    All other topics are locked. 1-minute countdown begins.
    """
    topic = db.query(LightningTalkTopic).filter(LightningTalkTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    # Lock all topics
    db.query(LightningTalkTopic).update({LightningTalkTopic.is_unlocked: False})

    # Unlock target topic
    topic.is_unlocked = True
    topic.unlocked_at = utc_now()

    state = db.query(GameState).filter(GameState.id == 1).first()
    if state:
        state.active_lightning_user_id = topic.assigned_user_id
        state.updated_at = utc_now()

    db.commit()
    db.refresh(topic)

    return {
        "message": f"Topic '{topic.topic_name}' unlocked for {topic.assigned_user.display_name if topic.assigned_user else 'speaker'}",
        "topic_id": topic.id,
        "topic_name": topic.topic_name,
        "assigned_user_id": topic.assigned_user_id,
        "duration_seconds": topic.duration_seconds,
    }


@router.post("/evaluate")
def evaluate_lightning_speech(
    payload: EvaluateLightningSpeechRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin manually evaluates participant speech based on 3 criteria:
    1. Time Management (1 minute usage, 0-10)
    2. Words Used (vocabulary & avoiding taboo word, 0-10)
    3. Understandability (clarity, 0-10)
    
    Total points earned contribute to the participant's team's Lightning Talks score!
    """
    team = db.query(Team).filter(Team.id == payload.team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    total_speech_score = (
        payload.time_management_score
        + payload.words_used_score
        + payload.understandability_score
    )

    # Save evaluation record
    eval_record = LightningTalkScore(
        user_id=payload.user_id,
        team_id=payload.team_id,
        topic_id=payload.topic_id,
        time_management_score=payload.time_management_score,
        words_used_score=payload.words_used_score,
        understandability_score=payload.understandability_score,
        total_score=total_speech_score,
        admin_notes=payload.admin_notes,
        evaluated_at=utc_now(),
    )
    db.add(eval_record)

    # Contribute points to team score
    team.lightning_talks_score += total_speech_score
    team.total_score += total_speech_score

    # Lock topic as finished
    topic = db.query(LightningTalkTopic).filter(LightningTalkTopic.id == payload.topic_id).first()
    if topic:
        topic.is_unlocked = False

    state = db.query(GameState).filter(GameState.id == 1).first()
    if state:
        state.active_lightning_user_id = None

    db.commit()
    recalculate_final_ranks(db)

    return {
        "success": True,
        "team_id": team.id,
        "team_name": team.team_name,
        "total_speech_score": total_speech_score,
        "new_lightning_score": team.lightning_talks_score,
        "new_total_score": team.total_score,
    }


@router.get("/scores", response_model=list[LightningLeaderboardEntry])
def get_lightning_leaderboard(db: Session = Depends(get_db)):
    """Both Admin and Participants can view the Lightning Talks scores."""
    teams = db.query(Team).order_by(Team.lightning_talks_score.desc(), Team.id.asc()).all()
    return [
        LightningLeaderboardEntry(
            rank=idx + 1,
            team_id=t.id,
            team_name=t.team_name,
            score=t.lightning_talks_score,
        )
        for idx, t in enumerate(teams)
    ]


@router.put("/scores/{team_id}", response_model=LightningLeaderboardEntry)
def edit_lightning_score(
    team_id: str,
    payload: EditLightningScoreRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin has permission to view and edit assigned Lightning Talks scores."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    diff = payload.score - team.lightning_talks_score
    team.lightning_talks_score = payload.score
    team.total_score += diff

    db.commit()
    recalculate_final_ranks(db)
    db.refresh(team)

    return LightningLeaderboardEntry(
        rank=team.rank,
        team_id=team.id,
        team_name=team.team_name,
        score=team.lightning_talks_score,
    )


# ── Game 2 Buzzer Guessing System ─────────────────────────────────────────────

@router.post("/open-buzzer/{topic_id}")
def open_lightning_buzzer(
    topic_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin opens the buzzer after speaker finishes their talk so audience teams can guess the topic."""
    topic = db.query(LightningTalkTopic).filter(LightningTalkTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    # Clear existing buzzers for this topic
    db.query(LightningTalkBuzzer).filter(LightningTalkBuzzer.topic_id == topic_id).delete()

    topic.is_buzzer_open = True
    topic.is_completed = False
    topic.current_answering_team_id = None
    topic.current_answering_position = None

    state = db.query(GameState).filter(GameState.id == 1).first()
    if state:
        state.is_buzzer_open = True
        state.updated_at = utc_now()

    db.commit()
    db.refresh(topic)

    return {
        "message": f"Buzzer opened for topic guessing! Teams can buzz in now.",
        "topic_id": topic.id,
        "is_buzzer_open": True,
    }


@router.post("/buzz")
def press_lightning_buzzer(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Participant buzzer press to guess the active speaker's topic.
    Records up to 3 teams in chronological order. Once 3 teams buzz, auto-locks.
    """
    if not current_user.team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a team to press the buzzer",
        )

    team = db.query(Team).filter(Team.id == current_user.team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team not found")

    # Find the active unlocked topic
    topic = (
        db.query(LightningTalkTopic)
        .filter(LightningTalkTopic.is_unlocked.is_(True))
        .first()
    )
    if not topic or not topic.is_buzzer_open:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Buzzer is currently locked or topic guessing has not opened yet.",
        )

    # Prevent the speaker's own team from buzzing their own topic
    if topic.assigned_team_id and team.id == topic.assigned_team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your team member was the speaker! Your team cannot guess your own topic.",
        )

    # Check if team already buzzed for this topic
    existing = (
        db.query(LightningTalkBuzzer)
        .filter(LightningTalkBuzzer.topic_id == topic.id, LightningTalkBuzzer.team_id == team.id)
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
        db.query(LightningTalkBuzzer)
        .filter(LightningTalkBuzzer.topic_id == topic.id)
        .count()
    )
    if current_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Buzzer is locked! The first 3 teams have already buzzed.",
        )

    new_position = current_count + 1
    buzzer_entry = LightningTalkBuzzer(
        topic_id=topic.id,
        team_id=team.id,
        team_name=team.team_name,
        position=new_position,
        pressed_at=utc_now(),
    )
    db.add(buzzer_entry)

    # If first team, assign answering opportunity to this team
    if new_position == 1:
        topic.current_answering_team_id = team.id
        topic.current_answering_position = 1

    # Auto lock after 3 teams
    if new_position >= 3:
        topic.is_buzzer_open = False

    db.commit()

    return {
        "message": f"Buzzer confirmed! Position #{new_position}",
        "position": new_position,
        "team_id": team.id,
    }


@router.get("/buzzer-queue/{topic_id}", response_model=BuzzerQueueResponse)
def get_lightning_buzzer_queue(topic_id: str, db: Session = Depends(get_db)):
    """Fetch the chronological buzzer queue for a lightning talk topic."""
    topic = db.query(LightningTalkTopic).filter(LightningTalkTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    buzzers = (
        db.query(LightningTalkBuzzer)
        .filter(LightningTalkBuzzer.topic_id == topic_id)
        .order_by(LightningTalkBuzzer.position.asc())
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
        question_id=topic.id,
        is_buzzer_open=bool(topic.is_buzzer_open),
        buzzers=entries,
        current_answering_team_id=topic.current_answering_team_id,
        current_answering_position=topic.current_answering_position,
    )


@router.post("/evaluate-guess")
def evaluate_lightning_guess(
    payload: EvaluateLightningGuessRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin evaluates a team's topic guess attempt (+10 for Correct, -5 for Incorrect).
    
    If incorrect, passes opportunity to the next team in buzzer position.
    """
    topic = db.query(LightningTalkTopic).filter(LightningTalkTopic.id == payload.topic_id).first()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    team = db.query(Team).filter(Team.id == payload.team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    if payload.is_correct:
        points_awarded = 10
        team.lightning_talks_score += points_awarded
        team.total_score += points_awarded

        # Round completed
        topic.is_completed = True
        topic.is_buzzer_open = False
        topic.current_answering_team_id = None
        topic.current_answering_position = None

        db.commit()
        recalculate_final_ranks(db)

        return {
            "success": True,
            "team_id": team.id,
            "team_name": team.team_name,
            "buzzer_position": payload.buzzer_position,
            "is_correct": True,
            "points_awarded": points_awarded,
            "new_score": team.lightning_talks_score,
            "is_completed": True,
            "message": f"Correct! +{points_awarded} awarded to {team.team_name}!",
        }
    else:
        # Incorrect deduction = -5 pts
        deduction = -5
        team.lightning_talks_score += deduction  # deducting 5
        team.total_score += deduction

        # Pass to next team in buzzer queue
        next_pos = payload.buzzer_position + 1
        next_buzzer = (
            db.query(LightningTalkBuzzer)
            .filter(
                LightningTalkBuzzer.topic_id == topic.id,
                LightningTalkBuzzer.position == next_pos,
            )
            .first()
        )

        if next_buzzer:
            topic.current_answering_team_id = next_buzzer.team_id
            topic.current_answering_position = next_buzzer.position
            db.commit()
            recalculate_final_ranks(db)
            return {
                "success": True,
                "team_id": team.id,
                "team_name": team.team_name,
                "buzzer_position": payload.buzzer_position,
                "is_correct": False,
                "points_awarded": deduction,
                "new_score": team.lightning_talks_score,
                "next_team_id": next_buzzer.team_id,
                "next_position": next_buzzer.position,
                "is_completed": False,
                "message": f"Incorrect (-5 pts)! Passing turn to Position #{next_pos} ({next_buzzer.team_name}).",
            }
        else:
            # No more teams in queue
            topic.current_answering_team_id = None
            topic.current_answering_position = None
            topic.is_completed = True
            topic.is_buzzer_open = False
            db.commit()
            recalculate_final_ranks(db)
            return {
                "success": True,
                "team_id": team.id,
                "team_name": team.team_name,
                "buzzer_position": payload.buzzer_position,
                "is_correct": False,
                "points_awarded": deduction,
                "new_score": team.lightning_talks_score,
                "next_team_id": None,
                "next_position": None,
                "is_completed": True,
                "message": f"Incorrect (-5 pts)! No remaining teams in queue. Guessing round ends.",
            }


@router.post("/reset-buzzer/{topic_id}")
def reset_lightning_buzzer(
    topic_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin resets the buzzer queue for this topic and re-opens the buzzer."""
    topic = db.query(LightningTalkTopic).filter(LightningTalkTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    db.query(LightningTalkBuzzer).filter(LightningTalkBuzzer.topic_id == topic_id).delete()
    topic.is_buzzer_open = True
    topic.is_completed = False
    topic.current_answering_team_id = None
    topic.current_answering_position = None

    db.commit()
    return {"message": f"Buzzer reset and reopened for topic '{topic.topic_name}'"}
