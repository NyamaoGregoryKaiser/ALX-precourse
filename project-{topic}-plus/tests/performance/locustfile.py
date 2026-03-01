```python
from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 5) # Users will wait between 1 and 5 seconds between tasks

    host = "http://localhost:5000" # Replace with your app's host

    def on_start(self):
        """On start of user, log in and get token."""
        self.client.post("/api/auth/register", json={
            "username": "locust_user",
            "email": "locust@example.com",
            "password": "locustpassword"
        })
        response = self.client.post("/api/auth/login", json={
            "email": "locust@example.com",
            "password": "locustpassword"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get some product IDs to use in cart/order tasks
        products_response = self.client.get("/api/products", headers=self.headers)
        if products_response.status_code == 200:
            self.product_ids = [p['id'] for p in products_response.json()['products']]
        else:
            self.product_ids = []
            self.environment.events.request_failure.fire(
                request_type="GET", name="/api/products",
                response_time=0, response_length=0,
                exception=f"Failed to fetch products: {products_response.text}"
            )

    @task(3) # 3 times more likely to run than tasks with no weight
    def get_products(self):
        """Browse products."""
        self.client.get("/api/products", headers=self.headers, name="Get all products")

    @task(2)
    def get_categories(self):
        """Browse categories."""
        self.client.get("/api/categories", headers=self.headers, name="Get all categories")

    @task(1)
    def add_to_cart(self):
        """Add a random product to cart."""
        if not self.product_ids:
            return

        product_id = self.product_ids[0] # Just pick first for simplicity
        self.client.post(f"/api/cart/items", json={
            "product_id": product_id,
            "quantity": 1
        }, headers=self.headers, name="Add item to cart")

    @task(1)
    def view_cart(self):
        """View own cart."""
        self.client.get("/api/cart/", headers=self.headers, name="View cart")

    # Add more tasks as your application grows
    # For example:
    # @task(0.5)
    # def create_order(self):
    #     self.client.post("/api/orders/", json={"shipping_address": "Locust Test Address"}, headers=self.headers, name="Create order")
```
**How to run Locust:**
1.  Install Locust: `pip install locust`
2.  Navigate to the `tests/performance` directory.
3.  Run command: `locust -f locustfile.py`
4.  Open your browser to `http://localhost:8089` (or the port Locust tells you).
5.  Enter the host (e.g., `http://localhost:5000`) and the number of users/spawn rate. Start swarming!