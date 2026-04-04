# Mobile Task Manager Backend - Performance Testing Guide

Performance testing is crucial to ensure the backend can handle expected loads and identify bottlenecks. This document outlines how to approach performance testing using **Locust**, a popular open-source load testing tool.

## 1. Introduction to Locust

Locust is an open-source load testing tool. It allows you to define user behavior with Python code, and then swarm your system with millions of simultaneous users.

**Key Features:**
*   **Code-driven**: Define tests in plain Python.
*   **Distributed**: Run load tests distributed across multiple machines.
*   **Real-time UI**: Monitor the test progress and results in a web-based UI.
*   **Scalable**: Simulate many users with minimal resource usage.

## 2. Setup Locust

### 2.1. Install Locust

Locust can be installed via pip:

```bash
pip install locust
```

### 2.2. Create a Locustfile (`locustfile.py`)

A Locustfile defines user tasks and behavior. For our Task Manager API, we'll simulate users:
*   Registering
*   Logging in
*   Creating projects
*   Listing projects
*   Creating tasks
*   Listing tasks
*   Updating task status

Let's create a sample `locustfile.py` in the root of your project:

```python
# === locustfile.py ===
from locust import HttpUser, task, between
import random
import json

class MobileTaskUser(HttpUser):
    wait_time = between(1, 5)  # Users wait between 1 and 5 seconds between tasks
    host = "http://localhost:8000"  # Replace with your backend's host

    # Store user data for re-use
    registered_users = []
    auth_headers = {}
    user_projects = {} # {user_id: [project_id, ...]}
    project_tasks = {} # {project_id: [task_id, ...]}

    @task(1) # Lower weight, less frequent
    def register_and_login(self):
        """Simulate user registration and login."""
        username = f"user_{self.environment.runner.user_count}_{random.randint(1000, 9999)}"
        email = f"{username}@example.com"
        password = "testpassword"

        # Register
        register_response = self.client.post(
            "/api/v1/auth/register",
            json={"username": username, "email": email, "password": password},
            name="/auth/register"
        )
        if register_response.status_code == 201:
            user_id = register_response.json()["id"]
            self.registered_users.append({"email": email, "password": password, "user_id": user_id})
            self.auth_headers[user_id] = {} # Initialize headers

            # Login immediately after registration
            login_response = self.client.post(
                "/api/v1/auth/login",
                data={"username": email, "password": password},
                name="/auth/login"
            )
            if login_response.status_code == 200:
                token = login_response.json()["access_token"]
                self.auth_headers[user_id] = {"Authorization": f"Bearer {token}"}
                self.environment.events.request.fire(
                    request_type="POST",
                    name="/auth/login",
                    response_time=login_response.elapsed.total_seconds() * 1000,
                    response_length=len(login_response.content),
                    context={"user_id": user_id, "token": token}
                )
            else:
                login_response.failure(f"Login failed after registration for {username}: {login_response.text}")
        elif register_response.status_code == 400 and "already exists" in register_response.text:
            # User might already exist from previous run or concurrent test, try to log in
            login_response = self.client.post(
                "/api/v1/auth/login",
                data={"username": email, "password": password},
                name="/auth/login"
            )
            if login_response.status_code == 200:
                token = login_response.json()["access_token"]
                # Assuming user_id can be derived from token or retrieved
                # For simplicity, if already exists, we skip storing for this specific user in global list
                # In a real test, you'd have a pool of pre-created users.
                pass
            else:
                register_response.failure(f"Registration failed for {username}: {register_response.text}")
        else:
            register_response.failure(f"Registration failed for {username}: {register_response.text}")


    def on_start(self):
        """Called when a User starts, before any task is scheduled."""
        # Try to login a randomly selected existing user, or register a new one.
        if self.registered_users:
            user_data = random.choice(self.registered_users)
            user_id = user_data["user_id"]
            if user_id in self.auth_headers and self.auth_headers[user_id]:
                self.current_user_id = user_id
                self.current_headers = self.auth_headers[user_id]
                return
            
            # If token for some reason is not present or user not fully setup
            login_response = self.client.post(
                "/api/v1/auth/login",
                data={"username": user_data["email"], "password": user_data["password"]},
                name="/auth/login - on_start"
            )
            if login_response.status_code == 200:
                token = login_response.json()["access_token"]
                self.current_headers = {"Authorization": f"Bearer {token}"}
                self.current_user_id = user_id
                self.auth_headers[user_id] = self.current_headers # Cache for global use
                return
            else:
                print(f"Failed to login user {user_data['email']} on start: {login_response.text}")
        
        # If no registered users or login failed, attempt to register and login a new one
        self.register_and_login() # Call the task directly
        
        if not hasattr(self, 'current_user_id'): # Fallback if initial register/login failed
            self.current_user_id = None
            self.current_headers = {}

    @task(3) # High weight, more frequent
    def create_project(self):
        """Create a new project."""
        if not self.current_headers:
            return

        project_name = f"Project {random.randint(1, 100000)} by User {self.current_user_id}"
        response = self.client.post(
            "/api/v1/projects/",
            headers=self.current_headers,
            json={"name": project_name, "description": "A test project"},
            name="/projects/"
        )
        if response.status_code == 201:
            project_id = response.json()["id"]
            if self.current_user_id not in self.user_projects:
                self.user_projects[self.current_user_id] = []
            self.user_projects[self.current_user_id].append(project_id)
        elif response.status_code == 401: # Token expired or invalid
            self.on_start() # Re-login
            self.create_project() # Retry
        elif response.status_code != 200:
            response.failure(f"Failed to create project: {response.text}")

    @task(5) # Very high weight, most frequent
    def list_projects(self):
        """List current user's projects."""
        if not self.current_headers:
            return

        response = self.client.get(
            "/api/v1/projects/",
            headers=self.current_headers,
            name="/projects/"
        )
        if response.status_code == 200:
            if self.current_user_id not in self.user_projects:
                self.user_projects[self.current_user_id] = []
            
            # Update local cache of projects for this user
            new_projects_data = response.json()
            existing_project_ids = {p for p in self.user_projects[self.current_user_id]}
            for project_data in new_projects_data:
                if project_data["id"] not in existing_project_ids:
                    self.user_projects[self.current_user_id].append(project_data["id"])
        elif response.status_code == 401:
            self.on_start()
            self.list_projects()
        elif response.status_code != 200:
            response.failure(f"Failed to list projects: {response.text}")


    @task(4) # High weight
    def create_task(self):
        """Create a task in a random project of the current user."""
        if not self.current_headers or not self.user_projects.get(self.current_user_id):
            return

        project_id = random.choice(self.user_projects[self.current_user_id])
        task_title = f"Task {random.randint(1, 100000)} for {project_id}"
        
        response = self.client.post(
            "/api/v1/tasks/",
            headers=self.current_headers,
            json={
                "title": task_title,
                "description": "Task description here",
                "project_id": project_id,
                "status": random.choice(["pending", "in-progress"]),
                "due_date": str(date.today() + timedelta(days=random.randint(1, 30)))
            },
            name="/tasks/"
        )
        if response.status_code == 201:
            task_id = response.json()["id"]
            if project_id not in self.project_tasks:
                self.project_tasks[project_id] = []
            self.project_tasks[project_id].append(task_id)
        elif response.status_code == 401:
            self.on_start()
            self.create_task()
        elif response.status_code != 200:
            response.failure(f"Failed to create task: {response.text}")

    @task(6) # Highest weight
    def list_tasks(self):
        """List tasks for a random project of the current user or assigned to them."""
        if not self.current_headers:
            return

        if self.user_projects.get(self.current_user_id):
            project_id_to_list = random.choice(self.user_projects[self.current_user_id])
            response = self.client.get(
                f"/api/v1/tasks/?project_id={project_id_to_list}",
                headers=self.current_headers,
                name="/tasks/?project_id=[id]"
            )
        else: # Fallback to listing tasks assigned to self if no projects
            response = self.client.get(
                f"/api/v1/tasks/?assignee_id={self.current_user_id}",
                headers=self.current_headers,
                name="/tasks/?assignee_id=[id]"
            )

        if response.status_code == 200:
            tasks_data = response.json()
            # Optionally update self.project_tasks cache here
        elif response.status_code == 401:
            self.on_start()
            self.list_tasks()
        elif response.status_code != 200:
            response.failure(f"Failed to list tasks: {response.text}")

    @task(2) # Medium weight
    def update_task_status(self):
        """Update the status of a random task."""
        if not self.current_headers:
            return
        
        all_tasks_for_user = []
        for project_id, tasks in self.project_tasks.items():
            if project_id in self.user_projects.get(self.current_user_id, []): # Only tasks in user's projects
                all_tasks_for_user.extend(tasks)

        if not all_tasks_for_user:
            return

        task_id = random.choice(all_tasks_for_user)
        new_status = random.choice(["in-progress", "completed", "pending"])
        
        response = self.client.put(
            f"/api/v1/tasks/{task_id}",
            headers=self.current_headers,
            json={"status": new_status},
            name="/tasks/[id] - update_status"
        )
        if response.status_code == 401:
            self.on_start()
            self.update_task_status()
        elif response.status_code != 200:
            response.failure(f"Failed to update task status: {response.text}")

```
```

## 3. Running Performance Tests with Locust

1.  **Ensure Backend is Running**:
    Make sure your FastAPI backend is running and accessible (e.g., via Docker Compose: `docker-compose up -d`).

2.  **Start Locust**:
    Navigate to the project root directory in your terminal (where `locustfile.py` is located) and run:

    ```bash
    locust -f locustfile.py
    ```

3.  **Access Locust Web UI**:
    Open your web browser and go to `http://localhost:8089` (default Locust UI port).

