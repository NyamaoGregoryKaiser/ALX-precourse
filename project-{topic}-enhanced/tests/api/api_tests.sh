```bash
#!/bin/bash

# API Integration Tests for Task Management System

# Base URL for the API
BASE_URL="http://localhost:18080"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Temporary file for storing JWT token
TOKEN_FILE="/tmp/jwt_token.txt"

# Admin credentials from .env.example
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="adminpassword123"

# Test user credentials
TEST_USERNAME="testuser_$(date +%s)"
TEST_PASSWORD="testpassword123"
TEST_EMAIL="testuser_$(date +%s)@example.com"

# Admin token
ADMIN_TOKEN=""

# Function to log messages
log() {
    local type="$1" # INFO, SUCCESS, ERROR, WARNING
    local message="$2"
    case "$type" in
        "INFO")    echo -e "${YELLOW}[INFO]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[ERROR]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[WARNING]${NC} $message" ;;
    esac
}

# Function to check if the API is running
check_api_health() {
    log INFO "Checking API health at $BASE_URL/health..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
    if [ "$response" -eq 200 ]; then
        log SUCCESS "API is healthy!"
    else
        log ERROR "API is not healthy. Status code: $response. Please ensure the application is running."
        exit 1
    fi
}

# Function to make an authenticated request
authenticated_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local token="$4"
    local headers=(-H "Content-Type: application/json")
    if [ -n "$token" ]; then
        headers+=(-H "Authorization: Bearer $token")
    fi

    if [ "$method" == "GET" ]; then
        curl -s -X GET "${headers[@]}" "$BASE_URL$endpoint"
    elif [ "$method" == "POST" ]; then
        curl -s -X POST "${headers[@]}" -d "$data" "$BASE_URL$endpoint"
    elif [ "$method" == "PUT" ]; then
        curl -s -X PUT "${headers[@]}" -d "$data" "$BASE_URL$endpoint"
    elif [ "$method" == "DELETE" ]; then
        curl -s -X DELETE "${headers[@]}" "$BASE_URL$endpoint"
    else
        log ERROR "Unsupported HTTP method: $method"
        return 1
    fi
}

# Function to perform a test case
run_test() {
    local name="$1"
    local command="$2"
    local expected_code="$3"
    local expected_keyword="$4" # Optional: keyword to check in response body

    log INFO "Running test: $name"
    response=$($command)
    http_code=$(echo "$response" | head -n 1 | grep -o -E '[0-9]{3}' | tail -n 1) # Extract HTTP code from response header/body

    # Extract HTTP code from actual response, assuming the first line is status code in some curl outputs
    # Or, if curl outputs JSON, try to get 'code' field. For simplicity with -s, we might need to parse.
    # A more robust approach: curl -s -w "%{http_code}\n" -o /dev/stderr ... | jq .
    actual_code=$(echo "$response" | grep -o '"code":[0-9]*' | grep -o '[0-9]*')
    if [ -z "$actual_code" ]; then
        actual_code=$(echo "$response" | head -n 1 | grep -o -E '[0-9]{3}' | tail -n 1) # Fallback if JSON code not found
    fi

    if [ "$actual_code" -eq "$expected_code" ]; then
        if [ -n "$expected_keyword" ]; then
            if echo "$response" | grep -q "$expected_keyword"; then
                log SUCCESS "$name (Code: $actual_code, Keyword: '$expected_keyword')"
                return 0
            else
                log ERROR "$name (Code: $actual_code, Expected keyword '$expected_keyword' NOT found)"
                log ERROR "Response: $response"
                return 1
            fi
        else
            log SUCCESS "$name (Code: $actual_code)"
            return 0
        fi
    else
        log ERROR "$name (Expected: $expected_code, Got: $actual_code)"
        log ERROR "Response: $response"
        return 1
    fi
}

# --- Main Test Execution ---
check_api_health

log INFO "--- Starting API Tests ---"
TEST_FAILURES=0

# 1. Admin User Login
log INFO "Attempting to log in admin user..."
ADMIN_LOGIN_RES=$(authenticated_request "POST" "/auth/login" "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RES" | grep -o '"token":"[^"]*"' | grep -o ':[^"]*' | cut -d'"' -f2)
if [ -n "$ADMIN_TOKEN" ]; then
    log SUCCESS "Admin user logged in. Token obtained."
    echo "$ADMIN_TOKEN" > "$TOKEN_FILE"
else
    log ERROR "Failed to log in admin user. Check .env settings and bootstrap."
    TEST_FAILURES=$((TEST_FAILURES + 1))
fi

if [ "$TEST_FAILURES" -eq 0 ]; then

    # 2. Register a new test user
    run_test "User Registration" \
        "authenticated_request \"POST\" \"/auth/register\" \"{\\\"username\\\":\\\"$TEST_USERNAME\\\",\\\"password\\\":\\\"$TEST_PASSWORD\\\",\\\"email\\\":\\\"$TEST_EMAIL\\\"}\"" \
        201 "User registered successfully" || TEST_FAILURES=$((TEST_FAILURES + 1))

    # 3. Test registration with existing username (should fail)
    run_test "User Registration (Existing Username)" \
        "authenticated_request \"POST\" \"/auth/register\" \"{\\\"username\\\":\\\"$TEST_USERNAME\\\",\\\"password\\\":\\\"somepass\\\",\\\"email\\\":\\\"other@email.com\\\"}\"" \
        409 "already exists" || TEST_FAILURES=$((TEST_FAILURES + 1))

    # 4. Login test user
    log INFO "Attempting to log in test user..."
    LOGIN_RES=$(authenticated_request "POST" "/auth/login" "{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}")
    USER_TOKEN=$(echo "$LOGIN_RES" | grep -o '"token":"[^"]*"' | grep -o ':[^"]*' | cut -d'"' -f2)
    TEST_USER_ID=$(echo "$LOGIN_RES" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
    if [ -n "$USER_TOKEN" ]; then
        log SUCCESS "Test user logged in. Token obtained."
    else
        log ERROR "Failed to log in test user."
        TEST_FAILURES=$((TEST_FAILURES + 1))
    fi

    if [ "$TEST_FAILURES" -eq 0 ]; then # Only proceed with user-specific tests if login was successful

        # 5. Get own user profile
        run_test "Get Own User Profile" \
            "authenticated_request \"GET\" \"/api/v1/users/me\" \"\" \"$USER_TOKEN\"" \
            200 "$TEST_USERNAME" || TEST_FAILURES=$((TEST_FAILURES + 1))

        # 6. Update own user profile
        run_test "Update Own User Email" \
            "authenticated_request \"PUT\" \"/api/v1/users/me\" \"{\\\"email\\\":\\\"new_$TEST_EMAIL\\\"}\" \"$USER_TOKEN\"" \
            200 "User profile updated successfully" || TEST_FAILURES=$((TEST_FAILURES + 1))

        # 7. Create a task
        run_test "Create Task" \
            "authenticated_request \"POST\" \"/api/v1/tasks\" \"{\\\"title\\\":\\\"My First Task\\\",\\\"description\\\":\\\"This is a test task.\\\",\\\"status\\\":\\\"pending\\\"}\" \"$USER_TOKEN\"" \
            201 "Task created successfully" || TEST_FAILURES=$((TEST_FAILURES + 1))
        TASK_ID=$(echo "$response" | grep -o '"task_id":[0-9]*' | grep -o '[0-9]*')
        log INFO "Created task with ID: $TASK_ID"

        # 8. Get user's tasks
        run_test "Get User's Tasks" \
            "authenticated_request \"GET\" \"/api/v1/tasks\" \"\" \"$USER_TOKEN\"" \
            200 "My First Task" || TEST_FAILURES=$((TEST_FAILURES + 1))

        # 9. Get specific task
        if [ -n "$TASK_ID" ]; then
            run_test "Get Specific Task" \
                "authenticated_request \"GET\" \"/api/v1/tasks/$TASK_ID\" \"\" \"$USER_TOKEN\"" \
                200 "My First Task" || TEST_FAILURES=$((TEST_FAILURES + 1))
        else
            log WARNING "Skipping 'Get Specific Task' test as TASK_ID is empty."
        fi

        # 10. Update specific task
        if [ -n "$TASK_ID" ]; then
            run_test "Update Specific Task" \
                "authenticated_request \"PUT\" \"/api/v1/tasks/$TASK_ID\" \"{\\\"title\\\":\\\"Updated Task Title\\\",\\\"status\\\":\\\"completed\\\"}\" \"$USER_TOKEN\"" \
                200 "Task updated successfully" || TEST_FAILURES=$((TEST_FAILURES + 1))
        else
            log WARNING "Skipping 'Update Specific Task' test as TASK_ID is empty."
        fi

        # 11. Admin attempts to get all users
        run_test "Admin Get All Users" \
            "authenticated_request \"GET\" \"/api/v1/users\" \"\" \"$ADMIN_TOKEN\"" \
            200 "$TEST_USERNAME" || TEST_FAILURES=$((TEST_FAILURES + 1))

        # 12. Non-admin attempts to get all users (should fail)
        run_test "User Get All Users (Forbidden)" \
            "authenticated_request \"GET\" \"/api/v1/users\" \"\" \"$USER_TOKEN\"" \
            403 "You are not authorized" || TEST_FAILURES=$((TEST_FAILURES + 1))

        # 13. Admin attempts to get all tasks (with ?all=true)
        run_test "Admin Get All Tasks" \
            "authenticated_request \"GET\" \"/api/v1/tasks?all=true\" \"\" \"$ADMIN_TOKEN\"" \
            200 "Updated Task Title" || TEST_FAILURES=$((TEST_FAILURES + 1))

        # 14. Non-admin attempts to get all tasks (with ?all=true) (should fail)
        run_test "User Get All Tasks (Forbidden)" \
            "authenticated_request \"GET\" \"/api/v1/tasks?all=true\" \"\" \"$USER_TOKEN\"" \
            403 "You are not authorized" || TEST_FAILURES=$((TEST_FAILURES + 1))

        # 15. Delete specific task
        if [ -n "$TASK_ID" ]; then
            run_test "Delete Specific Task" \
                "authenticated_request \"DELETE\" \"/api/v1/tasks/$TASK_ID\" \"\" \"$USER_TOKEN\"" \
                200 "Task deleted successfully" || TEST_FAILURES=$((TEST_FAILURES + 1))
        else
            log WARNING "Skipping 'Delete Specific Task' test as TASK_ID is empty."
        fi
        
        # 16. Test rate limiting (this is hard to test deterministically in a script)
        # Assuming RATE_LIMIT_REQUESTS=100, RATE_LIMIT_WINDOW_SECONDS=60
        # This will send a burst of requests to trigger the limit.
        # This test might fail if the server is too fast or slow, or network latency.
        log INFO "Testing Rate Limiting (this might be flaky in CI/CD)"
        RATE_LIMIT_ENDPOINT="/api/v1/users/me"
        RATE_LIMIT_BURST=105 # More than the default 100
        SUCCESSFUL_REQUESTS=0
        FAILED_REQUESTS=0

        for i in $(seq 1 $RATE_LIMIT_BURST); do
            RESPONSE=$(authenticated_request "GET" "$RATE_LIMIT_ENDPOINT" "" "$USER_TOKEN")
            HTTP_CODE=$(echo "$RESPONSE" | grep -o '"code":[0-9]*' | grep -o '[0-9]*' || echo "0")
            if [ "$HTTP_CODE" -eq 200 ]; then
                SUCCESSFUL_REQUESTS=$((SUCCESSFUL_REQUESTS + 1))
            elif [ "$HTTP_CODE" -eq 429 ]; then
                FAILED_REQUESTS=$((FAILED_REQUESTS + 1))
            fi
        done

        if [ "$SUCCESSFUL_REQUESTS" -ge 95 ] && [ "$FAILED_REQUESTS" -ge 1 ]; then
            log SUCCESS "Rate Limiting Test: Successfully triggered 429 after ~100 requests. (Success: $SUCCESSFUL_REQUESTS, Failed: $FAILED_REQUESTS)"
        else
            log ERROR "Rate Limiting Test FAILED. Did not trigger 429 or too many/few 429s. (Success: $SUCCESSFUL_REQUESTS, Failed: $FAILED_REQUESTS)"
            TEST_FAILURES=$((TEST_FAILURES + 1))
            log ERROR "Last response: $RESPONSE"
        fi


        # 17. Delete test user account (and associated tasks due to CASCADE)
        run_test "Delete Own User Account" \
            "authenticated_request \"DELETE\" \"/api/v1/users/me\" \"\" \"$USER_TOKEN\"" \
            200 "User account deleted successfully" || TEST_FAILURES=$((TEST_FAILURES + 1))

        # 18. Attempt to get deleted user's profile (should fail)
        run_test "Get Deleted User Profile (Unauthorized/Not Found)" \
            "authenticated_request \"GET\" \"/api/v1/users/me\" \"\" \"$USER_TOKEN\"" \
            401 "Invalid or expired authentication token" ||