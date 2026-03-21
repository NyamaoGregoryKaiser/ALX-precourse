```markdown
# Payment Processing System - API Reference

This document provides a comprehensive reference for the Payment Processing System's RESTful API endpoints.

**Base URL:** `http://localhost:8080/api/v1` (or your deployed server address)

---

## Authentication

All protected endpoints require a JSON Web Token (JWT) in the `Authorization` header with the `Bearer` scheme.

**Header Example:**
`Authorization: Bearer <your_jwt_token>`

### 1. Register User

*   **Endpoint:** `POST /auth/register`
*   **Description:** Creates a new user account.
*   **Request Body (application/json):**
    ```json
    {
      "username": "new_user",
      "password": "strongpassword123",
      "email": "user@example.com",
      "role": "MERCHANT" // "ADMIN", "MERCHANT", "VIEWER"
    }
    ```
*   **Responses:**
    *   `201 Created`:
        ```json
        {
          "id": 1,
          "username": "new_user",
          "email": "user@example.com",
          "role": "MERCHANT",
          "createdAt": "2023-10-27T10:00:00Z",
          "updatedAt": "2023-10-27T10:00:00Z"
        }
        ```
    *   `400 Bad Request`: Invalid input (e.g., missing fields, weak password, invalid role, existing username/email).
    *   `500 Internal Server Error`: Server-side issues.

### 2. Login User

