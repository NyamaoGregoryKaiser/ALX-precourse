```python
import pytest
from performance_monitor import create_app
from performance_monitor.extensions import db
from performance_monitor.models import User, Service, Endpoint, Metric
from performance_monitor.auth import REVOKED_TOKENS
from flask_jwt_extended import create_access_token, JWTManager
import os
import alembic.command
import alembic.config

@pytest.fixture(scope='session')
def app():
    """Create and configure a new app instance for each test session."""
    os.environ['FLASK_CONFIG'] = 'testing' # Ensure testing config is loaded
    app = create_app('testing')

    with app.app_context():
        # Setup Alembic configuration for testing database
        alembic_cfg = alembic.config.Config("alembic.ini")
        alembic_cfg.set_main_option("script_location", "migrations")
        alembic_cfg.set_main_option("sqlalchemy.url", app.config['SQLALCHEMY_DATABASE_URI'])

        # Drop and re-create all tables using Alembic for a clean slate
        # This ensures the test DB schema is always up-to-date and clean
        alembic.command.downgrade(alembic_cfg, "base")
        alembic.command.upgrade(alembic_cfg, "head")

        # Clear revoked tokens for a clean start
        REVOKED_TOKENS.clear()

        yield app

        # Teardown: drop all tables after tests
        alembic.command.downgrade(alembic_cfg, "base")
        db.session.remove() # Close session

@pytest.fixture(scope='function')
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture(scope='function')
def runner(app):
    """A cli runner for the app."""
    return app.test_cli_runner()

@pytest.fixture(scope='function')
def db_session(app):
    """Provides a fresh database session for each test function."""
    with app.app_context():
        connection = db.engine.connect()
        transaction = connection.begin()
        db.session.configure(bind=connection)
        
        # Optionally clean up data created during the test if not rolling back
        # For simplicity, we rollback everything.
        
        yield db.session

        transaction.rollback() # Rollback all changes
        connection.close()
        db.session.remove()

@pytest.fixture(scope='function')
def auth_tokens(app, db_session):
    """
    Fixture to create and authenticate a test user, returning their tokens.
    Creates an admin and a regular user.
    """
    with app.app_context():
        # Clear existing users to ensure fresh start
        db_session.query(User).delete()
        db_session.commit()

        # Create an admin user
        admin_user = User(username='admin_test', email='admin_test@example.com', is_admin=True)
        admin_user.set_password('admin_password')
        db_session.add(admin_user)

        # Create a regular user
        regular_user = User(username='user_test', email='user_test@example.com', is_admin=False)
        regular_user.set_password('user_password')
        db_session.add(regular_user)
        db_session.commit()

        # Generate tokens for both users
        with app.test_request_context():
            admin_access_token = create_access_token(identity=admin_user.id, user_claims={'is_admin': admin_user.is_admin})
            regular_access_token = create_access_token(identity=regular_user.id, user_claims={'is_admin': regular_user.is_admin})

        return {
            'admin_user': admin_user,
            'admin_headers': {'Authorization': f'Bearer {admin_access_token}'},
            'regular_user': regular_user,
            'regular_headers': {'Authorization': f'Bearer {regular_access_token}'},
        }

```