```python
from locust import HttpUser, task, between, SequentialTaskSet
import random

class UserBehavior(SequentialTaskSet):
    def on_start(self):
        """ on_start is called once per User when the User starts running. """
        self.register()
        self.login()

    def register(self):
        self.client.post("/api/auth/register", json={
            "username": f"testuser_{random.randint(0, 1000000)}",
            "email": f"test_{random.randint(0, 1000000)}@example.com",
            "password": "password123",
            "role": "user"
        }, name="/auth/register [register]", catch_response=True)
        # We don't need to store this user, just ensure registration works
        # Real world would handle unique usernames better

    def login(self):
        response = self.client.post("/api/auth/login", json={
            "username": "testuser", # Assuming a seeded testuser for stable logins
            "password": "userpassword" # Assuming password for testuser
        }, name="/auth/login [login]", catch_response=True)
        if response.status_code == 200:
            self.access_token = response.json()["access_token"]
            self.user_id = response.json()["user"]["id"]
            self.client.headers = {"Authorization": f"Bearer {self.access_token}"}
            print(f"Logged in as user {self.user_id}")
        else:
            print(f"Login failed: {response.status_code} {response.text}")
            self.environment.runner.quit() # Stop if login fails

    @task(3)
    def view_all_tasks(self):
        self.client.get("/api/tasks/", name="/api/tasks/ [get_all]", catch_response=True)

    @task(2)
    def create_and_view_task(self):
        # First, need a project to create a task in. Let's assume some projects exist.
        # For simplicity, we'll try to use a hardcoded project ID from seeded data,
        # or dynamically fetch one if the app supports it easily.
        # In a real perf test, you'd manage test data carefully.
        project_id_for_task = 1 # Assuming project with ID 1 exists (e.g., from seed_db)

        # Create a task
        create_res = self.client.post("/api/tasks/", json={
            "title": f"Load Test Task {random.randint(0, 100000)}",
            "description": "Task created during performance test",
            "project_id": project_id_for_task,
            "assigned_to_id": self.user_id,
            "status": "open"
        }, name="/api/tasks/ [create]", catch_response=True)

        if create_res.status_code == 201:
            task_id = create_res.json()["id"]
            # View the created task
            self.client.get(f"/api/tasks/{task_id}", name="/api/tasks/{id} [get_one]", catch_response=True)

    @task(1)
    def view_my_profile(self):
        self.client.get("/api/auth/me", name="/api/auth/me [get_profile]", catch_response=True)

    @task(1)
    def view_projects(self):
        self.client.get("/api/projects/", name="/api/projects/ [get_all]", catch_response=True)


class WebsiteUser(HttpUser):
    wait_time = between(1, 5) # Users wait between 1 and 5 seconds between tasks
    host = "http://localhost:5000" # Target host for the Flask app
    tasks = [UserBehavior]

# To run:
# 1. Ensure your Flask app and database are running (e.g., via docker-compose up)
# 2. Run `locust -f tests/performance/locustfile.py` in your terminal
# 3. Open http://localhost:8089 in your browser
# 4. Use "testuser" / "userpassword" from seed_db.py for the initial login.
#    You might need to adjust the login credentials in UserBehavior.login if your seed changes.
```