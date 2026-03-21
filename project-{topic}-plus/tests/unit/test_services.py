import pytest
from datetime import datetime, timedelta
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.services.task_service import TaskService
from app.models import User, Task, Role, TaskStatus, REVOKED_TOKENS
from app.utils.exceptions import ConflictError, NotFoundError, UnauthorizedError, ForbiddenError, BadRequestError
from flask_jwt_extended import decode_token

def test_auth_register_user_success(app, init_database):
    """Test successful user registration."""
    with app.app_context():
        user = AuthService.register_user('newuser', 'new@example.com', 'password123', role=Role.USER)
        assert user.id is not None
        assert user.username == 'newuser'
        assert user.email == 'new@example.com'
        assert user.check_password('password123')
        assert user.role == Role.USER
        assert User.query.filter_by(username='newuser').first() is not None

def test_auth_register_user_conflict_username(app, seed_users):
    """Test registration with existing username."""
    with app.app_context():
        with pytest.raises(ConflictError, match="Username already exists."):
            AuthService.register_user(seed_users['admin'].username, 'another@example.com', 'password')

def test_auth_register_user_conflict_email(app, seed_users):
    """Test registration with existing email."""
    with app.app_context():
        with pytest.raises(ConflictError, match="Email already exists."):
            AuthService.register_user('anotheruser', seed_users['admin'].email, 'password')

def test_auth_authenticate_user_success(app, seed_users):
    """Test successful user authentication."""
    with app.app_context():
        admin = seed_users['admin']
        access_token, refresh_token = AuthService.authenticate_user(admin.username, 'password')
        assert access_token is not None
        assert refresh_token is not None
        decoded_access = decode_token(access_token)
        decoded_refresh = decode_token(refresh_token)
        assert decoded_access['sub'] == admin.id
        assert decoded_refresh['sub'] == admin.id

def test_auth_authenticate_user_failure(app, seed_users):
    """Test authentication with invalid credentials."""
    with app.app_context():
        with pytest.raises(UnauthorizedError, match="Invalid credentials."):
            AuthService.authenticate_user(seed_users['admin'].username, 'wrongpassword')
        with pytest.raises(UnauthorizedError, match="Invalid credentials."):
            AuthService.authenticate_user('nonexistent', 'password')

def test_auth_revoke_token(app):
    """Test token revocation."""
    with app.app_context():
        # This test requires a token to be created and then revoked.
        # It's usually handled in integration tests. For unit, we simulate.
        jti = 'some_jwt_id'
        assert not AuthService.check_if_token_is_revoked(None, {"jti": jti})
        AuthService.revoke_token(jti)
        assert AuthService.check_if_token_is_revoked(None, {"jti": jti})

def test_user_service_get_user_by_id_success(app, seed_users):
    """Test retrieving user by ID."""
    with app.app_context():
        user = UserService.get_user_by_id(seed_users['admin'].id)
        assert user.username == seed_users['admin'].username

def test_user_service_get_user_by_id_not_found(app):
    """Test retrieving non-existent user."""
    with app.app_context():
        with pytest.raises(NotFoundError, match="User not found."):
            UserService.get_user_by_id(999)

def test_user_service_get_all_users(app, seed_users):
    """Test retrieving all users."""
    with app.app_context():
        users = UserService.get_all_users()
        assert len(users) == 3 # Admin, user1, user2

def test_user_service_update_user_self_success(app, seed_users):
    """Test a user updating their own profile."""
    with app.app_context():
        user = seed_users['user1']
        updated_data = {'username': 'user1_updated', 'email': 'user1_updated@example.com'}
        updated_user = UserService.update_user(user.id, user.id, user.role, updated_data)
        assert updated_user.username == 'user1_updated'
        assert updated_user.email == 'user1_updated@example.com'

def test_user_service_update_user_admin_success(app, seed_users):
    """Test an admin updating another user's profile and role."""
    with app.app_context():
        admin = seed_users['admin']
        user = seed_users['user1']
        updated_data = {'username': 'user1_admin_updated', 'role': Role.ADMIN}
        updated_user = UserService.update_user(user.id, admin.id, admin.role, updated_data)
        assert updated_user.username == 'user1_admin_updated'
        assert updated_user.role == Role.ADMIN

def test_user_service_update_user_non_admin_other_user_forbidden(app, seed_users):
    """Test non-admin user trying to update another user."""
    with app.app_context():
        user1 = seed_users['user1']
        user2 = seed_users['user2']
        updated_data = {'username': 'user2_updated'}
        with pytest.raises(ForbiddenError, match="You are not authorized to update other users' profiles."):
            UserService.update_user(user2.id, user1.id, user1.role, updated_data)

def test_user_service_update_user_non_admin_change_role_forbidden(app, seed_users):
    """Test non-admin user trying to change role."""
    with app.app_context():
        user = seed_users['user1']
        updated_data = {'role': Role.ADMIN}
        with pytest.raises(ForbiddenError, match="Only administrators can change user roles."):
            UserService.update_user(user.id, user.id, user.role, updated_data)

