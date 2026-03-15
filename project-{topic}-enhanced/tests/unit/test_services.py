import pytest
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.services.product_service import ProductService
from app.services.cart_service import CartService
from app.services.order_service import OrderService
from app.models import User, Category, Product, Cart, CartItem, Order, OrderItem
from app.utils.errors import UnauthorizedError, BadRequestError, NotFoundError, ConflictError
from app import db
from decimal import Decimal
import datetime

# --- AuthService Tests ---

def test_register_user_success(db_session):
    user = AuthService.register_user('newuser', 'new@example.com', 'password')
    assert user.id is not None
    assert user.username == 'newuser'
    assert user.email == 'new@example.com'
    assert user.check_password('password')
    assert user.role == 'customer'
    # Check if a cart was created for the new user
    cart = Cart.query.filter_by(user_id=user.id).first()
    assert cart is not None

def test_register_user_duplicate_username(db_session):
    AuthService.register_user('existinguser', 'email1@example.com', 'password')
    with pytest.raises(ConflictError, match="Username already taken."):
        AuthService.register_user('existinguser', 'email2@example.com', 'password')

def test_register_user_duplicate_email(db_session):
    AuthService.register_user('user1', 'existing@example.com', 'password')
    with pytest.raises(ConflictError, match="Email already registered."):
        AuthService.register_user('user2', 'existing@example.com', 'password')

def test_authenticate_user_success(db_session):
    user = AuthService.register_user('loginuser', 'login@example.com', 'correctpassword')
    authenticated_user = AuthService.authenticate_user('login@example.com', 'correctpassword')
    assert authenticated_user.id == user.id

def test_authenticate_user_invalid_password(db_session):
    AuthService.register_user('invaliduser', 'invalid@example.com', 'correctpassword')
    with pytest.raises(UnauthorizedError, match="Invalid credentials."):
        AuthService.authenticate_user('invalid@example.com', 'wrongpassword')

def test_authenticate_user_not_found(db_session):
    with pytest.raises(UnauthorizedError, match="Invalid credentials."):
        AuthService.authenticate_user('nonexistent@example.com', 'password')

# --- UserService Tests ---

def test_get_all_users(db_session, app):
    # Already seeded with admin, testuser1, testuser2
    users = UserService.get_all_users()
    assert len(users) >= 3 # Ensure initial seed data is present

def test_get_user_by_id_success(db_session, app):
    user = User.query.filter_by(username='testuser1').first()
    retrieved_user = UserService.get_user_by_id(user.id)
    assert retrieved_user.username == 'testuser1'

def test_get_user_by_id_not_found(db_session):
    with pytest.raises(NotFoundError):
        UserService.get_user_by_id(9999)

def test_create_user_success(db_session):
    user = UserService.create_user('new_create_user', 'create@example.com', 'password')
    assert user.id is not None
    assert user.username == 'new_create_user'
    cart = Cart.query.filter_by(user_id=user.id).first()
    assert cart is not None

def test_create_user_duplicate(db_session):
    UserService.create_user('dupuser', 'dup@example.com', 'password')
    with pytest.raises(ConflictError):
        UserService.create_user('dupuser', 'another@example.com', 'password')
    with pytest.raises(ConflictError):
        UserService.create_user('anotheruser', 'dup@example.com', 'password')

def test_update_user_success(db_session, app):
    user = User.query.filter_by(username='testuser1').first()
    updated_user = UserService.update_user(user.id, {'username': 'updateduser', 'email': 'updated@example.com'})
    assert updated_user.username == 'updateduser'
    assert updated_user.email == 'updated@example.com'

def test_update_user_password(db_session, app):
    user = User.query.filter_by(username='testuser1').first()
    updated_user = UserService.update_user(user.id, {'password': 'newpassword'})
    assert updated_user.check_password('newpassword')

def test_update_user_duplicate_username(db_session, app):
    user1 = User.query.filter_by(username='testuser1').first()
    user2 = User.query.filter_by(username='testuser2').first()
    with pytest.raises(ConflictError):
        UserService.update_user(user1.id, {'username': user2.username})

def test_delete_user_success(db_session, app):
    user = User.query.filter_by(username='testuser2').first()
    UserService.delete_user(user.id)
    with pytest.raises(NotFoundError):
        UserService.get_user_by_id(user.id)
    # Check if cart is also deleted (due to cascade)
    assert Cart.query.filter_by(user_id=user.id).first() is None

# --- ProductService Tests ---

def test_get_all_products(db_session, app):
    products = ProductService.get_all_products()
    assert len(products) >= 2 # p1 and p3 from seed data (p2 is inactive)

