"""SQLite database engine, foreign key enforcement, session lifecycle, and automatic directory creation."""

import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# Resolve SQLite URL and ensure target directory exists
db_url = settings.database_url

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

    # Extract SQLite file path to ensure parent directory exists
    # URLs like sqlite:///./data/fun_tech_activity.db or sqlite:////abs/path
    raw_path = db_url.replace("sqlite:///", "").replace("sqlite://", "")
    if raw_path and raw_path != ":memory:":
        # Handle relative path from backend directory
        backend_dir = Path(__file__).resolve().parent.parent.parent
        if not os.path.isabs(raw_path):
            abs_db_path = (backend_dir / raw_path).resolve()
            # Canonicalize sqlite URL with resolved absolute path for cross-directory consistency
            db_url = f"sqlite:///{abs_db_path.as_posix()}"
            abs_db_path.parent.mkdir(parents=True, exist_ok=True)
        else:
            Path(raw_path).parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)


# Enforce SQLite foreign keys
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in settings.database_url:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all application models."""


def ensure_schema_migrations(target_engine: Engine = engine) -> None:
    """Ensure newly added columns are present in SQLite without requiring external migration CLI."""
    if "sqlite" not in settings.database_url:
        return
    with target_engine.connect() as conn:
        try:
            result = conn.exec_driver_sql("PRAGMA table_info(game_state)")
            columns = [row[1] for row in result.fetchall()]
            if columns:  # table exists
                if "timer_total_duration" not in columns:
                    conn.exec_driver_sql("ALTER TABLE game_state ADD COLUMN timer_total_duration INTEGER DEFAULT 60")
                if "timer_seconds_remaining" not in columns:
                    conn.exec_driver_sql("ALTER TABLE game_state ADD COLUMN timer_seconds_remaining REAL DEFAULT 60.0")
                if "timer_is_running" not in columns:
                    conn.exec_driver_sql("ALTER TABLE game_state ADD COLUMN timer_is_running BOOLEAN DEFAULT 0")
                if "timer_end_time" not in columns:
                    conn.exec_driver_sql("ALTER TABLE game_state ADD COLUMN timer_end_time REAL DEFAULT NULL")
                if "timer_game" not in columns:
                    conn.exec_driver_sql("ALTER TABLE game_state ADD COLUMN timer_game VARCHAR(64) DEFAULT 'all'")
                conn.commit()

            q_res = conn.exec_driver_sql("PRAGMA table_info(game_questions)")
            q_cols = [row[1] for row in q_res.fetchall()]
            if q_cols:
                if "media_type" not in q_cols:
                    conn.exec_driver_sql("ALTER TABLE game_questions ADD COLUMN media_type VARCHAR(32) DEFAULT 'none'")
                if "media_url" not in q_cols:
                    conn.exec_driver_sql("ALTER TABLE game_questions ADD COLUMN media_url TEXT DEFAULT NULL")
                if "is_completed" not in q_cols:
                    conn.exec_driver_sql("ALTER TABLE game_questions ADD COLUMN is_completed BOOLEAN DEFAULT 0")
                if "is_buzzer_open" not in q_cols:
                    conn.exec_driver_sql("ALTER TABLE game_questions ADD COLUMN is_buzzer_open BOOLEAN DEFAULT 1")
                if "current_answering_team_id" not in q_cols:
                    conn.exec_driver_sql("ALTER TABLE game_questions ADD COLUMN current_answering_team_id VARCHAR(32) DEFAULT NULL")
                if "current_answering_position" not in q_cols:
                    conn.exec_driver_sql("ALTER TABLE game_questions ADD COLUMN current_answering_position INTEGER DEFAULT NULL")
                conn.commit()
                # Backfill media_url from image_url if image_url exists
                conn.exec_driver_sql("UPDATE game_questions SET media_url = image_url, media_type = 'image' WHERE media_url IS NULL AND image_url IS NOT NULL")
                conn.commit()
        except Exception:
            # Table might not exist yet before create_all
            pass


def get_db() -> Generator[Session, None, None]:
    """Yield a database session for FastAPI dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
