import requests
import json
import os
import sys

# Base URL for the API, passed as an argument or from env
API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8080")
JWT_SECRET = os.environ.get("JWT_SECRET", "test_secret_for_integration_tests")

print(f"Running API tests against: {API_BASE_URL}")

def test_health_check():
    print("\n--- Testing Health Check ---")
    response = requests.get(f"{API_BASE_URL}/")
    assert response.status_code == 200
    assert "running" in response.text
    print(f"Health check passed: {response.text}")

def test_user_registration_login_flow():
    print("\n--- Testing User Registration and Login Flow ---")
    test_username = "apitestuser_" + os.urandom(4).hex()
    test_email = f"{test_username}@example.com"
    test_password = "ApiTest@123"

    # 1. Register a new user
    print(f"Registering user: {test_username}")
    register_payload = {
        "username": test_username,
        "email": test_email,
        "password": test_password,
        "first_name": "API",
        "last_name": "User"
    }
    response = requests.post(f"{API_BASE_URL}/api/v1/auth/register", json=register_payload)
    print(f"Register response status: {response.status_code}, body: {response.json()}")
    assert response.status_code == 201
    assert response.json()["success"] is True
    assert "token" in response.json()
    user_id = response.json()["user"]["id"]
    jwt_token = response.json()["token"]
    print(f"User {test_username} registered successfully. User ID: {user_id}")

    # 2. Login with the new user
    print(f"Logging in user: {test_username}")
    login_payload = {
        "username_or_email": test_username,
        "password": test_password
    }
    response = requests.post(f"{API_BASE_URL}/api/v1/auth/login", json=login_payload)
    print(f"Login response status: {response.status_code}, body: {response.json()}")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert "token" in response.json()
    assert response.json()["user"]["username"] == test_username
    jwt_token_login = response.json()["token"]
    print(f"User {test_username} logged in successfully.")
    assert jwt_token == jwt_token_login # Tokens should be same for the same user unless expiry changes

    # 3. Access user's own profile (should succeed)
    print(f"Accessing own profile (ID: {user_id})")
    headers = {"Authorization": f"Bearer {jwt_token}"}
    response = requests.get(f"{API_BASE_URL}/api/v1/users/{user_id}", headers=headers)
    print(f"Get own profile response status: {response.status_code}, body: {response.json()}")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["id"] == user_id
    print(f"Successfully accessed own profile.")

    # 4. Attempt to access a non-existent user (should fail with 404)
    print(f"Attempting to access non-existent user (ID: non_existent)")
    response = requests.get(f"{API_BASE_URL}/api/v1/users/non_existent", headers=headers)
    print(f"Get non-existent user response status: {response.status_code}, body: {response.json()}")
    assert response.status_code == 404
    assert response.json()["success"] is False
    assert response.json()["error"]["code"] == "NOT_FOUND"
    print(f"Correctly failed to access non-existent user.")

    # 5. Attempt to access another user's profile (should fail with 403, as not admin)
    print(f"Attempting to access another user's profile (ID: usr_1)")
    response = requests.get(f"{API_BASE_URL}/api/v1/users/usr_1", headers=headers)
    print(f"Get other user profile response status: {response.status_code}, body: {response.json()}")
    assert response.status_code == 403
    assert response.json()["success"] is False
    assert response.json()["error"]["code"] == "FORBIDDEN"
    print(f"Correctly failed to access another user's profile.")

    # 6. Delete the test user (clean up, assuming test_username is deleted by an admin later or manual cleanup)
    # This requires admin access, so it will be done as part of admin tests or manual cleanup
    # print(f"Deleting user: {user_id}")
    # response = requests.delete(f"{API_BASE_URL}/api/v1/users/{user_id}", headers=admin_headers)
    # print(f"Delete user response status: {response.status_code}, body: {response.json()}")
    # assert response.status_code == 200
    # print(f"User {user_id} deleted successfully.")


