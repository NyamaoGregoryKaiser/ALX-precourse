```bash
#!/bin/bash
# scripts/run_performance_test.sh
# Runs a simple performance test using ApacheBench (ab) on a few endpoints.

SERVER_URL="http://localhost:8080"
NUM_REQUESTS=${1:-1000}
CONCURRENCY=${2:-100}

echo "Running performance test with ${NUM_REQUESTS} requests and ${CONCURRENCY} concurrency."
echo "Target: ${SERVER_URL}"

# Check if ApacheBench is installed
if ! command -v ab &> /dev/null
then
    echo "ApacheBench (ab) is not installed. Please install it (e.g., sudo apt-get install apache2-utils)."
    exit 1
fi

echo -e "\n--- Performance Test: GET /health ---"
ab -n ${NUM_REQUESTS} -c ${CONCURRENCY} "${SERVER_URL}/health"

# For protected endpoints, we need a valid JWT token
# First, log in to get a token
echo -e "\n--- Logging in to get JWT token for authenticated tests ---"
LOGIN_RESPONSE=$(curl -s -X POST "${SERVER_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "admin@example.com",
        "password": "adminpass"
    }')
JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JWT_TOKEN" ]; then
    echo "Failed to get JWT token. Cannot run authenticated performance tests."
    exit 1
fi

AUTH_HEADER="Authorization: Bearer $JWT_TOKEN"

echo -e "\n--- Performance Test: GET /users (Authenticated) ---"
# Note: ab doesn't directly support custom headers without a file.
# For more advanced scenarios, consider 'hey' or 'JMeter'.
# This is a basic demonstration.
echo "Using custom headers for 'ab' requires a file (-H option in ab)."
echo "For simplicity, manually running a few requests with curl for demonstration:"
curl -H "$AUTH_HEADER" "${SERVER_URL}/users" -s -o /dev/null -w "Status: %{http_code}\n"
curl -H "$AUTH_HEADER" "${SERVER_URL}/users" -s -o /dev/null -w "Status: %{http_code}\n"

echo -e "\n--- Performance Test: GET /monitored-dbs (Authenticated) ---"
curl -H "$AUTH_HEADER" "${SERVER_URL}/monitored-dbs" -s -o /dev/null -w "Status: %{http_code}\n"
curl -H "$AUTH_HEADER" "${SERVER_URL}/monitored-dbs" -s -o /dev/null -w "Status: %{http_code}\n"

echo -e "\n--- Performance tests complete. ---"
```