```python
from app.extensions import db, cache
from app.models import Post, Category, Tag, User
from app.schemas import post_schema, posts_schema
from flask import current_app
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import slugify # pip install python-slugify

class ContentService:
    @staticmethod
    def get_all_posts(page=1, per_page=10, status=None, category_id=None, author_id=None, tag_id=None):
        """Fetches all posts with pagination and optional filters."""
        query = Post.query.options(db.joinedload(Post.author), db.joinedload(Post.category), db.joinedload(Post.tags))

        if status:
            query = query.filter_by(status=status)
        if category_id:
            query = query.filter_by(category_id=category_id)
        if author_id:
            query = query.filter_by(author_id=author_id)
        if tag_id:
            query = query.filter(Post.tags.any(id=tag_id))

        paginated_posts = query.order_by(Post.published_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

        current_app.logger.debug(f"Fetched {len(paginated_posts.items)} posts for page {page} with filters.")
        return {
            "posts": posts_schema.dump(paginated_posts.items),
            "total_pages": paginated_posts.pages,
            "current_page": paginated_posts.page,
            "total_items": paginated_posts.total
        }, 200

    @staticmethod
    @cache.memoize(timeout=300) # Cache individual post responses for 5 minutes
    def get_post_by_id(post_id):
        """Fetches a single post by ID."""
        post = Post.query.options(db.joinedload(Post.author), db.joinedload(Post.category), db.joinedload(Post.tags), db.joinedload(Post.comments), db.joinedload(Post.media_items)).get(post_id)
        if not post:
            current_app.logger.warning(f"Post with ID {post_id} not found.")
            return {"message": "Post not found"}, 404
        return post_schema.dump(post), 200

    @staticmethod
    def create_post(data, author_id):
        """Creates a new post."""
        try:
            # Add author_id to data for schema validation/loading
            data['author_id'] = author_id

            # Validate input data
            post_data = post_schema.load(data, session=db.session)

            # Generate slug if not provided or empty
            if not post_data.get('slug'):
                post_data['slug'] = slugify.slugify(post_data['title'])

            # Check if slug is unique
            if Post.query.filter_by(slug=post_data['slug']).first():
                return {"message": "Post with this slug already exists. Please choose a different title or slug."}, 409

            # Handle category and tags
            category = None
            if data.get('category_id'):
                category = Category.query.get(data['category_id'])
                if not category:
                    return {"message": "Category not found."}, 404
            
            tags_to_add = []
            if data.get('tag_ids'):
                for tag_id in data['tag_ids']:
                    tag = Tag.query.get(tag_id)
                    if tag:
                        tags_to_add.append(tag)
                    else:
                        current_app.logger.warning(f"Tag with ID {tag_id} not found, skipping.")

            new_post = Post(
                title=post_data['title'],
                slug=post_data['slug'],
                content=post_data['content'],
                author_id=author_id,
                category=category,
                excerpt=post_data.get('excerpt'),
                status=post_data.get('status', 'draft'),
                visibility=post_data.get('visibility', 'public'),
                published_at=post_data.get('published_at')
            )
            new_post.tags.extend(tags_to_add) # Add tags

            db.session.add(new_post)
            db.session.commit()
            cache.delete_memoized(ContentService.get_all_posts) # Invalidate all posts cache
            current_app.logger.info(f"Post '{new_post.title}' created successfully by user {author_id}.")
            return post_schema.dump(new_post), 201
        except IntegrityError:
            db.session.rollback()
            current_app.logger.error(f"Integrity error creating post '{data.get('title')}'. Possibly duplicate slug.")
            return {"message": "A post with this slug already exists."}, 409
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error creating post for user {author_id}: {e}")
            return {"message": "Could not create post due to an internal server error."}, 500

    @staticmethod
    def update_post(post_id, data, current_user_id, current_user_role):
        """Updates an existing post."""
        post = Post.query.get(post_id)
        if not post:
            return {"message": "Post not found"}, 404

        # Authorization check: only author or admin/editor can update
        if not (current_user_role in ['admin', 'editor'] or str(post.author_id) == current_user_id):
            return {"message": "You are not authorized to update this post."}, 403

        try:
            # Generate new slug if title changes and slug not provided
            if 'title' in data and not data.get('slug'):
                data['slug'] = slugify.slugify(data['title'])

            # Check for slug uniqueness if it's being updated
            if 'slug' in data and data['slug'] != post.slug:
                if Post.query.filter_by(slug=data['slug']).first():
                    return {"message": "Post with this slug already exists. Please choose a different slug."}, 409

            # Partial update with schema
            updated_post = post_schema.load(data, instance=post, partial=True, session=db.session)

            # Handle category update
            if 'category_id' in data:
                if data['category_id'] is None:
                    updated_post.category = None
                else:
                    category = Category.query.get(data['category_id'])
                    if not category:
                        return {"message": "Category not found."}, 404
                    updated_post.category = category

            # Handle tags update (replace all existing tags with new ones)
            if 'tag_ids' in data:
                updated_post.tags.clear() # Remove all existing tags
                for tag_id in data['tag_ids']:
                    tag = Tag.query.get(tag_id)
                    if tag:
                        updated_post.tags.append(tag)
                    else:
                        current_app.logger.warning(f"Tag with ID {tag_id} not found during update, skipping.")

            # Update published_at if status changes to 'published' and it's not already set
            if updated_post.status == 'published' and updated_post.published_at is None:
                updated_post.published_at = datetime.utcnow()
            elif updated_post.status != 'published' and updated_post.published_at is not None:
                # Optionally reset published_at if moving away from published status
                # updated_post.published_at = None
                pass # Or keep it, depending on desired behavior

            db.session.commit()
            cache.delete_memoized(ContentService.get_post_by_id, post_id) # Invalidate specific post cache
            cache.delete_memoized(ContentService.get_all_posts) # Invalidate all posts cache
            current_app.logger.info(f"Post '{post.title}' (ID: {post_id}) updated successfully by user {current_user_id}.")
            return post_schema.dump(updated_post), 200
        except IntegrityError:
            db.session.rollback()
            current_app.logger.error(f"Integrity error updating post {post_id}. Possibly duplicate slug.")
            return {"message": "A post with this slug already exists."}, 409
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error updating post {post_id} for user {current_user_id}: {e}")
            return {"message": "Could not update post due to an internal server error."}, 500

    @staticmethod
    def delete_post(post_id, current_user_id, current_user_role):
        """Deletes a post."""
        post = Post.query.get(post_id)
        if not post:
            return {"message": "Post not found"}, 404

        # Authorization check: only author or admin/editor can delete
        if not (current_user_role in ['admin', 'editor'] or str(post.author_id) == current_user_id):
            return {"message": "You are not authorized to delete this post."}, 403

        try:
            db.session.delete(post)
            db.session.commit()
            cache.delete_memoized(ContentService.get_post_by_id, post_id) # Invalidate specific post cache
            cache.delete_memoized(ContentService.get_all_posts) # Invalidate all posts cache
            current_app.logger.info(f"Post '{post.title}' (ID: {post_id}) deleted successfully by user {current_user_id}.")
            return {"message": "Post deleted successfully"}, 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error deleting post {post_id} for user {current_user_id}: {e}")
            return {"message": "Could not delete post due to an internal server error."}, 500

    # --- Category Management ---
    @staticmethod
    def get_all_categories():
        from app.schemas import categories_schema
        categories = Category.query.all()
        return categories_schema.dump(categories), 200

    @staticmethod
    def get_category_by_id(category_id):
        from app.schemas import category_schema
        category = Category.query.get(category_id)
        if not category:
            return {"message": "Category not found"}, 404
        return category_schema.dump(category), 200

    @staticmethod
    def create_category(data):
        from app.schemas import category_schema
        try:
            category_data = category_schema.load(data)
            if not category_data.get('slug'):
                category_data['slug'] = slugify.slugify(category_data['name'])

            if Category.query.filter_by(slug=category_data['slug']).first():
                return {"message": "Category with this slug already exists."}, 409

            new_category = Category(
                name=category_data['name'],
                slug=category_data['slug'],
                description=category_data.get('description')
            )
            db.session.add(new_category)
            db.session.commit()
            return category_schema.dump(new_category), 201
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error creating category: {e}")
            return {"message": "Could not create category due to an internal server error."}, 500

    @staticmethod
    def update_category(category_id, data):
        from app.schemas import category_schema
        category = Category.query.get(category_id)
        if not category:
            return {"message": "Category not found"}, 404
        try:
            if 'name' in data and not data.get('slug'):
                data['slug'] = slugify.slugify(data['name'])
            
            if 'slug' in data and data['slug'] != category.slug:
                if Category.query.filter_by(slug=data['slug']).first():
                    return {"message": "Category with this slug already exists."}, 409

            updated_category = category_schema.load(data, instance=category, partial=True, session=db.session)
            db.session.commit()
            return category_schema.dump(updated_category), 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error updating category {category_id}: {e}")
            return {"message": "Could not update category due to an internal server error."}, 500

    @staticmethod
    def delete_category(category_id):
        category = Category.query.get(category_id)
        if not category:
            return {"message": "Category not found"}, 404
        try:
            # Before deleting, handle associated posts (e.g., set category_id to NULL)
            # Or enforce a database CASCADE ON DELETE constraint
            Post.query.filter_by(category_id=category_id).update({"category_id": None}, synchronize_session=False)
            db.session.delete(category)
            db.session.commit()
            return {"message": "Category deleted successfully"}, 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error deleting category {category_id}: {e}")
            return {"message": "Could not delete category due to an internal server error."}, 500

    # --- Tag Management ---
    @staticmethod
    def get_all_tags():
        from app.schemas import tags_schema
        tags = Tag.query.all()
        return tags_schema.dump(tags), 200

    @staticmethod
    def get_tag_by_id(tag_id):
        from app.schemas import tag_schema
        tag = Tag.query.get(tag_id)
        if not tag:
            return {"message": "Tag not found"}, 404
        return tag_schema.dump(tag), 200

    @staticmethod
    def create_tag(data):
        from app.schemas import tag_schema
        try:
            tag_data = tag_schema.load(data)
            if not tag_data.get('slug'):
                tag_data['slug'] = slugify.slugify(tag_data['name'])

            if Tag.query.filter_by(slug=tag_data['slug']).first():
                return {"message": "Tag with this slug already exists."}, 409

            new_tag = Tag(name=tag_data['name'], slug=tag_data['slug'])
            db.session.add(new_tag)
            db.session.commit()
            return tag_schema.dump(new_tag), 201
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error creating tag: {e}")
            return {"message": "Could not create tag due to an internal server error."}, 500

    @staticmethod
    def update_tag(tag_id, data):
        from app.schemas import tag_schema
        tag = Tag.query.get(tag_id)
        if not tag:
            return {"message": "Tag not found"}, 404
        try:
            if 'name' in data and not data.get('slug'):
                data['slug'] = slugify.slugify(data['name'])

            if 'slug' in data and data['slug'] != tag.slug:
                if Tag.query.filter_by(slug=data['slug']).first():
                    return {"message": "Tag with this slug already exists."}, 409

            updated_tag = tag_schema.load(data, instance=tag, partial=True, session=db.session)
            db.session.commit()
            return tag_schema.dump(updated_tag), 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error updating tag {tag_id}: {e}")
            return {"message": "Could not update tag due to an internal server error."}, 500

    @staticmethod
    def delete_tag(tag_id):
        tag = Tag.query.get(tag_id)
        if not tag:
            return {"message": "Tag not found"}, 404
        try:
            db.session.delete(tag)
            db.session.commit()
            return {"message": "Tag deleted successfully"}, 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error deleting tag {tag_id}: {e}")
            return {"message": "Could not delete tag due to an internal server error."}, 500
```