def test_user_service_update_user_admin_demote_self_forbidden(app, seed_users):
    """Test admin trying to demote themselves."""
    with app.app_context():
        admin = seed_users['admin']
        updated_data = {'role': Role.USER}
        with pytest.raises(ForbiddenError, match="Administrators cannot demote themselves."):
            UserService.update_user(admin.id, admin.id, admin.role, updated_data)

def test_user_service_delete_user_admin_success(app, seed_users):
    """Test admin deleting another user."""
    with app.app_context():
        admin = seed_users['admin']
        user1_id = seed_users['user1'].id
        UserService.delete_user(user1_id, admin.id, admin.role)
        assert User.query.get(user1_id) is None

def test_user_service_delete_user_admin_self_forbidden(app, seed_users):
    """Test admin trying to delete themselves."""
    with app.app_context():
        admin = seed_users['admin']
        with pytest.raises(ForbiddenError, match="Administrators cannot delete themselves."):
            UserService.delete_user(admin.id, admin.id, admin.role)

def test_user_service_delete_user_non_admin_forbidden(app, seed_users):
    """Test non-admin user trying to delete a user."""
    with app.app_context():
        user1 = seed_users['user1']
        user2_id = seed_users['user2'].id
        with pytest.raises(ForbiddenError, match="Only administrators can delete users."):
            UserService.delete_user(user2_id, user1.id, user1.role)

def test_task_service_create_task_success(app, seed_users):
    """Test successful task creation."""
    with app.app_context():
        creator = seed_users['user1']
        assigned = seed_users['user2']
        due = datetime.utcnow() + timedelta(days=3)
        task = TaskService.create_task("New Test Task", "Description", due, TaskStatus.PENDING, assigned.id, creator.id)
        assert task.id is not None
        assert task.title == "New Test Task"
        assert task.created_by_id == creator.id
        assert task.assigned_to_id == assigned.id
        assert Task.query.get(task.id) is not None

def test_task_service_create_task_past_due_date_failure(app, seed_users):
    """Test task creation with a due date in the past."""
    with app.app_context():
        creator = seed_users['user1']
        past_due = datetime.utcnow() - timedelta(days=1)
        with pytest.raises(BadRequestError, match="Due date cannot be in the past."):
            TaskService.create_task("Past Due Task", "Description", past_due, TaskStatus.PENDING, creator.id, creator.id)

def test_task_service_create_task_invalid_assigned_to_id_failure(app, seed_users):
    """Test task creation with an invalid assigned_to_id."""
    with app.app_context():
        creator = seed_users['user1']
        due = datetime.utcnow() + timedelta(days=3)
        with pytest.raises(NotFoundError, match="Assigned user with ID 999 not found."):
            TaskService.create_task("Invalid Assignee Task", "Description", due, TaskStatus.PENDING, 999, creator.id)

def test_task_service_get_task_by_id_admin_success(app, seed_users, seed_tasks):
    """Test admin retrieving any task."""
    with app.app_context():
        admin = seed_users['admin']
        task = seed_tasks['task4'] # User1's task assigned to User2
        retrieved_task = TaskService.get_task_by_id(task.id, admin.id, admin.role)
        assert retrieved_task.id == task.id

def test_task_service_get_task_by_id_creator_success(app, seed_users, seed_tasks):
    """Test creator retrieving their own task."""
    with app.app_context():
        user1 = seed_users['user1']
        task = seed_tasks['task3'] # User1's task
        retrieved_task = TaskService.get_task_by_id(task.id, user1.id, user1.role)
        assert retrieved_task.id == task.id

def test_task_service_get_task_by_id_assignee_success(app, seed_users, seed_tasks):
    """Test assignee retrieving a task assigned to them."""
    with app.app_context():
        user1 = seed_users['user1']
        task = seed_tasks['task5'] # Created by User2, assigned to User1
        retrieved_task = TaskService.get_task_by_id(task.id, user1.id, user1.role)
        assert retrieved_task.id == task.id

def test_task_service_get_task_by_id_forbidden(app, seed_users, seed_tasks):
    """Test regular user trying to retrieve unauthorized task."""
    with app.app_context():
        user1 = seed_users['user1']
        task = seed_tasks['task1'] # Admin's task, not assigned to user1
        with pytest.raises(ForbiddenError, match="You are not authorized to view this task."):
            TaskService.get_task_by_id(task.id, user1.id, user1.role)

def test_task_service_get_all_tasks_admin(app, seed_users, seed_tasks):
    """Test admin retrieving all tasks."""
    with app.app_context():
        admin = seed_users['admin']
        tasks, pagination = TaskService.get_all_tasks(admin.id, admin.role, {}, 1, 10)
        assert len(tasks) == 6
        assert pagination['total'] == 6

