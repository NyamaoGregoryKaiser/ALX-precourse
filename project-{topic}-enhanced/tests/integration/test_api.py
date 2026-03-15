import pytest
from app.models import User, Product, Category, Cart, CartItem, Order, OrderItem
from app import db
from decimal import Decimal
import json

# --- Auth API Tests ---

def test_register_user_api(client):
    response = client.post('/api/auth/register', json={
        'username': 'api_test_user',
        'email': 'api_test@example.com',
        'password': 'password123'
    })
    assert response.status_code == 201
    assert 'message' in response.json
    assert User.query.filter_by(email='api_test@example.com').first() is not None
    # Ensure a cart is created
    user = User.query.filter_by(email='api_test@example.com').first()
    assert user.cart is not None

def test_register_user_api_missing_fields(client):
    response = client.post('/api/auth/register', json={
        'username': 'api_test_user',
        'email': 'api_test@example.com'
    })
    assert response.status_code == 400
    assert 'message' in response.json
    assert "Missing username, email, or password" in response.json['message']

def test_login_api_success(client, app):
    # Register a user first
    client.post('/api/auth/register', json={
        'username': 'login_user',
        'email': 'login_api@example.com',
        'password': 'loginpassword'
    })
    response = client.post('/api/auth/login', json={
        'email': 'login_api@example.com',
        'password': 'loginpassword'
    })
    assert response.status_code == 200
    assert 'access_token' in response.json
    assert 'refresh_token' in response.json

def test_login_api_invalid_credentials(client):
    response = client.post('/api/auth/login', json={
        'email': 'nonexistent@example.com',
        'password': 'wrongpassword'
    })
    assert response.status_code == 401
    assert 'message' in response.json
    assert "Invalid credentials" in response.json['message']

def test_refresh_token_api(client, app):
    # Login to get initial tokens
    response = client.post('/api/auth/login', json={
        'email': 'admin@example.com',
        'password': 'admin_password'
    })
    refresh_token = response.json['refresh_token']
    
    # Use refresh token to get a new access token
    refresh_response = client.post('/api/auth/refresh', headers={
        'Authorization': f'Bearer {refresh_token}'
    })
    assert refresh_response.status_code == 200
    assert 'access_token' in refresh_response.json

# --- User API Tests ---

def test_get_user_api_admin(auth_client, app):
    user = User.query.filter_by(username='testuser1').first()
    response = auth_client.get(f'/api/users/{user.id}')
    assert response.status_code == 200
    assert response.json['username'] == 'testuser1'

def test_get_user_api_customer_self(customer_auth_client, app):
    user_id = customer_auth_client.get_jwt_identity()['id'] # Get ID of the authenticated customer
    response = customer_auth_client.get(f'/api/users/{user_id}')
    assert response.status_code == 200
    assert response.json['username'] == 'testuser1'

def test_get_user_api_customer_other_user_forbidden(customer_auth_client, app):
    admin_user = User.query.filter_by(username='admin').first()
    response = customer_auth_client.get(f'/api/users/{admin_user.id}')
    assert response.status_code == 403
    assert 'message' in response.json
    assert "permission to view other users' data" in response.json['message']

def test_update_user_api_admin(auth_client, app):
    user = User.query.filter_by(username='testuser1').first()
    response = auth_client.put(f'/api/users/{user.id}', json={'username': 'updated_testuser1_admin'})
    assert response.status_code == 200
    assert User.query.get(user.id).username == 'updated_testuser1_admin'

def test_update_user_api_customer_self(customer_auth_client, app):
    user_id = customer_auth_client.get_jwt_identity()['id']
    response = customer_auth_client.put(f'/api/users/{user_id}', json={'email': 'updated_customer_email@example.com'})
    assert response.status_code == 200
    assert User.query.get(user_id).email == 'updated_customer_email@example.com'

