```python
"""
Locust performance test script for the ALX-Shop API.

This script simulates different types of users interacting with the API:
- `WebsiteUser`: Simulates a general user browsing products.
- `CustomerUser`: Simulates an authenticated customer browsing products and creating orders.
- `AdminUser`: Simulates an authenticated administrator managing products.

To run:
1. Ensure the ALX-Shop API is running (e.g., via `docker-compose up`).
2. Install Locust: `pip install locust`
3. Run Locust from the project root: `locust -f tests/performance/locust_script.py`
4. Open your browser to http://localhost:8089 to access the Locust web UI.
"""

from locust import HttpUser, task, between, SequentialTaskSet
import random
import json

class UserBehavior(SequentialTaskSet):
    """
    Base behavior for users, includes login and general browsing.
    """
    def on_start(self):
        """Called when a Locust user starts executing their tasks."""
        self.email = None
        self.password = "testpassword" # Default password for test users
        self.access_token = None
        self.refresh_token = None
        self.user_id = None

    def login(self, email, password):
        """Performs login and stores tokens."""
        login_data = {"username": email, "password": password}
        response = self.client.post("/api/v1/login", data=login_data,
                                     headers={"Content-Type": "application/x-www-form-urlencoded"},
                                     name="/api/v1/login [POST]")
        if response.status_code == 200:
            self.access_token = response.json()["access_token"]
            self.refresh_token = response.json()["refresh_token"]
            self.email = email
            self.client.headers = {"Authorization": f"Bearer {self.access_token}"}
            print(f"User {email} logged in successfully.")
            # Fetch user ID if needed
            me_response = self.client.get("/api/v1/me", name="/api/v1/me [GET]")
            if me_response.status_code == 200:
                self.user_id = me_response.json().get("id")
        else:
            print(f"Login failed for {email}: {response.text}")
            self.environment.runner.quit() # Stop user if login fails

    @task(3) # Higher weight for browsing products
    def list_products(self):
        """Browse paginated products."""
        limit = random.randint(10, 50)
        skip = random.randint(0, 200)
        self.client.get(f"/api/v1/products?limit={limit}&skip={skip}", name="/api/v1/products?limit=[limit]&skip=[skip] [GET]")

    @task(1)
    def get_random_product(self):
        """Retrieve a specific product by ID."""
        # Assume product IDs 1-10 exist from seed data
        product_id = random.randint(1, 10)
        self.client.get(f"/api/v1/products/{product_id}", name="/api/v1/products/[id] [GET]")

    @task(1)
    def health_check(self):
        """Perform a health check."""
        self.client.get("/api/v1/healthcheck", name="/api/v1/healthcheck [GET]")

class WebsiteUser(HttpUser):
    """
    Represents a typical user browsing the website without logging in.
    """
    wait_time = between(1, 5) # User waits between 1 and 5 seconds between tasks
    tasks = [UserBehavior]
    host = "http://localhost:8000" # Replace with your API host

class CustomerTasks(UserBehavior):
    """
    Tasks for an authenticated customer.
    """
    def on_start(self):
        super().on_start()
        # Use a list of pre-registered customer emails
        customer_emails = ["customer1@alx.com", "customer2@alx.com", "customer@alx.com"]
        self.login(random.choice(customer_emails), self.password)

    @task(5)
    def list_my_orders(self):
        """Customer lists their own orders."""
        if self.access_token:
            self.client.get(f"/api/v1/orders?user_id={self.user_id}", name="/api/v1/orders [GET]")

    @task(3)
    def create_order(self):
        """Customer creates a new order."""
        if self.access_token:
            # Assume product IDs 1-5 exist for ordering
            items = []
            for _ in range(random.randint(1, 3)): # Order 1-3 unique items
                product_id = random.randint(1, 5)
                quantity = random.randint(1, 2)
                # In a real test, you'd fetch product details to get current price
                # For simplicity, use a dummy price here or fetch from a pre-loaded list
                items.append({"product_id": product_id, "quantity": quantity, "price_at_purchase": 100.0})

            # Calculate total_price placeholder (ideally done by backend or pre-fetched in test)
            total_price = sum(item["quantity"] * item["price_at_purchase"] for item in items)

            order_data = {
                "items": items,
                "shipping_address": "123 Test St, Test City"
            }
            self.client.post("/api/v1/orders", json=order_data, name="/api/v1/orders [POST]")

    @task(1)
    def get_my_profile(self):
        """Customer gets their own profile."""
        if self.access_token:
            self.client.get("/api/v1/me", name="/api/v1/me [GET]")

class CustomerUser(HttpUser):
    """
    Represents an authenticated customer.
    """
    wait_time = between(2, 8)
    tasks = [CustomerTasks]
    host = "http://localhost:8000" # Replace with your API host

class AdminTasks(UserBehavior):
    """
    Tasks for an authenticated administrator.
    """
    def on_start(self):
        super().on_start()
        self.login("admin@alx.com", self.password) # Use default admin credentials

    @task(5)
    def list_all_products_admin(self):
        """Admin lists all products (same as customer, but using admin token)."""
        if self.access_token:
            self.client.get("/api/v1/products", name="/api/v1/products [ADMIN GET]")

    @task(3)
    def create_product_admin(self):
        """Admin creates a new product."""
        if self.access_token:
            product_data = {
                "name": f"LoadTestProduct-{random.randint(1000, 9999)}",
                "description": "Product created by load test",
                "price": round(random.uniform(10.0, 1000.0), 2),
                "stock": random.randint(1, 100),
                "is_active": True
            }
            self.client.post("/api/v1/products", json=product_data, name="/api/v1/products [ADMIN POST]")

    @task(2)
    def list_all_users_admin(self):
        """Admin lists all users."""
        if self.access_token:
            self.client.get("/api/v1/users", name="/api/v1/users [ADMIN GET]")

    @task(1)
    def list_all_orders_admin(self):
        """Admin lists all orders."""
        if self.access_token:
            self.client.get("/api/v1/orders", name="/api/v1/orders [ADMIN GET]")


class AdminUser(HttpUser):
    """
    Represents an authenticated administrator.
    """
    wait_time = between(3, 10)
    tasks = [AdminTasks]
    host = "http://localhost:8000" # Replace with your API host

```