import pytest
import json
from app.models import User, TokenBlacklist
from app.extensions import db, cache, jwt
from flask_jwt_extended import decode_token

def test_register_success(client, db_session):
    """Test successful user registration."""
    data = {
        'username': 'newuser',
        'email': 'newuser@example.com',
        'password': 'password123'
    }
    response = client.post('/api/v1/auth/register', json=data)
    assert response.status_code == 201
    assert 'message' in response.json
    assert 'User registered successfully. Please check your email to verify your account.' in response.json['message']

    user = User.query.filter_by(username='newuser').first()
    assert user is not None
    assert user.is_verified is False # Should be unverified initially

def test_register_duplicate_username_email(client, db_session):
    """Test registration with existing username or email."""
    user = User(username='existing', email='existing@example.com', password='password123')
    db_session.add(user)
    db_session.commit()

    # Try duplicate username
    data = {'username': 'existing', 'email': 'another@example.com', 'password': 'pass'}
    response = client.post('/api/v1/auth/register', json=data)
    assert response.status_code == 400
    assert 'errors' in response.json
    assert 'username' in response.json['errors']

    # Try duplicate email
    data = {'username': 'another', 'email': 'existing@example.com', 'password': 'pass'}
    response = client.post('/api/v1/auth/register', json=data)
    assert response.status_code == 400
    assert 'errors' in response.json
    assert 'email' in response.json['errors']

def test_login_success(client, db_session, verified_user):
    """Test successful user login."""
    data = {
        'username': verified_user.username,
        'password': 'password123'
    }
    response = client.post('/api/v1/auth/login', json=data)
    assert response.status_code == 200
    assert 'access_token' in response.json
    assert 'refresh_token' in response.json

def test_login_invalid_credentials(client, db_session, verified_user):
    """Test login with invalid password."""
    data = {
        'username': verified_user.username,
        'password': 'wrongpassword'
    }
    response = client.post('/api/v1/auth/login', json=data)
    assert response.status_code == 401
    assert 'message' in response.json
    assert 'Invalid username or password' in response.json['message']

def test_login_unverified_account(client, db_session, unverified_user):
    """Test login with an unverified account."""
    data = {
        'username': unverified_user.username,
        'password': 'password123'
    }
    response = client.post('/api/v1/auth/login', json=data)
    assert response.status_code == 403
    assert 'message' in response.json
    assert 'Account not verified' in response.json['message']

def test_logout_success(client, db_session, auth_header, verified_user):
    """Test successful logout."""
    response = client.post('/api/v1/auth/logout', headers=auth_header)
    assert response.status_code == 200
    assert 'message' in response.json
    assert 'Successfully logged out' in response.json['message']

    # Verify token is blacklisted in Redis
    access_token = auth_header['Authorization'].split(' ')[1]
    decoded_token = decode_token(access_token)
    assert cache.get(decoded_token['jti']) is not None

def test_logout_invalid_token(client, db_session):
    """Test logout with an invalid or missing token."""
    response = client.post('/api/v1/auth/logout', headers={'Authorization': 'Bearer invalid_token'})
    assert response.status_code == 401
    assert 'message' in response.json
    assert 'Signature verification failed' in response.json['message']

def test_refresh_token_success(client, db_session, verified_user, app):
    """Test successful token refresh."""
    with app.app_context():
        login_data = {
            'username': verified_user.username,
            'password': 'password123'
        }
        login_response = client.post('/api/v1/auth/login', json=login_data)
        refresh_token = login_response.json['refresh_token']

        refresh_header = {'Authorization': f'Bearer {refresh_token}'}
        refresh_response = client.post('/api/v1/auth/refresh', headers=refresh_header)
        assert refresh_response.status_code == 200
        assert 'access_token' in refresh_response.json

        # Verify old refresh token is blacklisted
        decoded_refresh = decode_token(refresh_token)
        assert cache.get(decoded_refresh['jti']) is not None

def test_refresh_token_invalid(client, db_session):
    """Test token refresh with an invalid refresh token."""
    refresh_header = {'Authorization': f'Bearer invalid_refresh_token'}
    response = client.post('/api/v1/auth/refresh', headers=refresh_header)
    assert response.status_code == 401
    assert 'message' in response.json
    assert 'Signature verification failed' in response.json['message']

def test_forgot_password_success(client, db_session, verified_user):
    """Test forgot password request."""
    data = {'email': verified_user.email}
    response = client.post('/api/v1/auth/forgot-password', json=data)
    assert response.status_code == 200
    assert 'message' in response.json
    assert 'Password reset link sent to your email' in response.json['message']

def test_forgot_password_email_not_found(client, db_session):
    """Test forgot password for non-existent email."""
    data = {'email': 'nonexistent@example.com'}
    response = client.post('/api/v1/auth/forgot-password', json=data)
    assert response.status_code == 404
    assert 'message' in response.json
    assert 'User with that email not found' in response.json['message']

# Note: Testing reset_password and verify_email requires simulating a token from an email,
# which is harder in a simple API test. These would typically be integration tests with a mock mail server.
# For now, we assume the token generation is correct (tested in unit tests implicitly)
# and the endpoint logic works if a valid token is provided.
# A full test might involve parsing the email content to extract the token.

# Example for verify_email (conceptual, requires token from a mock email service)
# def test_verify_email_success(client, db_session, unverified_user, app):
#     with app.app_context():
#         token = generate_email_verification_token(unverified_user.id) # Helper function
#         response = client.get(f'/api/v1/auth/verify-email/{token}')
#         assert response.status_code == 200
#         assert unverified_user.is_verified is True # After response, reload user

# This would require more sophisticated mocking for the email service in tests,
# or extending the test harness to retrieve tokens from a "sent" email.