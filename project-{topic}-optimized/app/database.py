from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session

db = SQLAlchemy()

# For Alembic migrations, we need a way to access the engine directly
# without a Flask app context sometimes.
# This setup is mostly for models.
# For migrations, Alembic's env.py handles the engine creation.
# It's good practice to ensure db.metadata is imported in app.models.__init__.py
# so Alembic can discover all models.