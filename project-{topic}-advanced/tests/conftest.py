import pytest
import os
from app import create_app
from app.extensions import db, cache
from app.models import User, TokenBlacklist
from flask_jwt_extended import create_access_token, decode_token

# Set FLASK_ENV to 'testing' to load TestingConfig
os.environ['FLASK_ENV'] = 'testing'

@pytest.fixture(scope='session')
def app():
    """Fixture for the Flask application."""
    app = create_app('testing')
    with app.app_context():
        yield app

@pytest.fixture(scope='session')
def client(app):
    """Fixture for the Flask test client."""
    return app.test_client()

@pytest.fixture(scope='session')
def runner(app):
    """Fixture for the Flask test runner."""
    return app.test_cli_runner()

@pytest.fixture(scope='function')
def db_session(app):
    """
    Fixture that provides a clean database for each test function.
    Rolls back changes after each test.
    """
    with app.app_context():
        # Create all tables
        db.create_all()

        # Clear Redis cache
        cache.clear()

        yield db.session

        # Drop all tables
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='function')
def auth_header(db_session):
    """Fixture to generate an authenticated header for a default user."""
    with db_session.no_autoflush: # Avoid autoflush issues when creating test data
        user = User(username='testuser', email='test@example.com', password='password123', is_verified=True)
        db_session.add(user)
        db_session.commit()
        access_token = create_access_token(identity=user.id, additional_claims={"roles": [user.role]})
        return {'Authorization': f'Bearer {access_token}'}

@pytest.fixture(scope='function')
def admin_auth_header(db_session):
    """Fixture to generate an authenticated header for an admin user."""
    with db_session.no_autoflush:
        admin = User(username='adminuser', email='admin@example.com', password='adminpassword', role='admin', is_verified=True)
        db_session.add(admin)
        db_session.commit()
        access_token = create_access_token(identity=admin.id, additional_claims={"roles": [admin.role]})
        return {'Authorization': f'Bearer {access_token}'}

@pytest.fixture(scope='function')
def unverified_user(db_session):
    """Fixture for an unverified user."""
    user = User(username='unverified', email='unverified@example.com', password='password123', is_verified=False)
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture(scope='function')
def verified_user(db_session):
    """Fixture for a verified user."""
    user = User(username='verified', email='verified@example.com', password='password123', is_verified=True)
    db_session.add(user)
    db_session.commit()
    return user