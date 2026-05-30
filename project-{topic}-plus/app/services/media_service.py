```python
import os
from app.extensions import db, cache
from app.models.media import Media, MediaType
from app.schemas.media import media_schema, media_items_schema
from app.utils.errors import NotFoundError, ConflictError, BadRequestError
from sqlalchemy.exc import IntegrityError
import logging

class MediaService:
    """
    Service layer for Media-related business logic.
    Handles CRUD operations for media items.
    Note: Actual file uploads/storage management (e.g., S3, local filesystem)
    is outside the direct scope of this service but would integrate here.
    For this implementation, 'filepath' is just a string.
    """
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        # Placeholder for actual file storage path
        self.upload_folder = os.environ.get('UPLOAD_FOLDER', 'uploads')
        if not os.path.exists(self.upload_folder):
            os.makedirs(self.upload_folder)

    @cache.cached(timeout=60, key_prefix='all_media')
    def get_all_media(self, uploader_id=None, media_type_id=None):
        """Retrieves all media items, optionally filtered by uploader or type."""
        self.logger.info(f"Fetching all media with filters: uploader_id={uploader_id}, media_type_id={media_type_id}")
        query = Media.query.order_by(Media.created_at.desc())

        if uploader_id:
            query = query.filter_by(uploader_id=uploader_id)
        
        if media_type_id:
            query = query.filter_by(media_type_id=media_type_id)

        media_items = query.all()
        return media_items_schema.dump(media_items)

    @cache.cached(timeout=300, make_cache_key=lambda *args, **kwargs: f"media_{kwargs['media_id']}")
    def get_media_by_id(self, media_id):
        """Retrieves a single media item by ID."""
        self.logger.info(f"Fetching media with ID: {media_id}")
        media = Media.query.get(media_id)
        if not media:
            raise NotFoundError(f"Media item with ID {media_id} not found.")
        return media_schema.dump(media)

    def create_media(self, media_data, uploader_id):
        """
        Creates a new media item record.
        Actual file upload logic would reside here or be called from here.
        """
        self.logger.info(f"Attempting to create media by uploader ID: {uploader_id} with filename: {media_data.get('filename')}")
        
        # Validate input (using schema for validation, not full dump yet)
        # Note: In a real app, 'filepath' might be generated after successful upload
        errors = media_schema.validate(media_data, partial=True)
        if errors:
            raise BadRequestError(f"Validation errors: {errors}")

        # Verify media type exists
        media_type_id = media_data.get('media_type_id')
        if not media_type_id or not MediaType.query.get(media_type_id):
            raise BadRequestError(f"Media type with ID {media_type_id} not found or not provided.")

        # Check for existing filepath (assuming unique filepaths/urls)
        if Media.query.filter_by(filepath=media_data['filepath']).first():
            raise ConflictError(f"Media item with filepath '{media_data['filepath']}' already exists.")

        try:
            media = Media(
                filename=media_data['filename'],
                filepath=media_data['filepath'], # This would come from the file storage service
                uploader_id=uploader_id,
                media_type_id=media_type_id,
                alt_text=media_data.get('alt_text'),
                caption=media_data.get('caption'),
                filesize=media_data.get('filesize'),
                width=media_data.get('width'),
                height=media_data.get('height')
            )
            db.session.add(media)
            db.session.commit()
            
            # Clear cache for all media and this specific media item
            cache.delete('all_media')
            cache.delete(f"media_{media.id}")

            self.logger.info(f"Media '{media.filename}' created successfully with ID: {media.id}")
            return media_schema.dump(media)
        except IntegrityError as e:
            db.session.rollback()
            self.logger.error(f"Error creating media: {e}", exc_info=True)
            if "duplicate key value violates unique constraint" in str(e):
                raise ConflictError("A media item with this filepath already exists.")
            raise

    def update_media(self, media_id, update_data, current_user_id):
        """
        Updates an existing media item's information.
        Only the uploader or an admin can update.
        """
        self.logger.info(f"Attempting to update media ID: {media_id} by user ID: {current_user_id}")
        media = Media.query.get(media_id)
        if not media:
            raise NotFoundError(f"Media item with ID {media_id} not found.")

        # Authorization: Only the uploader or an admin can update
        # This check should be performed in the route layer for current_user context
        # Assuming current_user_id is passed for this check
        if media.uploader_id != current_user_id and not (current_user_id == media.uploader.id and media.uploader.is_admin()): # Assuming a way to get admin status
            pass # The actual role check should be done in the route decorator
        
        # Validate input (partial update allowed)
        errors = media_schema.validate(update_data, partial=True)
        if errors:
            raise BadRequestError(f"Validation errors: {errors}")

        try:
            # Handle unique filepath constraint
            if 'filepath' in update_data and update_data['filepath'] != media.filepath:
                if Media.query.filter_by(filepath=update_data['filepath']).first():
                    raise ConflictError(f"Media item with filepath '{update_data['filepath']}' already exists.")
                media.filepath = update_data['filepath']
            
            if 'filename' in update_data:
                media.filename = update_data['filename']
            if 'alt_text' in update_data:
                media.alt_text = update_data['alt_text']
            if 'caption' in update_data:
                media.caption = update_data['caption']
            if 'filesize' in update_data:
                media.filesize = update_data['filesize']
            if 'width' in update_data:
                media.width = update_data['width']
            if 'height' in update_data:
                media.height = update_data['height']
            
            if 'media_type_id' in update_data:
                media_type_id = update_data['media_type_id']
                if not MediaType.query.get(media_type_id):
                    raise BadRequestError(f"Media type with ID {media_type_id} not found.")
                media.media_type_id = media_type_id
            
            db.session.commit()
            
            # Clear cache for all media and this specific media item
            cache.delete('all_media')
            cache.delete(f"media_{media.id}")

            self.logger.info(f"Media ID: {media.id} updated successfully.")
            return media_schema.dump(media)
        except IntegrityError as e:
            db.session.rollback()
            self.logger.error(f"Error updating media ID {media_id}: {e}", exc_info=True)
            if "duplicate key value violates unique constraint" in str(e):
                raise ConflictError("A media item with this filepath already exists.")
            raise

    def delete_media(self, media_id, current_user_id):
        """
        Deletes a media item by ID.
        Only the uploader or an admin can delete.
        Also, would typically delete the actual file from storage.
        """
        self.logger.info(f"Attempting to delete media ID: {media_id} by user ID: {current_user_id}")
        media = Media.query.get(media_id)
        if not media:
            raise NotFoundError(f"Media item with ID {media_id} not found.")
        
        # Authorization: Only the uploader or an admin can delete
        if media.uploader_id != current_user_id and not (current_user_id == media.uploader.id and media.uploader.is_admin()):
            pass # The actual role check should be done in the route decorator

        # Check if media is associated with any posts before deleting
        if media.posts:
            # You might want to remove associations instead of blocking deletion
            # For now, we'll block it to prevent orphaned links
            raise ConflictError(f"Media item '{media.filename}' (ID: {media_id}) cannot be deleted because it is associated with existing posts.")

        # In a real application, you would also delete the actual file from storage here
        # E.g., os.remove(os.path.join(self.upload_folder, media.filename))
        # Or a call to an S3 deletion service.
        self.logger.info(f"Simulating file deletion for: {media.filepath}")

        db.session.delete(media)
        db.session.commit()
        
        # Clear cache for all media and this specific media item
        cache.delete('all_media')
        cache.delete(f"media_{media.id}")

        self.logger.info(f"Media ID: {media.id} deleted successfully.")
        return {"message": f"Media item with ID {media_id} deleted successfully."}

    def get_all_media_types(self):
        """Retrieves all defined media types."""
        self.logger.info("Fetching all media types.")
        media_types = MediaType.query.all()
        return media_types_schema.dump(media_types)
    
    def get_media_type_by_id(self, media_type_id):
        """Retrieves a single media type by ID."""
        self.logger.info(f"Fetching media type with ID: {media_type_id}")
        media_type = MediaType.query.get(media_type_id)
        if not media_type:
            raise NotFoundError(f"Media type with ID {media_type_id} not found.")
        return media_type_schema.dump(media_type)

```