def test_update_user_api_customer_change_role_forbidden(customer_auth_client, app):
    user_id = customer_auth_client.get_jwt_identity()['id']
    response = customer_auth_client.put(f'/api/users/{user_id}', json={'role': 'admin'})
    assert response.status_code == 403
    assert "permission to change user roles" in response.json['message']

def test_delete_user_api_admin(auth_client, app):
    user_to_delete = User.query.filter_by(username='testuser2').first()
    response = auth_client.delete(f'/api/users/{user_to_delete.id}')
    assert response.status_code == 204
    assert User.query.get(user_to_delete.id) is None

def test_delete_user_api_customer_forbidden(customer_auth_client, app):
    user_to_delete = User.query.filter_by(username='testuser2').first()
    response = customer_auth_client.delete(f'/api/users/{user_to_delete.id}')
    assert response.status_code == 403 # Only admin can delete

# --- Product API Tests ---

def test_get_all_products_api(client):
    response = client.get('/api/products/products')
    assert response.status_code == 200
    assert len(response.json) >= 2 # At least Laptop Pro and The Great Novel

def test_get_product_by_id_api(client, app):
    p1 = Product.query.filter_by(slug='laptop-pro').first()
    response = client.get(f'/api/products/products/{p1.id}')
    assert response.status_code == 200
    assert response.json['name'] == 'Laptop Pro'

def test_create_product_api_admin(auth_client, app):
    cat = Category.query.filter_by(slug='books').first()
    response = auth_client.post('/api/products/products', json={
        'name': 'API Created Book',
        'slug': 'api-created-book',
        'price': 15.00,
        'stock_quantity': 25,
        'category_id': cat.id
    })
    assert response.status_code == 201
    assert Product.query.filter_by(slug='api-created-book').first() is not None

def test_create_product_api_customer_forbidden(customer_auth_client, app):
    cat = Category.query.filter_by(slug='books').first()
    response = customer_auth_client.post('/api/products/products', json={
        'name': 'Forbidden Book',
        'slug': 'forbidden-book',
        'price': 10.00,
        'stock_quantity': 5,
        'category_id': cat.id
    })
    assert response.status_code == 403

def test_update_product_api_admin(auth_client, app):
    p1 = Product.query.filter_by(slug='laptop-pro').first()
    response = auth_client.put(f'/api/products/products/{p1.id}', json={'price': 1250.00})
    assert response.status_code == 200
    assert float(Product.query.get(p1.id).price) == 1250.00

def test_delete_product_api_admin(auth_client, app):
    p3 = Product.query.filter_by(slug='great-novel').first()
    response = auth_client.delete(f'/api/products/products/{p3.id}')
    assert response.status_code == 204
    assert Product.query.get(p3.id) is None

# --- Cart API Tests ---

def test_get_cart_items_api_customer(customer_auth_client, app):
    response = customer_auth_client.get('/api/cart')
    assert response.status_code == 200
    assert len(response.json) == 2 # 2 laptops, 1 novel (from conftest seed)

def test_add_to_cart_api_customer(customer_auth_client, app):
    user = User.query.filter_by(username='testuser1').first()
    cart = Cart.query.filter_by(user_id=user.id).first()
    p_to_add = Product(name='New Item', slug='new-item', price=Decimal('10.00'), stock_quantity=10, category_id=Category.query.first().id)
    db.session.add(p_to_add)
    db.session.commit()

    response = customer_auth_client.post('/api/cart', json={'product_id': p_to_add.id, 'quantity': 2})
    assert response.status_code == 200
    assert CartItem.query.filter_by(cart_id=cart.id, product_id=p_to_add.id).first().quantity == 2

def test_update_cart_item_quantity_api_customer(customer_auth_client, app):
    user = User.query.filter_by(username='testuser1').first()
    product_laptop = Product.query.filter_by(slug='laptop-pro').first() # In cart, qty 2
    
    response = customer_auth_client.put(f'/api/cart/{product_laptop.id}', json={'quantity': 4})
    assert response.status_code == 200
    assert CartItem.query.filter_by(cart_id=user.cart.id, product_id=product_laptop.id).first().quantity == 4

