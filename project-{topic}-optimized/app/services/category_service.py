from app.database import db
from app.models.category import Category
from app.utils.errors import NotFoundError, ConflictError, BadRequestError, InternalServerError
from slugify import slugify
from flask import current_app
from sqlalchemy.exc import IntegrityError

class CategoryService:
    """
    Handles business logic related to category management.
    """

    @staticmethod
    def get_category_by_id(category_id):
        """Fetches a category by its ID."""
        category = Category.query.get(category_id)
        if not category:
            raise NotFoundError(f"Category with ID {category_id} not found.")
        return category

    @staticmethod
    def get_all_categories(page=1, per_page=10, search=None, is_active=True):
        """Fetches all categories with pagination and optional search/filter."""
        query = Category.query.order_by(Category.name.asc())
        if is_active is not None:
            query = query.filter_by(is_active=is_active)
        if search:
            query = query.filter(Category.name.ilike(f'%{search}%'))

        categories_pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return categories_pagination.items, categories_pagination.total

    @staticmethod
    def create_category(name, description=None):
        """Creates a new category."""
        slug = slugify(name)
        if Category.query.filter_by(slug=slug).first():
            raise ConflictError(f"Category with name '{name}' already exists.")

        new_category = Category(name=name, slug=slug, description=description)
        try:
            db.session.add(new_category)
            db.session.commit()
            current_app.logger.info(f"New category created: {name}")
            return new_category
        except IntegrityError:
            db.session.rollback()
            raise ConflictError(f"A category with slug '{slug}' already exists (unexpected conflict).")
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error creating category {name}: {e}")
            raise InternalServerError("Could not create category.")

    @staticmethod
    def update_category(category_id, data):
        """Updates an existing category."""
        category = CategoryService.get_category_by_id(category_id)

        if 'name' in data and data['name'] != category.name:
            new_slug = slugify(data['name'])
            if Category.query.filter(Category.slug == new_slug, Category.id != category_id).first():
                raise ConflictError(f"Category with name '{data['name']}' already exists.")
            category.name = data['name']
            category.slug = new_slug # Update slug on name change

        if 'description' in data:
            category.description = data['description']

        if 'is_active' in data:
            category.is_active = data['is_active']

        try:
            db.session.commit()
            current_app.logger.info(f"Category {category_id} updated.")
            return category
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("A category with this name/slug already exists (unexpected conflict).")
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error updating category {category_id}: {e}")
            raise InternalServerError("Could not update category.")

    @staticmethod
    def delete_category(category_id):
        """Deletes a category."""
        category = CategoryService.get_category_by_id(category_id)

        if category.products:
            raise BadRequestError(f"Cannot delete category '{category.name}' because it has associated products.")

        try:
            db.session.delete(category)
            db.session.commit()
            current_app.logger.info(f"Category {category_id} deleted.")
            return {"message": "Category deleted successfully."}
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error deleting category {category_id}: {e}")
            raise InternalServerError("Could not delete category.")