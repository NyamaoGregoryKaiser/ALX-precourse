```python
import pytest
from app.models.user import User

@pytest.mark.usefixtures('init_database')
def test_create_user_admin_success(client, auth_tokens):
    response = client.post('/api/users/', headers={
        'Authorization': f'Bearer {auth_tokens["admin_token"]}'
    }, json={
        'username': 'newadminuser',
        'email': 'newadmin@example.com',
        'password': 'password123',
        'role': 'admin'
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data['username'] == 'newadminuser'
    assert data['role'] == 'admin'

@pytest.mark.usefixtures('init_database')
def test_create_user_non_admin_forbidden(client, auth_tokens):
    response = client.post('/api/users/', headers={
        'Authorization': f'Bearer {auth_tokens["user_token"]}'
    }, json={
        'username': 'nonadminuser', 'email': 'nonadmin@example.com', 'password': 'password123'
    })
    assert response.status_code == 403
    assert 'Admins only access' in response.get_json()['message']

@pytest.mark.usefixtures('init_database')
def test_get_all_users_admin_success(client, auth_tokens, sample_users):
    response = client.get('/api/users/', headers={
        'Authorization': f'Bearer {auth_tokens["admin_token"]}'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert 'users' in data
    assert data['total'] >= 4 # Existing users + sample users from fixtures

@pytest.mark.usefixtures('init_database')
def test_get_all_users_non_admin_forbidden(client, auth_tokens):
    response = client.get('/api/users/', headers={
        'Authorization': f'Bearer {auth_tokens["user_token"]}'
    })
    assert response.status_code == 403
    assert 'Admins only access' in response.get_json()['message']

@pytest.mark.usefixtures('init_database')
def test_get_user_by_id_admin_success(client, auth_tokens, sample_users):
    user_id = sample_users['user1'].id
    response = client.get(f'/api/users/{user_id}', headers={
        'Authorization': f'Bearer {auth_tokens["admin_token"]}'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['id'] == user_id
    assert data['username'] == sample_users['user1'].username

@pytest.mark.usefixtures('init_database')
def test_update_user_admin_success(client, auth_tokens, sample_users):
    user_id = sample_users['user1'].id
    response = client.put(f'/api/users/{user_id}', headers={
        'Authorization': f'Bearer {auth_tokens["admin_token"]}'
    }, json={
        'username': 'updated.user1',
        'is_active': False
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['username'] == 'updated.user1'
    assert data['is_active'] is False

@pytest.mark.usefixtures('init_database')
def test_update_user_non_admin_forbidden(client, auth_tokens, sample_users):
    user_id = sample_users['user1'].id
    response = client.put(f'/api/users/{user_id}', headers={
        'Authorization': f'Bearer {auth_tokens["user_token"]}'
    }, json={
        'username': 'attempted.update'
    })
    assert response.status_code == 403
    assert 'Admins only access' in response.get_json()['message']

@pytest.mark.usefixtures('init_database')
def test_delete_user_admin_success(client, auth_tokens, sample_users):
    user_id = sample_users['user2'].id
    response = client.delete(f'/api/users/{user_id}', headers={
        'Authorization': f'Bearer {auth_tokens["admin_token"]}'
    })
    assert response.status_code == 204
    assert User.query.get(user_id) is None

@pytest.mark.usefixtures('init_database')
def test_delete_user_non_admin_forbidden(client, auth_tokens, sample_users):
    user_id = sample_users['user2'].id
    response = client.delete(f'/api/users/{user_id}', headers={
        'Authorization': f'Bearer {auth_tokens["user_token"]}'
    })
    assert response.status_code == 403
    assert 'Admins only access' in response.get_json()['message']
```