import pytest
from app.models import User, Role
from app import db # Import db to check database state

def test_get_all_users_admin(client, admin_auth_header, seed_users):
    """Admin can get all users."""
    response = client.get('/api/users/', headers=admin_auth_header)
    assert response.status_code == 200
    assert len(response.json) == 3 # Admin, user1, user2
    assert any(u['username'] == seed_users['admin'].username for u in response.json)
    assert any(u['username'] == seed_users['user1'].username for u in response.json)

def test_get_all_users_non_admin_forbidden(client, user1_auth_header, seed_users):
    """Non-admin cannot get all users."""
    response = client.get('/api/users/', headers=user1_auth_header)
    assert response.status_code == 403
    assert response.json['code'] == 'FORBIDDEN'

def test_get_user_admin_any_user(client, admin_auth_header, seed_users):
    """Admin can get any user's details."""
    user1_id = seed_users['user1'].id
    response = client.get(f'/api/users/{user1_id}', headers=admin_auth_header)
    assert response.status_code == 200
    assert response.json['id'] == user1_id
    assert response.json['username'] == seed_users['user1'].username

def test_get_user_self(client, user1_auth_header, seed_users):
    """User can get their own details."""
    user1_id = seed_users['user1'].id
    response = client.get(f'/api/users/{user1_id}', headers=user1_auth_header)
    assert response.status_code == 200
    assert response.json['id'] == user1_id
    assert response.json['username'] == seed_users['user1'].username

def test_get_user_other_user_non_admin_forbidden(client, user1_auth_header, seed_users):
    """Non-admin user cannot get other user's details."""
    user2_id = seed_users['user2'].id
    response = client.get(f'/api/users/{user2_id}', headers=user1_auth_header)
    assert response.status_code == 403
    assert response.json['code'] == 'FORBIDDEN'
    assert 'not authorized to view this user\'s profile' in response.json['message']

def test_update_user_self_success(client, user1_auth_header, auth_tokens, seed_users):
    """User can update their own username/email (fresh token required)."""
    user1_id = seed_users['user1'].id
    response = client.put(f'/api/users/{user1_id}', headers={'Authorization': f"Bearer {auth_tokens['user1']['access_token']}"}, json={'username': 'user1_newname', 'email': 'user1_new@example.com'})
    assert response.status_code == 200
    assert response.json['username'] == 'user1_newname'
    assert response.json['email'] == 'user1_new@example.com'
    updated_user = User.query.get(user1_id)
    assert updated_user.username == 'user1_newname'

def test_update_user_admin_other_user_success(client, admin_auth_header, auth_tokens, seed_users):
    """Admin can update another user's details and role (fresh token)."""
    user1_id = seed_users['user1'].id
    response = client.put(f'/api/users/{user1_id}', headers={'Authorization': f"Bearer {auth_tokens['admin']['access_token']}"}, json={'username': 'user1_admin_updated', 'role': 'admin'})
    assert response.status_code == 200
    assert response.json['username'] == 'user1_admin_updated'
    assert response.json['role'] == 'admin'
    updated_user = User.query.get(user1_id)
    assert updated_user.role == Role.ADMIN

def test_update_user_non_admin_other_user_forbidden(client, user1_auth_header, seed_users):
    """Non-admin cannot update other users."""
    user2_id = seed_users['user2'].id
    response = client.put(f'/api/users/{user2_id}', headers=user1_auth_header, json={'username': 'user2_updated'})
    assert response.status_code == 403
    assert response.json['code'] == 'FORBIDDEN'

def test_update_user_non_admin_change_role_forbidden(client, user1_auth_header, seed_users):
    """Non-admin cannot change role."""
    user1_id = seed_users['user1'].id
    response = client.put(f'/api/users/{user1_id}', headers=user1_auth_header, json={'role': 'admin'})
    assert response.status_code == 403
    assert response.json['code'] == 'FORBIDDEN'
    assert 'Only administrators can change user roles' in response.json['message']

def test_update_user_admin_demote_self_forbidden(client, admin_auth_header, seed_users):
    """Admin cannot demote themselves."""
    admin_id = seed_users['admin'].id
    response = client.put(f'/api/users/{admin_id}', headers=admin_auth_header, json={'role': 'user'})
    assert response.status_code == 403
    assert response.json['code'] == 'FORBIDDEN'
    assert 'Administrators cannot demote themselves' in response.json['message']

def test_delete_user_admin_other_user_success(client, admin_auth_header, auth_tokens, seed_users):
    """Admin can delete another user (fresh token)."""
    user1_id = seed_users['user1'].id
    response = client.delete(f'/api/users/{user1_id}', headers={'Authorization': f"Bearer {auth_tokens['admin']['access_token']}"})
    assert response.status_code == 204
    assert User.query.get(user1_id) is None

def test_delete_user_admin_self_forbidden(client, admin_auth_header, seed_users):
    """Admin cannot delete themselves."""
    admin_id = seed_users['admin'].id
    response = client.delete(f'/api/users/{admin_id}', headers=admin_auth_header)
    assert response.status_code == 403
    assert response.json['code'] == 'FORBIDDEN'
    assert 'Administrators cannot delete themselves' in response.json['message']

def test_delete_user_non_admin_forbidden(client, user1_auth_header, seed_users):
    """Non-admin cannot delete any user."""
    user2_id = seed_users['user2'].id
    response = client.delete(f'/api/users/{user2_id}', headers=user1_auth_header)
    assert response.status_code == 403
    assert response.json['code'] == 'FORBIDDEN'
```