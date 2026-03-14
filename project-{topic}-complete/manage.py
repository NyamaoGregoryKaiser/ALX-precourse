```python
import os
import click
from flask_migrate import upgrade, migrate, init as migrate_init
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app import create_app
from app.extensions import db
from app.models import user, project, task, comment # Import models to ensure they are registered with SQLAlchemy

# Determine environment and load appropriate config
FLASK_ENV = os.environ.get('FLASK_ENV', 'development')
if FLASK_ENV == 'production':
    from app.config import ProductionConfig as Config
elif FLASK_ENV == 'testing':
    from app.config import TestingConfig as Config
else:
    from app.config import DevelopmentConfig as Config

app = create_app(Config)

@app.shell_context_processor
def make_shell_context():
    return dict(app=app, db=db, User=user.User, Project=project.Project, Task=task.Task, Comment=comment.Comment)

@app.cli.group()
def db_commands():
    """Database management commands."""
    pass

@db_commands.command()
@click.option('--rev-id', default=None, help='Revision identifier to migrate to.')
def upgrade_db(rev_id):
    """Upgrade database to a specific revision or head."""
    with app.app_context():
        if not os.path.exists('migrations'):
            click.echo("Migrations folder not found. Initializing migrations...")
            migrate_init()
        upgrade(revision=rev_id if rev_id else 'head')
        click.echo("Database upgraded.")

@db_commands.command()
@click.option('-m', '--message', required=True, help='Migration message.')
def migrate_db(message):
    """Generate a new database migration."""
    with app.app_context():
        if not os.path.exists('migrations'):
            click.echo("Migrations folder not found. Initializing migrations...")
            migrate_init()
        migrate(message=message)
        click.echo(f"Migration '{message}' created.")

@db_commands.command()
def init_db():
    """Initializes a new migrations directory."""
    with app.app_context():
        if not os.path.exists('migrations'):
            migrate_init()
            click.echo("Migrations directory initialized.")
        else:
            click.echo("Migrations directory already exists.")

@app.cli.command()
@click.option('--force', is_flag=True, help='Drop all tables before seeding.')
def seed(force):
    """Seed the database with initial data."""
    from seed_db import seed_initial_data
    with app.app_context():
        seed_initial_data(force_recreate=force)
        click.echo("Database seeded.")

@app.cli.command("run-tests")
def run_tests():
    """Run unit and integration tests using pytest."""
    import pytest
    pytest.main(['tests'])

if __name__ == '__main__':
    # For development, `flask run` uses this.
    # For production, gunicorn calls `manage:app` directly.
    app.run(host='0.0.0.0', port=5000)
```