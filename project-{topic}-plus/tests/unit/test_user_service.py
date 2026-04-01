```python
import pytest
from performance_monitor.services.user_service import UserService
from performance_monitor.models import User
from performance_monitor.extensions import db

def test_create_user(db_session, app):
    with app.app_context():
        user, error = UserService.create_user('newuser', 'newuser@example.com', 'password123')
        assert user is not None
        assert error is None
        assert user.username == 'newuser'
        assert user.email == 'newuser@example.com'
        assert user.check_password('password123')
        assert not user.is_admin

        # Test duplicate username
        user, error = UserService.create_user('newuser', 'another@example.com', 'password123')
        assert user is None
        assert "Username already exists." in error

        # Test duplicate email
        user, error = UserService.create_user('anotheruser', 'newuser@example.com', 'password123')
        assert user is None
        assert "Email already registered." in error

def test_get_user_by_id(db_session, app):
    with app.app_context():
        user, _ = UserService.create_user('fetchuser', 'fetch@example.com', 'password')
        fetched_user = UserService.get_user_by_id(user.id)
        assert fetched_user is not None
        assert fetched_user.username == 'fetchuser'

        not_found_user = UserService.get_user_by_id(9999)
        assert not_found_user is None

def test_get_user_by_username(db_session, app):
    with app.app_context():
        user, _ = UserService.create_user('finduser', 'find@example.com', 'password')
        found_user = UserService.get_user_by_username('finduser')
        assert found_user is not None
        assert found_user.id == user.id

        not_found_user = UserService.get_user_by_username('nonexistent')
        assert not_found_user is None

def test_get_all_users(db_session, app):
    with app.app_context():
        db_session.query(User).delete() # Clear existing for accurate count
        UserService.create_user('user1', 'user1@example.com', 'pass1')
        UserService.create_user('user2', 'user2@example.com', 'pass2')
        users = UserService.get_all_users()
        assert len(users) == 2

def test_update_user(db_session, app):
    with app.app_context():
        user, _ = UserService.create_user('oldname', 'old@example.com', 'oldpass')
        
        # Update username and password
        updated_user, error = UserService.update_user(user.id, {'username': 'newname', 'password': 'newpass'})
        assert updated_user is not None
        assert error is None
        assert updated_user.username == 'newname'
        assert updated_user.check_password('newpass')

        # Update email and admin status
        updated_user, error = UserService.update_user(user.id, {'email': 'newemail@example.com', 'is_admin': True})
        assert updated_user is not None
        assert error is None
        assert updated_user.email == 'newemail@example.com'
        assert updated_user.is_admin

        # Test updating with duplicate username
        UserService.create_user('another_user', 'another@example.com', 'pass')
        updated_user, error = UserService.update_user(user.id, {'username': 'another_user'})
        assert updated_user is None
        assert "Username already exists." in error

        # Test updating non-existent user
        updated_user, error = UserService.update_user(9999, {'username': 'baduser'})
        assert updated_user is None
        assert "User not found." in error

def test_delete_user(db_session, app):
    with app.app_context():
        user, _ = UserService.create_user('todelete', 'delete@example.com', 'pass')
        
        success, error = UserService.delete_user(user.id)
        assert success is True
        assert error is None
        assert UserService.get_user_by_id(user.id) is None

        # Test deleting non-existent user
        success, error = UserService.delete_user(9999)
        assert success is False
        assert "User not found." in error

```