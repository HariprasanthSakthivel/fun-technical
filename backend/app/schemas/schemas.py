"""Pydantic schemas for request validation and response models."""

from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field


# ── Auth & User Schemas ────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    role: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str | None = None
    role: str
    is_active: bool
    created_at: datetime


# ── Team Schemas ───────────────────────────────────────────────────────────────

class TeamMemberBase(BaseModel):
    member_name: str
    member_identifier: str | None = None


class TeamMemberResponse(TeamMemberBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class TeamCreate(BaseModel):
    id: str | None = None  # e.g. "T01"
    team_name: str = Field(..., min_length=1, max_length=128)
    team_code: str = Field(..., min_length=2, max_length=32)
    description: str | None = None
    team_leader: str | None = None
    member_count: int = Field(default=4, ge=1)
    status: Literal["active", "inactive"] = "active"
    members: list[str] | None = None  # list of member names


class TeamUpdate(BaseModel):
    team_name: str | None = None
    team_code: str | None = None
    description: str | None = None
    team_leader: str | None = None
    member_count: int | None = None
    status: Literal["active", "inactive"] | None = None
    members: list[str] | None = None


class TeamStatusUpdate(BaseModel):
    status: Literal["active", "inactive"]


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    team_name: str
    team_code: str
    description: str | None = None
    team_leader: str | None = None
    member_count: int
    status: str
    created_at: datetime
    updated_at: datetime
    member_names: list[str] = []
    sessions_participated: int = 0


# ── Question Schemas ───────────────────────────────────────────────────────────

class QuestionImageSchema(BaseModel):
    id: str
    name: str
    dataUrl: str
    size: int
    mimeType: str
    caption: str | None = None


class QuestionCreate(BaseModel):
    id: str | None = None
    game_type: Literal["guess-tech", "explain-without-naming"]
    title: str = Field(..., min_length=1, max_length=256)
    instructions: str | None = None
    content_type: Literal["text", "image", "multiple-images", "text-images"] = "text"
    text_content: str | None = None
    images_data: list[dict[str, Any]] | None = None

    secret_topic: str | None = None
    topic_description: str | None = None
    prohibited_words: list[str] | None = None
    admin_instructions: str | None = None
    estimated_time: int | None = None
    technology_category: str | None = None

    correct_answer: str = Field(..., min_length=1)
    accepted_answers: list[str] | None = None
    explanation: str | None = None

    difficulty: Literal["easy", "medium", "hard"] = "medium"
    question_order: int = 1
    status: Literal["ready", "draft", "archived"] = "draft"


class QuestionUpdate(BaseModel):
    game_type: Literal["guess-tech", "explain-without-naming"] | None = None
    title: str | None = None
    instructions: str | None = None
    content_type: Literal["text", "image", "multiple-images", "text-images"] | None = None
    text_content: str | None = None
    images_data: list[dict[str, Any]] | None = None

    secret_topic: str | None = None
    topic_description: str | None = None
    prohibited_words: list[str] | None = None
    admin_instructions: str | None = None
    estimated_time: int | None = None
    technology_category: str | None = None

    correct_answer: str | None = None
    accepted_answers: list[str] | None = None
    explanation: str | None = None

    difficulty: Literal["easy", "medium", "hard"] | None = None
    question_order: int | None = None
    status: Literal["ready", "draft", "archived"] | None = None


class AdminQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    game_type: str
    title: str
    instructions: str | None = None
    content_type: str
    text_content: str | None = None
    images_data: list[dict[str, Any]] | None = None

    secret_topic: str | None = None
    topic_description: str | None = None
    prohibited_words: list[str] | None = None
    admin_instructions: str | None = None
    estimated_time: int | None = None
    technology_category: str | None = None

    correct_answer: str
    accepted_answers: list[str] | None = None
    explanation: str | None = None

    difficulty: str
    question_order: int
    status: str
    created_at: datetime
    updated_at: datetime


class ParticipantQuestionResponse(BaseModel):
    """Public participant response model strictly omitting confidential answers."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    game_type: str
    title: str
    instructions: str | None = None
    content_type: str
    text_content: str | None = None
    images_data: list[dict[str, Any]] | None = None
    difficulty: str
    question_order: int

    # For Explain Without Naming: only included if the requesting participant is the explaining team
    secret_topic: str | None = None
    prohibited_words: list[str] | None = None
    topic_description: str | None = None
    is_explaining_team: bool = False


# ── Game Session Schemas ───────────────────────────────────────────────────────

class GameRulesSchema(BaseModel):
    maxEligibleTeams: int = 3
    answerSubmission: str = "eligible_only"
    correctAnswerReveal: str = "manual"
    questionProgression: str = "manual"
    scoreboardVisibility: str = "hidden"
    questionTimerSeconds: int | None = 60
    enableBuzzer: bool = True


class SessionCreate(BaseModel):
    id: str | None = None
    session_name: str = Field(..., min_length=1, max_length=256)
    description: str | None = None
    game_type: Literal["guess-tech", "explain-without-naming"]
    status: Literal["draft", "ready"] = "draft"
    scheduled_at: str | None = None
    question_ids: list[str] = Field(default_factory=list)
    team_ids: list[str] = Field(default_factory=list)
    game_rules: dict[str, Any] | None = None


class SessionUpdate(BaseModel):
    session_name: str | None = None
    description: str | None = None
    game_type: Literal["guess-tech", "explain-without-naming"] | None = None
    status: Literal["draft", "ready", "live", "completed", "cancelled"] | None = None
    scheduled_at: str | None = None
    question_ids: list[str] | None = None
    team_ids: list[str] | None = None
    game_rules: dict[str, Any] | None = None


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_code: str
    session_name: str
    description: str | None = None
    game_type: str
    status: str
    scheduled_at: str | None = None
    game_rules: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
    question_ids: list[str] = []
    team_ids: list[str] = []
    total_questions: int = 0


# ── Participant Schemas ────────────────────────────────────────────────────────

class ParticipantJoinRequest(BaseModel):
    session_code: str = Field(..., min_length=2, max_length=32)
    team_code: str = Field(..., min_length=2, max_length=32)


class ParticipantJoinResponse(BaseModel):
    session_id: str
    session_code: str
    session_name: str
    game_type: str
    session_status: str
    team_id: str
    team_name: str
    team_code: str
    participating_teams_count: int
    total_questions_count: int
    participant_token: str
