```python
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.content.services import ContentService
from app.auth.decorators import role_required
from app.extensions import limiter

content_bp = Blueprint('content', __name__)

# --- Posts Endpoints ---
@content_bp.route('/posts', methods=['GET'])
@limiter.limit("60 per minute")
def list_posts():
    """
    Retrieves a paginated list of posts.
    ---
    get:
      summary: Get all posts
      parameters:
        - in: query
          name: page
          schema:
            type: integer
            default: 1
          description: Page number for pagination
        - in: query
          name: per_page
          schema:
            type: integer
            default: 10
          description: Number of items per page
        - in: query
          name: status
          schema:
            type: string
            enum: [draft, pending, published, archived]
          description: Filter posts by status
        - in: query
          name: category_id
          schema:
            type: string
            format: uuid
          description: Filter posts by category ID
        - in: query
          name: author_id
          schema:
            type: string
            format: uuid
          description: Filter posts by author ID
        - in: query
          name: tag_id
          schema:
            type: string
            format: uuid
          description: Filter posts by tag ID
      responses:
        200:
          description: A list of posts
          content:
            application/json:
              schema:
                type: object
                properties:
                  posts:
                    type: array
                    items:
                      $ref: '#/components/schemas/Post'
                  total_pages:
                    type: integer
                  current_page:
                    type: integer
                  total_items:
                    type: integer
        429:
          description: Too many requests
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status = request.args.get('status')
    category_id = request.args.get('category_id')
    author_id = request.args.get('author_id')
    tag_id = request.args.get('tag_id')

    posts, status_code = ContentService.get_all_posts(
        page=page, per_page=per_page, status=status,
        category_id=category_id, author_id=author_id, tag_id=tag_id
    )
    return jsonify(posts), status_code

@content_bp.route('/posts/<uuid:post_id>', methods=['GET'])
@limiter.limit("60 per minute")
def get_post(post_id):
    """
    Retrieves a single post by its ID.
    ---
    get:
      summary: Get a post by ID
      parameters:
        - in: path
          name: post_id
          schema:
            type: string
            format: uuid
          required: true
          description: UUID of the post to retrieve
      responses:
        200:
          description: Post details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Post'
        404:
          description: Post not found
        429:
          description: Too many requests
    """
    post, status_code = ContentService.get_post_by_id(str(post_id))
    return jsonify(post), status_code

@content_bp.route('/posts', methods=['POST'])
@jwt_required()
@role_required(['admin', 'editor', 'author'])
@limiter.limit("30 per hour", error_message="Too many post creation attempts.")
def create_post():
    """
    Creates a new post. Requires authentication and appropriate role.
    ---
    post:
      summary: Create a new post
      security:
        - access_token: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title:
                  type: string
                  description: Title of the post
                  example: My First Blog Post
                slug:
                  type: string
                  description: URL-friendly slug (auto-generated if not provided)
                  example: my-first-blog-post
                content:
                  type: string
                  description: Full content of the post
                  example: This is the amazing content of my first post.
                excerpt:
                  type: string
                  description: Short summary of the post
                  nullable: true
                status:
                  type: string
                  enum: [draft, pending, published, archived]
                  default: draft
                visibility:
                  type: string
                  enum: [public, private, password_protected]
                  default: public
                published_at:
                  type: string
                  format: date-time
                  nullable: true
                category_id:
                  type: string
                  format: uuid
                  description: UUID of the category this post belongs to
                  nullable: true
                tag_ids:
                  type: array
                  items:
                    type: string
                    format: uuid
                  description: List of UUIDs of tags for this post
      responses:
        201:
          description: Post created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Post'
        400:
          description: Invalid input data
        401:
          description: Unauthorized
        403:
          description: Forbidden (insufficient role)
        409:
          description: Post with this slug already exists
        429:
          description: Too many requests
    """
    current_user_id = get_jwt_identity()
    data = request.get_json()
    if not data:
        return jsonify({"message": "Invalid JSON data provided"}), 400

    post, status_code = ContentService.create_post(data, current_user_id)
    return jsonify(post), status_code

@content_bp.route('/posts/<uuid:post_id>', methods=['PUT'])
@jwt_required()
@role_required(['admin', 'editor', 'author']) # Author can only update their own posts
@limiter.limit("30 per hour", error_message="Too many post update attempts.")
def update_post(post_id):
    """
    Updates an existing post by its ID. Requires authentication and appropriate role.
    Authors can only update their own posts. Admins/Editors can update any post.
    ---
    put:
      summary: Update a post by ID
      security:
        - access_token: []
      parameters:
        - in: path
          name: post_id
          schema:
            type: string
            format: uuid
          required: true
          description: UUID of the post to update
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title:
                  type: string
                  description: New title of the post
                  example: My Updated Blog Post
                slug:
                  type: string
                  description: New URL-friendly slug
                  example: my-updated-blog-post
                content:
                  type: string
                  description: New full content of the post
                excerpt:
                  type: string
                  description: New short summary of the post
                  nullable: true
                status:
                  type: string
                  enum: [draft, pending, published, archived]
                visibility:
                  type: string
                  enum: [public, private, password_protected]
                published_at:
                  type: string
                  format: date-time
                  nullable: true
                category_id:
                  type: string
                  format: uuid
                  description: New UUID of the category
                  nullable: true
                tag_ids:
                  type: array
                  items:
                    type: string
                    format: uuid
                  description: New list of UUIDs of tags for this post
      responses:
        200:
          description: Post updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Post'
        400:
          description: Invalid input data
        401:
          description: Unauthorized
        403:
          description: Forbidden (insufficient role or not authorized to update this post)
        404:
          description: Post not found
        409:
          description: Post with this slug already exists
        429:
          description: Too many requests
    """
    current_user_id = get_jwt_identity()
    current_user_role = get_jwt().get('role')
    data = request.get_json()
    if not data:
        return jsonify({"message": "Invalid JSON data provided"}), 400

    post, status_code = ContentService.update_post(str(post_id), data, current_user_id, current_user_role)
    return jsonify(post), status_code

@content_bp.route('/posts/<uuid:post_id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin', 'editor', 'author']) # Author can only delete their own posts
@limiter.limit("10 per hour", error_message="Too many post deletion attempts.")
def delete_post(post_id):
    """
    Deletes a post by its ID. Requires authentication and appropriate role.
    Authors can only delete their own posts. Admins/Editors can delete any post.
    ---
    delete:
      summary: Delete a post by ID
      security:
        - access_token: []
      parameters:
        - in: path
          name: post_id
          schema:
            type: string
            format: uuid
          required: true
          description: UUID of the post to delete
      responses:
        200:
          description: Post deleted successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: Post deleted successfully
        401:
          description: Unauthorized
        403:
          description: Forbidden (insufficient role or not authorized to delete this post)
        404:
          description: Post not found
        429:
          description: Too many requests
    """
    current_user_id = get_jwt_identity()
    current_user_role = get_jwt().get('role')

    message, status_code = ContentService.delete_post(str(post_id), current_user_id, current_user_role)
    return jsonify(message), status_code

# --- Categories Endpoints ---
@content_bp.route('/categories', methods=['GET'])
@limiter.limit("60 per minute")
def list_categories():
    """
    Retrieves a list of all categories.
    ---
    get:
      summary: Get all categories
      responses:
        200:
          description: A list of categories
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Category'
        429:
          description: Too many requests
    """
    categories, status_code = ContentService.get_all_categories()
    return jsonify(categories), status_code

@content_bp.route('/categories', methods=['POST'])
@jwt_required()
@role_required(['admin', 'editor'])
@limiter.limit("10 per hour")
def create_category():
    """
    Creates a new category. Requires admin or editor role.
    ---
    post:
      summary: Create a new category
      security:
        - access_token: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: Name of the category
                  example: Technology
                slug:
                  type: string
                  description: URL-friendly slug (auto-generated if not provided)
                  example: technology
                description:
                  type: string
                  nullable: true
      responses:
        201:
          description: Category created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Category'
        400:
          description: Invalid input
        401:
          description: Unauthorized
        403:
          description: Forbidden (insufficient role)
        409:
          description: Category with this slug already exists
        429:
          description: Too many requests
    """
    data = request.get_json()
    if not data:
        return jsonify({"message": "Invalid JSON data provided"}), 400
    category, status_code = ContentService.create_category(data)
    return jsonify(category), status_code

@content_bp.route('/categories/<uuid:category_id>', methods=['GET'])
@limiter.limit("60 per minute")
def get_category(category_id):
    """
    Retrieves a single category by its ID.
    ---
    get:
      summary: Get a category by ID
      parameters:
        - in: path
          name: category_id
          schema:
            type: string
            format: uuid
          required: true
      responses:
        200:
          description: Category details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Category'
        404:
          description: Category not found
        429:
          description: Too many requests
    """
    category, status_code = ContentService.get_category_by_id(str(category_id))
    return jsonify(category), status_code

@content_bp.route('/categories/<uuid:category_id>', methods=['PUT'])
@jwt_required()
@role_required(['admin', 'editor'])
@limiter.limit("10 per hour")
def update_category(category_id):
    """
    Updates a category by its ID. Requires admin or editor role.
    ---
    put:
      summary: Update a category by ID
      security:
        - access_token: []
      parameters:
        - in: path
          name: category_id
          schema:
            type: string
            format: uuid
          required: true
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                slug:
                  type: string
                description:
                  type: string
      responses:
        200:
          description: Category updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Category'
        400:
          description: Invalid input
        401:
          description: Unauthorized
        403:
          description: Forbidden (insufficient role)
        404:
          description: Category not found
        409:
          description: Category with this slug already exists
        429:
          description: Too many requests
    """
    data = request.get_json()
    if not data:
        return jsonify({"message": "Invalid JSON data provided"}), 400
    category, status_code = ContentService.update_category(str(category_id), data)
    return jsonify(category), status_code

@content_bp.route('/categories/<uuid:category_id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin']) # Only admin can delete categories
@limiter.limit("5 per hour")
def delete_category(category_id):
    """
    Deletes a category by its ID. Requires admin role.
    ---
    delete:
      summary: Delete a category by ID
      security:
        - access_token: []
      parameters:
        - in: path
          name: category_id
          schema:
            type: string
            format: uuid
          required: true
      responses:
        200:
          description: Category deleted successfully
        401:
          description: Unauthorized
        403:
          description: Forbidden (insufficient role)
        404:
          description: Category not found
        429:
          description: Too many requests
    """
    message, status_code = ContentService.delete_category(str(category_id))
    return jsonify(message), status_code

# --- Tags Endpoints ---
@content_bp.route('/tags', methods=['GET'])
@limiter.limit("60 per minute")
def list_tags():
    """
    Retrieves a list of all tags.
    ---
    get:
      summary: Get all tags
      responses:
        200:
          description: A list of tags
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Tag'
        429:
          description: Too many requests
    """
    tags, status_code = ContentService.get_all_tags()
    return jsonify(tags), status_code

@content_bp.route('/tags', methods=['POST'])
@jwt_required()
@role_required(['admin', 'editor'])
@limiter.limit("10 per hour")
def create_tag():
    """
    Creates a new tag. Requires admin or editor role.
    ---
    post:
      summary: Create a new tag
      security:
        - access_token: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: Name of the tag
                  example: Python
                slug:
                  type: string
                  description: URL-friendly slug (auto-generated if not provided)
                  example: python
      responses:
        201:
          description: Tag created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Tag'
        400:
          description: Invalid input
        401:
          description: Unauthorized
        403:
          description: Forbidden (insufficient role)
        409:
          description: Tag with this slug already exists
        429:
          description: Too many requests
    """
    data = request.get_json()
    if not data:
        return jsonify({"message": "Invalid JSON data provided"}), 400
    tag, status_code = ContentService.create_tag(data)
    return jsonify(tag), status_code

@content_bp.route('/tags/<uuid:tag_id>', methods=['GET'])
@limiter.limit("60 per minute")
def get_tag(tag_id):
    """
    Retrieves a single tag by its ID.
    ---
    get:
      summary: Get a tag by ID
      parameters:
        - in: path
          name: tag_id
          schema:
            type: string
            format: uuid
          required: true
      responses:
        200:
          description: Tag details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Tag'
        404:
          description: Tag not found
        429:
          description: Too many requests
    """
    tag, status_code = ContentService.get_tag_by_id(str(tag_id))
    return jsonify(tag), status_code

@content_bp.route('/tags/<uuid:tag_id>', methods=['PUT'])
@jwt_required()
@role_required(['admin', 'editor'])
@limiter.limit("10 per hour")
def update_tag(tag_id):
    """
    Updates a tag by its ID. Requires admin or editor role.
    ---
    put:
      summary: Update a tag by ID
      security:
        - access_token: []
      parameters:
        - in: path
          name: tag_id
          schema:
            type: string
            format: uuid
          required: true
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                slug:
                  type: string
      responses:
        200:
          description: Tag updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Tag'
        400:
          description: Invalid input
        401:
          description: Unauthorized
        403:
          description: Forbidden (insufficient role)
        404:
          description: Tag not found
        409:
          description: Tag with this slug already exists
        429:
          description: Too many requests
    """
    data = request.get_json()
    if not data:
        return jsonify({"message": "Invalid JSON data provided"}), 400
    tag, status_code = ContentService.update_tag(str(tag_id), data)
    return jsonify(tag), status_code

@content_bp.route('/tags/<uuid:tag_id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin']) # Only admin can delete tags
@limiter.limit("5 per hour")
def delete_tag(tag_id):
    """
    Deletes a tag by its ID. Requires admin role.
    ---
    delete:
      summary: Delete a tag by ID
      security:
        - access_token: []
      parameters:
        - in: path
          name: tag_id
          schema:
            type: string
            format: uuid
          required: true
      responses:
        200:
          description: Tag deleted successfully
        401:
          description: Unauthorized
        403:
          description: Forbidden (insufficient role)
        404:
          description: Tag not found
        429:
          description: Too many requests
    """
    message, status_code = ContentService.delete_tag(str(tag_id))
    return jsonify(message), status_code
```