```python
import pytest
from app import create_app
from app.extensions import db
from app.config import TestingConfig
import os

# Set FLASK_ENV to testing for the test environment
os.environ['FLASK_ENV'] = 'testing'

@pytest.fixture(scope='session')
def app():
    """Create and configure a new app instance for each test session."""
    app = create_app(TestingConfig)
    with app.app_context():
        # Ensure that models are loaded
        from app.models import user, project, task, comment
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='function')
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture(scope='function')
def init_database(app):
    """
    Initialize a clean database for each test function.
    Rollback transactions to ensure clean state after each test.
    """
    with app.app_context():
        # Start a new transaction
        connection = db.engine.connect()
        transaction = connection.begin()
        db.session.begin_nested() # For nested transactions

        # Bind the session to the connection
        db.session = db.session(bind=connection)

        yield db

        # Rollback everything after the test
        db.session.remove()
        transaction.rollback()
        connection.close()

@pytest.fixture(scope='function')
def auth_tokens(client, init_database):
    """
    Registers an admin user and a regular user, then logs them in
    and returns their JWT access tokens and user IDs.
    """
    from app.models.user import User
    from app.services.user_service import UserService

    # Create admin user
    admin_data = {
        'username': 'testadmin',
        'email': 'testadmin@example.com',
        'password': 'adminpassword',
        'role': 'admin'
    }
    admin = UserService.create_user(admin_data)

    # Log in admin user
    res_admin = client.post('/api/auth/login', json={'username': 'testadmin', 'password': 'adminpassword'})
    admin_tokens = res_admin.get_json()
    admin_access_token = admin_tokens['access_token']

    # Create regular user
    user_data = {
        'username': 'testuser',
        'email': 'testuser@example.com',
        'password': 'userpassword',
        'role': 'user'
    }
    user = UserService.create_user(user_data)

    # Log in regular user
    res_user = client.post('/api/auth/login', json={'username': 'testuser', 'password': 'userpassword'})
    user_tokens = res_user.get_json()
    user_access_token = user_tokens['access_token']

    return {
        'admin_id': admin.id,
        'admin_token': admin_access_token,
        'user_id': user.id,
        'user_token': user_access_token
    }

@pytest.fixture(scope='function')
def sample_users(init_database):
    """Provides sample users."""
    from app.services.user_service import UserService
    admin = UserService.create_user({'username': 'admintest', 'email': 'admintest@example.com', 'password': 'password', 'role': 'admin'})
    manager = UserService.create_user({'username': 'managertest', 'email': 'managertest@example.com', 'password': 'password', 'role': 'manager'})
    user1 = UserService.create_user({'username': 'userone', 'email': 'userone@example.com', 'password': 'password', 'role': 'user'})
    user2 = UserService.create_user({'username': 'usertwo', 'email': 'usertwo@example.com', 'password': 'password', 'role': 'user'})
    return {
        'admin': admin,
        'manager': manager,
        'user1': user1,
        'user2': user2
    }

@pytest.fixture(scope='function')
def sample_projects(init_database, sample_users):
    """Provides sample projects."""
    from app.services.project_service import ProjectService
    project1 = ProjectService.create_project({
        'name': 'Project Alpha',
        'description': 'Description for Project Alpha',
        'manager_id': sample_users['manager'].id
    })
    project2 = ProjectService.create_project({
        'name': 'Project Beta',
        'description': 'Description for Project Beta',
        'manager_id': sample_users['admin'].id # Admin managing a project
    })
    return {
        'project1': project1,
        'project2': project2
    }

@pytest.fixture(scope='function')
def sample_tasks(init_database, sample_users, sample_projects):
    """Provides sample tasks."""
    from app.services.task_service import TaskService
    task1 = TaskService.create_task({
        'title': 'Task A for Alpha',
        'description': 'Description for Task A',
        'project_id': sample_projects['project1'].id,
        'creator_id': sample_users['manager'].id,
        'assigned_to_id': sample_users['user1'].id,
        'status': 'open',
        'priority': 'high'
    })
    task2 = TaskService.create_task({
        'title': 'Task B for Alpha',
        'description': 'Another task for Project Alpha',
        'project_id': sample_projects['project1'].id,
        'creator_id': sample_users['user1'].id,
        'assigned_to_id': sample_users['user2'].id,
        'status': 'in_progress',
        'priority': 'medium'
    })
    task3 = TaskService.create_task({
        'title': 'Task C for Beta',
        'description': 'Task for Project Beta',
        'project_id': sample_projects['project2'].id,
        'creator_id': sample_users['admin'].id,
        'assigned_to_id': sample_users['user1'].id,
        'status': 'done',
        'priority': 'low'
    })
    return {
        'task1': task1,
        'task2': task2,
        'task3': task3
    }

@pytest.fixture(scope='function')
def sample_comments(init_database, sample_users, sample_tasks):
    """Provides sample comments."""
    from app.services.task_service import TaskService
    comment1 = TaskService.add_comment_to_task(
        task_id=sample_tasks['task1'].id,
        content='Initial comment on Task A',
        author_id=sample_users['user1'].id
    )
    comment2 = TaskService.add_comment_to_task(
        task_id=sample_tasks['task1'].id,
        content='Second comment on Task A, for manager',
        author_id=sample_users['manager'].id
    )
    return {
        'comment1': comment1,
        'comment2': comment2
    }
```