```python
from locust import HttpUser, task, between
import json

class MobileAppBackendUser(HttpUser):
    wait_time = between(1, 2.5) # Users wait between 1 and 2.5 seconds between tasks
    host = "http://localhost:8000" # Replace with your app's actual host if running remotely

    # Store token for authenticated requests
    token = None
    user_id = None
    item_id = None
    order_id = None

    def on_start(self):
        """On start of the user, register and login to get a token."""
        self.register_and_login()
        self.create_item()

    def register_and_login(self):
        # Register a new user for each user instance to avoid conflicts
        email = f"user_{self.environment.runner.user_count}_{self.environment.runner.num_requests}@example.com"
        password = "testpassword123"
        
        # Register user
        reg_response = self.client.post(
            "/api/v1/users/register",
            json={"email": email, "password": password, "full_name": "Locust Test User"},
            name="/api/v1/users/register [register]",
            catch_response=True
        )
        if reg_response.status_code != 201 and "Email already registered" not in reg_response.text:
            reg_response.failure(f"Failed to register user: {reg_response.text}")
            return
        
        # Login to get token
        login_response = self.client.post(
            "/api/v1/users/login",
            data={"username": email, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            name="/api/v1/users/login [login]",
            catch_response=True
        )
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.user_id = login_response.json()["user"]["id"] # Assuming user info is returned
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            login_response.failure(f"Failed to login user: {login_response.text}")

    def create_item(self):
        if not self.token:
            return

        response = self.client.post(
            "/api/v1/items/",
            json={"name": "Locust Item", "description": "Item created by Locust", "price": 99.99},
            name="/api/v1/items/ [create_item]",
            catch_response=True
        )
        if response.status_code == 201:
            self.item_id = response.json()["id"]
        else:
            response.failure(f"Failed to create item: {response.text}")

    @task(5) # 5 times more likely to execute than tasks with weight 1
    def get_me(self):
        if not self.token:
            return
        self.client.get("/api/v1/users/me", name="/api/v1/users/me [get_current_user]")

    @task(3)
    def get_all_items(self):
        self.client.get("/api/v1/items/", name="/api/v1/items/ [get_all_items]")

    @task(2)
    def get_single_item(self):
        if not self.item_id:
            return
        self.client.get(f"/api/v1/items/{self.item_id}", name="/api/v1/items/{item_id} [get_item_by_id]")

    @task(1)
    def create_order(self):
        if not self.token or not self.item_id:
            return

        order_data = {
            "shipping_address": "Locust Address 123",
            "items": [{"item_id": self.item_id, "quantity": 1}]
        }
        response = self.client.post(
            "/api/v1/orders/",
            json=order_data,
            name="/api/v1/orders/ [create_order]",
            catch_response=True
        )
        if response.status_code == 201:
            self.order_id = response.json()["id"]
        else:
            response.failure(f"Failed to create order: {response.text}")

    @task(1)
    def get_my_orders(self):
        if not self.token:
            return
        self.client.get("/api/v1/orders/", name="/api/v1/orders/ [get_my_orders]")

    @task(0.5) # Less frequent
    def update_profile(self):
        if not self.token:
            return
        new_name = f"Locust User {self.environment.runner.user_count}_{self.environment.runner.num_requests}"
        self.client.put(
            "/api/v1/users/me",
            json={"full_name": new_name},
            name="/api/v1/users/me [update_profile]"
        )
```