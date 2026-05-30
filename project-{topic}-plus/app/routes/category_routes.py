```python
from flask import Blueprint, request, jsonify, current_app, g
from app.utils.errors import BadRequestError, NotFoundError, ConflictError, ForbiddenError
from app.services.category_service import CategoryService
from app.schemas.category import category_schema, categories_schema
from app.models.user import UserRole
from app.utils.decorators import jwt_required_wrapper, roles_required
from http import HTTPStatus
from app.extensions import limiter, cache

category_bp = Blueprint('category_bp', __name__)
category_service = CategoryService()

@category_bp.route('', methods=['GET'])
@limiter.limit("60 per minute")
@cache.cached(timeout=60, query_string=True) # Cache for 60 seconds, vary by query parameters
def get_categories():
    """
    Retrieves all categories. Publicly accessible.
    """
    current_app.logger.info("Requesting all categories.")
    categories = category_service.get_all_categories()
    return jsonify(categories), HTTPStatus.OK

@category_bp.route('/<int:category_id>', methods=['GET'])
@limiter.limit("60 per minute")
@cache.cached(timeout=300, key_prefix='category_') # Cache for 5 minutes, specific key
def get_category(category_id):
    """
    Retrieves a single category by ID. Publicly accessible.
    """
    current_app.logger.info(f"Requesting category with ID: {category_id}.")
    try:
        category = category_service.get_category_by_id(category_id)
        return jsonify(category), HTTPStatus.OK
    except NotFoundError as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to retrieve category ID {category_id}: {e}", exc_info=True)
        raise

@category_bp.route('', methods=['POST'])
@jwt_required_wrapper
@roles_required([UserRole.ADMIN, UserRole.EDITOR]) # Only admins or editors can create categories
@limiter.limit("10 per minute")
def create_category():
    """
    Creates a new category. Requires ADMIN or EDITOR role.
    """
    current_app.logger.info(f"User {g.current_user.id} ({g.current_user.role.value}) attempting to create category.")
    if not request.is_json:
        raise BadRequestError("Request must be JSON")

    data = request.get_json()
    if not data:
        raise BadRequestError("Invalid JSON data provided.")

    try:
        new_category = category_service.create_category(data)
        cache.delete('all_categories') # Invalidate cache for all categories
        return jsonify(new_category), HTTPStatus.CREATED
    except (BadRequestError, ConflictError) as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to create category: {e}", exc_info=True)
        raise

@category_bp.route('/<int:category_id>', methods=['PUT'])
@jwt_required_wrapper
@roles_required([UserRole.ADMIN, UserRole.EDITOR]) # Only admins or editors can update categories
@limiter.limit("10 per minute")
def update_category(category_id):
    """
    Updates an existing category's information. Requires ADMIN or EDITOR role.
    """
    current_app.logger.info(f"User {g.current_user.id} ({g.current_user.role.value}) attempting to update category ID: {category_id}.")
    if not request.is_json:
        raise BadRequestError("Request must be JSON")

    data = request.get_json()
    if not data:
        raise BadRequestError("Invalid JSON data provided.")

    try:
        updated_category = category_service.update_category(category_id, data)
        cache.delete('all_categories') # Invalidate cache for all categories
        cache.delete(f'category_{category_id}') # Invalidate specific category cache
        return jsonify(updated_category), HTTPStatus.OK
    except (BadRequestError, NotFoundError, ConflictError) as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to update category ID {category_id}: {e}", exc_info=True)
        raise

@category_bp.route('/<int:category_id>', methods=['DELETE'])
@jwt_required_wrapper
@roles_required(UserRole.ADMIN) # Only ADMINs can delete categories
@limiter.limit("5 per minute")
def delete_category(category_id):
    """
    Deletes a category by ID. Requires ADMIN role.
    """
    current_app.logger.info(f"Admin user {g.current_user.id} attempting to delete category ID: {category_id}.")
    try:
        result = category_service.delete_category(category_id)
        cache.delete('all_categories') # Invalidate cache for all categories
        cache.delete(f'category_{category_id}') # Invalidate specific category cache
        return jsonify(result), HTTPStatus.OK
    except (NotFoundError, ConflictError) as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to delete category ID {category_id}: {e}", exc_info=True)
        raise

```