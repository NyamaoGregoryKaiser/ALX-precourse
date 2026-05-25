import pytest
import json
from app.models import User
from app.extensions import db, cache, jwt
from flask_jwt_extended import decode_token

def test_full_registration_login_logout_flow(client, db_session, app):
    """
    Tests the complete user journey: register -> verify -> login -> access protected -> logout.
    This is an integration test covering multiple API endpoints and database interactions.
    """
    # 1. Register a new user
    register_data = {
        'username': 'integration_user',
        'email': 'integration@example.com',
        'password': 'testpassword'
    }
    reg_response = client.post('/api/v1/auth/register', json=register_data)
    assert reg_response.status_code == 201
    assert 'User registered successfully' in reg_response.json['message']

    user = User.query.filter_by(username='integration_user').first()
    assert user is not None
    assert user.is_verified is False

    # 2. Simulate email verification (manually set is_verified to True for test simplicity)
    # In a real integration test, you'd parse the email and use the token.
    user.is_verified = True
    db_session.commit()
    assert user.is_verified is True

    # 3. Login the verified user
    login_data = {
        'username': 'integration_user',
        'password': 'testpassword'
    }
    login_response = client.post('/api/v1/auth/login', json=login_data)
    assert login_response.status_code == 200
    assert 'access_token' in login_response.json
    assert 'refresh_token' in login_response.json
    access_token = login_response.json['access_token']
    refresh_token = login_response.json['refresh_token']

    auth_header = {'Authorization': f'Bearer {access_token}'}

    # 4. Access a protected endpoint (e.g., user profile)
    profile_response = client.get('/api/v1/user/profile', headers=auth_header)
    assert profile_response.status_code == 200
    assert profile_response.json['username'] == 'integration_user'
    assert profile_response.json['email'] == 'integration@example.com'

    # 5. Try to access an admin-only endpoint (should fail)
    admin_response = client.get('/api/v1/admin/users', headers=auth_header)
    assert admin_response.status_code == 403 # Forbidden
    assert 'message' in admin_response.json
    assert 'Admin privileges required' in admin_response.json['message']

    # 6. Refresh the token
    refresh_header = {'Authorization': f'Bearer {refresh_token}'}
    refresh_response = client.post('/api/v1/auth/refresh', headers=refresh_header)
    assert refresh_response.status_code == 200
    assert 'access_token' in refresh_response.json
    new_access_token = refresh_response.json['access_token']
    new_auth_header = {'Authorization': f'Bearer {new_access_token}'}

    # Verify old refresh token is blacklisted
    decoded_old_refresh = decode_token(refresh_token)
    with app.app_context(): # Need app context for cache
        assert cache.get(decoded_old_refresh['jti']) is not None

    # Access protected endpoint with new token
    profile_response_new_token = client.get('/api/v1/user/profile', headers=new_auth_header)
    assert profile_response_new_token.status_code == 200
    assert profile_response_new_token.json['username'] == 'integration_user'

    # 7. Logout
    logout_response = client.post('/api/v1/auth/logout', headers=new_auth_header)
    assert logout_response.status_code == 200
    assert 'Successfully logged out' in logout_response.json['message']

    # Verify access token is blacklisted
    decoded_new_access = decode_token(new_access_token)
    with app.app_context():
        assert cache.get(decoded_new_access['jti']) is not None

    # 8. Try to access protected endpoint after logout (should fail)
    post_logout_response = client.get('/api/v1/user/profile', headers=new_auth_header)
    assert post_logout_response.status_code == 401
    assert 'Token has been revoked' in post_logout_response.json['message']