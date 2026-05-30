# Payment Processing System API Documentation (OpenAPI 3.0)

This document provides a comprehensive overview of the Payment Processing System API.

## Base URL
`http://localhost:5000/api`

## Authentication
All protected endpoints require a Bearer token in the `Authorization` header.
Example: `Authorization: Bearer <YOUR_JWT_TOKEN>`

## Error Responses
Common error response structure:
```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Error description here",
  "stack": "Stack trace (only in development environment)"
}
```

---

## 1. Authentication & User Management

### `POST /auth/register`
Registers a new user and creates a default account.
*   **Request Body:**
    ```json
    {
      "email": "string",       // Required, unique email
      "password": "string",    // Required, min 6 characters
      "firstName": "string",   // Required
      "lastName": "string"     // Required
    }
    ```
*   **Responses:**
    *   `201 Created`:
        ```json
        {
          "message": "User registered successfully",
          "user": {
            "id": "uuid",
            "email": "string",
            "firstName": "string",
            "lastName": "string",
            "role": "user",
            "createdAt": "datetime",
            "updatedAt": "datetime"
          },
          "token": "string" // JWT token
        }
        ```
    *   `400 Bad Request`: Validation error or user already exists.

### `POST /auth/login`
Authenticates a user and returns a JWT token.
*   **Request Body:**
    ```json
    {
      "email": "string",      // Required
      "password": "string"    // Required
    }
    ```
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "message": "Logged in successfully",
          "user": {
            "id": "uuid",
            "email": "string",
            "firstName": "string",
            "lastName": "string",
            "role": "user",
            "createdAt": "datetime",
            "updatedAt": "datetime"
          },
          "token": "string" // JWT token
        }
        ```
    *   `401 Unauthorized`: Invalid credentials.

### `GET /auth/profile`
Retrieves the profile of the authenticated user.
*   **Authentication:** Required
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "message": "User profile retrieved successfully",
          "user": {
            "id": "uuid",
            "email": "string",
            "firstName": "string",
            "lastName": "string",
            "role": "user",
            "createdAt": "datetime",
            "updatedAt": "datetime"
          }
        }
        ```
    *   `401 Unauthorized`: Missing or invalid token.
    *   `404 Not Found`: User profile not found (shouldn't happen with valid token).

---

## 2. Account Management

### `GET /accounts`
Retrieves all accounts belonging to the authenticated user.
*   **Authentication:** Required
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "message": "User accounts retrieved successfully",
          "accounts": [
            {
              "id": "uuid",
              "userId": "uuid",
              "accountNumber": "string",
              "balance": 150000.00,
              "currency": "NGN",
              "status": "active",
              "createdAt": "datetime",
              "updatedAt": "datetime"
            }
          ]
        }
        ```
    *   `401 Unauthorized`: Missing or invalid token.

### `POST /accounts`
Creates a new account for the authenticated user.
*   **Authentication:** Required
*   **Request Body:**
    ```json
    {
      "currency": "string",     // Optional, default 'NGN'. Enum: ['USD', 'EUR', 'NGN']
      "initialBalance": "number" // Optional, default 0. Minimum 0.
    }
    ```
*   **Responses:**
    *   `201 Created`:
        ```json
        {
          "message": "Account created successfully",
          "account": {
            "id": "uuid",
            "userId": "uuid",
            "accountNumber": "string",
            "balance": 0.00,
            "currency": "NGN",
            "status": "active",
            "createdAt": "datetime",
            "updatedAt": "datetime"
          }
        }
        ```
    *   `400 Bad Request`: Validation error.
    *   `401 Unauthorized`: Missing or invalid token.

### `GET /accounts/{id}`
Retrieves a specific account by its ID, ensuring it belongs to the authenticated user.
*   **Authentication:** Required
*   **Parameters:**
    *   `id` (path): UUID of the account.
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "message": "Account retrieved successfully",
          "account": {
            "id": "uuid",
            "userId": "uuid",
            "accountNumber": "string",
            "balance": 150000.00,
            "currency": "NGN",
            "status": "active",
            "createdAt": "datetime",
            "updatedAt": "datetime"
          }
        }
        ```
    *   `401 Unauthorized`: Missing or invalid token.
    *   `404 Not Found`: Account not found or does not belong to the user.

### `PATCH /accounts/{id}`
Updates the status of a specific account.
*   **Authentication:** Required
*   **Parameters:**
    *   `id` (path): UUID of the account.
