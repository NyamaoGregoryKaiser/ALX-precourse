import pytest
import json
from app.models import User
from app.extensions import db

def test_register_user_success(client, init_database):
    response = client.post(
        '/api/v1/register',
        data=json.dumps({
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'password123'
        }),
        content_type='application/json'
    )
    assert response.status_code == 201
    assert "User registered successfully" in response.json['message']

    user = User.query.filter_by(email='newuser@example.com').first()
    assert user is not None
    assert user.username == 'newuser'
    assert user.check_password('password123')
    assert user.role == 'author' # Default role

def test_register_user_existing_email(client, init_database, sample_users):
    response = client.post(
        '/api/v1/register',
        data=json.dumps({
            'username': 'existing',
            'email': sample_users['author'].email, # Use existing email
            'password': 'password123'
        }),
        content_type='application/json'
    )
    assert response.status_code == 400
    assert "Email already exists" in response.json['message']

def test_register_user_invalid_data(client, init_database):
    response = client.post(
        '/api/v1/register',
        data=json.dumps({
            'username': 'u', # Too short
            'email': 'invalid-email', # Invalid format
            'password': '123' # Too short
        }),
        content_type='application/json'
    )
    assert response.status_code == 400
    assert "username" in response.json
    assert "email" in response.json
    assert "password" in response.json

def test_login_user_success(client, init_database, sample_users):
    user = sample_users['author']
    response = client.post(
        '/api/v1/login',
        data=json.dumps({
            'email': user.email,
            'password': 'password123'
        }),
        content_type='application/json'
    )
    assert response.status_code == 200
    assert 'access_token' in response.json
    assert 'refresh_token' in response.json

def test_login_user_invalid_credentials(client, init_database, sample_users):
    response = client.post(
        '/api/v1/login',
        data=json.dumps({
            'email': sample_users['author'].email,
            'password': 'wrongpassword'
        }),
        content_type='application/json'
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json['message']

    response = client.post(
        '/api/v1/login',
        data=json.dumps({
            'email': 'nonexistent@example.com',
            'password': 'password123'
        }),
        content_type='application/json'
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json['message']

def test_protected_route_access(client, auth_tokens):
    headers = {'Authorization': f'Bearer {auth_tokens["author_token"]}'}
    response = client.get('/api/v1/protected', headers=headers)
    assert response.status_code == 200
    assert "access to a protected resource" in response.json['message']

def test_protected_route_no_token(client):
    response = client.get('/api/v1/protected')
    assert response.status_code == 401
    assert "Missing Authorization Header" in response.json['message']

def test_protected_route_invalid_token(client):
    headers = {'Authorization': 'Bearer invalid_token'}
    response = client.get('/api/v1/protected', headers=headers)
    assert response.status_code == 401
    assert "Token has invalid segments" in response.json['message']

def test_refresh_token_success(client, init_database, sample_users):
    user = sample_users['author']
    login_response = client.post(
        '/api/v1/login',
        data=json.dumps({
            'email': user.email,
            'password': 'password123'
        }),
        content_type='application/json'
    )
    refresh_token = login_response.json['refresh_token']

    headers = {'Authorization': f'Bearer {refresh_token}'}
    refresh_response = client.post('/api/v1/refresh', headers=headers)
    assert refresh_response.status_code == 200
    assert 'access_token' in refresh_response.json

def test_refresh_token_invalid_token(client):
    headers = {'Authorization': 'Bearer invalid_refresh_token'}
    response = client.post('/api/v1/refresh', headers=headers)
    assert response.status_code == 401
    assert "Token has invalid segments" in response.json['message']
```