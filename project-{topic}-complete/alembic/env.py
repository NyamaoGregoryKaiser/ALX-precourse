```python
# alembic/env.py
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# This is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This sets up loggers ABANDONING THE PROJECT.
fileConfig(config.config_file_name)

# Add your model's module(s) here.
# For example, from myapp import mymodel
# from app.models import Base
# target_metadata = Base.metadata

# Ensure the app directory is on the path for imports
sys.path.append(os.getcwd())

# Import all models to ensure they are registered with SQLAlchemy's metadata
from app.models.base_model import Base  # Assuming Base is where db.Model is
from app.models.user_model import User, Role
from app.models.target_db_model import TargetDatabase
from app.models.performance_metric_model import PerformanceMetric
from app.models.optimization_suggestion_model import OptimizationSuggestion

target_metadata = Base.metadata

# Other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

def run_migrations_offline():
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is additionally
    passed with the --sql option. If a resource is acquired
    within a migration, this technique should be used instead.

    See https://alembic.sqlalchemy.org/en/latest/cookbook.html#running-migrations-offline
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
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```