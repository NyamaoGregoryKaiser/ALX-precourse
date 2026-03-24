from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import bp
from app.extensions import db, admin_permission, editor_permission
from app.models import Category
from app.schemas import CategorySchema
from app.utils import has_roles, check_permission, cached
from marshmallow import ValidationError

category_schema = CategorySchema()
categories_schema = CategorySchema(many=True)

@bp.route('/categories', methods=['POST'])
@jwt_required()
@has_roles(['admin', 'editor']) # Only admins and editors can create categories
def create_category():
    """
    Create a new Category
    ---
    tags:
      - Categories
    security:
      - jwt: []
    parameters:
      - in: body
        name: body
        schema:
          id: CategoryCreate
          required:
            - name
          properties:
            name:
              type: string
              description: Name of the category.
            description:
              type: string
              description: Optional description of the category.
    responses:
      201:
        description: Category created successfully.
        schema:
          $ref: '#/definitions/Category'
      400:
        description: Invalid input or category name already exists.
      401:
        description: Unauthorized
      403:
        description: Forbidden (Insufficient permissions)
    definitions:
      Category:
        type: object
        properties:
          id: {type: integer}
          name: {type: string}
          slug: {type: string}
          description: {type: string}
          created_at: {type: string, format: date-time}
          updated_at: {type: string, format: date-time}
    """
    try:
        data = category_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify(err.messages), 400

    if Category.query.filter_by(name=data['name']).first():
        return jsonify({"message": "Category with this name already exists"}), 400

    new_category = Category(name=data['name'], description=data.get('description'))
    db.session.add(new_category)
    db.session.commit()
    current_app.logger.info(f"Category '{new_category.name}' created by user {get_jwt_identity()}")
    return jsonify(category_schema.dump(new_category)), 201

@bp.route('/categories', methods=['GET'])
@cached(timeout=60) # Cache categories for 1 minute
def list_categories():
    """
    List all Categories
    ---
    tags:
      - Categories
    responses:
      200:
        description: A list of categories.
        schema:
          type: array
          items:
            $ref: '#/definitions/Category'
    """
    current_app.logger.debug("Fetching all categories (might be cached).")
    categories = Category.query.order_by(Category.name).all()
    return jsonify(categories_schema.dump(categories)), 200

@bp.route('/categories/<int:category_id>', methods=['GET'])
@cached(timeout=60) # Cache individual category for 1 minute
def get_category(category_id):
    """
    Get Category by ID
    ---
    tags:
      - Categories
    parameters:
      - in: path
        name: category_id
        type: integer
        required: true
        description: ID of the category to retrieve.
    responses:
      200:
        description: Category details.
        schema:
          $ref: '#/definitions/Category'
      404:
        description: Category not found.
    """
    current_app.logger.debug(f"Fetching category {category_id} (might be cached).")
    category = Category.query.get_or_404(category_id)
    return jsonify(category_schema.dump(category)), 200

@bp.route('/categories/<int:category_id>', methods=['PUT'])
@jwt_required()
@has_roles(['admin', 'editor']) # Only admins and editors can update categories
def update_category(category_id):
    """
    Update Category by ID
    ---
    tags:
      - Categories
    security:
      - jwt: []
    parameters:
      - in: path
        name: category_id
        type: integer
        required: true
        description: ID of the category to update.
      - in: body
        name: body
        schema:
          id: CategoryUpdate
          properties:
            name: {type: string}
            description: {type: string}
    responses:
      200:
        description: Category successfully updated.
        schema:
          $ref: '#/definitions/Category'
      400:
        description: Invalid input or category name already exists.
      401:
        description: Unauthorized
      403:
        description: Forbidden (Insufficient permissions)
      404:
        description: Category not found.
    """
    category = Category.query.get_or_404(category_id)
    try:
        data = category_schema.load(request.get_json(), instance=category, partial=True)
    except ValidationError as err:
        return jsonify(err.messages), 400

    existing_category = Category.query.filter(Category.name == data.name, Category.id != category_id).first()
    if existing_category:
        return jsonify({"message": "Category with this name already exists"}), 400

    db.session.commit()
    current_app.logger.info(f"Category '{category.name}' (ID: {category_id}) updated by user {get_jwt_identity()}")
    # Invalidate cache for this specific category and the list of categories
    cache.delete_memoized(list_categories)
    cache.delete_memoized(get_category, category_id)
    return jsonify(category_schema.dump(category)), 200

@bp.route('/categories/<int:category_id>', methods=['DELETE'])
@jwt_required()
@has_roles(['admin']) # Only admins can delete categories
def delete_category(category_id):
    """
    Delete Category by ID
    ---
    tags:
      - Categories
    security:
      - jwt: []
    parameters:
      - in: path
        name: category_id
        type: integer
        required: true
        description: ID of the category to delete.
    responses:
      204:
        description: Category successfully deleted.
      401:
        description: Unauthorized
      403:
        description: Forbidden (Only admins can delete categories)
      404:
        description: Category not found.
    """
    category = Category.query.get_or_404(category_id)
    if category.contents.count() > 0:
        return jsonify({"message": "Cannot delete category with associated content."}), 400

    db.session.delete(category)
    db.session.commit()
    current_app.logger.info(f"Category '{category.name}' (ID: {category_id}) deleted by user {get_jwt_identity()}")
    # Invalidate cache for list of categories
    cache.delete_memoized(list_categories)
    return jsonify({"message": "Category deleted successfully"}), 204
```