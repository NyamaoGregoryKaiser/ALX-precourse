```markdown
# ALX Payment Processor - API Documentation

This document describes the RESTful API endpoints for the ALX Payment Processor backend.
All endpoints are prefixed with `/api/v1`.

## Base URL

`http://localhost:3000/api/v1` (for local development)

## Authentication

All protected routes require a JWT (JSON Web Token) in the `Authorization` header:

`Authorization: Bearer <your_jwt_token>`

Tokens are obtained from the `/auth/login` or `/auth/register` endpoints.

## Error Handling

Errors are returned in a consistent JSON format:

```json
{
  "status": "fail" | "error",
  "message": "Descriptive error message",
  "error": { /* details in development env */ },
  "stack": "stack trace in development env"
}
```

*   `status: "fail"` for operational errors (e.g., bad request, not found, validation errors). Status code 4xx.
*   `status: "error"` for programming errors or unexpected server issues. Status code 5xx.

---

## 1. Authentication Endpoints (`/auth`)

### 1.1. Register a new User

`POST /auth/register`

Registers a new user with a specified role.

**Request Body:**

| Field      | Type   | Description                                                                                                                                                                                                                                   | Required | Example             |
| :--------- | :----- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- | :------------------ |
| `username` | string | User's chosen username (3-30 alphanumeric characters).                                                                                                                                                                                        | Yes      | `john_doe`          |
| `email`    | string | User's email address (must be unique).                                                                                                                                                                                                        | Yes      | `john@example.com`  |
| `password` | string | User's password. Must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character (`!@#$%^&*`).                                                                                        | Yes      | `SecureP@ss123`     |
| `role`     | string | User's role. Can be `USER`, `MERCHANT`, or `ADMIN`. Defaults to `USER`. Admin roles should be assigned carefully, usually only through direct database modification or a separate admin registration flow. | No       | `MERCHANT`          |

**Success Response (201 Created):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid-of-user",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "USER"
    }
  },
  "token": "your_jwt_token_here"
}
```

**Error Responses:**
*   `400 Bad Request`: Invalid input (e.g., weak password, invalid email format).
*   `409 Conflict`: User with this email already exists.

---

### 1.2. Log in a User

`POST /auth/login`

Authenticates a user and returns a JWT token.

**Request Body:**

| Field      | Type   | Description                                    | Required | Example             |
| :--------- | :----- | :--------------------------------------------- | :------- | :------------------ |
| `email`    | string | User's email address.                          | Yes      | `john@example.com`  |
| `password` | string | User's password.                               | Yes      | `SecureP@ss123`     |

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid-of-user",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "USER"
    }
  },
  "token": "your_jwt_token_here"
}
```

**Error Responses:**
*   `400 Bad Request`: Invalid input.
*   `401 Unauthorized`: Incorrect email or password.

---

## 2. User Endpoints (`/users`)

*(Protected: Requires authentication. Admin can manage all users. Regular users can manage their own profile.)*

### 2.1. Get Current User Profile

`GET /users/me`

Retrieves the authenticated user's profile.

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid-of-user",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "USER",
      "createdAt": "2023-10-27T10:00:00.000Z",
      "updatedAt": "2023-10-27T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**
*   `401 Unauthorized`: No token or invalid token.
*   `404 Not Found`: User not found (should ideally not happen if token is valid).

---

## 3. Merchant Endpoints (`/merchants`)

*(Protected: Requires authentication. Admins can manage all merchants. Merchants can manage their own profile.)*

### 3.1. Create a Merchant Account

`POST /merchants`

Creates a new merchant account linked to the authenticated user. Only users with `MERCHANT` or `ADMIN` roles can create merchants.

**Request Body:**

| Field           | Type   | Description                                 | Required | Example                               |
| :-------------- | :----- | :------------------------------------------ | :------- | :------------------------------------ |
| `name`          | string | Business name of the merchant (must be unique). | Yes      | `ALX Tech Store`                      |
| `businessEmail` | string | Business contact email.                     | No       | `contact@alxtech.com`                 |
| `address`       | string | Business address.                           | No       | `123 Main St, Anytown, CA 12345`      |

