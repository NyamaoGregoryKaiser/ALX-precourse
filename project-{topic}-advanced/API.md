```markdown
# Payment Processing System API Documentation

This document describes the RESTful API endpoints for the Payment Processing System.

## Base URL

`/api/v1`

## Authentication

### Internal User Authentication (JWT)

For internal users (e.g., administrators managing merchants), authentication is performed using **Bearer Tokens (JWT)**.
*   After successful login to `/api/v1/auth/login`, you will receive an `accessToken`.
*   Include this token in the `Authorization` header for protected routes: `Authorization: Bearer <accessToken>`.

### Merchant API Key Authentication

For merchant-facing APIs (e.g., processing transactions, querying merchant's transactions), authentication is performed using a **custom API Key**.
*   Merchants are issued a unique API key upon creation (or rotation).
*   Include this API key in the `X-Api-Key` header for protected routes: `X-Api-Key: <merchant_api_key>`.

---

## 1. Auth Endpoints (Internal Users)

### Register a new internal user

`POST /api/v1/auth/register`

Registers a new internal user (e.g., admin or operator).

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "Password123!",
  "role": "admin"  // Optional, defaults to 'user'. Only 'admin' can create other admins.
}
```

**Responses:**
*   `201 Created`: User registered successfully.
    ```json
    {
      "user": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "admin",
        "isEmailVerified": false,
        "createdAt": "...",
        "updatedAt": "..."
      },
      "tokens": {
        "access": {
          "token": "jwt_access_token",
          "expires": "date_time"
        },
        "refresh": {
          "token": "jwt_refresh_token",
          "expires": "date_time"
        }
      }
    }
    ```
*   `400 Bad Request`: Email already taken, or password does not meet criteria.

### Login an internal user

`POST /api/v1/auth/login`

