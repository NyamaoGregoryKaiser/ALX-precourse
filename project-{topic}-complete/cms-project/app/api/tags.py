from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import bp
from app.extensions import db, admin_permission, editor_permission
from app.models import Tag
from app.schemas import TagSchema
from app.utils import has_roles, check_permission, cached
from marshmallow import ValidationError

tag_schema = TagSchema()
tags_schema = TagSchema(many=True)

@bp.route('/tags', methods=['POST'])
@jwt_required()
@has_roles(['admin', 'editor']) # Only admins and editors can create tags
def create_tag():
    """
    Create a new Tag
    ---
    tags:
      - Tags
    security:
      - jwt: []
    parameters:
      - in: body
        name: body
        schema:
          id: TagCreate
          required:
            - name
          properties:
            name:
              type: string
              description: Name of the tag.
    responses:
      201:
        description: Tag created successfully.
        schema:
          $ref: '#/definitions/Tag'
      400:
        description: Invalid input or tag name already exists.
      401:
        description: Unauthorized
      403:
        description: Forbidden (Insufficient permissions)
    definitions:
      Tag:
        type: object
        properties:
          id: {type: integer}
          name: {type: string}
          slug: {type: string}
          created_at: {type: string, format: date-time}
          updated_at: {type: string, format: date-time}
    """
    try:
        data = tag_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify(err.messages), 400

    if Tag.query.filter_by(name=data['name']).first():
        return jsonify({"message": "Tag with this name already exists"}), 400

    new_tag = Tag(name=data['name'])
    db.session.add(new_tag)
    db.session.commit()
    current_app.logger.info(f"Tag '{new_tag.name}' created by user {get_jwt_identity()}")
    return jsonify(tag_schema.dump(new_tag)), 201

@bp.route('/tags', methods=['GET'])
@cached(timeout=60) # Cache tags for 1 minute
def list_tags():
    """
    List all Tags
    ---
    tags:
      - Tags
    responses:
      200:
        description: A list of tags.
        schema:
          type: array
          items:
            $ref: '#/definitions/Tag'
    """
    current_app.logger.debug("Fetching all tags (might be cached).")
    tags = Tag.query.order_by(Tag.name).all()
    return jsonify(tags_schema.dump(tags)), 200

@bp.route('/tags/<int:tag_id>', methods=['GET'])
@cached(timeout=60) # Cache individual tag for 1 minute
def get_tag(tag_id):
    """
    Get Tag by ID
    ---
    tags:
      - Tags
    parameters:
      - in: path
        name: tag_id
        type: integer
        required: true
        description: ID of the tag to retrieve.
    responses:
      200:
        description: Tag details.
        schema:
          $ref: '#/definitions/Tag'
      404:
        description: Tag not found.
    """
    current_app.logger.debug(f"Fetching tag {tag_id} (might be cached).")
    tag = Tag.query.get_or_404(tag_id)
    return jsonify(tag_schema.dump(tag)), 200

@bp.route('/tags/<int:tag_id>', methods=['PUT'])
@jwt_required()
@has_roles(['admin', 'editor']) # Only admins and editors can update tags
def update_tag(tag_id):
    """
    Update Tag by ID
    ---
    tags:
      - Tags
    security:
      - jwt: []
    parameters:
      - in: path
        name: tag_id
        type: integer
        required: true
        description: ID of the tag to update.
      - in: body
        name: body
        schema:
          id: TagUpdate
          properties:
            name: {type: string}
    responses:
      200:
        description: Tag successfully updated.
        schema:
          $ref: '#/definitions/Tag'
      400:
        description: Invalid input or tag name already exists.
      401:
        description: Unauthorized
      403:
        description: Forbidden (Insufficient permissions)
      404:
        description: Tag not found.
    """
    tag = Tag.query.get_or_404(tag_id)
    try:
        data = tag_schema.load(request.get_json(), instance=tag, partial=True)
    except ValidationError as err:
        return jsonify(err.messages), 400

    existing_tag = Tag.query.filter(Tag.name == data.name, Tag.id != tag_id).first()
    if existing_tag:
        return jsonify({"message": "Tag with this name already exists"}), 400

    db.session.commit()
    current_app.logger.info(f"Tag '{tag.name}' (ID: {tag_id}) updated by user {get_jwt_identity()}")
    # Invalidate cache for this specific tag and the list of tags
    cache.delete_memoized(list_tags)
    cache.delete_memoized(get_tag, tag_id)
    return jsonify(tag_schema.dump(tag)), 200

@bp.route('/tags/<int:tag_id>', methods=['DELETE'])
@jwt_required()
@has_roles(['admin']) # Only admins can delete tags
def delete_tag(tag_id):
    """
    Delete Tag by ID
    ---
    tags:
      - Tags
    security:
      - jwt: []
    parameters:
      - in: path
        name: tag_id
        type: integer
        required: true
        description: ID of the tag to delete.
    responses:
      204:
        description: Tag successfully deleted.
      401:
        description: Unauthorized
      403:
        description: Forbidden (Only admins can delete tags)
      404:
        description: Tag not found.
    """
    tag = Tag.query.get_or_404(tag_id)
    # Check if tag is associated with any content (optional, but good practice)
    if tag.contents.count() > 0:
        return jsonify({"message": "Cannot delete tag that is associated with content."}), 400

    db.session.delete(tag)
    db.session.commit()
    current_app.logger.info(f"Tag '{tag.name}' (ID: {tag_id}) deleted by user {get_jwt_identity()}")
    # Invalidate cache for list of tags
    cache.delete_memoized(list_tags)
    return jsonify({"message": "Tag deleted successfully"}), 204
```