import pytest
from app.models.product import Product
from app.models.category import Category

def test_get_all_products_success(client, db_session, test_product):
    response = client.get('/api/products/') # No auth needed for public list
    assert response.status_code == 200
    data = response.get_json()
    assert 'items' in data
    assert any(p['name'] == test_product.name for p in data['items'])

def test_get_product_by_id_success(client, db_session, test_product):
    response = client.get(f'/api/products/{test_product.id}')
    assert response.status_code == 200
    data = response.get_json()
    assert data['id'] == test_product.id
    assert data['name'] == test_product.name
    assert 'category' in data # Should be eager loaded

def test_get_product_by_id_not_found(client):
    response = client.get('/api/products/999')
    assert response.status_code == 404
    assert 'not found' in response.get_json()['message']

def test_create_product_admin_success(client, db_session, admin_auth_tokens, test_category):
    product_data = {
        'name': 'New Admin Product',
        'description': 'Created by Admin',
        'price': 199.99,
        'stock_quantity': 50,
        'category_id': test_category.id
    }
    response = client.post('/api/products/', json=product_data, headers={
        'Authorization': f"Bearer {admin_auth_tokens['access_token']}"
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data['name'] == 'New Admin Product'
    assert data['price'] == '199.99' # Marshmallow serializes Decimal to string
    assert data['category']['id'] == test_category.id

    # Check database
    new_product = db_session.query(Product).filter_by(name='New Admin Product').first()
    assert new_product is not None

def test_create_product_customer_forbidden(client, auth_tokens, test_category):
    product_data = {
        'name': 'Forbidden Product',
        'description': 'Should not be created',
        'price': 1.00,
        'stock_quantity': 1,
        'category_id': test_category.id
    }
    response = client.post('/api/products/', json=product_data, headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 403
    assert 'Forbidden' in response.get_json()['error']

def test_update_product_admin_success(client, db_session, admin_auth_tokens, test_product):
    update_data = {'name': 'Updated Product Name', 'price': 250.00, 'is_active': False}
    response = client.put(f'/api/products/{test_product.id}', json=update_data, headers={
        'Authorization': f"Bearer {admin_auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['name'] == 'Updated Product Name'
    assert data['price'] == '250.00'
    assert data['is_active'] is False

    # Check database
    updated_product = db_session.query(Product).get(test_product.id)
    assert updated_product.name == 'Updated Product Name'

def test_delete_product_admin_success(client, db_session, admin_auth_tokens, test_product):
    delete_id = test_product.id

    response = client.delete(f'/api/products/{delete_id}', headers={
        'Authorization': f"Bearer {admin_auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    assert 'Product deleted successfully' in response.get_json()['message']

    # Check database
    deleted_product = db_session.query(Product).get(delete_id)
    assert deleted_product is None

def test_delete_product_customer_forbidden(client, auth_tokens, test_product):
    response = client.delete(f'/api/products/{test_product.id}', headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 403
    assert 'Forbidden' in response.get_json()['error']