```python
from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_raw_jwt, fresh_jwt_required
from performance_monitor.services.user_service import UserService
from performance_monitor.auth import authenticate_user, add_token_to_blacklist, configure_jwt_revoked_store
from performance_monitor.extensions import jwt, limiter
from performance_monitor.models import User # For claims_loader

# Configure JWT token revoked store callback here or in __init__.py
configure_jwt_revoked_store(jwt)

api = Namespace('auth', description='Authentication related operations')

user_auth_model = api.model('UserAuth', {
    'username': fields.String(required=True, description='User username'),
    'password': fields.String(required=True, description='User password')
})

user_register_model = api.model('UserRegister', {
    'username': fields.String(required=True, description='User username'),
    'email': fields.String(required=True, description='User email'),
    'password': fields.String(required=True, description='User password')
})

token_refresh_model = api.model('RefreshToken', {
    'refresh_token': fields.String(required=True, description='Refresh token')
})

# Register endpoint and login endpoint are often rate-limited
# You can customize these limits
# @api.route('/register')
# @limiter.limit("5 per hour", methods=['POST'])
@api.route('/register')
class UserRegister(Resource):
    @api.expect(user_register_model)
    @api.response(201, 'User successfully registered.')
    @api.response(400, 'Bad Request: Validation error or user already exists.')
    def post(self):
        """Registers a new user."""
        data = request.json
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        user, error = UserService.create_user(username, email, password)
        if error:
            api.abort(400, message=error)
        
        # Optionally log in the user immediately after registration
        access_token, refresh_token = authenticate_user(username, password) # Re-authenticate to get tokens with claims
        if access_token:
            return {
                'message': 'User registered and logged in successfully',
                'access_token': access_token,
                'refresh_token': refresh_token
            }, 201
        
        return {'message': 'User registered successfully, but failed to log in automatically.'}, 201


@api.route('/login')
@limiter.limit("10 per minute", methods=['POST'])
class UserLogin(Resource):
    @api.expect(user_auth_model)
    @api.response(200, 'Login successful.')
    @api.response(401, 'Invalid credentials.')
    @api.response(429, 'Too many requests.')
    def post(self):
        """Logs in a user and returns access/refresh tokens."""
        data = request.json
        username = data.get('username')
        password = data.get('password')

        user = authenticate_user(username, password)
        if not user:
            api.abort(401, message='Invalid username or password.')

        access_token, refresh_token = create_access_token(identity=user.id, user_claims={'is_admin': user.is_admin}, fresh=True), create_refresh_token(identity=user.id)
        return {
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token
        }, 200

@api.route('/logout')
class UserLogout(Resource):
    @jwt_required
    @api.response(200, 'Logout successful.')
    @api.response(401, 'Unauthorized.')
    def post(self):
        """Logs out a user by revoking their current access token."""
        jti = get_raw_jwt()['jti']
        add_token_to_blacklist(jti)
        return {'message': 'Successfully logged out.'}, 200

@api.route('/refresh')
class TokenRefresh(Resource):
    @jwt_required(refresh=True)
    @api.response(200, 'Token refreshed successfully.')
    @api.response(401, 'Refresh token invalid or expired.')
    def post(self):
        """Refreshes an access token using a refresh token."""
        current_user_id = get_jwt_identity()
        user = UserService.get_user_by_id(current_user_id)
        if not user:
            api.abort(401, message="User not found for refresh token.")
        
        new_access_token = create_access_token(identity=current_user_id, user_claims={'is_admin': user.is_admin}, fresh=False)
        return {'access_token': new_access_token}, 200

@api.route('/protected')
class ProtectedResource(Resource):
    @jwt_required
    @api.response(200, 'Access granted.')
    @api.response(401, 'Unauthorized.')
    def get(self):
        """Example of a protected endpoint."""
        current_user_id = get_jwt_identity()
        return {'message': f'Hello, user {current_user_id}! You have access to this protected resource.'}, 200

@api.route('/fresh-protected')
class FreshProtectedResource(Resource):
    @fresh_jwt_required
    @api.response(200, 'Access granted (fresh token).')
    @api.response(401, 'Unauthorized.')
    def get(self):
        """Example of an endpoint requiring a fresh token."""
        current_user_id = get_jwt_identity()
        return {'message': f'Hello, user {current_user_id}! You have access with a fresh token.'}, 200

```