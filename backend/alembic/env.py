import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings
from app.db.base import Base

# Import all models here so Base.metadata knows about them
# Without this import, Alembic won't detect the 'videos' table
from app.models.video import Video  # noqa: F401

# Read alembic.ini logging config
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# This is what Alembic compares against the actual DB
target_metadata = Base.metadata

# Get the database URL from our Pydantic settings (not from alembic.ini)
settings = get_settings()


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    Generates SQL scripts without connecting to the DB.
    Useful for reviewing what SQL will be executed.
    """
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    """Run migrations using the provided connection."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Run migrations in 'online' mode with an async engine.

    Creates a temporary async engine, connects, runs migrations,
    then disposes the engine.
    """
    connectable = create_async_engine(
        settings.database_url,
        poolclass=pool.NullPool,  # Don't pool connections for migrations
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Entry point for online migrations — wraps the async version."""
    asyncio.run(run_async_migrations())


# Alembic calls one of these based on the --sql flag
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
