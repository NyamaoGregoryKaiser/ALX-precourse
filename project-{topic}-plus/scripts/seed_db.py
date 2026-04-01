```python
import os
from datetime import datetime, timedelta
import random
import requests
import json
import time

# Set FLASK_APP and FLASK_CONFIG environment variables for the app factory
os.environ['FLASK_CONFIG'] = 'development'
os.environ['FLASK_APP'] = 'run.py' # Assuming your app factory is in run.py

from performance_monitor import create_app
from performance_monitor.extensions import db
from performance_monitor.models import User, Service, Endpoint, Metric
from performance_monitor.services.user_service import UserService
from performance_monitor.services.service_monitoring import ServiceMonitoringService
from performance_monitor.tasks import add_endpoint_to_scheduler # Import for adding to scheduler

def seed_data():
    app = create_app(os.getenv('FLASK_CONFIG'))

    with app.app_context():
        print("Seeding database...")
        db.create_all() # Ensure tables exist (will not re-create if they do)

        # Clear existing data (optional, for fresh seed)
        # db.session.query(Metric).delete()
        # db.session.query(Endpoint).delete()
        # db.session.query(Service).delete()
        # db.session.query(User).delete()
        # db.session.commit()
        # print("Cleared existing data.")

        # --- Create Users ---
        admin_user = User.query.filter_by(username='admin').first()
        if not admin_user:
            admin_user, err = UserService.create_user('admin', 'admin@example.com', 'admin_password', is_admin=True)
            if err:
                print(f"Error creating admin: {err}")
            else:
                print(f"Created admin user: {admin_user.username}")
        else:
            print(f"Admin user '{admin_user.username}' already exists.")

        test_user = User.query.filter_by(username='testuser').first()
        if not test_user:
            test_user, err = UserService.create_user('testuser', 'test@example.com', 'test_password')
            if err:
                print(f"Error creating testuser: {err}")
            else:
                print(f"Created test user: {test_user.username}")
        else:
            print(f"Test user '{test_user.username}' already exists.")

        # --- Create Services ---
        service1 = Service.query.filter_by(name='Mock API Service 1').first()
        if not service1:
            service1, err = ServiceMonitoringService.create_service(
                name='Mock API Service 1',
                base_url='https://jsonplaceholder.typicode.com',
                owner_id=admin_user.id,
                description='A free fake API for testing and prototyping.'
            )
            if err:
                print(f"Error creating service: {err}")
            else:
                print(f"Created service: {service1.name}")
        else:
            print(f"Service '{service1.name}' already exists.")

        service2 = Service.query.filter_by(name='Mock API Service 2').first()
        if not service2:
            service2, err = ServiceMonitoringService.create_service(
                name='Mock API Service 2',
                base_url='https://mock-api.example.com', # Placeholder for a non-existent service
                owner_id=test_user.id,
                description='A hypothetical mock API for demonstrating unhealthy states.'
            )
            if err:
                print(f"Error creating service: {err}")
            else:
                print(f"Created service: {service2.name}")
        else:
            print(f"Service '{service2.name}' already exists.")

        # --- Create Endpoints ---
        # Endpoints for Service 1
        endpoints_s1_data = [
            ('/posts/1', 'GET', 200, 30),
            ('/users/1', 'GET', 200, 60),
            ('/comments', 'GET', 200, 90),
            ('/nonexistent', 'GET', 404, 45) # Expecting 404
        ]
        for path, method, expected_status, interval in endpoints_s1_data:
            endpoint = Endpoint.query.filter_by(service_id=service1.id, path=path, method=method).first()
            if not endpoint:
                endpoint, err = ServiceMonitoringService.create_endpoint(
                    service_id=service1.id,
                    path=path,
                    method=method,
                    expected_status=expected_status,
                    polling_interval_seconds=interval
                )
                if err:
                    print(f"Error creating endpoint {path} for {service1.name}: {err}")
                else:
                    print(f"Created endpoint: {endpoint.get_full_url()}")
            else:
                print(f"Endpoint '{endpoint.get_full_url()}' already exists.")
                # Ensure it's active and scheduled if it exists but wasn't running
                if endpoint.is_active and service1.is_active:
                    add_endpoint_to_scheduler(app, endpoint)


        # Endpoints for Service 2 (to demonstrate unhealthy)
        endpoints_s2_data = [
            ('/health', 'GET', 200, 30), # Will be unhealthy as base_url is fake
            ('/status', 'GET', 200, 60)
        ]
        for path, method, expected_status, interval in endpoints_s2_data:
            endpoint = Endpoint.query.filter_by(service_id=service2.id, path=path, method=method).first()
            if not endpoint:
                endpoint, err = ServiceMonitoringService.create_endpoint(
                    service_id=service2.id,
                    path=path,
                    method=method,
                    expected_status=expected_status,
                    polling_interval_seconds=interval
                )
                if err:
                    print(f"Error creating endpoint {path} for {service2.name}: {err}")
                else:
                    print(f"Created endpoint: {endpoint.get_full_url()}")
            else:
                print(f"Endpoint '{endpoint.get_full_url()}' already exists.")
                # Ensure it's active and scheduled if it exists but wasn't running
                if endpoint.is_active and service2.is_active:
                    add_endpoint_to_scheduler(app, endpoint)


        # --- Populate some historical metrics (optional) ---
        print("Generating historical metrics (this may take a moment)...")
        endpoints = Endpoint.query.all()
        for endpoint in endpoints:
            # Simulate polls for the last 24 hours
            current_time = datetime.utcnow()
            for i in range(24 * 60 // endpoint.polling_interval_seconds): # approx one day of metrics
                poll_time = current_time - timedelta(seconds=i * endpoint.polling_interval_seconds + random.randint(0, 5))
                
                # Simulate varying health/response times
                if "jsonplaceholder" in endpoint.service.base_url:
                    if endpoint.path == "/nonexistent":
                        status_code = 404
                        is_healthy = True # Healthy if expected is 404
                        response_time = random.randint(50, 200)
                        error = None
                    else:
                        status_code = 200
                        is_healthy = True
                        response_time = random.randint(50, 300)
                        error = None
                        if random.random() < 0.05: # 5% chance of being slow/unhealthy
                            status_code = random.choice([500, 503, 400])
                            is_healthy = False
                            response_time = random.randint(500, 2000)
                            error = f"Simulated error: Status {status_code}"
                else: # For mock-api.example.com, mostly unhealthy
                    status_code = 503
                    is_healthy = False
                    response_time = random.randint(500, 3000)
                    error = "Simulated connection error."
                    if random.random() < 0.1: # 10% chance it briefly works
                        status_code = 200
                        is_healthy = True
                        response_time = random.randint(100, 400)
                        error = None
                
                metric = Metric(
                    endpoint_id=endpoint.id,
                    response_time_ms=response_time,
                    status_code=status_code,
                    response_size_bytes=random.randint(100, 5000), # Dummy size
                    timestamp=poll_time,
                    is_healthy=is_healthy,
                    error_message=error
                )
                db.session.add(metric)
        db.session.commit()
        print("Historical metrics generated.")


        print("Database seeding complete!")
        print("\nAdmin Credentials:")
        print(f"  Username: {admin_user.username}")
        print(f"  Password: admin_password")
        print("\nTest User Credentials:")
        print(f"  Username: {test_user.username}")
        print(f"  Password: test_password")
        print("\nRemember to run `docker-compose up` to start the services (app, db, redis) and then access the UI.")
        print(f"You can access the API docs at http://localhost:5000/api/docs (or your configured port).")
        print(f"The frontend UI is at http://localhost:5000 (or your configured port).")


if __name__ == '__main__':
    seed_data()

```

**3. Configuration & Setup**