import pytest
import os
from app import create_app, db
from app.models import User, Category, Product, Cart, CartItem, Order, OrderItem
from faker import Faker
from slugify import slugify
from decimal import Decimal
import random

# Set the FLASK_CONFIG_TYPE for testing
os.environ['FLASK_CONFIG_TYPE'] = 'testing'

@pytest.fixture(scope='session')
def app():
    """Fixture for the Flask application."""
    app = create_app()
    with app.app_context():
        # Create all tables and seed some data for session-wide tests
        db.create_all()
        seed_test_data(app)
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='function')
def client(app):
    """Fixture for a test client."""
    return app.test_client()

@pytest.fixture(scope='function')
def db_session(app):
    """Fixture for a clean database session for each test function."""
    with app.app_context():
        db.session.begin_nested() # Start a nested transaction
        yield db.session
        db.session.rollback() # Rollback the transaction to clean up changes
        db.session.close()

@pytest.fixture(scope='function')
def auth_client(client):
    """Fixture for an authenticated client."""
    # Login the admin user and return a client with JWT token
    response = client.post('/api/auth/login', json={
        'email': 'admin@example.com',
        'password': 'admin_password'
    })
    token = response.json['access_token']
    client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {token}'
    return client

@pytest.fixture(scope='function')
def customer_auth_client(client):
    """Fixture for an authenticated customer client."""
    # Login a regular customer and return a client with JWT token
    response = client.post('/api/auth/login', json={
        'email': 'testuser1@example.com', # Assuming this user exists from seed_test_data
        'password': 'password123'
    })
    token = response.json['access_token']
    client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {token}'
    return client

def seed_test_data(app):
    """Seeds the database with test data."""
    with app.app_context():
        # Clear existing data just in case
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(table.delete())
        db.session.commit()

        fake = Faker()

        # Admin user
        admin_email = 'admin@example.com'
        admin_password = 'admin_password'
        admin_user = User(username='admin', email=admin_email, password=admin_password, role='admin')
        db.session.add(admin_user)
        db.session.flush() # Get ID for cart
        admin_cart = Cart(user_id=admin_user.id)
        db.session.add(admin_cart)
        
        # Test customer
        customer_user = User(username='testuser1', email='testuser1@example.com', password='password123', role='customer')
        db.session.add(customer_user)
        db.session.flush()
        customer_cart = Cart(user_id=customer_user.id)
        db.session.add(customer_cart)

        # Another customer
        customer_user2 = User(username='testuser2', email='testuser2@example.com', password='password123', role='customer')
        db.session.add(customer_user2)
        db.session.flush()
        customer_cart2 = Cart(user_id=customer_user2.id)
        db.session.add(customer_cart2)

        # Categories
        cat1 = Category(name='Electronics', slug='electronics', description='Gadgets and devices.')
        cat2 = Category(name='Books', slug='books', description='Printed and digital literature.')
        db.session.add_all([cat1, cat2])
        db.session.flush() # Get IDs for products

        # Products
        p1 = Product(name='Laptop Pro', slug='laptop-pro', price=Decimal('1200.00'), stock_quantity=10, category_id=cat1.id, image_url='http://example.com/laptop.jpg')
        p2 = Product(name='Smartphone X', slug='smartphone-x', price=Decimal('800.00'), stock_quantity=20, category_id=cat1.id, is_active=False, image_url='http://example.com/phone.jpg')
        p3 = Product(name='The Great Novel', slug='great-novel', price=Decimal('25.50'), stock_quantity=50, category_id=cat2.id, image_url='http://example.com/novel.jpg')
        db.session.add_all([p1, p2, p3])
        db.session.flush() # Get IDs for cart items

        # Cart for customer_user
        cart_item1 = CartItem(cart_id=customer_cart.id, product_id=p1.id, quantity=2, price_at_addition=p1.price)
        cart_item2 = CartItem(cart_id=customer_cart.id, product_id=p3.id, quantity=1, price_at_addition=p3.price)
        db.session.add_all([cart_item1, cart_item2])

        db.session.commit()
        print("Test data seeded.")