**Success Response (201 Created):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid-of-merchant",
    "name": "ALX Tech Store",
    "businessEmail": "contact@alxtech.com",
    "address": "123 Main St, Anytown, CA 12345",
    "isActive": true,
    "balance": "0.00",
    "userId": "uuid-of-associated-user",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Error Responses:**
*   `401 Unauthorized`: No token or invalid token.
*   `403 Forbidden`: User does not have `MERCHANT` or `ADMIN` role.
*   `400 Bad Request`: Invalid input (e.g., duplicate name).

---

### 3.2. Get Merchant Details

`GET /merchants/:id`

Retrieves details for a specific merchant. Admins can view any merchant. Merchants can only view their own.

**Path Parameters:**

| Parameter | Type   | Description             |
| :-------- | :----- | :---------------------- |
| `id`      | string | The UUID of the merchant. |

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid-of-merchant",
    "name": "ALX Tech Store",
    "businessEmail": "contact@alxtech.com",
    "address": "123 Main St, Anytown, CA 12345",
    "isActive": true,
    "balance": "1500.75",
    "userId": "uuid-of-associated-user",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Error Responses:**
*   `401 Unauthorized`: No token or invalid token.
*   `403 Forbidden`: User is not authorized to view this merchant.
*   `404 Not Found`: Merchant with the given ID does not exist.

---

## 4. Transaction Endpoints (`/transactions`)

*(Protected: Requires authentication. Admins can view/manage all transactions. Merchants can view/manage their own transactions. Users can view transactions they initiated.)*

### 4.1. Create a New Transaction (Payment)

`POST /transactions`

Initiates a new payment transaction. Typically called by a `USER` or `MERCHANT` (e.g., for testing or specific internal operations).

**Request Body:**

| Field         | Type    | Description                                       | Required | Example                               |
| :------------ | :------ | :------------------------------------------------ | :------- | :------------------------------------ |
| `merchantId`  | string  | UUID of the receiving merchant.                   | Yes      | `uuid-of-merchant`                    |
| `amount`      | number  | Amount of the transaction (positive, 2 decimal places). | Yes      | `100.50`                              |
| `currency`    | string  | Three-letter currency code (e.g., `USD`, `EUR`). Defaults to `USD`. | No       | `EUR`                                 |
| `type`        | string  | Type of transaction. Defaults to `PAYMENT`. Enum: `PAYMENT`, `REFUND`, `WITHDRAWAL`, `DEPOSIT`. | No       | `PAYMENT`                             |
| `description` | string  | Optional description for the transaction.         | No       | `Purchase of online course`           |
| `metadata`    | object  | Arbitrary JSON data for additional context.       | No       | `{ "orderId": "ORD12345", "item": "book" }` |

**Success Response (201 Created):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid-of-transaction",
    "amount": "100.50",
    "currency": "USD",
    "type": "PAYMENT",
    "status": "COMPLETED",
    "description": "Purchase of online course",
    "externalTransactionId": "ext_txn_1701234567890_abc",
    "metadata": { "orderId": "ORD12345", "item": "book" },
    "processedAt": "2023-10-27T10:05:30.123Z",
    "initiatorUserId": "uuid-of-user",
    "merchantId": "uuid-of-merchant",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Error Responses:**
*   `401 Unauthorized`: No token or invalid token.
*   `403 Forbidden`: User not authorized to create transactions for this merchant.
*   `400 Bad Request`: Invalid input or payment gateway failure.
*   `404 Not Found`: Merchant not found.

---

### 4.2. Get All Transactions

`GET /transactions`

Retrieves a list of transactions. Supports filtering, pagination, and sorting.

**Query Parameters:**

| Parameter   | Type     | Description                                                          | Default |
| :---------- | :------- | :------------------------------------------------------------------- | :------ |
| `status`    | string   | Filter by transaction status. Enum: `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`, `CANCELLED`. | All     |
| `type`      | string   | Filter by transaction type. Enum: `PAYMENT`, `REFUND`, `WITHDRAWAL`, `DEPOSIT`. | All     |
| `merchantId`| string   | Filter by merchant ID. (Admins can specify any. Merchants are restricted to their own. Users may view transactions they initiated with specific merchants.) | All     |
| `startDate` | Date (ISO)| Filter transactions created after this date.                         | None    |
| `endDate`   | Date (ISO)| Filter transactions created before this date.                        | None    |
| `limit`     | number   | Maximum number of transactions to return per page (1-100).           | `20`    |
| `offset`    | number   | Number of transactions to skip for pagination.                       | `0`     |

