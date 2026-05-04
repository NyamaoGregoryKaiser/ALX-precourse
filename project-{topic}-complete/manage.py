```python
# manage.py
import os
import click
from flask.cli import FlaskGroup
from app import create_app, db, migrate
from app.models.user_model import User, Role # Import models to be visible to Alembic
from app.models.target_db_model import TargetDatabase
from app.models.performance_metric_model import PerformanceMetric
from app.models.optimization_suggestion_model import OptimizationSuggestion
from seed import seed_data
from app.utils.logger import setup_logging

logger = setup_logging(__name__)

app = create_app()

@app.shell_context_processor
def make_shell_context():
    return dict(app=app, db=db, User=User, Role=Role, TargetDatabase=TargetDatabase,
                PerformanceMetric=PerformanceMetric, OptimizationSuggestion=OptimizationSuggestion)

@click.group(cls=FlaskGroup, create_app=create_app)
def cli():
    """Main entry point for DPA management commands."""
    pass

@cli.command("init-db")
def init_db_command():
    """Initializes or resets the database (clears all data)."""
    if os.getenv('FLASK_ENV') == 'production' and not click.confirm("Are you SURE you want to drop ALL data in production?"):
        logger.error("Database initialization aborted for production environment.")
        return
    db.drop_all()
    db.create_all()
    logger.info("Database initialized (all data dropped and recreated).")

@cli.command("migrate")
@click.argument("message")
def migrate_command(message):
    """Creates a new database migration."""
    try:
        os.system(f"alembic revision --autogenerate -m '{message}'")
        logger.info(f"Migration '{message}' created.")
    except Exception as e:
        logger.error(f"Error creating migration: {e}")

@cli.command("upgrade")
def upgrade_command():
    """Applies pending database migrations."""
    try:
        os.system("alembic upgrade head")
        logger.info("Database upgraded to latest revision.")
    except Exception as e:
        logger.error(f"Error upgrading database: {e}")

@cli.command("seed")
def seed_command():
    """Seeds the database with initial data."""
    seed_data()
    logger.info("Database seeded.")

if __name__ == '__main__':
    cli()
```