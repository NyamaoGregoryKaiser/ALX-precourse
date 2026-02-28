import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# This is the Alembic Config object, which provides
# access to values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
fileConfig(config.config_file_name)

# Add your model's dir to the sys.path
sys.path.append(os.getcwd())

# Import your Flask application and database instance
from app import create_app
from app.database import db
from app.config import config_by_name

# This loads environment variables for Flask config
from dotenv import load_dotenv
load_dotenv()

# Get Flask environment
flask_env = os.getenv('FLASK_ENV', 'development')
app = create_app(flask_env)

# This sets up your models' metadata for Alembic to detect changes.
# It's important that all your models are imported in app.models.__init__.py
# so that db.metadata knows about them.
target_metadata = db.metadata

# Set the SQLAlchemy URL from Flask app config
# This ensures Alembic uses the same database URL as your Flask app.
config.set_main_option('sqlalchemy.url', app.config.get('SQLALCHEMY_DATABASE_URI'))


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


def run_migrations_online():
    """Run migrations in 'online' mode.

    In this scenario, we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()