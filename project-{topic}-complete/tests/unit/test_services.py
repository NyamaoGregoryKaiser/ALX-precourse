```python
import pytest
from datetime import datetime, timedelta
from app.extensions import db
from app.models.user import User
from app.models.project import Project
from app.models.task import Task
from app.models.comment import Comment
from app.services.user_service import UserService
from app.services.project_service import ProjectService
from app.services.task_service import TaskService
from app.utils.exceptions import ResourceNotFound, DuplicateResource, InvalidInput

# User Service Tests
def test_create_user_success(app, init_database):
    with app.app_context():
        user = UserService.create_user({'username': 'newuser', 'email': 'new@example.com', 'password': 'pass'})
        assert user.id is not None
        assert user.username == 'newuser'
        assert User.query.filter_by(username='newuser').first() is not None

def test_create_user_duplicate_username(app, init_database, sample_users):
    with app.app_context():
        with pytest.raises(DuplicateResource):
            UserService.create_user({'username': sample_users['user1'].username, 'email': 'another@example.com', 'password': 'pass'})

def test_create_user_invalid_input(app, init_database):
    with app.app_context():
        with pytest.raises(InvalidInput):
            UserService.create_user({'username': 'noemail', 'password': 'pass'})

def test_get_user_by_id_success(app, init_database, sample_users):
    with app.app_context():
        user = UserService.get_user_by_id(sample_users['user1'].id)
        assert user.username == sample_users['user1'].username

def test_get_user_by_id_not_found(app, init_database):
    with app.app_context():
        with pytest.raises(ResourceNotFound):
            UserService.get_user_by_id(999)

def test_update_user_success(app, init_database, sample_users):
    with app.app_context():
        updated_user = UserService.update_user(sample_users['user1'].id, {'username': 'updateduser', 'email': 'updated@example.com'})
        assert updated_user.username == 'updateduser'
        assert updated_user.email == 'updated@example.com'

def test_update_user_duplicate_email(app, init_database, sample_users):
    with app.app_context():
        with pytest.raises(DuplicateResource):
            UserService.update_user(sample_users['user1'].id, {'email': sample_users['user2'].email})

def test_delete_user_success(app, init_database, sample_users):
    with app.app_context():
        user_id = sample_users['user1'].id
        UserService.delete_user(user_id)
        with pytest.raises(ResourceNotFound):
            UserService.get_user_by_id(user_id)

# Project Service Tests
def test_create_project_success(app, init_database, sample_users):
    with app.app_context():
        project = ProjectService.create_project({
            'name': 'Brand New Project',
            'description': 'A fresh start.',
            'manager_id': sample_users['manager'].id
        })
        assert project.id is not None
        assert project.name == 'Brand New Project'
        assert Project.query.filter_by(name='Brand New Project').first() is not None

def test_create_project_duplicate_name(app, init_database, sample_users, sample_projects):
    with app.app_context():
        with pytest.raises(DuplicateResource):
            ProjectService.create_project({
                'name': sample_projects['project1'].name,
                'description': 'Another project with same name.',
                'manager_id': sample_users['manager'].id
            })

def test_get_project_by_id_success(app, init_database, sample_projects):
    with app.app_context():
        project = ProjectService.get_project_by_id(sample_projects['project1'].id)
        assert project.name == sample_projects['project1'].name

def test_update_project_success(app, init_database, sample_projects, sample_users):
    with app.app_context():
        updated_project = ProjectService.update_project(sample_projects['project1'].id, {
            'name': 'Updated Project Alpha',
            'status': 'completed',
            'manager_id': sample_users['admin'].id
        })
        assert updated_project.name == 'Updated Project Alpha'
        assert updated_project.status == 'completed'
        assert updated_project.manager_id == sample_users['admin'].id

def test_delete_project_success(app, init_database, sample_projects):
    with app.app_context():
        project_id = sample_projects['project1'].id
        ProjectService.delete_project(project_id)
        with pytest.raises(ResourceNotFound):
            ProjectService.get_project_by_id(project_id)

# Task Service Tests
def test_create_task_success(app, init_database, sample_users, sample_projects):
    with app.app_context():
        task = TaskService.create_task({
            'title': 'New Task',
            'description': 'New task description',
            'project_id': sample_projects['project1'].id,
            'creator_id': sample_users['manager'].id,
            'assigned_to_id': sample_users['user1'].id,
            'due_date': (datetime.now() + timedelta(days=5)).isoformat()
        })
        assert task.id is not None
        assert task.title == 'New Task'
        assert Task.query.get(task.id) is not None

def test_create_task_invalid_project_id(app, init_database, sample_users):
    with app.app_context():
        with pytest.raises(ResourceNotFound):
            TaskService.create_task({
                'title': 'Invalid Project Task',
                'project_id': 999,
                'creator_id': sample_users['manager'].id
            })

def test_get_task_by_id_success(app, init_database, sample_tasks):
    with app.app_context():
        task = TaskService.get_task_by_id(sample_tasks['task1'].id)
        assert task.title == sample_tasks['task1'].title

def test_update_task_success(app, init_database, sample_tasks, sample_users):
    with app.app_context():
        updated_task = TaskService.update_task(sample_tasks['task1'].id, {
            'title': 'Updated Task A',
            'status': 'review',
            'assigned_to_id': sample_users['user2'].id
        })
        assert updated_task.title == 'Updated Task A'
        assert updated_task.status == 'review'
        assert updated_task.assigned_to_id == sample_users['user2'].id

def test_delete_task_success(app, init_database, sample_tasks):
    with app.app_context():
        task_id = sample_tasks['task1'].id
        TaskService.delete_task(task_id)
        with pytest.raises(ResourceNotFound):
            TaskService.get_task_by_id(task_id)

# Comment Service Tests (via TaskService)
def test_add_comment_to_task_success(app, init_database, sample_users, sample_tasks):
    with app.app_context():
        comment = TaskService.add_comment_to_task(
            task_id=sample_tasks['task1'].id,
            content='This is a new comment.',
            author_id=sample_users['user2'].id
        )
        assert comment.id is not None
        assert comment.content == 'This is a new comment.'
        assert comment.task_id == sample_tasks['task1'].id
        assert Comment.query.get(comment.id) is not None

def test_get_task_comments_success(app, init_database, sample_tasks, sample_comments):
    with app.app_context():
        comments_pagination = TaskService.get_task_comments(sample_tasks['task1'].id)
        assert comments_pagination.total == 2 # Assuming two comments were seeded
        assert any(c.content == sample_comments['comment1'].content for c in comments_pagination.items)

def test_update_comment_success(app, init_database, sample_comments):
    with app.app_context():
        updated_comment = TaskService.update_comment(sample_comments['comment1'].id, {'content': 'Revised comment content.'})
        assert updated_comment.content == 'Revised comment content.'

def test_delete_comment_success(app, init_database, sample_comments):
    with app.app_context():
        comment_id = sample_comments['comment1'].id
        TaskService.delete_comment(comment_id)
        with pytest.raises(ResourceNotFound):
            TaskService.get_comment_by_id(comment_id)
```