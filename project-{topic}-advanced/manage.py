import os
from flask_script import Manager
from flask_migrate import Migrate, MigrateCommand
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app import create_app
from app.database import db
from app.models import User, MonitoredDatabase, Metric, OptimizationTask, Report # Import models for Flask-Migrate

# Create app based on FLASK_ENV
app = create_app(os.getenv('FLASK_ENV', 'development'))

manager = Manager(app)
migrate = Migrate(app, db)

# Add Flask-Migrate commands
manager.add_command('db', MigrateCommand)

@manager.command
def test():
    """Runs the unit tests."""
    import pytest
    # Assuming pytest is installed and `tests` directory exists
    exit_code = pytest.main(['tests'])
    return exit_code

@manager.command
def seed_db():
    """Seeds the database with initial data."""
    with app.app_context():
        from app.cli import seed_database
        seed_database()
        print("Database seeded!")

@manager.command
def run_celery():
    """Runs the Celery worker."""
    from subprocess import call
    # This assumes 'celery' command is available in the environment
    # For Docker, this would typically be run in a separate container.
    print("Starting Celery worker...")
    call(['celery', '-A', 'app.tasks', 'worker', '-l', 'info'])

@manager.command
def run_celery_beat():
    """Runs the Celery beat scheduler."""
    from subprocess import call
    print("Starting Celery beat...")
    call(['celery', '-A', 'app.tasks', 'beat', '-l', 'info'])


if __name__ == '__main__':
    manager.run()
```