```python
import pytest
from performance_monitor.models import Service
from performance_monitor.extensions import db, cache
from performance_monitor.services.service_monitoring import ServiceMonitoringService

@pytest.fixture
def setup_services_for_api(db_session, app, auth_tokens):
    # Clean relevant tables
    db_session.query(Service).delete()
    db_session.commit()
    cache.clear() # Clear cache to avoid interference

    admin_user = auth_tokens['admin_user']
    regular_user = auth_tokens['regular_user']

    service1, _ = ServiceMonitoringService.create_service(
        name='API Service 1', base_url='http://api1.com', owner_id=admin_user.id
    )
    service2, _ = ServiceMonitoringService.create_service(
        name='API Service 2', base_url='http://api2.com', owner_id=regular_user.id
    )
    return {
        'service1': service1,
        'service2': service2,
        **auth_tokens
    }

def test_list_services_admin(client, app, setup_services_for_api):
    with app.app_context():
        admin_headers = setup_services_for_api['admin_headers']
        response = client.get('/api/services/', headers=admin_headers)
        assert response.status_code == 200
        assert len(response.json) == 2
        assert any(s['name'] == 'API Service 1' for s in response.json)
        assert any(s['name'] == 'API Service 2' for s in response.json)

def test_list_services_regular_only_own(client, app, setup_services_for_api):
    with app.app_context():
        regular_headers = setup_services_for_api['regular_headers']
        response = client.get('/api/services/', headers=regular_headers)
        assert response.status_code == 200
        assert len(response.json) == 1
        assert response.json[0]['name'] == 'API Service 2'
        assert response.json[0]['owner_id'] == setup_services_for_api['regular_user'].id

def test_create_service_success(client, app, setup_services_for_api):
    with app.app_context():
        regular_headers = setup_services_for_api['regular_headers']
        response = client.post(
            '/api/services/',
            headers=regular_headers,
            json={'name': 'New Service From API', 'base_url': 'http://newapi.com', 'description': 'Testing creation'}
        )
        assert response.status_code == 201
        assert response.json['name'] == 'New Service From API'
        assert response.json['owner_id'] == setup_services_for_api['regular_user'].id
        assert Service.query.filter_by(name='New Service From API').first() is not None

def test_create_service_duplicate_name(client, app, setup_services_for_api):
    with app.app_context():
        regular_headers = setup_services_for_api['regular_headers']
        response = client.post(
            '/api/services/',
            headers=regular_headers,
            json={'name': 'API Service 1', 'base_url': 'http://dupe.com'} # Name exists from fixture
        )
        assert response.status_code == 400
        assert 'Service name already exists' in response.json['message']

def test_get_service_admin_access(client, app, setup_services_for_api):
    with app.app_context():
        admin_headers = setup_services_for_api['admin_headers']
        service2_id = setup_services_for_api['service2'].id
        response = client.get(f'/api/services/{service2_id}', headers=admin_headers)
        assert response.status_code == 200
        assert response.json['id'] == service2_id

def test_get_service_owner_access(client, app, setup_services_for_api):
    with app.app_context():
        regular_headers = setup_services_for_api['regular_headers']
        service2_id = setup_services_for_api['service2'].id
        response = client.get(f'/api/services/{service2_id}', headers=regular_headers)
        assert response.status_code == 200
        assert response.json['id'] == service2_id

def test_get_service_other_user_forbidden(client, app, setup_services_for_api):
    with app.app_context():
        regular_headers = setup_services_for_api['regular_headers']
        service1_id = setup_services_for_api['service1'].id # Owned by admin
        response = client.get(f'/api/services/{service1_id}', headers=regular_headers)
        assert response.status_code == 403
        assert 'You do not own this service' in response.json['message']

def test_update_service_owner(client, app, setup_services_for_api):
    with app.app_context():
        regular_headers = setup_services_for_for_api['regular_headers']
        service2 = setup_services_for_api['service2']
        response = client.put(
            f'/api/services/{service2.id}',
            headers=regular_headers,
            json={'description': 'Updated description', 'is_active': False}
        )
        assert response.status_code == 200
        assert response.json['description'] == 'Updated description'
        assert response.json['is_active'] is False
        assert Service.query.get(service2.id).is_active is False

def test_update_service_admin(client, app, setup_services_for_api):
    with app.app_context():
        admin_headers = setup_services_for_api['admin_headers']
        service1 = setup_services_for_api['service1']
        response = client.put(
            f'/api/services/{service1.id}',
            headers=admin_headers,
            json={'base_url': 'http://admin-updated.com'}
        )
        assert response.status_code == 200
        assert response.json['base_url'] == 'http://admin-updated.com'

def test_delete_service_owner(client, app, setup_services_for_api):
    with app.app_context():
        regular_headers = setup_services_for_api['regular_headers']
        service2_id = setup_services_for_api['service2'].id
        response = client.delete(f'/api/services/{service2_id}', headers=regular_headers)
        assert response.status_code == 204
        assert Service.query.get(service2_id) is None

def test_delete_service_other_user_forbidden(client, app, setup_services_for_api):
    with app.app_context():
        regular_headers = setup_services_for_api['regular_headers']
        service1_id = setup_services_for_api['service1'].id # Owned by admin
        response = client.delete(f'/api/services/{service1_id}', headers=regular_headers)
        assert response.status_code == 403
        assert 'You do not own this service' in response.json['message']

```