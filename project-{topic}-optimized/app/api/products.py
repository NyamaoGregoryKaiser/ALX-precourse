from flask import jsonify
from flask_jwt_extended import jwt_required
from webargs import fields
from webargs.flaskparser import use_args, use_kwargs
from app.schemas.product import ProductSchema
from app.services.product_service import ProductService
from app.utils.errors import APIError, NotFoundError, BadRequestError, ConflictError, ForbiddenError
from app.utils.decorators import role_required, cache_response
from app.extensions import limiter, smorest_api
from flask_smorest import Blueprint as SmorestBlueprint, abort

products_bp = SmorestBlueprint('products', __name__, description='Product Catalog Management')

@products_bp.route('/', methods=['GET'])
@limiter.limit("100 per hour")
@jwt_required(optional=True) # Publicly accessible, but authenticated users get faster limits/more data
@use_kwargs({
    'page': fields.Int(missing=1),
    'per_page': fields.Int(missing=10),
    'search': fields.Str(missing=None),
    'category_id': fields.Int(missing=None),
    'min_price': fields.Float(missing=None),
    'max_price': fields.Float(missing=None),
    'is_active': fields.Bool(missing=True),
}, location="query")
@cache_response(timeout=60, key_prefix="products_list") # Cache for 1 minute
@products_bp.response(200, ProductSchema(many=True))
@products_bp.doc(summary="Get all products",
             description="Retrieves a paginated list of products. Can be filtered by search term, category, price range, and active status.")
def get_all_products(page, per_page, search, category_id, min_price, max_price, is_active):
    """
    Retrieve a paginated list of all products.
    """
    try:
        products, total = ProductService.get_all_products(
            page=page, per_page=per_page, search=search,
            category_id=category_id, min_price=min_price, max_price=max_price,
            is_active=is_active
        )
        return jsonify({
            "items": ProductSchema(many=True).dump(products),
            "total": total,
            "page": page,
            "per_page": per_page
        }), 200
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while fetching products.")


@products_bp.route('/<int:product_id>', methods=['GET'])
@limiter.limit("100 per hour")
@jwt_required(optional=True)
@cache_response(timeout=300, key_prefix="product_detail") # Cache for 5 minutes
@products_bp.response(200, ProductSchema)
@products_bp.doc(summary="Get product by ID",
             description="Retrieves a specific product by its ID.")
def get_product_by_id(product_id):
    """
    Retrieve a specific product by ID.
    """
    try:
        product = ProductService.get_product_by_id(product_id)
        return product, 200
    except NotFoundError as e:
        abort(404, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while fetching the product.")


@products_bp.route('/', methods=['POST'])
@limiter.limit("30 per hour")
@jwt_required()
@role_required(['ADMIN', 'EDITOR'])
@products_bp.arguments(ProductSchema)
@products_bp.response(201, ProductSchema)
@products_bp.doc(summary="Create a new product",
             description="Creates a new product. Requires ADMIN or EDITOR role.")
def create_product(product_data):
    """
    Create a new product.
    Requires ADMIN or EDITOR role.
    """
    try:
        product = ProductService.create_product(**product_data)
        return product, 201
    except ConflictError as e:
        abort(409, message=str(e))
    except BadRequestError as e:
        abort(400, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred during product creation.")


@products_bp.route('/<int:product_id>', methods=['PUT'])
@limiter.limit("30 per hour")
@jwt_required()
@role_required(['ADMIN', 'EDITOR'])
@products_bp.arguments(ProductSchema(partial=True))
@products_bp.response(200, ProductSchema)
@products_bp.doc(summary="Update product by ID",
             description="Updates an existing product. Requires ADMIN or EDITOR role.")
def update_product(product_data, product_id):
    """
    Update an existing product.
    Requires ADMIN or EDITOR role.
    """
    try:
        product = ProductService.update_product(product_id, product_data)
        return product, 200
    except NotFoundError as e:
        abort(404, message=str(e))
    except ConflictError as e:
        abort(409, message=str(e))
    except BadRequestError as e:
        abort(400, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while updating the product.")


@products_bp.route('/<int:product_id>', methods=['DELETE'])
@limiter.limit("10 per hour")
@jwt_required()
@role_required(['ADMIN', 'EDITOR'])
@products_bp.response(200, description="Product deleted successfully")
@products_bp.doc(summary="Delete product by ID",
             description="Deletes a product. Requires ADMIN or EDITOR role.")
def delete_product(product_id):
    """
    Delete a product.
    Requires ADMIN or EDITOR role.
    """
    try:
        response = ProductService.delete_product(product_id)
        return jsonify(response), 200
    except NotFoundError as e:
        abort(404, message=str(e))
    except BadRequestError as e:
        abort(400, message=str(e))
    except APIError as e:
        abort(e.status_code, message=str(e))
    except Exception as e:
        abort(500, message="An unexpected error occurred while deleting the product.")