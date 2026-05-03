import asyncio
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata

# Import your Base and models
from app.core.database import Base
from app.schemas.user import User # noqa
from app.schemas.project import Project # noqa
from app.schemas.task import Task # noqa

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

def run_migrations_offline():
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is additionally
    passed in a dictionary associate with the context
    in 'autogenerate' mode.

    When completing migrations in a SQLAlchemy 1.x / 2.0 environment,
    it is recommended that you use a Python database connector, rather
    than an external URL string.
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
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        # For SQLAlchemy 2.0 / async, this is crucial
        # enables detection of Column(Enum) changes correctly
        # See: https://alembic.sqlalchemy.org/en/latest/autogenerate.html#autogenerate-with-a-declarative-base
        # and: https://alembic.sqlalchemy.org/en/latest/autogenerate.html#autogenerate-with-a-declarative-base
        # from sqlalchemy.dialects import postgresql
        # context.configure(..., user_module_prefix='sa.', sqlalchemy_module_prefix='sa.')
        # We need to ensure that the SQLAlchemy types are properly reflected in the migration script.
        # For ENUM, `sqlalchemy.Enum` should be used.
        render_as_batch=True # For SQLite, or if you need to alter columns on PG.
    )

    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online():
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    # Override the default SQLAlchemy URL with the async one from settings
    # This is important for connecting with asyncpg
    from app.core.config import settings
    current_db_url = settings.get_database_url_for_env

    connectable = AsyncEngine(
        engine_from_config(
            config.get_section(config.config_ini_section),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
            url=current_db_url, # Use the async URL
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