# === tests/performance/test_locust.py ===
from locust import HttpUser, task, between

class ECommerceUser(HttpUser):
    wait_time = between(1, 2.5) # Users wait between 1 and 2.5 seconds between tasks

    # Base URL for local development. For Docker compose, it would be 'web:5000'
    host = "http://localhost:5000" 

    def on_start(self):
        """ on_start is called when a Locust user starts running """
        self.client.post("/api/auth/register", json={"username":"testuser_locust", "email":"locust@example.com", "password":"password123"})
        response = self.client.post("/api/auth/login", json={"email":"locust@example.com", "password":"password123"})
        if response.status_code == 200:
            self.token = response.json().get('access_token')
            self.client.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            print(f"Login failed for Locust user: {response.text}")
            self.token = None

    @task(3)
    def view_products(self):
        """ Simulate viewing the product list """
        self.client.get("/api/products/products", name="View all products")

    @task(1)
    def view_product_detail(self):
        """ Simulate viewing a specific product detail """
        product_ids = [1, 2, 3, 4, 5] # Assume these product IDs exist from seeding
        product_id = self.environment.random.choice(product_ids)
        self.client.get(f"/api/products/products/{product_id}", name="View product detail")

    @task(2)
    def add_to_cart(self):
        """ Simulate adding a product to the cart """
        if not self.token:
            return

        product_ids = [1, 2, 3] # Assume these product IDs exist and are purchasable
        product_id = self.environment.random.choice(product_ids)
        quantity = self.environment.random.randint(1, 3)
        self.client.post("/api/cart", json={"product_id": product_id, "quantity": quantity}, name="Add to cart")

    @task(1)
    def view_cart(self):
        """ Simulate viewing the cart """
        if not self.token:
            return
        self.client.get("/api/cart", name="View cart")
    
    @task(1)
    def place_order(self):
        """ Simulate placing an order """
        if not self.token:
            return

        # Ensure cart has items before placing order
        self.client.post("/api/cart", json={"product_id": 1, "quantity": 1}, name="Add to cart for order", catch_response=True) # Ensure product 1 exists
        
        self.client.post("/api/orders", json={"shipping_address": "123 Locust Street, Test City, TS 12345"}, name="Place order")

# To run:
# 1. Ensure your Flask app is running (e.g., `docker-compose up`).
# 2. Install locust: `pip install locust`
# 3. Navigate to the `ecommerce_system` directory.
# 4. Run `locust -f tests/performance/test_locust.py`
# 5. Open http://localhost:8089 in your browser.