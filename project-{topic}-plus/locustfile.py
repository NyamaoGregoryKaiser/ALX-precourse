```python
from locust import HttpUser, task, between
import random
import json

class PerformanceMonitorUser(HttpUser):
    wait_time = between(1, 5)  # Users wait between 1 and 5 seconds between tasks
    host = "http://localhost:5000" # Default host, override with -H or env var TARGET_HOST

    # Store tokens globally or per user if needed
    auth_tokens = {}
    admin_user_id = None
    regular_user_id = None
    service_ids = []
    endpoint_ids = []

    def on_start(self):
        """Called once per user when the test starts."""
        self.client.headers = {"Content-Type": "application/json"}
        self.login_admin_and_setup_data()
        self.login_regular_user()

    def login_admin_and_setup_data(self):
        """Login as admin and fetch/create necessary data for tests."""
        # Ensure admin user exists (from seed data)
        try:
            register_response = self.client.post("/api/auth/register", json={
                "username": "locust_admin",
                "email": "locust_admin@example.com",
                "password": "locust_password",
                "is_admin": True
            }, catch_response=True)
            if register_response.status_code == 400 and "Username already exists" in register_response.text:
                pass # User already exists
            elif register_response.status_code != 201:
                register_response.failure(f"Admin registration failed: {register_response.text}")
                return

            login_response = self.client.post("/api/auth/login", json={
                "username": "locust_admin",
                "password": "locust_password"
            }, catch_response=True)

            if login_response.status_code == 200:
                self.auth_tokens['admin_access'] = login_response.json()["access_token"]
                self.admin_user_id = self.get_user_id_from_token(self.auth_tokens['admin_access'])
                self.client.headers.update({"Authorization": f"Bearer {self.auth_tokens['admin_access']}"})
                self.fetch_or_create_initial_data()
            else:
                login_response.failure(f"Admin login failed: {login_response.text}")
        except Exception as e:
            print(f"Error during admin setup: {e}")
            self.environment.runner.quit() # Stop test if setup fails

    def login_regular_user(self):
        """Login as a regular user."""
        try:
            register_response = self.client.post("/api/auth/register", json={
                "username": "locust_user",
                "email": "locust_user@example.com",
                "password": "locust_password"
            }, catch_response=True)
            if register_response.status_code == 400 and "Username already exists" in register_response.text:
                pass # User already exists
            elif register_response.status_code != 201:
                register_response.failure(f"User registration failed: {register_response.text}")
                return

            login_response = self.client.post("/api/auth/login", json={
                "username": "locust_user",
                "password": "locust_password"
            }, catch_response=True)

            if login_response.status_code == 200:
                self.auth_tokens['user_access'] = login_response.json()["access_token"]
                self.regular_user_id = self.get_user_id_from_token(self.auth_tokens['user_access'])
            else:
                login_response.failure(f"Regular user login failed: {login_response.text}")
        except Exception as e:
            print(f"Error during regular user setup: {e}")


    def get_user_id_from_token(self, token):
        """Helper to decode JWT and get user ID (simplified for client-side)."""
        import base64
        import json
        try:
            payload = token.split('.')[1]
            decoded = base64.b64decode(payload + '==').decode('utf-8')
            return json.loads(decoded)['identity']
        except Exception:
            return None


    def fetch_or_create_initial_data(self):
        """Fetch existing services/endpoints or create new ones if none exist."""
        # This part assumes admin token is already set in headers
        
        # Fetch services
        services_response = self.client.get("/api/services/", name="/api/services [Admin-Read]", headers={"Authorization": f"Bearer {self.auth_tokens['admin_access']}"})
        if services_response.status_code == 200 and services_response.json():
            self.service_ids = [s['id'] for s in services_response.json()]
            # Fetch endpoints for first service
            if self.service_ids:
                endpoints_response = self.client.get(f"/api/endpoints/service/{self.service_ids[0]}", name="/api/endpoints/service/{id} [Admin-Read]", headers={"Authorization": f"Bearer {self.auth_tokens['admin_access']}"})
                if endpoints_response.status_code == 200 and endpoints_response.json():
                    self.endpoint_ids = [ep['id'] for ep in endpoints_response.json()]
        
        # If no data, create some dummy data
        if not self.service_ids:
            service_data = {
                "name": "Locust Test Service",
                "base_url": "https://jsonplaceholder.typicode.com",
                "description": "Service created by Locust for testing"
            }
            create_service_response = self.client.post("/api/services/", json=service_data, name="/api/services [Admin-Create]", headers={"Authorization": f"Bearer {self.auth_tokens['admin_access']}"})
            if create_service_response.status_code == 201:
                self.service_ids.append(create_service_response.json()['id'])
                endpoint_data = {
                    "service_id": self.service_ids[0],
                    "path": "/posts/1",
                    "method": "GET",
                    "expected_status": 200,
                    "polling_interval_seconds": 30
                }
                create_endpoint_response = self.client.post(f"/api/endpoints/service/{self.service_ids[0]}", json=endpoint_data, name="/api/endpoints/service/{id} [Admin-Create]", headers={"Authorization": f"Bearer {self.auth_tokens['admin_access']}"})
                if create_endpoint_response.status_code == 201:
                    self.endpoint_ids.append(create_endpoint_response.json()['id'])
            
        print(f"Service IDs available: {self.service_ids}")
        print(f"Endpoint IDs available: {self.endpoint_ids}")

    @task(10) # Higher weight for dashboard read
    def get_dashboard_overview(self):
        """Read the system dashboard overview."""
        headers = {"Authorization": f"Bearer {self.auth_tokens.get(random.choice(['admin_access', 'user_access']))}"}
        self.client.get("/api/metrics/dashboard-overview", headers=headers, name="/api/metrics/dashboard-overview")

    @task(5)
    def list_services(self):
        """List services, alternating between admin and regular user."""
        current_user_type = random.choice(['admin_access', 'user_access'])
        headers = {"Authorization": f"Bearer {self.auth_tokens.get(current_user_type)}"}
        self.client.get("/api/services/", headers=headers, name=f"/api/services/ [{current_user_type}-Read]")

    @task(3)
    def get_service_detail_and_health(self):
        """Get details for a random service and its health overview."""
        if not self.service_ids:
            return
        service_id = random.choice(self.service_ids)
        current_user_type = random.choice(['admin_access', 'user_access'])
        headers = {"Authorization": f"Bearer {self.auth_tokens.get(current_user_type)}"}

        self.client.get(f"/api/services/{service_id}", headers=headers, name="/api/services/{id}")
        self.client.get(f"/api/metrics/service/{service_id}/health-overview", headers=headers, name="/api/metrics/service/{id}/health-overview")

    @task(3)
    def get_endpoint_metrics(self):
        """Get raw and aggregated metrics for a random endpoint."""
        if not self.endpoint_ids:
            return
        endpoint_id = random.choice(self.endpoint_ids)
        current_user_type = random.choice(['admin_access', 'user_access'])
        headers = {"Authorization": f"Bearer {self.auth_tokens.get(current_user_type)}"}

        self.client.get(f"/api/metrics/endpoint/{endpoint_id}/raw?limit=10", headers=headers, name="/api/metrics/endpoint/{id}/raw")
        self.client.get(f"/api/metrics/endpoint/{endpoint_id}/aggregated?time_window_minutes=60&group_by_interval_minutes=15", headers=headers, name="/api/metrics/endpoint/{id}/aggregated")

    @task(1) # Lower weight for write operations
    def create_and_delete_endpoint(self):
        """Create a new endpoint and then delete it (admin only)."""
        if not self.service_ids or 'admin_access' not in self.auth_tokens:
            return
        service_id = random.choice(self.service_ids)
        headers = {"Authorization": f"Bearer {self.auth_tokens['admin_access']}"}
        
        new_path = f"/temp_endpoint_{random.randint(1000, 9999)}"
        create_data = {
            "service_id": service_id,
            "path": new_path,
            "method": "GET",
            "expected_status": 200,
            "polling_interval_seconds": 120
        }
        create_response = self.client.post(f"/api/endpoints/service/{service_id}", json=create_data, name="/api/endpoints/service/{id} [Admin-Create-Temp]")
        
        if create_response.status_code == 201:
            new_endpoint_id = create_response.json()['id']
            # Immediately try to delete it
            self.client.delete(f"/api/endpoints/{new_endpoint_id}", name="/api/endpoints/{id} [Admin-Delete-Temp]", headers=headers)
        elif create_response.status_code != 400: # 400 could be a duplicate, which is okay for this test
             create_response.failure(f"Failed to create temp endpoint: {create_response.text}")

```

**5. Documentation**