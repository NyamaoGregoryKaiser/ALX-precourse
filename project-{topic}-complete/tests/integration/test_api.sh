```bash
#!/bin/bash
set -euo pipefail

APP_URL="http://localhost:8080/api/v1"
ADMIN_USER="admin_test"
ADMIN_PASS="adminpass123"
MERCHANT_USER="merchant_test"
MERCHANT_PASS="merchantpass123"
TEST_EMAIL_ADMIN="admin_test@example.com"
TEST_EMAIL_MERCHANT="merchant_test@example.com"

echo "--- Starting Integration Tests ---"

# --- Helper function for JSON parsing ---
json_parse() {
    python -c "import sys, json; print(json.load(sys.stdin)[\"$1\"])"
}

# --- 1. Register Admin User ---
echo "Registering Admin User..."
REGISTER_ADMIN_PAYLOAD=$(cat <<EOF
{
  "username": "${ADMIN_USER}",
  "password": "${ADMIN_PASS}",
  "email": "${TEST_EMAIL_ADMIN}",
  "role": "ADMIN"
}
EOF
)
REGISTER_ADMIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$REGISTER_ADMIN_PAYLOAD" "${APP_URL}/auth/register")
echo "Response: ${REGISTER_ADMIN_RESPONSE}"
ADMIN_ID=$(echo "$REGISTER_ADMIN_RESPONSE" | json_parse "id")
echo "Admin User ID: ${ADMIN_ID}"
if [ -z "$ADMIN_ID" ]; then echo "Admin registration failed!"; exit 1; fi

# --- 2. Login Admin User ---
echo "Logging in Admin User..."
LOGIN_ADMIN_PAYLOAD=$(cat <<EOF
{
  "username": "${ADMIN_USER}",
  "password": "${ADMIN_PASS}"
}
EOF
)
LOGIN_ADMIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$LOGIN_ADMIN_PAYLOAD" "${APP_URL}/auth/login")
echo "Response: ${LOGIN_ADMIN_RESPONSE}"
ADMIN_TOKEN=$(echo "$LOGIN_ADMIN_RESPONSE" | json_parse "token")
echo "Admin Token: ${ADMIN_TOKEN:0:20}..." # Print first 20 chars
if [ -z "$ADMIN_TOKEN" ]; then echo "Admin login failed!"; exit 1; fi

# --- 3. Register Merchant User ---
echo "Registering Merchant User..."
REGISTER_MERCHANT_PAYLOAD=$(cat <<EOF
{
  "username": "${MERCHANT_USER}",
  "password": "${MERCHANT_PASS}",
  "email": "${TEST_EMAIL_MERCHANT}",
  "role": "MERCHANT"
}
EOF
)
REGISTER_MERCHANT_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$REGISTER_MERCHANT_PAYLOAD" "${APP_URL}/auth/register")
echo "Response: ${REGISTER_MERCHANT_RESPONSE}"
MERCHANT_ID=$(echo "$REGISTER_MERCHANT_RESPONSE" | json_parse "id")
echo "Merchant User ID: ${MERCHANT_ID}"
if [ -z "$MERCHANT_ID" ]; then echo "Merchant registration failed!"; exit 1; fi

# --- 4. Login Merchant User ---
echo "Logging in Merchant User..."
LOGIN_MERCHANT_PAYLOAD=$(cat <<EOF
{
  "username": "${MERCHANT_USER}",
  "password": "${MERCHANT_PASS}"
}
EOF
)
LOGIN_MERCHANT_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$LOGIN_MERCHANT_PAYLOAD" "${APP_URL}/auth/login")
echo "Response: ${LOGIN_MERCHANT_RESPONSE}"
MERCHANT_TOKEN=$(echo "$LOGIN_MERCHANT_RESPONSE" | json_parse "token")
echo "Merchant Token: ${MERCHANT_TOKEN:0:20}..."
if [ -z "$MERCHANT_TOKEN" ]; then echo "Merchant login failed!"; exit 1; fi

# --- 5. Create Merchant Account (as Merchant) ---
echo "Creating Merchant Account..."
CREATE_ACCOUNT_PAYLOAD=$(cat <<EOF
{
  "userId": ${MERCHANT_ID},
  "name": "My Primary Account",
  "currency": "USD",
  "initialBalance": 5000.00
}
EOF
)
CREATE_ACCOUNT_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${MERCHANT_TOKEN}" -d "$CREATE_ACCOUNT_PAYLOAD" "${APP_URL}/accounts")
echo "Response: ${CREATE_ACCOUNT_RESPONSE}"
MERCHANT_ACCOUNT_ID=$(echo "$CREATE_ACCOUNT_RESPONSE" | json_parse "id")
echo "Merchant Account ID: ${MERCHANT_ACCOUNT_ID}"
if [ -z "$MERCHANT_ACCOUNT_ID" ]; then echo "Account creation failed!"; exit 1; fi

# --- 6. Get Merchant Account (as Merchant) ---
echo "Getting Merchant Account..."
GET_ACCOUNT_RESPONSE=$(curl -s -X GET -H "Authorization: Bearer ${MERCHANT_TOKEN}" "${APP_URL}/accounts/${MERCHANT_ACCOUNT_ID}")
echo "Response: ${GET_ACCOUNT_RESPONSE}"
GET_ACCOUNT_ID=$(echo "$GET_ACCOUNT_RESPONSE" | json_parse "id")
if [ "$GET_ACCOUNT_ID" != "$MERCHANT_ACCOUNT_ID" ]; then echo "Get account failed!"; exit 1; fi

# --- 7. Process a Payment Transaction (as Merchant) ---
echo "Processing a Payment Transaction..."
PROCESS_TXN_PAYLOAD=$(cat <<EOF
{
  "accountId": ${MERCHANT_ACCOUNT_ID},
  "externalId": "txn_abc123",
  "type": "PAYMENT",
  "amount": 100.50,
  "currency": "USD",
  "description": "Customer purchase"
}
EOF
)
PROCESS_TXN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${MERCHANT_TOKEN}" -d "$PROCESS_TXN_PAYLOAD" "${APP_URL}/transactions")
echo "Response: ${PROCESS_TXN_RESPONSE}"
TXN_ID=$(echo "$PROCESS_TXN_RESPONSE" | json_parse "id")
TXN_STATUS=$(echo "$PROCESS_TXN_RESPONSE" | json_parse "status")
echo "Transaction ID: ${TXN_ID}, Status: ${TXN_STATUS}"
if [ -z "$TXN_ID" ] || [ "$TXN_STATUS" != "COMPLETED" ]; then echo "Transaction processing failed!"; exit 1; fi

# --- 8. Get Transactions for Account (as Merchant) ---
echo "Getting Transactions for Account..."
GET_TXNS_RESPONSE=$(curl -s -X GET -H "Authorization: Bearer ${MERCHANT_TOKEN}" "${APP_URL}/accounts/${MERCHANT_ACCOUNT_ID}/transactions?page=1&pageSize=10")
echo "Response: ${GET_TXNS_RESPONSE}"
TOTAL_TXNS=$(echo "$GET_TXNS_RESPONSE" | json_parse "totalItems")
if [ "$TOTAL_TXNS" -lt 1 ]; then echo "Get transactions failed, expected at least 1!"; exit 1; fi

# --- 9. Initiate a Refund (as Merchant) ---
echo "Initiating a Refund..."
REFUND_PAYLOAD=$(cat <<EOF
{
  "refundAmount": 50.00,
  "refundExternalId": "refund_xyz789",
  "description": "Partial refund for customer"
}
EOF
)
REFUND_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${MERCHANT_TOKEN}" -d "$REFUND_PAYLOAD" "${APP_URL}/transactions/${TXN_ID}/refund")
echo "Response: ${REFUND_RESPONSE}"
REFUND_TXN_ID=$(echo "$REFUND_RESPONSE" | json_parse "id")
REFUND_TXN_STATUS=$(echo "$REFUND_RESPONSE" | json_parse "status")
echo "Refund Transaction ID: ${REFUND_TXN_ID}, Status: ${REFUND_TXN_STATUS}"
if [ -z "$REFUND_TXN_ID" ] || [ "$REFUND_TXN_STATUS" != "COMPLETED" ]; then echo "Refund initiation failed!"; exit 1; fi

# --- 10. Admin attempts to get Merchant's Account (should succeed) ---
echo "Admin getting Merchant's Account..."
ADMIN_GET_MERCHANT_ACCOUNT_RESPONSE=$(curl -s -X GET -H "Authorization: Bearer ${ADMIN_TOKEN}" "${APP_URL}/accounts/${MERCHANT_ACCOUNT_ID}")
ADMIN_GET_MERCHANT_ACCOUNT_ID=$(echo "$ADMIN_GET_MERCHANT_ACCOUNT_RESPONSE" | json_parse "id")
if [ "$ADMIN_GET_MERCHANT_ACCOUNT_ID" != "$MERCHANT_ACCOUNT_ID" ]; then echo "Admin get merchant account failed!"; exit 1; fi

# --- 11. Merchant attempts to get another user's account (should fail 403) ---
echo "Merchant getting Admin's (non-existent, for simplicity) Account..."
curl_output=$(curl -s -w "%{http_code}" -X GET -H "Authorization: Bearer ${MERCHANT_TOKEN}" "${APP_URL}/accounts/999999") # Assuming 999999 is not Merchant's
HTTP_CODE="${curl_output: -3}"
if [ "$HTTP_CODE" != "403" ] && [ "$HTTP_CODE" != "404" ]; then # Can be 404 if account not found, or 403 if found but forbidden
    echo "Merchant unauthorized access test failed (expected 403 or 404, got $HTTP_CODE)!"
    exit 1
fi
echo "Merchant unauthorized access test passed (expected 403/404, got $HTTP_CODE)."


echo "--- All Integration Tests Passed! ---"
```