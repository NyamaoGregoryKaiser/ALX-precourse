```python
import requests
import pytest
import time
import json
import os
import jwt

# Configuration for API endpoint and database (for cleanup)
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080/api/v1")
DB_HOST = os.getenv("ML_DB_HOST", "localhost")
DB_PORT = os.getenv("ML_DB_PORT", "5432")
DB_NAME = os.getenv("ML_DB_NAME", "ml_toolkit_db")
DB_USER = os.getenv("ML_DB_USER", "ml_user")
DB_PASSWORD = os.getenv("ML_DB_PASSWORD", "ml_password")
JWT_SECRET = os.getenv("ML_JWT_SECRET", "super_secret_jwt_key_please_change_this_in_production")

# --- Helper functions for DB cleanup and JWT generation ---
def cleanup_db(table_name):
    try:
        import psycopg2
        conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, database=DB_NAME, user=DB_USER, password=DB_PASSWORD)
        cursor = conn.cursor()
        cursor.execute(f"DELETE FROM {table_name};")
        conn.commit()
        cursor.close()
        conn.close()
        print(f"Cleaned up {table_name} table.")
    except ImportError:
        print("psycopg2 not installed, cannot clean up database.")
    except Exception as e:
        print(f"Error cleaning up {table_name}: {e}")

def get_jwt_token(username="admin", password="adminpass"):
    login_url = f"{API_BASE_URL.replace('/api/v1', '')}/api/v1/auth/login" # Auth route is not /api/v1/auth
    response = requests.post(login_url, json={"username": username, "password": password})
    response.raise_for_status()
    return response.json()["token"]

@pytest.fixture(scope="module", autouse=True)
def auth_token():
    """Fixture to get JWT token once for all tests."""
    token = get_jwt_token()
    return token

@pytest.fixture(scope="module", autouse=True)
def setup_and_teardown_db():
    """Ensure database is clean before and after tests."""
    # Cleanup before tests
    cleanup_db("pipelines")
    cleanup_db("models")
    cleanup_db("datasets")
    yield
    # Cleanup after tests
    cleanup_db("pipelines")
    cleanup_db("models")
    cleanup_db("datasets")

@pytest.fixture
def api_headers(auth_token):
    """Headers with JWT token for authenticated requests."""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

# --- Tests for Datasets ---
def test_create_dataset(api_headers):
    url = f"{API_BASE_URL}/datasets"
    data = {
        "name": f"test_dataset_{int(time.time())}",
        "description": "A test dataset for integration testing",
        "file_path": "/fake/path/to/data.csv",
        "row_count": 100,
        "col_count": 5,
        "feature_names": ["feat1", "feat2"],
        "metadata": {"version": "1.0"}
    }
    response = requests.post(url, headers=api_headers, json=data)
    assert response.status_code == 201
    assert response.json()["name"] == data["name"]
    assert response.json()["id"] > 0

def test_get_all_datasets(api_headers):
    url = f"{API_BASE_URL}/datasets"
    response = requests.get(url, headers=api_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) >= 1 # At least the one created above

def test_get_dataset_by_id(api_headers):
    # First, create a dataset to get its ID
    create_url = f"{API_BASE_URL}/datasets"
    create_data = {
        "name": f"temp_dataset_{int(time.time())}",
        "description": "Temporary dataset",
        "file_path": "/fake/path/temp.csv",
        "row_count": 10,
        "col_count": 2,
        "feature_names": ["f1", "f2"]
    }
    create_response = requests.post(create_url, headers=api_headers, json=create_data)
    assert create_response.status_code == 201
    dataset_id = create_response.json()["id"]

    get_url = f"{API_BASE_URL}/datasets/{dataset_id}"
    response = requests.get(get_url, headers=api_headers)
    assert response.status_code == 200
    assert response.json()["id"] == dataset_id
    assert response.json()["name"] == create_data["name"]

def test_update_dataset(api_headers):
    # First, create a dataset
    create_url = f"{API_BASE_URL}/datasets"
    create_data = {
        "name": f"upd_dataset_{int(time.time())}",
        "description": "Dataset to update",
        "file_path": "/fake/path/upd.csv",
        "row_count": 50,
        "col_count": 3
    }
    create_response = requests.post(create_url, headers=api_headers, json=create_data)
    assert create_response.status_code == 201
    dataset_id = create_response.json()["id"]

    update_url = f"{API_BASE_URL}/datasets/{dataset_id}"
    update_data = {
        "description": "Updated description",
        "row_count": 150,
        "metadata": {"new_field": "value"}
    }
    response = requests.put(update_url, headers=api_headers, json=update_data)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify update
    get_response = requests.get(update_url, headers=api_headers)
    assert get_response.status_code == 200
    assert get_response.json()["description"] == update_data["description"]
    assert get_response.json()["row_count"] == update_data["row_count"]
    assert get_response.json()["metadata"]["new_field"] == update_data["metadata"]["new_field"]

def test_delete_dataset(api_headers):
    # First, create a dataset
    create_url = f"{API_BASE_URL}/datasets"
    create_data = {
        "name": f"del_dataset_{int(time.time())}",
        "description": "Dataset to delete",
        "file_path": "/fake/path/del.csv",
        "row_count": 20,
        "col_count": 1
    }
    create_response = requests.post(create_url, headers=api_headers, json=create_data)
    assert create_response.status_code == 201
    dataset_id = create_response.json()["id"]

    delete_url = f"{API_BASE_URL}/datasets/{dataset_id}"
    response = requests.delete(delete_url, headers=api_headers)
    assert response.status_code == 204

    # Verify deletion
    get_response = requests.get(delete_url, headers=api_headers)
    assert get_response.status_code == 404

# --- Tests for Models ---
def test_create_model(api_headers):
    # Need a dataset first
    ds_url = f"{API_BASE_URL}/datasets"
    ds_data = {"name": f"model_ds_{int(time.time())}", "description": "Model dataset", "file_path": "/fake/ds.csv"}
    ds_res = requests.post(ds_url, headers=api_headers, json=ds_data)
    assert ds_res.status_code == 201
    dataset_id = ds_res.json()["id"]

    url = f"{API_BASE_URL}/models"
    data = {
        "name": f"test_model_{int(time.time())}",
        "description": "A test model for integration testing",
        "type": "LINEAR_REGRESSION",
        "artifact_path": "/fake/path/to/model.pkl",
        "dataset_id": dataset_id,
        "metadata": {"framework": "Eigen", "version": "1.0"}
    }
    response = requests.post(url, headers=api_headers, json=data)
    assert response.status_code == 201
    assert response.json()["name"] == data["name"]
    assert response.json()["id"] > 0

# --- Tests for Pipelines ---
def test_create_pipeline(api_headers):
    # Need a dataset first
    ds_url = f"{API_BASE_URL}/datasets"
    ds_data = {"name": f"pipeline_ds_{int(time.time())}", "description": "Pipeline dataset", "file_path": "/fake/ds.csv"}
    ds_res = requests.post(ds_url, headers=api_headers, json=ds_data)
    assert ds_res.status_code == 201
    dataset_id = ds_res.json()["id"]

    url = f"{API_BASE_URL}/pipelines"
    data = {
        "name": f"test_pipeline_{int(time.time())}",
        "description": "A test pipeline",
        "dataset_id": dataset_id,
        "steps": [
            {"name": "MinMaxScaler", "params": {"feature_min": 0, "feature_max": 1}},
            {"name": "PolynomialFeatures", "params": {"degree": 2, "include_bias": True}}
        ]
    }
    response = requests.post(url, headers=api_headers, json=data)
    assert response.status_code == 201
    assert response.json()["name"] == data["name"]
    assert response.json()["id"] > 0

def test_execute_pipeline(api_headers):
    # 1. Create a dataset
    ds_url = f"{API_BASE_URL}/datasets"
    ds_data = {"name": f"exec_ds_{int(time.time())}", "description": "Execution dataset", "file_path": "/fake/exec_ds.csv"}
    ds_res = requests.post(ds_url, headers=api_headers, json=ds_data)
    assert ds_res.status_code == 201
    dataset_id = ds_res.json()["id"]

    # 2. Create a pipeline
    pipe_url = f"{API_BASE_URL}/pipelines"
    pipe_data = {
        "name": f"exec_pipeline_{int(time.time())}",
        "description": "Execution pipeline",
        "dataset_id": dataset_id,
        "steps": [
            {"name": "MinMaxScaler", "params": {"feature_min": 0, "feature_max": 1}}
        ]
    }
    pipe_res = requests.post(pipe_url, headers=api_headers, json=pipe_data)
    assert pipe_res.status_code == 201
    pipeline_id = pipe_res.json()["id"]

    # 3. Execute the pipeline
    exec_url = f"{API_BASE_URL}/pipelines/{pipeline_id}/execute"
    input_data = {
        "data": [
            [1.0, 10.0],
            [5.0, 20.0],
            [9.0, 30.0]
        ]
    }
    exec_response = requests.post(exec_url, headers=api_headers, json=input_data)
    assert exec_response.status_code == 200
    
    output_data = exec_response.json()
    assert isinstance(output_data, list)
    assert len(output_data) == 3
    assert len(output_data[0]) == 2
    
    # Expected output for MinMaxScaler(0,1)
    # Input: [[1,10],[5,20],[9,30]]
    # Min: [1,10], Max: [9,30], Range: [8,20]
    # Scaled:
    # [ (1-1)/8, (10-10)/20 ] = [0,0]
    # [ (5-1)/8, (20-10)/20 ] = [0.5,0.5]
    # [ (9-1)/8, (30-10)/20 ] = [1,1]
    expected_output = [[0.0, 0.0], [0.5, 0.5], [1.0, 1.0]]
    for i in range(len(output_data)):
        for j in range(len(output_data[i])):
            assert pytest.approx(output_data[i][j]) == expected_output[i][j]

def test_evaluate_model(api_headers):
    # 1. Create a dataset
    ds_url = f"{API_BASE_URL}/datasets"
    ds_data = {"name": f"eval_ds_{int(time.time())}", "description": "Evaluation dataset", "file_path": "/fake/eval_ds.csv"}
    ds_res = requests.post(ds_url, headers=api_headers, json=ds_data)
    assert ds_res.status_code == 201
    dataset_id = ds_res.json()["id"]

    # 2. Create a model
    model_url = f"{API_BASE_URL}/models"
    model_data = {
        "name": f"eval_model_{int(time.time())}",
        "description": "Model for evaluation",
        "type": "LINEAR_REGRESSION",
        "artifact_path": "/fake/path/to/eval_model.pkl",
        "dataset_id": dataset_id
    }
    model_res = requests.post(model_url, headers=api_headers, json=model_data)
    assert model_res.status_code == 201
    model_id = model_res.json()["id"]

    # 3. Create a simple pipeline (MinMaxScaler)
    pipe_url = f"{API_BASE_URL}/pipelines"
    pipe_data = {
        "name": f"eval_pipeline_{int(time.time())}",
        "description": "Evaluation pipeline",
        "dataset_id": dataset_id,
        "steps": [
            {"name": "MinMaxScaler", "params": {"feature_min": 0, "feature_max": 1}}
        ]
    }
    pipe_res = requests.post(pipe_url, headers=api_headers, json=pipe_data)
    assert pipe_res.status_code == 201
    pipeline_id = pipe_res.json()["id"]

    # 4. Evaluate the model
    eval_url = f"{API_BASE_URL}/models/{model_id}/evaluate"
    eval_data = {
        "data": [
            [1.0, 10.0],
            [5.0, 20.0],
            [9.0, 30.0]
        ],
        "true_labels": [0.1, 0.5, 0.9],
        "pipeline_id": pipeline_id
    }
    eval_response = requests.post(eval_url, headers=api_headers, json=eval_data)
    assert eval_response.status_code == 200
    
    metrics = eval_response.json()
    assert "mse" in metrics
    assert "rmse" in metrics
    assert "mae" in metrics
    assert "r_squared" in metrics

    # The dummy predict returns 0.5 for all predictions.
    # True labels: [0.1, 0.5, 0.9]
    # Pred labels: [0.5, 0.5, 0.5]
    # Errors: [-0.4, 0.0, 0.4]
    # Squared errors: [0.16, 0.0, 0.16]
    # Sum of squared errors: 0.32
    # MSE: 0.32 / 3 = 0.10666...
    # RMSE: sqrt(0.10666...) = 0.32659...
    # MAE: (0.4 + 0 + 0.4) / 3 = 0.8 / 3 = 0.26666...
    
    # R2:
    # y_true_mean = (0.1+0.5+0.9)/3 = 0.5
    # SS_total = (0.1-0.5)^2 + (0.5-0.5)^2 + (0.9-0.5)^2 = (-0.4)^2 + 0^2 + (0.4)^2 = 0.16 + 0 + 0.16 = 0.32
    # SS_residual = (0.1-0.5)^2 + (0.5-0.5)^2 + (0.9-0.5)^2 = 0.32 (because predictions are all the mean of y_true!)
    # R2 = 1 - (SS_residual / SS_total) = 1 - (0.32 / 0.32) = 1 - 1 = 0.0
    
    assert pytest.approx(metrics["mse"]) == 0.10666666666666667
    assert pytest.approx(metrics["rmse"]) == 0.32659863237109007
    assert pytest.approx(metrics["mae"]) == 0.26666666666666666
    assert pytest.approx(metrics["r_squared"]) == 0.0

# --- Error Handling & Middleware Tests ---
def test_unauthorized_access():
    url = f"{API_BASE_URL}/datasets"
    response = requests.get(url, headers={"Content-Type": "application/json"})
    assert response.status_code == 401 # Unauthorized

def test_invalid_jwt_token():
    url = f"{API_BASE_URL}/datasets"
    headers = {"Authorization": "Bearer invalid_token", "Content-Type": "application/json"}
    response = requests.get(url, headers=headers)
    assert response.status_code == 403 # Forbidden

def test_rate_limiting_exceeded(auth_token):
    # This test is tricky to run precisely without controlling the server's time or bucket state.
    # It assumes the default rate limit settings (100 capacity, 10 tokens/sec).
    # To reliably test, you'd want to hit it more than 100 times quickly.
    print("\nTesting rate limiting (may take a moment)...")
    limit_url = f"{API_BASE_URL}/datasets"
    headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    num_requests = 110 # Exceed default capacity
    success_count = 0
    failure_count = 0
    for i in range(num_requests):
        response = requests.get(limit_url, headers=headers)
        if response.status_code == 200:
            success_count += 1
        elif response.status_code == 429:
            failure_count += 1
            # print(f"Request {i+1}: Rate limit hit (429)")
        else:
            print(f"Request {i+1}: Unexpected status code {response.status_code}")
    
    print(f"Rate limiting test: {success_count} successful, {failure_count} failed (429).")
    assert failure_count > 0, "Rate limiting should have been triggered."
    assert success_count <= 100, "Should not exceed capacity of 100 successful requests."

def test_invalid_json_body(api_headers):
    url = f"{API_BASE_URL}/datasets"
    response = requests.post(url, headers=api_headers, data="this is not json")
    assert response.status_code == 400
    assert "Invalid JSON" in response.json()["message"]
```