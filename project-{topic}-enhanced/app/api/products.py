from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
from webargs import fields
from webargs.flaskparser import use_args, use_kwargs
from flask_jwt_extended import jwt_required
from app.services.product_service import ProductService
from app.utils.decorators import admin_required
from app.utils.errors import NotFoundError, BadRequestError, ConflictError
from app import cache
import logging

products_bp = Blueprint('products_bp', __name__)
api = Api(products_bp)
logger = logging.getLogger(__name__)

# Args for product listing
product_list_args = {
    "category_id": fields.Int(required=False, validate=lambda x: x > 0),
    "search_term": fields.Str(required=False, allow_none=True),
    "limit": fields.Int(required=False, validate=lambda x: x > 0, missing=20),
    "offset": fields.Int(required=False, validate=lambda x: x >= 0, missing=0),
}

# Args for product creation/update
product_schema_args = {
    "name": fields.Str(required=True, validate=lambda s: len(s) > 0),
    "slug": fields.Str(required=True, validate=lambda s: len(s) > 0),
    "description": fields.Str(required=False, allow_none=True),
    "price": fields.Float(required=True, validate=lambda f: f > 0),
    "stock_quantity": fields.Int(required=True, validate=lambda i: i >= 0),
    "image_url": fields.Str(required=False, allow_none=True),
    "is_active": fields.Bool(required=False),
    "category_id": fields.Int(required=True, validate=lambda x: x > 0)
}

# Args for category creation/update
category_schema_args = {
    "name": fields.Str(required=True, validate=lambda s: len(s) > 0),
    "slug": fields.Str(required=True, validate=lambda s: len(s) > 0),
    "description": fields.Str(required=False, allow_none=True),
}


