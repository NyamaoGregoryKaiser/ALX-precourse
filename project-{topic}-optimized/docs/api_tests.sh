#!/bin/bash
# A simple script for API smoke testing using curl

BACKEND_URL="http://localhost:8080"
ADMIN_TOKEN=""
USER_TOKEN=""

# --- Helper function for JSON output ---
json_pretty_print() {
  if command -v jq &> /dev/null; then
    echo "$1" | jq .
  else
    echo "$1"
  fi
}

echo "--- 1. Register a new user ---"
REGISTER_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }')
json_pretty_print "$REGISTER_RESPONSE"
echo ""

echo "--- 2. Register an admin user ---"
REGISTER_ADMIN_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "adminuser",
    "email": "admin@example.com",
    "password": "adminpassword",
    "role": "admin"
  }') # Role specified in registration might be ignored by service logic
json_pretty_print "$REGISTER_ADMIN_RESPONSE"
echo ""

echo "--- 3. Login testuser ---"
LOGIN_USER_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username_or_email": "test@example.com",
    "password": "password123"
  }')
USER_TOKEN=$(echo "$LOGIN_USER_RESPONSE" | jq -r .token)
json_pretty_print "$LOGIN_USER_RESPONSE"
echo "USER_TOKEN: $USER_TOKEN"
echo ""

echo "--- 4. Login adminuser ---"
LOGIN_ADMIN_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username_or_email": "admin@example.com",
    "password": "adminpassword"
  }')
ADMIN_TOKEN=$(echo "$LOGIN_ADMIN_RESPONSE" | jq -r .token)
json_pretty_print "$LOGIN_ADMIN_RESPONSE"
echo "ADMIN_TOKEN: $ADMIN_TOKEN"
echo ""

echo "--- 5. Get user profile (testuser) ---"
curl -s -X GET "${BACKEND_URL}/profile" \
  -H "Authorization: Bearer $USER_TOKEN" | json_pretty_print
echo ""

echo "--- 6. Get all products (public) ---"
curl -s -X GET "${BACKEND_URL}/products" | json_pretty_print
echo ""

echo "--- 7. Create a product (as admin) ---"
CREATE_PRODUCT_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/admin/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Super Gadget",
    "description": "An amazing new gadget.",
    "price": 49.99,
    "stock_quantity": 250
  }')
PRODUCT_ID=$(echo "$CREATE_PRODUCT_RESPONSE" | jq -r .id)
json_pretty_print "$CREATE_PRODUCT_RESPONSE"
echo "New Product ID: $PRODUCT_ID"
echo ""

echo "--- 8. Get the newly created product (public) ---"
curl -s -X GET "${BACKEND_URL}/products/${PRODUCT_ID}" | json_pretty_print
echo ""

echo "--- 9. Update product stock (as admin) ---"
curl -s -X PUT "${BACKEND_URL}/admin/products/${PRODUCT_ID}/stock" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity_change": -50
  }' | json_pretty_print
echo ""

echo "--- 10. Create an order (as testuser) ---"
CREATE_ORDER_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/orders" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [
      {
        \"product_id\": ${PRODUCT_ID},
        \"quantity\": 10
      }
    ]
  }")
ORDER_ID=$(echo "$CREATE_ORDER_RESPONSE" | jq -r .id)
json_pretty_print "$CREATE_ORDER_RESPONSE"
echo "New Order ID: $ORDER_ID"
echo ""

echo "--- 11. Get orders for testuser ---"
curl -s -X GET "${BACKEND_URL}/orders" \
  -H "Authorization: Bearer $USER_TOKEN" | json_pretty_print
echo ""

echo "--- 12. Get a specific order (as testuser) ---"
curl -s -X GET "${BACKEND_URL}/orders/${ORDER_ID}" \
  -H "Authorization: Bearer $USER_TOKEN" | json_pretty_print
echo ""

echo "--- 13. Update order status (as admin) ---"
curl -s -X PUT "${BACKEND_URL}/admin/orders/${ORDER_ID}/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "processed"
  }' | json_pretty_print
echo ""

echo "--- 14. Cancel order (as testuser) ---"
curl -s -X POST "${BACKEND_URL}/orders/${ORDER_ID}/cancel" \
  -H "Authorization: Bearer $USER_TOKEN" | json_pretty_print
echo ""

echo "--- 15. Attempt to delete product as normal user (should fail) ---"
curl -s -X DELETE "${BACKEND_URL}/admin/products/${PRODUCT_ID}" \
  -H "Authorization: Bearer $USER_TOKEN" | json_pretty_print
echo ""

echo "--- 16. Delete product (as admin) ---"
curl -s -X DELETE "${BACKEND_URL}/admin/products/${PRODUCT_ID}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | json_pretty_print
echo ""

echo "--- API Smoke Test Complete ---"
```

**Performance Tests**:
*   **Tools**: Apache JMeter, K6, Locust, or `ab` (Apache Bench) for simple HTTP load.
*   **Strategy**:
    1.  **Baseline**: Measure latency and throughput for a few critical endpoints (e.g., login, get products) with `ab -n 1000 -c 10 <URL>`.
    2.  **Load Testing**: Gradually increase concurrent users and requests. Monitor server resources (CPU, Memory, Network I/O) using `htop`, `dstat`, `Grafana/Prometheus`.
    3.  **Stress Testing**: Push the system beyond its limits to find breaking points.
    4.  **Scalability Testing**: How does performance change when adding more backend instances or database capacity?
    5.  **Benchmarking**: Compare current performance against previous versions or defined SLAs.
*   **Optimization**: Profile C++ code with `perf` or `Valgrind`'s `callgrind` to identify hot spots. Optimize database queries (explain analyze), add indexes. Introduce caching (Redis) for frequently accessed, less dynamic data.

### 5. Documentation

**`docs/README.md`**
```markdown