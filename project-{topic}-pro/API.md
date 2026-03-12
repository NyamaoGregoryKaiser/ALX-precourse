```markdown
# Payment Processing System API Documentation

This document describes the RESTful API endpoints for the Payment Processing System.

**Base URL**: `http://localhost:9080` (or your configured application host/port)

## Authentication

All protected endpoints require a JSON Web Token (JWT) in the `Authorization` header.
The token should be prefixed with `Bearer`, e.g., `Authorization: Bearer <your_jwt_token>`.

### JWT Token Structure (Example Payload)
```json
{
  "sub": "123",                    // User ID
  "username": "customer_one",
  "role": "customer",              // "admin", "merchant", "customer"
  "iss": "payment-processor-service",
  "iat": 1678886400,               // Issued At (Unix timestamp)
  "exp": 1678890000                // Expiration Time (Unix timestamp)
}
```

## Error Handling

API errors are returned with appropriate HTTP status codes and a descriptive message in the response body.

```json
{
  "message": "Error description here."
}
```

**Common Error Codes:**
*   `400 Bad Request`: Invalid request payload or parameters.
*   `401 Unauthorized`: Authentication required or invalid token.
*   `403 Forbidden`: Authenticated, but user does not have permission.
*   `404 Not Found`: Resource not found.
*   `409 Conflict`: Resource already exists (e.g., duplicate username).
*   `500 Internal Server Error`: Server-side error.

---

## 1. Authentication Endpoints

### 1.1. Register User

`POST /auth/register`

Registers a new user account.

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "securepassword123",
  "role": "customer"  // Optional, defaults to "customer". Can be "admin", "merchant", "customer"
}
```

**Responses:**
*   **`201 Created`**
    ```json
    {
      "id": 5,
      "username": "newuser",
      "email": "newuser@example.com",
      "role": "customer",
      "createdAt": "2023-03-15T10:00:00Z",
      "updatedAt": "2023-03-15T10:00:00Z"
    }
    ```
*   **`400 Bad Request`**: Invalid input (e.g., empty fields, invalid email).
*   **`409 Conflict`**: Username or email already exists.

### 1.2. Login User

`POST /auth/login`

Authenticates a user and returns a JWT token.

**Request Body:**
```json
{
  "username": "existinguser",
  "password": "securepassword123"
}
```

**Responses:**
*   **`200 OK`**
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJ1c2VybmFtZSI6ImV4aXN0aW5ndXNlciIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTY3ODg4NjQwMCwiZXhwIjoxNjc4ODkwMDAwfQ.signature"
    }
    ```
*   **`400 Bad Request`**: Invalid input.
*   **`401 Unauthorized`**: Invalid username or password.

---

## 2. Account Endpoints

**Protected Endpoints**: All endpoints below require JWT authentication.

### 2.1. Create Account

`POST /accounts`

Creates a new payment account for the authenticated user.
**Required Role**: `customer`

**Request Body:**
```json
{
  "accountName": "My Primary Wallet",
  "currency": "USD" // Optional, defaults to "USD"
}
```

**Responses:**
*   **`201 Created`**
    ```json
    {
      "id": 101,
      "ownerUserId": 5,
      "accountNumber": "ACC-CUST-XYZ-123",
      "accountName": "My Primary Wallet",
      "balance": 0.00,
      "currency": "USD",
      "status": "active",
      "createdAt": "2023-03-15T10:05:00Z",
      "updatedAt": "2023-03-15T10:05:00Z"
    }
    ```
*   **`400 Bad Request`**: Invalid input.
*   **`401 Unauthorized`**: Missing or invalid token.
*   **`403 Forbidden`**: User role not allowed.

### 2.2. Get Account by ID

`GET /accounts/{id}`

Retrieves details of a specific payment account.
**Required Role**: `customer` (for own accounts), `admin` (for any account)

**Path Parameters:**
*   `id`: `long` - The ID of the account.

