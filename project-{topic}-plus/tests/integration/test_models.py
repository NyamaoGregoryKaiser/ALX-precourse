```python
import pytest
from performance_monitor.extensions import db
from performance_monitor.models import User, Service, Endpoint, Metric
from datetime import datetime, timedelta

def test_user_creation_and_password(db_session, app):
    with app.app_context():
        user = User(username='test_user', email='test@example.com')
        user.set_password('password123')
        db_session.add(user)
        db_session.commit()

        retrieved_user = User.query.filter_by(username='test_user').first()
        assert retrieved_user is not None
        assert retrieved_user.email == 'test@example.com'
        assert retrieved_user.check_password('password123')
        assert not retrieved_user.is_admin
        assert isinstance(retrieved_user.created_at, datetime)
        assert isinstance(retrieved_user.updated_at, datetime)

def test_service_creation_and_relationship(db_session, app):
    with app.app_context():
        user = User(username='service_owner', email='owner@example.com')
        user.set_password('password')
        db_session.add(user)
        db_session.commit()

        service = Service(name='My Service', base_url='http://myapi.com', owner=user)
        db_session.add(service)
        db_session.commit()

        retrieved_service = Service.query.filter_by(name='My Service').first()
        assert retrieved_service is not None
        assert retrieved_service.base_url == 'http://myapi.com'
        assert retrieved_service.owner == user
        assert retrieved_service.owner_id == user.id
        assert retrieved_service in user.services.all()

def test_endpoint_creation_and_relationship(db_session, app):
    with app.app_context():
        user = User(username='ep_owner', email='ep@example.com')
        user.set_password('password')
        db_session.add(user)

        service = Service(name='EP Service', base_url='http://epapi.com', owner=user)
        db_session.add(service)
        db_session.commit()

        endpoint = Endpoint(service=service, path='/health', method='GET', expected_status=200, polling_interval_seconds=30)
        db_session.add(endpoint)
        db_session.commit()

        retrieved_endpoint = Endpoint.query.filter_by(path='/health').first()
        assert retrieved_endpoint is not None
        assert retrieved_endpoint.service == service
        assert retrieved_endpoint.service_id == service.id
        assert retrieved_endpoint.get_full_url() == 'http://epapi.com/health'
        assert retrieved_endpoint in service.endpoints.all()

        # Test unique constraint for (service_id, path, method)
        with pytest.raises(Exception): # Expect a DB integrity error
            duplicate_endpoint = Endpoint(service=service, path='/health', method='GET', expected_status=200, polling_interval_seconds=30)
            db_session.add(duplicate_endpoint)
            db_session.commit()
        db_session.rollback() # Rollback the failed transaction

        # Should be able to add with different method
        different_method_endpoint = Endpoint(service=service, path='/health', method='POST', expected_status=201, polling_interval_seconds=60)
        db_session.add(different_method_endpoint)
        db_session.commit()
        assert different_method_endpoint.id is not None

def test_metric_creation_and_relationship(db_session, app):
    with app.app_context():
        user = User(username='metric_owner', email='metric@example.com')
        user.set_password('password')
        db_session.add(user)

        service = Service(name='Metric Service', base_url='http://metricapi.com', owner=user)
        db_session.add(service)
        db_session.commit()

        endpoint = Endpoint(service=service, path='/status', method='GET', expected_status=200, polling_interval_seconds=60)
        db_session.add(endpoint)
        db_session.commit()

        now = datetime.utcnow()
        metric = Metric(
            endpoint=endpoint,
            response_time_ms=150,
            status_code=200,
            response_size_bytes=1024,
            timestamp=now,
            is_healthy=True,
            error_message=None
        )
        db_session.add(metric)
        db_session.commit()

        retrieved_metric = Metric.query.filter_by(endpoint=endpoint).first()
        assert retrieved_metric is not None
        assert retrieved_metric.endpoint_id == endpoint.id
        assert retrieved_metric.response_time_ms == 150
        assert retrieved_metric.status_code == 200
        assert retrieved_metric.response_size_bytes == 1024
        assert retrieved_metric.is_healthy is True
        assert retrieved_metric in endpoint.metrics.all()

        # Check timestamp default/type
        assert isinstance(retrieved_metric.timestamp, datetime)
        assert (now - retrieved_metric.timestamp) < timedelta(seconds=1) # Should be very close

def test_cascade_delete(db_session, app):
    with app.app_context():
        user = User(username='cascade_owner', email='cascade@example.com')
        user.set_password('password')
        db_session.add(user)
        db_session.commit()

        service = Service(name='Cascade Service', base_url='http://cascade.com', owner=user)
        db_session.add(service)
        db_session.commit()

        endpoint = Endpoint(service=service, path='/test', method='GET', expected_status=200)
        db_session.add(endpoint)
        db_session.commit()

        metric = Metric(endpoint=endpoint, response_time_ms=100, status_code=200, is_healthy=True)
        db_session.add(metric)
        db_session.commit()

        endpoint_id = endpoint.id
        metric_id = metric.id

        # Delete service and check if endpoint and metric are deleted
        db_session.delete(service)
        db_session.commit()

        assert Endpoint.query.get(endpoint_id) is None
        assert Metric.query.get(metric_id) is None

```