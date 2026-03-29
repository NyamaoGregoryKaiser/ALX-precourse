```bash
#!/bin/bash
# Simple Performance Test Script using curl and ApacheBench (ab)

# Configuration
BACKEND_URL="http://localhost:5000/api"
LOGIN_ENDPOINT="$BACKEND_URL/auth/login"
PRODUCTS_ENDPOINT="$BACKEND_URL/products"
REGISTER_ENDPOINT="$BACKEND_URL/auth/register" # For stress testing registration if needed

EMAIL="test_user@perf.com"
PASSWORD="perf_password"
NUM_REQUESTS=100  # Number of requests for 'ab'
CONCURRENCY=10    # Concurrency for 'ab'

echo "Starting Performance Tests..."
echo "Backend URL: $BACKEND_URL"

# 1. Register a test user (if not exists)
echo -e "\n--- Step 1: Registering Test User (if needed) ---"
register_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  $REGISTER_ENDPOINT)

if echo "$register_response" | grep -q "User registered successfully"; then
  echo "User $EMAIL registered."
elif echo "$register_response" | grep -q "User with this email already exists"; then
  echo "User $EMAIL already exists, proceeding with login."
else
  echo "Failed to register user: $register_response"
  # exit 1 # Uncomment to exit on registration failure
fi

# 2. Login to get a token
echo -e "\n--- Step 2: Logging in to get JWT token ---"
LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  $LOGIN_ENDPOINT)

JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$JWT_TOKEN" == "null" ] || [ -z "$JWT_TOKEN" ]; then
  echo "Failed to get JWT token. Login response: $LOGIN_RESPONSE"
  exit 1
fi
echo "JWT Token obtained."

# 3. Basic GET /products test using curl
echo -e "\n--- Step 3: Basic GET /products (authenticated) via curl ---"
AUTH_HEADER="Authorization: Bearer $JWT_TOKEN"
CURL_PRODUCT_RESPONSE=$(curl -s -H "$AUTH_HEADER" $PRODUCTS_ENDPOINT)
echo "GET /products response sample: $(echo "$CURL_PRODUCT_RESPONSE" | head -n 10 | cut -c 1-200)..."

if echo "$CURL_PRODUCT_RESPONSE" | grep -q "\"id\":"; then
  echo "GET /products successful."
else
  echo "GET /products failed. Response: $CURL_PRODUCT_RESPONSE"
fi

# 4. Stress test GET /products using ApacheBench (ab)
echo -e "\n--- Step 4: Stress testing GET /products (authenticated) via ApacheBench ---"
echo "Running $NUM_REQUESTS requests with $CONCURRENCY concurrency..."

# Create a temporary file to store the Authorization header for 'ab'
HEADER_FILE=$(mktemp)
echo "Authorization: Bearer $JWT_TOKEN" > "$HEADER_FILE"

ab -n $NUM_REQUESTS -c $CONCURRENCY -H "Authorization: Bearer $JWT_TOKEN" "$PRODUCTS_ENDPOINT" > ab_results_products.txt
# Alternatively, use -H @"$HEADER_FILE" if the header is too complex for direct -H

echo "ApacheBench results saved to ab_results_products.txt"
cat ab_results_products.txt | grep "Time taken for tests"
cat ab_results_products.txt | grep "Requests per second"
cat ab_results_products.txt | grep "Failed requests"
cat ab_results_products.txt | grep "Latency"
cat ab_results_products.txt | grep "Transfer rate"

# Clean up temporary file
rm "$HEADER_FILE"

# 5. (Optional) Stress test POST /products using 'ab' with a dummy payload
# This requires a body file for 'ab'
# echo -e "\n--- Step 5: Stress testing POST /products (authenticated) via ApacheBench ---"
# POST_DATA_FILE=$(mktemp)
# echo '{"name": "PerfTestProduct_'$RANDOM'","description":"Stress test product","price":10.99}' > "$POST_DATA_FILE"
# echo "Running $NUM_REQUESTS POST requests with $CONCURRENCY concurrency..."
# ab -n $NUM_REQUESTS -c $CONCURRENCY -T "application/json" -p "$POST_DATA_FILE" -H "Authorization: Bearer $JWT_TOKEN" "$PRODUCTS_ENDPOINT" > ab_results_post_products.txt
# echo "ApacheBench POST results saved to ab_results_post_products.txt"
# rm "$POST_DATA_FILE"

echo -e "\nPerformance tests completed."
echo "Review 'ab_results_products.txt' for detailed metrics."
```