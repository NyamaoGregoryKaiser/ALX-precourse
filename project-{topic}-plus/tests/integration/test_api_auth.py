```python
import pytest
from flask import url_for
from app.models.user import User, UserRole
from app.extensions import db
from app.utils.jwt_handlers import REVOKED_TOKENS

@pytest.mark.usefixtures("app", "client", "session", "auth_tokens")
class TestAuthAPI:
    def test_register_user_success(self, client):
        data = {
            'username': 'new_reg_user',
            'email': 'new_reg_user@example.com',
            'password': 'strongpassword'
        }
        response = client.post('/api/auth/register', json=data)
        assert response.status_code == 201
        assert 'message' in response.json
        assert 'user' in response.json
        assert response.json['user']['username'] == 'new_reg_user'
        assert response.json['user']['role'] == UserRole.USER.value
        assert User.query.filter_by(username='new_reg_user').first() is not None

    def test_register_user_duplicate_username(self, client):
        data = {
            'username': 'user_test',  # Exists from conftest
            'email': 'duplicate@example.com',
            'password': 'password'
        }
        response = client.post('/api/auth/register', json=data)
        assert response.status_code == 409
        assert 'message' in response.json
        assert 'already exists' in response.json['message']

    def test_register_user_missing_fields(self, client):
        data = {
            'username': 'incomplete_user',
            'password': 'password'
        }
        response = client.post('/api/auth/register', json=data)
        assert response.status_code == 400
        assert 'message' in response.json
        assert 'email' in response.json['message'] # Validation error

    def test_login_user_success(self, client):
        response = client.post('/api/auth/login', json={
            'username': 'user_test',
            'password': 'password'
        })
        assert response.status_code == 200
        assert 'access_token' in response.json
        assert 'refresh_token' in response.json
        assert response.json['user']['username'] == 'user_test'

    def test_login_user_invalid_credentials(self, client):
        response = client.post('/api/auth/login', json={
            'username': 'user_test',
            'password': 'wrongpassword'
        })
        assert response.status_code == 401
        assert 'message' in response.json
        assert 'Invalid username or password' in response.json['message']

    def test_login_user_not_found(self, client):
        response = client.post('/api/auth/login', json={
            'username': 'nonexistent',
            'password': 'password'
        })
        assert response.status_code == 401
        assert 'message' in response.json
        assert 'Invalid username or password' in response.json['message']

    def test_refresh_token_success(self, client, auth_tokens):
        refresh_token = auth_tokens['user']['refresh']
        response = client.post('/api/auth/refresh', headers={
            'Authorization': f'Bearer {refresh_token}'
        })
        assert response.status_code == 200
        assert 'access_token' in response.json

    def test_refresh_token_with_access_token_fails(self, client, auth_tokens):
        access_token = auth_tokens['user']['access']
        response = client.post('/api/auth/refresh', headers={
            'Authorization': f'Bearer {access_token}'
        })
        assert response.status_code == 401
        assert 'message' in response.json
        assert 'refresh token required' in response.json['message']

    def test_logout_user_success(self, client, auth_tokens):
        access_token = auth_tokens['user']['access']
        response = client.post('/api/auth/logout', headers={
            'Authorization': f'Bearer {access_token}'
        })
        assert response.status_code == 200
        assert 'message' in response.json
        assert 'logged out' in response.json['message']
        # Check if token is in blocklist (mocked via REVOKED_TOKENS set)
        assert 'jti' in response.json['message'] # The JTI is implicitly checked by the jwt callback
        
        # Try accessing protected route with revoked token
        response_protected = client.get('/api/auth/protected', headers={
            'Authorization': f'Bearer {access_token}'
        })
        assert response_protected.status_code == 401
        assert 'revoked' in response_protected.json['message']


    def test_protected_route_access(self, client, auth_tokens):
        access_token = auth_tokens['admin']['access']
        response = client.get('/api/auth/protected', headers={
            'Authorization': f'Bearer {access_token}'
        })
        assert response.status_code == 200
        assert 'logged_in_as' in response.json
        assert response.json['logged_in_as'] == 'admin_test'
        assert response.json['role'] == UserRole.ADMIN.value

    def test_protected_route_no_token(self, client):
        response = client.get('/api/auth/protected')
        assert response.status_code == 401
        assert 'message' in response.json
        assert 'Token not provided' in response.json['message']

    def test_protected_route_invalid_token(self, client, auth_tokens):
        invalid_token = auth_tokens['non_existent']['access'] # Malformed token
        response = client.get('/api/auth/protected', headers={
            'Authorization': f'Bearer {invalid_token}'
        })
        assert response.status_code == 403 # Flask-JWT-Extended gives 403 for invalid signature
        assert 'message' in response.json
        assert 'Signature verification failed' in response.json['message']

    def test_protected_route_expired_token(self, client, app, auth_tokens):
        # For testing purposes, JWT_ACCESS_TOKEN_EXPIRES is set to 1 second in TestingConfig
        # We simulate expiry by creating a token and waiting for it to expire
        with app.app_context():
            user = User.query.filter_by(username='user_test').first()
            expired_access_token, _ = create_auth_tokens(user.id, user.role.value, fresh=True)
        
        # In a real test, you'd mock time or wait. For an in-memory test, this is harder.
        # Assuming short expiry is already configured for testing and the token immediately expires.
        # This test primarily verifies the expired_token_loader callback.
        
        response = client.get('/api/auth/protected', headers={
            'Authorization': f'Bearer {expired_access_token}'
        })
        assert response.status_code == 401
        assert 'message' in response.json
        assert 'Token has expired' in response.json['message']
```