def test_admin_access_users():
    print("\n--- Testing Admin User Access ---")
    # This requires an admin user setup, e.g., from seed data or created dynamically
    # For this example, let's assume 'adminuser' with password 'Admin@123' exists in DB
    # We need to generate its actual hashed password and put in seed.sql
    admin_username = "adminuser"
    admin_password = "Admin@123" # This needs to be the actual password that results in the hash in seed.sql

    try:
        # Get admin token
        print(f"Logging in admin: {admin_username}")
        login_payload = {
            "username_or_email": admin_username,
            "password": admin_password
        }
        response = requests.post(f"{API_BASE_URL}/api/v1/auth/login", json=login_payload)
        print(f"Admin login response status: {response.status_code}")
        assert response.status_code == 200
        admin_token = response.json()["token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("Admin user logged in successfully.")

        # Access all users (should succeed)
        print("Accessing all users as admin...")
        response = requests.get(f"{API_BASE_URL}/api/v1/users", headers=admin_headers)
        print(f"Get all users response status: {response.status_code}, count: {len(response.json()['data'])}")
        assert response.status_code == 200
        assert response.json()["success"] is True
        assert len(response.json()["data"]) >= 1 # At least admin user
        print("Successfully accessed all users as admin.")

        # Update a non-admin user (e.g., john_doe) as admin
        john_doe_id = "usr_2" # From seed data
        print(f"Updating user {john_doe_id} as admin...")
        update_payload = {"first_name": "Jonathan", "last_name": "Doe"}
        response = requests.put(f"{API_BASE_URL}/api/v1/users/{john_doe_id}", headers=admin_headers, json=update_payload)
        print(f"Update user response status: {response.status_code}, body: {response.json()}")
        assert response.status_code == 200
        assert response.json()["success"] is True
        assert response.json()["data"]["first_name"] == "Jonathan"
        print(f"Successfully updated user {john_doe_id} as admin.")

        # Delete a non-admin user (e.g., jane_smith) as admin
        jane_smith_id = "usr_3" # From seed data
        print(f"Deleting user {jane_smith_id} as admin...")
        response = requests.delete(f"{API_BASE_URL}/api/v1/users/{jane_smith_id}", headers=admin_headers)
        print(f"Delete user response status: {response.status_code}, body: {response.json()}")
        assert response.status_code == 200
        assert response.json()["success"] is True
        print(f"Successfully deleted user {jane_smith_id} as admin.")

        # Attempt to delete self as admin (should fail)
        admin_user_id = response.json()["user"]["id"] # This will be from the login response for adminuser
        print(f"Attempting to delete admin user {admin_user_id} as admin (self-delete)...")
        response = requests.delete(f"{API_BASE_URL}/api/v1/users/{admin_user_id}", headers=admin_headers)
        print(f"Self-delete response status: {response.status_code}, body: {response.json()}")
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "FORBIDDEN"
        print(f"Correctly prevented admin self-deletion.")


    except requests.exceptions.ConnectionError as e:
        print(f"Error: Could not connect to API at {API_BASE_URL}. Is the server running? {e}", file=sys.stderr)
        sys.exit(1)
    except AssertionError as e:
        print(f"API Test Failed: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred during admin tests: {e}", file=sys.stderr)
        sys.exit(1)

def test_rate_limiting():
    print("\n--- Testing Rate Limiting ---")
    test_endpoint = f"{API_BASE_URL}/" # Using health check for rate limit test
    max_requests_per_minute = 60 # From config.env.example

    print(f"Sending {max_requests_per_minute + 5} requests to {test_endpoint} to trigger rate limit.")
    for i in range(max_requests_per_minute + 5):
        response = requests.get(test_endpoint)
        if response.status_code == 429:
            print(f"Rate limit hit after {i+1} requests. Status: {response.status_code}, Headers: {response.headers}")
            assert "Retry-After" in response.headers
            assert response.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"
            break
        assert response.status_code == 200, f"Expected 200, got {response.status_code} on request {i+1}"
        if i == max_requests_per_minute + 4:
            raise AssertionError("Rate limit was not hit as expected.")
    print("Rate limiting test passed.")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        API_BASE_URL = sys.argv[1].strip('/')

    test_health_check()
    test_user_registration_login_flow()
    test_admin_access_users()
    test_rate_limiting()
    print("\nAll API tests completed successfully!")
```

**Performance Tests Discussion:**

*   **Tools**:
    *   **Apache JMeter**: Powerful open-source tool for load testing, simulating high traffic.
    *   **k6**: Modern load testing tool that uses JavaScript for scripting, offers good integration with CI/CD.
    *   **Locust**: Python-based load testing tool, allows defining user behavior in code.
    *   **wrk**: HTTP benchmarking tool for basic, high-performance load generation.
*   **Metrics to Monitor**:
    *   **Response Time**: Average, P90, P95, P99 (percentiles) latencies.
    *   **Throughput**: Requests per second (RPS).
    *   **Error Rate**: Percentage of failed requests.
    *   **Resource Utilization**: CPU, Memory, Disk I/O, Network I/O of the application, database, and Redis servers.
    *   **Database Metrics**: Query execution times, connection pool usage, number of active connections.
*   **Test Scenarios**:
    *   **Smoke Test**: Light load to ensure basic functionality under stress.
    *   **Load Test**: Simulate expected user load to check performance under normal conditions.
    *   **Stress Test**: Push beyond expected load to find breaking points and observe how the system degrades.
    *   **Soak Test**: Run a moderate load over a long period (hours/days) to detect memory leaks, resource exhaustion, or other long-term stability issues.
*   **Implementation Steps**:
    1.  **Isolate Environment**: Run performance tests on a dedicated environment mirroring production as closely as possible.
    2.  **Define Workload**: Determine typical user flows (e.g., browse products, add to cart, checkout, login).
    3.  **Script Tests**: Use a tool like JMeter or k6 to script these user flows, including parameterization for unique users/products.
    4.  **Monitor**: Use monitoring tools (Prometheus, Grafana, `htop`, `vmstat`, `iostat`) to collect system metrics during the test.
    5.  **Analyze Results**: Compare against performance requirements (SLAs), identify bottlenecks (e.g., slow queries, CPU saturation, network latency), and iterate on optimizations.

---

### 5. Documentation

**`docs/README.md`**

```markdown