def test_get_all_products_by_category(db_session, app):
    cat1 = Category.query.filter_by(slug='electronics').first()
    products = ProductService.get_all_products(category_id=cat1.id)
    assert len(products) == 1 # Only p1 is active in Electronics

def test_get_all_products_search(db_session, app):
    products = ProductService.get_all_products(search_term='laptop')
    assert len(products) == 1
    assert products[0].name == 'Laptop Pro'

def test_get_product_by_id_success(db_session, app):
    p1 = Product.query.filter_by(slug='laptop-pro').first()
    product = ProductService.get_product_by_id(p1.id)
    assert product.name == 'Laptop Pro'

def test_get_product_by_id_not_found(db_session):
    with pytest.raises(NotFoundError):
        ProductService.get_product_by_id(9999)

def test_get_product_by_id_inactive(db_session, app):
    p2 = Product.query.filter_by(slug='smartphone-x').first()
    with pytest.raises(NotFoundError):
        ProductService.get_product_by_id(p2.id)

def test_create_product_success(db_session, app):
    cat = Category.query.filter_by(slug='books').first()
    product = ProductService.create_product('New Book', 'new-book', Decimal('30.00'), 50, cat.id)
    assert product.id is not None
    assert product.name == 'New Book'

def test_create_product_duplicate_slug(db_session, app):
    cat = Category.query.filter_by(slug='books').first()
    ProductService.create_product('Another Book', 'duplicate-book', Decimal('10.00'), 10, cat.id)
    with pytest.raises(ConflictError, match="slug 'duplicate-book' already exists."):
        ProductService.create_product('Yet Another Book', 'duplicate-book', Decimal('12.00'), 10, cat.id)

def test_update_product_success(db_session, app):
    p1 = Product.query.filter_by(slug='laptop-pro').first()
    updated_product = ProductService.update_product(p1.id, {'price': Decimal('1300.00'), 'stock_quantity': 5})
    assert updated_product.price == Decimal('1300.00')
    assert updated_product.stock_quantity == 5

def test_delete_product_success(db_session, app):
    p3 = Product.query.filter_by(slug='great-novel').first()
    ProductService.delete_product(p3.id)
    with pytest.raises(NotFoundError):
        ProductService.get_product_by_id(p3.id)

def test_get_all_categories(db_session, app):
    categories = ProductService.get_all_categories()
    assert len(categories) >= 2

def test_create_category_success(db_session):
    cat = ProductService.create_category('New Category', 'new-category')
    assert cat.id is not None
    assert cat.name == 'New Category'

def test_delete_category_with_products_fails(db_session, app):
    cat1 = Category.query.filter_by(slug='electronics').first()
    with pytest.raises(BadRequestError, match="Cannot delete category with associated products."):
        ProductService.delete_category(cat1.id)

# --- CartService Tests ---

def test_get_or_create_cart(db_session, app):
    user = User.query.filter_by(username='testuser1').first()
    cart = CartService.get_or_create_cart(user.id)
    assert cart is not None
    assert cart.user_id == user.id

    # Should return existing cart for the same user
    another_cart_instance = CartService.get_or_create_cart(user.id)
    assert another_cart_instance.id == cart.id

def test_add_to_cart_new_item(db_session, app):
    user = User.query.filter_by(username='testuser2').first()
    product = Product.query.filter_by(slug='laptop-pro').first()
    
    cart_item = CartService.add_to_cart(user.id, product.id, quantity=3)
    assert cart_item.product_id == product.id
    assert cart_item.quantity == 3
    assert cart_item.cart.user_id == user.id

def test_add_to_cart_update_quantity(db_session, app):
    user = User.query.filter_by(username='testuser1').first()
    product = Product.query.filter_by(slug='laptop-pro').first() # In cart with quantity 2
    
    cart_item = CartService.add_to_cart(user.id, product.id, quantity=1)
    assert cart_item.quantity == 3 # 2 (initial) + 1 (added)

def test_add_to_cart_exceeds_stock(db_session, app):
    user = User.query.filter_by(username='testuser2').first()
    product = Product.query.filter_by(slug='laptop-pro').first() # Stock: 10
    
    with pytest.raises(BadRequestError, match="Not enough stock"):
        CartService.add_to_cart(user.id, product.id, quantity=15) # Should fail

def test_update_cart_item_quantity_success(db_session, app):
    user = User.query.filter_by(username='testuser1').first()
    product_laptop = Product.query.filter_by(slug='laptop-pro').first() # In cart, qty 2
    
    updated_item = CartService.update_cart_item_quantity(user.id, product_laptop.id, 5)
    assert updated_item.quantity == 5

