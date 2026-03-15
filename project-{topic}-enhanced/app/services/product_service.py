from app import db, cache
from app.models.product import Product
from app.models.category import Category
from app.utils.errors import NotFoundError, ConflictError, BadRequestError
import logging

logger = logging.getLogger(__name__)

class ProductService:
    @staticmethod
    @cache.cached(key_prefix='all_products', timeout=60) # Cache all products for 60 seconds
    def get_all_products(category_id=None, search_term=None, limit=None, offset=None):
        query = Product.query.filter_by(is_active=True)
        if category_id:
            query = query.filter_by(category_id=category_id)
        if search_term:
            query = query.filter(Product.name.ilike(f'%{search_term}%') | Product.description.ilike(f'%{search_term}%'))
        
        if limit is not None:
            query = query.limit(limit)
        if offset is not None:
            query = query.offset(offset)

        return query.all()

    @staticmethod
    @cache.cached(key_prefix='product', timeout=60, make_cache_key=lambda *args, **kwargs: f"product_{kwargs['product_id']}")
    def get_product_by_id(product_id):
        product = Product.query.get(product_id)
        if not product or not product.is_active:
            raise NotFoundError(f"Product with id {product_id} not found or is inactive.")
        return product

    @staticmethod
    def get_product_by_slug(slug):
        product = Product.query.filter_by(slug=slug, is_active=True).first()
        if not product:
            raise NotFoundError(f"Product with slug '{slug}' not found or is inactive.")
        return product

    @staticmethod
    def create_product(name, slug, price, stock_quantity, category_id, description=None, image_url=None):
        if Product.query.filter_by(slug=slug).first():
            raise ConflictError(f"Product with slug '{slug}' already exists.")
        if not Category.query.get(category_id):
            raise NotFoundError(f"Category with id {category_id} not found.")

        try:
            new_product = Product(
                name=name, slug=slug, price=price, stock_quantity=stock_quantity,
                category_id=category_id, description=description, image_url=image_url
            )
            db.session.add(new_product)
            db.session.commit()
            cache.clear() # Clear cache on data modification
            logger.info(f"Product '{name}' created successfully.")
            return new_product
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating product '{name}': {e}")
            raise BadRequestError(f"Failed to create product: {e}")

    @staticmethod
    def update_product(product_id, data):
        product = ProductService.get_product_by_id(product_id)

        if 'slug' in data and data['slug'] != product.slug and Product.query.filter_by(slug=data['slug']).first():
            raise ConflictError(f"Product with slug '{data['slug']}' already exists.")
        if 'category_id' in data and not Category.query.get(data['category_id']):
            raise NotFoundError(f"Category with id {data['category_id']} not found.")

        try:
            product.name = data.get('name', product.name)
            product.slug = data.get('slug', product.slug)
            product.description = data.get('description', product.description)
            product.price = data.get('price', product.price)
            product.stock_quantity = data.get('stock_quantity', product.stock_quantity)
            product.image_url = data.get('image_url', product.image_url)
            product.is_active = data.get('is_active', product.is_active)
            product.category_id = data.get('category_id', product.category_id)
            db.session.commit()
            cache.clear() # Clear cache on data modification
            logger.info(f"Product {product_id} updated successfully.")
            return product
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating product {product_id}: {e}")
            raise BadRequestError(f"Failed to update product: {e}")

    @staticmethod
    def delete_product(product_id):
        product = ProductService.get_product_by_id(product_id)
        try:
            db.session.delete(product)
            db.session.commit()
            cache.clear() # Clear cache on data modification
            logger.info(f"Product {product_id} deleted successfully.")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting product {product_id}: {e}")
            raise BadRequestError(f"Failed to delete product: {e}")

    @staticmethod
    @cache.cached(key_prefix='all_categories', timeout=3600) # Cache categories for 1 hour
    def get_all_categories():
        return Category.query.all()

    @staticmethod
    def get_category_by_id(category_id):
        category = Category.query.get(category_id)
        if not category:
            raise NotFoundError(f"Category with id {category_id} not found.")
        return category

    @staticmethod
    def create_category(name, slug, description=None):
        if Category.query.filter_by(slug=slug).first():
            raise ConflictError(f"Category with slug '{slug}' already exists.")
        try:
            new_category = Category(name=name, slug=slug, description=description)
            db.session.add(new_category)
            db.session.commit()
            cache.clear() # Clear category cache
            logger.info(f"Category '{name}' created successfully.")
            return new_category
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating category '{name}': {e}")
            raise BadRequestError(f"Failed to create category: {e}")

    @staticmethod
    def update_category(category_id, data):
        category = ProductService.get_category_by_id(category_id)
        if 'slug' in data and data['slug'] != category.slug and Category.query.filter_by(slug=data['slug']).first():
            raise ConflictError(f"Category with slug '{data['slug']}' already exists.")

        try:
            category.name = data.get('name', category.name)
            category.slug = data.get('slug', category.slug)
            category.description = data.get('description', category.description)
            db.session.commit()
            cache.clear() # Clear category cache
            logger.info(f"Category {category_id} updated successfully.")
            return category
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating category {category_id}: {e}")
            raise BadRequestError(f"Failed to update category: {e}")

    @staticmethod
    def delete_category(category_id):
        category = ProductService.get_category_by_id(category_id)
        if category.products:
            raise BadRequestError("Cannot delete category with associated products.")
        try:
            db.session.delete(category)
            db.session.commit()
            cache.clear() # Clear category cache
            logger.info(f"Category {category_id} deleted successfully.")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting category {category_id}: {e}")
            raise BadRequestError(f"Failed to delete category: {e}")