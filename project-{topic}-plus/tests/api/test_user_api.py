```python
import pytest
from performance_monitor.models import User
from performance_monitor.extensions import db

def test_get_all_users_admin(client, db_session, app, auth_tokens):
    with app.app_context():
        admin_headers = auth_tokens['admin_headers']
        response = client.get('/api/users/', headers=admin_headers)
        assert response.status_code == 200
        assert len(response.json) == 2 # Admin and regular user from fixture
        assert any(u['username'] == 'admin_test' for u in response.json)
        assert any(u['username'] == 'user_test' for u in response.json)

def test_get_all_users_regular_forbidden(client, db_session, app, auth_tokens):
    with app.app_context():
        regular_headers = auth_tokens['regular_headers']
        response = client.get('/api/users/', headers=regular_headers)
        assert response.status_code == 403
        assert 'Administrators only!' in response.json['msg']

def test_create_user_admin_success(client, db_session, app, auth_tokens):
    with app.app_context():
        admin_headers = auth_tokens['admin_headers']
        response = client.post(
            '/api/users/',
            headers=admin_headers,
            json={'username': 'newapiuser', 'email': 'newapi@example.com', 'password': 'password', 'is_admin': False}
        )
        assert response.status_code == 201
        assert response.json['username'] == 'newapiuser'
        
        user = User.query.filter_by(username='newapiuser').first()
        assert user is not None
        assert user.check_password('password')

def test_create_user_admin_duplicate(client, db_session, app, auth_tokens):
    with app.app_context():
        admin_headers = auth_tokens['admin_headers']
        # Create user first
        client.post('/api/users/', headers=admin_headers, json={'username': 'dupeuser', 'email': 'dupe@example.com', 'password': 'pass'})
        # Try creating again
        response = client.post('/api/users/', headers=admin_headers, json={'username': 'dupeuser', 'email': 'anotherdupe@example.com', 'password': 'pass'})
        assert response.status_code == 400
        assert 'Username already exists' in response.json['message']

def test_get_user_admin_success(client, app, auth_tokens):
    with app.app_context():
        admin_headers = auth_tokens['admin_headers']
        regular_user_id = auth_tokens['regular_user'].id
        response = client.get(f'/api/users/{regular_user_id}', headers=admin_headers)
        assert response.status_code == 200
        assert response.json['id'] == regular_user_id

def test_get_user_self_success(client, app, auth_tokens):
    with app.app_context():
        regular_headers = auth_tokens['regular_headers']
        regular_user_id = auth_tokens['regular_user'].id
        response = client.get(f'/api/users/{regular_user_id}', headers=regular_headers)
        assert response.status_code == 200
        assert response.json['id'] == regular_user_id

def test_get_user_other_regular_forbidden(client, app, auth_tokens):
    with app.app_context():
        regular_headers = auth_tokens['regular_headers']
        admin_user_id = auth_tokens['admin_user'].id
        response = client.get(f'/api/users/{admin_user_id}', headers=regular_headers)
        assert response.status_code == 403
        assert 'Forbidden: You can only view your own profile' in response.json['message']

def test_update_user_admin_success(client, app, auth_tokens):
    with app.app_context():
        admin_headers = auth_tokens['admin_headers']
        regular_user_id = auth_tokens['regular_user'].id
        response = client.put(
            f'/api/users/{regular_user_id}',
            headers=admin_headers,
            json={'email': 'updated@example.com', 'is_admin': True}
        )
        assert response.status_code == 200
        assert response.json['email'] == 'updated@example.com'
        assert response.json['is_admin'] is True

def test_update_user_self_success(client, app, auth_tokens):
    with app.app_context():
        regular_headers = auth_tokens['regular_headers']
        regular_user_id = auth_tokens['regular_user'].id
        response = client.put(
            f'/api/users/{regular_user_id}',
            headers=regular_headers,
            json={'username': 'self_updated_user'}
        )
        assert response.status_code == 200
        assert response.json['username'] == 'self_updated_user'

def test_delete_user_admin_success(client, db_session, app, auth_tokens):
    with app.app_context():
        admin_headers = auth_tokens['admin_headers']
        user_to_delete = User(username='todelete', email='todelete@example.com')
        user_to_delete.set_password('pass')
        db_session.add(user_to_delete)
        db_session.commit()
        
        response = client.delete(f'/api/users/{user_to_delete.id}', headers=admin_headers)
        assert response.status_code == 204
        assert User.query.get(user_to_delete.id) is None

def test_delete_user_regular_forbidden(client, db_session, app, auth_tokens):
    with app.app_context():
        regular_headers = auth_tokens['regular_headers']
        admin_user_id = auth_tokens['admin_user'].id
        response = client.delete(f'/api/users/{admin_user_id}', headers=regular_headers)
        assert response.status_code == 403
        assert 'Administrators only!' in response.json['msg']

```