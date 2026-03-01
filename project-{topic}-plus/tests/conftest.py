```python
import pytest
from app import create_app, db, cache
from app.models import User, Category, Product, Cart, CartItem, Order, OrderItem, UserRole, OrderStatus
import uuid
from decimal import Decimal

@pytest.fixture(scope='session')
def app():
    """Create and configure a new app instance for each test session."""
    app = create_app('testing')
    with app.app_context():
        # Re-initialize the cache for testing to ensure isolation
        cache.clear()
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='function')
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture(scope='function')
def runner(app):
    """A cli runner for the app."""
    return app.test_cli_runner()

@pytest.fixture(scope='function')
def db_session(app):
    """Provide a clean database session for each test function."""
    with app.app_context():
        # Before each test, clear data
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(table.delete())
        db.session.commit()

        # Re-initialize the cache for testing to ensure isolation
        cache.clear()

        yield db.session

        # After each test, rollback any changes to ensure a clean state for the next test
        db.session.rollback()

@pytest.fixture
def test_users(db_session):
    """Create test users and their carts."""
    admin_user = User(id=uuid.uuid4(), username='admin_test', email='admin_test@example.com', role=UserRole.ADMIN)
    admin_user.password = 'adminpass'
    db_session.add(admin_user)

    customer_user = User(id=uuid.uuid4(), username='customer_test', email='customer_test@example.com', role=UserRole.CUSTOMER)
    customer_user.password = 'customerpass'
    db_session.add(customer_user)

    another_customer = User(id=uuid.uuid4(), username='another_customer', email='another@example.com', role=UserRole.CUSTOMER)
    another_customer.password = 'anotherpass'
    db_session.add(another_customer)

    db_session.flush() # To get user IDs

    admin_cart = Cart(user_id=admin_user.id)
    customer_cart = Cart(user_id=customer_user.id)
    another_cart = Cart(user_id=another_customer.id)
    db_session.add_all([admin_cart, customer_cart, another_cart])
    db_session.commit()

    return {
        'admin': admin_user,
        'customer': customer_user,
        'another_customer': another_customer,
    }

@pytest.fixture
def auth_tokens(client, test_users):
    """Provide JWT tokens for test users."""
    tokens = {}
    for role, user in test_users.items():
        if role != 'another_customer': # Only generate for admin and customer for simplicity
            response = client.post('/api/auth/login', json={'email': user.email, 'password': f'{role}pass'})
            assert response.status_code == 200
            data = response.get_json()
            tokens[role] = data['access_token']
    return tokens

@pytest.fixture
def test_categories(db_session):
    """Create test categories."""
    electronics = Category(id=uuid.uuid4(), name='Electronics', slug='electronics', description='Electronic gadgets')
    clothing = Category(id=uuid.uuid4(), name='Clothing', slug='clothing', description='Wearable items')
    db_session.add_all([electronics, clothing])
    db_session.commit()
    return {
        'electronics': electronics,
        'clothing': clothing
    }

@pytest.fixture
def test_products(db_session, test_categories):
    """Create test products."""
    product1 = Product(
        id=uuid.uuid4(),
        name='Test Smartphone',
        slug='test-smartphone',
        description='A great test smartphone',
        price=Decimal('500.00'),
        stock=10,
        category_id=test_categories['electronics'].id
    )
    product2 = Product(
        id=uuid.uuid4(),
        name='Test T-Shirt',
        slug='test-t-shirt',
        description='A comfortable test t-shirt',
        price=Decimal('25.00'),
        stock=20,
        category_id=test_categories['clothing'].id
    )
    db_session.add_all([product1, product2])
    db_session.commit()
    return {
        'smartphone': product1,
        'tshirt': product2
    }

@pytest.fixture
def customer_cart_with_items(db_session, test_users, test_products):
    """Populate customer's cart with items."""
    customer = test_users['customer']
    cart = Cart.query.filter_by(user_id=customer.id).first()
    
    cart_item1 = CartItem(cart_id=cart.id, product_id=test_products['smartphone'].id, quantity=1)
    cart_item2 = CartItem(cart_id=cart.id, product_id=test_products['tshirt'].id, quantity=2)
    db_session.add_all([cart_item1, cart_item2])
    db_session.commit()
    return cart

@pytest.fixture
def seeded_order(db_session, test_users, test_products):
    """Create a seeded order for testing order-specific actions."""
    customer = test_users['customer']
    order = Order(
        id=uuid.uuid4(),
        user_id=customer.id,
        total_amount=Decimal('550.00'),
        status=OrderStatus.PENDING,
        shipping_address="123 Test St, Test City"
    )
    db_session.add(order)
    db_session.flush() # to get order ID

    order_item1 = OrderItem(
        order_id=order.id,
        product_id=test_products['smartphone'].id,
        quantity=1,
        price=test_products['smartphone'].price
    )
    order_item2 = OrderItem(
        order_id=order.id,
        product_id=test_products['tshirt'].id,
        quantity=2,
        price=test_products['tshirt'].price
    )
    db_session.add_all([order_item1, order_item2])
    db_session.commit()
    return order
```