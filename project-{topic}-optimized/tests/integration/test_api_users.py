import pytest
from flask import url_for
from app.models.user import User, UserRole

def test_get_all_users_admin_success(client, admin_auth_tokens, customer_user):
    response = client.get('/api/users/', headers={
        'Authorization': f"Bearer {admin_auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert 'items' in data
    assert 'total' in data
    assert len(data['items']) >= 2 # admin_user + customer_user

def test_get_all_users_customer_forbidden(client, auth_tokens):
    response = client.get('/api/users/', headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 403
    assert 'Forbidden' in response.get_json()['error']

def test_get_user_by_id_admin_success(client, admin_auth_tokens, customer_user):
    response = client.get(f'/api/users/{customer_user.id}', headers={
        'Authorization': f"Bearer {admin_auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['id'] == customer_user.id
    assert data['email'] == customer_user.email

def test_get_user_by_id_self_success(client, auth_tokens, customer_user):
    response = client.get(f'/api/users/{customer_user.id}', headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['id'] == customer_user.id

def test_get_user_by_id_other_customer_forbidden(client, auth_tokens, admin_user):
    # customer_user trying to view admin_user
    response = client.get(f'/api/users/{admin_user.id}', headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 403
    assert 'Forbidden' in response.get_json()['error']

def test_update_user_admin_success(client, db_session, admin_auth_tokens, customer_user):
    response = client.put(f'/api/users/{customer_user.id}', json={
        'username': 'new_customer_username',
        'is_active': False
    }, headers={
        'Authorization': f"Bearer {admin_auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['username'] == 'new_customer_username'
    assert data['is_active'] is False

    # Check database
    updated_user = db_session.query(User).get(customer_user.id)
    assert updated_user.username == 'new_customer_username'
    assert updated_user.is_active is False

def test_update_user_self_success(client, db_session, auth_tokens, customer_user):
    response = client.put(f'/api/users/{customer_user.id}', json={
        'username': 'self_edit_username'
    }, headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['username'] == 'self_edit_username'

    # Check database
    updated_user = db_session.query(User).get(customer_user.id)
    assert updated_user.username == 'self_edit_username'

def test_update_user_self_forbidden_role_change(client, auth_tokens, customer_user, editor_user):
    response = client.put(f'/api/users/{customer_user.id}', json={
        'roles': [editor_user.name]
    }, headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 403
    assert 'cannot modify user roles' in response.get_json()['message']

def test_delete_user_admin_success(client, db_session, admin_auth_tokens, customer_user):
    response = client.delete(f'/api/users/{customer_user.id}', headers={
        'Authorization': f"Bearer {admin_auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    assert 'User deleted successfully.' in response.get_json()['message']

    # Check database
    deleted_user = db_session.query(User).get(customer_user.id)
    assert deleted_user is None

def test_delete_user_admin_cannot_delete_self(client, admin_auth_tokens, admin_user):
    response = client.delete(f'/api/users/{admin_user.id}', headers={
        'Authorization': f"Bearer {admin_auth_tokens['access_token']}"
    })
    assert response.status_code == 400
    assert 'cannot delete your own account' in response.get_json()['message']

def test_delete_user_customer_forbidden(client, auth_tokens, admin_user):
    response = client.delete(f'/api/users/{admin_user.id}', headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 403
    assert 'not authorized to delete users' in response.get_json()['message']