*   **Request Body:**
    ```json
    {
      "status": "string" // Required. Enum: ['active', 'inactive', 'suspended']
    }
    ```
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "message": "Account updated successfully",
          "account": {
            "id": "uuid",
            "userId": "uuid",
            "accountNumber": "string",
            "balance": 150000.00,
            "currency": "NGN",
            "status": "inactive",
            "createdAt": "datetime",
            "updatedAt": "datetime"
          }
        }
        ```
    *   `400 Bad Request`: Validation error or account not found/unauthorized.
    *   `401 Unauthorized`: Missing or invalid token.

---

## 3. Transaction Processing

### `POST /transactions/initiate`
Initiates a new transaction (debit or credit).
*   **Authentication:** Required
*   **Request Body:**
    ```json
    {
      "accountId": "uuid",       // Required. ID of the user's account for this transaction.
      "amount": "number",        // Required. Positive amount, min 0.01.
      "currency": "string",      // Required. Enum: ['USD', 'EUR', 'NGN']. Must match account currency.
      "type": "string",          // Required. Enum: ['credit', 'debit'].
      "description": "string",   // Optional. Max 500 characters.
      "paymentMethodId": "string"// Optional (required for external debits). A token or saved payment method ID.
    }
    ```
*   **Responses:**
    *   `201 Created`:
        ```json
        {
          "message": "Transaction initiated successfully",
          "transaction": {
            "id": "uuid",
            "userId": "uuid",
            "accountId": "uuid",
            "reference": "string", // Internal unique reference
            "externalReference": "string", // From payment gateway if applicable
            "amount": 100.00,
            "currency": "NGN",
            "type": "debit",
            "status": "completed", // Could be 'pending' for async payments
            "description": "string",
            "createdAt": "datetime",
            "updatedAt": "datetime"
          }
        }
        ```
    *   `400 Bad Request`: Validation error, insufficient funds, account inactive, or payment gateway failure.
    *   `401 Unauthorized`: Missing or invalid token.

### `POST /transactions/{id}/refund`
Processes a refund for a previously completed debit transaction.
*   **Authentication:** Required
*   **Parameters:**
    *   `id` (path): UUID of the *original* transaction to be refunded.
*   **Request Body:**
    ```json
    {
      "amount": "number" // Required. The amount to refund. Must be positive and <= original transaction amount.
    }
    ```
*   **Responses:**
    *   `201 Created`:
        ```json
        {
          "message": "Refund processed successfully",
          "refundTransaction": {
            "id": "uuid",
            "userId": "uuid",
            "accountId": "uuid",
            "reference": "string", // Internal unique reference for the refund
            "amount": 50.00,
            "currency": "NGN",
            "type": "credit",     // Refund is a credit to the user's account
            "status": "completed",
            "description": "Refund for transaction ...",
            "metadata": { "originalTransactionId": "uuid", "externalRefundRef": "string" },
            "createdAt": "datetime",
            "updatedAt": "datetime"
          }
        }
        ```
    *   `400 Bad Request`: Validation error, original transaction not found/unauthorized, not eligible for refund, or payment gateway refund failure.
    *   `401 Unauthorized`: Missing or invalid token.

### `GET /transactions/account/{accountId}`
Retrieves all transactions for a specific account belonging to the authenticated user.
*   **Authentication:** Required
*   **Parameters:**
    *   `accountId` (path): UUID of the account.
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "message": "Account transactions retrieved successfully",
          "transactions": [
            {
              "id": "uuid",
              "userId": "uuid",
              "accountId": "uuid",
              "reference": "string",
              "externalReference": "string",
              "amount": 100.00,
              "currency": "NGN",
              "type": "debit",
              "status": "completed",
              "description": "string",
              "createdAt": "datetime",
              "updatedAt": "datetime"
            }
          ]
        }
        ```
    *   `401 Unauthorized`: Missing or invalid token.
    *   `500 Internal Server Error`: Account not found for user (due to service error message).

### `GET /transactions/{id}`
Retrieves a specific transaction by its ID, ensuring it belongs to the authenticated user.
*   **Authentication:** Required
*   **Parameters:**
    *   `id` (path): UUID of the transaction.
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "message": "Transaction retrieved successfully",
          "transaction": {
            "id": "uuid",
            "userId": "uuid",
            "accountId": "uuid",
            "reference": "string",
            "externalReference": "string",
            "amount": 100.00,
            "currency": "NGN",
            "type": "debit",
            "status": "completed",
            "description": "string",
            "createdAt": "datetime",
            "updatedAt": "datetime"
          }
        }
        ```
    *   `401 Unauthorized`: Missing or invalid token.
    *   `404 Not Found`: Transaction not found or does not belong to the user.

### `POST /transactions/webhook`
Endpoint for receiving asynchronous notifications (webhooks) from external payment gateways.
*   **Authentication:** None (webhook verification should happen within the controller/service).
*   **Request Body:** Varies greatly by payment gateway. Example payload for a successful payment:
    ```json
    {
      "event": "payment_successful",
      "data": {
        "externalReference": "string", // Transaction ID from the gateway
        "amount": "number",
        "currency": "string",
        "customerEmail": "string",
        "status": "success",
        "...": "..." // Other gateway-specific data
      }
    }
    ```
*   **Responses:**
    *   `200 OK`: Acknowledges receipt of the webhook. The message indicates processing status.
        ```json
        {
          "message": "Webhook processed successfully"
        }
        ```
        or
        ```json
        {
          "message": "Webhook received, but internal processing failed.",
          "error": "Error details"
        }
        ```
    *   (Note: Webhook endpoints typically return `200 OK` regardless of internal processing success to prevent the sender from retrying unnecessarily. Errors are logged internally.)