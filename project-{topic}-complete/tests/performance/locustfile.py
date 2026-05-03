```python
import time
import random
from locust import HttpUser, task, between

class MLToolkitUser(HttpUser):
    wait_time = between(1, 2.5)  # Users wait between 1 and 2.5 seconds between tasks
    host = "http://localhost:8080"
    token = None

    def on_start(self):
        """On start of the user, log in and get JWT token."""
        self.client.headers = {"Content-Type": "application/json"}
        login_response = self.client.post("/api/v1/auth/login", json={"username": "admin", "password": "adminpass"})
        if login_response.status_code == 200:
            self.token = login_response.json()["token"]
            self.client.headers["Authorization"] = f"Bearer {self.token}"
            print(f"Logged in and obtained token: {self.token[:10]}...")
        else:
            print(f"Failed to log in: {login_response.status_code} - {login_response.text}")
            self.environment.runner.quit() # Stop if login fails

    @task(5) # 5 times more likely to run
    def get_all_datasets(self):
        self.client.get("/api/v1/datasets", name="/datasets [GET]")

    @task(3)
    def create_and_get_dataset(self):
        # Create a new dataset
        dataset_name = f"locust_dataset_{int(time.time())}_{random.randint(0, 99999)}"
        create_data = {
            "name": dataset_name,
            "description": "Dataset created by Locust",
            "file_path": f"/locust/path/{dataset_name}.csv",
            "row_count": random.randint(100, 1000),
            "col_count": random.randint(2, 10)
        }
        create_response = self.client.post("/api/v1/datasets", json=create_data, name="/datasets [POST]")
        if create_response.status_code == 201:
            dataset_id = create_response.json()["id"]
            # Get the created dataset
            self.client.get(f"/api/v1/datasets/{dataset_id}", name="/datasets/{id} [GET]")
        else:
            create_response.failure(f"Failed to create dataset: {create_response.text}")

    @task(2)
    def execute_pipeline(self):
        # Requires a pre-existing pipeline and dataset in the DB for a real test
        # For simplicity, we'll assume pipeline ID 1 exists and accept dummy data
        pipeline_id = 1 # Assuming pipeline with ID 1 exists from seed data or prior setup
        input_data = {
            "data": [
                [random.random() * 100, random.random() * 50],
                [random.random() * 100, random.random() * 50],
                [random.random() * 100, random.random() * 50],
            ]
        }
        self.client.post(f"/api/v1/pipelines/{pipeline_id}/execute", json=input_data, name="/pipelines/{id}/execute [POST]")

    @task(1)
    def evaluate_model(self):
        # Requires a pre-existing model, pipeline, and dataset in the DB
        # For simplicity, we'll assume model ID 1 and pipeline ID 1 exist
        model_id = 1
        pipeline_id = 1
        eval_data = {
            "data": [
                [random.random() * 10, random.random() * 5],
                [random.random() * 10, random.random() * 5],
            ],
            "true_labels": [random.random(), random.random()],
            "pipeline_id": pipeline_id
        }
        self.client.post(f"/api/v1/models/{model_id}/evaluate", json=eval_data, name="/models/{id}/evaluate [POST]")
```