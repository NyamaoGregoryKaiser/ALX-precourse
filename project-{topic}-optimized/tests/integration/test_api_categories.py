import pytest
from app.models.category import Category

def test_get_all_categories_success(client, db_session, test_category):
    response = client.get('/api/categories/', headers={
        'Authorization': f"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTY3ODkzMjkwMCwianRpIjoiZmQ0NzYwODUtMGMwYy00NzZkLWE1NjMtYTI4OTUyNzQ5YTY3IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6MSwibmJmIjoxNjc4OTMyOTAwLCJleHAiOjE2Nzg5MzYzMDAsImFkZGl0aW9uYWxfY2xhaW1zIjp7InJvbGVzIjpbIkNVU1RPTUVSIl0sImVtYWlsIjoidGVzdF9hcGlAZXhhbXBsZS5jb20ifX0.dummy" # A valid but dummy token is fine for optional auth
    })
    assert response.status_code == 200
    data = response.get_json()
    assert 'items' in data
    assert any(c['name'] == test_category.name for c in data['items'])

def test_get_category_by_id_success(client, db_session, test_category):
    response = client.get(f'/api/categories/{test_category.id}')
    assert response.status_code == 200
    data = response.get_json()
    assert data['id'] == test_category.id
    assert data['name'] == test_category.name

def test_get_category_by_id_not_found(client):
    response = client.get('/api/categories/999')
    assert response.status_code == 404
    assert 'not found' in response.get_json()['message']

def test_create_category_admin_success(client, db_session, admin_auth_tokens):
    category_data = {'name': 'New Admin Category', 'description': 'Created by Admin'}
    response = client.post('/api/categories/', json=category_data, headers={
        'Authorization': f"Bearer {admin_auth_tokens['access_token']}"
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data['name'] == 'New Admin Category'
    assert data['slug'] == 'new-admin-category'

    # Check database
    new_category = db_session.query(Category).filter_by(name='New Admin Category').first()
    assert new_category is not None

def test_create_category_customer_forbidden(client, auth_tokens):
    category_data = {'name': 'Forbidden Category', 'description': 'Should not be created'}
    response = client.post('/api/categories/', json=category_data, headers={
        'Authorization': f"Bearer {auth_tokens['access_token']}"
    })
    assert response.status_code == 403
    assert 'Forbidden' in response.get_json()['error']

def test_update_category_admin_success(client, db_session, admin_auth_tokens, test_category):
    update_data = {'name': 'Updated Category Name', 'is_active': False}
    response = client.put(f'/api/categories/{test_category.id}', json=update_data, headers={
        'Authorization': f"Bearer {admin_auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['name'] == 'Updated Category Name'
    assert data['is_active'] is False
    assert data['slug'] == 'updated-category-name'

    # Check database
    updated_category = db_session.query(Category).get(test_category.id)
    assert updated_category.name == 'Updated Category Name'

def test_delete_category_admin_success(client, db_session, admin_auth_tokens):
    category_to_delete = Category(name='Temp Category', slug='temp-category')
    db_session.add(category_to_delete)
    db_session.commit()
    delete_id = category_to_delete.id

    response = client.delete(f'/api/categories/{delete_id}', headers={
        'Authorization': f"Bearer {admin_auth_tokens['access_token']}"
    })
    assert response.status_code == 200
    assert 'Category deleted successfully' in response.get_json()['message']

    # Check database
    deleted_category = db_session.query(Category).get(delete_id)
    assert deleted_category is None

def test_delete_category_with_products_admin_forbidden(client, db_session, admin_auth_tokens, test_category, test_product):
    # test_product is linked to test_category
    response = client.delete(f'/api/categories/{test_category.id}', headers={
        'Authorization': f"Bearer {admin_auth_tokens['access_token']}"
    })
    assert response.status_code == 400
    assert 'Cannot delete category' in response.get_json()['message']