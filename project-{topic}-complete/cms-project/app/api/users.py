from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import bp
from app.extensions import db, admin_permission
from app.models import User
from app.schemas import UserSchema
from app.utils import has_roles, check_permission
from marshmallow import ValidationError

user_schema = UserSchema()
users_schema = UserSchema(many=True)

@bp.route('/users', methods=['GET'])
@jwt_required()
@has_roles(['admin', 'editor']) # Only admins and editors can list all users
def list_users():
    """
    List all Users
    ---
    tags:
      - Users
    security:
      - jwt: []
    responses:
      200:
        description: A list of users.
        schema:
          type: array
          items:
            $ref: '#/definitions/User'
      401:
        description: Unauthorized
      403:
        description: Forbidden (Insufficient permissions)
    definitions:
      User:
        type: object
        properties:
          id: {type: integer}
          username: {type: string}
          email: {type: string}
          role: {type: string}
          is_active: {type: boolean}
          created_at: {type: string, format: date-time}
          updated_at: {type: string, format: date-time}
    """
    # check_permission(admin_permission) # Alternative using Flask-Principal
    current_app.logger.info("Fetching all users.")
    users = User.query.all()
    return jsonify(users_schema.dump(users)), 200

@bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    """
    Get User by ID
    ---
    tags:
      - Users
    security:
      - jwt: []
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
        description: ID of the user to retrieve.
    responses:
      200:
        description: User details.
        schema:
          $ref: '#/definitions/User'
      401:
        description: Unauthorized
      403:
        description: Forbidden (Can only view own profile unless admin/editor)
      404:
        description: User not found.
    """
    user = User.query.get_or_404(user_id)
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    # Allow users to view their own profile, or admins/editors to view any profile
    if current_user_id == user_id or current_user.role in ['admin', 'editor']:
        return jsonify(user_schema.dump(user)), 200
    else:
        current_app.logger.warning(f"User {current_user_id} attempted to access profile of user {user_id} without permission.")
        return jsonify({"message": "Forbidden: You can only view your own profile."}), 403

@bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    """
    Update User by ID
    ---
    tags:
      - Users
    security:
      - jwt: []
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
        description: ID of the user to update.
      - in: body
        name: body
        schema:
          id: UserUpdate
          properties:
            username: {type: string}
            email: {type: string, format: email}
            password: {type: string, format: password}
            role: {type: string, enum: [admin, editor, author]}
            is_active: {type: boolean}
    responses:
      200:
        description: User successfully updated.
        schema:
          $ref: '#/definitions/User'
      400:
        description: Invalid input.
      401:
        description: Unauthorized
      403:
        description: Forbidden (Cannot update other users unless admin, cannot change own role)
      404:
        description: User not found.
    """
    user = User.query.get_or_404(user_id)
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    # Basic authorization: A user can update their own profile. Admin/Editor can update others.
    # Specific restrictions: Only admin can change roles. Users cannot change their own role.
    if current_user_id != user_id and current_user.role not in ['admin', 'editor']:
        current_app.logger.warning(f"User {current_user_id} attempted to update user {user_id} without permission.")
        return jsonify({"message": "Forbidden: You can only update your own profile."}), 403

    try:
        data = request.get_json()
        # If a non-admin tries to change role, deny it
        if 'role' in data and data['role'] != user.role:
            if current_user.role != 'admin':
                current_app.logger.warning(f"User {current_user_id} attempted to change role for user {user_id} without admin privileges.")
                return jsonify({"message": "Forbidden: Only administrators can change user roles."}), 403
            # An admin changing their own role is allowed but requires careful consideration in a real app
            # For simplicity, we allow admin to change any role including their own for now.

        updated_user = user_schema.load(data, instance=user, partial=True)

        if 'password' in data:
            updated_user.set_password(data['password'])

        db.session.commit()
        current_app.logger.info(f"User {user_id} updated by {current_user_id}.")
        return jsonify(user_schema.dump(updated_user)), 200
    except ValidationError as err:
        return jsonify(err.messages), 400
    except Exception as e:
        current_app.logger.error(f"Error updating user {user_id}: {e}")
        return jsonify({"message": "An error occurred during update"}), 500


@bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@has_roles(['admin']) # Only admins can delete users
def delete_user(user_id):
    """
    Delete User by ID
    ---
    tags:
      - Users
    security:
      - jwt: []
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
        description: ID of the user to delete.
    responses:
      204:
        description: User successfully deleted.
      401:
        description: Unauthorized
      403:
        description: Forbidden (Only admins can delete users)
      404:
        description: User not found.
    """
    user = User.query.get_or_404(user_id)
    current_user_id = get_jwt_identity()

    if current_user_id == user_id:
        current_app.logger.warning(f"Admin {current_user_id} attempted to delete their own account.")
        return jsonify({"message": "Forbidden: An administrator cannot delete their own account."}), 403

    db.session.delete(user)
    db.session.commit()
    current_app.logger.info(f"User {user_id} deleted by admin {current_user_id}.")
    return jsonify({"message": "User deleted successfully"}), 204
```