4.  **Configure and Start Test**:
    *   **Number of users to simulate**: Total number of concurrent users.
    *   **Spawn rate**: Users to spawn per second.
    *   **Host**: Should auto-fill with `http://localhost:8000` (from `locustfile.py`), confirm it's correct.
    *   Click "Start swarming".

## 4. Analyzing Results

The Locust UI will show real-time statistics:
*   **Requests per second (RPS)**: Throughput of your API.
*   **Average response time**: Mean time taken for requests.
*   **Min/Max response time**: Range of response times.
*   **Median/90th/95th/99th percentile response time**: Important for understanding user experience under load.
*   **Failure rate**: Percentage of requests that failed.

**Interpreting results:**
*   **High RPS, low response times, low failure rate**: Good performance.
*   **Increasing response times, decreasing RPS, increasing failure rate**: Indicates a bottleneck (database, CPU, memory, network, application logic).
*   **Bottleneck identification**: Use server monitoring tools (e.g., `htop`, `docker stats`, PostgreSQL `pg_stat_statements`) alongside Locust to pinpoint where the system is struggling.

## 5. Distributed Testing

For large-scale tests (e.g., simulating thousands of users), you can run Locust in a distributed fashion with multiple worker nodes.

1.  Start a master node:
    ```bash
    locust -f locustfile.py --master
    ```