def test_remove_from_cart_api_customer(customer_auth_client, app):
    user = User.query.filter_by(username='testuser1').first()
    product_laptop = Product.query.filter_by(slug='laptop-pro').first() # In cart, qty 2
    
    response = customer_auth_client.delete(f'/api/cart/{product_laptop.id}')
    assert response.status_code == 204
    assert CartItem.query.filter_by(cart_id=user.cart.id, product_id=product_laptop.id).first() is None

def test_clear_cart_api_customer(customer_auth_client, app):
    user = User.query.filter_by(username='testuser1').first() # Has items in cart
    response = customer_auth_client.delete('/api/cart')
    assert response.status_code == 204
    assert len(user.cart.items) == 0

# --- Order API Tests ---

def test_place_order_api_customer(customer_auth_client, app):
    user = User.query.filter_by(username='testuser1').first() # Has items in cart
    initial_laptop_stock = Product.query.filter_by(slug='laptop-pro').first().stock_quantity
    initial_novel_stock = Product.query.filter_by(slug='great-novel').first().stock_quantity

    response = customer_auth_client.post('/api/orders', json={'shipping_address': '101 Order Pl, Order City'})
    assert response.status_code == 201
    assert 'order_id' in response.json
    order = Order.query.get(response.json['order_id'])
    assert order.user_id == user.id
    assert len(user.cart.items) == 0 # Cart cleared
    assert Product.query.filter_by(slug='laptop-pro').first().stock_quantity == initial_laptop_stock - 2 # Stock reduced
    assert Product.query.filter_by(slug='great-novel').first().stock_quantity == initial_novel_stock - 1 # Stock reduced

def test_get_all_orders_api_customer(customer_auth_client, app):
    # Place an order first
    customer_auth_client.post('/api/orders', json={'shipping_address': '101 Order Pl, Order City'})
    
    response = customer_auth_client.get('/api/orders')
    assert response.status_code == 200
    assert len(response.json) >= 1
    assert response.json[0]['user_id'] == customer_auth_client.get_jwt_identity()['id']

def test_get_order_details_api_customer_self(customer_auth_client, app):
    # Place an order first
    order_response = customer_auth_client.post('/api/orders', json={'shipping_address': '101 Order Pl, Order City'})
    order_id = order_response.json['order_id']
    
    response = customer_auth_client.get(f'/api/orders/{order_id}')
    assert response.status_code == 200
    assert response.json['id'] == order_id
    assert len(response.json['items']) == 2 # 2 products in original cart

def test_get_order_details_api_customer_other_user_forbidden(customer_auth_client, auth_client, app):
    # Admin places an order
    admin_order_response = auth_client.post('/api/orders', json={'shipping_address': 'Admin Address'})
    admin_order_id = admin_order_response.json['order_id']
    
    # Customer tries to view admin's order
    response = customer_auth_client.get(f'/api/orders/{admin_order_id}')
    assert response.status_code == 403
    assert "permission to view this order" in response.json['message']

def test_update_order_status_api_admin(auth_client, app):
    # Admin places an order (or get one from a customer)
    customer_user = User.query.filter_by(username='testuser1').first()
    # Need to clear customer_user's cart before admin can place an order from their cart
    CartItem.query.filter_by(cart_id=customer_user.cart.id).delete()
    db.session.commit()
    CartService.add_to_cart(customer_user.id, Product.query.first().id, 1) # Add an item
    db.session.commit()
    order_response = auth_client.post(f'/api/orders', json={'shipping_address': 'Admin Address'})
    order_id = order_response.json['order_id']

    response = auth_client.put(f'/api/orders/{order_id}', json={'status': 'shipped', 'payment_status': 'paid'})
    assert response.status_code == 200
    assert Order.query.get(order_id).status == 'shipped'
    assert Order.query.get(order_id).payment_status == 'paid'