def test_task_service_get_all_tasks_user_filters_by_ownership(app, seed_users, seed_tasks):
    """Test regular user retrieving their tasks (created or assigned)."""
    with app.app_context():
        user1 = seed_users['user1']
        tasks, pagination = TaskService.get_all_tasks(user1.id, user1.role, {}, 1, 10)
        # user1 created task3, task4. Assigned to task2, task3, task5.
        # Unique: task2, task3, task4, task5 => 4 tasks
        assert len(tasks) == 4
        assert pagination['total'] == 4
        task_titles = [t.title for t in tasks]
        assert 'Admin Task 2' in task_titles # Assigned to user1
        assert 'User1 Task 1' in task_titles # Created by user1
        assert 'User1 Task 2' in task_titles # Created by user1
        assert 'User2 Task 1' in task_titles # Assigned to user1

def test_task_service_update_task_admin_success(app, seed_users, seed_tasks):
    """Test admin updating any task."""
    with app.app_context():
        admin = seed_users['admin']
        task_id = seed_tasks['task4'].id # User1's task assigned to User2
        updated_data = {'title': 'Updated by Admin', 'status': TaskStatus.COMPLETED}
        updated_task = TaskService.update_task(task_id, admin.id, admin.role, updated_data)
        assert updated_task.title == 'Updated by Admin'
        assert updated_task.status == TaskStatus.COMPLETED

def test_task_service_update_task_creator_success(app, seed_users, seed_tasks):
    """Test task creator updating their task."""
    with app.app_context():
        user1 = seed_users['user1']
        task_id = seed_tasks['task3'].id # User1's task
        updated_data = {'description': 'Creator updated description', 'status': TaskStatus.IN_PROGRESS}
        updated_task = TaskService.update_task(task_id, user1.id, user1.role, updated_data)
        assert updated_task.description == 'Creator updated description'
        assert updated_task.status == TaskStatus.IN_PROGRESS

def test_task_service_update_task_assignee_status_success(app, seed_users, seed_tasks):
    """Test assignee updating only the status of their assigned task."""
    with app.app_context():
        user1 = seed_users['user1']
        task_id = seed_tasks['task5'].id # Created by User2, assigned to User1
        updated_data = {'status': TaskStatus.COMPLETED}
        updated_task = TaskService.update_task(task_id, user1.id, user1.role, updated_data)
        assert updated_task.status == TaskStatus.COMPLETED
        # Ensure other fields are not changed if not in data
        assert updated_task.title == seed_tasks['task5'].title

def test_task_service_update_task_assignee_core_details_forbidden(app, seed_users, seed_tasks):
    """Test assignee trying to update core details (not status)."""
    with app.app_context():
        user1 = seed_users['user1']
        task_id = seed_tasks['task5'].id # Created by User2, assigned to User1
        updated_data = {'title': 'Forbidden update by assignee'}
        with pytest.raises(ForbiddenError, match="You are not authorized to modify this task's core details."):
            TaskService.update_task(task_id, user1.id, user1.role, updated_data)

def test_task_service_update_task_unauthorized_user_forbidden(app, seed_users, seed_tasks):
    """Test unauthorized user trying to update a task."""
    with app.app_context():
        user1 = seed_users['user1']
        task_id = seed_tasks['task1'].id # Admin's task
        updated_data = {'status': TaskStatus.COMPLETED}
        with pytest.raises(ForbiddenError, match="You are not authorized to update this task."):
            TaskService.update_task(task_id, user1.id, user1.role, updated_data)

def test_task_service_delete_task_admin_success(app, seed_users, seed_tasks):
    """Test admin deleting a task."""
    with app.app_context():
        admin = seed_users['admin']
        task_id = seed_tasks['task4'].id
        TaskService.delete_task(task_id, admin.id, admin.role)
        assert Task.query.get(task_id) is None

def test_task_service_delete_task_creator_success(app, seed_users, seed_tasks):
    """Test creator deleting their own task."""
    with app.app_context():
        user1 = seed_users['user1']
        task_id = seed_tasks['task3'].id
        TaskService.delete_task(task_id, user1.id, user1.role)
        assert Task.query.get(task_id) is None

def test_task_service_delete_task_forbidden(app, seed_users, seed_tasks):
    """Test non-creator/non-admin user trying to delete a task."""
    with app.app_context():
        user1 = seed_users['user1']
        task_id = seed_tasks['task1'].id # Admin's task
        with pytest.raises(ForbiddenError, match="You are not authorized to delete this task."):
            TaskService.delete_task(task_id, user1.id, user1.role)

def test_task_service_delete_task_assignee_forbidden(app, seed_users, seed_tasks):
    """Test assignee trying to delete a task."""
    with app.app_context():
        user1 = seed_users['user1']
        task_id = seed_tasks['task5'].id # Created by User2, assigned to User1
        with pytest.raises(ForbiddenError, match="You are not authorized to delete this task."):
            TaskService.delete_task(task_id, user1.id, user1.role)
```