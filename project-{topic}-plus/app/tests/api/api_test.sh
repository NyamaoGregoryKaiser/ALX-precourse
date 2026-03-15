#!/bin/bash
# app/tests/api/api_test.sh
# API Smoke Tests using curl

APP_URL=${APP_URL:-http://localhost:8080}
echo "Running API tests against: $APP_URL"
echo "Waiting for app to be healthy..."
curl -s --retry 5 --retry-delay 5 "$APP_URL/health" -o /dev/null || { echo "App is not healthy. Exiting."; exit 1; }
echo "App is healthy. Starting tests."

TEMP_FILE=$(mktemp)
ADMIN_TOKEN=""
USER_TOKEN=""

function assert_eq {
    local actual="$1"
    local expected="$2"
    local message="$3"
    if [[ "$actual" != "$expected" ]]; then
        echo "FAIL: $message (Actual: '$actual', Expected: '$expected')"
        exit 1
    else
        echo "PASS: $message"
    fi
}

function assert_status {
    local response="$1"
    local expected_status="$2"
    local message="$3"
    local actual_status=$(echo "$response" | grep HTTP/ | awk '{print $2}')
    assert_eq "$actual_status" "$expected_status" "$message"
}

function assert_json_value {
    local response="$1"
    local json_path="$2"
    local expected_value="$3"
    local message="$4"
    local actual_value=$(echo "$response" | grep -oP "$json_path" | head -1) # Using grep -oP for regex extraction
    assert_eq "$actual_value" "$expected_value" "$message"
}

# --- Test 1: Register a new user (admin) ---
echo "--- Test 1: Register Admin User ---"
REGISTER_ADMIN_PAYLOAD='{"username": "api_admin", "email": "api_admin@example.com", "password": "secureadminpassword", "role": "ADMIN"}'
REGISTER_ADMIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$REGISTER_ADMIN_PAYLOAD" -w "\n%{http_code}" "$APP_URL/auth/register" | tee "$TEMP_FILE")
HTTP_CODE=$(tail -n1 "$TEMP_FILE")
RESPONSE_BODY=$(head -n-1 "$TEMP_FILE")
assert_eq "$HTTP_CODE" "201" "Register admin user should return 201"
assert_json_value "$RESPONSE_BODY" '"username":\s*"api_admin"' '"username": "api_admin"' "Admin username in response"
ADMIN_TOKEN=$(echo "$RESPONSE_BODY" | grep -oP '"token":\s*"\K[^"]+')
assert_eq "${#ADMIN_TOKEN}" "200" "Admin token length check" # JWTs are typically >150 chars

# --- Test 2: Register a new user (regular user) ---
echo "--- Test 2: Register Regular User ---"
REGISTER_USER_PAYLOAD='{"username": "api_user", "email": "api_user@example.com", "password": "secureuserpassword", "role": "USER"}'
REGISTER_USER_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$REGISTER_USER_PAYLOAD" -w "\n%{http_code}" "$APP_URL/auth/register" | tee "$TEMP_FILE")
HTTP_CODE=$(tail -n1 "$TEMP_FILE")
RESPONSE_BODY=$(head -n-1 "$TEMP_FILE")
assert_eq "$HTTP_CODE" "201" "Register regular user should return 201"
assert_json_value "$RESPONSE_BODY" '"username":\s*"api_user"' '"username": "api_user"' "User username in response"
USER_TOKEN=$(echo "$RESPONSE_BODY" | grep -oP '"token":\s*"\K[^"]+')
assert_eq "${#USER_TOKEN}" "200" "User token length check"

# --- Test 3: Login existing user ---
echo "--- Test 3: Login Existing User ---"
LOGIN_PAYLOAD='{"username": "api_user", "password": "secureuserpassword"}'
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$LOGIN_PAYLOAD" -w "\n%{http_code}" "$APP_URL/auth/login" | tee "$TEMP_FILE")
HTTP_CODE=$(tail -n1 "$TEMP_FILE")
RESPONSE_BODY=$(head -n-1 "$TEMP_FILE")
assert_eq "$HTTP_CODE" "200" "Login should return 200"
assert_json_value "$RESPONSE_BODY" '"username":\s*"api_user"' '"username": "api_user"' "Logged-in username in response"

# --- Test 4: Get User Profile (api_user) ---
echo "--- Test 4: Get User Profile (api_user) ---"
USER_PROFILE_RESPONSE=$(curl -s -X GET -H "Authorization: Bearer $USER_TOKEN" -w "\n%{http_code}" "$APP_URL/users/me" | tee "$TEMP_FILE")
HTTP_CODE=$(tail -n1 "$TEMP_FILE")
RESPONSE_BODY=$(head -n-1 "$TEMP_FILE")
assert_eq "$HTTP_CODE" "200" "Get user profile should return 200"
assert_json_value "$RESPONSE_BODY" '"username":\s*"api_user"' '"username": "api_user"' "Profile username matches"

# --- Test 5: Get All Products (as api_user) ---
echo "--- Test 5: Get All Products (as api_user) ---"
GET_PRODUCTS_RESPONSE=$(curl -s -X GET -H "Authorization: Bearer $USER_TOKEN" -w "\n%{http_code}" "$APP_URL/products" | tee "$TEMP_FILE")
HTTP_CODE=$(tail -n1 "$TEMP_FILE")
RESPONSE_BODY=$(head -n-1 "$TEMP_FILE")
assert_eq "$HTTP_CODE" "200" "Get all products should return 200"
NUM_PRODUCTS=$(echo "$RESPONSE_BODY" | grep -oP '"id":' | wc -l) # Count product IDs
assert_eq "$NUM_PRODUCTS" "4" "Initial products count (from seed)"

# --- Test 6: Create Product (as api_user - should fail) ---
echo "--- Test 6: Create Product (as api_user - should fail) ---"
CREATE_PRODUCT_PAYLOAD='{"name": "User Product", "description": "Attempt by user", "price": 10.00, "stock_quantity": 5}'
CREATE_PRODUCT_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $USER_TOKEN" -H "Content-Type: application/json" -d "$CREATE_PRODUCT_PAYLOAD" -w "\n%{http_code}" "$APP_URL/products" | tee "$TEMP_FILE")
HTTP_CODE=$(tail -n1 "$TEMP_FILE")
RESPONSE_BODY=$(head -n-1 "$TEMP_FILE")
assert_eq "$HTTP_CODE" "403" "Create product as user should return 403 Forbidden"
assert_json_value "$RESPONSE_BODY" '"error":\s*"Forbidden"' '"error": "Forbidden"' "Forbidden error message"

# --- Test 7: Create Product (as api_admin - should succeed) ---
echo "--- Test 7: Create Product (as api_admin - should succeed) ---"
CREATE_PRODUCT_PAYLOAD='{"name": "Admin Product", "description": "Created by admin", "price": 100.00, "stock_quantity": 20}'
CREATE_PRODUCT_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d "$CREATE_PRODUCT_PAYLOAD" -w "\n%{http_code}" "$APP_URL/products" | tee "$TEMP_FILE")
HTTP_CODE=$(tail -n1 "$TEMP_FILE")
RESPONSE_BODY=$(head -n-1 "$TEMP_FILE")
assert_eq "$HTTP_CODE" "201" "Create product as admin should return 201"
assert_json_value "$RESPONSE_BODY" '"name":\s*"Admin Product"' '"name": "Admin Product"' "Product name in response"
CREATED_PRODUCT_ID=$(echo "$RESPONSE_BODY" | grep -oP '"id":\s*\K\d+')