class ProductListResource(Resource):
    @use_args(product_list_args, location='querystring')
    def get(self, args):
        """
        Get All Products
        ---
        parameters:
          - in: query
            name: category_id
            type: integer
            description: Filter products by category ID
          - in: query
            name: search_term
            type: string
            description: Search products by name or description
          - in: query
            name: limit
            type: integer
            default: 20
            description: Number of results to return
          - in: query
            name: offset
            type: integer
            default: 0
            description: Offset for pagination
        responses:
          200:
            description: List of products
            schema:
              type: array
              items:
                type: object
                properties:
                  id: {type: integer}
                  name: {type: string}
                  slug: {type: string}
                  price: {type: number}
                  stock_quantity: {type: integer}
                  image_url: {type: string}
                  category_id: {type: integer}
                  is_active: {type: boolean}
        """
        try:
            products = ProductService.get_all_products(
                category_id=args.get('category_id'),
                search_term=args.get('search_term'),
                limit=args.get('limit'),
                offset=args.get('offset')
            )
            return [{
                'id': p.id,
                'name': p.name,
                'slug': p.slug,
                'description': p.description,
                'price': float(p.price),
                'stock_quantity': p.stock_quantity,
                'image_url': p.image_url,
                'category_id': p.category_id,
                'is_active': p.is_active
            } for p in products], 200
        except Exception as e:
            logger.error(f"Error getting all products: {e}")
            raise BadRequestError(f"Failed to retrieve products: {e}")

    @admin_required()
    @use_args(product_schema_args, location='json')
    def post(self, args):
        """
        Create a New Product (Admin Only)
        ---
        parameters:
          - in: body
            name: body
            schema:
              type: object
              required:
                - name
                - slug
                - price
                - stock_quantity
                - category_id
              properties:
                name: {type: string}
                slug: {type: string}
                description: {type: string}
                price: {type: number}
                stock_quantity: {type: integer}
                image_url: {type: string}
                category_id: {type: integer}
        security:
          - Bearer: []
        responses:
          201:
            description: Product created successfully
            schema:
              type: object
              properties:
                id: {type: integer}
                name: {type: string}
                slug: {type: string}
          400:
            description: Bad request (validation errors, missing fields, category not found)
          401:
            description: Unauthorized
          403:
            description: Forbidden (not an admin)
          409:
            description: Conflict (slug already exists)
        """
        try:
            product = ProductService.create_product(**args)
            return {'message': 'Product created', 'id': product.id, 'name': product.name, 'slug': product.slug}, 201
        except (BadRequestError, NotFoundError, ConflictError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error creating product: {e}")
            raise BadRequestError(f"Failed to create product: {e}")


class ProductResource(Resource):
    def get(self, product_id):
        """
        Get Product by ID
        ---
        parameters:
          - in: path
            name: product_id
            type: integer
            required: true
            description: ID of the product to retrieve
        responses:
          200:
            description: Product data
            schema:
              type: object
              properties:
                id: {type: integer}
                name: {type: string}
                slug: {type: string}
                description: {type: string}
                price: {type: number}
                stock_quantity: {type: integer}
                image_url: {type: string}
                category_id: {type: integer}
                is_active: {type: boolean}
                created_at: {type: string, format: date-time}
                updated_at: {type: string, format: date-time}
          404:
            description: Product not found
        """
        try:
            product = ProductService.get_product_by_id(product_id)
            return {
                'id': product.id,
                'name': product.name,
                'slug': product.slug,
                'description': product.description,
                'price': float(product.price),
                'stock_quantity': product.stock_quantity,
                'image_url': product.image_url,
                'category_id': product.category_id,
                'is_active': product.is_active,
                'created_at': product.created_at.isoformat(),
                'updated_at': product.updated_at.isoformat()
            }, 200
        except NotFoundError as e:
            raise e
        except Exception as e:
            logger.error(f"Error getting product {product_id}: {e}")
            raise BadRequestError(f"Failed to retrieve product: {e}")

    @admin_required()
    @use_args(product_schema_args, location='json', partial=True) # partial=True for PATCH
    def put(self, args, product_id):
        """
        Update Product by ID (Admin Only)
        ---
        parameters:
          - in: path
            name: product_id
            type: integer
            required: true
            description: ID of the product to update
          - in: body
            name: body
            schema:
              type: object
              properties:
                name: {type: string}
                slug: {type: string}
                description: {type: string}
                price: {type: number}
                stock_quantity: {type: integer}
                image_url: {type: string}
                is_active: {type: boolean}
                category_id: {type: integer}
        security:
          - Bearer: []
        responses:
          200:
            description: Product updated successfully
          400:
            description: Bad request
          401:
            description: Unauthorized
          403:
            description: Forbidden (not an admin)
          404:
            description: Product not found
          409:
            description: Conflict (slug already exists)
        """
        try:
            product = ProductService.update_product(product_id, args)
            return {'message': 'Product updated', 'id': product.id, 'name': product.name}, 200
        except (NotFoundError, BadRequestError, ConflictError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error updating product {product_id}: {e}")
            raise BadRequestError(f"Failed to update product: {e}")

    @admin_required()
    def delete(self, product_id):
        """
        Delete Product by ID (Admin Only)
        ---
        parameters:
          - in: path
            name: product_id
            type: integer
            required: true
            description: ID of the product to delete
        security:
          - Bearer: []
        responses:
          204:
            description: Product deleted successfully
          400:
            description: Bad request
          401:
            description: Unauthorized
          403:
            description: Forbidden (not an admin)
          404:
            description: Product not found
        """
        try:
            ProductService.delete_product(product_id)
            return '', 204
        except (NotFoundError, BadRequestError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error deleting product {product_id}: {e}")
            raise BadRequestError(f"Failed to delete product: {e}")


class CategoryListResource(Resource):
    def get(self):
        """
        Get All Categories
        ---
        responses:
          200:
            description: List of categories
            schema:
              type: array
              items:
                type: object
                properties:
                  id: {type: integer}
                  name: {type: string}
                  slug: {type: string}
                  description: {type: string}
        """
        try:
            categories = ProductService.get_all_categories()
            return [{
                'id': c.id,
                'name': c.name,
                'slug': c.slug,
                'description': c.description
            } for c in categories], 200
        except Exception as e:
            logger.error(f"Error getting all categories: {e}")
            raise BadRequestError(f"Failed to retrieve categories: {e}")

    @admin_required()
    @use_args(category_schema_args, location='json')
    def post(self, args):
        """
        Create a New Category (Admin Only)
        ---
        parameters:
          - in: body
            name: body
            schema:
              type: object
              required:
                - name
                - slug
              properties:
                name: {type: string}
                slug: {type: string}
                description: {type: string}
        security:
          - Bearer: []
        responses:
          201:
            description: Category created successfully
          400:
            description: Bad request
          401:
            description: Unauthorized
          403:
            description: Forbidden (not an admin)
          409:
            description: Conflict (slug already exists)
        """
        try:
            category = ProductService.create_category(**args)
            return {'message': 'Category created', 'id': category.id, 'name': category.name}, 201
        except (BadRequestError, ConflictError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error creating category: {e}")
            raise BadRequestError(f"Failed to create category: {e}")

class CategoryResource(Resource):
    def get(self, category_id):
        """
        Get Category by ID
        ---
        parameters:
          - in: path
            name: category_id
            type: integer
            required: true
            description: ID of the category to retrieve
        responses:
          200:
            description: Category data
            schema:
              type: object
              properties:
                id: {type: integer}
                name: {type: string}
                slug: {type: string}
                description: {type: string}
                created_at: {type: string, format: date-time}
                updated_at: {type: string, format: date-time}
          404:
            description: Category not found
        """
        try:
            category = ProductService.get_category_by_id(category_id)
            return {
                'id': category.id,
                'name': category.name,
                'slug': category.slug,
                'description': category.description,
                'created_at': category.created_at.isoformat(),
                'updated_at': category.updated_at.isoformat()
            }, 200
        except NotFoundError as e:
            raise e
        except Exception as e:
            logger.error(f"Error getting category {category_id}: {e}")
            raise BadRequestError(f"Failed to retrieve category: {e}")

    @admin_required()
    @use_args(category_schema_args, location='json', partial=True)
    def put(self, args, category_id):
        """
        Update Category by ID (Admin Only)
        ---
        parameters:
          - in: path
            name: category_id
            type: integer
            required: true
            description: ID of the category to update
          - in: body
            name: body
            schema:
              type: object
              properties:
                name: {type: string}
                slug: {type: string}
                description: {type: string}
        security:
          - Bearer: []
        responses:
          200:
            description: Category updated successfully
          400:
            description: Bad request
          401:
            description: Unauthorized
          403:
            description: Forbidden (not an admin)
          404:
            description: Category not found
          409:
            description: Conflict (slug already exists)
        """
        try:
            category = ProductService.update_category(category_id, args)
            return {'message': 'Category updated', 'id': category.id, 'name': category.name}, 200
        except (NotFoundError, BadRequestError, ConflictError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error updating category {category_id}: {e}")
            raise BadRequestError(f"Failed to update category: {e}")

    @admin_required()
    def delete(self, category_id):
        """
        Delete Category by ID (Admin Only)
        ---
        parameters:
          - in: path
            name: category_id
            type: integer
            required: true
            description: ID of the category to delete
        security:
          - Bearer: []
        responses:
          204:
            description: Category deleted successfully
          400:
            description: Bad request (if products are associated)
          401:
            description: Unauthorized
          403:
            description: Forbidden (not an admin)
          404:
            description: Category not found
        """
        try:
            ProductService.delete_category(category_id)
            return '', 204
        except (NotFoundError, BadRequestError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error deleting category {category_id}: {e}")
            raise BadRequestError(f"Failed to delete category: {e}")

api.add_resource(ProductListResource, '/products')
api.add_resource(ProductResource, '/products/<int:product_id>')
api.add_resource(CategoryListResource, '/categories')
api.add_resource(CategoryResource, '/categories/<int:category_id>')