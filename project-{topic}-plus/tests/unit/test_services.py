```python
import pytest
from decimal import Decimal
import uuid

from app.services.user_service import UserService
from app.services.product_service import ProductService, CategoryService
from app.services.order_service import OrderService
from app.models import User, Category, Product, Cart, CartItem, Order, OrderStatus
from app import db, cache

def test_user_service_create_user(db_session):
    user_data = UserService.create_user('newuser', 'new@example.com', 'securepass')
    assert user_data is not None
    assert user_data['username'] == 'newuser'
    assert user_data['email'] == 'new@example.com'
    assert User.query.filter_by(email='new@example.com').first() is not None
    assert Cart.query.filter_by(user_id=user_data['id']).first() is not None

    with pytest.raises(ValueError, match="A user with this email already exists."):
        UserService.create_user('another', 'new@example.com', 'password')
    
    with pytest.raises(ValueError, match="A user with this username already exists."):
        UserService.create_user('newuser', 'another@example.com', 'password')

def test_user_service_get_user(db_session, test_users):
    customer = test_users['customer']
    retrieved_user = UserService.get_user_by_id(customer.id)
    assert retrieved_user['id'] == str(customer.id)

    retrieved_user_by_email = UserService.get_user_by_email(customer.email)
    assert retrieved_user_by_email['id'] == str(customer.id)

    assert UserService.get_user_by_id(uuid.uuid4()) is None

def test_user_service_verify_user(db_session, test_users):
    customer = test_users['customer']
    verified_user = UserService.verify_user(customer.email, 'customerpass')
    assert verified_user['id'] == str(customer.id)

    assert UserService.verify_user(customer.email, 'wrongpass') is None
    assert UserService.verify_user('nonexistent@example.com', 'password') is None

def test_user_service_update_user_profile(db_session, test_users):
    customer = test_users['customer']
    updated_data = {'username': 'updated_user', 'email': 'updated@example.com'}
    updated_user = UserService.update_user_profile(customer.id, updated_data)

    assert updated_user['username'] == 'updated_user'
    assert updated_user['email'] == 'updated@example.com'
    assert User.query.get(customer.id).username == 'updated_user'

    with pytest.raises(ValueError, match="Email already in use."):
        UserService.update_user_profile(test_users['another_customer'].id, {'email': updated_data['email']})

def test_user_service_delete_user(db_session, test_users):
    customer = test_users['customer']
    user_id = customer.id
    
    # Ensure cart exists for cascade test
    cart = Cart.query.filter_by(user_id=user_id).first()
    assert cart is not None

    assert UserService.delete_user(user_id) is True
    assert User.query.get(user_id) is None
    assert Cart.query.filter_by(user_id=user_id).first() is None # Verify cascade delete of cart

    assert UserService.delete_user(uuid.uuid4()) is False # Non-existent user

def test_category_service_create_category(db_session):
    category_data = {'name': 'New Category', 'description': 'Description for new category'}
    new_category = CategoryService.create_category(category_data)
    assert new_category['name'] == 'New Category'
    assert new_category['slug'] == 'new-category'
    assert Category.query.filter_by(name='New Category').first() is not None

    with pytest.raises(ValueError, match="A category with this name already exists."):
        CategoryService.create_category(category_data)

def test_category_service_get_categories(db_session, test_categories):
    all_categories = CategoryService.get_all_categories()
    assert len(all_categories) == 2
    assert test_categories['electronics'].name in [c['name'] for c in all_categories]

    category_by_id = CategoryService.get_category_by_id(test_categories['electronics'].id)
    assert category_by_id['name'] == 'Electronics'

    category_by_slug = CategoryService.get_category_by_slug('electronics')
    assert category_by_slug['name'] == 'Electronics'

def test_category_service_update_category(db_session, test_categories):
    category = test_categories['electronics']
    updated_data = {'name': 'Updated Electronics', 'description': 'New description'}
    updated_category = CategoryService.update_category(category.id, updated_data)
    assert updated_category['name'] == 'Updated Electronics'
    assert updated_category['slug'] == 'updated-electronics'
    assert Category.query.get(category.id).description == 'New description'

def test_category_service_delete_category(db_session, test_categories, test_products):
    clothing_category = test_categories['clothing']
    electronics_category = test_categories['electronics']
    
    # Can delete category with no products
    assert CategoryService.delete_category(clothing_category.id) is True
    assert Category.query.get(clothing_category.id) is None

    # Cannot delete category with products
    with pytest.raises(ValueError, match="Cannot delete category with associated products."):
        CategoryService.delete_category(electronics_category.id)

def test_product_service_create_product(db_session, test_categories):
    electronics_id = test_categories['electronics'].id
    product_data = {
        'name': 'New Gadget',
        'description': 'A shiny new gadget',
        'price': Decimal('99.99'),
        'stock': 100,
        'category_id': electronics_id
    }
    new_product = ProductService.create_product(product_data)
    assert new_product['name'] == 'New Gadget'
    assert new_product['slug'] == 'new-gadget'
    assert Product.query.filter_by(name='New Gadget').first() is not None

    with pytest.raises(ValueError, match="Category not found."):
        ProductService.create_product({**product_data, 'name': 'Invalid Product', 'category_id': uuid.uuid4()})

def test_product_service_get_products(db_session, test_products, test_categories):
    all_products = ProductService.get_all_products()
    assert all_products['total_items'] == 2

    filtered_products = ProductService.get_all_products(category_id=test_categories['electronics'].id)
    assert filtered_products['total_items'] == 1
    assert filtered_products['products'][0]['name'] == 'Test Smartphone'

    searched_products = ProductService.get_all_products(search='smartphone')
    assert searched_products['total_items'] == 1
    assert searched_products['products'][0]['name'] == 'Test Smartphone'

    product_by_id = ProductService.get_product_by_id(test_products['smartphone'].id)
    assert product_by_id['name'] == 'Test Smartphone'

    product_by_slug = ProductService.get_product_by_slug('test-smartphone')
    assert product_by_slug['name'] == 'Test Smartphone'

def test_product_service_update_product(db_session, test_products):
    smartphone = test_products['smartphone']
    updated_data = {'name': 'Super Smartphone', 'price': Decimal('600.00')}
    updated_product = ProductService.update_product(smartphone.id, updated_data)
    assert updated_product['name'] == 'Super Smartphone'
    assert updated_product['price'] == '600.00' # Marshmallow converts Decimal to string
    assert Product.query.get(smartphone.id).slug == 'super-smartphone'

def test_product_service_delete_product(db_session, test_products):
    smartphone_id = test_products['smartphone'].id
    assert ProductService.delete_product(smartphone_id) is True
    assert Product.query.get(smartphone_id) is None

def test_product_service_update_product_stock(db_session, test_products):
    smartphone = test_products['smartphone']
    initial_stock = smartphone.stock

    # Decrement stock
    updated_product = ProductService.update_product_stock(smartphone.id, 5, decrement=True)
    assert updated_product['stock'] == initial_stock - 5
    assert Product.query.get(smartphone.id).stock == initial_stock - 5

    # Increment stock
    updated_product = ProductService.update_product_stock(smartphone.id, 3, decrement=False)
    assert updated_product['stock'] == initial_stock - 5 + 3
    assert Product.query.get(smartphone.id).stock == initial_stock - 5 + 3

    # Insufficient stock
    with pytest.raises(ValueError, match="Not enough stock available."):
        ProductService.update_product_stock(smartphone.id, 100, decrement=True)

def test_order_service_create_order_from_cart(db_session, test_users, customer_cart_with_items, test_products):
    customer = test_users['customer']
    initial_smartphone_stock = test_products['smartphone'].stock
    initial_tshirt_stock = test_products['tshirt'].stock

    order = OrderService.create_order_from_cart(customer.id, "123 Order Lane")
    assert order is not None
    assert order['total_amount'] == '550.00' # 1*500 + 2*25
    assert order['status'] == OrderStatus.PENDING.value
    assert len(order['items']) == 2

    # Verify cart is empty
    customer_cart = Cart.query.filter_by(user_id=customer.id).first()
    assert len(customer_cart.items) == 0

    # Verify stock update
    assert Product.query.get(test_products['smartphone'].id).stock == initial_smartphone_stock - 1
    assert Product.query.get(test_products['tshirt'].id).stock == initial_tshirt_stock - 2

    # Test empty cart scenario
    with pytest.raises(ValueError, match="Cart is empty or not found."):
        OrderService.create_order_from_cart(customer.id, "Another Address")

def test_order_service_get_orders(db_session, test_users, seeded_order):
    customer = test_users['customer']
    
    # Get user's orders
    user_orders = OrderService.get_user_orders(customer.id)
    assert len(user_orders) == 1
    assert user_orders[0]['id'] == str(seeded_order.id)

    # Get single order by ID
    single_order = OrderService.get_order_by_id(seeded_order.id)
    assert single_order['id'] == str(seeded_order.id)

    # Get all orders (admin view)
    all_orders = OrderService.get_all_orders()
    assert all_orders['total_items'] == 1
    assert all_orders['orders'][0]['id'] == str(seeded_order.id)

def test_order_service_update_order_status(db_session, seeded_order):
    updated_order = OrderService.update_order_status(seeded_order.id, OrderStatus.PROCESSING)
    assert updated_order['status'] == OrderStatus.PROCESSING.value
    assert Order.query.get(seeded_order.id).status == OrderStatus.PROCESSING

    with pytest.raises(ValueError, match="Invalid order status: invalid_status"):
        OrderService.update_order_status(seeded_order.id, "invalid_status")

    assert OrderService.update_order_status(uuid.uuid4(), OrderStatus.SHIPPED) is None

def test_order_service_cancel_order(db_session, test_products, seeded_order):
    initial_smartphone_stock = test_products['smartphone'].stock
    initial_tshirt_stock = test_products['tshirt'].stock

    # Cancel a pending order
    assert OrderService.cancel_order(seeded_order.id) is True
    cancelled_order = Order.query.get(seeded_order.id)
    assert cancelled_order.status == OrderStatus.CANCELLED

    # Verify stock is returned
    assert Product.query.get(test_products['smartphone'].id).stock == initial_smartphone_stock + 1
    assert Product.query.get(test_products['tshirt'].id).stock == initial_tshirt_stock + 2

    # Try to cancel an already cancelled order
    with pytest.raises(ValueError, match="Order .* cannot be cancelled as its status is cancelled."):
        OrderService.cancel_order(seeded_order.id)
```