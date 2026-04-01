```python
import pytest
from performance_monitor.models import Service, Endpoint
from performance_monitor.extensions import db, cache
from performance_monitor.services.service_monitoring import ServiceMonitoringService
from unittest.mock import patch

@pytest.fixture
def setup_endpoints_for_api(db_session, app, auth_tokens):
    # Clean relevant tables
    db_session.query(Endpoint).delete()
    db_session.query(Service).delete()
    db_session.commit()
    cache.clear()

    admin_user = auth_tokens['admin_user']
    regular_user = auth_tokens['regular_user']

    service1, _ = ServiceMonitoringService.create_service(
        name='API Endpoint Service 1', base_url='http://epapi1.com', owner_id=admin_user.id
    )
    service2, _ = ServiceMonitoringService.create_service(
        name='API Endpoint Service 2', base_url='http://epapi2.com', owner_id=regular_user.id
    )

    endpoint1_s1, _ = ServiceMonitoringService.create_endpoint(
        service_id=service1.id, path='/admin_health', method='GET', expected_status=200
    )
    endpoint2_s1, _ = ServiceMonitoringService.create_endpoint(
        service_id=service1.id, path='/admin_data', method='POST', expected_status=201
    )
    endpoint1_s2, _ = ServiceMonitoringService.create_endpoint(
        service_id=service2.id, path='/user_status', method='GET', expected_status=200
    )
    
    yield {
        'service1': service1,
        'service2': service2,
        'endpoint1_s1': endpoint1_s1,
        'endpoint2_s1': endpoint2_s1,
        'endpoint1_s2': endpoint1_s2,
        **auth_tokens
    }

    # Ensure scheduler jobs are cleaned up after test
    from performance_monitor.tasks import remove_endpoint_from_scheduler
    for ep in [endpoint1_s1, endpoint2_s1, endpoint1_s2]:
        remove_endpoint_from_scheduler(ep.id)


def test_list_service_endpoints_owner(client, app, setup_endpoints_for_api):
    with app.app_context():
        regular_headers = setup_endpoints_for_api['regular_headers']
        service2 = setup_endpoints_for_api['service2']
        response = client.get(f'/api/endpoints/service/{service2.id}', headers=regular_headers)
        assert response.status_code == 200
        assert len(response.json) == 1
        assert response.json[0]['path'] == '/user_status'

def test_list_service_endpoints_admin(client, app, setup_endpoints_for_api):
    with app.app_context():
        admin_headers = setup_endpoints_for_api['admin_headers']
        service1 = setup_endpoints_for_api['service1']
        response = client.get(f'/api/endpoints/service/{service1.id}', headers=admin_headers)
        assert response.status_code == 200
        assert len(response.json) == 2
        assert any(ep['path'] == '/admin_health' for ep in response.json)

def test_list_service_endpoints_forbidden(client, app, setup_endpoints_for_api):
    with app.app_context():
        regular_headers = setup_endpoints_for_api['regular_headers']
        service1_id = setup_endpoints_for_api['service1'].id # Owned by admin
        response = client.get(f'/api/endpoints/service/{service1_id}', headers=regular_headers)
        assert response.status_code == 403
        assert 'You do not own this service' in response.json['message']

@patch('performance_monitor.tasks.add_endpoint_to_scheduler')
def test_create_endpoint_success(mock_add_job, client, app, setup_endpoints_for_api):
    with app.app_context():
        regular_headers = setup_endpoints_for_api['regular_headers']
        service2 = setup_endpoints_for_api['service2']
        response = client.post(
            f'/api/endpoints/service/{service2.id}',
            headers=regular_headers,
            json={'service_id': service2.id, 'path': '/new_endpoint', 'method': 'GET', 'expected_status': 200}
        )
        assert response.status_code == 201
        assert response.json['path'] == '/new_endpoint'
        assert Endpoint.query.filter_by(service_id=service2.id, path='/new_endpoint').first() is not None
        mock_add_job.assert_called_once() # Verify scheduler integration

def test_create_endpoint_duplicate_path_method(client, app, setup_endpoints_for_api):
    with app.app_context():
        regular_headers = setup_endpoints_for_api['regular_headers']
        service2 = setup_endpoints_for_api['service2']
        response = client.post(
            f'/api/endpoints/service/{service2.id}',
            headers=regular_headers,
            json={'service_id': service2.id, 'path': '/user_status', 'method': 'GET'} # Duplicate
        )
        assert response.status_code == 400
        assert 'Endpoint with this path and method already exists' in response.json['message']

def test_get_endpoint_owner(client, app, setup_endpoints_for_api):
    with app.app_context():
        regular_headers = setup_endpoints_for_api['regular_headers']
        endpoint = setup_endpoints_for_api['endpoint1_s2']
        response = client.get(f'/api/endpoints/{endpoint.id}', headers=regular_headers)
        assert response.status_code == 200
        assert response.json['id'] == endpoint.id

def test_get_endpoint_forbidden(client, app, setup_endpoints_for_api):
    with app.app_context():
        regular_headers = setup_endpoints_for_api['regular_headers']
        endpoint_admin_owned = setup_endpoints_for_api['endpoint1_s1']
        response = client.get(f'/api/endpoints/{endpoint_admin_owned.id}', headers=regular_headers)
        assert response.status_code == 403
        assert 'You do not own the service for this endpoint' in response.json['message']

@patch('performance_monitor.tasks.add_endpoint_to_scheduler')
def test_update_endpoint_owner(mock_add_job, client, app, setup_endpoints_for_api):
    with app.app_context():
        regular_headers = setup_endpoints_for_api['regular_headers']
        endpoint = setup_endpoints_for_api['endpoint1_s2']
        response = client.put(
            f'/api/endpoints/{endpoint.id}',
            headers=regular_headers,
            json={'path': '/updated_status', 'polling_interval_seconds': 120}
        )
        assert response.status_code == 200
        assert response.json['path'] == '/updated_status'
        assert response.json['polling_interval_seconds'] == 120
        assert Endpoint.query.get(endpoint.id).path == '/updated_status'
        mock_add_job.assert_called_once() # Verify scheduler integration

@patch('performance_monitor.tasks.remove_endpoint_from_scheduler')
def test_delete_endpoint_owner(mock_remove_job, client, app, setup_endpoints_for_api):
    with app.app_context():
        regular_headers = setup_endpoints_for_api['regular_headers']
        endpoint = setup_endpoints_for_api['endpoint1_s2']
        response = client.delete(f'/api/endpoints/{endpoint.id}', headers=regular_headers)
        assert response.status_code == 204
        assert Endpoint.query.get(endpoint.id) is None
        mock_remove_job.assert_called_once_with(endpoint.id) # Verify scheduler integration

def test_delete_endpoint_forbidden(client, app, setup_endpoints_for_api):
    with app.app_context():
        regular_headers = setup_endpoints_for_api['regular_headers']
        endpoint_admin_owned = setup_endpoints_for_api['endpoint1_s1']
        response = client.delete(f'/api/endpoints/{endpoint_admin_owned.id}', headers=regular_headers)
        assert response.status_code == 403
        assert 'You do not own the service for this endpoint' in response.json['message']

```