```python
from app.extensions import db, cache
from app.models.post import Post, PostStatus
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.media import Media
from app.schemas.post import post_schema, posts_schema
from app.utils.errors import NotFoundError, ConflictError, BadRequestError, ForbiddenError
from sqlalchemy.exc import IntegrityError
import logging
import datetime

class PostService:
    """
    Service layer for Post-related business logic.
    Handles CRUD operations, publishing, and associating media.
    """
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    @cache.cached(timeout=60, key_prefix='all_posts')
    def get_all_posts(self, status=None, author_id=None, category_id=None):
        """Retrieves all posts, optionally filtered by status, author, or category."""
        self.logger.info(f"Fetching all posts with filters: status={status}, author_id={author_id}, category_id={category_id}")
        query = Post.query.order_by(Post.created_at.desc())
        
        if status:
            try:
                post_status_enum = PostStatus(status)
                query = query.filter_by(status=post_status_enum)
            except ValueError:
                raise BadRequestError(f"Invalid post status: {status}. Must be one of {[s.value for s in PostStatus]}")

        if author_id:
            query = query.filter_by(author_id=author_id)
        
        if category_id:
            query = query.filter_by(category_id=category_id)

        posts = query.all()
        return posts_schema.dump(posts)

    @cache.cached(timeout=300, make_cache_key=lambda *args, **kwargs: f"post_{kwargs['post_id']}")
    def get_post_by_id(self, post_id):
        """Retrieves a single post by ID."""
        self.logger.info(f"Fetching post with ID: {post_id}")
        post = Post.query.get(post_id)
        if not post:
            raise NotFoundError(f"Post with ID {post_id} not found.")
        return post_schema.dump(post)

    def create_post(self, post_data, current_user_id):
        """
        Creates a new post.
        The `current_user_id` is automatically set as the author.
        """
        self.logger.info(f"Attempting to create post by user ID: {current_user_id} with title: {post_data.get('title')}")
        
        # Validate input, partial=True allows omitting fields during creation if defaults exist
        errors = post_schema.validate(post_data, partial=True)
        if errors:
            raise BadRequestError(f"Validation errors: {errors}")

        # Check for existing slug
        if Post.query.filter_by(slug=post_data['slug']).first():
            raise ConflictError(f"Post slug '{post_data['slug']}' already exists.")
        
        # Verify category exists if provided
        category_id = post_data.get('category_id')
        if category_id:
            if not Category.query.get(category_id):
                raise BadRequestError(f"Category with ID {category_id} not found.")

        try:
            post = Post(
                title=post_data['title'],
                slug=post_data['slug'],
                content=post_data['content'],
                summary=post_data.get('summary'),
                author_id=current_user_id,
                category_id=category_id,
                status=PostStatus(post_data.get('status', PostStatus.DRAFT.value)),
                featured_image_url=post_data.get('featured_image_url')
            )
            
            # If status is published, set published_at
            if post.status == PostStatus.PUBLISHED:
                post.published_at = datetime.datetime.now()

            db.session.add(post)
            db.session.commit()
            
            # Clear cache for all posts and this specific post
            cache.delete('all_posts')
            cache.delete(f"post_{post.id}")

            self.logger.info(f"Post '{post.title}' created successfully with ID: {post.id}")
            return post_schema.dump(post)
        except IntegrityError as e:
            db.session.rollback()
            self.logger.error(f"Error creating post: {e}", exc_info=True)
            if "duplicate key value violates unique constraint" in str(e):
                raise ConflictError("A post with this slug already exists.")
            raise

    def update_post(self, post_id, update_data, current_user):
        """
        Updates an existing post's information.
        Only author or admin/editor can update.
        """
        self.logger.info(f"Attempting to update post ID: {post_id} by user ID: {current_user.id}")
        post = Post.query.get(post_id)
        if not post:
            raise NotFoundError(f"Post with ID {post_id} not found.")
        
        # Authorization: Only the author or an admin/editor can update the post
        if post.author_id != current_user.id and not current_user.has_role([UserRole.ADMIN, UserRole.EDITOR]):
            raise ForbiddenError("You do not have permission to update this post.")

        # Validate input (partial update allowed)
        errors = post_schema.validate(update_data, partial=True)
        if errors:
            raise BadRequestError(f"Validation errors: {errors}")

        try:
            # Handle unique slug constraint
            if 'slug' in update_data and update_data['slug'] != post.slug:
                if Post.query.filter_by(slug=update_data['slug']).first():
                    raise ConflictError(f"Post slug '{update_data['slug']}' already exists.")
                post.slug = update_data['slug']
            
            if 'title' in update_data:
                post.title = update_data['title']
            if 'content' in update_data:
                post.content = update_data['content']
            if 'summary' in update_data:
                post.summary = update_data['summary']
            if 'featured_image_url' in update_data:
                post.featured_image_url = update_data['featured_image_url']
            
            if 'category_id' in update_data:
                category_id = update_data['category_id']
                if category_id is not None:
                    if not Category.query.get(category_id):
                        raise BadRequestError(f"Category with ID {category_id} not found.")
                post.category_id = category_id

            # Handle status changes
            if 'status' in update_data:
                new_status = PostStatus(update_data['status'])
                if new_status != post.status:
                    if new_status == PostStatus.PUBLISHED:
                        post.publish()
                    elif new_status == PostStatus.DRAFT:
                        post.unpublish()
                    elif new_status == PostStatus.ARCHIVED:
                        post.archive()
                    else:
                        post.status = new_status # For other custom statuses
            
            db.session.commit()
            
            # Clear cache for all posts and this specific post
            cache.delete('all_posts')
            cache.delete(f"post_{post.id}")

            self.logger.info(f"Post ID: {post.id} updated successfully.")
            return post_schema.dump(post)
        except IntegrityError as e:
            db.session.rollback()
            self.logger.error(f"Error updating post ID {post_id}: {e}", exc_info=True)
            if "duplicate key value violates unique constraint" in str(e):
                raise ConflictError("A post with this slug already exists.")
            raise

    def delete_post(self, post_id, current_user):
        """
        Deletes a post by ID.
        Only author or admin can delete.
        """
        self.logger.info(f"Attempting to delete post ID: {post_id} by user ID: {current_user.id}")
        post = Post.query.get(post_id)
        if not post:
            raise NotFoundError(f"Post with ID {post_id} not found.")
        
        # Authorization: Only the author or an admin can delete the post
        if post.author_id != current_user.id and not current_user.is_admin():
            raise ForbiddenError("You do not have permission to delete this post.")

        db.session.delete(post)
        db.session.commit()
        
        # Clear cache for all posts and this specific post
        cache.delete('all_posts')
        cache.delete(f"post_{post.id}")

        self.logger.info(f"Post ID: {post.id} deleted successfully.")
        return {"message": f"Post with ID {post_id} deleted successfully."}

    def associate_media_to_post(self, post_id, media_id, current_user):
        """
        Associates a media item with a post.
        Requires editor/admin role or author of the post.
        """
        self.logger.info(f"Attempting to associate media ID: {media_id} with post ID: {post_id} by user ID: {current_user.id}")
        post = Post.query.get(post_id)
        if not post:
            raise NotFoundError(f"Post with ID {post_id} not found.")
        
        media = Media.query.get(media_id)
        if not media:
            raise NotFoundError(f"Media item with ID {media_id} not found.")

        # Authorization: Only the author, or editor/admin
        if post.author_id != current_user.id and not current_user.has_role([UserRole.ADMIN, UserRole.EDITOR]):
            raise ForbiddenError("You do not have permission to modify this post's media.")
        
        if media in post.media_assets:
            raise ConflictError(f"Media item ID {media_id} is already associated with post ID {post_id}.")

        try:
            post.media_assets.append(media)
            db.session.commit()
            cache.delete(f"post_{post.id}") # Invalidate post cache
            self.logger.info(f"Media ID: {media_id} associated with Post ID: {post.id} successfully.")
            return post_schema.dump(post)
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error associating media {media_id} with post {post_id}: {e}", exc_info=True)
            raise BadRequestError("Could not associate media with post.")

    def disassociate_media_from_post(self, post_id, media_id, current_user):
        """
        Disassociates a media item from a post.
        Requires editor/admin role or author of the post.
        """
        self.logger.info(f"Attempting to disassociate media ID: {media_id} from post ID: {post_id} by user ID: {current_user.id}")
        post = Post.query.get(post_id)
        if not post:
            raise NotFoundError(f"Post with ID {post_id} not found.")
        
        media = Media.query.get(media_id)
        if not media:
            raise NotFoundError(f"Media item with ID {media_id} not found.")

        # Authorization: Only the author, or editor/admin
        if post.author_id != current_user.id and not current_user.has_role([UserRole.ADMIN, UserRole.EDITOR]):
            raise ForbiddenError("You do not have permission to modify this post's media.")
        
        if media not in post.media_assets:
            raise BadRequestError(f"Media item ID {media_id} is not associated with post ID {post_id}.")

        try:
            post.media_assets.remove(media)
            db.session.commit()
            cache.delete(f"post_{post.id}") # Invalidate post cache
            self.logger.info(f"Media ID: {media_id} disassociated from Post ID: {post.id} successfully.")
            return post_schema.dump(post)
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error disassociating media {media_id} from post {post_id}: {e}", exc_info=True)
            raise BadRequestError("Could not disassociate media from post.")

```