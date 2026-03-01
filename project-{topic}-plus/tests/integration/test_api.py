```python
import pytest
import json
import uuid
from app.models import User, Category, Product, Cart, CartItem, Order, OrderStatus, UserRole
from app import db, cache
from decimal import Decimal

def test_register_login_protected(client, db_session):
    # Register
    register_response = client.post('/api/auth/register', json={
        'username': 'newuser',
        'email': 'newuser@example.com',
        'password': 'password123'
    })
    assert register_response.status_code == 201
    assert 'User registered successfully' in register_response.get_json()['message']

    # Login
    login_response = client.post('/api/auth/login', json={
        'email': 'newuser@example.com',
        'password': 'password123'
    })
    assert login_response.status_code == 200
    login_data = login_response.get_json()
    assert 'access_token' in login_data
    assert 'refresh_token' in login_data
    assert login_data['user']['email'] == 'newuser@example.com'

    access_token = login_data['access_token']

    # Access protected endpoint
    protected_response = client.get('/api/auth/protected', headers={'Authorization': f'Bearer {access_token}'})
    assert protected_response.status_code == 200
    assert 'Hello newuser, you are authorized!' in protected_response.get_json()['message']

    # Unauthorized access
    unauthorized_response = client.get('/api/auth/protected')
    assert unauthorized_response.status_code == 401

def test_admin_only_access(client, auth_tokens):
    # Admin access
    admin_response = client.get('/api/auth/admin-only', headers={'Authorization': f'Bearer {auth_tokens["admin"]}'})
    assert admin_response.status_code == 200
    assert 'Hello Admin admin_test, you have admin access!' in admin_response.get_json()['message']

    # Customer forbidden access
    customer_response = client.get('/api/auth/admin-only', headers={'Authorization': f'Bearer {auth_tokens["customer"]}'})
    assert customer_response.status_code == 403

def test_user_profile_crud(client, auth_tokens, test_users):
    customer = test_users['customer']
    customer_id = str(customer.id)
    customer_token = auth_tokens['customer']
    admin_token = auth_tokens['admin']

    # Get profile (owner)
    get_response = client.get(f'/api/users/{customer_id}', headers={'Authorization': f'Bearer {customer_token}'})
    assert get_response.status_code == 200
    assert get_response.get_json()['username'] == customer.username

    # Get profile (admin)
    get_response_admin = client.get(f'/api/users/{customer_id}', headers={'Authorization': f'Bearer {admin_token}'})
    assert get_response_admin.status_code == 200
    assert get_response_admin.get_json()['username'] == customer.username

    # Update profile (owner)
    update_data = {'username': 'updated_customer_name'}
    update_response = client.put(f'/api/users/{customer_id}', json=update_data, headers={'Authorization': f'Bearer {customer_token}'})
    assert update_response.status_code == 200
    assert update_response.get_json()['username'] == 'updated_customer_name'
    db.session.refresh(customer)
    assert customer.username == 'updated_customer_name'

    # Unauthorized update by another user
    another_customer = test_users['another_customer']
    another_token = client.post('/api/auth/login', json={'email': another_customer.email, 'password': 'anotherpass'}).get_json()['access_token']
    
    unauthorized_update_response = client.put(f'/api/users/{customer_id}', json={'username': 'hacker_name'}, headers={'Authorization': f'Bearer {another_token}'})
    assert unauthorized_update_response.status_code == 403

    # Admin delete customer
    delete_response = client.delete(f'/api/users/{customer_id}', headers={'Authorization': f'Bearer {admin_token}'})
    assert delete_response.status_code == 204
    assert User.query.get(customer_id) is None

def test_category_crud(client, auth_tokens, db_session):
    admin_token = auth_tokens['admin']
    customer_token = auth_tokens['customer']

    # Customer tries to create category (forbidden)
    forbidden_response = client.post('/api/categories/', json={'name': 'Forbidden Category'}, headers={'Authorization': f'Bearer {customer_token}'})
    assert forbidden_response.status_code == 403

    # Admin creates category
    create_data = {'name': 'Electronics', 'description': 'Gadgets'}
    create_response = client.post('/api/categories/', json=create_data, headers={'Authorization': f'Bearer {admin_token}'})
    assert create_response.status_code == 201
    category_id = create_response.get_json()['id']
    assert create_response.get_json()['name'] == 'Electronics'

    # Get all categories
    get_all_response = client.get('/api/categories/')
    assert get_all_response.status_code == 200
    assert len(get_all_response.get_json()) == 1

    # Get category by ID
    get_by_id_response = client.get(f'/api/categories/{category_id}')
    assert get_by_id_response.status_code == 200
    assert get_by_id_response.get_json()['name'] == 'Electronics'

    # Admin updates category
    update_data = {'name': 'Updated Electronics'}
    update_response = client.put(f'/api/categories/{category_id}', json=update_data, headers={'Authorization': f'Bearer {admin_token}'})
    assert update_response.status_code == 200
    assert update_response.get_json()['name'] == 'Updated Electronics'

    # Admin deletes category
    delete_response = client.delete(f'/api/categories/{category_id}', headers={'Authorization': f'Bearer {admin_token}'})
    assert delete_response.status_code == 204
    assert Category.query.get(category_id) is None

def test_product_crud(client, auth_tokens, db_session, test_categories):
    admin_token = auth_tokens['admin']
    electronics_id = str(test_categories['electronics'].id)

    # Admin creates product
    product_data = {
        'name': 'Test Laptop',
        'description': 'A high-performance laptop.',
        'price': 1200.00,
        'stock': 10,
        'image_url': 'http://example.com/laptop.jpg',
        'category_id': electronics_id
    }
    create_response = client.post('/api/products/', json=product_data, headers={'Authorization': f'Bearer {admin_token}'})
    assert create_response.status_code == 201
    product_id = create_response.get_json()['id']
    assert create_response.get_json()['name'] == 'Test Laptop'

    # Get all products
    get_all_response = client.get('/api/products/')
    assert get_all_response.status_code == 200
    assert get_all_response.get_json()['total_items'] == 1
    assert get_all_response.get_json()['products'][0]['name'] == 'Test Laptop'

    # Get product by ID
    get_by_id_response = client.get(f'/api/products/{product_id}')
    assert get_by_id_response.status_code == 200
    assert get_by_id_response.get_json()['price'] == '1200.00'

    # Get product by slug
    get_by_slug_response = client.get('/api/products/slug/test-laptop')
    assert get_by_slug_response.status_code == 200
    assert get_by_slug_response.get_json()['name'] == 'Test Laptop'

    # Admin updates product
    update_data = {'price': 1150.00, 'stock': 8}
    update_response = client.put(f'/api/products/{product_id}', json=update_data, headers={'Authorization': f'Bearer {admin_token}'})
    assert update_response.status_code == 200
    assert update_response.get_json()['price'] == '1150.00'
    assert update_response.get_json()['stock'] == 8

    # Admin deletes product
    delete_response = client.delete(f'/api/products/{product_id}', headers={'Authorization': f'Bearer {admin_token}'})
    assert delete_response.status_code == 204
    assert Product.query.get(product_id) is None

def test_cart_management(client, auth_tokens, test_users, test_products, db_session):
    customer_token = auth_tokens['customer']
    customer_id = str(test_users['customer'].id)
    smartphone_id = str(test_products['smartphone'].id)
    tshirt_id = str(test_products['tshirt'].id)

    # Get empty cart
    get_cart_response = client.get('/api/cart/', headers={'Authorization': f'Bearer {customer_token}'})
    assert get_cart_response.status_code == 200
    assert len(get_cart_response.get_json()['items']) == 0

    # Add item to cart
    add_item_data = {'product_id': smartphone_id, 'quantity': 1}
    add_item_response = client.post('/api/cart/items', json=add_item_data, headers={'Authorization': f'Bearer {customer_token}'})
    assert add_item_response.status_code == 200
    cart_items = add_item_response.get_json()['items']
    assert len(cart_items) == 1
    assert cart_items[0]['product_id'] == smartphone_id
    assert cart_items[0]['quantity'] == 1

    # Add another item
    add_item_data_2 = {'product_id': tshirt_id, 'quantity': 2}
    client.post('/api/cart/items', json=add_item_data_2, headers={'Authorization': f'Bearer {customer_token}'})
    
    # Update item quantity
    update_item_data = {'quantity': 3}
    update_item_response = client.put(f'/api/cart/items/{smartphone_id}', json=update_item_data, headers={'Authorization': f'Bearer {customer_token}'})
    assert update_item_response.status_code == 200
    updated_cart_items = update_item_response.get_json()['items']
    assert len(updated_cart_items) == 2
    smartphone_item = next(item for item in updated_cart_items if item['product_id'] == smartphone_id)
    assert smartphone_item['quantity'] == 3

    # Remove item from cart
    remove_item_response = client.delete(f'/api/cart/items/{tshirt_id}', headers={'Authorization': f'Bearer {customer_token}'})
    assert remove_item_response.status_code == 204
    get_cart_after_remove = client.get('/api/cart/', headers={'Authorization': f'Bearer {customer_token}'})
    assert len(get_cart_after_remove.get_json()['items']) == 1

    # Clear cart
    clear_cart_response = client.delete('/api/cart/clear', headers={'Authorization': f'Bearer {customer_token}'})
    assert clear_cart_response.status_code == 204
    get_cart_after_clear = client.get('/api/cart/', headers={'Authorization': f'Bearer {customer_token}'})
    assert len(get_cart_after_clear.get_json()['items']) == 0

def test_order_flow(client, auth_tokens, test_users, test_products, customer_cart_with_items, db_session):
    customer_token = auth_tokens['customer']
    admin_token = auth_tokens['admin']
    customer_id = str(test_users['customer'].id)
    smartphone_id = str(test_products['smartphone'].id)
    tshirt_id = str(test_products['tshirt'].id)

    initial_smartphone_stock = Product.query.get(smartphone_id).stock
    initial_tshirt_stock = Product.query.get(tshirt_id).stock

    # Create order from cart
    create_order_data = {'shipping_address': '123 Test Street, Testville'}
    create_order_response = client.post('/api/orders/', json=create_order_data, headers={'Authorization': f'Bearer {customer_token}'})
    assert create_order_response.status_code == 201
    order_data = create_order_response.get_json()
    order_id = order_data['id']
    assert order_data['total_amount'] == '550.00' # 1*500 (smartphone) + 2*25 (tshirt)
    assert order_data['status'] == OrderStatus.PENDING.value
    assert len(order_data['items']) == 2

    # Verify cart is empty after order
    get_cart_response = client.get('/api/cart/', headers={'Authorization': f'Bearer {customer_token}'})
    assert len(get_cart_response.get_json()['items']) == 0

    # Verify product stock updated
    assert Product.query.get(smartphone_id).stock == initial_smartphone_stock - 1
    assert Product.query.get(tshirt_id).stock == initial_tshirt_stock - 2

    # Get customer's orders
    get_my_orders_response = client.get('/api/orders/my-orders', headers={'Authorization': f'Bearer {customer_token}'})
    assert get_my_orders_response.status_code == 200
    assert len(get_my_orders_response.get_json()) == 1
    assert get_my_orders_response.get_json()[0]['id'] == order_id

    # Get order details (owner)
    get_order_details_response = client.get(f'/api/orders/{order_id}', headers={'Authorization': f'Bearer {customer_token}'})
    assert get_order_details_response.status_code == 200
    assert get_order_details_response.get_json()['id'] == order_id

    # Admin gets all orders
    get_all_orders_admin_response = client.get('/api/orders/', headers={'Authorization': f'Bearer {admin_token}'})
    assert get_all_orders_admin_response.status_code == 200
    assert get_all_orders_admin_response.get_json()['total_items'] == 1
    assert get_all_orders_admin_response.get_json()['orders'][0]['id'] == order_id

    # Admin updates order status
    update_status_data = {'status': 'shipped'}
    update_status_response = client.put(f'/api/orders/{order_id}/status', json=update_status_data, headers={'Authorization': f'Bearer {admin_token}'})
    assert update_status_response.status_code == 200
    assert update_status_response.get_json()['status'] == 'shipped'

    # Customer tries to cancel shipped order (should fail)
    cancel_response = client.post(f'/api/orders/{order_id}/cancel', headers={'Authorization': f'Bearer {customer_token}'})
    assert cancel_response.status_code == 400
    assert "cannot be cancelled as its status is shipped" in cancel_response.get_json()['message']

    # Make a new order to test cancellation
    db_session.add(CartItem(cart_id=test_users['customer'].cart.id, product_id=smartphone_id, quantity=1))
    db_session.commit()
    new_order_response = client.post('/api/orders/', json=create_order_data, headers={'Authorization': f'Bearer {customer_token}'})
    new_order_id = new_order_response.get_json()['id']
    
    # Customer cancels pending order
    cancel_response_ok = client.post(f'/api/orders/{new_order_id}/cancel', headers={'Authorization': f'Bearer {customer_token}'})
    assert cancel_response_ok.status_code == 200
    assert "cancelled successfully" in cancel_response_ok.get_json()['message']
    assert Order.query.get(new_order_id).status == OrderStatus.CANCELLED
    
    # Verify stock is returned after cancellation
    assert Product.query.get(smartphone_id).stock == initial_smartphone_stock - 1 + 1 # original + new order's item + cancelled order's item
```