import pytest
from flask import jsonify
from app.models import User, REVOKED_TOKENS
from flask_jwt_extended import decode_token

def test_register_user(client, init_database):
    """Test successful user registration API."""
    response = client.post('/api/auth/register', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123'
    })
    assert response.status_code == 201
    assert 'User registered successfully' in response.json['msg']
    assert User.query.filter_by(username='testuser').first() is not None

def test_register_user_duplicate_username(client, seed_users):
    """Test registration with existing username returns 409."""
    response = client.post('/api/auth/register', json={
        'username': seed_users['admin'].username,
        'email': 'new@example.com',
        'password': 'password123'
    })
    assert response.status_code == 409
    assert response.json['code'] == 'CONFLICT'
    assert 'Username already exists' in response.json['message']

def test_register_user_invalid_input(client, init_database):
    """Test registration with invalid input returns 400."""
    response = client.post('/api/auth/register', json={
        'username': 'sh', # Too short
        'email': 'invalid-email',
        'password': '123' # Too short
    })
    assert response.status_code == 400
    assert response.json['code'] == 'BAD_REQUEST'
    assert 'username' in response.json['errors']
    assert 'email' in response.json['errors']
    assert 'password' in response.json['errors']

def test_login_user_success(client, seed_users):
    """Test successful user login."""
    response = client.post('/api/auth/login', json={
        'username': seed_users['user1'].username,
        'password': 'password'
    })
    assert response.status_code == 200
    assert 'access_token' in response.json
    assert 'refresh_token' in response.json

def test_login_user_invalid_credentials(client, seed_users):
    """Test login with incorrect password returns 401."""
    response = client.post('/api/auth/login', json={
        'username': seed_users['user1'].username,
        'password': 'wrongpassword'
    })
    assert response.status_code == 401
    assert response.json['code'] == 'UNAUTHORIZED'
    assert 'Invalid credentials' in response.json['message']

def test_refresh_token_success(client, auth_tokens):
    """Test successful token refresh."""
    refresh_token = auth_tokens['admin']['refresh_token']
    response = client.post('/api/auth/refresh', headers={
        'Authorization': f'Bearer {refresh_token}'
    })
    assert response.status_code == 200
    assert 'access_token' in response.json

def test_refresh_token_revoked_failure(client, auth_tokens, app):
    """Test refresh with a revoked refresh token returns 401."""
    refresh_token = auth_tokens['admin']['refresh_token']
    
    # Manually revoke the token
    with app.app_context():
        decoded = decode_token(refresh_token)
        REVOKED_TOKENS.add(decoded['jti'])

    response = client.post('/api/auth/refresh', headers={
        'Authorization': f'Bearer {refresh_token}'
    })
    assert response.status_code == 401
    assert response.json['msg'] == 'Refresh token has been revoked.'

def test_logout_user_success(client, auth_tokens, app):
    """Test successful user logout by revoking refresh token."""
    refresh_token = auth_tokens['user1']['refresh_token']
    
    response = client.post('/api/auth/logout', headers={
        'Authorization': f'Bearer {refresh_token}'
    })
    assert response.status_code == 200
    assert 'Successfully logged out' in response.json['msg']
    
    # Verify token is actually revoked
    with app.app_context():
        decoded = decode_token(refresh_token)
        assert decoded['jti'] in REVOKED_TOKENS

    # Try to use revoked refresh token
    refresh_response = client.post('/api/auth/refresh', headers={
        'Authorization': f'Bearer {refresh_token}'
    })
    assert refresh_response.status_code == 401

def test_get_current_user_info_success(client, user1_auth_header, seed_users):
    """Test retrieving current user info."""
    response = client.get('/api/auth/me', headers=user1_auth_header)
    assert response.status_code == 200
    assert response.json['username'] == seed_users['user1'].username
    assert response.json['email'] == seed_users['user1'].email
    assert response.json['role'] == 'user'

def test_get_current_user_info_unauthorized(client):
    """Test retrieving current user info without token returns 401."""
    response = client.get('/api/auth/me')
    assert response.status_code == 401
    assert 'Missing or invalid token' in response.json['msg']
```