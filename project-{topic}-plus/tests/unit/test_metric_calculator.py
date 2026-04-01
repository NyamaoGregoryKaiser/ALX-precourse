```python
import pytest
from datetime import datetime, timedelta
from performance_monitor.services.metric_service import MetricService
from performance_monitor.models import Metric, Endpoint, Service
from performance_monitor.extensions import db

@pytest.fixture
def setup_metrics(db_session, app):
    with app.app_context():
        # Create a dummy service and endpoint
        service = Service(name="Test Service", base_url="http://test.com", owner_id=1)
        db_session.add(service)
        db_session.commit()

        endpoint = Endpoint(service_id=service.id, path="/test", method="GET", expected_status=200, polling_interval_seconds=60)
        db_session.add(endpoint)
        db_session.commit()

        now = datetime.utcnow()
        metrics_data = []

        # Generate metrics for 3 hours, every 5 minutes
        for i in range(0, 3 * 60, 5): # 3 hours * 60 minutes/hour / 5 minutes interval
            ts = now - timedelta(minutes=i)
            # Simulate some healthy, some unhealthy
            if i % 30 == 0: # Every 30 mins, make it unhealthy
                metrics_data.append(Metric(
                    endpoint_id=endpoint.id,
                    response_time_ms=random.randint(500, 1000),
                    status_code=500,
                    response_size_bytes=100,
                    timestamp=ts,
                    is_healthy=False,
                    error_message="Simulated error"
                ))
            else:
                metrics_data.append(Metric(
                    endpoint_id=endpoint.id,
                    response_time_ms=random.randint(50, 200),
                    status_code=200,
                    response_size_bytes=200,
                    timestamp=ts,
                    is_healthy=True,
                    error_message=None
                ))
        db_session.add_all(metrics_data)
        db_session.commit()
        return endpoint, service

def test_get_metrics_for_endpoint(db_session, app, setup_metrics):
    endpoint, _ = setup_metrics
    with app.app_context():
        metrics = MetricService.get_metrics_for_endpoint(endpoint.id, limit=5)
        assert len(metrics) == 5
        assert metrics[0].timestamp > metrics[1].timestamp # Ordered by timestamp descending

        # Test with time range
        end_time = datetime.utcnow() - timedelta(minutes=60) # Last 60 mins from now (approx)
        start_time = end_time - timedelta(minutes=60) # 60 mins before that
        metrics_in_range = MetricService.get_metrics_for_endpoint(endpoint.id, start_time=start_time, end_time=end_time)
        
        # Verify timestamps are within range (approx, as seeding time is random within interval)
        for m in metrics_in_range:
            assert start_time <= m.timestamp <= end_time
        
        # Check that it returns at least some metrics
        assert len(metrics_in_range) > 0

def test_get_latest_metric_for_endpoint(db_session, app, setup_metrics):
    endpoint, _ = setup_metrics
    with app.app_context():
        latest_metric = MetricService.get_latest_metric_for_endpoint(endpoint.id)
        assert latest_metric is not None
        # Verify it's indeed the latest (by checking against all metrics for that endpoint)
        all_metrics = Metric.query.filter_by(endpoint_id=endpoint.id).order_by(Metric.timestamp.desc()).first()
        assert latest_metric.id == all_metrics.id

def test_get_aggregated_metrics_for_endpoint(db_session, app, setup_metrics):
    endpoint, _ = setup_metrics
    with app.app_context():
        # Get aggregated metrics for last 60 minutes, grouped by 10 minutes
        aggregated_data = MetricService.get_aggregated_metrics_for_endpoint(
            endpoint.id, time_window_minutes=60, group_by_interval_minutes=10
        )
        assert isinstance(aggregated_data, list)
        assert len(aggregated_data) > 0 # Should have some buckets
        
        first_bucket = aggregated_data[0]
        assert 'time_bucket' in first_bucket
        assert 'avg_response_time_ms' in first_bucket
        assert 'health_percentage' in first_bucket
        assert first_bucket['health_percentage'] >= 0 and first_bucket['health_percentage'] <= 100

        # Check for expected number of buckets (approx 60/10 = 6 buckets + potentially partial current bucket)
        # Note: Depending on exact timestamps and how `func.floor` works, this can vary slightly
        # It's more important that the data structure is correct and values are plausible.
        assert len(aggregated_data) <= (60 / 10) + 1 # Max 7 buckets for 60 mins

        # Verify a specific bucket's health (e.g., if we forced an unhealthy one)
        # This requires more precise knowledge of generated data. For now, check general structure.
        # Example check: sum of healthy_count and total_count
        for bucket in aggregated_data:
            assert bucket['avg_response_time_ms'] is not None
            assert bucket['health_percentage'] is not None
            assert bucket['min_response_time_ms'] is not None
            assert bucket['max_response_time_ms'] is not None

def test_get_service_health_overview(db_session, app, setup_metrics):
    endpoint, service = setup_metrics
    with app.app_context():
        # Create another endpoint for the same service
        endpoint2 = Endpoint(service_id=service.id, path="/another", method="POST", expected_status=201, polling_interval_seconds=60)
        db_session.add(endpoint2)
        
        # Add a recent unhealthy metric for endpoint2
        db_session.add(Metric(
            endpoint_id=endpoint2.id,
            response_time_ms=1200, status_code=500, response_size_bytes=100,
            timestamp=datetime.utcnow() - timedelta(minutes=5), is_healthy=False,
            error_message="Simulated error for endpoint2"
        ))
        # Add a recent healthy metric for endpoint
        db_session.add(Metric(
            endpoint_id=endpoint.id,
            response_time_ms=150, status_code=200, response_size_bytes=200,
            timestamp=datetime.utcnow() - timedelta(minutes=2), is_healthy=True,
            error_message=None
        ))
        db_session.commit()

        overview = MetricService.get_service_health_overview(service.id, time_window_minutes=10)
        
        assert isinstance(overview, list)
        assert len(overview) == 2 # Should include both endpoints
        
        # Check properties of each item
        ep1_data = next((item for item in overview if item['endpoint_id'] == endpoint.id), None)
        ep2_data = next((item for item in overview if item['endpoint_id'] == endpoint2.id), None)

        assert ep1_data is not None
        assert ep1_data['latest_is_healthy'] is True
        assert ep1_data['latest_status_code'] == 200

        assert ep2_data is not None
        assert ep2_data['latest_is_healthy'] is False
        assert ep2_data['latest_status_code'] == 500

def test_get_system_dashboard_overview(db_session, app, setup_metrics):
    endpoint, service = setup_metrics
    with app.app_context():
        # Clear cache before testing this, as it uses cache
        from performance_monitor.extensions import cache
        cache.clear()

        # Create another service and endpoint for total counts
        user_for_service = User(username='test_owner', email='test_owner@example.com')
        user_for_service.set_password('pass')
        db_session.add(user_for_service)
        db_session.commit()

        service2 = Service(name="Another Service", base_url="http://another.com", owner_id=user_for_service.id)
        db_session.add(service2)
        db_session.commit()

        endpoint_s2 = Endpoint(service_id=service2.id, path="/health", method="GET", expected_status=200, polling_interval_seconds=60)
        db_session.add(endpoint_s2)
        db_session.add(Metric(
            endpoint_id=endpoint_s2.id, response_time_ms=50, status_code=200, response_size_bytes=100,
            timestamp=datetime.utcnow(), is_healthy=True, error_message=None
        ))
        db_session.commit()

        overview = MetricService.get_system_dashboard_overview(time_window_minutes=10)
        
        assert isinstance(overview, dict)
        assert overview['total_services'] == 2
        assert overview['active_services'] == 2
        assert overview['total_endpoints'] == 2 # endpoint + endpoint_s2
        assert overview['active_monitored_endpoints'] == 2
        
        # Check health counts. Since we added one healthy for each, total 2 healthy.
        assert overview['healthy_endpoints_in_window'] == 2
        assert overview['unhealthy_endpoints_in_window'] == 0 # Based on how fixture data is generated and recent additions.
        assert overview['overall_health_percentage'] == 100.0
        assert isinstance(overview['recent_unhealthy_events'], list)

        # Test with an unhealthy endpoint to ensure it shows in recent events
        db_session.add(Metric(
            endpoint_id=endpoint.id, response_time_ms=1500, status_code=500, response_size_bytes=100,
            timestamp=datetime.utcnow() - timedelta(minutes=1), is_healthy=False,
            error_message="Simulated dashboard error"
        ))
        db_session.commit()
        
        cache.clear() # Clear cache to fetch new data
        overview_with_unhealthy = MetricService.get_system_dashboard_overview(time_window_minutes=10)
        assert overview_with_unhealthy['unhealthy_endpoints_in_window'] == 1
        assert overview_with_unhealthy['overall_health_percentage'] < 100
        assert len(overview_with_unhealthy['recent_unhealthy_events']) >= 1
        assert overview_with_unhealthy['recent_unhealthy_events'][0]['error_message'] == "Simulated dashboard error"

```