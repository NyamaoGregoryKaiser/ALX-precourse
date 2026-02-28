from flask import jsonify
from flask_jwt_extended import jwt_required
from webargs import fields
from webargs.flaskparser import use_args, use_kwargs
from app.schemas.category import CategorySchema
from app.services.category_service import CategoryService
from app.utils.errors import APIError, NotFoundError, BadRequestError, ConflictError, ForbiddenError
from app.utils.decorators import role_required, cache_response
from app.extensions import limiter, smorest_api
from flask_smorest import Blueprint as SmorestBlueprint, abort

categories_bp = SmorestBlueprint('categories', __name__, description='Product Category Management')


@categories_bp.route('/', methods=['GET'])
@limiter.limit("100 per hour")
@jwt_required(optional=True) # Publicly accessible, but authenticated users get faster limits/more data
@use_kwargs({
    'page': fields.Int(missing=1),
    'per_page': fields.Int(missing=10),
    'search': fields.Str(missing=None),
    'is_active': fields.Bool(missing=True),
}, location="query")
@cache_response(timeout=300, key_prefix="categories_list") # Cache for 5 minutes
@categories_bp.response(200, CategorySchema(many=True))
@categories_bp.doc(summary="Get all categories",
             description="Retrieves a paginated list of product categories. Can be filtered by search term and active status.")
def get_all_categories(page, per_page, search, is_active):
    """
    Retrieve a paginated list of all product categories.
    """
    try:
        categories, total = CategoryService.get_all_categories(page=page, per_page=per_page, search=search, is_active=is_active)
        return jsonify({
            "items": CategorySchema(many=True).dump(categories),
            "total": total,
            "page": page,
            "per_page": per_page
        }), 200
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while fetching categories.")


@categories_bp.route('/<int:category_id>', methods=['GET'])
@limiter.limit("100 per hour")
@jwt_required(optional=True)
@cache_response(timeout=600, key_prefix="category_detail") # Cache for 10 minutes
@categories_bp.response(200, CategorySchema)
@categories_bp.doc(summary="Get category by ID",
             description="Retrieves a specific category by its ID.")
def get_category_by_id(category_id):
    """
    Retrieve a specific category by ID.
    """
    try:
        category = CategoryService.get_category_by_id(category_id)
        return category, 200
    except NotFoundError as e:
        abort(404, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while fetching the category.")


@categories_bp.route('/', methods=['POST'])
@limiter.limit("30 per hour")
@jwt_required()
@role_required(['ADMIN', 'EDITOR'])
@categories_bp.arguments(CategorySchema)
@categories_bp.response(201, CategorySchema)
@categories_bp.doc(summary="Create a new category",
             description="Creates a new product category. Requires ADMIN or EDITOR role.")
def create_category(category_data):
    """
    Create a new category.
    Requires ADMIN or EDITOR role.
    """
    try:
        category = CategoryService.create_category(**category_data)
        return category, 201
    except ConflictError as e:
        abort(409, message=str(e))
    except BadRequestError as e:
        abort(400, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred during category creation.")


@categories_bp.route('/<int:category_id>', methods=['PUT'])
@limiter.limit("30 per hour")
@jwt_required()
@role_required(['ADMIN', 'EDITOR'])
@categories_bp.arguments(CategorySchema(partial=True))
@categories_bp.response(200, CategorySchema)
@categories_bp.doc(summary="Update category by ID",
             description="Updates an existing category. Requires ADMIN or EDITOR role.")
def update_category(category_data, category_id):
    """
    Update an existing category.
    Requires ADMIN or EDITOR role.
    """
    try:
        category = CategoryService.update_category(category_id, category_data)
        return category, 200
    except NotFoundError as e:
        abort(404, message=str(e))
    except ConflictError as e:
        abort(409, message=str(e))
    except BadRequestError as e:
        abort(400, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while updating the category.")


@categories_bp.route('/<int:category_id>', methods=['DELETE'])
@limiter.limit("10 per hour")
@jwt_required()
@role_required(['ADMIN', 'EDITOR'])
@categories_bp.response(200, description="Category deleted successfully")
@categories_bp.doc(summary="Delete category by ID",
             description="Deletes a category. Requires ADMIN or EDITOR role. Cannot delete if products are associated.")
def delete_category(category_id):
    """
    Delete a category.
    Requires ADMIN or EDITOR role. Cannot delete if products are associated.
    """
    try:
        response = CategoryService.delete_category(category_id)
        return jsonify(response), 200
    except NotFoundError as e:
        abort(404, message=str(e))
    except BadRequestError as e:
        abort(400, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while deleting the category.")