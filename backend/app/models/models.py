"""SQLAlchemy models for Fun Friday Activities Platform.

Persists Users, Teams, Tech Detective Questions, Buzzer Presses, Answers,
Lightning Talks Topics, Scores, and Global Game State.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    """Current UTC datetime."""
    return datetime.now(timezone.utc)


class User(Base):
    """User account model for both Admins and Participants."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    email: Mapped[str | None] = mapped_column(String(128), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="participant", nullable=False)  # "admin" | "participant"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_logged_in: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    team_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    team: Mapped["Team | None"] = relationship("Team", back_populates="members")


class Team(Base):
    """Team model formed either randomly or configured by admin."""

    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, index=True)  # e.g. "T01"
    team_name: Mapped[str] = mapped_column(String(128), nullable=False)
    team_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    tech_detective_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    lightning_talks_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rank: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    members: Mapped[list["User"]] = relationship("User", back_populates="team")


class TechDetectiveQuestion(Base):
    """Game 1: Tech Detective question bank.
    
    Each question contains a minimum of 2 and maximum of 4 images representing
    a technology, programming language, tool, platform, or framework.
    """

    __tablename__ = "tech_detective_questions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, index=True)  # e.g. "TD01"
    question_number: Mapped[int] = mapped_column(Integer, unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    technology_name: Mapped[str] = mapped_column(String(128), nullable=False)
    # JSON list of 2 to 4 images: [{"id": 1, "url": "...", "caption": "..."}]
    images: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False)
    accepted_answers: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    clue_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    deduction: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    is_unlocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    unlocked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)


class TechDetectiveBuzzer(Base):
    """Buzzer presses recorded in chronological order. Maximum 3 teams per question."""

    __tablename__ = "tech_detective_buzzers"
    __table_args__ = (
        UniqueConstraint("question_id", "team_id", name="uq_buzzer_question_team"),
        UniqueConstraint("question_id", "position", name="uq_buzzer_question_position"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("tech_detective_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_name: Mapped[str] = mapped_column(String(128), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, or 3
    pressed_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)


class TechDetectiveAnswer(Base):
    """Answer attempts evaluated by the admin (+10/+9/+8 for correct, -2 for incorrect)."""

    __tablename__ = "tech_detective_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("tech_detective_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    buzzer_position: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, or 3
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    points_awarded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)


class LightningTalkTopic(Base):
    """Game 2: Lightning Talks topics assigned to participants."""

    __tablename__ = "lightning_talk_topics"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, index=True)  # e.g. "LT01"
    topic_name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    prohibited_words: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    assigned_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    assigned_team_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_unlocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    unlocked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=60, nullable=False)

    assigned_user: Mapped["User | None"] = relationship("User")
    assigned_team: Mapped["Team | None"] = relationship("Team")


class LightningTalkScore(Base):
    """Game 2: Evaluation records for participant speeches based on the 3 criteria:
    1. Time Management (1 minute usage)
    2. Words Used (vocabulary & avoiding topic name)
    3. Understandability (clarity of explanation)
    """

    __tablename__ = "lightning_talk_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("lightning_talk_topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    time_management_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    words_used_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    understandability_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)

    user: Mapped["User"] = relationship("User")
    team: Mapped["Team"] = relationship("Team")
    topic: Mapped["LightningTalkTopic"] = relationship("LightningTalkTopic")


class GameState(Base):
    """Global platform orchestration state."""

    __tablename__ = "game_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    current_game: Mapped[str] = mapped_column(String(64), default="lobby", nullable=False)  # "lobby", "tech-detective", "lightning-talks", "final-leaderboard"
    active_question_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    active_lightning_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_buzzer_open: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    current_answering_team_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    current_answering_position: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Dynamic Synchronized Game Timer fields
    timer_total_duration: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    timer_seconds_remaining: Mapped[float] = mapped_column(Float, default=60.0, nullable=False)
    timer_is_running: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    timer_end_time: Mapped[float | None] = mapped_column(Float, nullable=True)  # Unix epoch timestamp in seconds
    timer_game: Mapped[str] = mapped_column(String(64), default="all", nullable=False)  # "all", "tech-detective", "lightning-talks"

    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)


class Game(Base):
    """Dynamic game catalog model allowing admins to add custom games for future events."""

    __tablename__ = "games"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, index=True)  # e.g. "G01", "G02", "G03"
    game_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)  # e.g. "tech-detective", "lightning-talks", "code-relay"
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(256), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    game_type: Mapped[str] = mapped_column(String(64), default="custom", nullable=False)  # "buzzer", "speech", "trivia", "challenge", "custom"
    icon: Mapped[str] = mapped_column(String(64), default="gamepad", nullable=False)
    default_timer_seconds: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    rules: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)


class TeamGameScore(Base):
    """Flexible scores awarded to teams for any game (including dynamically added games)."""

    __tablename__ = "team_game_scores"
    __table_args__ = (
        UniqueConstraint("team_id", "game_code", name="uq_team_game_score"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    game_code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)


class GameQuestion(Base):
    """Dynamic question and challenge bank for any dynamically created game or activity."""

    __tablename__ = "game_questions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)  # e.g. "GQ-tech-quiz-1"
    game_id: Mapped[str] = mapped_column(String(32), ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    game_code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    question_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    question_type: Mapped[str] = mapped_column(String(64), default="quiz", nullable=False)  # "quiz", "mcq", "code", "text", "buzzer"
    options: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)  # e.g. ["A", "B", "C", "D"]
    correct_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    accepted_answers: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_type: Mapped[str] = mapped_column(String(32), default="none", nullable=False)  # "none", "image", "audio", "video", "youtube"
    media_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    deduction: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    time_limit_seconds: Mapped[int | None] = mapped_column(Integer, default=60, nullable=True)
    is_unlocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    unlocked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_buzzer_open: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    current_answering_team_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    current_answering_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)


class GameQuestionBuzzer(Base):
    """Buzzer presses recorded in chronological order for any custom game question."""

    __tablename__ = "game_question_buzzers"
    __table_args__ = (
        UniqueConstraint("question_id", "team_id", name="uq_custom_buzzer_question_team"),
        UniqueConstraint("question_id", "position", name="uq_custom_buzzer_question_position"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("game_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_name: Mapped[str] = mapped_column(String(128), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, or 3
    pressed_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)



