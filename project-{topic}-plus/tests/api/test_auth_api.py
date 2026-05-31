import pytest
from app.models import User
from app.extensions import db
import json

def test_register_new_user_success(client):
    """Test user registration successfully creates a user and returns tokens."""
    data = {
        'username': 'newuser',
        'email': 'newuser@example.com',
        'password': 'strongpassword'
    }
    response = client.post('/auth/register', json=data)
    assert response.status_code == 201
    assert 'access_token' in response.json
    assert 'refresh_token' in response.json
    assert response.json['user']['username'] == 'newuser'
    
    # Verify user is in DB
    user = User.query.filter_by(email='newuser@example.com').first()
    assert user is not None
    assert user.username == 'newuser'

def test_register_existing_email_fails(client, test_user):
    """Test user registration with an existing email fails."""
    data = {
        'username': 'anotheruser',
        'email': test_user.email, # Use existing email
        'password': 'password123'
    }
    response = client.post('/auth/register', json=data)
    assert response.status_code == 409
    assert 'already exists' in response.json['message']

def test_register_existing_username_fails(client, test_user):
    """Test user registration with an existing username fails."""
    data = {
        'username': test_user.username, # Use existing username
        'email': 'anotheremail@example.com',
        'password': 'password123'
    }
    response = client.post('/auth/register', json=data)
    assert response.status_code == 409
    assert 'already exists' in response.json['message']

def test_register_invalid_data_fails(client):
    """Test user registration with invalid data (e.g., too short password)."""
    data = {
        'username': 'shortpass',
        'email': 'shortpass@example.com',
        'password': '123' # Too short
    }
    response = client.post('/auth/register', json=data)
    assert response.status_code == 400
    assert 'errors' in response.json
    assert 'password' in response.json['errors']

def test_login_success(client, test_user):
    """Test user login successfully returns tokens."""
    data = {
        'email': test_user.email,
        'password': 'testpassword'
    }
    response = client.post('/auth/login', json=data)
    assert response.status_code == 200
    assert 'access_token' in response.json
    assert 'refresh_token' in response.json
    assert response.json['user']['id'] == test_user.id

def test_login_invalid_credentials_fails(client, test_user):
    """Test user login with invalid password fails."""
    data = {
        'email': test_user.email,
        'password': 'wrongpassword'
    }
    response = client.post('/auth/login', json=data)
    assert response.status_code == 401
    assert 'Invalid credentials' in response.json['message']

def test_login_non_existent_user_fails(client):
    """Test user login with a non-existent email fails."""
    data = {
        'email': 'nonexistent@example.com',
        'password': 'anypassword'
    }
    response = client.post('/auth/login', json=data)
    assert response.status_code == 401
    assert 'Invalid credentials' in response.json['message']

def test_login_invalid_data_fails(client):
    """Test user login with invalid data (e.g., missing email)."""
    data = {
        'password': 'password'
    }
    response = client.post('/auth/login', json=data)
    assert response.status_code == 400
    assert 'errors' in response.json
    assert 'email' in response.json['errors']

def test_refresh_token_success(client, test_user):
    """Test token refresh successfully returns a new access token."""
    login_data = {
        'email': test_user.email,
        'password': 'testpassword'
    }
    login_response = client.post('/auth/login', json=login_data)
    refresh_token = login_response.json['refresh_token']

    refresh_headers = {'Authorization': f'Bearer {refresh_token}'}
    refresh_response = client.post('/auth/refresh', headers=refresh_headers)
    assert refresh_response.status_code == 200
    assert 'access_token' in refresh_response.json

def test_refresh_token_with_access_token_fails(client, auth_headers):
    """Test token refresh fails if an access token is used instead of a refresh token."""
    response = client.post('/auth/refresh', headers=auth_headers)
    assert response.status_code == 401
    assert "fresh token required" not in response.json['message'].lower() # Should be about using a refresh token
    assert "refresh token missing or invalid" in response.json['message'].lower()
    
def test_get_me_protected_route_success(client, auth_headers, test_user):
    """Test accessing /users/me with a valid token."""
    response = client.get('/users/me', headers=auth_headers)
    assert response.status_code == 200
    assert response.json['id'] == test_user.id
    assert response.json['email'] == test_user.email

def test_get_me_protected_route_unauthorized(client):
    """Test accessing /users/me without a token."""
    response = client.get('/users/me')
    assert response.status_code == 401
    assert 'Unauthorized' in response.json['message']

def test_update_me_success(client, auth_headers, test_user):
    """Test updating user's own profile."""
    update_data = {
        'username': 'updateduser',
        'email': 'updated@example.com'
    }
    response = client.put('/users/me', headers=auth_headers, json=update_data)
    assert response.status_code == 200
    assert response.json['username'] == 'updateduser'
    assert response.json['email'] == 'updated@example.com'
    
    updated_user = User.query.get(test_user.id)
    assert updated_user.username == 'updateduser'
    assert updated_user.email == 'updated@example.com'

def test_update_me_duplicate_email_fails(client, auth_headers, test_user, session):
    """Test updating with a duplicate email fails."""
    other_user = User(username='otheruser', email='other@example.com')
    other_user.set_password('password')
    session.add(other_user)
    session.commit()

    update_data = {
        'email': 'other@example.com'
    }
    response = client.put('/users/me', headers=auth_headers, json=update_data)
    assert response.status_code == 400
    assert 'Email already taken.' in response.json['message']

def test_delete_me_success(client, auth_headers, test_user):
    """Test deleting user's own account."""
    response = client.delete('/users/me', headers=auth_headers)
    assert response.status_code == 204
    assert User.query.get(test_user.id) is None