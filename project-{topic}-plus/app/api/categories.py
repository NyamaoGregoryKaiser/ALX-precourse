```python
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError
from app.services.product_service import CategoryService
from app.schemas import CategorySchema
from app.utils.decorators import admin_required
import uuid

categories_bp = Blueprint('categories', __name__)
category_schema = CategorySchema()
categories_schema = CategorySchema(many=True)

@categories_bp.route('/', methods=['POST'])
@jwt_required()
@admin_required
def create_category():
    """
    Create a new category (Admin only).
    ---
    post:
      summary: Create category
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string, description: Category name }
                description: { type: string, description: Category description }
      security:
        - BearerAuth: []
      responses:
        201:
          description: Category created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Category'
        400:
          description: Invalid input or category already exists
        401:
          description: Unauthorized
        403:
          description: Forbidden
    """
    try:
        data = category_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({"message": err.messages}), 400

    try:
        new_category = CategoryService.create_category(data)
        return jsonify(new_category), 201
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error creating category: {e}")
        return jsonify({"message": "Internal server error"}), 500

@categories_bp.route('/', methods=['GET'])
def get_categories():
    """
    Get all categories.
    ---
    get:
      summary: Get all categories
      responses:
        200:
          description: List of categories
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Category'
    """
    categories = CategoryService.get_all_categories()
    return jsonify(categories), 200

@categories_bp.route('/<uuid:category_id>', methods=['GET'])
def get_category_by_id(category_id):
    """
    Get category by ID.
    ---
    get:
      summary: Get category by ID
      parameters:
        - in: path
          name: category_id
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the category to retrieve
      responses:
        200:
          description: Category details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Category'
        404:
          description: Category not found
    """
    category = CategoryService.get_category_by_id(category_id)
    if not category:
        return jsonify({"message": "Category not found"}), 404
    return jsonify(category), 200

@categories_bp.route('/<uuid:category_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_category(category_id):
    """
    Update category by ID (Admin only).
    ---
    put:
      summary: Update category
      parameters:
        - in: path
          name: category_id
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the category to update
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string, description: New category name }
                description: { type: string, description: New category description }
      security:
        - BearerAuth: []
      responses:
        200:
          description: Category updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Category'
        400:
          description: Invalid input or data conflict
        401:
          description: Unauthorized
        403:
          description: Forbidden
        404:
          description: Category not found
    """
    try:
        data = category_schema.load(request.get_json(), partial=True)
    except ValidationError as err:
        return jsonify({"message": err.messages}), 400

    try:
        updated_category = CategoryService.update_category(category_id, data)
        if not updated_category:
            return jsonify({"message": "Category not found"}), 404
        return jsonify(updated_category), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error updating category {category_id}: {e}")
        return jsonify({"message": "Internal server error"}), 500

@categories_bp.route('/<uuid:category_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_category(category_id):
    """
    Delete category by ID (Admin only).
    ---
    delete:
      summary: Delete category
      parameters:
        - in: path
          name: category_id
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the category to delete
      security:
        - BearerAuth: []
      responses:
        204:
          description: Category deleted successfully
        400:
          description: Cannot delete category with associated products
        401:
          description: Unauthorized
        403:
          description: Forbidden
        404:
          description: Category not found
    """
    try:
        if CategoryService.delete_category(category_id):
            return '', 204
        return jsonify({"message": "Category not found"}), 404
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error deleting category {category_id}: {e}")
        return jsonify({"message": "Internal server error"}), 500
```