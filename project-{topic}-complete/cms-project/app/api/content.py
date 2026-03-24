from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import bp
from app.extensions import db, editor_permission, author_permission
from app.models import Content, User, Category, Tag
from app.schemas import ContentSchema
from app.utils import has_roles, check_permission, cached
from marshmallow import ValidationError
from sqlalchemy.orm import joinedload # For query optimization

content_schema = ContentSchema()
contents_schema = ContentSchema(many=True)

@bp.route('/content', methods=['POST'])
@jwt_required()
@has_roles(['admin', 'editor', 'author']) # Admins, Editors, Authors can create content
def create_content():
    """
    Create a new Content Item (Article/Page)
    ---
    tags:
      - Content
    security:
      - jwt: []
    parameters:
      - in: body
        name: body
        schema:
          id: ContentCreate
          required:
            - title
            - body
            - user_id
          properties:
            title:
              type: string
              description: Title of the content.
            body:
              type: string
              description: Main body of the content.
            status:
              type: string
              enum: [draft, published, archived]
              description: Publication status.
              default: draft
            is_featured:
              type: boolean
              description: Whether the content is featured.
              default: false
            user_id:
              type: integer
              description: ID of the author (must be current user for authors, any for admin/editor).
            category_id:
              type: integer
              description: Optional ID of the category.
            tag_ids:
              type: array
              items:
                type: integer
              description: Optional list of tag IDs.
    responses:
      201:
        description: Content created successfully.
        schema:
          $ref: '#/definitions/Content'
      400:
        description: Invalid input or content title/slug already exists.
      401:
        description: Unauthorized
      403:
        description: Forbidden (Cannot create content for other users without proper role)
    definitions:
      Content:
        type: object
        properties:
          id: {type: integer}
          title: {type: string}
          slug: {type: string}
          body: {type: string}
          status: {type: string}
          is_featured: {type: boolean}
          published_at: {type: string, format: date-time}
          created_at: {type: string, format: date-time}
          updated_at: {type: string, format: date-time}
          author: {$ref: '#/definitions/User'}
          category: {$ref: '#/definitions/Category'}
          tags:
            type: array
            items: {$ref: '#/definitions/Tag'}
    """
    try:
        data = content_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify(err.messages), 400

    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    # Authorization check: Authors can only create content for themselves
    if current_user.role == 'author' and data.get('user_id') != current_user_id:
        return jsonify({"message": "Forbidden: Authors can only create content for themselves."}), 403

    # Admin/Editor can create content for any user (if user_id is provided, otherwise defaults to current user)
    if current_user.role in ['admin', 'editor'] and data.get('user_id') is None:
        data['user_id'] = current_user_id # If not specified, default to admin/editor as author
    elif data.get('user_id') is None: # For author role, user_id must be self, enforced above
         data['user_id'] = current_user_id

    # Check if author_id exists
    author = User.query.get(data['user_id'])
    if not author:
        return jsonify({"message": "Author specified does not exist."}), 400

    # Ensure status change for non-admin/editor
    if data.get('status') == 'published' and current_user.role == 'author':
        data['status'] = 'draft' # Authors can only draft content, editors/admins can publish directly.
        current_app.logger.warning(f"Author {current_user.username} attempted to publish directly. Status reset to 'draft'.")

    # Handle Category and Tags
    category = None
    if 'category_id' in data and data['category_id'] is not None:
        category = Category.query.get(data['category_id'])
        if not category:
            return jsonify({"message": "Category not found"}), 400

    tags = []
    if 'tag_ids' in data and data['tag_ids']:
        tags = Tag.query.filter(Tag.id.in_(data['tag_ids'])).all()
        if len(tags) != len(data['tag_ids']):
            return jsonify({"message": "One or more tags not found"}), 400

    new_content = Content(
        title=data['title'],
        body=data['body'],
        status=data['status'],
        is_featured=data.get('is_featured', False),
        user_id=data['user_id'],
        category=category,
        tags=tags
    )

    # Ensure slug is unique, append a counter if necessary
    base_slug = new_content.slug
    counter = 1
    while Content.query.filter_by(slug=new_content.slug).first():
        new_content.slug = f"{base_slug}-{counter}"
        counter += 1

    if new_content.status == 'published':
        new_content.publish()

    db.session.add(new_content)
    db.session.commit()
    current_app.logger.info(f"Content '{new_content.title}' created by user {current_user.username} (ID: {current_user_id})")
    # Invalidate cache for list of contents
    cache.delete_memoized(list_content)
    return jsonify(content_schema.dump(new_content)), 201

