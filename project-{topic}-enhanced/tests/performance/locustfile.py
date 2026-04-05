```python
from locust import HttpUser, task, between
import uuid

class PaymentProcessorUser(HttpUser):
    wait_time = between(1, 5) # Users wait between 1 and 5 seconds between tasks
    host = "http://localhost:8000" # Replace with your application host

    _admin_token = None
    _merchant_token = None
    _merchant_id = None
    _api_key = None

    def on_start(self):
        """Called once per user when the test starts."""
        self.login_admin()
        self.login_merchant_and_setup_merchant()

    def login_admin(self):
        # Admin login (for setup/monitoring if needed)
        response = self.client.post("/api/v1/auth/token", data={"username": "admin", "password": "adminpassword"})
        if response.status_code == 200:
            self._admin_token = response.json()["access_token"]
            print("Admin logged in successfully.")
        else:
            print(f"Admin login failed: {response.text}")
    
    def login_merchant_and_setup_merchant(self):
        # Merchant login
        response = self.client.post("/api/v1/auth/token", data={"username": "merchant_user", "password": "merchantpassword"})
        if response.status_code == 200:
            self._merchant_token = response.json()["access_token"]
            print("Merchant logged in successfully.")
            
            # Assuming the merchant is already created by seed_db.py
            # Fetch merchant details including ID and API key
            headers = {"Authorization": f"Bearer {self._merchant_token}"}
            merchant_response = self.client.get("/api/v1/merchants/my-merchant", headers=headers)
            if merchant_response.status_code == 200:
                merchant_data = merchant_response.json()
                self._merchant_id = merchant_data["id"]
                self._api_key = merchant_data["api_key"] # Might not need API key for API calls, but good to have
                print(f"Merchant {merchant_data['name']} found. ID: {self._merchant_id}")
            else:
                print(f"Failed to fetch merchant: {merchant_response.text}")

        else:
            print(f"Merchant login failed: {response.text}")

    @task(3) # 3 times more likely to run than other tasks
    def create_payment(self):
        if not self._merchant_token or not self._merchant_id:
            print("Skipping create_payment: Merchant not set up.")
            return

        payload = {
            "amount": float(f"{self.environment.user_count / 10:.2f}"), # Dynamic amount for testing
            "currency": "USD",
            "merchant_order_id": f"ORDER-{uuid.uuid4()}",
            "description": "Locust test payment",
            "customer_email": f"customer_{uuid.uuid4().hex[:8]}@example.com",
            "payment_method": "card",
            "idempotency_key": str(uuid.uuid4())
        }
        headers = {"Authorization": f"Bearer {self._merchant_token}"}
        
        with self.client.post("/api/v1/payments", json=payload, headers=headers, catch_response=True) as response:
            if response.status_code == 201:
                response.success()
                # Store payment ID for later retrieval if needed
                # self.payments.append(response.json()["id"])
            else:
                response.failure(f"Failed to create payment: {response.status_code} - {response.text}")

    @task(1)
    def get_payment_status(self):
        if not self._merchant_token:
            print("Skipping get_payment_status: Merchant not logged in.")
            return
        # This task would typically retrieve an existing payment ID.
        # For simplicity, we'll just query a dummy ID or the latest created one.
        # In a real test, you'd pick an ID from a list of previously created payments.
        dummy_payment_id = "a1b2c3d4-e5f6-7890-1234-567890abcdef" # Replace with actual logic to get a payment ID

        headers = {"Authorization": f"Bearer {self._merchant_token}"}
        with self.client.get(f"/api/v1/payments/{dummy_payment_id}", headers=headers, catch_response=True) as response:
            if response.status_code == 200 or response.status_code == 404: # 404 is fine for dummy ID, as long as it's not a server error
                response.success()
            else:
                response.failure(f"Failed to get payment status: {response.status_code} - {response.text}")

```