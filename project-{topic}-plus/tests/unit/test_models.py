```python
from app.models import User, Category, Product, Cart, CartItem, Order, OrderItem, UserRole, OrderStatus
from app import db, bcrypt
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

def test_user_model(db_session):
    user = User(id=uuid.uuid4(), username='testuser', email='test@example.com', role=UserRole.CUSTOMER)
    user.password = 'mysecretpassword'
    db_session.add(user)
    db_session.commit()

    retrieved_user = User.query.filter_by(email='test@example.com').first()
    assert retrieved_user is not None
    assert retrieved_user.username == 'testuser'
    assert retrieved_user.email == 'test@example.com'
    assert retrieved_user.role == UserRole.CUSTOMER
    assert bcrypt.check_password_hash(retrieved_user._password, 'mysecretpassword')
    assert retrieved_user.check_password('mysecretpassword')
    assert not retrieved_user.check_password('wrongpassword')
    assert retrieved_user.created_at is not None
    assert retrieved_user.updated_at is not None

def test_category_model(db_session):
    category = Category(id=uuid.uuid4(), name='Electronics', slug='electronics', description='Electronic devices')
    db_session.add(category)
    db_session.commit()

    retrieved_category = Category.query.filter_by(name='Electronics').first()
    assert retrieved_category is not None
    assert retrieved_category.slug == 'electronics'

def test_product_model(db_session, test_categories):
    electronics_category = test_categories['electronics']
    product = Product(
        id=uuid.uuid4(),
        name='Laptop',
        slug='laptop',
        description='Powerful laptop for work and gaming',
        price=Decimal('1200.00'),
        stock=15,
        category_id=electronics_category.id
    )
    db_session.add(product)
    db_session.commit()

    retrieved_product = Product.query.filter_by(name='Laptop').first()
    assert retrieved_product is not None
    assert retrieved_product.price == Decimal('1200.00')
    assert retrieved_product.stock == 15
    assert retrieved_product.category.name == 'Electronics'

def test_cart_and_cart_item_models(db_session, test_users, test_products):
    customer = test_users['customer']
    smartphone = test_products['smartphone']

    cart = Cart.query.filter_by(user_id=customer.id).first()
    assert cart is not None

    cart_item = CartItem(cart_id=cart.id, product_id=smartphone.id, quantity=2)
    db_session.add(cart_item)
    db_session.commit()

    retrieved_cart_item = CartItem.query.filter_by(cart_id=cart.id).first()
    assert retrieved_cart_item is not None
    assert retrieved_cart_item.product_id == smartphone.id
    assert retrieved_cart_item.quantity == 2
    assert retrieved_cart_item.product.name == 'Test Smartphone'
    assert cart.items[0] == retrieved_cart_item

def test_order_and_order_item_models(db_session, test_users, test_products):
    customer = test_users['customer']
    smartphone = test_products['smartphone']
    tshirt = test_products['tshirt']

    order = Order(
        id=uuid.uuid4(),
        user_id=customer.id,
        total_amount=Decimal('550.00'),
        status=OrderStatus.PENDING,
        shipping_address='123 Main St, Anytown'
    )
    db_session.add(order)
    db_session.flush() # To get order ID

    order_item1 = OrderItem(order_id=order.id, product_id=smartphone.id, quantity=1, price=smartphone.price)
    order_item2 = OrderItem(order_id=order.id, product_id=tshirt.id, quantity=2, price=tshirt.price)
    db_session.add_all([order_item1, order_item2])
    db_session.commit()

    retrieved_order = Order.query.get(order.id)
    assert retrieved_order is not None
    assert retrieved_order.user.username == 'customer_test'
    assert retrieved_order.total_amount == Decimal('550.00')
    assert len(retrieved_order.items) == 2
    assert retrieved_order.items[0].product.name == 'Test Smartphone'
    assert retrieved_order.items[1].quantity == 2
    assert retrieved_order.items[1].price == tshirt.price

def test_user_role_enum():
    assert UserRole.ADMIN.value == "admin"
    assert UserRole.CUSTOMER.value == "customer"

def test_order_status_enum():
    assert OrderStatus.PENDING.value == "pending"
    assert OrderStatus.DELIVERED.value == "delivered"
```