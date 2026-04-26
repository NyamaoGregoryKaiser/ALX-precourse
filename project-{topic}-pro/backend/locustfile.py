```python
from locust import HttpUser, task, between
import random

class WebsiteUser(HttpUser):
    wait_time = between(1, 5)  # Users will wait between 1 and 5 seconds between tasks
    host = "http://localhost:8000" # Target the FastAPI backend

    # Assume we have a way to get a valid token, for simplicity using a placeholder
    # In a real scenario, you'd perform a login task first.
    auth_token = None

    def on_start(self):
        """ on_start is called when a Locust user starts running """
        # Perform login to get a token
        login_data = {
            "username": "admin@example.com", # Assumes these users exist from seed.py
            "password": "securepassword"
        }
        response = self.client.post("/api/v1/auth/token", data=login_data)
        if response.status_code == 200:
            self.auth_token = response.json()["access_token"]
            self.client.headers = {"Authorization": f"Bearer {self.auth_token}"}
            print(f"Logged in as admin, token: {self.auth_token[:10]}...")
        else:
            print(f"Failed to login: {response.status_code} - {response.text}")
            self.environment.runner.quit() # Stop if login fails

    @task(3)
    def view_projects(self):
        self.client.get("/api/v1/projects/", name="/api/v1/projects [GET]")

    @task(2)
    def view_tasks(self):
        # Assuming we can get a random project ID to view its tasks
        # For simplicity, we can fetch all projects first or use a known ID
        projects_response = self.client.get("/api/v1/projects/")
        if projects_response.status_code == 200 and projects_response.json():
            project_id = random.choice(projects_response.json())["id"]
            self.client.get(f"/api/v1/projects/{project_id}/tasks", name="/api/v1/projects/{id}/tasks [GET]")
        else:
            self.client.get("/api/v1/tasks/", name="/api/v1/tasks [GET]") # Fallback to all tasks

    @task(1)
    def create_task(self):
        # Get a random project and assignee
        projects_response = self.client.get("/api/v1/projects/")
        if projects_response.status_code != 200 or not projects_response.json():
            print("No projects to create task under. Skipping task creation.")
            return

        project_id = random.choice(projects_response.json())["id"]

        # Fetch some users to assign tasks
        users_response = self.client.get("/api/v1/users/")
        if users_response.status_code != 200 or not users_response.json():
            print("No users to assign task to. Skipping task creation.")
            return

        assignee_id = random.choice(users_response.json())["id"]


        task_data = {
            "title": f"New Task from Locust {random.randint(1, 100000)}",
            "description": "This is a stress test task.",
            "project_id": project_id,
            "assignee_id": assignee_id,
            "status": "todo",
            "priority": "medium",
            "due_date": "2024-12-31T23:59:59Z"
        }
        self.client.post("/api/v1/tasks/", json=task_data, name="/api/v1/tasks/ [POST]")

    @task
    def health_check(self):
        self.client.get("/api/v1/healthcheck", name="/api/v1/healthcheck [GET]")

```

---

### 5. Documentation

**Comprehensive README**: