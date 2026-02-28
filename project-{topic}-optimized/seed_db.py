import os
from dotenv import load_dotenv
from app import create_app
from app.database import db
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.product import Product
from app.extensions import bcrypt # Use bcrypt directly for hashing
import random
import string
import datetime

# Load environment variables
load_dotenv()

def generate_random_string(length=10):
    return ''.join(random.choice(string.ascii_lowercase) for _ in range(length))

def seed_data():
    app = create_app(os.getenv('FLASK_ENV', 'development'))
    with app.app_context():
        print("Starting database seeding...")

        # Ensure all roles are present
        roles_to_create = ['ADMIN', 'EDITOR', 'CUSTOMER']
        role_objects = {}
        for role_name in roles_to_create:
            role = UserRole.query.filter_by(name=role_name).first()
            if not role:
                role = UserRole(name=role_name, description=f"{role_name} role")
                db.session.add(role)
                db.session.commit()
                print(f"  - Created role: {role_name}")
            role_objects[role_name] = role

        # Create an admin user if not exists
        if not User.query.filter_by(email="admin@example.com").first():
            admin_user = User(
                username="admin",
                email="admin@example.com",
                password_hash=bcrypt.generate_password_hash("adminpass123").decode('utf-8'),
                is_active=True,
                roles=[role_objects['ADMIN']]
            )
            db.session.add(admin_user)
            db.session.commit()
            print("  - Created admin user: admin@example.com")

        # Create a customer user if not exists
        if not User.query.filter_by(email="customer@example.com").first():
            customer_user = User(
                username="customer",
                email="customer@example.com",
                password_hash=bcrypt.generate_password_hash("customerpass").decode('utf-8'),
                is_active=True,
                roles=[role_objects['CUSTOMER']]
            )
            db.session.add(customer_user)
            db.session.commit()
            print("  - Created customer user: customer@example.com")

        # Create categories if not exists
        categories_to_create = {
            "Electronics": "Devices like phones, laptops, etc.",
            "Books": "Fiction, non-fiction, educational books.",
            "Clothing": "Apparel for men, women, and children.",
            "Home & Kitchen": "Appliances, decor, kitchenware."
        }
        category_objects = {}
        for name, desc in categories_to_create.items():
            slug = name.lower().replace(' & ', '-').replace(' ', '-')
            category = Category.query.filter_by(name=name).first()
            if not category:
                category = Category(name=name, slug=slug, description=desc, is_active=True)
                db.session.add(category)
                db.session.commit()
                print(f"  - Created category: {name}")
            category_objects[name] = category

        # Create products if not exists
        products_to_create = [
            {"name": "Laptop Pro", "description": "High-performance laptop.", "price": 1200.00, "stock": 50, "category": "Electronics"},
            {"name": "Smartphone X", "description": "Latest generation smartphone.", "price": 800.00, "stock": 120, "category": "Electronics"},
            {"name": "Python Programming Book", "description": "A comprehensive guide to Python.", "price": 45.99, "stock": 200, "category": "Books"},
            {"name": "Mystery Novel", "description": "An engaging mystery novel.", "price": 15.50, "stock": 300, "category": "Books"},
            {"name": "T-Shirt Basic", "description": "Comfortable cotton t-shirt.", "price": 20.00, "stock": 500, "category": "Clothing"},
            {"name": "Coffee Maker", "description": "Automated drip coffee maker.", "price": 75.00, "stock": 80, "category": "Home & Kitchen"},
        ]

        for p_data in products_to_create:
            slug = p_data['name'].lower().replace(' ', '-') + "-" + generate_random_string(5)
            product = Product.query.filter_by(name=p_data['name']).first()
            if not product:
                category_obj = category_objects.get(p_data['category'])
                if category_obj:
                    product = Product(
                        name=p_data['name'],
                        slug=slug,
                        description=p_data['description'],
                        price=p_data['price'],
                        stock_quantity=p_data['stock'],
                        category_id=category_obj.id,
                        is_active=True
                    )
                    db.session.add(product)
                    print(f"  - Created product: {p_data['name']}")
                else:
                    print(f"  - Warning: Category '{p_data['category']}' not found for product '{p_data['name']}'")
        db.session.commit()

        print("Database seeding completed.")

if __name__ == "__main__":
    seed_data()