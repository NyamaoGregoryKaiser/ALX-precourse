```python
import pytest
from flask import url_for, g
from app.models.user import User, UserRole
from app.extensions import db

@pytest.mark.usefixtures("app", "client", "session", "auth_tokens")
class TestUserAPI:
    def setup_method(self):
        self.admin_user = User.query.filter_by(username='admin_test').first()
        self.editor_user = User.query.filter_by(username='editor_test').first()
        self.regular_user = User.query.filter_by(username='user_test').first()

    def test_get_all_users_as_admin(self, client, auth_tokens):
        response = client.get('/api/users', headers={
            'Authorization': f'Bearer {auth_tokens["admin"]["access"]}'
        })
        assert response.status_code == 200
        assert isinstance(response.json, list)
        assert len(response.json) >= 3 # Includes seeded users

    def test_get_all_users_as_editor_forbidden(self, client, auth_tokens):
        response = client.get('/api/users', headers={
            'Authorization': f'Bearer {auth_tokens["editor"]["access"]}'
        })
        assert response.status_code == 403
        assert 'Forbidden' in response.json['message']

    def test_get_user_by_id_as_admin(self, client, auth_tokens):
        response = client.get(f'/api/users/{self.editor_user.id}', headers={
            'Authorization': f'Bearer {auth_tokens["admin"]["access"]}'
        })
        assert response.status_code == 200
        assert response.json['username'] == 'editor_test'

    def test_get_own_user_by_id_as_regular_user(self, client, auth_tokens):
        response = client.get(f'/api/users/{self.regular_user.id}', headers={
            'Authorization': f'Bearer {auth_tokens["user"]["access"]}'
        })
        assert response.status_code == 200
        assert response.json['username'] == 'user_test'

    def test_get_other_user_by_id_as_regular_user_forbidden(self, client, auth_tokens):
        response = client.get(f'/api/users/{self.admin_user.id}', headers={
            'Authorization': f'Bearer {auth_tokens["user"]["access"]}'
        })
        assert response.status_code == 403
        assert 'Forbidden' in response.json['message']

    def test_get_user_by_id_not_found(self, client, auth_tokens):
        response = client.get('/api/users/9999', headers={
            'Authorization': f'Bearer {auth_tokens["admin"]["access"]}'
        })
        assert response.status_code == 404
        assert 'not found' in response.json['message']

    def test_update_user_as_admin(self, client, auth_tokens):
        update_data = {
            'email': 'updated_editor@example.com',
            'role': UserRole.ADMIN.value
        }
        response = client.put(f'/api/users/{self.editor_user.id}', json=update_data, headers={
            'Authorization': f'Bearer {auth_tokens["admin"]["access"]}'
        })
        assert response.status_code == 200
        assert response.json['email'] == 'updated_editor@example.com'
        assert response.json['role'] == UserRole.ADMIN.value
        assert User.query.get(self.editor_user.id).email == 'updated_editor@example.com'
        assert User.query.get(self.editor_user.id).role == UserRole.ADMIN

    def test_update_own_user_as_regular_user(self, client, auth_tokens):
        update_data = {
            'username': 'updated_regular_user',
            'email': 'updated_regular@example.com'
        }
        response = client.put(f'/api/users/{self.regular_user.id}', json=update_data, headers={
            'Authorization': f'Bearer {auth_tokens["user"]["access"]}'
        })
        assert response.status_code == 200
        assert response.json['username'] == 'updated_regular_user'
        assert response.json['email'] == 'updated_regular@example.com'
        assert User.query.get(self.regular_user.id).username == 'updated_regular_user'

    def test_update_other_user_as_regular_user_forbidden(self, client, auth_tokens):
        update_data = {'username': 'forbidden_update'}
        response = client.put(f'/api/users/{self.admin_user.id}', json=update_data, headers={
            'Authorization': f'Bearer {auth_tokens["user"]["access"]}'
        })
        assert response.status_code == 403
        assert 'Forbidden' in response.json['message']

    def test_regular_user_cannot_change_role(self, client, auth_tokens):
        update_data = {'role': UserRole.ADMIN.value}
        response = client.put(f'/api/users/{self.regular_user.id}', json=update_data, headers={
            'Authorization': f'Bearer {auth_tokens["user"]["access"]}'
        })
        assert response.status_code == 403
        assert 'permission to change user roles' in response.json['message']
        assert User.query.get(self.regular_user.id).role == UserRole.USER # Role should not change

    def test_delete_user_as_admin(self, client, auth_tokens):
        user_to_delete = User(username='temp_del_user', email='temp_del@example.com', password='p', role=UserRole.USER)
        db.session.add(user_to_delete)
        db.session.commit()
        
        response = client.delete(f'/api/users/{user_to_delete.id}', headers={
            'Authorization': f'Bearer {auth_tokens["admin"]["access"]}'
        })
        assert response.status_code == 200
        assert 'deleted successfully' in response.json['message']
        assert User.query.get(user_to_delete.id) is None

    def test_delete_own_admin_account_forbidden(self, client, auth_tokens):
        response = client.delete(f'/api/users/{self.admin_user.id}', headers={
            'Authorization': f'Bearer {auth_tokens["admin"]["access"]}'
        })
        assert response.status_code == 400
        assert 'cannot delete your own admin account' in response.json['message']

    def test_delete_user_as_editor_forbidden(self, client, auth_tokens):
        response = client.delete(f'/api/users/{self.regular_user.id}', headers={
            'Authorization': f'Bearer {auth_tokens["editor"]["access"]}'
        })
        assert response.status_code == 403
        assert 'Forbidden' in response.json['message']

    def test_create_user_with_role_as_admin(self, client, auth_tokens):
        data = {
            'username': 'admin_created_editor',
            'email': 'admin_editor@example.com',
            'password': 'password123',
            'role': UserRole.EDITOR.value
        }
        response = client.post('/api/users/create_with_role', json=data, headers={
            'Authorization': f'Bearer {auth_tokens["admin"]["access"]}'
        })
        assert response.status_code == 201
        assert response.json['user']['username'] == 'admin_created_editor'
        assert response.json['user']['role'] == UserRole.EDITOR.value
        assert User.query.filter_by(username='admin_created_editor').first().role == UserRole.EDITOR

    def test_create_user_with_role_as_editor_forbidden(self, client, auth_tokens):
        data = {
            'username': 'editor_created_user',
            'email': 'editor_user@example.com',
            'password': 'password123',
            'role': UserRole.USER.value
        }
        response = client.post('/api/users/create_with_role', json=data, headers={
            'Authorization': f'Bearer {auth_tokens["editor"]["access"]}'
        })
        assert response.status_code == 403
        assert 'Forbidden' in response.json['message']

```