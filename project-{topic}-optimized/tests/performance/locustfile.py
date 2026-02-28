from locust import HttpUser, task, between, events
import json

# Global variable to store auth token
auth_token = None

@events.init.add_listener
def _(environment, **kwargs):
    # This runs once when Locust starts
    print("Performing initial login to get admin token for all users...")
    with environment.get_context().client.post("/api/auth/login", json={"email": "admin@example.com", "password": "adminpass123"}) as response:
        if response.status_code == 200:
            global auth_token
            auth_token = response.json().get("access_token")
            print("Admin token obtained.")
        else:
            print(f"Failed to get admin token: {response.text}")
            environment.runner.quit()

class MobileAppUser(HttpUser):
    wait_time = between(1, 5)  # Users wait between 1 and 5 seconds between tasks
    host = "http://localhost:5000" # Change this to your deployed host

    # Define common headers, including authorization if logged in
    def on_start(self):
        """ on_start is called when a Locust user starts before any task is executed. """
        self.headers = {"Content-Type": "application/json"}
        if auth_token:
            self.headers["Authorization"] = f"Bearer {auth_token}"
        else:
            print("Warning: Admin token not available. Some tasks might fail.")
        
        # Optionally, each user could log in to get their own token
        # For simplicity, we'll use a single admin token for all users in this example.
        # In a real scenario, you'd likely register/login multiple users.

    @task(3) # 3 times more likely to be picked
    def get_products(self):
        """
        Simulates fetching a list of products.
        Includes optional pagination and search.
        """
        self.client.get("/api/products/?page=1&per_page=10", headers=self.headers, name="/api/products [GET list]")

    @task(1)
    def get_specific_product(self):
        """
        Simulates fetching a specific product by ID.
        Assumes product with ID 1 exists from seed data.
        """
        self.client.get("/api/products/1", headers=self.headers, name="/api/products/{id} [GET detail]")

    @task(2)
    def get_categories(self):
        """
        Simulates fetching a list of categories.
        """
        self.client.get("/api/categories/", headers=self.headers, name="/api/categories [GET list]")

    @task(1)
    def create_order(self):
        """
        Simulates a customer creating an order.
        Requires authentication.
        Assumes product with ID 1 exists.
        """
        if not auth_token: # Assuming initial login was for admin, and we want a customer user for orders
            # For a true customer order, you'd need a separate customer login or dynamic customer creation.
            # This is a simplification for demonstration.
            print("Skipping create_order: No valid token for a customer user.")
            return

        # Attempt to get a real product ID (or use a known one)
        product_id_to_order = 1
        
        # Fetch current product stock (ideally this would be a separate task, not part of order creation)
        product_response = self.client.get(f"/api/products/{product_id_to_order}", headers=self.headers, catch_response=True)
        if product_response.status_code == 200:
            product_data = product_response.json()
            if product_data.get('stock_quantity', 0) > 0:
                quantity = 1 # Order 1 item
                order_data = {
                    "shipping_address": "123 Locust Street, Test City, TS 12345",
                    "billing_address": "123 Locust Street, Test City, TS 12345",
                    "items": [
                        {"product_id": product_id_to_order, "quantity": quantity}
                    ]
                }
                self.client.post("/api/orders/", json=order_data, headers=self.headers, name="/api/orders [POST create]")
            else:
                product_response.failure(f"Product {product_id_to_order} out of stock for order.")
        else:
            product_response.failure(f"Failed to get product {product_id_to_order} for order.")

    @task(1)
    def get_my_orders(self):
        """
        Simulates a user fetching their own orders.
        Requires authentication.
        """
        if auth_token:
            self.client.get("/api/orders/", headers=self.headers, name="/api/orders [GET my orders]")
        else:
            self.client.get("/api/auth/login", name="[GET my orders] skip - not authenticated")


    @task(0) # Task with weight 0, meaning it's only called if specified or by on_start/on_stop logic
    def admin_create_product(self):
        """
        Simulates an admin creating a product.
        Requires ADMIN role.
        """
        if auth_token and "ADMIN" in self.headers.get("Authorization", ""): # Crude check for admin token
            product_data = {
                "name": f"LoadTestProduct-{self.environment.stats.num_requests}",
                "description": "Product created during load test",
                "price": 10.00,
                "stock_quantity": 100,
                "category_id": 1 # Assumes category with ID 1 exists
            }
            self.client.post("/api/products/", json=product_data, headers=self.headers, name="/api/products [POST admin create]")
        else:
            print("Skipping admin_create_product: Not admin or token missing.")
            self.client.get("/api/auth/login", name="[POST admin create] skip - not admin") # Mark as skipped