**Success Response (200 OK):**

```json
{
  "status": "success",
  "results": 2,
  "total": 50,
  "data": [
    {
      "id": "uuid-of-transaction-1",
      "amount": "50.00",
      "currency": "USD",
      "type": "PAYMENT",
      "status": "COMPLETED",
      "description": "Subscription fee",
      "externalTransactionId": "ext_txn_1",
      "metadata": {},
      "processedAt": "...",
      "initiatorUserId": "...",
      "merchantId": "...",
      "createdAt": "...",
      "updatedAt": "..."
    },
    {
      "id": "uuid-of-transaction-2",
      "amount": "25.00",
      "currency": "EUR",
      "type": "REFUND",
      "status": "REFUNDED",
      "description": "Item return",
      "externalTransactionId": "ext_txn_2",
      "metadata": {},
      "processedAt": "...",
      "initiatorUserId": "...",
      "merchantId": "...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**Error Responses:**
*   `401 Unauthorized`: No token or invalid token.
*   `403 Forbidden`: User not authorized to view transactions for the specified `merchantId`.
*   `400 Bad Request`: Invalid query parameters.

---

### 4.3. Get Transaction by ID

`GET /transactions/:id`

Retrieves details for a specific transaction by its ID.

**Path Parameters:**

| Parameter | Type   | Description             |
| :-------- | :----- | :---------------------- |
| `id`      | string | The UUID of the transaction. |

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid-of-transaction",
    "amount": "100.50",
    "currency": "USD",
    "type": "PAYMENT",
    "status": "COMPLETED",
    "description": "Purchase of online course",
    "externalTransactionId": "ext_txn_1701234567890_abc",
    "metadata": { "orderId": "ORD12345", "item": "book" },
    "processedAt": "2023-10-27T10:05:30.123Z",
    "initiatorUserId": "uuid-of-user",
    "merchantId": "uuid-of-merchant",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Error Responses:**
*   `401 Unauthorized`: No token or invalid token.
*   `403 Forbidden`: User not authorized to view this transaction.
*   `404 Not Found`: Transaction with the given ID does not exist.

---

### 4.4. Update Transaction Status

`PATCH /transactions/:id/status`

Updates the status of a specific transaction. Primarily for `ADMIN` or `MERCHANT` roles (e.g., initiating refunds).

**Path Parameters:**

| Parameter | Type   | Description             |
| :-------- | :----- | :---------------------- |
| `id`      | string | The UUID of the transaction. |

**Request Body:**

| Field    | Type   | Description                                                                 | Required | Example           |
| :------- | :----- | :-------------------------------------------------------------------------- | :------- | :---------------- |
| `status` | string | The new status for the transaction. Enum: `COMPLETED`, `FAILED`, `REFUNDED`, `CANCELLED`. | Yes      | `REFUNDED`        |
| `reason` | string | Optional reason for status change (e.g., for `FAILED` or `REFUNDED`).       | No       | `Customer dispute`|

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid-of-transaction",
    "amount": "100.50",
    "currency": "USD",
    "type": "PAYMENT",
    "status": "REFUNDED",
    "description": "Purchase of online course",
    "externalTransactionId": "ext_txn_1701234567890_abc",
    "metadata": { "orderId": "ORD12345", "item": "book" },
    "processedAt": "2023-10-27T11:00:00.000Z",
    "failureReason": "Customer dispute",
    "initiatorUserId": "uuid-of-user",
    "merchantId": "uuid-of-merchant",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Error Responses:**
*   `401 Unauthorized`: No token or invalid token.
*   `403 Forbidden`: User not authorized to update this transaction's status.
*   `400 Bad Request`: Invalid status change (e.g., refunding a non-completed transaction).
*   `404 Not Found`: Transaction with the given ID does not exist.
```