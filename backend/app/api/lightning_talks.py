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
    LightningTalkScore,
    LightningTalkTopic,
    Team,
    User,
)
from app.schemas.schemas import (
    CreateTopicRequest,
    EditLightningScoreRequest,
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
            )
        )
    return result


@router.get("/active-topic", response_model=LightningTopicParticipantResponse | None)
def get_my_active_topic(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Participant view: Returns the active unlocked topic assigned to this participant.
    
    If it's another speaker's turn, returns the currently unlocked topic for audience view.
    """
    # First check if there is an unlocked topic for current participant
    my_topic = (
        db.query(LightningTalkTopic)
        .filter(
            LightningTalkTopic.assigned_user_id == current_user.id,
            LightningTalkTopic.is_unlocked.is_(True),
        )
        .first()
    )
    if my_topic:
        return LightningTopicParticipantResponse(
            id=my_topic.id,
            topic_name=my_topic.topic_name,
            description=my_topic.description,
            prohibited_words=my_topic.prohibited_words,
            is_unlocked=my_topic.is_unlocked,
            duration_seconds=my_topic.duration_seconds,
        )

    # Otherwise check if any topic is currently unlocked globally
    active_topic = (
        db.query(LightningTalkTopic)
        .filter(LightningTalkTopic.is_unlocked.is_(True))
        .first()
    )
    if active_topic:
        return LightningTopicParticipantResponse(
            id=active_topic.id,
            topic_name=active_topic.topic_name,
            description=active_topic.description,
            prohibited_words=active_topic.prohibited_words,
            is_unlocked=active_topic.is_unlocked,
            duration_seconds=active_topic.duration_seconds,
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
