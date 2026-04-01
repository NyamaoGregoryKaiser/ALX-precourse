```python
import pytest
from flask import url_for
from performance_monitor.models import User
from performance_monitor.extensions import db
from performance_monitor.auth import REVOKED_TOKENS

def test_register_user_success(client, db_session, app):
    with app.app_context():
        db_session.query(User).delete() # Clean slate
        db_session.commit()

        response = client.post(
            '/api/auth/register',
            json={'username': 'register_user', 'email': 'register@example.com', 'password': 'password123'}
        )
        assert response.status_code == 201
        assert 'message' in response.json
        assert 'access_token' in response.json # Auto-login after register
        assert 'refresh_token' in response.json

        user = User.query.filter_by(username='register_user').first()
        assert user is not None
        assert user.check_password('password123')

def test_register_user_duplicate_username(client, db_session, app):
    with app.app_context():
        db_session.query(User).delete()
        db_session.commit()
        user = User(username='existing', email='existing@example.com')
        user.set_password('password')
        db_session.add(user)
        db_session.commit()

        response = client.post(
            '/api/auth/register',
            json={'username': 'existing', 'email': 'new@example.com', 'password': 'password123'}
        )
        assert response.status_code == 400
        assert 'Username already exists' in response.json['message']

def test_login_user_success(client, db_session, app):
    with app.app_context():
        db_session.query(User).delete()
        db_session.commit()
        user = User(username='login_user', email='login@example.com')
        user.set_password('login_password')
        db_session.add(user)
        db_session.commit()

        response = client.post(
            '/api/auth/login',
            json={'username': 'login_user', 'password': 'login_password'}
        )
        assert response.status_code == 200
        assert 'access_token' in response.json
        assert 'refresh_token' in response.json

def test_login_user_invalid_credentials(client, db_session, app):
    with app.app_context():
        db_session.query(User).delete()
        db_session.commit()
        user = User(username='fail_user', email='fail@example.com')
        user.set_password('correct_password')
        db_session.add(user)
        db_session.commit()

        response = client.post(
            '/api/auth/login',
            json={'username': 'fail_user', 'password': 'wrong_password'}
        )
        assert response.status_code == 401
        assert 'Invalid username or password' in response.json['message']

def test_logout_user(client, app, auth_tokens):
    with app.app_context():
        admin_headers = auth_tokens['admin_headers']
        response = client.post('/api/auth/logout', headers=admin_headers)
        assert response.status_code == 200
        assert 'Successfully logged out' in response.json['message']
        # Verify token is in blacklist (in-memory for this example)
        from flask_jwt_extended import get_raw_jwt
        with app.test_request_context(headers=admin_headers):
            jti = get_raw_jwt()['jti']
            assert jti in REVOKED_TOKENS

def test_protected_endpoint_access(client, app, auth_tokens):
    with app.app_context():
        regular_headers = auth_tokens['regular_headers']
        response = client.get('/api/auth/protected', headers=regular_headers)
        assert response.status_code == 200
        assert 'Hello' in response.json['message']

def test_protected_endpoint_no_token(client, app):
    with app.app_context():
        response = client.get('/api/auth/protected')
        assert response.status_code == 401
        assert 'Missing or invalid token' in response.json['message']

def test_refresh_token_success(client, app, auth_tokens):
    with app.app_context():
        regular_user = auth_tokens['regular_user']
        # Generate a refresh token for the user
        from flask_jwt_extended import create_refresh_token
        with app.test_request_context():
            refresh_token = create_refresh_token(identity=regular_user.id)
            refresh_headers = {'Authorization': f'Bearer {refresh_token}'}

        response = client.post('/api/auth/refresh', headers=refresh_headers)
        assert response.status_code == 200
        assert 'access_token' in response.json
        assert response.json['access_token'] != auth_tokens['regular_headers']['Authorization'].split(' ')[1] # Should be a new access token

def test_refresh_token_with_access_token_instead_of_refresh(client, app, auth_tokens):
    with app.app_context():
        access_token_headers = auth_tokens['regular_headers']
        response = client.post('/api/auth/refresh', headers=access_token_headers)
        assert response.status_code == 401
        assert 'Refresh token required' in response.json['message']

```