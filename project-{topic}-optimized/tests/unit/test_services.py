import pytest
from app.services.user_service import UserService
from app.services.category_service import CategoryService
from app.services.product_service import ProductService
from app.services.order_service import OrderService
from app.services.auth_service import AuthService
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatus
from app.utils.errors import NotFoundError, BadRequestError, ConflictError, ForbiddenError, InternalServerError
from app.extensions import bcrypt

# --- AuthService Tests ---
def test_auth_register_user_success(db_session, app):
    with app.app_context():
        # Ensure CUSTOMER role exists for new users
        if not UserRole.query.filter_by(name='CUSTOMER').first():
            db_session.add(UserRole(name='CUSTOMER'))
            db_session.commit()

        user = AuthService.register_user('newuser', 'new@example.com', 'testpass')
        assert user.id is not None
        assert user.username == 'newuser'
        assert user.email == 'new@example.com'
        assert user.check_password('testpass')
        assert user.has_role('CUSTOMER')

def test_auth_register_user_duplicate_email(db_session, app, customer_user):
    with app.app_context():
        with pytest.raises(ConflictError):
            AuthService.register_user('anotheruser', customer_user.email, 'testpass')

def test_auth_authenticate_user_success(app, customer_user):
    with app.app_context():
        tokens = AuthService.authenticate_user(customer_user.email, 'customerpass')
        assert 'access_token' in tokens
        assert 'refresh_token' in tokens

def test_auth_authenticate_user_invalid_credentials(app, customer_user):
    with app.app_context():
        with pytest.raises(UnauthorizedError):
            AuthService.authenticate_user(customer_user.email, 'wrongpass')
        with pytest.raises(UnauthorizedError):
            AuthService.authenticate_user('nonexistent@example.com', 'anypass')

# --- UserService Tests ---
def test_user_service_get_user_by_id_success(customer_user):
    user = UserService.get_user_by_id(customer_user.id)
    assert user.id == customer_user.id

def test_user_service_get_user_by_id_not_found():
    with pytest.raises(NotFoundError):
        UserService.get_user_by_id(9999)

def test_user_service_update_user_by_admin(db_session, admin_user, customer_user):
    updated_data = {'username': 'updated_customer', 'is_active': False, 'roles': ['EDITOR']}
    user = UserService.update_user(customer_user.id, updated_data, admin_user.id, ['ADMIN'])
    assert user.username == 'updated_customer'
    assert user.is_active is False
    assert user.has_role('EDITOR')
    assert not user.has_role('CUSTOMER')

def test_user_service_update_user_by_self_success(customer_user):
    updated_data = {'username': 'self_updated_customer'}
    user = UserService.update_user(customer_user.id, updated_data, customer_user.id, ['CUSTOMER'])
    assert user.username == 'self_updated_customer'

def test_user_service_update_user_by_non_admin_forbidden_role_change(db_session, customer_user):
    updated_data = {'roles': ['ADMIN']}
    with pytest.raises(ForbiddenError):
        UserService.update_user(customer_user.id, updated_data, customer_user.id, ['CUSTOMER'])

def test_user_service_delete_user_by_admin_success(db_session, admin_user, customer_user):
    UserService.delete_user(customer_user.id, admin_user.id, ['ADMIN'])
    with pytest.raises(NotFoundError):
        UserService.get_user_by_id(customer_user.id)

def test_user_service_delete_user_by_self_forbidden(db_session, customer_user):
    with pytest.raises(BadRequestError): # Admin cannot delete self. User cannot delete self via this API.
        UserService.delete_user(customer_user.id, customer_user.id, ['CUSTOMER'])

# --- CategoryService Tests ---
def test_category_service_create_category_success(db_session):
    category = CategoryService.create_category('New Category', 'Description')
    assert category.id is not None
    assert category.name == 'New Category'
    assert category.slug == 'new-category'

def test_category_service_create_category_duplicate(db_session):
    CategoryService.create_category('Duplicate Category', 'Description')
    with pytest.raises(ConflictError):
        CategoryService.create_category('Duplicate Category', 'Another description')

def test_category_service_get_category_by_id_success(test_category):
    category = CategoryService.get_category_by_id(test_category.id)
    assert category.id == test_category.id

