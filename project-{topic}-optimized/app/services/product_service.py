from app.database import db
from app.models.product import Product
from app.models.category import Category
from app.utils.errors import NotFoundError, ConflictError, BadRequestError, InternalServerError
from slugify import slugify
from flask import current_app
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload # For query optimization

class ProductService:
    """
    Handles business logic related to product management.
    """

    @staticmethod
    def get_product_by_id(product_id):
        """Fetches a product by its ID, with its category details."""
        # Query optimization: Use joinedload to eager load category in one query
        product = Product.query.options(joinedload(Product.category)).get(product_id)
        if not product:
            raise NotFoundError(f"Product with ID {product_id} not found.")
        return product

    @staticmethod
    def get_all_products(page=1, per_page=10, search=None, category_id=None, min_price=None, max_price=None, is_active=True):
        """
        Fetches all products with pagination and optional filters.
        Includes query optimization for category loading.
        """
        query = Product.query.options(joinedload(Product.category)).order_by(Product.name.asc())

        if is_active is not None:
            query = query.filter_by(is_active=is_active)
        if search:
            query = query.filter(
                (Product.name.ilike(f'%{search}%')) |
                (Product.description.ilike(f'%{search}%'))
            )
        if category_id:
            query = query.filter_by(category_id=category_id)
        if min_price is not None:
            query = query.filter(Product.price >= min_price)
        if max_price is not None:
            query = query.filter(Product.price <= max_price)

        products_pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return products_pagination.items, products_pagination.total

    @staticmethod
    def create_product(name, description, price, stock_quantity, category_id, image_url=None):
        """Creates a new product."""
        category = Category.query.get(category_id)
        if not category:
            raise BadRequestError(f"Category with ID {category_id} not found.")

        # Generate unique slug (consider appending a short hash if names are not unique enough)
        base_slug = slugify(name)
        slug = base_slug
        counter = 1
        while Product.query.filter_by(slug=slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1

        new_product = Product(
            name=name,
            slug=slug,
            description=description,
            price=price,
            stock_quantity=stock_quantity,
            category_id=category_id,
            image_url=image_url,
            is_active=True
        )
        try:
            db.session.add(new_product)
            db.session.commit()
            current_app.logger.info(f"New product created: {name}")
            return new_product
        except IntegrityError:
            db.session.rollback()
            raise ConflictError(f"A product with similar name '{name}' already exists (unexpected slug conflict).")
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error creating product {name}: {e}")
            raise InternalServerError("Could not create product.")

    @staticmethod
    def update_product(product_id, data):
        """Updates an existing product."""
        product = ProductService.get_product_by_id(product_id)

        if 'name' in data and data['name'] != product.name:
            base_slug = slugify(data['name'])
            new_slug = base_slug
            counter = 1
            while Product.query.filter(Product.slug == new_slug, Product.id != product_id).first():
                new_slug = f"{base_slug}-{counter}"
                counter += 1
            product.name = data['name']
            product.slug = new_slug # Update slug on name change

        if 'description' in data:
            product.description = data['description']
        if 'price' in data:
            product.price = data['price']
        if 'stock_quantity' in data:
            product.stock_quantity = data['stock_quantity']
        if 'image_url' in data:
            product.image_url = data['image_url']
        if 'is_active' in data:
            product.is_active = data['is_active']
        if 'category_id' in data and data['category_id'] != product.category_id:
            category = Category.query.get(data['category_id'])
            if not category:
                raise BadRequestError(f"Category with ID {data['category_id']} not found.")
            product.category_id = data['category_id']

        try:
            db.session.commit()
            current_app.logger.info(f"Product {product_id} updated.")
            return product
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("A product with similar name/slug already exists (unexpected conflict).")
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error updating product {product_id}: {e}")
            raise InternalServerError("Could not update product.")

    @staticmethod
    def delete_product(product_id):
        """Deletes a product."""
        product = ProductService.get_product_by_id(product_id)

        # Consider checking for associated order items before deletion,
        # or implement soft delete. For now, direct deletion.
        try:
            db.session.delete(product)
            db.session.commit()
            current_app.logger.info(f"Product {product_id} deleted.")
            return {"message": "Product deleted successfully."}
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Error deleting product {product_id}: {e}")
            raise InternalServerError("Could not delete product.")