import pytest
from flask import Flask, jsonify
from flask_jwt_extended import JWTManager, create_access_token, get_jwt_identity, get_jwt
from app.utils.auth_decorators import jwt_required_with_identity, owns_resource_or_admin #, admin_required
from app.errors import ForbiddenError, UnauthorizedError, NotFoundError, InternalServerError
from app.models import User, DataSource
from app.extensions import db
import os

# Create a minimal app for testing decorators
@pytest.fixture(scope='module')
def auth_app():
    _app = Flask(__name__)
    _app.config['TESTING'] = True
    _app.config['JWT_SECRET_KEY'] = 'test-secret'
    _app.config['SECRET_KEY'] = 'test-secret'
    _app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('TEST_DATABASE_URL', 'sqlite:///:memory:')
    _app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(_app)
    JWTManager(_app)

    with _app.app_context():
        db.create_all()

    # Define a route to test jwt_required_with_identity
    @_app.route('/protected-identity')
    @jwt_required_with_identity()
    def protected_identity_route(current_user):
        return jsonify(user_id=current_user.id, username=current_user.username), 200

    # Define a route to test owns_resource_or_admin
    @_app.route('/data-source/<int:id>')
    @jwt_required_with_identity()
    @owns_resource_or_admin(DataSource, id_param_name='id')
    def owns_resource_route(current_user, id):
        ds = DataSource.query.get(id)
        return jsonify(message="Access granted", data_source_id=ds.id, owner_id=ds.user_id), 200
    
    yield _app

    with _app.app_context():
        db.drop_all()

@pytest.fixture(scope='function')
def auth_client(auth_app):
    return auth_app.test_client()

@pytest.fixture(scope='function')
def setup_users_and_tokens(auth_app):
    with auth_app.app_context():
        # Clean up existing users
        User.query.delete()
        db.session.commit()

        user = User(username='testuser', email='user@example.com')
        user.set_password('password')
        admin = User(username='adminuser', email='admin@example.com')
        admin.set_password('adminpassword')

        db.session.add(user)
        db.session.add(admin)
        db.session.commit()

        user_token = create_access_token(identity=user.id, additional_claims={"is_admin": False})
        admin_token = create_access_token(identity=admin.id, additional_claims={"is_admin": True})

        yield {
            "user": user,
            "admin": admin,
            "user_headers": {'Authorization': f'Bearer {user_token}'},
            "admin_headers": {'Authorization': f'Bearer {admin_token}'}
        }

        db.session.remove()
        User.query.delete()
        db.session.commit()

@pytest.fixture(scope='function')
def setup_data_sources(auth_app, setup_users_and_tokens):
    with auth_app.app_context():
        # Clean up existing data sources
        DataSource.query.delete()
        db.session.commit()

        user = setup_users_and_tokens['user']
        admin = setup_users_and_tokens['admin']

        user_ds = DataSource(name='User DS', type='CSV', user_id=user.id)
        admin_ds = DataSource(name='Admin DS', type='CSV', user_id=admin.id)
        other_ds = DataSource(name='Other User DS', type='CSV', user_id=user.id) # Owned by same user but different

        db.session.add_all([user_ds, admin_ds, other_ds])
        db.session.commit()

        yield {
            "user_ds": user_ds,
            "admin_ds": admin_ds,
            "other_ds": other_ds
        }
        db.session.remove()
        DataSource.query.delete()
        db.session.commit()


def test_jwt_required_with_identity_success(auth_client, setup_users_and_tokens):
    """Test jwt_required_with_identity decorator with valid token."""
    response = auth_client.get('/protected-identity', headers=setup_users_and_tokens['user_headers'])
    assert response.status_code == 200
    assert response.json['user_id'] == setup_users_and_tokens['user'].id
    assert response.json['username'] == setup_users_and_tokens['user'].username

def test_jwt_required_with_identity_no_token(auth_client):
    """Test jwt_required_with_identity decorator without token."""
    response = auth_client.get('/protected-identity')
    assert response.status_code == 401
    assert "unauthorized" in response.json['message'].lower()

def test_jwt_required_with_identity_invalid_token(auth_client):
    """Test jwt_required_with_identity decorator with invalid token."""
    headers = {'Authorization': 'Bearer invalid.token.string'}
    response = auth_client.get('/protected-identity', headers=headers)
    assert response.status_code == 401
    assert "invalid token" in response.json['message'].lower()

