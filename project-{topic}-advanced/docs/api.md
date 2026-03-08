```markdown
# Payment Processing System API Documentation

This document describes the RESTful API for the Payment Processing System.

**Base URL**: `http://localhost:3000/v1` (adjust port and domain as needed for deployment)

**Authentication**: All protected routes require a JWT Access Token in the `Authorization` header: `Authorization: Bearer <YOUR_JWT_TOKEN>`

## 1. Authentication

### `POST /auth/register`
Register a new user.

*   **Body**:
    ```json
    {
        "name": "User Name",
        "email": "user@example.com",
        "password": "Password123!",
        "role": "user" // Optional, defaults to 'user'. 'admin' requires special setup.
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
        "user": {
            "id": "uuid",
            "name": "User Name",
            "email": "user@example.com",
            "role": "user",
            "created_at": "timestamp",
            "updated_at": "timestamp"
        },
        "tokens": {
            "access": {
                "token": "jwt_access_token",
                "expires": "timestamp"
            },
            "refresh": {
                "token": "jwt_refresh_token",
                "expires": "timestamp"
            }
        }
    }
    ```
*   **Error Responses**: `400 Bad Request` (e.g., email already taken, invalid password format)

### `POST /auth/login`
Authenticate a user and get JWT tokens.

*   **Body**:
    ```json
    {
        "email": "user@example.com",
        "password": "Password123!"
    }
    ```
*   **Response (200 OK)**: (Same as register response for `tokens` and `user` fields)
*   **Error Responses**: `401 Unauthorized` (e.g., incorrect email or password)

### `POST /auth/logout`
(Placeholder for refresh token invalidation)

*   **Requires**: Authentication (access token - though token itself is stateless)
*   **Response (204 No Content)**
*   **Error Responses**: `401 Unauthorized`

## 2. User Management

### `POST /users`
Create a new user. **(Admin Only)**

