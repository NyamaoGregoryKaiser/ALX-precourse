import asyncio
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import AsyncEngine

from alembic import context

# this is the Alembic Config object, which provides
# access to values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This sets up loggers accordingly.
fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
from app.db.base import Base # Import your Base
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

def run_migrations_offline():
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a database to begin with.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online():
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = config.get_section_by_name("alembic:async")
    if connectable is None:
        # Fallback to default sqlalchemy.url if alembic:async is not present
        connectable = config.get_section_by_name(config.config_ini_section)
        connectable["sqlalchemy.url"] = config.get_main_option("sqlalchemy.url")

    # Override with DATABASE_URL from environment if available (for Docker/CI)
    import os
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        connectable["sqlalchemy.url"] = db_url
    elif os.getenv("TEST_DATABASE_URL"): # For CI/CD
        connectable["sqlalchemy.url"] = os.getenv("TEST_DATABASE_URL")

    # Set the timezone to UTC for the database connection
    # This helps ensure consistency across different environments
    connectable["connect_args"] = {"server_settings": {"application_name": "Alembic", "timezone": "UTC"}}

    # Create an AsyncEngine
    engine = AsyncEngine(
        engine_from_config(
            connectable,
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
            future=True, # SQLAlchemy 2.0 style
        )
    )

    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```