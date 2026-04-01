```python
import pytest
from datetime import datetime, timedelta
import random

from performance_monitor.services.service_monitoring import ServiceMonitoringService, poll_endpoint_and_save_metric
from performance_monitor.models import User, Service, Endpoint, Metric
from performance_monitor.extensions import db, scheduler
from unittest.mock import patch, MagicMock

@pytest.fixture
def setup_users_services_endpoints(db_session, app, auth_tokens):
    # Ensure no pre-existing services/endpoints from other tests if not using full transaction rollback
    db_session.query(Metric).delete()
    db_session.query(Endpoint).delete()
    db_session.query(Service).delete()
    db_session.commit()

    admin_user = auth_tokens['admin_user']
    regular_user = auth_tokens['regular_user']

    # Services
    service1, err = ServiceMonitoringService.create_service(
        name='Test Service 1', base_url='http://example.com/api', owner_id=admin_user.id
    )
    assert service1 and not err

    service2, err = ServiceMonitoringService.create_service(
        name='Test Service 2', base_url='http://another.com/v2', owner_id=regular_user.id
    )
    assert service2 and not err

    # Endpoints
    endpoint1, err = ServiceMonitoringService.create_endpoint(
        service_id=service1.id, path='/health', method='GET', expected_status=200, polling_interval_seconds=10
    )
    assert endpoint1 and not err

    endpoint2, err = ServiceMonitoringService.create_endpoint(
        service_id=service1.id, path='/users', method='GET', expected_status=200, polling_interval_seconds=20
    )
    assert endpoint2 and not err

    endpoint3, err = ServiceMonitoringService.create_endpoint(
        service_id=service2.id, path='/status', method='GET', expected_status=200, polling_interval_seconds=15
    )
    assert endpoint3 and not err
    
    # Store initial scheduler jobs (should be added by create_endpoint)
    # This is tricky because APScheduler runs in a separate thread/process normally.
    # For testing, we verify direct interactions. The actual job list can be checked if scheduler is mockable.
    
    yield {
        'admin_user': admin_user,
        'regular_user': regular_user,
        'service1': service1,
        'service2': service2,
        'endpoint1': endpoint1,
        'endpoint2': endpoint2,
        'endpoint3': endpoint3
    }
    
    # Ensure scheduler jobs are cleaned up after test
    from performance_monitor.tasks import remove_endpoint_from_scheduler
    for ep in [endpoint1, endpoint2, endpoint3]:
        remove_endpoint_from_scheduler(ep.id)


def test_create_service(db_session, app, auth_tokens):
    admin_user = auth_tokens['admin_user']
    with app.app_context():
        service, error = ServiceMonitoringService.create_service(
            name='New Service', base_url='http://new.com', owner_id=admin_user.id
        )
        assert service is not None
        assert error is None
        assert service.name == 'New Service'
        assert service.owner_id == admin_user.id

        # Test duplicate name
        service, error = ServiceMonitoringService.create_service(
            name='New Service', base_url='http://duplicate.com', owner_id=admin_user.id
        )
        assert service is None
        assert "Service name already exists." in error

def test_get_service(db_session, app, setup_users_services_endpoints):
    service1 = setup_users_services_endpoints['service1']
    with app.app_context():
        fetched_service = ServiceMonitoringService.get_service(service1.id)
        assert fetched_service is not None
        assert fetched_service.name == 'Test Service 1'

        not_found_service = ServiceMonitoringService.get_service(9999)
        assert not_found_service is None

def test_get_all_services(db_session, app, setup_users_services_endpoints):
    admin_user = setup_users_services_endpoints['admin_user']
    regular_user = setup_users_services_endpoints['regular_user']
    with app.app_context():
        all_services = ServiceMonitoringService.get_all_services()
        assert len(all_services) == 2

        admin_services = ServiceMonitoringService.get_all_services(owner_id=admin_user.id)
        assert len(admin_services) == 1
        assert admin_services[0].name == 'Test Service 1'

        user_services = ServiceMonitoringService.get_all_services(owner_id=regular_user.id)
        assert len(user_services) == 1
        assert user_services[0].name == 'Test Service 2'

def test_update_service(db_session, app, setup_users_services_endpoints):
    service1 = setup_users_services_endpoints['service1']
    with app.app_context():
        # Update name and base_url
        updated_service, error = ServiceMonitoringService.update_service(
            service1.id, {'name': 'Updated Service 1', 'base_url': 'http://updated.com'}
        )
        assert updated_service is not None
        assert error is None
        assert updated_service.name == 'Updated Service 1'
        assert updated_service.base_url == 'http://updated.com'

        # Test duplicate name
        service_for_dupe, _ = ServiceMonitoringService.create_service(
            name='Another Service', base_url='http://another.com', owner_id=service1.owner_id
        )
        updated_service, error = ServiceMonitoringService.update_service(
            service1.id, {'name': 'Another Service'}
        )
        assert updated_service is None
        assert "Service name already exists." in error

        # Test deactivating service and its impact on scheduler
        with patch('performance_monitor.tasks.remove_endpoint_from_scheduler') as mock_remove_job:
            updated_service, error = ServiceMonitoringService.update_service(
                service1.id, {'is_active': False}
            )
            assert updated_service.is_active is False
            assert mock_remove_job.call_count == service1.endpoints.count()

def test_delete_service(db_session, app, setup_users_services_endpoints):
    service1 = setup_users_services_endpoints['service1']
    endpoint1 = setup_users_services_endpoints['endpoint1']
    endpoint2 = setup_users_services_endpoints['endpoint2']
    
    with app.app_context():
        # Add a metric for an endpoint to check cascade delete
        metric = Metric(endpoint_id=endpoint1.id, response_time_ms=100, status_code=200, is_healthy=True)
        db_session.add(metric)
        db_session.commit()
        metric_id = metric.id

        assert Service.query.get(service1.id) is not None
        assert Endpoint.query.get(endpoint1.id) is not None
        assert Metric.query.get(metric_id) is not None

        with patch('performance_monitor.tasks.remove_endpoint_from_scheduler') as mock_remove_job:
            success, error = ServiceMonitoringService.delete_service(service1.id)
            assert success is True
            assert error is None
            assert mock_remove_job.call_count == 2 # endpoint1 and endpoint2

        assert Service.query.get(service1.id) is None
        assert Endpoint.query.get(endpoint1.id) is None
        assert Endpoint.query.get(endpoint2.id) is None
        assert Metric.query.get(metric_id) is None # Ensure cascade delete works for metrics

def test_create_endpoint(db_session, app, setup_users_services_endpoints):
    service1 = setup_users_services_endpoints['service1']
    with app.app_context():
        with patch('performance_monitor.tasks.add_endpoint_to_scheduler') as mock_add_job:
            endpoint, error = ServiceMonitoringService.create_endpoint(
                service_id=service1.id, path='/new', method='POST', expected_status=201, polling_interval_seconds=5
            )
            assert endpoint is not None
            assert error is None
            assert endpoint.service_id == service1.id
            assert endpoint.path == '/new'
            assert endpoint.polling_interval_seconds == 5
            mock_add_job.assert_called_once_with(app, endpoint) # Check if scheduler was called

            # Test duplicate endpoint
            endpoint, error = ServiceMonitoringService.create_endpoint(
                service_id=service1.id, path='/new', method='POST', expected_status=201
            )
            assert endpoint is None
            assert "Endpoint with this path and method already exists" in error

def test_update_endpoint(db_session, app, setup_users_services_endpoints):
    endpoint1 = setup_users_services_endpoints['endpoint1']
    with app.app_context():
        with patch('performance_monitor.tasks.add_endpoint_to_scheduler') as mock_add_job:
            # Update path, method, interval
            updated_endpoint, error = ServiceMonitoringService.update_endpoint(
                endpoint1.id, {'path': '/updated_health', 'method': 'POST', 'polling_interval_seconds': 15}
            )
            assert updated_endpoint is not None
            assert error is None
            assert updated_endpoint.path == '/updated_health'
            assert updated_endpoint.method == 'POST'
            assert updated_endpoint.polling_interval_seconds == 15
            mock_add_job.assert_called_once_with(app, updated_endpoint) # Should be called for updates

        # Test deactivating endpoint
        with patch('performance_monitor.tasks.remove_endpoint_from_scheduler') as mock_remove_job:
            updated_endpoint, error = ServiceMonitoringService.update_endpoint(
                endpoint1.id, {'is_active': False}
            )
            assert updated_endpoint.is_active is False
            mock_remove_job.assert_called_once_with(endpoint1.id)


def test_delete_endpoint(db_session, app, setup_users_services_endpoints):
    endpoint3 = setup_users_services_endpoints['endpoint3']
    with app.app_context():
        # Add a metric for the endpoint
        metric = Metric(endpoint_id=endpoint3.id, response_time_ms=100, status_code=200, is_healthy=True)
        db_session.add(metric)
        db_session.commit()
        metric_id = metric.id

        assert Endpoint.query.get(endpoint3.id) is not None
        assert Metric.query.get(metric_id) is not None

        with patch('performance_monitor.tasks.remove_endpoint_from_scheduler') as mock_remove_job:
            success, error = ServiceMonitoringService.delete_endpoint(endpoint3.id)
            assert success is True
            assert error is None
            mock_remove_job.assert_called_once_with(endpoint3.id)

        assert Endpoint.query.get(endpoint3.id) is None
        assert Metric.query.get(metric_id) is None # Ensure cascade delete works for metrics


@patch('requests.request')
def test_poll_endpoint_and_save_metric_success(mock_requests_request, db_session, app):
    with app.app_context():
        # Setup mock response for requests.request
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b'{"status": "ok"}'
        mock_requests_request.return_value = mock_response

        # Create a dummy service and endpoint
        user = User(username='poll_user', email='poll@example.com')
        user.set_password('pass')
        db_session.add(user)
        db_session.commit()
        service = Service(name='Mock Service', base_url='http://mock.com', owner_id=user.id)
        db_session.add(service)
        db_session.commit()
        endpoint = Endpoint(service_id=service.id, path='/test', method='GET', expected_status=200)
        db_session.add(endpoint)
        db_session.commit()

        # Call the polling function
        poll_endpoint_and_save_metric(app, endpoint.id)

        # Assertions
        mock_requests_request.assert_called_once_with('GET', 'http://mock.com/test', timeout=10)
        
        metrics = Metric.query.filter_by(endpoint_id=endpoint.id).all()
        assert len(metrics) == 1
        metric = metrics[0]
        assert metric.status_code == 200
        assert metric.is_healthy is True
        assert metric.response_time_ms > 0
        assert metric.response_size_bytes == len(mock_response.content)
        assert metric.error_message is None

        updated_endpoint = Endpoint.query.get(endpoint.id)
        assert updated_endpoint.last_polled_at is not None
        assert updated_endpoint.last_status == 200


@patch('requests.request')
def test_poll_endpoint_and_save_metric_failure(mock_requests_request, db_session, app):
    with app.app_context():
        # Setup mock to raise a ConnectionError
        mock_requests_request.side_effect = requests.exceptions.ConnectionError("Failed to connect")

        # Create a dummy service and endpoint
        user = User(username='poll_user2', email='poll2@example.com')
        user.set_password('pass')
        db_session.add(user)
        db_session.commit()
        service = Service(name='Mock Service 2', base_url='http://nonexistent.com', owner_id=user.id)
        db_session.add(service)
        db_session.commit()
        endpoint = Endpoint(service_id=service.id, path='/down', method='GET', expected_status=200)
        db_session.add(endpoint)
        db_session.commit()

        # Call the polling function
        poll_endpoint_and_save_metric(app, endpoint.id)

        # Assertions
        mock_requests_request.assert_called_once_with('GET', 'http://nonexistent.com/down', timeout=10)
        
        metrics = Metric.query.filter_by(endpoint_id=endpoint.id).all()
        assert len(metrics) == 1
        metric = metrics[0]
        assert metric.status_code == 503 # Service Unavailable
        assert metric.is_healthy is False
        assert metric.response_time_ms >= 0 # Time taken before error
        assert "Connection error" in metric.error_message

        updated_endpoint = Endpoint.query.get(endpoint.id)
        assert updated_endpoint.last_polled_at is not None
        assert updated_endpoint.last_status == 503

```