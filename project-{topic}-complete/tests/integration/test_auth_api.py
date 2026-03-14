```python
import pytest
from flask import url_for
from app.extensions import jwt
from app.models.user import User

@pytest.mark.usefixtures('init_database')
def test_register_user_success(client):
    response = client.post('/api/auth/register', json={
        'username': 'reguser',
        'email': 'reg@example.com',
        'password': 'password123',
        'role': 'user'
    })
    assert response.status_code == 201
    data = response.get_json()
    assert 'username' in data
    assert data['username'] == 'reguser'
    assert User.query.filter_by(username='reguser').first() is not None

@pytest.mark.usefixtures('init_database')
def test_register_user_duplicate_username(client):
    client.post('/api/auth/register', json={
        'username': 'dupuser', 'email': 'dup1@example.com', 'password': 'password'
    })
    response = client.post('/api/auth/register', json={
        'username': 'dupuser', 'email': 'dup2@example.com', 'password': 'password'
    })
    assert response.status_code == 400
    assert 'already exists' in response.get_json()['message']

@pytest.mark.usefixtures('init_database')
def test_login_user_success(client):
    client.post('/api/auth/register', json={
        'username': 'loginuser', 'email': 'login@example.com', 'password': 'password123'
    })
    response = client.post('/api/auth/login', json={
        'username': 'loginuser', 'password': 'password123'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert 'access_token' in data
    assert 'refresh_token' in data
    assert 'user' in data
    assert data['user']['username'] == 'loginuser'

@pytest.mark.usefixtures('init_database')
def test_login_user_invalid_credentials(client):
    client.post('/api/auth/register', json={
        'username': 'baduser', 'email': 'bad@example.com', 'password': 'password123'
    })
    response = client.post('/api/auth/login', json={
        'username': 'baduser', 'password': 'wrongpassword'
    })
    assert response.status_code == 401
    assert 'Invalid username or password' in response.get_json()['message']

@pytest.mark.usefixtures('init_database')
def test_refresh_token_success(client):
    client.post('/api/auth/register', json={
        'username': 'refreshuser', 'email': 'refresh@example.com', 'password': 'password123'
    })
    login_res = client.post('/api/auth/login', json={
        'username': 'refreshuser', 'password': 'password123'
    })
    refresh_token = login_res.get_json()['refresh_token']

    refresh_res = client.post('/api/auth/refresh', headers={
        'Authorization': f'Bearer {refresh_token}'
    })
    assert refresh_res.status_code == 200
    data = refresh_res.get_json()
    assert 'access_token' in data

@pytest.mark.usefixtures('init_database')
def test_logout_user_success(client, auth_tokens):
    response = client.post('/api/auth/logout', headers={
        'Authorization': f'Bearer {auth_tokens["user_token"]}'
    })
    assert response.status_code == 200
    assert 'logged out' in response.get_json()['message']

@pytest.mark.usefixtures('init_database')
def test_get_current_user_success(client, auth_tokens):
    response = client.get('/api/auth/me', headers={
        'Authorization': f'Bearer {auth_tokens["user_token"]}'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['id'] == auth_tokens['user_id']
    assert data['username'] == 'testuser'

@pytest.mark.usefixtures('init_database')
def test_get_current_user_unauthorized(client):
    response = client.get('/api/auth/me')
    assert response.status_code == 401
    assert 'Missing Authorization Header' in response.get_json()['message']

@pytest.mark.usefixtures('init_database')
def test_check_admin_access_allowed(client, auth_tokens):
    response = client.get('/api/auth/check_admin', headers={
        'Authorization': f'Bearer {auth_tokens["admin_token"]}'
    })
    assert response.status_code == 200
    assert 'admin access' in response.get_json()['message']

@pytest.mark.usefixtures('init_database')
def test_check_admin_access_forbidden(client, auth_tokens):
    response = client.get('/api/auth/check_admin', headers={
        'Authorization': f'Bearer {auth_tokens["user_token"]}'
    })
    assert response.status_code == 403
    assert 'Admins only access' in response.get_json()['message']

```