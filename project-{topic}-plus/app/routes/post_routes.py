```python
from flask import Blueprint, request, jsonify, current_app, g
from app.utils.errors import BadRequestError, NotFoundError, ConflictError, ForbiddenError
from app.services.post_service import PostService
from app.schemas.post import post_schema, posts_schema
from app.models.user import UserRole
from app.utils.decorators import jwt_required_wrapper, roles_required
from http import HTTPStatus
from app.extensions import limiter, cache

post_bp = Blueprint('post_bp', __name__)
post_service = PostService()

@post_bp.route('', methods=['GET'])
@limiter.limit("100 per minute")
@cache.cached(timeout=60, query_string=True) # Cache for 60 seconds, vary by query parameters
def get_posts():
    """
    Retrieves all posts. Supports filtering by status, author_id, category_id.
    Publicly accessible.
    """
    current_app.logger.info("Requesting all posts.")
    status = request.args.get('status')
    author_id = request.args.get('author_id', type=int)
    category_id = request.args.get('category_id', type=int)

    try:
        posts = post_service.get_all_posts(status=status, author_id=author_id, category_id=category_id)
        return jsonify(posts), HTTPStatus.OK
    except BadRequestError as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to retrieve posts: {e}", exc_info=True)
        raise

@post_bp.route('/<int:post_id>', methods=['GET'])
@limiter.limit("100 per minute")
@cache.cached(timeout=300, key_prefix='post_') # Cache for 5 minutes, specific key
def get_post(post_id):
    """
    Retrieves a single post by ID. Publicly accessible.
    """
    current_app.logger.info(f"Requesting post with ID: {post_id}.")
    try:
        post = post_service.get_post_by_id(post_id)
        return jsonify(post), HTTPStatus.OK
    except NotFoundError as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to retrieve post ID {post_id}: {e}", exc_info=True)
        raise

@post_bp.route('', methods=['POST'])
@jwt_required_wrapper
@roles_required([UserRole.ADMIN, UserRole.EDITOR]) # Only admins or editors can create posts
@limiter.limit("20 per minute")
def create_post():
    """
    Creates a new post. Requires ADMIN or EDITOR role.
    The author_id is automatically set to the current authenticated user's ID.
    """
    current_app.logger.info(f"User {g.current_user.id} ({g.current_user.role.value}) attempting to create post.")
    if not request.is_json:
        raise BadRequestError("Request must be JSON")

    data = request.get_json()
    if not data:
        raise BadRequestError("Invalid JSON data provided.")

    try:
        new_post = post_service.create_post(data, g.current_user.id)
        cache.delete('all_posts') # Invalidate cache for all posts
        return jsonify(new_post), HTTPStatus.CREATED
    except (BadRequestError, ConflictError) as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to create post: {e}", exc_info=True)
        raise

@post_bp.route('/<int:post_id>', methods=['PUT'])
@jwt_required_wrapper
@roles_required([UserRole.ADMIN, UserRole.EDITOR]) # Only admins or editors can update posts
@limiter.limit("20 per minute")
def update_post(post_id):
    """
    Updates an existing post's information.
    Requires ADMIN or EDITOR role. Only the author or an admin/editor can modify.
    """
    current_app.logger.info(f"User {g.current_user.id} ({g.current_user.role.value}) attempting to update post ID: {post_id}.")
    if not request.is_json:
        raise BadRequestError("Request must be JSON")

    data = request.get_json()
    if not data:
        raise BadRequestError("Invalid JSON data provided.")

    try:
        updated_post = post_service.update_post(post_id, data, g.current_user)
        cache.delete('all_posts') # Invalidate cache for all posts
        cache.delete(f'post_{post_id}') # Invalidate specific post cache
        return jsonify(updated_post), HTTPStatus.OK
    except (BadRequestError, NotFoundError, ConflictError, ForbiddenError) as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to update post ID {post_id}: {e}", exc_info=True)
        raise

@post_bp.route('/<int:post_id>', methods=['DELETE'])
@jwt_required_wrapper
@roles_required([UserRole.ADMIN, UserRole.EDITOR]) # Only ADMINs or EDITORs can delete posts
@limiter.limit("10 per minute")
def delete_post(post_id):
    """
    Deletes a post by ID.
    Requires ADMIN or EDITOR role. Only the author or an admin can delete.
    """
    current_app.logger.info(f"User {g.current_user.id} ({g.current_user.role.value}) attempting to delete post ID: {post_id}.")
    try:
        result = post_service.delete_post(post_id, g.current_user)
        cache.delete('all_posts') # Invalidate cache for all posts
        cache.delete(f'post_{post_id}') # Invalidate specific post cache
        return jsonify(result), HTTPStatus.OK
    except (NotFoundError, ForbiddenError) as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to delete post ID {post_id}: {e}", exc_info=True)
        raise

@post_bp.route('/<int:post_id>/media/<int:media_id>', methods=['POST'])
@jwt_required_wrapper
@roles_required([UserRole.ADMIN, UserRole.EDITOR]) # Only admins or editors can associate media
@limiter.limit("20 per minute")
def associate_media_to_post(post_id, media_id):
    """
    Associates a media item with a post.
    Requires ADMIN or EDITOR role, or the authenticated user is the author of the post.
    """
    current_app.logger.info(f"User {g.current_user.id} attempting to associate media {media_id} with post {post_id}.")
    try:
        updated_post = post_service.associate_media_to_post(post_id, media_id, g.current_user)
        return jsonify(updated_post), HTTPStatus.OK
    except (BadRequestError, NotFoundError, ConflictError, ForbiddenError) as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to associate media {media_id} with post {post_id}: {e}", exc_info=True)
        raise

@post_bp.route('/<int:post_id>/media/<int:media_id>', methods=['DELETE'])
@jwt_required_wrapper
@roles_required([UserRole.ADMIN, UserRole.EDITOR]) # Only admins or editors can disassociate media
@limiter.limit("20 per minute")
def disassociate_media_from_post(post_id, media_id):
    """
    Disassociates a media item from a post.
    Requires ADMIN or EDITOR role, or the authenticated user is the author of the post.
    """
    current_app.logger.info(f"User {g.current_user.id} attempting to disassociate media {media_id} from post {post_id}.")
    try:
        updated_post = post_service.disassociate_media_from_post(post_id, media_id, g.current_user)
        return jsonify(updated_post), HTTPStatus.OK
    except (BadRequestError, NotFoundError, ConflictError, ForbiddenError) as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to disassociate media {media_id} from post {post_id}: {e}", exc_info=True)
        raise

```