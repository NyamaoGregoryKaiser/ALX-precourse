from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.user_service import UserService
from app.utils.decorators import admin_required, requires_auth
from app.utils.errors import NotFoundError, BadRequestError, ConflictError, ForbiddenError
import logging

users_bp = Blueprint('users_bp', __name__)
api = Api(users_bp)
logger = logging.getLogger(__name__)

class UserResource(Resource):
    @jwt_required()
    def get(self, user_id):
        """
        Get User by ID
        ---
        parameters:
          - in: path
            name: user_id
            type: integer
            required: true
            description: ID of the user to retrieve
        security:
          - Bearer: []
        responses:
          200:
            description: User data
            schema:
              type: object
              properties:
                id: {type: integer}
                username: {type: string}
                email: {type: string}
                role: {type: string}
                is_active: {type: boolean}
                created_at: {type: string, format: date-time}
                updated_at: {type: string, format: date-time}
          401:
            description: Unauthorized
          403:
            description: Forbidden (if not admin and requesting another user's data)
          404:
            description: User not found
        """
        current_user_identity = get_jwt_identity()
        current_user_id = current_user_identity['id']
        current_user_role = current_user_identity['role']

        if current_user_id != user_id and current_user_role != 'admin':
            raise ForbiddenError("You do not have permission to view other users' data.")

        try:
            user = UserService.get_user_by_id(user_id)
            return {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat(),
                'updated_at': user.updated_at.isoformat()
            }, 200
        except NotFoundError as e:
            raise e
        except Exception as e:
            logger.error(f"Error getting user {user_id}: {e}")
            raise BadRequestError(f"Failed to retrieve user: {e}")

    @jwt_required()
    def put(self, user_id):
        """
        Update User by ID
        ---
        parameters:
          - in: path
            name: user_id
            type: integer
            required: true
            description: ID of the user to update
          - in: body
            name: body
            schema:
              type: object
              properties:
                username: {type: string}
                email: {type: string, format: email}
                password: {type: string, format: password}
                role:
                  type: string
                  enum: ['customer', 'admin']
                is_active: {type: boolean}
        security:
          - Bearer: []
        responses:
          200:
            description: User updated successfully
          400:
            description: Bad request
          401:
            description: Unauthorized
          403:
            description: Forbidden (if not admin and attempting to change role or another user's data)
          404:
            description: User not found
          409:
            description: Conflict (username/email already exists)
        """
        current_user_identity = get_jwt_identity()
        current_user_id = current_user_identity['id']
        current_user_role = current_user_identity['role']
        data = request.get_json()

        if current_user_id != user_id and current_user_role != 'admin':
            raise ForbiddenError("You do not have permission to update other users' data.")
        
        # Non-admin users cannot change their own role or another user's role
        if current_user_role != 'admin' and 'role' in data and data['role'] != current_user_identity['role']:
            raise ForbiddenError("You do not have permission to change user roles.")
        
        # Non-admin users cannot change is_active status
        if current_user_role != 'admin' and 'is_active' in data:
            raise ForbiddenError("You do not have permission to change user active status.")

        try:
            user = UserService.update_user(user_id, data)
            return {'message': 'User updated successfully', 'user_id': user.id}, 200
        except (NotFoundError, BadRequestError, ConflictError, ForbiddenError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {e}")
            raise BadRequestError(f"Failed to update user: {e}")

    @admin_required()
    def delete(self, user_id):
        """
        Delete User by ID (Admin Only)
        ---
        parameters:
          - in: path
            name: user_id
            type: integer
            required: true
            description: ID of the user to delete
        security:
          - Bearer: []
        responses:
          204:
            description: User deleted successfully
          400:
            description: Bad request
          401:
            description: Unauthorized
          403:
            description: Forbidden (not an admin)
          404:
            description: User not found
        """
        current_user_identity = get_jwt_identity()
        if current_user_identity['id'] == user_id:
            raise BadRequestError("You cannot delete your own account.")
            
        try:
            UserService.delete_user(user_id)
            return '', 204
        except (NotFoundError, BadRequestError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error deleting user {user_id}: {e}")
            raise BadRequestError(f"Failed to delete user: {e}")

class UserListResource(Resource):
    @admin_required()
    def get(self):
        """
        Get All Users (Admin Only)
        ---
        security:
          - Bearer: []
        responses:
          200:
            description: List of all users
            schema:
              type: array
              items:
                type: object
                properties:
                  id: {type: integer}
                  username: {type: string}
                  email: {type: string}
                  role: {type: string}
                  is_active: {type: boolean}
                  created_at: {type: string, format: date-time}
                  updated_at: {type: string, format: date-time}
          401:
            description: Unauthorized
          403:
            description: Forbidden (not an admin)
        """
        try:
            users = UserService.get_all_users()
            return [{
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat(),
                'updated_at': user.updated_at.isoformat()
            } for user in users], 200
        except Exception as e:
            logger.error(f"Error getting all users: {e}")
            raise BadRequestError(f"Failed to retrieve users: {e}")

api.add_resource(UserListResource, '/')
api.add_resource(UserResource, '/<int:user_id>')