import pytest
from app import db
from app.models.user import User
from app.schemas.auth import RegisterSchema, LoginSchema, TokenSchema
from app.utils.errors import UnauthorizedError, BadRequestError

def test_register_success(client, app):
    with app.app_context():
        response = client.post(
            '/api/auth/register',
            json=RegisterSchema(username='newuser', email='new@example.com', password='password').model_dump()
        )
        assert response.status_code == 201
        assert response.json['message'] == 'User registered successfully.'
        user = User.get_by_username('newuser')
        assert user is not None
        assert user.check_password('password')

def test_register_duplicate_username(client, test_user, app):
    with app.app_context():
        response = client.post(
            '/api/auth/register',
            json=RegisterSchema(username=test_user.username, email='another@example.com', password='password').model_dump()
        )
        assert response.status_code == 400
        assert 'Username' in response.json['message']

def test_register_duplicate_email(client, test_user, app):
    with app.app_context():
        response = client.post(
            '/api/auth/register',
            json=RegisterSchema(username='another', email=test_user.email, password='password').model_dump()
        )
        assert response.status_code == 400
        assert 'Email' in response.json['message']

def test_register_invalid_data(client):
    response = client.post(
        '/api/auth/register',
        json={'username': 'test', 'email': 'invalid-email', 'password': '123'}
    )
    assert response.status_code == 400
    assert 'Invalid registration data' in response.json['message']
    assert 'email' in response.json['payload'][0]['loc']

def test_login_success(client, test_user, app):
    response = client.post(
        '/api/auth/login',
        json=LoginSchema(username=test_user.username, password='password').model_dump()
    )
    assert response.status_code == 200
    token_data = TokenSchema(**response.json)
    assert token_data.access_token is not None
    assert token_data.token_type == 'bearer'

def test_login_invalid_username(client):
    response = client.post(
        '/api/auth/login',
        json=LoginSchema(username='nonexistent', password='password').model_dump()
    )
    assert response.status_code == 401
    assert 'Invalid username or password' in response.json['message']

def test_login_invalid_password(client, test_user):
    response = client.post(
        '/api/auth/login',
        json=LoginSchema(username=test_user.username, password='wrong_password').model_dump()
    )
    assert response.status_code == 401
    assert 'Invalid username or password' in response.json['message']

def test_login_invalid_data(client):
    response = client.post(
        '/api/auth/login',
        json={'username': 123, 'password': 'password'} # username should be string
    )
    assert response.status_code == 400
    assert 'Invalid login data' in response.json['message']
    assert 'username' in response.json['payload'][0]['loc']
```