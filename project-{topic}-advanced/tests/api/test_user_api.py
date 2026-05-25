import pytest
import json
from app.models import User
from app.extensions import db

def test_get_profile_success(client, auth_header, verified_user):
    """Test retrieving user profile."""
    response = client.get('/api/v1/user/profile', headers=auth_header)
    assert response.status_code == 200
    assert response.json['id'] == verified_user.id
    assert response.json['username'] == verified_user.username
    assert response.json['email'] == verified_user.email
    assert 'password_hash' not in response.json # Sensitive info should not be returned

def test_get_profile_unauthorized(client):
    """Test retrieving profile without authentication."""
    response = client.get('/api/v1/user/profile')
    assert response.status_code == 401
    assert 'Missing or invalid token' in response.json['message']

def test_update_profile_success(client, auth_header, verified_user):
    """Test updating user profile."""
    new_data = {
        'username': 'updateduser',
        'email': 'updated@example.com'
    }
    response = client.put('/api/v1/user/profile', headers=auth_header, json=new_data)
    assert response.status_code == 200
    assert 'User profile updated successfully' in response.json['message']

    updated_user = User.query.get(verified_user.id)
    assert updated_user.username == 'updateduser'
    assert updated_user.email == 'updated@example.com'

def test_update_profile_duplicate_email(client, auth_header, verified_user, db_session):
    """Test updating profile with a duplicate email."""
    # Create another user to have a duplicate email
    another_user = User(username='another', email='another@example.com', password='pass')
    db_session.add(another_user)
    db_session.commit()

    new_data = {'email': 'another@example.com'}
    response = client.put('/api/v1/user/profile', headers=auth_header, json=new_data)
    assert response.status_code == 400
    assert 'errors' in response.json
    assert 'email' in response.json['errors']

def test_admin_get_all_users_success(client, admin_auth_header, db_session):
    """Test admin getting all users."""
    user1 = User(username='user1', email='user1@example.com', password='pass')
    user2 = User(username='user2', email='user2@example.com', password='pass')
    db_session.add_all([user1, user2])
    db_session.commit()

    response = client.get('/api/v1/admin/users', headers=admin_auth_header)
    assert response.status_code == 200
    assert len(response.json) >= 3 # Admin user + user1 + user2
    usernames = [u['username'] for u in response.json]
    assert 'adminuser' in usernames
    assert 'user1' in usernames
    assert 'user2' in usernames

def test_admin_get_all_users_forbidden(client, auth_header):
    """Test non-admin trying to get all users."""
    response = client.get('/api/v1/admin/users', headers=auth_header)
    assert response.status_code == 403
    assert 'Admin privileges required' in response.json['message']

def test_admin_get_user_by_id_success(client, admin_auth_header, verified_user):
    """Test admin getting a specific user by ID."""
    response = client.get(f'/api/v1/admin/users/{verified_user.id}', headers=admin_auth_header)
    assert response.status_code == 200
    assert response.json['id'] == verified_user.id
    assert response.json['username'] == verified_user.username

def test_admin_get_user_by_id_not_found(client, admin_auth_header):
    """Test admin getting a non-existent user."""
    response = client.get('/api/v1/admin/users/nonexistent-uuid', headers=admin_auth_header)
    assert response.status_code == 404
    assert 'User not found' in response.json['message']

def test_admin_delete_user_success(client, admin_auth_header, verified_user):
    """Test admin deleting a user."""
    response = client.delete(f'/api/v1/admin/users/{verified_user.id}', headers=admin_auth_header)
    assert response.status_code == 200
    assert 'User deleted successfully' in response.json['message']
    deleted_user = User.query.get(verified_user.id)
    assert deleted_user is None

def test_admin_delete_user_not_found(client, admin_auth_header):
    """Test admin deleting a non-existent user."""
    response = client.delete('/api/v1/admin/users/nonexistent-uuid', headers=admin_auth_header)
    assert response.status_code == 404
    assert 'User not found' in response.json['message']

def test_admin_update_user_role_success(client, admin_auth_header, verified_user):
    """Test admin updating a user's role."""
    new_data = {'role': 'admin'}
    response = client.put(f'/api/v1/admin/users/{verified_user.id}', headers=admin_auth_header, json=new_data)
    assert response.status_code == 200
    assert 'User updated successfully' in response.json['message']

    updated_user = User.query.get(verified_user.id)
    assert updated_user.role == 'admin'

def test_admin_update_user_invalid_role(client, admin_auth_header, verified_user):
    """Test admin updating a user with an invalid role."""
    new_data = {'role': 'super_admin'}
    response = client.put(f'/api/v1/admin/users/{verified_user.id}', headers=admin_auth_header, json=new_data)
    assert response.status_code == 400
    assert 'errors' in response.json
    assert 'role' in response.json['errors']