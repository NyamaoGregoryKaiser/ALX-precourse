import pytest
import os
from dotenv import load_dotenv

# Load environment variables from .env.example for testing purposes
load_dotenv('.env.example')
os.environ['FLASK_ENV'] = 'testing' # Ensure testing config is loaded

from app import create_app
from app.database import db
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatus
from app.extensions import bcrypt, jwt
import datetime
from flask_jwt_extended import create_access_token

@pytest.fixture(scope='session')
def app():
    """Fixture for the Flask application."""
    app = create_app('testing')
    with app.app_context():
        # Ensure that the database is clean before tests begin
        db.create_all()
        # Create default roles for tests
        roles_to_create = ['ADMIN', 'EDITOR', 'CUSTOMER']
        for role_name in roles_to_create:
            if not UserRole.query.filter_by(name=role_name).first():
                role = UserRole(name=role_name, description=f"{role_name} role")
                db.session.add(role)
        db.session.commit()
    yield app
    with app.app_context():
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='function')
def client(app):
    """Fixture for the Flask test client."""
    with app.test_client() as client:
        yield client

@pytest.fixture(scope='function')
def db_session(app):
    """Fixture for a database session, rolling back after each test."""
    with app.app_context():
        connection = db.engine.connect()
        transaction = connection.begin()
        db.session.begin_nested() # Start a nested transaction
        yield db.session
        db.session.remove() # Remove session from current thread
        transaction.rollback() # Rollback the entire transaction
        connection.close()

@pytest.fixture(scope='function')
def admin_user(db_session):
    """Fixture for an admin user."""
    admin_role = UserRole.query.filter_by(name='ADMIN').first()
    user = User(
        username='admin_test',
        email='admin_test@example.com',
        password_hash=bcrypt.generate_password_hash('adminpass').decode('utf-8'),
        roles=[admin_role]
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture(scope='function')
def editor_user(db_session):
    """Fixture for an editor user."""
    editor_role = UserRole.query.filter_by(name='EDITOR').first()
    user = User(
        username='editor_test',
        email='editor_test@example.com',
        password_hash=bcrypt.generate_password_hash('editorpass').decode('utf-8'),
        roles=[editor_role]
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture(scope='function')
def customer_user(db_session):
    """Fixture for a customer user."""
    customer_role = UserRole.query.filter_by(name='CUSTOMER').first()
    user = User(
        username='customer_test',
        email='customer_test@example.com',
        password_hash=bcrypt.generate_password_hash('customerpass').decode('utf-8'),
        roles=[customer_role]
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture(scope='function')
def auth_tokens(app, customer_user):
    """Fixture for customer user authentication tokens."""
    with app.app_context():
        claims = {
            "roles": [role.name for role in customer_user.roles],
            "email": customer_user.email
        }
        access_token = create_access_token(identity=customer_user.id, additional_claims=claims)
        refresh_token = create_refresh_token(identity=customer_user.id, additional_claims=claims)
        return {'access_token': access_token, 'refresh_token': refresh_token}

@pytest.fixture(scope='function')
def admin_auth_tokens(app, admin_user):
    """Fixture for admin user authentication tokens."""
    with app.app_context():
        claims = {
            "roles": [role.name for role in admin_user.roles],
            "email": admin_user.email
        }
        access_token = create_access_token(identity=admin_user.id, additional_claims=claims)
        refresh_token = create_refresh_token(identity=admin_user.id, additional_claims=claims)
        return {'access_token': access_token, 'refresh_token': refresh_token}

@pytest.fixture(scope='function')
def test_category(db_session):
    category = Category(name="Test Category", slug="test-category", description="A category for testing")
    db_session.add(category)
    db_session.commit()
    return category

@pytest.fixture(scope='function')
def test_product(db_session, test_category):
    product = Product(
        name="Test Product",
        slug="test-product-123",
        description="A product for testing purposes",
        price=99.99,
        stock_quantity=10,
        category_id=test_category.id
    )
    db_session.add(product)
    db_session.commit()
    return product

@pytest.fixture(scope='function')
def test_order(db_session, customer_user, test_product):
    order = Order(
        user_id=customer_user.id,
        shipping_address="123 Test St, Test City",
        billing_address="123 Test St, Test City",
        status=OrderStatus.PENDING,
        total_amount=test_product.price * 2,
        order_date=datetime.datetime.utcnow()
    )
    db_session.add(order)
    db_session.flush() # To get order.id

    order_item = OrderItem(
        order_id=order.id,
        product_id=test_product.id,
        quantity=2,
        price_at_purchase=test_product.price
    )
    db_session.add(order_item)
    db_session.commit()
    order.items.append(order_item) # Add to relationship
    db_session.add(order)
    db_session.commit()
    return order