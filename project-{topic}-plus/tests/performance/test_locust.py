from locust import HttpUser, task, between
import os

# To run:
# 1. Start the FastAPI app: `docker-compose up --build`
# 2. Run Locust from the host or within the app container:
#    `locust -f tests/performance/test_locust.py --host http://localhost:8000 --web-host 0.0.0.0`
# 3. Open http://localhost:8089 in your browser (or whatever port Locust suggests)

class MLUtilitiesUser(HttpUser):
    wait_time = between(1, 3)  # Users wait between 1 and 3 seconds between tasks
    host = "http://localhost:8000" # Default host, can be overridden by --host argument

    # Store a token for the user session
    _token = None
    _dataset_id = None
    _model_id = None
    _experiment_id = None

    def on_start(self):
        """
        Called when a Locust user starts. Login to get a token.
        """
        self.login()

    def login(self):
        """
        Login as admin to get a token for subsequent requests.
        """
        login_data = {
            "username": os.getenv("FIRST_SUPERUSER_EMAIL", "admin@example.com"),
            "password": os.getenv("FIRST_SUPERUSER_PASSWORD", "adminpassword")
        }
        response = self.client.post(
            "/api/v1/auth/token",
            data=login_data,
            name="/api/v1/auth/token [Login]",
            allow_redirects=False # Important for /token endpoint
        )
        if response.status_code == 200:
            self._token = response.json()["access_token"]
            self.client.headers = {"Authorization": f"Bearer {self._token}"}
            print(f"Logged in as admin, got token: {self._token[:10]}...")
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            # Optionally stop the user if login fails
            self.environment.runner.quit()

    @task(5) # 5 times more likely to execute than other tasks
    def get_all_datasets(self):
        """
        Simulate fetching all datasets.
        """
        self.client.get("/api/v1/datasets/", name="/api/v1/datasets/ [GET All]")

    @task(3)
    def get_all_models(self):
        """
        Simulate fetching all ML models.
        """
        self.client.get("/api/v1/models/", name="/api/v1/models/ [GET All]")

    @task(3)
    def get_all_experiments(self):
        """
        Simulate fetching all experiments.
        """
        self.client.get("/api/v1/experiments/", name="/api/v1/experiments/ [GET All]")

    @task(2)
    def create_and_get_dataset(self):
        """
        Simulate creating a dataset and then fetching it by ID.
        """
        dataset_name = f"PerfTestDataset_{self._token[:5]}_{self._dataset_id if self._dataset_id else 'new'}"
        create_data = {
            "name": dataset_name,
            "description": "Dataset created by performance test",
            "file_path": f"s3://perftest/data/{dataset_name}.csv",
            "file_type": "csv",
            "rows_count": 1000,
            "columns_count": 10
        }
        response = self.client.post(
            "/api/v1/datasets/",
            json=create_data,
            name="/api/v1/datasets/ [POST]"
        )
        if response.status_code == 201:
            self._dataset_id = response.json()["id"]
            self.client.get(f"/api/v1/datasets/{self._dataset_id}", name="/api/v1/datasets/{id} [GET]")
        elif response.status_code == 409: # Duplicate entry - expected if multiple users/runs
             pass
        else:
            response.failure(f"Failed to create dataset: {response.status_code} - {response.text}")

    @task(1)
    def create_and_get_model(self):
        """
        Simulate creating a model and then fetching it by ID.
        """
        model_name = f"PerfTestModel_{self._token[:5]}"
        model_version = f"v{self.environment.runner.user_count}.{self.environment.runner.stats.total.num_requests}" # unique version
        create_data = {
            "name": model_name,
            "version": model_version,
            "description": "Model created by performance test",
            "model_path": f"s3://perftest/models/{model_name}-{model_version}.pkl",
            "framework": "scikit-learn",
            "task_type": "classification",
            "hyperparameters": {"lr": 0.01},
            "metrics": {"accuracy": 0.9}
        }
        response = self.client.post(
            "/api/v1/models/",
            json=create_data,
            name="/api/v1/models/ [POST]"
        )
        if response.status_code == 201:
            self._model_id = response.json()["id"]
            self.client.get(f"/api/v1/models/{self._model_id}", name="/api/v1/models/{id} [GET]")
        elif response.status_code == 409:
            pass # Expected duplicate if many users
        else:
            response.failure(f"Failed to create model: {response.status_code} - {response.text}")

    @task(1)
    def create_and_get_experiment(self):
        """
        Simulate creating an experiment and then fetching it by ID.
        """
        experiment_name = f"PerfTestExperiment_{self._token[:5]}"
        run_id = f"run-{os.urandom(4).hex()}" # Generate a random run_id
        create_data = {
            "name": experiment_name,
            "run_id": run_id,
            "description": "Experiment created by performance test",
            "parameters": {"epochs": 10},
            "metrics": {"loss": 0.1},
            "status": "completed",
            "model_id": self._model_id if self._model_id else None,
            "dataset_id": self._dataset_id if self._dataset_id else None,
        }
        response = self.client.post(
            "/api/v1/experiments/",
            json=create_data,
            name="/api/v1/experiments/ [POST]"
        )
        if response.status_code == 201:
            self._experiment_id = response.json()["id"]
            self.client.get(f"/api/v1/experiments/{self._experiment_id}", name="/api/v1/experiments/{id} [GET]")
        elif response.status_code == 409:
            pass # Expected duplicate if many users
        else:
            response.failure(f"Failed to create experiment: {response.status_code} - {response.text}")