*   **Endpoint:** `POST /auth/login`
*   **Description:** Authenticates a user and returns a JWT token.
*   **Request Body (application/json):**
    ```json
    {
      "username": "existing_user",
      "password": "correctpassword"
    }
    ```
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMSIsInJvbGUiOiJNRVJDSEFOVCIsImV4cCI6MTY3ODkwNTYwMH0.signature",
          "user": {
            "id": 1,
            "username": "existing_user",
            "email": "user@example.com",
            "role": "MERCHANT",
            "createdAt": "2023-10-27T10:00:00Z",
            "updatedAt": "2023-10-27T10:00:00Z"
          }
        }
        ```
    *   `401 Unauthorized`: Invalid username or password.
    *   `500 Internal Server Error`: Server-side issues.

---

## Account Management (Protected)

### 1. Create Account

*   **Endpoint:** `POST /accounts`
*   **Description:** Creates a new merchant account. Requires `ADMIN` or `MERCHANT` role. A Merchant can only create an account for themselves (or if `userId` is omitted, it defaults to the authenticated user). An Admin can specify `userId` for another user.
*   **Request Body (application/json):**
    ```json
    {
      "userId": 1,             // Optional, defaults to authenticated user's ID for Merchants. Required for Admin creating for others.
      "name": "My Business Account",
      "currency": "USD",
      "initialBalance": 0.00
    }
    ```
*   **Responses:**
    *   `201 Created`: Account details.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User does not have permission (e.g., Viewer role, or Merchant trying to create for another user).
    *   `400 Bad Request`: Invalid input (e.g., negative balance, missing fields).
    *   `404 Not Found`: `userId` not found if specified.

### 2. Get Account by ID

*   **Endpoint:** `GET /accounts/{accountId}`
*   **Description:** Retrieves details for a specific account. Requires `ADMIN` role or owner of the account.
*   **Parameters:**
    *   `accountId` (Path): The ID of the account.
*   **Responses:**
    *   `200 OK`: Account details.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User does not have permission to view this account.
    *   `404 Not Found`: Account not found.

### 3. Get My Accounts

*   **Endpoint:** `GET /accounts/my`
*   **Description:** Retrieves all accounts owned by the authenticated user.
*   **Responses:**
    *   `200 OK`: Array of account details.
    *   `401 Unauthorized`: Missing or invalid token.

### 4. Update Account

*   **Endpoint:** `PUT /accounts/{accountId}` or `PATCH /accounts/{accountId}`
*   **Description:** Updates an existing account's details. Requires `ADMIN` role or owner of the account.
*   **Parameters:**
    *   `accountId` (Path): The ID of the account.
*   **Request Body (application/json):** (Fields are optional for PATCH)
    ```json
    {
      "name": "Updated Business Account Name",
      "status": "ACTIVE" // "ACTIVE", "INACTIVE", "SUSPENDED"
    }
    ```
*   **Responses:**
    *   `200 OK`: Updated account details.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User does not have permission.
    *   `400 Bad Request`: Invalid input (e.g., invalid status).
    *   `404 Not Found`: Account not found.

### 5. Delete Account

*   **Endpoint:** `DELETE /accounts/{accountId}`
*   **Description:** Deletes an account. Requires `ADMIN` role or owner of the account. **Note: Deleting an account will also delete all associated transactions due to `ON DELETE CASCADE`.**
*   **Parameters:**
    *   `accountId` (Path): The ID of the account.
*   **Responses:**
    *   `204 No Content`: Account deleted successfully.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User does not have permission.
    *   `404 Not Found`: Account not found.

---

## Transaction Processing (Protected)

### 1. Process Transaction

*   **Endpoint:** `POST /transactions`
*   **Description:** Initiates a new payment, refund, withdrawal, or deposit transaction. Requires `ADMIN` or `MERCHANT` role.
*   **Request Body (application/json):**
    ```json
    {
      "accountId": 1,
      "externalId": "unique_id_from_gateway_or_system",
      "type": "PAYMENT",    // "PAYMENT", "REFUND", "WITHDRAWAL", "DEPOSIT"
      "amount": 100.50,
      "currency": "USD",
      "description": "Customer purchase for order #X123"
    }
    ```
*   **Responses:**
    *   `201 Created`: Transaction details.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User does not have permission (e.g., trying to transact for another user's account).
    *   `400 Bad Request`: Invalid input (e.g., negative amount, invalid type, insufficient funds).
    *   `404 Not Found`: Account not found.

### 2. Get Transaction by ID

*   **Endpoint:** `GET /transactions/{transactionId}`
*   **Description:** Retrieves details for a specific transaction. Requires `ADMIN` role or owner of the associated account.
*   **Parameters:**
    *   `transactionId` (Path): The ID of the transaction.
*   **Responses:**
    *   `200 OK`: Transaction details.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User does not have permission.
    *   `404 Not Found`: Transaction not found.

### 3. Get Transactions by Account

*   **Endpoint:** `GET /accounts/{accountId}/transactions`
*   **Description:** Retrieves a paginated list of transactions for a specific account. Requires `ADMIN` role or owner of the account.
*   **Parameters:**
    *   `accountId` (Path): The ID of the account.
*   **Query Parameters:**
    *   `page` (Optional, Integer): Page number (default: 1).
    *   `pageSize` (Optional, Integer): Number of items per page (default: 20, max: 100).
*   **Responses:**
    *   `200 OK`: Paginated response of transaction details.
        ```json
        {
          "items": [
            {
              "id": 101,
              "accountId": 1,
              "externalId": "ext_tx_12345",
              "type": "PAYMENT",
              "amount": 150.75,
              "currency": "USD",
              "status": "COMPLETED",
              "description": "Online Sale #A1",
              "createdAt": "2023-10-27T10:05:00Z",
              "updatedAt": "2023-10-27T10:05:00Z"
            }
          ],
          "totalItems": 1,
          "page": 1,
          "pageSize": 20
        }
        ```
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User does not have permission.
    *   `404 Not Found`: Account not found.

### 4. Update Transaction Status

*   **Endpoint:** `PUT /transactions/{transactionId}/status` or `PATCH /transactions/{transactionId}/status`
*   **Description:** Updates the status of a transaction. Typically used for asynchronous updates via webhooks or manual adjustments. Requires `ADMIN` or `MERCHANT` role.
*   **Parameters:**
    *   `transactionId` (Path): The ID of the transaction.
*   **Request Body (application/json):**
    ```json
    {
      "status": "COMPLETED" // "PENDING", "COMPLETED", "FAILED", "REFUNDED", "CANCELLED"
    }
    ```
*   **Responses:**
    *   `200 OK`: Updated transaction details.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User does not have permission.
    *   `400 Bad Request`: Invalid input (e.g., invalid status, changing status from a final state incorrectly).
    *   `404 Not Found`: Transaction not found.

### 5. Initiate Refund

*   **Endpoint:** `POST /transactions/{originalTransactionId}/refund`
*   **Description:** Initiates a refund for a previously `COMPLETED` payment transaction. This creates a new `REFUND` type transaction. Requires `ADMIN` or `MERCHANT` role.
*   **Parameters:**
    *   `originalTransactionId` (Path): The ID of the original `PAYMENT` transaction to be refunded.
*   **Request Body (application/json):**
    ```json
    {
      "refundAmount": 50.00,
      "refundExternalId": "refund_ref_XYZ789", // New unique ID for the refund
      "description": "Customer requested partial refund"
    }
    ```
*   **Responses:**
    *   `201 Created`: The newly created refund transaction details.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User does not have permission.
    *   `400 Bad Request`: Invalid refund amount, original transaction not completed or not a payment type.
    *   `404 Not Found`: Original transaction not found.
```