def test_update_cart_item_quantity_remove(db_session, app):
    user = User.query.filter_by(username='testuser1').first()
    product_laptop = Product.query.filter_by(slug='laptop-pro').first() # In cart, qty 2
    
    CartService.update_cart_item_quantity(user.id, product_laptop.id, 0)
    cart = Cart.query.filter_by(user_id=user.id).first()
    assert not any(item.product_id == product_laptop.id for item in cart.items)

def test_remove_from_cart_success(db_session, app):
    user = User.query.filter_by(username='testuser1').first()
    product_laptop = Product.query.filter_by(slug='laptop-pro').first() # In cart, qty 2
    
    CartService.remove_from_cart(user.id, product_laptop.id)
    cart = Cart.query.filter_by(user_id=user.id).first()
    assert not any(item.product_id == product_laptop.id for item in cart.items)

def test_clear_cart_success(db_session, app):
    user = User.query.filter_by(username='testuser1').first()
    CartService.clear_cart(user.id)
    cart = Cart.query.filter_by(user_id=user.id).first()
    assert len(cart.items) == 0

# --- OrderService Tests ---

def test_place_order_from_cart_success(db_session, app):
    user = User.query.filter_by(username='testuser1').first() # Has 2 laptops, 1 novel
    laptop_product = Product.query.filter_by(slug='laptop-pro').first() # Stock 10
    novel_product = Product.query.filter_by(slug='great-novel').first() # Stock 50

    initial_laptop_stock = laptop_product.stock_quantity
    initial_novel_stock = novel_product.stock_quantity

    order = OrderService.place_order_from_cart(user.id, '123 Test St, Test City')
    
    assert order is not None
    assert order.user_id == user.id
    assert order.total_amount == (2 * Decimal('1200.00')) + (1 * Decimal('25.50'))
    assert order.status == 'pending'
    assert len(order.items) == 2

    # Verify cart is cleared
    cart = Cart.query.filter_by(user_id=user.id).first()
    assert len(cart.items) == 0

    # Verify product stock is updated
    assert laptop_product.stock_quantity == initial_laptop_stock - 2
    assert novel_product.stock_quantity == initial_novel_stock - 1

def test_place_order_empty_cart(db_session, app):
    user = User.query.filter_by(username='testuser2').first() # Has empty cart
    with pytest.raises(BadRequestError, match="Cannot place an order with an empty cart."):
        OrderService.place_order_from_cart(user.id, '456 Empty St')

def test_place_order_out_of_stock(db_session, app):
    user = User.query.filter_by(username='testuser2').first()
    product = Product.query.filter_by(slug='great-novel').first() # Stock 50
    
    CartService.add_to_cart(user.id, product.id, quantity=100) # Add more than stock
    
    with pytest.raises(BadRequestError, match="Not enough stock for 'The Great Novel'"):
        OrderService.place_order_from_cart(user.id, '789 Stock St')
    
    # Ensure cart is NOT cleared if order fails
    cart = Cart.query.filter_by(user_id=user.id).first()
    assert len(cart.items) == 1

def test_get_all_orders_for_user(db_session, app):
    user = User.query.filter_by(username='testuser1').first()
    OrderService.place_order_from_cart(user.id, '123 St')
    orders = OrderService.get_all_orders_for_user(user.id)
    assert len(orders) == 1
    assert orders[0].user_id == user.id

def test_get_order_by_id_success(db_session, app):
    user = User.query.filter_by(username='testuser1').first()
    order = OrderService.place_order_from_cart(user.id, '123 St')
    retrieved_order = OrderService.get_order_by_id(order.id)
    assert retrieved_order.id == order.id

def test_get_order_by_id_not_found(db_session):
    with pytest.raises(NotFoundError):
        OrderService.get_order_by_id(9999)

def test_update_order_status_success(db_session, app):
    user = User.query.filter_by(username='testuser1').first()
    order = OrderService.place_order_from_cart(user.id, '123 St')
    
    updated_order = OrderService.update_order_status(order.id, 'shipped', 'paid')
    assert updated_order.status == 'shipped'
    assert updated_order.payment_status == 'paid'

def test_update_order_status_invalid_status(db_session, app):
    user = User.query.filter_by(username='testuser1').first()
    order = OrderService.place_order_from_cart(user.id, '123 St')
    
    with pytest.raises(BadRequestError, match="Invalid order status: invalid_status"):
        OrderService.update_order_status(order.id, 'invalid_status')