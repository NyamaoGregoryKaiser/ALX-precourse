import pytest
import json
from app.models import User
from app.extensions import db

def test_list_users_admin(client, auth_tokens, sample_users):
    headers = {'Authorization': f'Bearer {auth_tokens["admin_token"]}'}
    response = client.get('/api/v1/users', headers=headers)
    assert response.status_code == 200
    users_data = response.json
    assert isinstance(users_data, list)
    assert len(users_data) >= 3 # Admin, Editor, Author

    # Verify sensitive data is not exposed
    for user_data in users_data:
        assert 'password_hash' not in user_data

def test_list_users_editor(client, auth_tokens):
    headers = {'Authorization': f'Bearer {auth_tokens["editor_token"]}'}
    response = client.get('/api/v1/users', headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json, list)

def test_list_users_author_forbidden(client, auth_tokens):
    headers = {'Authorization': f'Bearer {auth_tokens["author_token"]}'}
    response = client.get('/api/v1/users', headers=headers)
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json['message']

def test_get_user_admin_access(client, auth_tokens, sample_users):
    admin_headers = {'Authorization': f'Bearer {auth_tokens["admin_token"]}'}
    author_id = sample_users['author'].id
    response = client.get(f'/api/v1/users/{author_id}', headers=admin_headers)
    assert response.status_code == 200
    assert response.json['username'] == 'author_user'

def test_get_user_self_access(client, auth_tokens, sample_users):
    author_headers = {'Authorization': f'Bearer {auth_tokens["author_token"]}'}
    author_id = sample_users['author'].id
    response = client.get(f'/api/v1/users/{author_id}', headers=author_headers)
    assert response.status_code == 200
    assert response.json['username'] == 'author_user'

def test_get_user_other_user_forbidden(client, auth_tokens, sample_users):
    author_headers = {'Authorization': f'Bearer {auth_tokens["author_token"]}'}
    admin_id = sample_users['admin'].id
    response = client.get(f'/api/v1/users/{admin_id}', headers=author_headers)
    assert response.status_code == 403
    assert "Forbidden: You can only view your own profile." in response.json['message']

def test_update_user_admin_changes_role(client, auth_tokens, sample_users):
    admin_headers = {'Authorization': f'Bearer {auth_tokens["admin_token"]}'}
    author = sample_users['author']

    response = client.put(
        f'/api/v1/users/{author.id}',
        data=json.dumps({'role': 'editor'}),
        content_type='application/json',
        headers=admin_headers
    )
    assert response.status_code == 200
    assert response.json['role'] == 'editor'

    updated_author = User.query.get(author.id)
    assert updated_author.role == 'editor'

def test_update_user_self_profile(client, auth_tokens, sample_users):
    author_headers = {'Authorization': f'Bearer {auth_tokens["author_token"]}'}
    author = sample_users['author']

    response = client.put(
        f'/api/v1/users/{author.id}',
        data=json.dumps({'username': 'new_author_name', 'email': 'new_author@test.com'}),
        content_type='application/json',
        headers=author_headers
    )
    assert response.status_code == 200
    assert response.json['username'] == 'new_author_name'
    assert response.json['email'] == 'new_author@test.com'

    updated_author = User.query.get(author.id)
    assert updated_author.username == 'new_author_name'
    assert updated_author.email == 'new_author@test.com'

def test_update_user_self_role_forbidden_non_admin(client, auth_tokens, sample_users):
    editor_headers = {'Authorization': f'Bearer {auth_tokens["editor_token"]}'}
    editor = sample_users['editor']

    response = client.put(
        f'/api/v1/users/{editor.id}',
        data=json.dumps({'role': 'admin'}), # Editor trying to change own role to admin
        content_type='application/json',
        headers=editor_headers
    )
    assert response.status_code == 403
    assert "Only administrators can change user roles." in response.json['message']

def test_update_user_other_user_forbidden(client, auth_tokens, sample_users):
    author_headers = {'Authorization': f'Bearer {auth_tokens["author_token"]}'}
    admin = sample_users['admin']

    response = client.put(
        f'/api/v1/users/{admin.id}',
        data=json.dumps({'username': 'bad_attempt'}),
        content_type='application/json',
        headers=author_headers
    )
    assert response.status_code == 403
    assert "Forbidden: You can only update your own profile." in response.json['message']

def test_delete_user_admin_success(client, auth_tokens, sample_users):
    admin_headers = {'Authorization': f'Bearer {auth_tokens["admin_token"]}'}
    author_id = sample_users['author'].id

    response = client.delete(f'/api/v1/users/{author_id}', headers=admin_headers)
    assert response.status_code == 204
    assert User.query.get(author_id) is None

def test_delete_user_admin_self_delete_forbidden(client, auth_tokens, sample_users):
    admin_headers = {'Authorization': f'Bearer {auth_tokens["admin_token"]}'}
    admin_id = sample_users['admin'].id

    response = client.delete(f'/api/v1/users/{admin_id}', headers=admin_headers)
    assert response.status_code == 403
    assert "Forbidden: An administrator cannot delete their own account." in response.json['message']

def test_delete_user_non_admin_forbidden(client, auth_tokens, sample_users):
    editor_headers = {'Authorization': f'Bearer {auth_tokens["editor_token"]}'}
    author_id = sample_users['author'].id

    response = client.delete(f'/api/v1/users/{author_id}', headers=editor_headers)
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json['message']
```