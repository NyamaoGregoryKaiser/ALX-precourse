# ALXPay API Documentation

This document describes the RESTful API endpoints for the ALXPay payment processing system.

## Base URL

`http://localhost:5000/api` (or your deployed backend URL)

## Authentication

All protected endpoints require a JSON Web Token (JWT) provided in the `Authorization` header as a Bearer token:

`Authorization: Bearer <YOUR_JWT_TOKEN>`

## Error Handling

API errors are returned in a consistent JSON format:

```json
{
  "status": "fail" | "error",
  "message": "Error description",
  "statusCode": 4xx | 5xx,
  "stack": "..." // Only in development mode
}
```

*   `status`: `"fail"` for operational errors (e.g., validation), `"error"` for server-side exceptions.
*   `statusCode`: HTTP status code.

---

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 Register User

*   `POST /api/auth/register`
*   **Description:** Creates a new user account.
*   **Rate Limit:** 10 requests per 5 minutes per IP.
*   **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "strongpassword123",
      "role": "user" | "merchant" | "admin" // Optional, defaults to "user"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "status": "success",
      "token": "eyJhbGciOiJIUzI1Ni...",
      "data": {
        "user": {
          "id": "uuid-of-user",
          "email": "user@example.com",
          "role": "user"
        }
      }
    }
    ```
*   **Errors:** `400 Bad Request` (missing fields), `409 Conflict` (email already exists).

### 1.2 Login User

*   `POST /api/auth/login`
*   **Description:** Authenticates a user and returns a JWT token.
*   **Rate Limit:** 10 requests per 5 minutes per IP.
*   **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "strongpassword123"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "token": "eyJhbGciOiJIUzI1Ni...",
      "data": {
        "user": {
          "id": "uuid-of-user",
          "email": "user@example.com",
          "role": "user"
        }
      }
    }
    ```
*   **Errors:** `400 Bad Request` (missing fields), `401 Unauthorized` (invalid credentials).

### 1.3 Get Current User Profile

*   `GET /api/auth/me`
*   **Description:** Retrieves the profile of the authenticated user.
*   **Authentication:** Required (Bearer Token)
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "user": {
          "id": "uuid-of-user",
          "email": "user@example.com",
          "role": "user",
          "isEmailVerified": true,
          "createdAt": "2023-10-27T10:00:00.000Z",
          "updatedAt": "2023-10-27T10:00:00.000Z"
        }
      }
    }
    ```
*   **Errors:** `401 Unauthorized` (no token/invalid token), `404 Not Found` (user not found, though unlikely after auth).

---

## 2. Payment Endpoints (`/api/payments`)

### 2.1 Initiate a Payment

*   `POST /api/payments/initiate`
*   **Description:** Creates a new payment request, marking it as `initiated`. This is the first step before actual processing.
*   **Authentication:** Required (Bearer Token) - `MERCHANT` or `ADMIN` roles.
*   **Request Body:**
    ```json
    {
      "merchantId": "uuid-of-merchant",
      "amount": 100.50,
      "currency": "USD",
      "method": "card" | "bank_transfer" | "ussd" | "wallet",
      "customerEmail": "customer@email.com",
      "metadata": { // Optional: additional payment details
        "productName": "ALX Course",
        "quantity": 1
      }
    }
    ```
*   **Response (202 Accepted):**
    ```json
    {
      "status": "success",
      "message": "Payment initiation successful. Awaiting processing.",
      "data": {
        "payment": {
          "id": "uuid-of-payment",
          "amount": "100.50",
          "currency": "USD",
          "status": "initiated",
          "method": "card",
          "customerEmail": "customer@email.com",
          "metadata": { ... },
          "merchant": { "id": "uuid-of-merchant", "name": "ALX Store" },
          "createdAt": "2023-10-27T10:00:00.000Z"
        }
      }
    }
    ```
*   **Errors:** `400 Bad Request` (invalid input, amount <= 0, invalid method), `401 Unauthorized`, `403 Forbidden` (user not authorized), `404 Not Found` (merchant not found).

### 2.2 Process Payment Webhook (Callback from Gateway)

*   `POST /api/payments/process-webhook`
*   **Description:** This endpoint is designed to be called by an external payment gateway to notify ALXPay about the final status of an initiated payment. **Does not require JWT authentication for this demo, but a real system would use HMAC signature verification and IP whitelisting for security.**
*   **Authentication:** None (external system authentication via HMAC recommended).
*   **Request Body:**
    ```json
    {
      "paymentId": "uuid-of-payment-initiated-earlier",
      "externalId": "id-from-external-gateway",
      "status": "success" | "failed" | "pending" | "cancelled",
      "message": "Optional message from gateway (e.g., 'Approved', 'Insufficient Funds')"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "message": "Payment uuid-of-payment updated to success",
      "data": {
        "payment": {
          "id": "uuid-of-payment",
          "amount": "100.50",
          "currency": "USD",
          "status": "success", // Updated status
          "method": "card",
          "externalId": "id-from-external-gateway",
          "customerEmail": "customer@email.com",
          // ... other payment details
        }
      }
    }
    ```
*   **Errors:** `400 Bad Request` (missing fields, invalid status), `404 Not Found` (payment not found).

### 2.3 Get Payment Details

*   `GET /api/payments/:id`
*   **Description:** Retrieves details for a specific payment.
*   **Authentication:** Required (Bearer Token) - `MERCHANT` (for their own payments) or `ADMIN` roles.
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "payment": {
          "id": "uuid-of-payment",
          "amount": "100.50",
          "currency": "USD",
          "status": "success",
          "method": "card",
          "externalId": "id-from-external-gateway",
          "metadata": { ... },
          "customerEmail": "customer@email.com",
          "merchant": { "id": "uuid-of-merchant", "name": "ALX Store" },
          "createdAt": "2023-10-27T10:00:00.000Z",
          "updatedAt": "2023-10-27T10:05:00.000Z"
        }
      }
    }
    ```
