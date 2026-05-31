from flask import request
from flask_restx import Namespace, Resource, fields
from app.extensions import db
from app.models import User
from app.schemas import user_schema
from app.utils.auth_decorators import jwt_required_with_identity #, admin_required
from app.errors import NotFoundError, ForbiddenError, BadRequestError
import logging

log = logging.getLogger(__name__)

users_ns = Namespace('users', description='User specific operations')

user_model = users_ns.model('User', user_schema.as_dict())

@users_ns.route('/me')
class MeResource(Resource):
    @jwt_required_with_identity()
    @users_ns.marshal_with(user_model)
    @users_ns.response(401, 'Unauthorized')
    @users_ns.response(404, 'User Not Found (should not happen with valid token)')
    @users_ns.response(500, 'Internal Server Error')
    def get(self, current_user):
        """Retrieve the profile of the authenticated user."""
        log.info(f"Fetching profile for user ID: {current_user.id}")
        return current_user, 200

    @jwt_required_with_identity()
    @users_ns.expect(user_model, validate=True, skip_none=True) # Allow partial updates
    @users_ns.marshal_with(user_model)
    @users_ns.response(400, 'Validation Error')
    @users_ns.response(401, 'Unauthorized')
    @users_ns.response(404, 'User Not Found')
    @users_ns.response(409, 'Conflict (username/email already exists)')
    @users_ns.response(500, 'Internal Server Error')
    def put(self, current_user):
        """Update the profile of the authenticated user."""
        data = request.json
        try:
            # Load with partial=True to allow missing required fields for updates
            updated_data = user_schema.load(data, partial=True)
        except Exception as e:
            log.warning(f"User update validation error: {e.messages}", exc_info=True)
            raise BadRequestError(description="Invalid input data.", errors=e.messages)

        # Check for unique username/email if they are being updated
        if 'username' in updated_data and updated_data['username'] != current_user.username:
            if User.query.filter(User.username == updated_data['username'], User.id != current_user.id).first():
                raise BadRequestError("Username already taken.")
            current_user.username = updated_data['username']

        if 'email' in updated_data and updated_data['email'] != current_user.email:
            if User.query.filter(User.email == updated_data['email'], User.id != current_user.id).first():
                raise BadRequestError("Email already taken.")
            current_user.email = updated_data['email']

        db.session.commit()
        log.info(f"User ID: {current_user.id} profile updated.")
        return current_user, 200

    @jwt_required_with_identity()
    @users_ns.response(204, 'User deleted successfully')
    @users_ns.response(401, 'Unauthorized')
    @users_ns.response(500, 'Internal Server Error')
    def delete(self, current_user):
        """Delete the authenticated user's account."""
        # For a real application, consider soft deletes or a more complex process.
        # Ensure cascading deletes are correctly configured in models.py
        db.session.delete(current_user)
        db.session.commit()
        log.info(f"User ID: {current_user.id} account deleted.")
        return '', 204

# Example of an admin-only endpoint
# @users_ns.route('/')
# class UserList(Resource):
#     @admin_required()
#     @users_ns.marshal_list_with(user_model)
#     def get(self):
#         """(Admin Only) Retrieve a list of all users."""
#         return User.query.all(), 200