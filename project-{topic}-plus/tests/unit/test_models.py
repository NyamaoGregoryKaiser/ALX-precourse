import pytest
from app.models import User, Task, Role, TaskStatus
from datetime import datetime, timedelta

def test_user_creation(init_database):
    """Test creating a new user."""
    user = User(username='testuser', email='test@example.com', role=Role.USER)
    user.set_password('password123')
    init_database.session.add(user)
    init_database.session.commit()

    retrieved_user = User.query.filter_by(username='testuser').first()
    assert retrieved_user is not None
    assert retrieved_user.email == 'test@example.com'
    assert retrieved_user.check_password('password123')
    assert retrieved_user.role == Role.USER
    assert retrieved_user.created_at is not None
    assert retrieved_user.updated_at is not None

def test_user_password_hashing(init_database):
    """Test password hashing and checking."""
    user = User(username='hashuser', email='hash@example.com', role=Role.USER)
    user.set_password('strongpassword')
    init_database.session.add(user)
    init_database.session.commit()

    assert user.password_hash is not None
    assert user.check_password('strongpassword')
    assert not user.check_password('wrongpassword')

def test_user_to_dict(init_database):
    """Test User.to_dict() method."""
    user = User(username='dictuser', email='dict@example.com', role=Role.ADMIN)
    user.set_password('password')
    init_database.session.add(user)
    init_database.session.commit()

    user_dict = user.to_dict(include_email=True)
    assert 'id' in user_dict
    assert user_dict['username'] == 'dictuser'
    assert user_dict['email'] == 'dict@example.com'
    assert user_dict['role'] == 'admin'
    assert 'created_at' in user_dict
    assert 'updated_at' in user_dict

    user_dict_no_email = user.to_dict(include_email=False)
    assert 'email' not in user_dict_no_email

def test_user_is_admin(init_database):
    """Test is_admin method."""
    admin_user = User(username='admin', email='a@a.com', role=Role.ADMIN)
    regular_user = User(username='regular', email='r@r.com', role=Role.USER)

    assert admin_user.is_admin() is True
    assert regular_user.is_admin() is False

def test_task_creation(init_database, seed_users):
    """Test creating a new task."""
    user = seed_users['user1']
    due = datetime.utcnow() + timedelta(days=5)

    task = Task(
        title='New Task',
        description='This is a new task description.',
        status=TaskStatus.PENDING,
        due_date=due,
        created_by_id=user.id,
        assigned_to_id=user.id
    )
    init_database.session.add(task)
    init_database.session.commit()

    retrieved_task = Task.query.filter_by(title='New Task').first()
    assert retrieved_task is not None
    assert retrieved_task.description == 'This is a new task description.'
    assert retrieved_task.status == TaskStatus.PENDING
    assert retrieved_task.due_date.date() == due.date()
    assert retrieved_task.created_by_id == user.id
    assert retrieved_task.assigned_to_id == user.id
    assert retrieved_task.created_at is not None
    assert retrieved_task.updated_at is not None

def test_task_to_dict(init_database, seed_users):
    """Test Task.to_dict() method."""
    user = seed_users['user1']
    due = datetime.utcnow() + timedelta(days=10)

    task = Task(
        title='Dict Task',
        description='Description for dict task.',
        status=TaskStatus.IN_PROGRESS,
        due_date=due,
        created_by_id=user.id,
        assigned_to_id=user.id
    )
    init_database.session.add(task)
    init_database.session.commit()

    task_dict = task.to_dict()
    assert 'id' in task_dict
    assert task_dict['title'] == 'Dict Task'
    assert task_dict['description'] == 'Description for dict task.'
    assert task_dict['status'] == 'in_progress'
    assert task_dict['due_date'] == due.isoformat()
    assert task_dict['created_by'] == user.id
    assert task_dict['assigned_to'] == user.id

    # Test with None due_date
    task.due_date = None
    init_database.session.commit()
    task_dict_no_due = task.to_dict()
    assert task_dict_no_due['due_date'] is None
```