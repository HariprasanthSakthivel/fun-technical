"""Pydantic schemas for request validation and response models in Fun Friday Activities Platform."""

from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field


# ── Auth & User Schemas ────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=64)
    display_name: str = Field(..., min_length=2, max_length=128)
    password: str = Field(..., min_length=4)
    email: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    display_name: str
    role: str
    team_id: str | None = None
    team_name: str | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    email: str | None = None
    role: str
    is_active: bool
    is_logged_in: bool
    last_login_at: datetime | None = None
    team_id: str | None = None
    team_name: str | None = None


# ── Team Schemas ───────────────────────────────────────────────────────────────

class TeamMemberInfo(BaseModel):
    id: int
    username: str
    display_name: str


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    team_name: str
    team_code: str
    tech_detective_score: int
    lightning_talks_score: int
    total_score: int
    rank: int
    members: list[TeamMemberInfo] = []


class TeamNameUpdate(BaseModel):
    team_name: str = Field(..., min_length=1, max_length=128)


class RandomizeTeamsRequest(BaseModel):
    team_size: int = Field(default=2, ge=2, le=50, description="Target number of members per team")
    include_all: bool = Field(default=False, description="If True, includes all registered participants, even if offline")



# ── Game 1: Tech Detective Schemas ─────────────────────────────────────────────

class TechDetectiveImage(BaseModel):
    id: int
    url: str
    caption: str | None = None


class QuestionCreateRequest(BaseModel):
    question_number: int = Field(..., ge=1)
    title: str = Field(..., min_length=1, max_length=256)
    technology_name: str = Field(..., min_length=1, max_length=128)
    images: list[str] = Field(..., min_length=1, max_length=10, description="1 image URL or Base64 data URL")
    accepted_answers: list[str] = []
    points: int = Field(default=10, ge=1, le=100)
    deduction: int = Field(default=2, ge=0, le=50)


class QuestionUpdateRequest(BaseModel):
    title: str | None = None
    technology_name: str | None = None
    images: list[str] | None = None
    accepted_answers: list[str] | None = None
    points: int | None = None
    deduction: int | None = None


class TechDetectiveQuestionAdminResponse(BaseModel):
    id: str
    question_number: int
    title: str
    technology_name: str
    images: list[dict[str, Any]]
    accepted_answers: list[str]
    clue_description: str | None = None
    points: int = 10
    deduction: int = 2
    is_unlocked: bool
    unlocked_at: datetime | None = None
    is_completed: bool


class TechDetectiveQuestionParticipantResponse(BaseModel):
    """Participant view: answers and secret solutions are completely stripped."""
    id: str
    question_number: int
    title: str
    images: list[dict[str, Any]]
    points: int = 10
    is_unlocked: bool


class QuestionWiseTeamScore(BaseModel):
    team_id: str
    team_name: str
    question_scores: dict[str, int]  # e.g. {"1": 10, "2": -2}
    total_score: int


class QuestionWiseScoreResponse(BaseModel):
    questions: list[dict[str, Any]]  # [{"question_number": 1, "points": 10}, ...]
    team_scores: list[QuestionWiseTeamScore]


class BuzzerEntry(BaseModel):
    id: int
    team_id: str
    team_name: str
    position: int
    pressed_at: datetime


class BuzzerQueueResponse(BaseModel):
    question_id: str
    is_buzzer_open: bool
    buzzers: list[BuzzerEntry]
    current_answering_team_id: str | None = None
    current_answering_position: int | None = None


class EvaluateAnswerRequest(BaseModel):
    team_id: str
    buzzer_position: int = Field(..., ge=1, le=3)
    is_correct: bool
    answer_text: str | None = ""


class TechDetectiveLeaderboardEntry(BaseModel):
    rank: int
    team_id: str
    team_name: str
    score: int


class EditTechScoreRequest(BaseModel):
    score: int


# ── Game 2: Lightning Talks Schemas ────────────────────────────────────────────

class LightningTopicAdminResponse(BaseModel):
    id: str
    topic_name: str
    description: str | None = None
    prohibited_words: list[str] = []
    assigned_user_id: int | None = None
    assigned_user_name: str | None = None
    assigned_team_id: str | None = None
    assigned_team_name: str | None = None
    is_unlocked: bool
    unlocked_at: datetime | None = None
    duration_seconds: int = 60


class LightningTopicParticipantResponse(BaseModel):
    """Topic information provided to active speaker or audience."""
    id: str
    topic_name: str
    description: str | None = None
    prohibited_words: list[str] = []
    is_unlocked: bool
    duration_seconds: int = 60
    is_my_turn: bool = True
    active_speaker_name: str | None = None
    active_speaker_team: str | None = None


class EvaluateLightningSpeechRequest(BaseModel):
    user_id: int
    team_id: str
    topic_id: str
    time_management_score: int = Field(..., ge=0, le=10, description="How effectively participant used the 1 minute")
    words_used_score: int = Field(..., ge=0, le=10, description="Vocabulary used & avoided saying topic name")
    understandability_score: int = Field(..., ge=0, le=10, description="Clarity and comprehensibility")
    admin_notes: str | None = None