Authenticates an internal user and returns JWT access and refresh tokens.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "Password123!"
}
```

**Responses:**
*   `200 OK`: Login successful.
    ```json
    {
      "user": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "admin",
        "isEmailVerified": false,
        "createdAt": "...",
        "updatedAt": "..."
      },
      "tokens": {
        "access": {
          "token": "jwt_access_token",
          "expires": "date_time"
        },
        "refresh": {
          "token": "jwt_refresh_token",
          "expires": "date_time"
        }
      }
    }
    ```
*   `401 Unauthorized`: Incorrect email or password.

---

## 2. Merchants Endpoints (Internal Users Only - Admin Role)

**Authentication:** Requires JWT Bearer token with `admin` role.

### Create a new merchant

`POST /api/v1/merchants`

**Request Body:**
```json
{
  "name": "My E-commerce Store",
  "email": "contact@my-store.com",
  "businessCategory": "Retail"
}
```

**Responses:**
*   `201 Created`: Merchant created successfully. Includes the generated API Key (use this once and store securely!).
    ```json
    {
      "id": "merchant_uuid",
      "name": "My E-commerce Store",
      "email": "contact@my-store.com",
      "businessCategory": "Retail",
      "apiKey": "sk_live_generated_api_key_string", // IMPORTANT: Store this securely!
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
    ```
*   `400 Bad Request`: Email already taken, or invalid input.
*   `401 Unauthorized`: Missing or invalid JWT.
*   `403 Forbidden`: User does not have `admin` role.

### Get all merchants

`GET /api/v1/merchants`

**Query Parameters:**
*   `name` (string, optional): Filter by merchant name.
*   `email` (string, optional): Filter by merchant email.
*   `businessCategory` (string, optional): Filter by business category.
*   `sortBy` (string, optional): Sort order (e.g., `createdAt:desc`, `name:asc`).
*   `limit` (number, optional, default: 10): Maximum number of results.
*   `page` (number, optional, default: 1): Page number.

**Responses:**
*   `200 OK`: List of merchants.
    ```json
    {
      "results": [
        {
          "id": "merchant_uuid_1",
          "name": "Merchant One",
          "email": "one@example.com",
          "businessCategory": "Retail",
          "isActive": true,
          "createdAt": "...",
          "updatedAt": "..."
        },
        // ... more merchants
      ],
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "totalResults": 1
    }
    ```
*   `401 Unauthorized`: Missing or invalid JWT.
*   `403 Forbidden`: User does not have `admin` role.

### Get a single merchant by ID

`GET /api/v1/merchants/:merchantId`

**Path Parameters:**
*   `merchantId` (UUID, required): The ID of the merchant.

**Responses:**
*   `200 OK`: Merchant details.
    ```json
    {
      "id": "merchant_uuid",
      "name": "My E-commerce Store",
      "email": "contact@my-store.com",
      "businessCategory": "Retail",
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
    ```
*   `401 Unauthorized`: Missing or invalid JWT.
*   `403 Forbidden`: User does not have `admin` role.
*   `404 Not Found`: Merchant not found.

### Update a merchant

`PATCH /api/v1/merchants/:merchantId`

**Path Parameters:**
*   `merchantId` (UUID, required): The ID of the merchant to update.

**Request Body:** (Partial update, any combination of fields)
```json
{
  "name": "Updated Merchant Name",
  "email": "updated@my-store.com",
  "businessCategory": "Software",
  "isActive": false
}
```

**Responses:**
*   `200 OK`: Merchant updated successfully.
*   `400 Bad Request`: Email already taken, or invalid input.
*   `401 Unauthorized`: Missing or invalid JWT.
*   `403 Forbidden`: User does not have `admin` role.
*   `404 Not Found`: Merchant not found.

### Delete a merchant

`DELETE /api/v1/merchants/:merchantId`

**Path Parameters:**
*   `merchantId` (UUID, required): The ID of the merchant to delete.

**Responses:**
*   `204 No Content`: Merchant deleted successfully.
*   `401 Unauthorized`: Missing or invalid JWT.
*   `403 Forbidden`: User does not have `admin` role.
*   `404 Not Found`: Merchant not found.

---

## 3. Transactions Endpoints (Merchant API Key Only)

**Authentication:** Requires `X-Api-Key` header.

### Process a new payment transaction

`POST /api/v1/transactions/process`

Initiates a payment transaction. This endpoint supports idempotency.

**Headers:**
*   `X-Api-Key` (string, required): Merchant's API key.
*   `X-Idempotency-Key` (UUID, required): A unique key to prevent duplicate requests. Must be a UUID v4.

**Request Body:**
```json
{
  "amount": 2500, // Amount in smallest currency unit (e.g., cents for USD, so $25.00)
  "currency": "USD", // 3-letter ISO currency code
  "paymentMethodType": "card", // e.g., 'card', 'bank_transfer', 'mobile_money', 'wallet'
  "paymentMethodDetails": {
    "token": "tok_visa_4242" // Details specific to payment method, e.g., card token
  },
  "customerId": "d290f1ee-6c54-4b01-90e6-d701748f0851", // Optional: customer ID
  "description": "Order #12345 for widgets" // Optional: transaction description
}
```

**Responses:**
*   `201 Created`: Transaction created and processing initiated. (For the first request with a unique `X-Idempotency-Key`).
    ```json
    {
      "id": "transaction_uuid",
      "merchantId": "merchant_uuid",
      "amount": 2500,
      "currency": "USD",
      "status": "authorized", // or 'failed' or 'pending' depending on gateway response
      "paymentMethodType": "card",
      "gatewayReferenceId": "gw_ref_id",
      "customerId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "description": "Order #12345 for widgets",
      "failureReason": null,
      "gatewayResponse": { ... },
      "amountCaptured": 0,
      "amountRefunded": 0,
      "metadata": { ... },
      "idempotencyKey": "uuid",
      "createdAt": "...",
      "updatedAt": "..."
    }
    ```
*   `200 OK`: Idempotent request. Returns the cached response from a previous identical request with the same `X-Idempotency-Key`.
*   `400 Bad Request`: Invalid input or missing `X-Idempotency-Key` header.
*   `401 Unauthorized`: Missing or invalid `X-Api-Key`.
*   `409 Conflict`: `X-Idempotency-Key` already used with different request parameters.

### Capture an authorized transaction

`POST /api/v1/transactions/:transactionId/capture`

Captures funds for a previously authorized transaction. Supports partial captures.

**Path Parameters:**
*   `transactionId` (UUID, required): The ID of the transaction to capture.

**Headers:**
*   `X-Api-Key` (string, required): Merchant's API key.
*   `X-Idempotency-Key` (UUID, required): A unique key for this capture request.

**Request Body:** (Optional for full capture)
```json
{
  "amount": 2000 // Optional: Amount to capture. If not provided, full authorized amount is captured.
}
```

**Responses:**
*   `200 OK`: Transaction captured successfully.
    ```json
    {
      "id": "transaction_uuid",
      // ... other transaction details
      "status": "captured",
      "amountCaptured": 2000,
      // ...
    }
    ```
*   `400 Bad Request`: Transaction not in 'authorized' state, or capture amount is invalid.
*   `401 Unauthorized`: Missing or invalid `X-Api-Key`.
*   `404 Not Found`: Transaction not found for this merchant.
*   `409 Conflict`: Idempotency key conflict.

### Refund a captured transaction

`POST /api/v1/transactions/:transactionId/refund`

Refunds funds for a previously captured transaction. Supports partial refunds.

**Path Parameters:**
*   `transactionId` (UUID, required): The ID of the transaction to refund.

**Headers:**
*   `X-Api-Key` (string, required): Merchant's API key.
*   `X-Idempotency-Key` (UUID, required): A unique key for this refund request.

**Request Body:** (Optional for full refund)
```json
{
  "amount": 1000 // Optional: Amount to refund. If not provided, full captured amount is refunded.
}
```

**Responses:**
*   `200 OK`: Transaction refunded successfully.
    ```json
    {
      "id": "transaction_uuid",
      // ... other transaction details
      "status": "refunded", // or 'partially_refunded'
      "amountRefunded": 1000,
      // ...
    }
    ```
*   `400 Bad Request`: Transaction not in 'captured' state, or refund amount is invalid.
*   `401 Unauthorized`: Missing or invalid `X-Api-Key`.
*   `404 Not Found`: Transaction not found for this merchant.
*   `409 Conflict`: Idempotency key conflict.

### Retrieve a single transaction by ID

`GET /api/v1/transactions/:transactionId`

Retrieves details of a specific transaction for the authenticated merchant.

**Path Parameters:**
*   `transactionId` (UUID, required): The ID of the transaction to retrieve.

**Headers:**
*   `X-Api-Key` (string, required): Merchant's API key.

**Responses:**
*   `200 OK`: Transaction details.
    ```json
    {
      "id": "transaction_uuid",
      "merchantId": "merchant_uuid",
      "amount": 2500,
      "currency": "USD",
      "status": "authorized",
      "paymentMethodType": "card",
      "gatewayReferenceId": "gw_ref_id",
      "customerId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "description": "Order #12345 for widgets",
      "failureReason": null,
      "gatewayResponse": { ... },
      "amountCaptured": 0,
      "amountRefunded": 0,
      "metadata": { ... },
      "idempotencyKey": "uuid",
      "createdAt": "...",
      "updatedAt": "..."
    }
    ```
*   `401 Unauthorized`: Missing or invalid `X-Api-Key`.
*   `404 Not Found`: Transaction not found for this merchant.

### List all transactions for the authenticated merchant

`GET /api/v1/transactions`

Retrieves a paginated list of all transactions for the merchant.

**Headers:**
*   `X-Api-Key` (string, required): Merchant's API key.

**Query Parameters:**
*   `status` (string, optional): Filter by transaction status (`pending`, `authorized`, `captured`, `refunded`, `failed`, `disputed`).
*   `currency` (string, optional): Filter by currency (e.g., `USD`).
*   `sortBy` (string, optional): Sort order (e.g., `createdAt:desc`, `amount:asc`).
*   `limit` (number, optional, default: 10): Maximum number of results.
*   `page` (number, optional, default: 1): Page number.

**Responses:**
*   `200 OK`: List of transactions.
    ```json
    {
      "results": [
        {
          "id": "transaction_uuid_1",
          "merchantId": "merchant_uuid",
          "amount": 1000,
          "currency": "USD",
          "status": "captured",
          // ... other transaction details
        },
        // ... more transactions
      ],
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "totalResults": 100
    }
    ```
*   `401 Unauthorized`: Missing or invalid `X-Api-Key`.

---

## 4. Webhooks Endpoints (External Gateway Notifications)

These endpoints are typically exposed to external payment gateways to receive event notifications.
**Authentication:** Relies on signature verification within the controller logic, rather than API keys or JWT.

### Receive payment gateway events

`POST /api/v1/webhooks/gateway-events`

Receives and processes event notifications from external payment gateways (e.g., transaction status updates). The payload structure is specific to each gateway.

**Headers:**
*   `X-Gateway-Signature` (string, required): A cryptographic signature to verify the authenticity of the webhook sender. (Actual header name varies by gateway, e.g., `Stripe-Signature`).

**Request Body:** (Example - structure depends on the gateway)
```json
{
  "eventType": "payment_succeeded",
  "data": {
    "transactionId": "ext_tx_12345", // Gateway's transaction ID
    "amount": 1000,
    "currency": "USD",
    "status": "captured",
    "metadata": {
      "ourRef": "our_internal_transaction_uuid" // Our system's reference ID
    },
    // ... other gateway-specific data
  }
}
```

**Responses:**
*   `200 OK`: Event received and acknowledged.
    ```json
    {
      "received": true,
      "eventType": "payment_succeeded"
    }
    ```
*   `400 Bad Request`: Invalid payload structure or data.
*   `401 Unauthorized`: Invalid webhook signature.

---
```