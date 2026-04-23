```python
from locust import HttpUser, task, between, SequentialTaskSet
import json
import os

# Set environment variables for Locust to pick up config from .env or direct values
# Ensure these are set if running outside Docker compose, or configure .env for Locust.
# For example:
# export POSTGRES_USER=user
# export POSTGRES_PASSWORD=password
# export SECRET_KEY="YOUR_SUPER_SECRET_KEY_GOES_HERE_MAKE_IT_VERY_LONG_AND_RANDOM"

# In a real scenario, you'd pull this from config or a secure secret manager
# For simplicity, we'll hardcode some values or assume .env is loaded.
# It's better to manage test data for performance tests, e.g., pre-created users.
TEST_USER_EMAIL = os.getenv("LOCUST_USER_EMAIL", "test_load_user@example.com")
TEST_USER_PASSWORD = os.getenv("LOCUST_USER_PASSWORD", "SecureLoadPass123")
API_V1_STR = "/v1"

class UserBehavior(SequentialTaskSet):
    access_token = None
    user_id = None
    expense_category_id = None
    income_category_id = None
    
    def on_start(self):
        """Called when a Locust user starts."""
        self.login()
        self.get_or_create_categories()

    def login(self):
        """Login to get an access token."""
        login_data = {
            "username": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
        }
        res = self.client.post(f"{API_V1_STR}/auth/login", data=login_data, name="/auth/login")
        if res.status_code == 200:
            self.access_token = res.json()["access_token"]
            # To get user_id, we can decode the token or hit /users/me
            # For simplicity, we assume /test-token or /users/me works after login
            test_token_res = self.client.post(
                f"{API_V1_STR}/auth/test-token",
                headers={"Authorization": f"Bearer {self.access_token}"},
                name="/auth/test-token"
            )
            if test_token_res.status_code == 200:
                self.user_id = test_token_res.json()["id"]
                self.client.headers.update({"Authorization": f"Bearer {self.access_token}"})
                self.environment.logger.info(f"User {TEST_USER_EMAIL} logged in. User ID: {self.user_id}")
            else:
                self.environment.logger.error(f"Failed to get user ID after login: {test_token_res.text}")
                self.environment.runner.quit()
        elif res.status_code == 400 and "Incorrect email or password" in res.text:
            self.signup_and_login()
        else:
            self.environment.logger.error(f"Login failed for {TEST_USER_EMAIL}: {res.text}")
            self.environment.runner.quit()

    def signup_and_login(self):
        """Sign up the user if not found, then log in."""
        signup_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "full_name": "Test Load User",
        }
        res = self.client.post(f"{API_V1_STR}/auth/signup", json=signup_data, name="/auth/signup")
        if res.status_code == 201 or (res.status_code == 409 and "already exists" in res.text):
            self.environment.logger.info(f"User {TEST_USER_EMAIL} signed up or already exists, attempting login again.")
            self.login()
        else:
            self.environment.logger.error(f"Signup failed for {TEST_USER_EMAIL}: {res.text}")
            self.environment.runner.quit()

    def get_or_create_categories(self):
        """Get or create default categories for the user."""
        if not self.user_id:
            self.environment.logger.error("User ID not available for category setup.")
            self.environment.runner.quit()
        
        # Check for existing categories
        res = self.client.get(f"{API_V1_STR}/categories/", name="/categories")
        if res.status_code == 200:
            categories = res.json()
            for cat in categories:
                if cat["name"] == "Load Test Expenses" and cat["type"] == "expense":
                    self.expense_category_id = cat["id"]
                if cat["name"] == "Load Test Income" and cat["type"] == "income":
                    self.income_category_id = cat["id"]
            
            if self.expense_category_id and self.income_category_id:
                self.environment.logger.info("Categories already exist.")
                return

        # Create if not found
        if not self.expense_category_id:
            res = self.client.post(
                f"{API_V1_STR}/categories/",
                json={"name": "Load Test Expenses", "type": "expense"},
                name="/categories [create expense]"
            )
            if res.status_code == 201:
                self.expense_category_id = res.json()["id"]
            else:
                self.environment.logger.error(f"Failed to create expense category: {res.text}")
                self.environment.runner.quit()

        if not self.income_category_id:
            res = self.client.post(
                f"{API_V1_STR}/categories/",
                json={"name": "Load Test Income", "type": "income"},
                name="/categories [create income]"
            )
            if res.status_code == 201:
                self.income_category_id = res.json()["id"]
            else:
                self.environment.logger.error(f"Failed to create income category: {res.text}")
                self.environment.runner.quit()
        
        self.environment.logger.info(f"Categories setup: Expense ID {self.expense_category_id}, Income ID {self.income_category_id}")


    @task(3)
    def get_transactions(self):
        self.client.get(f"{API_V1_STR}/transactions/", name="/transactions")

    @task(2)
    def post_expense_transaction(self):
        if not self.expense_category_id:
            self.environment.logger.warning("Expense category not set, skipping transaction POST.")
            return

        transaction_data = {
            "description": "Load Test Expense",
            "amount": 25.50,
            "type": "expense",
            "category_id": self.expense_category_id,
        }
        self.client.post(f"{API_V1_STR}/transactions/", json=transaction_data, name="/transactions [post expense]")

    @task(1)
    def post_income_transaction(self):
        if not self.income_category_id:
            self.environment.logger.warning("Income category not set, skipping transaction POST.")
            return

        transaction_data = {
            "description": "Load Test Income",
            "amount": 100.00,
            "type": "income",
            "category_id": self.income_category_id,
        }
        self.client.post(f"{API_V1_STR}/transactions/", json=transaction_data, name="/transactions [post income]")
    
    @task(1)
    def get_balance(self):
        self.client.get(f"{API_V1_STR}/transactions/balance", name="/transactions/balance")

    @task(1)
    def get_budgets(self):
        self.client.get(f"{API_V1_STR}/budgets/", name="/budgets")

class WebsiteUser(HttpUser):
    wait_time = between(1, 5) # Users wait between 1 and 5 seconds between tasks
    host = "http://localhost:8000" # Default host, can be overridden by -H CLI arg
    tasks = [UserBehavior]

```