2.  Start worker nodes (on different machines or different terminals/containers):
    ```bash
    locust -f locustfile.py --worker --master-host=YOUR_MASTER_IP
    ```
    Workers will connect to the master, and the master's UI will aggregate results.

## 6. Performance Optimization Tips (General)

*   **Database Indexing**: Ensure frequently queried columns are indexed (`index=True` in SQLAlchemy models, or `CREATE INDEX` manually).
*   **N+1 Query Problem**: Use `selectinload`, `joinedload` in SQLAlchemy to fetch related objects in a single query.
*   **Caching**: Aggressively cache data that doesn't change frequently (e.g., `GET /users/me` could hit Redis after initial fetch).
*   **Rate Limiting**: Protect your API endpoints from abuse.
*   **Efficient Business Logic**: Optimize Python code, avoid unnecessary computations or loops.
*   **Asynchronous I/O**: Ensure all I/O operations (DB, external APIs, file system) are truly non-blocking.
*   **Connection Pooling**: SQLAlchemy's connection pool is configured by default; ensure it's adequately sized.
*   **Resource Allocation**: Provide sufficient CPU, memory, and network bandwidth to your Docker containers and underlying server.
*   **Gunicorn Workers**: Tune the number of Gunicorn workers for optimal performance based on your CPU cores (`workers = 2 * CPU_CORES + 1` is a common starting point).
*   **Profiling**: Use Python profiling tools (`cProfile`, `py-spy`) to find slow parts of your code.

Regular performance testing is an ongoing process that helps maintain a high-quality and responsive backend.
```