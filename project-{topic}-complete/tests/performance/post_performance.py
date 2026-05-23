```python
from locust import HttpUser, task, between
import json

class CmsUser(HttpUser):
    wait_time = between(1, 2.5)  # Users wait between 1 and 2.5 seconds between tasks
    host = "http://localhost:8080" # Base URL of your Drogon CMS

    _jwt_token = None
    _admin_user_id = None
    _category_id = None
    _editor_token = None

    def on_start(self):
        """ on_start is called once when a User starts running """
        self.login_admin()
        self.get_admin_info()
        self.get_category_id()
        self.login_editor()

    def login_admin(self):
        # Login as admin to get JWT token
        response = self.client.post("/api/v1/login", json={"email": "admin@example.com", "password": "password123"}, name="/api/v1/login [admin]")
        if response.status_code == 200:
            self._jwt_token = response.json().get("token")
            self._admin_user_id = response.json().get("user", {}).get("id")
            self.client.headers = {"Authorization": f"Bearer {self._jwt_token}"}
            print(f"Admin logged in. Token: {self._jwt_token[:10]}...")
        else:
            print(f"Admin login failed: {response.status_code} - {response.text}")
            self._jwt_token = None
            self._admin_user_id = None

    def login_editor(self):
        # Login as editor to get JWT token for specific tasks
        response = self.client.post("/api/v1/login", json={"email": "editor@example.com", "password": "password123"}, name="/api/v1/login [editor]")
        if response.status_code == 200:
            self._editor_token = response.json().get("token")
        else:
            print(f"Editor login failed: {response.status_code} - {response.text}")
            self._editor_token = None

    def get_admin_info(self):
        if not self._jwt_token:
            return
        # Get admin user info to ensure token works
        response = self.client.get(f"/api/v1/users/{self._admin_user_id}", headers={"Authorization": f"Bearer {self._jwt_token}"}, name="/api/v1/users/{id} [admin]")
        if response.status_code != 200:
            print(f"Failed to get admin user info: {response.text}")

    def get_category_id(self):
        # Get a category ID to use for post creation
        response = self.client.get("/api/v1/categories") # This should be a public endpoint or use admin token
        if response.status_code == 200 and len(response.json()) > 0:
            self._category_id = response.json()[0].get("id")
            print(f"Using category ID: {self._category_id}")
        else:
            print(f"Failed to get category ID: {response.text}")
            self._category_id = 1 # Fallback to 1 if not found

    @task(3) # 30% of user tasks will be reading all posts
    def get_all_posts(self):
        self.client.get("/api/v1/posts", name="/api/v1/posts [public]")

    @task(2) # 20% of user tasks will be reading a specific post
    def get_single_post(self):
        # Assuming some posts exist with IDs 1-3 from seed data
        post_id = self.environment.random.randint(1, 3)
        self.client.get(f"/api/v1/posts/{post_id}", name="/api/v1/posts/{id} [public]")

    @task(1) # 10% of user tasks will be creating a post (requires auth)
    def create_new_post(self):
        if not self._editor_token:
            print("Editor token not available, skipping post creation.")
            return

        post_data = {
            "title": f"New Post by Editor {self.environment.random.randint(1, 1000)}",
            "content": f"This is the content of a new post created by a Locust editor. Lorem ipsum dolor sit amet...",
            "category_id": self._category_id,
            "published": True,
            "content_type": "markdown"
        }
        headers = {"Authorization": f"Bearer {self._editor_token}"}
        self.client.post("/api/v1/posts", json=post_data, headers=headers, name="/api/v1/posts [create]")

    @task(1) # 10% of user tasks will be getting users (requires admin auth)
    def get_all_users_admin(self):
        if not self._jwt_token:
            print("Admin token not available, skipping get all users.")
            return
        self.client.get("/api/v1/users", headers={"Authorization": f"Bearer {self._jwt_token}"}, name="/api/v1/users [admin]")

# To run:
# 1. Ensure your Drogon CMS is running, e.g., via `docker-compose up`
# 2. Install locust: `pip install locust`
# 3. Run locust: `locust -f tests/performance/post_performance.py`
# 4. Open your browser to http://localhost:8089 (Locust web UI)
```