**Responses:**
*   **`200 OK`**
    ```json
    {
      "id": 101,
      "ownerUserId": 5,
      "accountNumber": "ACC-CUST-XYZ-123",
      "accountName": "My Primary Wallet",
      "balance": 150.75,
      "currency": "USD",
      "status": "active",
      "createdAt": "2023-03-15T10:05:00Z",
      "updatedAt": "2023-03-15T10:10:00Z"
    }
    ```
*   **`401 Unauthorized`**: Missing or invalid token.
*   **`403 Forbidden`**: User not authorized to view this account.
*   **`404 Not Found`**: Account with the given ID does not exist.

### 2.3. Get Accounts for a User

`GET /users/{userId}/accounts`

Retrieves all payment accounts belonging to a specific user.
**Required Role**: `customer` (for own accounts), `admin` (for any user's accounts)

**Path Parameters:**
*   `userId`: `long` - The ID of the user.

**Responses:**
*   **`200 OK`**
    ```json
    [
      {
        "id": 101,
        "ownerUserId": 5,
        "accountNumber": "ACC-CUST-XYZ-123",
        "accountName": "My Primary Wallet",
        "balance": 150.75,
        "currency": "USD",
        "status": "active",
        "createdAt": "2023-03-15T10:05:00Z",
        "updatedAt": "2023-03-15T10:10:00Z"
      },
      {
        "id": 102,
        "ownerUserId": 5,
        "accountNumber": "ACC-CUST-EUR-456",
        "accountName": "My Euro Savings",
        "balance": 200.00,
        "currency": "EUR",
        "status": "active",
        "createdAt": "2023-03-15T10:07:00Z",
        "updatedAt": "2023-03-15T10:07:00Z"
      }
    ]
    ```
*   **`401 Unauthorized`**: Missing or invalid token.
*   **`403 Forbidden`**: User not authorized to view other users' accounts.
*   **`404 Not Found`**: User with the given ID does not exist.

### 2.4. Deposit Funds

`POST /accounts/{id}/deposit`

Deposits funds into a specific account.
**Required Role**: `customer`, `merchant` (for own accounts)

**Path Parameters:**
*   `id`: `long` - The ID of the account.

**Request Body:**
```json
{
  "amount": 100.50
}
```

**Responses:**
*   **`200 OK`**
    ```json
    {
      "id": 101,
      "ownerUserId": 5,
      "accountNumber": "ACC-CUST-XYZ-123",
      "accountName": "My Primary Wallet",
      "balance": 251.25, // Updated balance
      "currency": "USD",
      "status": "active",
      "createdAt": "2023-03-15T10:05:00Z",
      "updatedAt": "2023-03-15T10:15:00Z"
    }
    ```
*   **`400 Bad Request`**: Invalid amount (e.g., non-positive).
*   **`401 Unauthorized`**: Missing or invalid token.
*   **`403 Forbidden`**: User not authorized to deposit to this account.
*   **`404 Not Found`**: Account with the given ID does not exist.
*   **`500 Internal Server Error`**: Transaction processing error.

### 2.5. Withdraw Funds

`POST /accounts/{id}/withdraw`

Withdraws funds from a specific account.
**Required Role**: `customer`, `merchant` (for own accounts)

**Path Parameters:**
*   `id`: `long` - The ID of the account.

**Request Body:**
```json
{
  "amount": 50.00
}
```

**Responses:**
*   **`200 OK`**
    ```json
    {
      "id": 101,
      "ownerUserId": 5,
      "accountNumber": "ACC-CUST-XYZ-123",
      "accountName": "My Primary Wallet",
      "balance": 201.25, // Updated balance
      "currency": "USD",
      "status": "active",
      "createdAt": "2023-03-15T10:05:00Z",
      "updatedAt": "2023-03-15T10:20:00Z"
    }
    ```
*   **`400 Bad Request`**: Invalid amount (e.g., non-positive), insufficient funds.
*   **`401 Unauthorized`**: Missing or invalid token.
*   **`403 Forbidden`**: User not authorized to withdraw from this account.
*   **`404 Not Found`**: Account with the given ID does not exist.
*   **`500 Internal Server Error`**: Transaction processing error.

### 2.6. Update Account (Admin Only)

`PUT /accounts/{id}`

Updates details of a specific payment account.
**Required Role**: `admin`

**Path Parameters:**
*   `id`: `long` - The ID of the account.

**Request Body:**
```json
{
  "accountName": "Updated Account Name", // Optional
  "currency": "EUR"                      // Optional
}
```

**Responses:**
*   **`200 OK`**
    ```json
    {
      "id": 101,
      "ownerUserId": 5,
      "accountNumber": "ACC-CUST-XYZ-123",
      "accountName": "Updated Account Name",
      "balance": 201.25,
      "currency": "EUR",
      "status": "active",
      "createdAt": "2023-03-15T10:05:00Z",
      "updatedAt": "2023-03-15T10:25:00Z"
    }
    ```
*   **`400 Bad Request`**: Invalid input.
*   **`401 Unauthorized`**: Missing or invalid token.
*   **`403 Forbidden`**: User not authorized (not an admin).
*   **`404 Not Found`**: Account with the given ID does not exist.

### 2.7. Delete Account (Admin Only)

`DELETE /accounts/{id}`

Deletes a specific payment account.
**Required Role**: `admin`

**Path Parameters:**
*   `id`: `long` - The ID of the account.

**Responses:**
*   **`204 No Content`**
*   **`401 Unauthorized`**: Missing or invalid token.
*   **`403 Forbidden`**: User not authorized (not an admin).
*   **`404 Not Found`**: Account with the given ID does not exist.
*   **`409 Conflict`**: Cannot delete account with non-zero balance or pending transactions.

---

## 3. Transaction Endpoints

**Protected Endpoints**: All endpoints below require JWT authentication.

### 3.1. Process Payment

`POST /transactions/process`

Initiates a payment transaction between two accounts.
**Required Role**: `customer`, `merchant`

**Request Body:**
```json
{
  "sourceAccountId": 101,
  "destinationAccountId": 102,
  "amount": 75.00,
  "currency": "USD",
  "description": "Payment for services rendered"
}
```

**Responses:**
*   **`200 OK`**
    ```json
    {
      "id": 201,
      "transactionUuid": "txn-abc-123-xyz",
      "sourceAccountId": 101,
      "destinationAccountId": 102,
      "amount": 75.00,
      "currency": "USD",
      "transactionType": "payment",
      "status": "processed", // Or "pending" if async gateway
      "description": "Payment for services rendered",
      "gatewayReference": "GATEWAY-REF-456",
      "failureReason": null,
      "createdAt": "2023-03-15T10:30:00Z",
      "updatedAt": "2023-03-15T10:30:05Z"
    }
    ```
*   **`400 Bad Request`**: Invalid input, insufficient funds, invalid accounts.
*   **`401 Unauthorized`**: Missing or invalid token.
*   **`403 Forbidden`**: User not authorized to initiate payment from source account.
*   **`404 Not Found`**: Source or destination account not found.
*   **`500 Internal Server Error`**: Transaction processing failed.

### 3.2. Get Transaction by ID

`GET /transactions/{id}`

Retrieves details of a specific transaction.
**Required Role**: `customer` (if involved in transaction), `merchant` (if involved), `admin` (any transaction)

**Path Parameters:**
*   `id`: `long` - The ID of the transaction.

**Responses:**
*   **`200 OK`**
    ```json
    {
      "id": 201,
      "transactionUuid": "txn-abc-123-xyz",
      "sourceAccountId": 101,
      "destinationAccountId": 102,
      "amount": 75.00,
      "currency": "USD",
      "transactionType": "payment",
      "status": "processed",
      "description": "Payment for services rendered",
      "gatewayReference": "GATEWAY-REF-456",
      "failureReason": null,
      "createdAt": "2023-03-15T10:30:00Z",
      "updatedAt": "2023-03-15T10:30:05Z"
    }
    ```
*   **`401 Unauthorized`**: Missing or invalid token.
*   **`403 Forbidden`**: User not authorized to view this transaction.
*   **`404 Not Found`**: Transaction with the given ID does not exist.

### 3.3. Get Transactions for an Account

`GET /accounts/{accountId}/transactions`

Retrieves a list of transactions associated with a specific account.
**Required Role**: `customer` (for own accounts), `merchant` (for own accounts), `admin` (for any account)

**Path Parameters:**
*   `accountId`: `long` - The ID of the account.

**Query Parameters:**
*   `type`: `string` (optional) - Filter by transaction type (e.g., `deposit`, `payment`).
*   `status`: `string` (optional) - Filter by transaction status (e.g., `processed`, `pending`).
*   `limit`: `int` (optional) - Maximum number of transactions to return (default: 100).
*   `offset`: `int` (optional) - Number of transactions to skip (for pagination).

**Responses:**
*   **`200 OK`**
    ```json
    [
      {
        "id": 201,
        "transactionUuid": "txn-abc-123-xyz",
        "sourceAccountId": 101,
        "destinationAccountId": 102,
        "amount": 75.00,
        "currency": "USD",
        "transactionType": "payment",
        "status": "processed",
        "description": "Payment for services rendered",
        "gatewayReference": "GATEWAY-REF-456",
        "failureReason": null,
        "createdAt": "2023-03-15T10:30:00Z",
        "updatedAt": "2023-03-15T10:30:05Z"
      },
      {
        "id": 202,
        "transactionUuid": "txn-def-456-uvw",
        "sourceAccountId": null,
        "destinationAccountId": 101,
        "amount": 100.00,
        "currency": "USD",
        "transactionType": "deposit",
        "status": "processed",
        "description": "Mobile bank deposit",
        "gatewayReference": "BANK-DEPOSIT-ABC",
        "failureReason": null,
        "createdAt": "2023-03-15T09:00:00Z",
        "updatedAt": "2023-03-15T09:00:00Z"
      }
    ]
    ```
*   **`401 Unauthorized`**: Missing or invalid token.
*   **`403 Forbidden`**: User not authorized to view transactions for this account.
*   **`404 Not Found`**: Account with the given ID does not exist.

### 3.4. Refund Transaction

`POST /transactions/{id}/refund`

Initiates a refund for a previously processed transaction.
**Required Role**: `admin`, `merchant` (if original payment was to their account)

**Path Parameters:**
*   `id`: `long` - The ID of the original transaction to refund.

**Request Body (Optional):**
```json
{
  "amount": 50.00, // Optional: if not provided, full amount is refunded
  "description": "Partial refund for damaged goods" // Optional
}
```

**Responses:**
*   **`200 OK`**
    ```json
    {
      "id": 203,
      "transactionUuid": "txn-refund-xyz-789",
      "sourceAccountId": 102, // Original destination becomes source for refund
      "destinationAccountId": 101, // Original source becomes destination for refund
      "amount": 50.00,
      "currency": "USD",
      "transactionType": "refund",
      "status": "processed",
      "description": "Partial refund for damaged goods",
      "gatewayReference": "GATEWAY-REF-REFUND-ABC",
      "failureReason": null,
      "createdAt": "2023-03-15T10:45:00Z",
      "updatedAt": "2023-03-15T10:45:05Z"
    }
    ```
*   **`400 Bad Request`**: Invalid transaction ID, transaction not refundable, invalid amount.
*   **`401 Unauthorized`**: Missing or invalid token.
*   **`403 Forbidden`**: User not authorized to refund this transaction.
*   **`404 Not Found`**: Original transaction not found.
*   **`409 Conflict`**: Transaction already refunded or in a state that cannot be refunded.
*   **`500 Internal Server Error`**: Refund processing failed.
```