def test_category_service_update_category_success(test_category):
    updated_category = CategoryService.update_category(test_category.id, {'name': 'Updated Category', 'is_active': False})
    assert updated_category.name == 'Updated Category'
    assert updated_category.slug == 'updated-category'
    assert updated_category.is_active is False

def test_category_service_delete_category_success(db_session):
    category = CategoryService.create_category('To Delete', 'Temp')
    UserService.delete_category(category.id)
    with pytest.raises(NotFoundError):
        CategoryService.get_category_by_id(category.id)

def test_category_service_delete_category_with_products(db_session, test_category, test_product):
    # test_product is linked to test_category
    with pytest.raises(BadRequestError):
        CategoryService.delete_category(test_category.id)

# --- ProductService Tests ---
def test_product_service_create_product_success(db_session, test_category):
    product = ProductService.create_product(
        'New Product', 'Desc', 10.00, 5, test_category.id
    )
    assert product.id is not None
    assert product.name == 'New Product'
    assert product.category_id == test_category.id

def test_product_service_create_product_invalid_category(db_session):
    with pytest.raises(BadRequestError):
        ProductService.create_product('Bad Product', 'Desc', 10.00, 5, 9999)

def test_product_service_get_product_by_id_success(test_product):
    product = ProductService.get_product_by_id(test_product.id)
    assert product.id == test_product.id
    assert product.category is not None # Eager loaded

def test_product_service_update_product_success(db_session, test_product):
    updated_product = ProductService.update_product(test_product.id, {'price': 150.00, 'stock_quantity': 20})
    assert updated_product.price == 150.00
    assert updated_product.stock_quantity == 20

def test_product_service_delete_product_success(db_session, test_product):
    ProductService.delete_product(test_product.id)
    with pytest.raises(NotFoundError):
        ProductService.get_product_by_id(test_product.id)

# --- OrderService Tests ---
def test_order_service_create_order_success(db_session, customer_user, test_product):
    initial_stock = test_product.stock_quantity
    items = [{'product_id': test_product.id, 'quantity': 1}]
    order = OrderService.create_order(customer_user.id, '123 Test', items)
    assert order.id is not None
    assert order.user_id == customer_user.id
    assert order.total_amount == test_product.price
    assert test_product.stock_quantity == initial_stock - 1

def test_order_service_create_order_insufficient_stock(db_session, customer_user, test_product):
    items = [{'product_id': test_product.id, 'quantity': test_product.stock_quantity + 1}]
    with pytest.raises(BadRequestError):
        OrderService.create_order(customer_user.id, '123 Test', items)

def test_order_service_get_order_by_id_success(test_order):
    order = OrderService.get_order_by_id(test_order.id, user_id=test_order.user_id)
    assert order.id == test_order.id
    assert len(order.items) == 1
    assert order.items[0].product is not None # Eager loaded

def test_order_service_get_order_by_id_forbidden(test_order, customer_user):
    # Another user trying to view
    another_user = User(username='another', email='another@example.com')
    another_user.set_password('pass')
    db_session.add(another_user)
    db_session.commit()
    with pytest.raises(ForbiddenError):
        OrderService.get_order_by_id(test_order.id, user_id=another_user.id)

def test_order_service_get_order_by_id_admin_access(test_order, admin_user):
    order = OrderService.get_order_by_id(test_order.id, user_id=admin_user.id, is_admin=True)
    assert order.id == test_order.id

def test_order_service_update_order_status_success(test_order, admin_user):
    order = OrderService.update_order_status(test_order.id, 'SHIPPED', is_admin=True)
    assert order.status == OrderStatus.SHIPPED

def test_order_service_update_order_status_forbidden(test_order, customer_user):
    with pytest.raises(ForbiddenError):
        OrderService.update_order_status(test_order.id, 'SHIPPED', is_admin=False)

def test_order_service_delete_order_by_admin_success(db_session, test_order, admin_user):
    OrderService.delete_order(test_order.id, is_admin=True)
    with pytest.raises(NotFoundError):
        OrderService.get_order_by_id(test_order.id, is_admin=True)