class ManualTopicAssignRequest(BaseModel):
    user_id: int
    team_id: str
    topic_name: str = Field(..., min_length=1, max_length=256)
    description: str | None = None
    prohibited_words: list[str] = []


class CreateTopicRequest(BaseModel):
    topic_name: str = Field(..., min_length=1, max_length=256)
    description: str | None = None
    prohibited_words: list[str] = []
    assigned_user_id: int | None = None
    assigned_team_id: str | None = None


class LightningLeaderboardEntry(BaseModel):
    rank: int
    team_id: str
    team_name: str
    score: int


class EditLightningScoreRequest(BaseModel):
    score: int


# ── Final Combined Leaderboard Schemas ─────────────────────────────────────────

class FinalLeaderboardEntry(BaseModel):
    rank: int
    team_id: str
    team_name: str
    tech_detective_score: int
    lightning_talks_score: int
    total_score: int


class EditFinalScoreRequest(BaseModel):
    tech_detective_score: int | None = None
    lightning_talks_score: int | None = None


# ── Synchronized Dynamic Timer Schemas ─────────────────────────────────────────

class GameTimerResponse(BaseModel):
    total_duration: int
    seconds_remaining: float
    is_running: bool
    end_time: float | None = None
    game: str = "all"
    current_game: str = "lobby"


class GameTimerControlRequest(BaseModel):
    action: Literal["start", "pause", "resume", "reset", "set_duration", "add_time"]
    duration_seconds: int | None = None
    game: str | None = None


# ── Dynamic Game Catalog & Custom Activities Schemas ──────────────────────────

class GameResponse(BaseModel):
    id: str
    game_code: str
    title: str
    subtitle: str | None = None
    description: str | None = None
    game_type: str = "custom"
    icon: str = "gamepad"
    default_timer_seconds: int = 60
    rules: list[str] = []
    is_active: bool = True
    order_index: int = 1
    question_count: int = 0
    created_at: datetime | None = None


class CreateGameRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=128)
    game_code: str | None = None
    subtitle: str | None = None
    description: str | None = None
    game_type: str = Field(default="custom", description="buzzer, speech, trivia, challenge, custom")
    icon: str = Field(default="gamepad", description="gamepad, zap, mic, code, trophy, lightbulb, flame")
    default_timer_seconds: int = Field(default=60, ge=10, le=1800)
    rules: list[str] = []
    is_active: bool = True


class UpdateGameRequest(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    description: str | None = None
    game_type: str | None = None
    icon: str | None = None
    default_timer_seconds: int | None = None
    rules: list[str] | None = None
    is_active: bool | None = None


class AwardGameScoreRequest(BaseModel):
    team_id: str
    game_code: str
    score: int
    is_incremental: bool = False  # If true, adds score to existing; if false, sets absolute score
    notes: str | None = None


class TeamGameScoreResponse(BaseModel):
    team_id: str
    team_name: str
    game_code: str
    score: int
    total_team_score: int


class TeamGameScoreDetailResponse(BaseModel):
    id: int
    team_id: str
    game_code: str
    score: int
    notes: str | None = None
    updated_at: str | None = None


class GameQuestionResponse(BaseModel):
    id: str
    game_id: str
    game_code: str
    question_number: int
    title: str
    description: str | None = None
    question_type: str = "quiz"
    options: list[str] = []
    correct_answer: str | None = None
    accepted_answers: list[str] = []
    image_url: str | None = None
    media_type: str = "none"
    media_url: str | None = None
    points: int = 10
    deduction: int = 0
    time_limit_seconds: int | None = 60
    is_unlocked: bool = False
    unlocked_at: datetime | None = None
    is_completed: bool = False
    is_buzzer_open: bool = False
    current_answering_team_id: str | None = None
    current_answering_position: int | None = None
    created_at: datetime


class EvaluateCustomGameAnswerRequest(BaseModel):
    question_id: str
    team_id: str
    buzzer_position: int = Field(..., ge=1, le=3)
    is_correct: bool
    answer_text: str | None = ""


class CreateGameQuestionRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=256)
    question_number: int | None = None
    description: str | None = None
    question_type: str = "quiz"
    options: list[str] = []
    correct_answer: str | None = None
    accepted_answers: list[str] = []
    image_url: str | None = None
    media_type: str = "none"
    media_url: str | None = None
    points: int = 10
    deduction: int = 0
    time_limit_seconds: int | None = 60


class UpdateGameQuestionRequest(BaseModel):
    title: str | None = None
    question_number: int | None = None
    description: str | None = None
    question_type: str | None = None
    options: list[str] | None = None
    correct_answer: str | None = None
    accepted_answers: list[str] | None = None
    image_url: str | None = None
    media_type: str | None = None
    media_url: str | None = None
    points: int | None = None
    deduction: int | None = None
    time_limit_seconds: int | None = None



