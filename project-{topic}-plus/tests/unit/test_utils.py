```python
import pytest
from flask import Flask, jsonify, g
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from app.utils.decorators import jwt_required_wrapper, roles_required
from app.utils.errors import UnauthorizedError, ForbiddenError
from app.models.user import User, UserRole
from app.extensions import db
import os
import time

@pytest.fixture(scope="function")
def test_app_jwt(session):
    """Fixture for a minimal Flask app with JWT and test users for decorator tests."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["JWT_SECRET_KEY"] = "test_jwt_secret"
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 1 # 1 second for expiry tests
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = 1
    app.config["SECRET_KEY"] = "test_secret"

    # Configure the in-memory SQLite database
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    JWTManager(app) # Initialize JWTManager

    with app.app_context():
        db.create_all()

        # Create test users
        admin_user = User(username='admin_test', email='admin@test.com', password='password', role=UserRole.ADMIN)
        editor_user = User(username='editor_test', email='editor@test.com', password='password', role=UserRole.EDITOR)
        user = User(username='user_test', email='user@test.com', password='password', role=UserRole.USER)
        inactive_user = User(username='inactive_test', email='inactive@test.com', password='password', role=UserRole.USER, is_active=False)
        db.session.add_all([admin_user, editor_user, user, inactive_user])
        db.session.commit()
        
        # Store users for easy access in tests
        app.test_users = {
            'admin': admin_user,
            'editor': editor_user,
            'user': user,
            'inactive': inactive_user
        }
        
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope="function")
def test_client_jwt(test_app_jwt):
    """Fixture for a test client with JWT support."""
    return test_app_jwt.test_client()

@pytest.fixture(scope="function")
def get_auth_headers(test_app_jwt):
    """Helper to get auth headers for various roles."""
    def _get_headers(role_name, is_fresh=False, user_id=None):
        with test_app_jwt.app_context():
            user = test_app_jwt.test_users.get(role_name)
            if user_id:
                user = User.query.get(user_id)
            if not user:
                raise ValueError(f"User with role {role_name} or ID {user_id} not found.")
            
            access_token = create_access_token(identity=user.id, fresh=is_fresh, additional_claims={"role": user.role.value})
            return {'Authorization': f'Bearer {access_token}'}
    return _get_headers

class TestDecorators:
    def test_jwt_required_wrapper_success(self, test_app_jwt, test_client_jwt, get_auth_headers):
        @test_app_jwt.route('/protected-test')
        @jwt_required_wrapper
        def protected_route_test():
            return jsonify(user_id=g.current_user.id), 200

        headers = get_auth_headers('user')
        response = test_client_jwt.get('/protected-test', headers=headers)
        assert response.status_code == 200
        assert response.json['user_id'] == test_app_jwt.test_users['user'].id
        assert g.current_user.id == test_app_jwt.test_users['user'].id # Verify g.current_user is set

    def test_jwt_required_wrapper_no_token(self, test_app_jwt, test_client_jwt):
        @test_app_jwt.route('/protected-test')
        @jwt_required_wrapper
        def protected_route_no_token():
            return jsonify(user_id=g.current_user.id), 200

        response = test_client_jwt.get('/protected-test')
        assert response.status_code == 401
        assert 'Token not provided' in response.json['message']

    def test_jwt_required_wrapper_inactive_user(self, test_app_jwt, test_client_jwt, get_auth_headers):
        @test_app_jwt.route('/protected-test')
        @jwt_required_wrapper
        def protected_route_inactive_user():
            return jsonify(user_id=g.current_user.id), 200

        headers = get_auth_headers('inactive')
        response = test_client_jwt.get('/protected-test', headers=headers)
        assert response.status_code == 403
        assert 'inactive' in response.json['message']

    def test_roles_required_admin_access(self, test_app_jwt, test_client_jwt, get_auth_headers):
        @test_app_jwt.route('/admin-only')
        @jwt_required_wrapper
        @roles_required(UserRole.ADMIN)
        def admin_only_route():
            return jsonify(access='granted', role=g.current_user.role.value), 200

        headers = get_auth_headers('admin')
        response = test_client_jwt.get('/admin-only', headers=headers)
        assert response.status_code == 200
        assert response.json['access'] == 'granted'
        assert response.json['role'] == UserRole.ADMIN.value

    def test_roles_required_editor_access(self, test_app_jwt, test_client_jwt, get_auth_headers):
        @test_app_jwt.route('/editor-or-admin')
        @jwt_required_wrapper
        @roles_required([UserRole.EDITOR, UserRole.ADMIN])
        def editor_or_admin_route():
            return jsonify(access='granted', role=g.current_user.role.value), 200

        headers = get_auth_headers('editor')
        response = test_client_jwt.get('/editor-or-admin', headers=headers)
        assert response.status_code == 200
        assert response.json['access'] == 'granted'
        assert response.json['role'] == UserRole.EDITOR.value
        
        headers_admin = get_auth_headers('admin')
        response_admin = test_client_jwt.get('/editor-or-admin', headers=headers_admin)
        assert response_admin.status_code == 200
        assert response_admin.json['access'] == 'granted'
        assert response_admin.json['role'] == UserRole.ADMIN.value

    def test_roles_required_forbidden(self, test_app_jwt, test_client_jwt, get_auth_headers):
        @test_app_jwt.route('/admin-only')
        @jwt_required_wrapper
        @roles_required(UserRole.ADMIN)
        def admin_only_route_forbidden():
            return jsonify(access='granted'), 200

        headers = get_auth_headers('user')
        response = test_client_jwt.get('/admin-only', headers=headers)
        assert response.status_code == 403
        assert 'Access denied' in response.json['message']

    def test_roles_required_without_jwt_wrapper_fails(self, test_app_jwt, test_client_jwt, get_auth_headers):
        # This route directly uses roles_required without jwt_required_wrapper
        # which means g.current_user will not be set.
        @test_app_jwt.route('/misconfigured-roles')
        @roles_required(UserRole.ADMIN)
        def misconfigured_roles_route():
            return jsonify(access='granted'), 200

        headers = get_auth_headers('admin')
        response = test_client_jwt.get('/misconfigured-roles', headers=headers)
        assert response.status_code == 401 # Should fail at jwt verification first
        assert 'Token not provided' in response.json['message'] # No jwt_required, so JWTManager catches first.
        
        # If jwt_required was there but not jwt_required_wrapper, then g.current_user wouldn't be set
        # This test setup implies jwt_required is run implicitly if headers are there, but
        # explicit @jwt_required_wrapper ensures g.current_user is reliably set.
        # The specific error 'user context not loaded' would be raised if @jwt_required_wrapper was NOT used,
        # but @jwt_required was, and then @roles_required was used.
        # The current JWTManager setup handles the basic JWT validation first, before our custom logic.
        # To specifically test the `if not hasattr(g, 'current_user')` branch, a different setup would be needed
        # where `jwt_required` runs but `user_lookup_loader` is suppressed or fails in a way that
        # still allows the request to proceed to the decorator but without `g.current_user`.
        # For current setup, the sequence is: `verify_jwt_in_request` -> `user_lookup_loader` -> `g.current_user` set.
        # So `hasattr(g, 'current_user')` will always be true if JWT is valid.
        # This test ensures `jwt_required_wrapper` is part of the decorator chain for roles_required logic to work.

```