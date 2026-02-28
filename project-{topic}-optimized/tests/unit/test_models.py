import pytest
import datetime
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatus
from app.extensions import bcrypt

def test_user_creation(db_session):
    role = UserRole(name='CUSTOMER')
    db_session.add(role)
    db_session.commit()

    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    user.roles.append(role)
    db_session.add(user)
    db_session.commit()

    assert user.id is not None
    assert user.username == 'testuser'
    assert user.email == 'test@example.com'
    assert user.check_password('password123')
    assert user.is_active is True
    assert user.created_at is not None
    assert user.updated_at is not None
    assert user.has_role('CUSTOMER')
    assert not user.has_role('ADMIN')

def test_user_password_hashing():
    user = User(username='hashuser', email='hash@example.com')
    user.set_password('securepassword')
    assert bcrypt.check_password_hash(user.password_hash, 'securepassword')
    assert not bcrypt.check_password_hash(user.password_hash, 'wrongpassword')

def test_unique_user_constraints(db_session):
    user1 = User(username='uniqueuser', email='unique@example.com')
    user1.set_password('pass')
    db_session.add(user1)
    db_session.commit()

    with pytest.raises(Exception): # Expecting IntegrityError or similar
        user2 = User(username='uniqueuser', email='another@example.com')
        user2.set_password('pass')
        db_session.add(user2)
        db_session.commit() # This will fail
    db_session.rollback() # Rollback the failed transaction

    with pytest.raises(Exception): # Expecting IntegrityError or similar
        user3 = User(username='another', email='unique@example.com')
        user3.set_password('pass')
        db_session.add(user3)
        db_session.commit() # This will fail
    db_session.rollback()

def test_category_creation(db_session):
    category = Category(name='Electronics', slug='electronics', description='Electronic devices')
    db_session.add(category)
    db_session.commit()

    assert category.id is not None
    assert category.name == 'Electronics'
    assert category.slug == 'electronics'
    assert category.is_active is True
    assert category.created_at is not None

def test_product_creation(db_session, test_category):
    product = Product(
        name='Laptop',
        slug='laptop-pro-1',
        description='Powerful laptop',
        price=1200.00,
        stock_quantity=10,
        category_id=test_category.id
    )
    db_session.add(product)
    db_session.commit()

    assert product.id is not None
    assert product.name == 'Laptop'
    assert product.price == 1200.00
    assert product.stock_quantity == 10
    assert product.category_id == test_category.id
    assert product.category.name == 'Test Category'

def test_order_creation(db_session, customer_user, test_product):
    order = Order(
        user_id=customer_user.id,
        shipping_address='123 Main St',
        total_amount=test_product.price * 2
    )
    db_session.add(order)
    db_session.flush() # Assign ID

    order_item = OrderItem(
        order_id=order.id,
        product_id=test_product.id,
        quantity=2,
        price_at_purchase=test_product.price
    )
    db_session.add(order_item)
    db_session.commit()

    assert order.id is not None
    assert order.user_id == customer_user.id
    assert order.shipping_address == '123 Main St'
    assert order.status == OrderStatus.PENDING
    assert order.total_amount == 199.98
    assert len(order.items) == 1
    assert order.items[0].product_id == test_product.id
    assert order.items[0].quantity == 2
    assert order.items[0].price_at_purchase == test_product.price