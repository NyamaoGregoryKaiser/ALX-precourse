```bash
#!/bin/bash
# scripts/api_tests.sh
# Simple API tests using curl. Assumes the DB-Optimizer app is running on localhost:8080.

SERVER_URL="http://localhost:8080"
JWT_TOKEN=""

echo "Running API tests against ${SERVER_URL}"

# 1. Register a new user
echo -e "\n--- Registering User ---"
REGISTER_RESPONSE=$(curl -s -X POST "${SERVER_URL}/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword",
        "role": "user"
    }')
echo "Register Response: $REGISTER_RESPONSE"
if [[ "$REGISTER_RESPONSE" == *"User registered successfully"* ]]; then
    echo "User registration successful."
else
    echo "User registration failed or user already exists."
fi


# 2. Login as the registered user
echo -e "\n--- Logging in ---"
LOGIN_RESPONSE=$(curl -s -X POST "${SERVER_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test@example.com",
        "password": "testpassword"
    }')
echo "Login Response: $LOGIN_RESPONSE"
JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$JWT_TOKEN" ]; then
    echo "Login successful. JWT Token obtained."
else
    echo "Login failed."
    exit 1
fi

# 3. Access a protected endpoint (e.g., list users)
echo -e "\n--- Listing Users (Protected) ---"
LIST_USERS_RESPONSE=$(curl -s -X GET "${SERVER_URL}/users" \
    -H "Authorization: Bearer $JWT_TOKEN")
echo "List Users Response: $LIST_USERS_RESPONSE"
if [[ "$LIST_USERS_RESPONSE" == *"testuser"* ]]; then
    echo "Listing users successful."
else
    echo "Listing users failed or token invalid."
    exit 1
fi

# 4. Add a monitored database
echo -e "\n--- Adding Monitored DB ---"
ADD_DB_RESPONSE=$(curl -s -X POST "${SERVER_URL}/monitored-dbs" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d '{
        "name": "My Prod DB",
        "db_type": "PostgreSQL",
        "host": "target_postgres_db",
        "port": 5432,
        "db_name": "target_db",
        "db_user": "target_user",
        "db_password": "target_password"
    }')
echo "Add DB Response: $ADD_DB_RESPONSE"
MONITORED_DB_ID=$(echo "$ADD_DB_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -n "$MONITORED_DB_ID" ]; then
    echo "Monitored DB added successfully. ID: $MONITORED_DB_ID"
else
    echo "Failed to add monitored DB."
    exit 1
fi

# 5. List monitored databases
echo -e "\n--- Listing Monitored DBs ---"
LIST_DBS_RESPONSE=$(curl -s -X GET "${SERVER_URL}/monitored-dbs" \
    -H "Authorization: Bearer $JWT_TOKEN")
echo "List DBs Response: $LIST_DBS_RESPONSE"
if [[ "$LIST_DBS_RESPONSE" == *"My Prod DB"* ]]; then
    echo "Listing monitored DBs successful."
else
    echo "Listing monitored DBs failed."
    exit 1
fi

# 6. Trigger analysis (for demo purposes)
echo -e "\n--- Triggering Manual Analysis for DB ID ${MONITORED_DB_ID} ---"
ANALYZE_RESPONSE=$(curl -s -X POST "${SERVER_URL}/monitored-dbs/${MONITORED_DB_ID}/analyze" \
    -H "Authorization: Bearer $JWT_TOKEN")
echo "Analyze Response: $ANALYZE_RESPONSE"
if [[ "$ANALYZE_RESPONSE" == *"Analysis triggered successfully"* ]]; then
    echo "Analysis triggered."
else
    echo "Failed to trigger analysis."
    # Don't exit here, it might just be an async process
fi

# Simulate some queries on the target_db to generate pg_stat_statements data
echo -e "\n--- Simulating queries on target_postgres_db:5432/target_db ---"
# Needs `psql` client available. This is typically run manually or in a test environment.
# Assuming target_postgres_db is running and accessible from the test script's environment
echo "Running: psql -h localhost -p 5433 -U target_user -d target_db -c \"SELECT * FROM products WHERE category_id = 1;\""
PGPASSWORD=target_password psql -h localhost -p 5433 -U target_user -d target_db -c "SELECT * FROM products WHERE category_id = 1;" &> /dev/null
echo "Running: psql -h localhost -p 5433 -U target_user -d target_db -c \"SELECT o.id, p.name FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id WHERE o.user_id = 1;\""
PGPASSWORD=target_password psql -h localhost -p 5433 -U target_user -d target_db -c "SELECT o.id, p.name FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id WHERE o.user_id = 1;" &> /dev/null
echo "Queries simulated. Waiting 5 seconds for pg_stat_statements to update..."
sleep 5

# Trigger analysis again after queries
echo -e "\n--- Triggering Manual Analysis (2nd time) for DB ID ${MONITORED_DB_ID} ---"
ANALYZE_RESPONSE_2=$(curl -s -X POST "${SERVER_URL}/monitored-dbs/${MONITORED_DB_ID}/analyze" \
    -H "Authorization: Bearer $JWT_TOKEN")
echo "Analyze Response 2: $ANALYZE_RESPONSE_2"


# 7. Get optimization reports
echo -e "\n--- Getting Optimization Reports for DB ID ${MONITORED_DB_ID} ---"
REPORTS_RESPONSE=$(curl -s -X GET "${SERVER_URL}/monitored-dbs/${MONITORED_DB_ID}/optimization-reports" \
    -H "Authorization: Bearer $JWT_TOKEN")
echo "Reports Response: $REPORTS_RESPONSE"
if [[ "$REPORTS_RESPONSE" == *"recommendation"* ]]; then
    echo "Optimization reports retrieved successfully."
else
    echo "No optimization reports found or retrieval failed."
fi


echo -e "\n--- All API tests finished ---"
```