# --- Test 8: Get All Products again (check new product) ---
echo "--- Test 8: Get All Products again (check new product) ---"
GET_PRODUCTS_RESPONSE=$(curl -s -X GET -H "Authorization: Bearer $USER_TOKEN" -w "\n%{http_code}" "$APP_URL/products" | tee "$TEMP_FILE")
HTTP_CODE=$(tail -n1 "$TEMP_FILE")
RESPONSE_BODY=$(head -n-1 "$TEMP_FILE")
assert_eq "$HTTP_CODE" "200" "Get all products should return 200"
NUM_PRODUCTS=$(echo "$RESPONSE_BODY" | grep -oP '"id":' | wc -l)
assert_eq "$NUM_PRODUCTS" "5" "Products count after admin creation"

# --- Test 9: Update Product (as api_admin) ---
echo "--- Test 9: Update Product (as api_admin) ---"
UPDATE_PRODUCT_PAYLOAD='{"price": 120.50, "stock_quantity": 18}'
UPDATE_PRODUCT_RESPONSE=$(curl -s -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d "$UPDATE_PRODUCT_PAYLOAD" -w "\n%{http_code}" "$APP_URL/products/$CREATED_PRODUCT_ID" | tee "$TEMP_FILE")
HTTP_CODE=$(tail -n1 "$TEMP_FILE")
RESPONSE_BODY=$(head -n-1 "$TEMP_FILE")
assert_eq "$HTTP_CODE" "200" "Update product as admin should return 200"
assert_json_value "$RESPONSE_BODY" '"price":\s*120.5' '"price": 120.5' "Updated price in response"

