```python
import pytest
from datetime import datetime, timedelta
from performance_monitor.models import Service, Endpoint, Metric, User
from performance_monitor.extensions import db, cache
from performance_monitor.services.service_monitoring import ServiceMonitoringService
from performance_monitor.services.user_service import UserService

@pytest.fixture
def setup_metrics_for_api(db_session, app, auth_tokens):
    # Clean relevant tables
    db_session.query(Metric).delete()
    db_session.query(Endpoint).delete()
    db_session.query(Service).delete()
    db_session.commit()
    cache.clear()

    admin_user = auth_tokens['admin_user']
    regular_user = auth_tokens['regular_user']

    service1, _ = ServiceMonitoringService.create_service(
        name='Metric Service 1', base_url='http://metricapi1.com', owner_id=admin_user.id
    )
    service2, _ = ServiceMonitoringService.create_service(
        name='Metric Service 2', base_url='http://metricapi2.com', owner_id=regular_user.id
    )

    endpoint1_s1, _ = ServiceMonitoringService.create_endpoint(
        service_id=service1.id, path='/metrics_health', method='GET', expected_status=200
    )
    endpoint1_s2, _ = ServiceMonitoringService.create_endpoint(
        service_id=service2.id, path='/user_metrics', method='GET', expected_status=200
    )

    # Generate some metrics
    now = datetime.utcnow()
    for i in range(100):
        timestamp = now - timedelta(minutes=i)
        
        # For endpoint1_s1 (admin owned), mostly healthy
        is_healthy_s1 = True if i % 10 != 0 else False # 10% unhealthy
        status_s1 = 200 if is_healthy_s1 else 500
        response_time_s1 = 100 if is_healthy_s1 else 500
        error_s1 = None if is_healthy_s1 else "Admin endpoint error"
        db_session.add(Metric(
            endpoint_id=endpoint1_s1.id, response_time_ms=response_time_s1, status_code=status_s1,
            response_size_bytes=1000, timestamp=timestamp, is_healthy=is_healthy_s1, error_message=error_s1
        ))

        # For endpoint1_s2 (user owned), mostly healthy but with some variation
        is_healthy_s2 = True if i % 7 != 0 else False # ~14% unhealthy
        status_s2 = 200 if is_healthy_s2 else 400
        response_time_s2 = 120 if is_healthy_s2 else 600
        error_s2 = None if is_healthy_s2 else "User endpoint error"
        db_session.add(Metric(
            endpoint_id=endpoint1_s2.id, response_time_ms=response_time_s2, status_code=status_s2,
            response_size_bytes=800, timestamp=timestamp, is_healthy=is_healthy_s2, error_message=error_s2
        ))
    db_session.commit()

    return {
        'service1': service1,
        'service2': service2,
        'endpoint1_s1': endpoint1_s1,
        'endpoint1_s2': endpoint1_s2,
        **auth_tokens
    }

def test_get_raw_endpoint_metrics_owner(client, app, setup_metrics_for_api):
    with app.app_context():
        regular_headers = setup_metrics_for_api['regular_headers']
        endpoint = setup_metrics_for_api['endpoint1_s2']
        response = client.get(f'/api/metrics/endpoint/{endpoint.id}/raw?limit=10', headers=regular_headers)
        assert response.status_code == 200
        assert len(response.json) == 10
        assert response.json[0]['endpoint_id'] == endpoint.id
        assert response.json[0]['timestamp'] > response.json[1]['timestamp'] # Check order

def test_get_raw_endpoint_metrics_forbidden(client, app, setup_metrics_for_api):
    with app.app_context():
        regular_headers = setup_metrics_for_api['regular_headers']
        admin_owned_endpoint = setup_metrics_for_api['endpoint1_s1']
        response = client.get(f'/api/metrics/endpoint/{admin_owned_endpoint.id}/raw', headers=regular_headers)
        assert response.status_code == 403
        assert 'You do not own the service for this endpoint' in response.json['message']

def test_get_aggregated_endpoint_metrics_owner(client, app, setup_metrics_for_api):
    with app.app_context():
        regular_headers = setup_metrics_for_api['regular_headers']
        endpoint = setup_metrics_for_api['endpoint1_s2']
        response = client.get(f'/api/metrics/endpoint/{endpoint.id}/aggregated?time_window_minutes=60&group_by_interval_minutes=10', headers=regular_headers)
        assert response.status_code == 200
        assert isinstance(response.json, list)
        assert len(response.json) > 0
        assert 'avg_response_time_ms' in response.json[0]
        assert 'health_percentage' in response.json[0]

def test_get_service_health_overview_owner(client, app, setup_metrics_for_api):
    with app.app_context():
        regular_headers = setup_metrics_for_api['regular_headers']
        service = setup_metrics_for_api['service2']
        response = client.get(f'/api/metrics/service/{service.id}/health-overview?time_window_minutes=30', headers=regular_headers)
        assert response.status_code == 200
        assert isinstance(response.json, list)
        assert len(response.json) == 1 # Only one endpoint for service2
        assert response.json[0]['endpoint_id'] == setup_metrics_for_api['endpoint1_s2'].id
        assert 'latest_is_healthy' in response.json[0]

def test_get_dashboard_overview_admin(client, app, setup_metrics_for_api):
    with app.app_context():
        admin_headers = setup_metrics_for_api['admin_headers']
        response = client.get('/api/metrics/dashboard-overview', headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json, dict)
        assert 'total_services' in response.json
        assert 'overall_health_percentage' in response.json
        assert response.json['total_services'] == 2
        assert response.json['active_monitored_endpoints'] == 2

        # Check for recent unhealthy events (based on fixture data)
        assert len(response.json['recent_unhealthy_events']) > 0
        assert any("Admin endpoint error" in e['error_message'] for e in response.json['recent_unhealthy_events'])
        assert any("User endpoint error" in e['error_message'] for e in response.json['recent_unhealthy_events'])

def test_get_dashboard_overview_regular_user(client, app, setup_metrics_for_api):
    with app.app_context():
        # Regular users can also see the dashboard overview
        regular_headers = setup_metrics_for_api['regular_headers']
        response = client.get('/api/metrics/dashboard-overview', headers=regular_headers)
        assert response.status_code == 200
        assert isinstance(response.json, dict)
        assert response.json['total_services'] == 2

```