@bp.route('/content', methods=['GET'])
@cached(timeout=60) # Cache content list for 1 minute
def list_content():
    """
    List all Content Items
    ---
    tags:
      - Content
    parameters:
      - in: query
        name: status
        type: string
        enum: [draft, published, archived]
        description: Filter by publication status (e.g., 'published').
      - in: query
        name: category_id
        type: integer
        description: Filter by category ID.
      - in: query
        name: author_id
        type: integer
        description: Filter by author ID.
      - in: query
        name: featured
        type: boolean
        description: Filter by featured status.
      - in: query
        name: page
        type: integer
        description: Page number for pagination (default 1).
      - in: query
        name: per_page
        type: integer
        description: Items per page for pagination (default 10, max 100).
    responses:
      200:
        description: A list of content items.
        schema:
          type: array
          items:
            $ref: '#/definitions/Content'
    """
    current_app.logger.debug("Fetching content list (might be cached).")
    query = Content.query.options(joinedload(Content.author), joinedload(Content.category), joinedload(Content.tags))

    status = request.args.get('status')
    category_id = request.args.get('category_id', type=int)
    author_id = request.args.get('author_id', type=int)
    featured = request.args.get('featured', type=lambda v: v.lower() == 'true')

    if status:
        query = query.filter_by(status=status)
    else:
        # By default, only show published content to public users
        # If user is logged in, show their own draft content
        current_user_id = get_jwt_identity() # This might be None if not logged in
        if current_user_id:
            # For logged-in users, show published content and their own drafts
            query = query.filter(db.or_(Content.status == 'published',
                                         db.and_(Content.status == 'draft', Content.user_id == current_user_id)))
            current_user = User.query.get(current_user_id)
            if current_user and current_user.role in ['admin', 'editor']:
                # Admins/Editors can see all content statuses
                query = Content.query.options(joinedload(Content.author), joinedload(Content.category), joinedload(Content.tags))
        else:
            query = query.filter_by(status='published')


    if category_id:
        query = query.filter_by(category_id=category_id)
    if author_id:
        query = query.filter_by(user_id=author_id)
    if featured is not None:
        query = query.filter_by(is_featured=featured)

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    per_page = min(per_page, 100) # Max 100 items per page

    pagination = query.order_by(Content.published_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    contents = pagination.items

    response_data = {
        "items": contents_schema.dump(contents),
        "total": pagination.total,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "pages": pagination.pages,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev
    }
    return jsonify(response_data), 200

@bp.route('/content/<int:content_id>', methods=['GET'])
@cached(timeout=300) # Cache individual content for 5 minutes
def get_content(content_id):
    """
    Get Content by ID
    ---
    tags:
      - Content
    parameters:
      - in: path
        name: content_id
        type: integer
        required: true
        description: ID of the content to retrieve.
    responses:
      200:
        description: Content details.
        schema:
          $ref: '#/definitions/Content'
      404:
        description: Content not found.
      403:
        description: Forbidden (Access to draft/archived content restricted)
    """
    current_app.logger.debug(f"Fetching content {content_id} (might be cached).")
    content = Content.query.options(joinedload(Content.author), joinedload(Content.category), joinedload(Content.tags)).get_or_404(content_id)

    # Public users can only see published content
    if content.status != 'published':
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({"message": "Forbidden: This content is not published."}), 403

        current_user = User.query.get(current_user_id)
        if not current_user or (current_user.id != content.user_id and current_user.role not in ['admin', 'editor']):
            return jsonify({"message": "Forbidden: You do not have permission to view this content."}), 403

    return jsonify(content_schema.dump(content)), 200

@bp.route('/content/<int:content_id>', methods=['PUT'])
@jwt_required()
@has_roles(['admin', 'editor', 'author']) # Admins, Editors, Authors can update content
def update_content(content_id):
    """
    Update Content by ID
    ---
    tags:
      - Content
    security:
      - jwt: []
    parameters:
      - in: path
        name: content_id
        type: integer
        required: true
        description: ID of the content to update.
      - in: body
        name: body
        schema:
          id: ContentUpdate
          properties:
            title: {type: string}
            body: {type: string}
            status: {type: string, enum: [draft, published, archived]}
            is_featured: {type: boolean}
            category_id: {type: integer, nullable: true}
            tag_ids:
              type: array
              items:
                type: integer
    responses:
      200:
        description: Content successfully updated.
        schema:
          $ref: '#/definitions/Content'
      400:
        description: Invalid input.
      401:
        description: Unauthorized
      403:
        description: Forbidden (Cannot update other users' content or publish without editor/admin role)
      404:
        description: Content not found.
    """
    content = Content.query.get_or_404(content_id)
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    # Authorization: Authors can only update their own content. Admin/Editor can update any.
    if current_user.role == 'author' and content.user_id != current_user_id:
        return jsonify({"message": "Forbidden: You can only update your own content."}), 403

    try:
        data = request.get_json()

        # Specific authorization for status change: Authors cannot publish or archive
        if 'status' in data and data['status'] != content.status:
            if data['status'] == 'published' or data['status'] == 'archived':
                if current_user.role == 'author':
                    return jsonify({"message": "Forbidden: Only editors or administrators can publish or archive content."}), 403

        # If title is updated, slug will be automatically regenerated by model validation.
        # Check for slug uniqueness if title changes.
        if 'title' in data and data['title'] != content.title:
            temp_content = Content(title=data['title'], body='temp') # Create a temp object to generate slug
            proposed_slug = temp_content.slug
            existing_content_with_slug = Content.query.filter(Content.slug == proposed_slug, Content.id != content_id).first()
            if existing_content_with_slug:
                return jsonify({"message": "Content with this title/slug already exists."}), 400

        # Update category
        if 'category_id' in data:
            category_id = data.pop('category_id') # Remove from data as it's handled separately
            if category_id is None:
                content.category = None
            else:
                category = Category.query.get(category_id)
                if not category:
                    return jsonify({"message": "Category not found"}), 400
                content.category = category

        # Update tags
        if 'tag_ids' in data:
            tag_ids = data.pop('tag_ids')
            if tag_ids:
                tags = Tag.query.filter(Tag.id.in_(tag_ids)).all()
                if len(tags) != len(tag_ids):
                    return jsonify({"message": "One or more tags not found"}), 400
                content.tags = tags
            else:
                content.tags = [] # Clear all tags

        # Load remaining data into the content object
        updated_content = content_schema.load(data, instance=content, partial=True)

        # Handle publication date
        if 'status' in data:
            if data['status'] == 'published' and not updated_content.published_at:
                updated_content.publish()
            elif data['status'] != 'published' and updated_content.published_at:
                updated_content.unpublish()

        db.session.commit()
        current_app.logger.info(f"Content '{updated_content.title}' (ID: {content_id}) updated by user {current_user.username}")
        # Invalidate cache for this specific content and the list of contents
        cache.delete_memoized(list_content)
        cache.delete_memoized(get_content, content_id)
        return jsonify(content_schema.dump(updated_content)), 200
    except ValidationError as err:
        return jsonify(err.messages), 400
    except Exception as e:
        current_app.logger.error(f"Error updating content {content_id}: {e}")
        return jsonify({"message": "An error occurred during update"}), 500


@bp.route('/content/<int:content_id>', methods=['DELETE'])
@jwt_required()
@has_roles(['admin', 'editor']) # Only admins and editors can delete content
def delete_content(content_id):
    """
    Delete Content by ID
    ---
    tags:
      - Content
    security:
      - jwt: []
    parameters:
      - in: path
        name: content_id
        type: integer
        required: true
        description: ID of the content to delete.
    responses:
      204:
        description: Content successfully deleted.
      401:
        description: Unauthorized
      403:
        description: Forbidden (Only admins/editors can delete content)
      404:
        description: Content not found.
    """
    content = Content.query.get_or_404(content_id)
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    # Even editors cannot delete content they don't own, unless they are admins.
    # This rule can be adjusted based on specific business logic.
    if current_user.role == 'editor' and content.user_id != current_user_id:
        return jsonify({"message": "Forbidden: Editors can only delete their own content."}), 403

    db.session.delete(content)
    db.session.commit()
    current_app.logger.info(f"Content '{content.title}' (ID: {content_id}) deleted by user {current_user.username}")
    # Invalidate cache for list of contents
    cache.delete_memoized(list_content)
    return jsonify({"message": "Content deleted successfully"}), 204
```