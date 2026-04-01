```python
from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt_claims
from performance_monitor.services.user_service import UserService
from performance_monitor.utils.decorators import admin_required

api = Namespace('users', description='User management operations')

user_model = api.model('User', {
    'id': fields.Integer(readOnly=True, description='The unique identifier of a user'),
    'username': fields.String(required=True, description='The user username'),
    'email': fields.String(required=True, description='The user email address'),
    'is_admin': fields.Boolean(description='Whether the user has admin privileges', default=False),
    'created_at': fields.DateTime(readOnly=True, description='Timestamp of user creation'),
    'updated_at': fields.DateTime(readOnly=True, description='Timestamp of last user update')
})

user_create_model = api.model('UserCreate', {
    'username': fields.String(required=True, description='The user username'),
    'email': fields.String(required=True, description='The user email address'),
    'password': fields.String(required=True, description='The user password'),
    'is_admin': fields.Boolean(description='Whether the user has admin privileges', default=False)
})

user_update_model = api.model('UserUpdate', {
    'username': fields.String(description='The user username'),
    'email': fields.String(description='The user email address'),
    'password': fields.String(description='The user password (only if changing)'),
    'is_admin': fields.Boolean(description='Whether the user has admin privileges')
})


@api.route('/')
class UserList(Resource):
    @jwt_required
    @admin_required # Only admins can view all users
    @api.doc('list_users')
    @api.marshal_list_with(user_model)
    def get(self):
        """List all users (Admin only)."""
        users = UserService.get_all_users()
        return [user.to_dict() for user in users]

    @jwt_required
    @admin_required # Only admins can create users via API, or a separate registration endpoint exists
    @api.doc('create_user')
    @api.expect(user_create_model)
    @api.response(201, 'User successfully created.')
    @api.response(400, 'Validation Error or User already exists.')
    @api.marshal_with(user_model)
    def post(self):
        """Create a new user (Admin only)."""
        data = request.json
        user, error = UserService.create_user(
            data['username'],
            data['email'],
            data['password'],
            data.get('is_admin', False)
        )
        if error:
            api.abort(400, message=error)
        return user.to_dict(), 201


@api.route('/<int:user_id>')
@api.param('user_id', 'The user identifier')
@api.response(404, 'User not found.')
class User(Resource):
    @jwt_required
    @api.doc('get_user')
    @api.marshal_with(user_model)
    def get(self, user_id):
        """Fetch a user given its identifier (Admin or self)."""
        current_user_id = get_jwt_identity()
        claims = get_jwt_claims()

        if current_user_id != user_id and not claims.get('is_admin'):
            api.abort(403, message='Forbidden: You can only view your own profile unless you are an administrator.')

        user = UserService.get_user_by_id(user_id)
        if not user:
            api.abort(404, message='User not found.')
        return user.to_dict()

    @jwt_required
    @api.doc('update_user')
    @api.expect(user_update_model)
    @api.response(200, 'User successfully updated.')
    @api.response(400, 'Validation Error or Username/Email already exists.')
    @api.marshal_with(user_model)
    def put(self, user_id):
        """Update a user (Admin or self)."""
        current_user_id = get_jwt_identity()
        claims = get_jwt_claims()

        if current_user_id != user_id and not claims.get('is_admin'):
            api.abort(403, message='Forbidden: You can only update your own profile unless you are an administrator.')

        data = request.json
        user, error = UserService.update_user(user_id, data)
        if error:
            api.abort(400, message=error)
        if not user: # Should not happen if previous checks pass
            api.abort(404, message='User not found.')
        return user.to_dict(), 200

    @jwt_required
    @admin_required # Only admins can delete users
    @api.doc('delete_user')
    @api.response(204, 'User successfully deleted.')
    def delete(self, user_id):
        """Delete a user (Admin only)."""
        success, error = UserService.delete_user(user_id)
        if not success:
            api.abort(404, message=error)
        return '', 204

```