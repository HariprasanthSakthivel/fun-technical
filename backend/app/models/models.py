"""SQLAlchemy models for Fun & Technical Activity Platform.

Persists Users, Teams, Team Members, Questions, Game Sessions, Session Questions, and Session Teams.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
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
    """User account model supporting local password authentication and RBAC roles."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(128), unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="admin", nullable=False)  # "admin" or "participant"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)


class Team(Base):
    """Registered team model."""

    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, index=True)  # e.g. "T01"
    team_name: Mapped[str] = mapped_column(String(128), nullable=False)
    team_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)  # e.g. "ALPHA"
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    team_leader: Mapped[str | None] = mapped_column(String(128), nullable=True)
    member_count: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)  # "active" or "inactive"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    members: Mapped[list["TeamMember"]] = relationship(
        "TeamMember", back_populates="team", cascade="all, delete-orphan"
    )
    session_participations: Mapped[list["SessionTeam"]] = relationship(
        "SessionTeam", back_populates="team"
    )


class TeamMember(Base):
    """Individual team member."""

    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    member_name: Mapped[str] = mapped_column(String(128), nullable=False)
    member_identifier: Mapped[str | None] = mapped_column(String(64), nullable=True)

    team: Mapped["Team"] = relationship("Team", back_populates="members")


class Question(Base):
    """Question Bank model for both Guess the Tech and Explain Without Naming."""

    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, index=True)  # e.g. "Q001"
    game_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # "guess-tech" or "explain-without-naming"
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_type: Mapped[str] = mapped_column(String(32), default="text", nullable=False)  # "text", "image", "multiple-images", "text-images"
    text_content: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Structured image metadata and storage references
    images_data: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)

    # Explain Without Naming fields
    secret_topic: Mapped[str | None] = mapped_column(String(256), nullable=True)
    topic_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    prohibited_words: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    admin_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    estimated_time: Mapped[int | None] = mapped_column(Integer, nullable=True)
    technology_category: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Confidential answer data (Admin-only)
    correct_answer: Mapped[str] = mapped_column(String(256), nullable=False)
    accepted_answers: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Metadata
    difficulty: Mapped[str] = mapped_column(String(32), default="medium", nullable=False)  # "easy", "medium", "hard"
    question_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)  # "ready", "draft", "archived"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)


class GameSession(Base):
    """Game session model."""

    __tablename__ = "game_sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, index=True)  # e.g. "S01"
    session_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)  # e.g. "TECH-4821"
    session_name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    game_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)  # "draft", "ready", "live", "completed", "cancelled"
    scheduled_at: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Game rules stored as JSON
    game_rules: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    session_questions: Mapped[list["SessionQuestion"]] = relationship(
        "SessionQuestion", back_populates="session", cascade="all, delete-orphan", order_by="SessionQuestion.question_order"
    )
    session_teams: Mapped[list["SessionTeam"]] = relationship(
        "SessionTeam", back_populates="session", cascade="all, delete-orphan"
    )


class SessionQuestion(Base):
    """Question references attached to a session in a specific order."""

    __tablename__ = "session_questions"
    __table_args__ = (
        UniqueConstraint("session_id", "question_id", name="uq_session_question"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    session: Mapped["GameSession"] = relationship("GameSession", back_populates="session_questions")
    question: Mapped["Question"] = relationship("Question")


class SessionTeam(Base):
    """Team participation in a game session."""

    __tablename__ = "session_teams"
    __table_args__ = (
        UniqueConstraint("session_id", "team_id", name="uq_session_team"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    participation_status: Mapped[str] = mapped_column(String(32), default="registered", nullable=False)
    joined_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    session: Mapped["GameSession"] = relationship("GameSession", back_populates="session_teams")
    team: Mapped["Team"] = relationship("Team", back_populates="session_participations")


class LiveGameState(Base):
    """Authoritative persistent state of a live game session."""

    __tablename__ = "live_game_states"

    session_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("game_sessions.id", ondelete="CASCADE"), primary_key=True
    )
    current_question_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_question_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("questions.id", ondelete="SET NULL"), nullable=True
    )
    explaining_team_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True
    )
    is_question_unlocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_buzzer_open: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_answer_revealed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_question_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    unlocked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    buzzer_closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revealed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    session: Mapped["GameSession"] = relationship("GameSession")
    current_question: Mapped["Question | None"] = relationship("Question")
    explaining_team: Mapped["Team | None"] = relationship("Team")


class BuzzerPosition(Base):
    """Authoritative server-side queue of confirmed buzzer presses per question."""

    __tablename__ = "buzzer_positions"
    __table_args__ = (
        UniqueConstraint("session_id", "question_id", "team_id", name="uq_buzzer_session_question_team"),
        UniqueConstraint("session_id", "question_id", "position", name="uq_buzzer_session_question_position"),
        Index("ix_buzzer_lookup", "session_id", "question_id", "position"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, 3...
    pressed_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    idempotency_key: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    session: Mapped["GameSession"] = relationship("GameSession")
    question: Mapped["Question"] = relationship("Question")
    team: Mapped["Team"] = relationship("Team")


class AnswerSubmission(Base):
    """Authoritative answer submission record evaluated against correct answers."""

    __tablename__ = "answer_submissions"
    __table_args__ = (
        UniqueConstraint("session_id", "question_id", "team_id", name="uq_answer_session_question_team"),
        Index("ix_answer_lookup", "session_id", "question_id", "team_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    evaluation_status: Mapped[str] = mapped_column(
        String(32), default="pending", nullable=False
    )  # "pending", "evaluated"
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    evaluated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    session: Mapped["GameSession"] = relationship("GameSession")
    question: Mapped["Question"] = relationship("Question")
    team: Mapped["Team"] = relationship("Team")

