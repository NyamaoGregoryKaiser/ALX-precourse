```python
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to values within the .ini file in use.
config = context.config

# Interpret the config file for Python's standard logging.
# This ensures that loggers are properly configured.
fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
from app.extensions import db
from app.models.user import User # Import models to ensure they are registered with SQLAlchemy's metadata
from app.models.category import Category
from app.models.post import Post, post_media
from app.models.media import Media, MediaType
target_metadata = db.Model.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired a la:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

def get_db_url():
    """
    Get the database URL from environment variables,
    respecting Flask's configuration.
    """
    from dotenv import load_dotenv
    load_dotenv() # Load .env file
    return os.environ.get('DATABASE_URL', 'postgresql://user:password@localhost:5432/cms_db')

def run_migrations_offline():
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is still acceptable
    here as it will be used to derive the dialect later.

    When completing migrations in 'autogenerate' mode, this is
    usually not needed, however, if you are performing manual
    migrations and need to produce an empty script, you might
    find this useful.

    The target_metadata is set here to ensure that Alembic
    can compare the database schema against the models defined.
    """
    url = get_db_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode.

    In this scenario, we need to create an Engine
    and associate a connection with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        url=get_db_url(), # Pass the dynamically obtained URL
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True # Crucial for detecting type changes in autogenerate
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

```