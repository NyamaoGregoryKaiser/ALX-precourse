import pytest
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product

def test_get_all_orders_customer_success(client, db_session, auth_tokens, customer_user, test_order):
    # Ensure test_order is associated with customer_user
    assert test_order.user_id == customer_user.id

    response = client.get('/api/orders/', headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert 'items' in data
    assert any(o['id'] == test_order.id for o in data['items'])

def test_get_all_orders_admin_success(client, db_session, admin_auth_tokens, test_order):
    response = client.get('/api/orders/', headers={
        'Authorization': f"Bearer {admin_auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert 'items' in data
    assert any(o['id'] == test_order.id for o in data['items'])

def test_get_order_by_id_customer_success(client, auth_tokens, test_order):
    response = client.get(f'/api/orders/{test_order.id}', headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['id'] == test_order.id
    assert 'items' in data
    assert len(data['items']) == 1
    assert data['items'][0]['product']['id'] == test_order.items[0].product.id

def test_get_order_by_id_customer_forbidden_other_order(client, auth_tokens, admin_user, db_session, test_product):
    # Create an order by admin_user, try to access as customer_user
    admin_order = Order(
        user_id=admin_user.id,
        shipping_address="Admin Addr",
        total_amount=10.00
    )
    db_session.add(admin_order)
    db_session.flush()
    db_session.add(OrderItem(order_id=admin_order.id, product_id=test_product.id, quantity=1, price_at_purchase=10.00))
    db_session.commit()

    response = client.get(f'/api/orders/{admin_order.id}', headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 403
    assert 'not authorized to view this order' in response.get_json()['message']

def test_create_order_customer_success(client, db_session, auth_tokens, customer_user, test_product):
    initial_stock = test_product.stock_quantity
    order_data = {
        'shipping_address': '456 Order Ln, Shopping City',
        'items': [
            {'product_id': test_product.id, 'quantity': 3}
        ]
    }
    response = client.post('/api/orders/', json=order_data, headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data['user_id'] == customer_user.id
    assert data['total_amount'] == str(float(test_product.price * 3))
    assert data['status'] == OrderStatus.PENDING.value
    assert len(data['items']) == 1
    assert data['items'][0]['product_id'] == test_product.id
    assert db_session.query(Product).get(test_product.id).stock_quantity == initial_stock - 3

def test_create_order_customer_insufficient_stock(client, auth_tokens, customer_user, test_product):
    order_data = {
        'shipping_address': '456 Order Ln, Shopping City',
        'items': [
            {'product_id': test_product.id, 'quantity': test_product.stock_quantity + 1}
        ]
    }
    response = client.post('/api/orders/', json=order_data, headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 400
    assert 'Insufficient stock' in response.get_json()['message']

def test_update_order_status_admin_success(client, db_session, admin_auth_tokens, test_order):
    response = client.put(f'/api/orders/{test_order.id}/status', json={
        'status': 'SHIPPED'
    }, headers={
        'Authorization': f"Bearer {admin_auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['id'] == test_order.id
    assert data['status'] == 'shipped'

    updated_order = db_session.query(Order).get(test_order.id)
    assert updated_order.status == OrderStatus.SHIPPED

def test_update_order_status_customer_forbidden(client, auth_tokens, test_order):
    response = client.put(f'/api/orders/{test_order.id}/status', json={
        'status': 'DELIVERED'
    }, headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 403
    assert 'not authorized to update order status' in response.get_json()['message']

def test_delete_order_admin_success(client, db_session, admin_auth_tokens, test_order):
    delete_id = test_order.id

    response = client.delete(f'/api/orders/{delete_id}', headers={
        'Authorization': f"Bearer {admin_auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    assert 'Order deleted successfully' in response.get_json()['message']

    deleted_order = db_session.query(Order).get(delete_id)
    assert deleted_order is None
    deleted_items = db_session.query(OrderItem).filter_by(order_id=delete_id).all()
    assert len(deleted_items) == 0 # Cascade delete