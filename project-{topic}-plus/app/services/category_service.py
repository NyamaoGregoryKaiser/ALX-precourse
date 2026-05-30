```python
from app.extensions import db
from app.models.category import Category
from app.schemas.category import category_schema, categories_schema
from app.utils.errors import NotFoundError, ConflictError, BadRequestError
from sqlalchemy.exc import IntegrityError
import logging

class CategoryService:
    """
    Service layer for Category-related business logic.
    Handles CRUD operations for categories.
    """
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def get_all_categories(self):
        """Retrieves all categories."""
        self.logger.info("Fetching all categories.")
        categories = Category.query.all()
        return categories_schema.dump(categories)

    def get_category_by_id(self, category_id):
        """Retrieves a single category by ID."""
        self.logger.info(f"Fetching category with ID: {category_id}")
        category = Category.query.get(category_id)
        if not category:
            raise NotFoundError(f"Category with ID {category_id} not found.")
        return category_schema.dump(category)

    def create_category(self, category_data):
        """
        Creates a new category.
        Validates input and ensures unique slug.
        """
        self.logger.info(f"Attempting to create category with data: {category_data.get('name')}")
        
        # Validate input
        errors = category_schema.validate(category_data)
        if errors:
            raise BadRequestError(f"Validation errors: {errors}")

        # Check for existing slug or name
        if Category.query.filter_by(slug=category_data['slug']).first():
            raise ConflictError(f"Category slug '{category_data['slug']}' already exists.")
        if Category.query.filter_by(name=category_data['name']).first():
            raise ConflictError(f"Category name '{category_data['name']}' already exists.")

        try:
            category = Category(
                name=category_data['name'],
                slug=category_data['slug'],
                description=category_data.get('description')
            )
            db.session.add(category)
            db.session.commit()
            self.logger.info(f"Category '{category.name}' created successfully with ID: {category.id}")
            return category_schema.dump(category)
        except IntegrityError as e:
            db.session.rollback()
            self.logger.error(f"Error creating category: {e}", exc_info=True)
            if "duplicate key value violates unique constraint" in str(e):
                raise ConflictError("A category with this name or slug already exists.")
            raise

    def update_category(self, category_id, update_data):
        """
        Updates an existing category's information.
        """
        self.logger.info(f"Attempting to update category ID: {category_id} with data: {update_data}")
        category = Category.query.get(category_id)
        if not category:
            raise NotFoundError(f"Category with ID {category_id} not found.")

        # Validate input (partial update allowed)
        errors = category_schema.validate(update_data, partial=True)
        if errors:
            raise BadRequestError(f"Validation errors: {errors}")

        try:
            # Handle unique constraints for slug and name
            if 'slug' in update_data and update_data['slug'] != category.slug:
                if Category.query.filter_by(slug=update_data['slug']).first():
                    raise ConflictError(f"Category slug '{update_data['slug']}' already exists.")
                category.slug = update_data['slug']
            
            if 'name' in update_data and update_data['name'] != category.name:
                if Category.query.filter_by(name=update_data['name']).first():
                    raise ConflictError(f"Category name '{update_data['name']}' already exists.")
                category.name = update_data['name']

            if 'description' in update_data:
                category.description = update_data['description']
            
            db.session.commit()
            self.logger.info(f"Category ID: {category.id} updated successfully.")
            return category_schema.dump(category)
        except IntegrityError as e:
            db.session.rollback()
            self.logger.error(f"Error updating category ID {category_id}: {e}", exc_info=True)
            if "duplicate key value violates unique constraint" in str(e):
                raise ConflictError("A category with this name or slug already exists.")
            raise

    def delete_category(self, category_id):
        """Deletes a category by ID."""
        self.logger.info(f"Attempting to delete category ID: {category_id}")
        category = Category.query.get(category_id)
        if not category:
            raise NotFoundError(f"Category with ID {category_id} not found.")
        
        # Check if category is used by any posts before deleting
        if category.posts:
            raise ConflictError(f"Category '{category.name}' (ID: {category_id}) cannot be deleted because it is associated with existing posts.")

        db.session.delete(category)
        db.session.commit()
        self.logger.info(f"Category ID: {category.id} deleted successfully.")
        return {"message": f"Category with ID {category_id} deleted successfully."}

```