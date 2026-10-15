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


def get_db() -> Generator[Session, None, None]:
    """Yield a database session for FastAPI dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
