```python
import pytest
from datetime import datetime, timedelta
from app.models.user import User
from app.models.project import Project
from app.models.task import Task
from app.models.comment import Comment
from app.extensions import bcrypt

def test_new_user(app):
    with app.app_context():
        user = User('testuser', 'test@example.com', 'password123', 'user')
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.role == 'user'
        assert user.is_active is True
        assert bcrypt.check_password_hash(user.password_hash, 'password123')

def test_user_set_password(app):
    with app.app_context():
        user = User('testuser', 'test@example.com', 'oldpassword')
        user.set_password('newpassword')
        assert bcrypt.check_password_hash(user.password_hash, 'newpassword')
        assert not bcrypt.check_password_hash(user.password_hash, 'oldpassword')

def test_user_check_password(app):
    with app.app_context():
        user = User('testuser', 'test@example.com', 'password123')
        assert user.check_password('password123')
        assert not user.check_password('wrongpassword')

def test_user_to_dict(app):
    with app.app_context():
        user = User('testuser', 'test@example.com', 'password123', 'admin')
        user.id = 1 # Manually set ID for testing dict representation
        user_dict = user.to_dict()
        assert 'id' in user_dict
        assert 'username' in user_dict
        assert 'email' not in user_dict # By default
        assert 'role' not in user_dict # By default
        assert user_dict['username'] == 'testuser'

        user_dict_full = user.to_dict(include_email=True, include_role=True)
        assert user_dict_full['email'] == 'test@example.com'
        assert user_dict_full['role'] == 'admin'

def test_new_project(app, sample_users):
    with app.app_context():
        manager_id = sample_users['manager'].id
        project = Project('New Project', 'Description of new project', manager_id)
        assert project.name == 'New Project'
        assert project.description == 'Description of new project'
        assert project.manager_id == manager_id
        assert project.status == 'active'
        assert project.start_date is not None
        assert project.end_date is None

def test_project_to_dict(app, sample_users):
    with app.app_context():
        manager_id = sample_users['manager'].id
        project = Project('Test Project', 'Test Description', manager_id)
        project.id = 1
        project.start_date = datetime(2023, 1, 1)
        project.end_date = datetime(2023, 12, 31)
        project.created_at = datetime(2023, 1, 1)
        project_dict = project.to_dict()
        assert project_dict['id'] == 1
        assert project_dict['name'] == 'Test Project'
        assert project_dict['manager_id'] == manager_id
        assert project_dict['start_date'] == datetime(2023, 1, 1).isoformat()
        assert project_dict['end_date'] == datetime(2023, 12, 31).isoformat()

def test_new_task(app, sample_users, sample_projects):
    with app.app_context():
        project_id = sample_projects['project1'].id
        creator_id = sample_users['manager'].id
        assigned_to_id = sample_users['user1'].id
        due_date = datetime.now() + timedelta(days=7)

        task = Task('New Task Title', 'Task Description', project_id, creator_id, assigned_to_id, 'open', 'high', due_date)
        assert task.title == 'New Task Title'
        assert task.description == 'Task Description'
        assert task.project_id == project_id
        assert task.creator_id == creator_id
        assert task.assigned_to_id == assigned_to_id
        assert task.status == 'open'
        assert task.priority == 'high'
        assert task.due_date.year == due_date.year
        assert task.due_date.month == due_date.month
        assert task.due_date.day == due_date.day

def test_task_to_dict(app, sample_users, sample_projects):
    with app.app_context():
        project_id = sample_projects['project1'].id
        creator_id = sample_users['manager'].id
        assigned_to_id = sample_users['user1'].id
        due_date = datetime(2024, 6, 30)

        task = Task('Test Task', 'Test Desc', project_id, creator_id, assigned_to_id, 'in_progress', 'medium', due_date)
        task.id = 1
        task.created_at = datetime(2024, 1, 1)
        task_dict = task.to_dict()

        assert task_dict['id'] == 1
        assert task_dict['title'] == 'Test Task'
        assert task_dict['project_id'] == project_id
        assert task_dict['assigned_to_id'] == assigned_to_id
        assert task_dict['due_date'] == due_date.isoformat()

def test_new_comment(app, sample_users, sample_tasks):
    with app.app_context():
        task_id = sample_tasks['task1'].id
        author_id = sample_users['user1'].id
        comment = Comment('This is a test comment.', author_id, task_id=task_id)
        assert comment.content == 'This is a test comment.'
        assert comment.author_id == author_id
        assert comment.task_id == task_id
        assert comment.project_id is None

def test_comment_to_dict(app, sample_users, sample_tasks):
    with app.app_context():
        task_id = sample_tasks['task1'].id
        author_id = sample_users['user1'].id
        comment = Comment('Test content', author_id, task_id=task_id)
        comment.id = 1
        comment.created_at = datetime(2024, 1, 1)
        comment_dict = comment.to_dict()

        assert comment_dict['id'] == 1
        assert comment_dict['content'] == 'Test content'
        assert comment_dict['author_id'] == author_id
        assert comment_dict['task_id'] == task_id
        assert comment_dict['project_id'] is None
```