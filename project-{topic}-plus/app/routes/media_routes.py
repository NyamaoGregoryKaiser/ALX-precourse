```python
from flask import Blueprint, request, jsonify, current_app, g
from app.utils.errors import BadRequestError, NotFoundError, ConflictError, ForbiddenError
from app.services.media_service import MediaService
from app.schemas.media import media_schema, media_items_schema, media_type_schema, media_types_schema
from app.models.user import UserRole
from app.utils.decorators import jwt_required_wrapper, roles_required
from http import HTTPStatus
from app.extensions import limiter, cache

media_bp = Blueprint('media_bp', __name__)
media_service = MediaService()

# --- Media Item Routes ---

@media_bp.route('', methods=['GET'])
@limiter.limit("60 per minute")
@cache.cached(timeout=60, query_string=True) # Cache for 60 seconds, vary by query parameters
def get_media_items():
    """
    Retrieves all media items. Supports filtering by uploader_id or media_type_id.
    Publicly accessible.
    """
    current_app.logger.info("Requesting all media items.")
    uploader_id = request.args.get('uploader_id', type=int)
    media_type_id = request.args.get('media_type_id', type=int)

    try:
        media_items = media_service.get_all_media(uploader_id=uploader_id, media_type_id=media_type_id)
        return jsonify(media_items), HTTPStatus.OK
    except BadRequestError as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to retrieve media items: {e}", exc_info=True)
        raise

@media_bp.route('/<int:media_id>', methods=['GET'])
@limiter.limit("60 per minute")
@cache.cached(timeout=300, key_prefix='media_') # Cache for 5 minutes, specific key
def get_media_item(media_id):
    """
    Retrieves a single media item by ID. Publicly accessible.
    """
    current_app.logger.info(f"Requesting media item with ID: {media_id}.")
    try:
        media_item = media_service.get_media_by_id(media_id)
        return jsonify(media_item), HTTPStatus.OK
    except NotFoundError as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to retrieve media item ID {media_id}: {e}", exc_info=True)
        raise

@media_bp.route('', methods=['POST'])
@jwt_required_wrapper
@roles_required([UserRole.ADMIN, UserRole.EDITOR]) # Only admins or editors can upload media
@limiter.limit("10 per minute")
def create_media_item():
    """
    Creates a new media item record.
    Requires ADMIN or EDITOR role. The uploader_id is automatically set.
    Note: Actual file upload handling is simplified here (filepath is just a string).
    """
    current_app.logger.info(f"User {g.current_user.id} ({g.current_user.role.value}) attempting to create media item.")
    if not request.is_json:
        raise BadRequestError("Request must be JSON")

    data = request.get_json()
    if not data:
        raise BadRequestError("Invalid JSON data provided.")
    
    # In a real scenario, file data would be part of a multipart/form-data request
    # and the filepath would be determined after saving the file to storage.
    # For this example, 'filepath' is expected in the JSON body for simplicity.
    if 'filename' not in data or 'filepath' not in data or 'media_type_id' not in data:
        raise BadRequestError("Missing required fields: filename, filepath, media_type_id.")

    try:
        new_media_item = media_service.create_media(data, g.current_user.id)
        cache.delete('all_media') # Invalidate cache for all media
        return jsonify(new_media_item), HTTPStatus.CREATED
    except (BadRequestError, ConflictError) as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to create media item: {e}", exc_info=True)
        raise

@media_bp.route('/<int:media_id>', methods=['PUT'])
@jwt_required_wrapper
@roles_required([UserRole.ADMIN, UserRole.EDITOR]) # Only admins or editors can update media
@limiter.limit("10 per minute")
def update_media_item(media_id):
    """
    Updates an existing media item's information.
    Requires ADMIN or EDITOR role, or the authenticated user is the uploader of the media.
    """
    current_app.logger.info(f"User {g.current_user.id} ({g.current_user.role.value}) attempting to update media item ID: {media_id}.")
    if not request.is_json:
        raise BadRequestError("Request must be JSON")

    data = request.get_json()
    if not data:
        raise BadRequestError("Invalid JSON data provided.")

    # Authorization check: only uploader or ADMIN/EDITOR can update
    # Note: media_service expects current_user_id for this check, but the full user object is better
    # for role checks. We'll pass g.current_user.id and assume service handles basic auth.
    # A more robust check might involve fetching the media item here and comparing uploader_id.
    media_item_obj = media_service.get_media_by_id(media_id) # Get as dict first, then check uploader_id
    if media_item_obj['uploader_id'] != g.current_user.id and not g.current_user.has_role([UserRole.ADMIN, UserRole.EDITOR]):
        raise ForbiddenError("You do not have permission to update this media item.")

    try:
        updated_media_item = media_service.update_media(media_id, data, g.current_user.id)
        cache.delete('all_media') # Invalidate cache for all media
        cache.delete(f'media_{media_id}') # Invalidate specific media item cache
        return jsonify(updated_media_item), HTTPStatus.OK
    except (BadRequestError, NotFoundError, ConflictError, ForbiddenError) as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to update media item ID {media_id}: {e}", exc_info=True)
        raise

@media_bp.route('/<int:media_id>', methods=['DELETE'])
@jwt_required_wrapper
@roles_required([UserRole.ADMIN, UserRole.EDITOR]) # Only ADMINs or EDITORs can delete media
@limiter.limit("5 per minute")
def delete_media_item(media_id):
    """
    Deletes a media item by ID.
    Requires ADMIN or EDITOR role, or the authenticated user is the uploader of the media.
    """
    current_app.logger.info(f"User {g.current_user.id} ({g.current_user.role.value}) attempting to delete media item ID: {media_id}.")
    
    # Authorization check
    media_item_obj = media_service.get_media_by_id(media_id)
    if media_item_obj['uploader_id'] != g.current_user.id and not g.current_user.has_role([UserRole.ADMIN, UserRole.EDITOR]):
        raise ForbiddenError("You do not have permission to delete this media item.")

    try:
        result = media_service.delete_media(media_id, g.current_user.id)
        cache.delete('all_media') # Invalidate cache for all media
        cache.delete(f'media_{media_id}') # Invalidate specific media item cache
        return jsonify(result), HTTPStatus.OK
    except (NotFoundError, ConflictError, ForbiddenError) as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to delete media item ID {media_id}: {e}", exc_info=True)
        raise

# --- Media Type Routes (Admin only for CRUD) ---

@media_bp.route('/types', methods=['GET'])
@limiter.limit("60 per minute")
@cache.cached(timeout=300) # Cache for 5 minutes
def get_media_types():
    """
    Retrieves all defined media types. Publicly accessible.
    """
    current_app.logger.info("Requesting all media types.")
    media_types = media_service.get_all_media_types()
    return jsonify(media_types), HTTPStatus.OK

@media_bp.route('/types/<int:media_type_id>', methods=['GET'])
@limiter.limit("60 per minute")
@cache.cached(timeout=300, key_prefix='media_type_')
def get_media_type(media_type_id):
    """
    Retrieves a single media type by ID. Publicly accessible.
    """
    current_app.logger.info(f"Requesting media type with ID: {media_type_id}.")
    try:
        media_type = media_service.get_media_type_by_id(media_type_id)
        return jsonify(media_type), HTTPStatus.OK
    except NotFoundError as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Failed to retrieve media type ID {media_type_id}: {e}", exc_info=True)
        raise

# No POST, PUT, DELETE for media types via API for simplicity,
# but would follow similar patterns with ADMIN roles required.
# Media types are typically static or managed via migrations/seed scripts.

```