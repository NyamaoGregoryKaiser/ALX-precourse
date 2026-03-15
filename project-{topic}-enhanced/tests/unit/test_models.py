import pytest
from app.models import User, Category, Product, Cart, CartItem, Order, OrderItem
from app import db, bcrypt
from datetime import datetime
from decimal import Decimal

def test_user_model(db_session):
    user = User(username='testuser', email='test@example.com', password='password123')
    db_session.add(user)
    db_session.commit()

    retrieved_user = User.query.filter_by(email='test@example.com').first()
    assert retrieved_user is not None
    assert retrieved_user.username == 'testuser'
    assert retrieved_user.check_password('password123')
    assert retrieved_user.role == 'customer'
    assert retrieved_user.is_active is True

    # Test password change
    retrieved_user.password_hash = retrieved_user.set_password('new_password')
    db_session.commit()
    assert retrieved_user.check_password('new_password')
    assert not retrieved_user.check_password('password123')

    # Test token generation
    tokens = retrieved_user.generate_tokens()
    assert 'access_token' in tokens
    assert 'refresh_token' in tokens

def test_category_model(db_session):
    category = Category(name='Electronics', slug='electronics', description='Gadgets')
    db_session.add(category)
    db_session.commit()

    retrieved_category = Category.query.filter_by(name='Electronics').first()
    assert retrieved_category is not None
    assert retrieved_category.slug == 'electronics'

def test_product_model(db_session):
    category = Category(name='Books', slug='books')
    db_session.add(category)
    db_session.flush() # Commit to get category.id

    product = Product(name='Fantasy Book', slug='fantasy-book', price=Decimal('19.99'), stock_quantity=100, category_id=category.id)
    db_session.add(product)
    db_session.commit()

    retrieved_product = Product.query.filter_by(name='Fantasy Book').first()
    assert retrieved_product is not None
    assert retrieved_product.price == Decimal('19.99')
    assert retrieved_product.stock_quantity == 100
    assert retrieved_product.category.name == 'Books'

def test_cart_and_cart_item_models(db_session):
    user = User(username='cart_user', email='cart@example.com', password='password')
    category = Category(name='Tools', slug='tools')
    db_session.add_all([user, category])
    db_session.flush()

    product = Product(name='Hammer', slug='hammer', price=Decimal('15.00'), stock_quantity=50, category_id=category.id)
    db_session.add(product)
    db_session.flush()

    cart = Cart(user_id=user.id)
    db_session.add(cart)
    db_session.flush()

    cart_item = CartItem(cart_id=cart.id, product_id=product.id, quantity=2, price_at_addition=product.price)
    db_session.add(cart_item)
    db_session.commit()

    retrieved_cart = Cart.query.filter_by(user_id=user.id).first()
    assert retrieved_cart is not None
    assert len(retrieved_cart.items) == 1
    assert retrieved_cart.items[0].product.name == 'Hammer'
    assert retrieved_cart.items[0].quantity == 2
    assert retrieved_cart.items[0].price_at_addition == Decimal('15.00')

def test_order_and_order_item_models(db_session):
    user = User(username='order_user', email='order@example.com', password='password')
    category = Category(name='Clothes', slug='clothes')
    db_session.add_all([user, category])
    db_session.flush()

    product = Product(name='T-Shirt', slug='t-shirt', price=Decimal('20.00'), stock_quantity=30, category_id=category.id)
    db_session.add(product)
    db_session.flush()

    order = Order(user_id=user.id, total_amount=Decimal('40.00'), shipping_address='123 Main St')
    db_session.add(order)
    db_session.flush()

    order_item = OrderItem(order_id=order.id, product_id=product.id, quantity=2, price_at_purchase=product.price)
    db_session.add(order_item)
    db_session.commit()

    retrieved_order = Order.query.filter_by(user_id=user.id).first()
    assert retrieved_order is not None
    assert retrieved_order.total_amount == Decimal('40.00')
    assert retrieved_order.status == 'pending'
    assert len(retrieved_order.items) == 1
    assert retrieved_order.items[0].product.name == 'T-Shirt'
    assert retrieved_order.items[0].quantity == 2
    assert retrieved_order.items[0].price_at_purchase == Decimal('20.00')