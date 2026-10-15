"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.live_game import router as live_game_router
from app.api.participant import router as participant_router
from app.api.questions import router as questions_router
from app.api.sessions import router as sessions_router
from app.api.teams import router as teams_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description=(
        "Backend API for the Fun & Technical Activity Platform with SQLite, "
        "authentication, questions, teams, sessions, participant, and live game endpoints."
    ),
    version="0.7.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(questions_router, prefix=settings.api_prefix)
app.include_router(teams_router, prefix=settings.api_prefix)
app.include_router(sessions_router, prefix=settings.api_prefix)
app.include_router(participant_router, prefix=settings.api_prefix)
app.include_router(live_game_router, prefix=settings.api_prefix)


@app.get("/")
def root() -> dict[str, str]:
    """Root welcome message pointing developers to docs and health."""
    return {
        "message": settings.app_name,
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
    }