*   **Errors:** `401 Unauthorized`, `403 Forbidden` (not authorized to view this payment), `404 Not Found`.

### 2.4 Get All Payments for a Merchant

*   `GET /api/payments/merchant/:merchantId`
*   **Description:** Retrieves a list of all payments associated with a specific merchant.
*   **Authentication:** Required (Bearer Token) - `MERCHANT` (for their own merchant) or `ADMIN` roles.
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "results": 2,
      "data": {
        "payments": [
          { "id": "payment-uuid-1", "amount": "50.00", ... },
          { "id": "payment-uuid-2", "amount": "75.00", ... }
        ]
      }
    }
    ```
*   **Errors:** `401 Unauthorized`, `403 Forbidden` (not authorized to view payments for this merchant), `404 Not Found` (merchant ID not found).

### 2.5 Refund a Payment

*   `POST /api/payments/:id/refund`
*   **Description:** Initiates a refund for a successful payment.
*   **Authentication:** Required (Bearer Token) - `MERCHANT` (for their own payments) or `ADMIN` roles.
*   **Request Body:**
    ```json
    {
      "amount": 25.00 // The amount to refund. Must be > 0 and <= original payment amount.
      // "merchantId": "uuid-of-merchant" // Optional, but useful for cache invalidation.
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "message": "Payment uuid-of-payment successfully refunded for 25.00 USD",
      "data": {
        "payment": {
          "id": "uuid-of-payment",
          "amount": "100.50",
          "currency": "USD",
          "status": "refunded", // Status changed to refunded
          // ... other payment details
        }
      }
    }
    ```
*   **Errors:** `400 Bad Request` (invalid amount, payment not successful, insufficient merchant balance), `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

---

## 3. Webhook Endpoints (Example - Merchant-side)

This system *sends* webhooks. A merchant's system would have an endpoint to *receive* them. Below is an example of what a merchant's endpoint might look like.

### 3.1 Receive Payment Success Webhook

*   `POST /webhooks` (example URL on a merchant's server)
*   **Description:** An example endpoint a merchant would expose to receive payment success notifications from ALXPay.
*   **Request Body (Example from ALXPay):**
    ```json
    {
      "eventType": "payment.success",
      "resourceId": "uuid-of-payment",
      "payload": {
        "paymentId": "uuid-of-payment",
        "merchantId": "uuid-of-merchant",
        "amount": 100.50,
        "currency": "USD",
        "status": "success",
        "customerEmail": "customer@email.com",
        "metadata": { "orderId": "ORD-123" }
      },
      "webhookUrl": "http://localhost:3001/webhooks",
      "merchantId": "uuid-of-merchant",
      "status": "pending",
      "createdAt": "2023-10-27T10:00:00.000Z"
    }
    ```
*   **Expected Response:** `200 OK` (to acknowledge receipt and prevent retries)
*   **Security Note:** Merchant should verify the webhook's authenticity (e.g., using `X-Webhook-Signature` header and `WEBHOOK_SECRET`).

---

*(Additional sections for Merchants CRUD, Users CRUD, etc. would follow here in a complete system)*
```