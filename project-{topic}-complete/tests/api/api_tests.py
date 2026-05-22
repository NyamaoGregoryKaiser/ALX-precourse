```python
import requests
import json
import os
import sys
import time

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:9080")
JWT_SECRET = os.getenv("APP_JWT_SECRET", "your-super-secret-jwt-key-change-this-in-production-!!!!")

# Global variables for tests
AUTH_TOKEN = None
TEST_USER_ID = None
TEST_TASK_ID = None

def make_request(method, endpoint, data=None, headers=None, expected_status=200):
    url = f"{BASE_URL}{endpoint}"
    print(f"[{method}] {url} - Data: {data}")
    
    if headers is None:
        headers = {"Content-Type": "application/json"}
    
    response = requests.request(method, url, json=data, headers=headers)
    print(f"Response Status: {response.status_code}, Body: {response.text}")

    try:
        assert response.status_code == expected_status, \
            f"Expected status {expected_status}, got {response.status_code}. Response: {response.text}"
        return response.json()
    except (json.JSONDecodeError, AssertionError) as e:
        print(f"Error during API call to {endpoint}: {e}")
        # For non-200 responses that don't return JSON, catch the JSONDecodeError
        if expected_status != 204 and not (expected_status == response.status_code and not response.text):
            raise
        return None # For 204 No Content

def run_tests():
    global AUTH_TOKEN, TEST_USER_ID, TEST_TASK_ID

    print("\n--- Running API Tests ---")

    # --- User Registration ---
    print("\nTest: User Registration")
    username = f"testuser_{int(time.time())}"
    email = f"{username}@example.com"
    password = "SecurePassword123"
    register_data = {"username": username, "email": email, "password": password}
    
    response = make_request("POST", "/users/register", register_data, expected_status=201)
    assert "id" in response and "username" in response
    assert response["username"] == username
    TEST_USER_ID = response["id"]
    print(f"User registered successfully. ID: {TEST_USER_ID}")

    # --- User Login ---
    print("\nTest: User Login")
    login_data = {"username": username, "password": password}
    response = make_request("POST", "/users/login", login_data)
    assert "token" in response
    AUTH_TOKEN = response["token"]
    print(f"User logged in successfully. Token: {AUTH_TOKEN[:30]}...")

    headers = {"Authorization": f"Bearer {AUTH_TOKEN}", "Content-Type": "application/json"}

    # --- Create Task ---
    print("\nTest: Create Task")
    task_data = {
        "title": "Learn C++ API Development",
        "description": "Master Pistache, Cmake, Docker, and PostgreSQL with C++.",
        "status": "IN_PROGRESS",
        "due_date": "2024-03-31T23:59:59Z"
    }
    response = make_request("POST", "/tasks", task_data, headers, expected_status=201)
    assert "id" in response and "title" in response
    assert response["title"] == task_data["title"]
    TEST_TASK_ID = response["id"]
    print(f"Task created successfully. ID: {TEST_TASK_ID}")

    # --- Get All Tasks ---
    print("\nTest: Get All Tasks")
    response = make_request("GET", "/tasks", headers=headers)
    assert isinstance(response, list)
    assert len(response) > 0
    assert any(task["id"] == TEST_TASK_ID for task in response)
    print(f"Retrieved {len(response)} tasks.")

    # --- Get Task by ID ---
    print(f"\nTest: Get Task by ID {TEST_TASK_ID}")
    response = make_request("GET", f"/tasks/{TEST_TASK_ID}", headers=headers)
    assert response["id"] == TEST_TASK_ID
    assert response["title"] == task_data["title"]
    print(f"Retrieved task: {response['title']}")

    # --- Update Task ---
    print(f"\nTest: Update Task {TEST_TASK_ID}")
    update_data = {
        "title": "Refine C++ API Performance",
        "description": "Optimize database queries and add caching layer.",
        "status": "DONE",
        "due_date": "2024-04-15T12:00:00Z"
    }
    response = make_request("PUT", f"/tasks/{TEST_TASK_ID}", update_data, headers)
    assert response["id"] == TEST_TASK_ID
    assert response["title"] == update_data["title"]
    assert response["status"] == update_data["status"]
    print(f"Task updated: {response['title']}")

    # --- Verify Update ---
    print(f"\nTest: Verify Updated Task {TEST_TASK_ID}")
    response = make_request("GET", f"/tasks/{TEST_TASK_ID}", headers=headers)
    assert response["title"] == update_data["title"]
    assert response["status"] == update_data["status"]
    print("Update verified.")

    # --- Unauthorized Access Test (Get Tasks without token) ---
    print("\nTest: Unauthorized Access (Get Tasks)")
    make_request("GET", "/tasks", expected_status=401)
    print("Unauthorized access denied as expected (401).")

    # --- Delete Task ---
    print(f"\nTest: Delete Task {TEST_TASK_ID}")
    make_request("DELETE", f"/tasks/{TEST_TASK_ID}", headers=headers, expected_status=204)
    print(f"Task {TEST_TASK_ID} deleted.")

    # --- Verify Deletion ---
    print(f"\nTest: Verify Deletion of Task {TEST_TASK_ID}")
    make_request("GET", f"/tasks/{TEST_TASK_ID}", headers=headers, expected_status=404)
    print("Deletion verified (404 Not Found).")

    # --- Rate Limiting Test (Basic check) ---
    print("\nTest: Rate Limiting (send too many requests)")
    initial_headers = headers.copy()
    initial_headers["X-RateLimit-Test"] = "true" # Custom header for test or specific endpoint
    
    # Assuming RATE_LIMIT_MAX_REQUESTS is low for testing, e.g., 5
    # For actual environment, this needs to be calibrated.
    RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", 100)) # Default from .env
    RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", 60))

    if BASE_URL.startswith("http://app"): # Only run if running via docker-compose with app alias
        # Create a temporary task to hit the endpoint for rate limiting
        temp_task_data = {"title": "Temp Task", "status": "TODO"}
        temp_task_response = make_request("POST", "/tasks", temp_task_data, headers, expected_status=201)
        temp_task_id = temp_task_response["id"]
        
        print(f"Sending {RATE_LIMIT_MAX_REQUESTS + 5} requests to trigger rate limit...")
        rate_limited_count = 0
        for i in range(RATE_LIMIT_MAX_REQUESTS + 5):
            try:
                resp = requests.get(f"{BASE_URL}/tasks/{temp_task_id}", headers=initial_headers)
                if resp.status_code == 429:
                    rate_limited_count += 1
                    print(f"Request {i+1}: Rate limited (429) as expected.")
                # else:
                #     print(f"Request {i+1}: Status {resp.status_code}")
            except Exception as e:
                print(f"Request {i+1} failed: {e}")

        assert rate_limited_count > 0, "Rate limit was not triggered."
        print(f"Successfully triggered rate limit {rate_limited_count} times.")
        
        # Clean up temporary task
        make_request("DELETE", f"/tasks/{temp_task_id}", headers=headers, expected_status=204)
    else:
        print("Skipping Rate Limiting Test (requires app service in docker-compose for accurate testing).")


    print("\n--- All API tests passed! ---")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        BASE_URL = sys.argv[1]
    
    try:
        run_tests()
    except Exception as e:
        print(f"\n--- API Tests FAILED: {e} ---")
        sys.exit(1)
    sys.exit(0)

```