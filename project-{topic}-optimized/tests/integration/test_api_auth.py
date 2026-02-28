import pytest
from flask import url_for
from app.models.user import User, UserRole
from app.extensions import bcrypt

def test_register_user(client, db_session):
    # Ensure customer role exists
    customer_role = UserRole.query.filter_by(name='CUSTOMER').first()
    if not customer_role:
        customer_role = UserRole(name='CUSTOMER')
        db_session.add(customer_role)
        db_session.commit()

    response = client.post('/api/auth/register', json={
        'username': 'testuser_api',
        'email': 'test_api@example.com',
        'password': 'testpassword'
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data['username'] == 'testuser_api'
    assert data['email'] == 'test_api@example.com'
    assert 'id' in data
    assert any(role['name'] == 'CUSTOMER' for role in data['roles'])

    # Test duplicate registration
    response = client.post('/api/auth/register', json={
        'username': 'testuser_api',
        'email': 'test_api_dup@example.com',
        'password': 'testpassword'
    })
    assert response.status_code == 409
    assert 'Username already taken.' in response.get_json()['message']

def test_login_user(client, customer_user):
    response = client.post('/api/auth/login', json={
        'email': customer_user.email,
        'password': 'customerpass'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert 'access_token' in data
    assert 'refresh_token' in data

def test_login_user_invalid_credentials(client):
    response = client.post('/api/auth/login', json={
        'email': 'wrong@example.com',
        'password': 'wrongpassword'
    })
    assert response.status_code == 401
    assert 'Invalid credentials' in response.get_json()['message']

def test_refresh_token(client, auth_tokens):
    response = client.post('/api/auth/refresh', headers={
        'Authorization': f"Bearer {auth_tokens['refresh_token']}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert 'access_token' in data

def test_get_current_user(client, auth_tokens, customer_user):
    response = client.get('/api/auth/me', headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['id'] == customer_user.id
    assert data['email'] == customer_user.email
    assert 'password' not in data # password should be load_only=True

def test_logout_user(client, auth_tokens):
    response = client.post('/api/auth/logout', headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    assert 'Successfully logged out.' in response.get_json()['message']

    # Test accessing a protected endpoint with the logged-out token (should fail)
    response = client.get('/api/auth/me', headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 401
    assert 'expired' in response.get_json()['message'] # Token is technically expired due to short test expiry