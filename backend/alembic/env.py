"""Alembic environment configuration for SQLite migrations."""

import os
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import get_settings
from app.core.database import Base
# Import all models so metadata discovers tables
import app.models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

settings = get_settings()
db_url = settings.database_url

# Handle relative SQLite path in alembic
if db_url.startswith("sqlite"):
    raw_path = db_url.replace("sqlite:///", "").replace("sqlite://", "")
    if raw_path and raw_path != ":memory:":
        backend_dir = Path(__file__).resolve().parent.parent
        if not os.path.isabs(raw_path):
            abs_db_path = (backend_dir / raw_path).resolve()
            abs_db_path.parent.mkdir(parents=True, exist_ok=True)
            db_url = f"sqlite:///{abs_db_path.as_posix()}"

config.set_main_option("sqlalchemy.url", db_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,  # Crucial for SQLite ALTER TABLE support
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # Crucial for SQLite ALTER TABLE support
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