# --- Test 10: Delete Product (as api_user - should fail) ---
echo "--- Test 10: Delete Product (as api_user - should fail) ---"
DELETE_PRODUCT_RESPONSE=$(curl -s -X DELETE -H "Authorization: Bearer $USER_TOKEN" -w "\n%{http_code}" "$APP_URL/products/$CREATED_PRODUCT_ID" | tee "$TEMP_FILE")
HTTP_CODE=$(tail -n1 "$TEMP_FILE")
RESPONSE_BODY=$(head -n-1 "$TEMP_FILE")
assert_eq "$HTTP_CODE" "403" "Delete product as user should return 403 Forbidden"

# --- Test 11: Delete Product (as api_admin - should succeed) ---
echo "--- Test 11: Delete Product (as api_admin - should succeed) ---"
DELETE_PRODUCT_RESPONSE=$(curl -s -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" -w "\n%{http_code}" "$APP_URL/products/$CREATED_PRODUCT_ID" | tee "$TEMP_FILE")
HTTP_CODE=$(tail -n1 "$TEMP_FILE")
RESPONSE_BODY=$(head -n-1 "$TEMP_FILE")
assert_eq "$HTTP_CODE" "204" "Delete product as admin should return 204 No Content"

# --- Test 12: Get All Products again (check product deleted) ---
echo "--- Test 12: Get All Products again (check product deleted) ---"
GET_PRODUCTS_RESPONSE=$(curl -s -X GET -H "Authorization: Bearer $USER_TOKEN" -w "\n%{http_code}" "$APP_URL/products" | tee "$TEMP_FILE")
HTTP_CODE=$(tail -n1 "$TEMP_FILE")
RESPONSE_BODY=$(head -n-1 "$TEMP_FILE")
assert_eq "$HTTP_CODE" "200" "Get all products should return 200"
NUM_PRODUCTS=$(echo "$RESPONSE_BODY" | grep -oP '"id":' | wc -l)
assert_eq "$NUM_PRODUCTS" "4" "Products count after admin deletion"

# --- Test 13: Rate Limit Test (conceptual, might need more requests than 'hey' provides) ---
# NOTE: For actual rate limit testing, you'd need to send bursts of requests.
# This is a conceptual check.
echo "--- Test 13: Rate Limit Test (brief check) ---"
# Send a few requests to trigger the rate limiter (if config is low)
# Default config is 100 requests/min, so this might not hit it immediately.
# For CI, RATE_LIMIT_MAX_REQUESTS is often set high to avoid false positives.
RATE_LIMIT_RESPONSE=$(curl -s -X GET "$APP_URL/health" -w "\n%{http_code}" | tee "$TEMP_FILE")
HTTP_CODE=$(tail -n1 "$TEMP_FILE")
if [[ "$HTTP_CODE" == "429" ]]; then
    echo "PASS: Rate limit triggered (as expected with low limits)."
else
    echo "PASS: Rate limit not triggered (expected if limits are high or not enough requests)."
fi

# Clean up
rm "$TEMP_FILE"
echo "All API tests completed successfully."