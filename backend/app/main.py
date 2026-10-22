"""FastAPI application entry point for Fun Friday Activities Platform."""

import re
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.games import router as games_router
from app.api.health import router as health_router
from app.api.leaderboard import router as leaderboard_router
from app.api.lightning_talks import router as lightning_talks_router
from app.api.teams import router as teams_router
from app.api.tech_detective import router as tech_detective_router
from app.api.timer import router as timer_router
from app.core.config import get_settings
from app.core.database import Base, engine, ensure_schema_migrations
from app.core.exceptions import register_exception_handlers

settings = get_settings()

# Auto-create all tables on startup if not already created, then ensure any new columns exist
Base.metadata.create_all(bind=engine)
ensure_schema_migrations(engine)

# Ensure local media directory exists and is mounted
MEDIA_DIR = Path(__file__).resolve().parent.parent / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Fun Friday Activities Platform",
    description=(
        "Backend API for Fun Friday Activities Platform: "
        "Participant login & management, random team formation, "
        "Game 1 (Tech Detective with image clues & buzzer race), "
        "Game 2 (Lightning Talks speaking activity), and Final Combined Leaderboard."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|\[::1\]|.*\.devtunnels\.ms|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def normalize_slashes_middleware(request: Request, call_next):
    """Normalize multiple slashes in path (e.g. //api/auth/login -> /api/auth/login)."""
    path = request.scope.get("path", "")
    if "//" in path:
        request.scope["path"] = re.sub(r"/+", "/", path)
    return await call_next(request)

register_exception_handlers(app)

app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(teams_router, prefix=settings.api_prefix)
app.include_router(tech_detective_router, prefix=settings.api_prefix)
app.include_router(lightning_talks_router, prefix=settings.api_prefix)
app.include_router(leaderboard_router, prefix=settings.api_prefix)
app.include_router(timer_router, prefix=settings.api_prefix)
app.include_router(games_router, prefix=settings.api_prefix)

app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")



@app.get("/")
def root() -> dict[str, str]:
    """Root welcome message pointing developers to docs and health."""
    return {
        "message": "Fun Friday Activities Platform",
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
    }
