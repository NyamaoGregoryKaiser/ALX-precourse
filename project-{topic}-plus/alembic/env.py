```python
"""
Alembic environment script for asynchronous database migrations.

This script configures how Alembic interacts with your SQLAlchemy models
and the database for migrations. It is crucial for both synchronous and
asynchronous database setups.
"""

import asyncio
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlalchemy.ext.asyncio import AsyncEngine

from alembic import context

# this is the Alembic Config object, which provides
# access to values within the .ini file in use.
config = context.config

# Interpret the config file for Python's standard logging.
# This sets up loggers for 'alembic' itself and other components.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import Base
# target_metadata = Base.metadata
from app.models.base import Base
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is additionally needed
    for SQL execution set to run in 'autocommit' mode.

    By passing in an Engine directly here, we also provide begin/commit/rollback
    functions which are applied automatically to the context's available
    connection.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Added for auto-detection of enum types
        render_as_batch=True, # Recommended for PostgreSQL when using schema changes
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    """
    Runs database migrations with a given connection.
    This is called by both synchronous and asynchronous migration paths.
    """
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        # Added for auto-detection of enum types
        render_as_batch=True, # Recommended for PostgreSQL when using schema changes
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    # Override the sqlalchemy.url for async if needed,
    # or ensure the main config option is an async URL
    connectable = AsyncEngine(
        engine_from_config(
            config.get_section(config.config_ini_section, {}),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool, # No pooling needed for migration connection
            future=True,
        )
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())

```