from locust import HttpUser, task, between, SequentialTaskSet
import random

class UserBehavior(SequentialTaskSet):
    """
    Simulates a user flow:
    1. Register
    2. Login
    3. View items
    4. Create an order
    5. View their orders
    """
    
    def on_start(self):
        """
        on_start is called when a Locust user starts running.
        Registers a new user and logs in to get auth tokens.
        """
        self.email = f"user_{random.randint(1, 1000000)}@example.com"
        self.password = "MyStrongPassword123"
        self.access_token = None
        self.refresh_token = None
        self.user_id = None
        self.item_ids = []
        self.order_id = None

        self.register_user()
        self.login()

    def register_user(self):
        with self.client.post("/api/v1/auth/register", json={
            "email": self.email,
            "password": self.password,
            "full_name": f"Test User {random.randint(1, 1000)}"
        }, catch_response=True) as response:
            if response.status_code == 201:
                self.user_id = response.json()["id"]
                response.success()
                print(f"Registered user: {self.email}")
            else:
                response.failure(f"Failed to register user: {response.text}")
                self.environment.runner.quit() # Stop if registration fails

    def login(self):
        with self.client.post("/api/v1/auth/login", data={
            "username": self.email,
            "password": self.password
        }, catch_response=True) as response:
            if response.status_code == 200:
                self.access_token = response.json()["access_token"]
                self.refresh_token = response.json()["refresh_token"]
                response.success()
                print(f"Logged in as: {self.email}")
            else:
                response.failure(f"Failed to login: {response.text}")
                self.environment.runner.quit() # Stop if login fails

    @task(3) # Higher weight, users view items more often
    def view_items(self):
        headers = {"Authorization": f"Bearer {self.access_token}"}
        with self.client.get("/api/v1/items", headers=headers, catch_response=True) as response:
            if response.status_code == 200:
                items = response.json().get("data", [])
                if items:
                    self.item_ids = [item["id"] for item in items if item["is_active"] and item["stock_quantity"] > 0]
                response.success()
            else:
                response.failure(f"Failed to view items: {response.text}")

    @task(1) # Lower weight, create order less often
    def create_order(self):
        if not self.item_ids:
            print("No items available to order, skipping create_order.")
            return

        selected_item_id = random.choice(self.item_ids)
        order_items = [{"item_id": selected_item_id, "quantity": random.randint(1, 3)}]

        headers = {"Authorization": f"Bearer {self.access_token}"}
        with self.client.post("/api/v1/orders", headers=headers, json={"items": order_items}, catch_response=True) as response:
            if response.status_code == 201:
                self.order_id = response.json()["id"]
                response.success()
                print(f"Created order {self.order_id} with item {selected_item_id}")
            else:
                response.failure(f"Failed to create order: {response.text}")

    @task(2) # Medium weight
    def view_my_orders(self):
        headers = {"Authorization": f"Bearer {self.access_token}"}
        with self.client.get("/api/v1/orders", headers=headers, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed to view my orders: {response.text}")

    @task(0) # Not part of typical user flow for now
    def refresh_access_token(self):
        if not self.refresh_token:
            return
        
        with self.client.post("/api/v1/auth/refresh-token", json={"refresh_token": self.refresh_token}, catch_response=True) as response:
            if response.status_code == 200:
                self.access_token = response.json()["access_token"]
                self.refresh_token = response.json()["refresh_token"] # Rolling refresh token
                response.success()
                print("Refreshed access token.")
            else:
                response.failure(f"Failed to refresh token: {response.text}")


class WebsiteUser(HttpUser):
    """
    User class that does requests to the locust web server running on localhost, port 8000.
    """
    wait_time = between(1, 5) # Users wait 1 to 5 seconds between tasks
    host = "http://localhost:8000" # Default host, can be overridden by -H CLI arg
    tasks = [UserBehavior]

    # Set up events for custom reporting if needed
    # @events.request.add_listener
    # def my_request_handler(request_type, name, response_time, response_length, response,
    #                        context, exception, start_time, url, **kwargs):
    #     if exception:
    #         print(f"Request to {name} failed with exception {exception}")
    #     else:
    #         print(f"Successfully {request_type} {name} in {response_time}ms")

```