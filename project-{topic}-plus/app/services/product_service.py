```python
import slugify
from sqlalchemy.exc import IntegrityError
from app import db, cache
from app.models import Product, Category
from app.schemas import ProductSchema
from flask import current_app

class ProductService:
    product_schema = ProductSchema()
    products_schema = ProductSchema(many=True)

    @classmethod
    def create_product(cls, data):
        """Creates a new product."""
        try:
            # Generate a unique slug for the product
            base_slug = slugify.slugify(data['name'])
            slug = base_slug
            counter = 1
            while Product.query.filter_by(slug=slug).first():
                slug = f"{base_slug}-{counter}"
                counter += 1

            category = Category.query.get(data['category_id'])
            if not category:
                raise ValueError("Category not found.")

            product = Product(
                name=data['name'],
                slug=slug,
                description=data.get('description'),
                price=data['price'],
                stock=data.get('stock', 0),
                image_url=data.get('image_url'),
                category_id=data['category_id']
            )
            db.session.add(product)
            db.session.commit()
            cache.delete_memoized(cls.get_all_products) # Clear cache for all products
            cache.delete_memoized(cls.get_product_by_slug, slug) # Clear cache for specific product slug
            return cls.product_schema.dump(product)
        except IntegrityError:
            db.session.rollback()
            raise ValueError("A product with this name already exists or category ID is invalid.")
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating product: {e}")
            raise

    @classmethod
    @cache.memoize(timeout=60) # Cache results for 60 seconds
    def get_all_products(cls, page=1, per_page=10, category_id=None, search=None, min_price=None, max_price=None):
        """Retrieves all products with optional filters, pagination, and caching."""
        query = Product.query.order_by(Product.name.asc())

        if category_id:
            query = query.filter_by(category_id=category_id)
        if search:
            query = query.filter(Product.name.ilike(f'%{search}%') | Product.description.ilike(f'%{search}%'))
        if min_price is not None:
            query = query.filter(Product.price >= min_price)
        if max_price is not None:
            query = query.filter(Product.price <= max_price)

        paginated_products = query.paginate(page=page, per_page=per_page, error_out=False)
        products_data = cls.products_schema.dump(paginated_products.items)
        return {
            "products": products_data,
            "total_items": paginated_products.total,
            "total_pages": paginated_products.pages,
            "current_page": paginated_products.page,
            "per_page": paginated_products.per_page
        }

    @classmethod
    @cache.memoize(timeout=60)
    def get_product_by_id(cls, product_id):
        """Retrieves a product by its ID."""
        product = Product.query.get(product_id)
        if not product:
            return None
        return cls.product_schema.dump(product)

    @classmethod
    @cache.memoize(timeout=60)
    def get_product_by_slug(cls, slug):
        """Retrieves a product by its slug."""
        product = Product.query.filter_by(slug=slug).first()
        if not product:
            return None
        return cls.product_schema.dump(product)

    @classmethod
    def update_product(cls, product_id, data):
        """Updates an existing product."""
        product = Product.query.get(product_id)
        if not product:
            return None

        for key, value in data.items():
            if key == 'name' and value != product.name:
                # Update slug if name changes
                base_slug = slugify.slugify(value)
                slug = base_slug
                counter = 1
                while Product.query.filter(Product.slug == slug, Product.id != product_id).first():
                    slug = f"{base_slug}-{counter}"
                    counter += 1
                setattr(product, 'slug', slug)
            elif key == 'category_id':
                category = Category.query.get(value)
                if not category:
                    raise ValueError("Category not found.")
                setattr(product, key, value)
            else:
                setattr(product, key, value)

        db.session.commit()
        cache.delete_memoized(cls.get_all_products) # Clear cache for all products
        cache.delete_memoized(cls.get_product_by_id, product_id) # Clear cache for specific product ID
        cache.delete_memoized(cls.get_product_by_slug, product.slug) # Clear cache for specific product slug
        return cls.product_schema.dump(product)

    @classmethod
    def delete_product(cls, product_id):
        """Deletes a product."""
        product = Product.query.get(product_id)
        if not product:
            return False

        db.session.delete(product)
        db.session.commit()
        cache.delete_memoized(cls.get_all_products) # Clear cache for all products
        cache.delete_memoized(cls.get_product_by_id, product_id) # Clear cache for specific product ID
        cache.delete_memoized(cls.get_product_by_slug, product.slug) # Clear cache for specific product slug
        return True

    @classmethod
    def update_product_stock(cls, product_id, quantity, decrement=True):
        """Updates the stock of a product."""
        product = Product.query.get(product_id)
        if not product:
            raise ValueError("Product not found.")

        if decrement:
            if product.stock < quantity:
                raise ValueError("Not enough stock available.")
            product.stock -= quantity
        else: # Increment
            product.stock += quantity

        db.session.commit()
        cache.delete_memoized(cls.get_product_by_id, product_id) # Invalidate product cache
        cache.delete_memoized(cls.get_product_by_slug, product.slug) # Invalidate product cache
        return cls.product_schema.dump(product)

class CategoryService:
    category_schema = ProductSchema()
    categories_schema = CategorySchema(many=True)

    @classmethod
    def create_category(cls, data):
        """Creates a new category."""
        try:
            # Generate a unique slug for the category
            base_slug = slugify.slugify(data['name'])
            slug = base_slug
            counter = 1
            while Category.query.filter_by(slug=slug).first():
                slug = f"{base_slug}-{counter}"
                counter += 1

            category = Category(
                name=data['name'],
                slug=slug,
                description=data.get('description')
            )
            db.session.add(category)
            db.session.commit()
            cache.delete_memoized(cls.get_all_categories)
            return cls.category_schema.dump(category)
        except IntegrityError:
            db.session.rollback()
            raise ValueError("A category with this name already exists.")
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating category: {e}")
            raise

    @classmethod
    @cache.memoize(timeout=3600) # Cache for 1 hour as categories don't change often
    def get_all_categories(cls):
        """Retrieves all categories."""
        categories = Category.query.order_by(Category.name.asc()).all()
        return cls.categories_schema.dump(categories)

    @classmethod
    @cache.memoize(timeout=3600)
    def get_category_by_id(cls, category_id):
        """Retrieves a category by its ID."""
        category = Category.query.get(category_id)
        if not category:
            return None
        return cls.category_schema.dump(category)

    @classmethod
    @cache.memoize(timeout=3600)
    def get_category_by_slug(cls, slug):
        """Retrieves a category by its slug."""
        category = Category.query.filter_by(slug=slug).first()
        if not category:
            return None
        return cls.category_schema.dump(category)

    @classmethod
    def update_category(cls, category_id, data):
        """Updates an existing category."""
        category = Category.query.get(category_id)
        if not category:
            return None

        for key, value in data.items():
            if key == 'name' and value != category.name:
                # Update slug if name changes
                base_slug = slugify.slugify(value)
                slug = base_slug
                counter = 1
                while Category.query.filter(Category.slug == slug, Category.id != category_id).first():
                    slug = f"{base_slug}-{counter}"
                    counter += 1
                setattr(category, 'slug', slug)
            else:
                setattr(category, key, value)

        db.session.commit()
        cache.delete_memoized(cls.get_all_categories)
        cache.delete_memoized(cls.get_category_by_id, category_id)
        cache.delete_memoized(cls.get_category_by_slug, category.slug)
        return cls.category_schema.dump(category)

    @classmethod
    def delete_category(cls, category_id):
        """Deletes a category."""
        category = Category.query.get(category_id)
        if not category:
            return False

        # Check if there are any products associated with this category
        if category.products:
            raise ValueError("Cannot delete category with associated products.")

        db.session.delete(category)
        db.session.commit()
        cache.delete_memoized(cls.get_all_categories)
        cache.delete_memoized(cls.get_category_by_id, category_id)
        cache.delete_memoized(cls.get_category_by_slug, category.slug)
        return True
```