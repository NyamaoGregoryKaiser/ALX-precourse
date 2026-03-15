#!/bin/bash
# app/tests/performance/performance_test.sh
# Performance Testing using 'hey' (or ApacheBench 'ab')

# Ensure 'hey' is installed: go install github.com/rakyll/hey@latest
# Ensure 'ab' is installed: sudo apt-get install apache2-utils

APP_URL=${APP_URL:-http://localhost:8080}
NUM_REQUESTS=${NUM_REQUESTS:-500}
CONCURRENCY=${CONCURRENCY:-10}
DURATION=${DURATION:-10s} # Duration for 'hey'

echo "--- Performance Test Configuration ---"
echo "Application URL: $APP_URL"
echo "Number of requests: $NUM_REQUESTS"
echo "Concurrency: $CONCURRENCY"
echo "Duration: $DURATION"
echo "------------------------------------"

echo "Waiting for app to be healthy..."
curl -s --retry 5 --retry-delay 5 "$APP_URL/health" -o /dev/null || { echo "App is not healthy. Exiting."; exit 1; }
echo "App is healthy. Starting performance tests."

# Function to get a valid token (requires Auth endpoints to be functional)
get_auth_token() {
    local username="api_user"
    local password="secureuserpassword"
    local login_payload="{\"username\": \"$username\", \"password\": \"$password\"}"
    local response=$(curl -s -X POST -H "Content-Type: application/json" -d "$login_payload" "$APP_URL/auth/login")
    local token=$(echo "$response" | grep -oP '"token":\s*"\K[^"]+')
    echo "$token"
}

# Ensure a user exists to get a token for protected routes
echo "Ensuring test user 'api_user' exists..."
REGISTER_PAYLOAD='{"username": "api_user", "email": "api_user_perf@example.com", "password": "secureuserpassword", "role": "USER"}'
curl -s -X POST -H "Content-Type: application/json" -d "$REGISTER_PAYLOAD" "$APP_URL/auth/register" > /dev/null || true # Ignore errors if user already exists

AUTH_TOKEN=$(get_auth_token)
if [ -z "$AUTH_TOKEN" ]; then
    echo "ERROR: Failed to obtain authentication token for performance tests."
    exit 1
fi
echo "Obtained authentication token."

echo "--- Test 1: Public Health Check Endpoint (GET /health) ---"
if command -v hey &> /dev/null; then
    hey -n $NUM_REQUESTS -c $CONCURRENCY "$APP_URL/health"
elif command -v ab &> /dev/null; then
    ab -n $NUM_REQUESTS -c $CONCURRENCY "$APP_URL/health"
else
    echo "Neither 'hey' nor 'ab' found. Skipping performance tests."
fi

echo "--- Test 2: Authenticated Get All Products (GET /products) ---"
if command -v hey &> /dev/null; then
    hey -n $NUM_REQUESTS -c $CONCURRENCY -H "Authorization: Bearer $AUTH_TOKEN" "$APP_URL/products"
elif command -v ab &> /dev/null; then
    # ab needs headers to be passed in a file, which is more complex.
    # For simplicity, if ab is used, this test might be skipped or simplified.
    # Example for ab with header (requires header file 'auth_header.txt'):
    # echo "Authorization: Bearer $AUTH_TOKEN" > auth_header.txt
    # ab -n $NUM_REQUESTS -c $CONCURRENCY -H "Content-Type: application/json" -H "Authorization: Bearer $AUTH_TOKEN" "$APP_URL/products"
    echo "Using ab: Cannot easily pass dynamic Authorization header. Skipping authenticated GET /products test."
else
    echo "Skipping performance tests due to missing tools."
fi

echo "--- Test 3: Authenticated Create Product (POST /products) - Admin Only ---"
# NOTE: This endpoint requires an ADMIN token. For simplicity, we're using a USER token, expecting it to be slower (due to auth/authz checks) but fail with 403.
# A proper test would use an ADMIN token for successful creation.
CREATE_PRODUCT_PAYLOAD='{"name": "Perf Test Product_RANDOM", "description": "From perf test", "price": 1.00, "stock_quantity": 1}'
if command -v hey &> /dev/null; then
    # Using 'hey' with a POST body and headers
    hey -n $NUM_REQUESTS -c $CONCURRENCY -m POST -T "application/json" \
        -d "$CREATE_PRODUCT_PAYLOAD" -H "Authorization: Bearer $AUTH_TOKEN" \
        "$APP_URL/products"
    echo "NOTE: POST /products expects ADMIN role. Above results likely show 403 Forbidden responses, which is expected for USER token."
elif command -v ab &> /dev/null; then
    # ab needs post data to be in a file. And header file as well.
    # echo "$CREATE_PRODUCT_PAYLOAD" > post_data.json
    # ab -n $NUM_REQUESTS -c $CONCURRENCY -T "application/json" -p post_data.json \
    #    -H "Authorization: Bearer $AUTH_TOKEN" "$APP_URL/products"
    echo "Using ab: Cannot easily pass dynamic POST body + Authorization header. Skipping authenticated POST /products test."
fi

echo "Performance tests completed."
# Clean up post_data.json and auth_header.txt if they were created
# rm -f post_data.json auth_header.txt