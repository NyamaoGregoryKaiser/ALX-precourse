```python
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError
from app.services.product_service import ProductService
from app.schemas import ProductSchema
from app.utils.decorators import admin_required
import uuid

products_bp = Blueprint('products', __name__)
product_schema = ProductSchema()
products_schema = ProductSchema(many=True)

@products_bp.route('/', methods=['POST'])
@jwt_required()
@admin_required
def create_product():
    """
    Create a new product (Admin only).
    ---
    post:
      summary: Create product
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string, description: Product name }
                description: { type: string, description: Product description }
                price: { type: number, format: float, description: Product price }
                stock: { type: integer, description: Product stock quantity }
                image_url: { type: string, format: url, description: URL of product image }
                category_id: { type: string, format: uuid, description: ID of the product's category }
      security:
        - BearerAuth: []
      responses:
        201:
          description: Product created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        400:
          description: Invalid input or data conflict
        401:
          description: Unauthorized
        403:
          description: Forbidden
    """
    try:
        data = product_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({"message": err.messages}), 400

    try:
        new_product = ProductService.create_product(data)
        return jsonify(new_product), 201
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error creating product: {e}")
        return jsonify({"message": "Internal server error"}), 500

@products_bp.route('/', methods=['GET'])
def get_products():
    """
    Get all products with optional filtering and pagination.
    ---
    get:
      summary: Get all products
      parameters:
        - in: query
          name: page
          schema: { type: integer, default: 1 }
          description: Page number for pagination
        - in: query
          name: per_page
          schema: { type: integer, default: 10 }
          description: Number of items per page
        - in: query
          name: category_id
          schema: { type: string, format: uuid }
          description: Filter by category ID
        - in: query
          name: search
          schema: { type: string }
          description: Search by product name or description
        - in: query
          name: min_price
          schema: { type: number, format: float }
          description: Filter by minimum price
        - in: query
          name: max_price
          schema: { type: number, format: float }
          description: Filter by maximum price
      responses:
        200:
          description: List of products
          content:
            application/json:
              schema:
                type: object
                properties:
                  products:
                    type: array
                    items:
                      $ref: '#/components/schemas/Product'
                  total_items: { type: integer }
                  total_pages: { type: integer }
                  current_page: { type: integer }
                  per_page: { type: integer }
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    category_id = request.args.get('category_id', type=uuid.UUID)
    search = request.args.get('search', type=str)
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)

    products_data = ProductService.get_all_products(
        page=page, per_page=per_page, category_id=category_id, search=search,
        min_price=min_price, max_price=max_price
    )
    return jsonify(products_data), 200

@products_bp.route('/<uuid:product_id>', methods=['GET'])
def get_product_by_id(product_id):
    """
    Get product by ID.
    ---
    get:
      summary: Get product by ID
      parameters:
        - in: path
          name: product_id
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the product to retrieve
      responses:
        200:
          description: Product details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        404:
          description: Product not found
    """
    product = ProductService.get_product_by_id(product_id)
    if not product:
        return jsonify({"message": "Product not found"}), 404
    return jsonify(product), 200

@products_bp.route('/slug/<string:product_slug>', methods=['GET'])
def get_product_by_slug(product_slug):
    """
    Get product by slug.
    ---
    get:
      summary: Get product by slug
      parameters:
        - in: path
          name: product_slug
          schema: { type: string }
          required: true
          description: Slug of the product to retrieve
      responses:
        200:
          description: Product details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        404:
          description: Product not found
    """
    product = ProductService.get_product_by_slug(product_slug)
    if not product:
        return jsonify({"message": "Product not found"}), 404
    return jsonify(product), 200

@products_bp.route('/<uuid:product_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_product(product_id):
    """
    Update product by ID (Admin only).
    ---
    put:
      summary: Update product
      parameters:
        - in: path
          name: product_id
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the product to update
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string, description: New product name }
                description: { type: string, description: New product description }
                price: { type: number, format: float, description: New product price }
                stock: { type: integer, description: New product stock quantity }
                image_url: { type: string, format: url, description: New URL of product image }
                category_id: { type: string, format: uuid, description: New ID of the product's category }
      security:
        - BearerAuth: []
      responses:
        200:
          description: Product updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        400:
          description: Invalid input or data conflict
        401:
          description: Unauthorized
        403:
          description: Forbidden
        404:
          description: Product not found
    """
    try:
        data = product_schema.load(request.get_json(), partial=True)
    except ValidationError as err:
        return jsonify({"message": err.messages}), 400

    try:
        updated_product = ProductService.update_product(product_id, data)
        if not updated_product:
            return jsonify({"message": "Product not found"}), 404
        return jsonify(updated_product), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error updating product {product_id}: {e}")
        return jsonify({"message": "Internal server error"}), 500

@products_bp.route('/<uuid:product_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_product(product_id):
    """
    Delete product by ID (Admin only).
    ---
    delete:
      summary: Delete product
      parameters:
        - in: path
          name: product_id
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the product to delete
      security:
        - BearerAuth: []
      responses:
        204:
          description: Product deleted successfully
        401:
          description: Unauthorized
        403:
          description: Forbidden
        404:
          description: Product not found
    """
    try:
        if ProductService.delete_product(product_id):
            return '', 204
        return jsonify({"message": "Product not found"}), 404
    except Exception as e:
        current_app.logger.error(f"Error deleting product {product_id}: {e}")
        return jsonify({"message": "Internal server error"}), 500
```