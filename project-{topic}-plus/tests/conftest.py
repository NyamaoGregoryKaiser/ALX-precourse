import pytest
import os
from dotenv import load_dotenv

# Load environment variables for tests
load_dotenv(override=True)

# Ensure FLASK_ENV is set for testing
os.environ['FLASK_ENV'] = 'testing'
os.environ['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:' # Use in-memory SQLite for tests
os.environ['SECRET_KEY'] = 'test_secret_key'
os.environ['JWT_SECRET_KEY'] = 'test_jwt_secret_key'
os.environ['JWT_ACCESS_TOKEN_EXPIRES_MINUTES'] = '1' # Shorter expiry for testing
os.environ['REDIS_URL'] = 'redis://localhost:6379/1' # Use a different Redis DB for testing if possible
os.environ['CACHE_TYPE'] = 'simple' # Use simple cache for tests to avoid external dependency

from app import create_app, db, jwt, cache
from app.models import User, Task, Role, REVOKED_TOKENS
from app.services.auth_service import AuthService

@pytest.fixture(scope='session')
def app():
    """Fixture for the Flask application, configured for testing."""
    app = create_app('development') # Use development config for testing setup
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'JWT_SECRET_KEY': 'test_jwt_secret_key',
        'SECRET_KEY': 'test_secret_key',
        'CACHE_TYPE': 'simple', # Use simple cache for tests
        'RATELIMIT_ENABLED': False # Disable rate limiting for tests for predictability
    })

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='function')
def client(app):
    """Fixture for a test client."""
    return app.test_client()

@pytest.fixture(scope='function')
def init_database(app):
    """Fixture to clear and re-create database for each test function."""
    with app.app_context():
        db.drop_all()
        db.create_all()
        # Clear revoked tokens for each test
        REVOKED_TOKENS.clear()
        yield db
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='function')
def seed_users(init_database):
    """Fixture to seed initial users."""
    db_instance = init_database # Ensure database is initialized
    admin = User(username='admin_test', email='admin_test@example.com', role=Role.ADMIN)
    admin.set_password('password')
    user1 = User(username='user1_test', email='user1_test@example.com', role=Role.USER)
    user1.set_password('password')
    user2 = User(username='user2_test', email='user2_test@example.com', role=Role.USER)
    user2.set_password('password')

    db_instance.session.add_all([admin, user1, user2])
    db_instance.session.commit()

    return {
        'admin': admin,
        'user1': user1,
        'user2': user2
    }

@pytest.fixture(scope='function')
def auth_tokens(client, seed_users):
    """Fixture to get JWT tokens for seeded users."""
    tokens = {}
    users = seed_users
    
    # Login admin
    admin_login_res = client.post('/api/auth/login', json={'username': users['admin'].username, 'password': 'password'})
    tokens['admin'] = admin_login_res.json

    # Login user1
    user1_login_res = client.post('/api/auth/login', json={'username': users['user1'].username, 'password': 'password'})
    tokens['user1'] = user1_login_res.json

    # Login user2
    user2_login_res = client.post('/api/auth/login', json={'username': users['user2'].username, 'password': 'password'})
    tokens['user2'] = user2_login_res.json
    
    return tokens

@pytest.fixture(scope='function')
def admin_auth_header(auth_tokens):
    """Fixture for admin authorization header."""
    return {'Authorization': f"Bearer {auth_tokens['admin']['access_token']}"}

@pytest.fixture(scope='function')
def user1_auth_header(auth_tokens):
    """Fixture for user1 authorization header."""
    return {'Authorization': f"Bearer {auth_tokens['user1']['access_token']}"}

@pytest.fixture(scope='function')
def user2_auth_header(auth_tokens):
    """Fixture for user2 authorization header."""
    return {'Authorization': f"Bearer {auth_tokens['user2']['access_token']}"}

@pytest.fixture(scope='function')
def seed_tasks(init_database, seed_users):
    """Fixture to seed tasks."""
    db_instance = init_database
    users = seed_users

    admin = users['admin']
    user1 = users['user1']
    user2 = users['user2']

    task1 = Task(title='Admin Task 1', description='Task by admin for admin', created_by_id=admin.id, assigned_to_id=admin.id, status=TaskStatus.PENDING)
    task2 = Task(title='Admin Task 2', description='Task by admin for user1', created_by_id=admin.id, assigned_to_id=user1.id, status=TaskStatus.IN_PROGRESS)
    task3 = Task(title='User1 Task 1', description='Task by user1 for user1', created_by_id=user1.id, assigned_to_id=user1.id, status=TaskStatus.COMPLETED)
    task4 = Task(title='User1 Task 2', description='Task by user1 for user2', created_by_id=user1.id, assigned_to_id=user2.id, status=TaskStatus.PENDING)
    task5 = Task(title='User2 Task 1', description='Task by user2 for user1', created_by_id=user2.id, assigned_to_id=user1.id, status=TaskStatus.PENDING)
    task6 = Task(title='User2 Task 2', description='Task by user2 for user2', created_by_id=user2.id, assigned_to_id=user2.id, status=TaskStatus.IN_PROGRESS)

    db_instance.session.add_all([task1, task2, task3, task4, task5, task6])
    db_instance.session.commit()

    return {
        'task1': task1,
        'task2': task2,
        'task3': task3,
        'task4': task4,
        'task5': task5,
        'task6': task6
    }
```