*   **Requires**: Admin Access Token
*   **Body**: (Same as `POST /auth/register`)
*   **Response (201 Created)**: (Same as `POST /auth/register`'s `user` field)
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `400 Bad Request`

### `GET /users`
Get all users. **(Admin Only)**

*   **Requires**: Admin Access Token
*   **Response (200 OK)**: `Array` of user objects (without password)
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden`

### `GET /users/:userId`
Get user details.

*   **Requires**: Access Token (User can get their own; Admin can get any)
*   **Path Params**: `userId` (UUID)
*   **Response (200 OK)**: User object (without password)
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden` (if user tries to access another's profile), `404 Not Found`

### `PATCH /users/:userId`
Update user details.

*   **Requires**: Access Token (User can update their own; Admin can update any)
*   **Path Params**: `userId` (UUID)
*   **Body**:
    ```json
    {
        "name": "Updated Name",
        "email": "updated@example.com",
        "password": "NewPassword123!"
    }
    ```
*   **Response (200 OK)**: Updated user object (without password)
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `400 Bad Request` (e.g., email taken)

### `DELETE /users/:userId`
Delete a user. **(Admin Only)**

*   **Requires**: Admin Access Token
*   **Path Params**: `userId` (UUID)
*   **Response (204 No Content)**
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

## 3. Account Management

### `POST /accounts`
Create a new bank account for the authenticated user.

*   **Requires**: Access Token
*   **Body**:
    ```json
    {
        "name": "My Checking Account",
        "type": "checking",
        "currency": "USD",
        "balance": 1000.00 // Optional, defaults to 0
    }
    ```
*   **Response (201 Created)**: Account object
*   **Error Responses**: `401 Unauthorized`, `400 Bad Request`

### `GET /accounts`
Get all bank accounts for the authenticated user.

*   **Requires**: Access Token
*   **Response (200 OK)**: `Array` of account objects
*   **Error Responses**: `401 Unauthorized`

### `GET /accounts/:accountId`
Get details of a specific account.

*   **Requires**: Access Token (User can only view their own accounts)
*   **Path Params**: `accountId` (UUID)
*   **Response (200 OK)**: Account object
*   **Error Responses**: `401 Unauthorized`, `404 Not Found` (if account doesn't exist or doesn't belong to user)

### `PATCH /accounts/:accountId`
Update account details.

*   **Requires**: Access Token (User can only update their own accounts)
*   **Path Params**: `accountId` (UUID)
*   **Body**:
    ```json
    {
        "name": "Updated Account Name"
    }
    ```
*   **Response (200 OK)**: Updated account object
*   **Error Responses**: `401 Unauthorized`, `404 Not Found`, `400 Bad Request`

### `DELETE /accounts/:accountId`
Delete an account.

*   **Requires**: Access Token (User can only delete their own accounts)
*   **Path Params**: `accountId` (UUID)
*   **Response (204 No Content)**
*   **Error Responses**: `401 Unauthorized`, `404 Not Found`, `400 Bad Request` (if balance is not zero)

### `POST /accounts/:accountId/deposit`
Deposit funds into an account.

*   **Requires**: Access Token (User can only deposit to their own accounts)
*   **Path Params**: `accountId` (UUID)
*   **Body**:
    ```json
    {
        "amount": 500.00
    }
    ```
*   **Response (200 OK)**: Updated account object
*   **Error Responses**: `401 Unauthorized`, `404 Not Found`, `400 Bad Request`

### `POST /accounts/:accountId/withdraw`
Withdraw funds from an account.

*   **Requires**: Access Token (User can only withdraw from their own accounts)
*   **Path Params**: `accountId` (UUID)
*   **Body**:
    ```json
    {
        "amount": 200.00
    }
    ```
*   **Response (200 OK)**: Updated account object
*   **Error Responses**: `401 Unauthorized`, `404 Not Found`, `400 Bad Request` (e.g., insufficient funds)

## 4. Transaction Processing

### `POST /transactions`
Initiate a payment transaction between two accounts.

*   **Requires**: Access Token
*   **Body**:
    ```json
    {
        "sourceAccountId": "uuid_of_sender_account",
        "destinationAccountId": "uuid_of_receiver_account",
        "amount": 123.45,
        "currency": "USD",
        "description": "Payment for services" // Optional
    }
    ```
*   **Response (202 Accepted)**:
    ```json
    {
        "message": "Transaction initiated successfully. Awaiting payment gateway confirmation.",
        "transactionId": "uuid_of_the_new_transaction",
        "gatewayStatus": "PENDING" | "SUCCESS" | "FAILED", // Status from mock gateway
        "gatewayRefId": "reference_id_from_gateway" // Reference from mock gateway
    }
    ```
*   **Error Responses**: `401 Unauthorized`, `400 Bad Request` (e.g., insufficient funds, invalid account IDs, amount <= 0)

### `GET /transactions`
Get transaction history.

*   **Requires**: Access Token (User gets their own transactions; Admin gets all)
*   **Response (200 OK)**: `Array` of transaction objects
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden` (if non-admin user tries to access others' transactions)

### `GET /transactions/:transactionId`
Get details of a specific transaction.

*   **Requires**: Access Token (User can only view their own transactions; Admin can view any)
*   **Path Params**: `transactionId` (UUID)
*   **Response (200 OK)**: Transaction object
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### `PATCH /transactions/:transactionId/process`
Update an internal transaction status. **(Admin Only)**
*This is for internal administrative actions (e.g., manual refunds, settlements), not for external gateway webhooks.*

*   **Requires**: Admin Access Token
*   **Path Params**: `transactionId` (UUID)
*   **Body**:
    ```json
    {
        "status": "refunded", // e.g., 'completed', 'failed', 'refunded'
        "remarks": "Refund approved by support" // Optional
    }
    ```
*   **Response (200 OK)**: Updated transaction object
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `400 Bad Request`

### `POST /transactions/webhook/payment-gateway`
Endpoint for external payment gateway callbacks (webhooks).
*This endpoint typically does **not** require an Authorization header, but rather relies on webhook signature verification for security (not fully implemented in this example for brevity).*

*   **Body**: (Example structure, depends on the payment gateway)
    ```json
    {
        "event": "payment_success", // or "payment_failed", "refund_processed", etc.
        "data": {
            "transactionId": "our_internal_transaction_uuid",
            "gatewayRefId": "payment_gateway_reference_id",
            "amount": 75.00,
            "currency": "USD",
            "reason": "Card declined" // if event is failed
        }
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
        "received": true
    }
    ```
*   **Error Responses**: `400 Bad Request` (e.g., invalid payload), `403 Forbidden` (if webhook signature verification fails in a real implementation)
```