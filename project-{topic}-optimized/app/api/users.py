from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from webargs import fields
from webargs.flaskparser import use_args, use_kwargs
from app.schemas.user import UserSchema
from app.services.user_service import UserService
from app.utils.errors import APIError, NotFoundError, BadRequestError, ConflictError, ForbiddenError, InternalServerError
from app.utils.decorators import role_required
from app.extensions import limiter, smorest_api
from flask_smorest import Blueprint as SmorestBlueprint, abort
from app.schemas.response import PaginationSchema

users_bp = SmorestBlueprint('users', __name__, description='User Management Operations')

@users_bp.route('/', methods=['GET'])
@limiter.limit("60 per hour")
@jwt_required()
@role_required(['ADMIN'])
@use_kwargs({
    'page': fields.Int(missing=1),
    'per_page': fields.Int(missing=10),
    'search': fields.Str(missing=None),
}, location="query")
@users_bp.response(200, UserSchema(many=True))
@users_bp.doc(summary="Get all users",
             description="Retrieves a paginated list of all users. Requires ADMIN role.",
             parameters=[
                 {'in': 'query', 'name': 'page', 'schema': {'type': 'integer'}, 'description': 'Page number (default: 1)'},
                 {'in': 'query', 'name': 'per_page', 'schema': {'type': 'integer'}, 'description': 'Items per page (default: 10)'},
                 {'in': 'query', 'name': 'search', 'schema': {'type': 'string'}, 'description': 'Search by username or email'}
             ])
def get_all_users(page, per_page, search):
    """
    Retrieve a paginated list of all users.
    Requires ADMIN role.
    """
    try:
        users, total = UserService.get_all_users(page=page, per_page=per_page, search=search)
        return jsonify({
            "items": UserSchema(many=True).dump(users),
            "total": total,
            "page": page,
            "per_page": per_page
        }), 200
    except ForbiddenError as e:
        abort(403, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while fetching users.")


@users_bp.route('/<int:user_id>', methods=['GET'])
@limiter.limit("60 per hour")
@jwt_required()
@role_required(['ADMIN', 'CUSTOMER', 'EDITOR']) # Any authenticated user can view, but service layer will enforce self-view/admin-view
@users_bp.response(200, UserSchema)
@users_bp.doc(summary="Get user by ID",
             description="Retrieves a specific user by their ID. Admin can view any user; regular users can only view their own profile.")
def get_user_by_id(user_id):
    """
    Retrieve a specific user by ID.
    Admins can fetch any user. Non-admin users can only fetch their own profile.
    """
    try:
        current_user_id = get_jwt_identity()
        current_user_roles = get_jwt().get('roles', [])

        # Self-view or Admin view allowed
        if user_id != current_user_id and 'ADMIN' not in current_user_roles:
            raise ForbiddenError("You are not authorized to view this user's profile.")

        user = UserService.get_user_by_id(user_id)
        return user, 200
    except ForbiddenError as e:
        abort(403, message=str(e))
    except NotFoundError as e:
        abort(404, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while fetching the user.")


@users_bp.route('/<int:user_id>', methods=['PUT'])
@limiter.limit("30 per hour")
@jwt_required()
@role_required(['ADMIN', 'CUSTOMER', 'EDITOR']) # Admin can edit anyone, other roles can edit self
@users_bp.arguments(UserSchema(partial=True, exclude=('email',))) # Exclude email from direct update by non-admin
@users_bp.response(200, UserSchema)
@users_bp.doc(summary="Update user by ID",
             description="Updates an existing user's information. Admin can update any user, including roles and active status. Regular users can only update their own username/password.",
             security=[{"bearerAuth": []}])
def update_user(user_data, user_id):
    """
    Update an existing user's information.
    Admins can update any user, including roles and active status.
    Non-admin users can only update their own username and password.
    """
    try:
        current_user_id = get_jwt_identity()
        current_user_roles = get_jwt().get('roles', [])

        user = UserService.update_user(user_id, user_data, current_user_id, current_user_roles)
        return user, 200
    except ForbiddenError as e:
        abort(403, message=str(e))
    except NotFoundError as e:
        abort(404, message=str(e))
    except BadRequestError as e:
        abort(400, message=str(e))
    except ConflictError as e:
        abort(409, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while updating the user.")


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@limiter.limit("10 per hour")
@jwt_required()
@role_required(['ADMIN'])
@users_bp.response(200, description="User deleted successfully")
@users_bp.doc(summary="Delete user by ID",
             description="Deletes a user account. Requires ADMIN role. Admins cannot delete their own account.")
def delete_user(user_id):
    """
    Delete a user account.
    Requires ADMIN role. An admin cannot delete their own account.
    """
    try:
        current_user_id = get_jwt_identity()
        current_user_roles = get_jwt().get('roles', [])

        response = UserService.delete_user(user_id, current_user_id, current_user_roles)
        return jsonify(response), 200
    except ForbiddenError as e:
        abort(403, message=str(e))
    except NotFoundError as e:
        abort(404, message=str(e))
    except BadRequestError as e:
        abort(400, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while deleting the user.")