def test_jwt_required_with_identity_user_not_found(auth_client, setup_users_and_tokens, mocker):
    """Test jwt_required_with_identity when user identity from token is not in DB."""
    # Temporarily remove the test_user from the DB
    with auth_client.application.app_context():
        db.session.delete(setup_users_and_tokens['user'])
        db.session.commit()

    response = auth_client.get('/protected-identity', headers=setup_users_and_tokens['user_headers'])
    assert response.status_code == 401
    assert "user associated with token not found" in response.json['message'].lower()

def test_owns_resource_or_admin_owner_access(auth_client, setup_users_and_tokens, setup_data_sources):
    """Test owns_resource_or_admin when user owns the resource."""
    user_ds_id = setup_data_sources['user_ds'].id
    response = auth_client.get(f'/data-source/{user_ds_id}', headers=setup_users_and_tokens['user_headers'])
    assert response.status_code == 200
    assert response.json['message'] == "Access granted"
    assert response.json['data_source_id'] == user_ds_id

def test_owns_resource_or_admin_admin_access(auth_client, setup_users_and_tokens, setup_data_sources):
    """Test owns_resource_or_admin when user is an admin but not owner."""
    user_ds_id = setup_data_sources['user_ds'].id
    response = auth_client.get(f'/data-source/{user_ds_id}', headers=setup_users_and_tokens['admin_headers'])
    assert response.status_code == 200
    assert response.json['message'] == "Access granted"
    assert response.json['data_source_id'] == user_ds_id

def test_owns_resource_or_admin_forbidden_access(auth_client, setup_users_and_tokens, setup_data_sources):
    """Test owns_resource_or_admin when non-owner/non-admin tries to access."""
    admin_ds_id = setup_data_sources['admin_ds'].id
    response = auth_client.get(f'/data-source/{admin_ds_id}', headers=setup_users_and_tokens['user_headers'])
    assert response.status_code == 403
    assert "you do not have permission" in response.json['message'].lower()

def test_owns_resource_or_admin_resource_not_found(auth_client, setup_users_and_tokens):
    """Test owns_resource_or_admin when resource does not exist."""
    non_existent_id = 9999
    response = auth_client.get(f'/data-source/{non_existent_id}', headers=setup_users_and_tokens['user_headers'])
    assert response.status_code == 403 # Should return Forbidden to obscure existence

# Test case for missing ID parameter (decorator misconfiguration)
def test_owns_resource_or_admin_missing_id_param(auth_app, auth_client, setup_users_and_tokens, mocker):
    # Mock a scenario where `id_param_name` in decorator doesn't match route arg name
    @auth_app.route('/data-source-misconfigured/<int:some_other_id>')
    @jwt_required_with_identity()
    @owns_resource_or_admin(DataSource, id_param_name='non_existent_id_param')
    def misconfigured_route(current_user, some_other_id):
        return jsonify(message="Should not reach here")

    response = auth_client.get('/data-source-misconfigured/1', headers=setup_users_and_tokens['user_headers'])
    assert response.status_code == 500
    assert "configuration error: missing id parameter" in response.json['message'].lower()

def test_admin_required_success(auth_client, setup_users_and_tokens, mocker):
    """Test admin_required decorator with admin user."""
    @auth_client.application.route('/admin-only')
    @jwt_required_with_identity() # Still need to get identity for claims
    @owns_resource_or_admin(User, id_param_name='id') # Placeholder to satisfy current_user argument requirement for decorator
    def admin_only_route_placeholder(current_user):
        claims = get_jwt()
        if claims.get('is_admin'):
             return jsonify(message="Admin access granted"), 200
        raise ForbiddenError("Admins only!")

    # In a real setup, admin_required would be applied directly.
    # For testing, we simulate `is_admin` claim and manually check.
    response = auth_client.get('/admin-only', headers=setup_users_and_tokens['admin_headers'])
    assert response.status_code == 200
    assert response.json['message'] == "Admin access granted"

def test_admin_required_forbidden(auth_client, setup_users_and_tokens, mocker):
    """Test admin_required decorator with non-admin user."""
    @auth_client.application.route('/admin-only-forbidden')
    @jwt_required_with_identity()
    @owns_resource_or_admin(User, id_param_name='id') # Placeholder to satisfy current_user argument requirement for decorator
    def admin_only_route_forbidden_placeholder(current_user):
        claims = get_jwt()
        if claims.get('is_admin'):
             return jsonify(message="Admin access granted"), 200
        raise ForbiddenError("Admins only!")

    response = auth_client.get('/admin-only-forbidden', headers=setup_users_and_tokens['user_headers'])
    assert response.status_code == 403
    assert "admins only" in response.json['message'].lower()