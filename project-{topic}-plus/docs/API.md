# E-commerce C++ API Documentation (OpenAPI 3.0 Specification)

This document outlines the RESTful API endpoints for the E-commerce C++ backend. It follows the OpenAPI 3.0 specification structure, which can be used to generate interactive documentation (e.g., Swagger UI).

**Base URL**: `http://localhost:8080/api/v1`

---

## 1. Authentication

### `POST /auth/register`

Registers a new user account.

*   **Description**: Creates a new customer account in the system.
*   **Request Body (application/json)**:
    ```json
    {
      "username": "string",       // Required, unique username
      "email": "string",          // Required, unique, valid email format
      "password": "string",       // Required, strong password (min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special)
      "first_name": "string",     // Required
      "last_name": "string",      // Optional
      "phone_number": "string",   // Optional
      "address": "string",        // Optional
      "role": "string"            // Optional, default "customer". Only "admin" role can set "admin".
    }
    ```
*   **Responses**:
    *   `201 Created`: User successfully registered.
        ```json
        {
          "success": true,
          "message": "User registered successfully.",
          "user": {
            "id": "usr_...",
            "username": "string",
            "email": "string",
            "first_name": "string",
            "last_name": "string | null",
            "phone_number": "string | null",
            "address": "string | null",
            "role": "customer",
            "created_at": "ISO 8601 timestamp",
            "updated_at": "ISO 8601 timestamp"
          },
          "token": "string" // JWT Token
        }
        ```
    *   `400 Bad Request`: Invalid input (e.g., weak password, invalid email, missing fields).
    *   `409 Conflict`: Username or email already exists.
    *   `500 Internal Server Error`: Database error or unexpected server issue.

---

### `POST /auth/login`

Authenticates a user and returns a JWT token.

*   **Description**: Verifies user credentials and issues a JSON Web Token for subsequent authenticated requests.
*   **Request Body (application/json)**:
    ```json
    {
      "username_or_email": "string", // Required, username or email
      "password": "string"           // Required
    }
    ```
*   **Responses**:
    *   `200 OK`: Login successful.
        ```json
        {
          "success": true,
          "message": "Login successful.",
          "user": {
            "id": "usr_...",
            "username": "string",
            "email": "string",
            "first_name": "string",
            "role": "customer",
            "created_at": "ISO 8601 timestamp",
            "updated_at": "ISO 8601 timestamp"
          },
          "token": "string" // JWT Token
        }
        ```
    *   `401 Unauthorized`: Invalid credentials.
    *   `400 Bad Request`: Missing required fields.
    *   `500 Internal Server Error`: Database error or unexpected server issue.

---

## 2. Users

All User endpoints except `POST /auth/register` and `POST /auth/login` require authentication.
Authentication is done by providing a `Bearer` token in the `Authorization` header: `Authorization: Bearer <JWT_TOKEN>`.

### `GET /users`

Retrieves a list of all users.

*   **Description**: Fetches a paginated list of all registered users. **Requires `admin` role.**
*   **Query Parameters**:
    *   `limit`: (Optional) Number of users to return (default: 100).
    *   `offset`: (Optional) Number of users to skip (default: 0).
*   **Headers**:
    *   `Authorization`: `Bearer <JWT_TOKEN>`
*   **Responses**:
    *   `200 OK`: List of users.
        ```json
        {
          "success": true,
          "data": [
            {
              "id": "usr_...",
              "username": "string",
              "email": "string",
              "first_name": "string",
              "last_name": "string | null",
              "role": "customer",
              "created_at": "ISO 8601 timestamp",
              "updated_at": "ISO 8601 timestamp"
            }
          ]
        }
        ```
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: Authenticated user does not have `admin` role.
    *   `500 Internal Server Error`: Database error or unexpected server issue.

---

### `GET /users/{userId}`

Retrieves a specific user by ID.

*   **Description**: Fetches details for a single user.
*   **Path Parameters**:
    *   `userId`: `string` (Required) The ID of the user to retrieve.
*   **Headers**:
    *   `Authorization`: `Bearer <JWT_TOKEN>`
*   **Authorization**:
    *   Authenticated users can retrieve their own profile.
    *   Users with `admin` role can retrieve any user's profile.
*   **Responses**:
    *   `200 OK`: User details.
        ```json
        {
          "success": true,
          "data": {
            "id": "usr_...",
            "username": "string",
            "email": "string",
            "first_name": "string",
            "last_name": "string | null",
            "phone_number": "string | null",
            "address": "string | null",
            "role": "customer",
            "created_at": "ISO 8601 timestamp",
            "updated_at": "ISO 8601 timestamp"
          }
        }
        ```
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: Authenticated user is not `admin` and trying to access another user's profile.
    *   `404 Not Found`: User with the specified ID does not exist.
    *   `500 Internal Server Error`: Database error or unexpected server issue.

---

### `PUT /users/{userId}`

Updates a specific user's details.

*   **Description**: Modifies an existing user's information.
*   **Path Parameters**:
    *   `userId`: `string` (Required) The ID of the user to update.
*   **Headers**:
    *   `Authorization`: `Bearer <JWT_TOKEN>`
*   **Authorization**:
    *   Authenticated users can update their own profile.
    *   Users with `admin` role can update any user's profile.
    *   Non-admin users cannot change `role` or `password` (only `first_name`, `last_name`, `phone_number`, `address`, `email`, `username`).
    *   Admin users cannot demote themselves from `admin` role.
*   **Request Body (application/json)**: (Partial update, fields are optional)
    ```json
    {
      "username": "string",       // Optional
      "email": "string",          // Optional, must be unique if changed
      "password": "string",       // Optional, new password (will be hashed)
      "first_name": "string",     // Optional
      "last_name": "string | null",      // Optional (can set to null)
      "phone_number": "string | null",   // Optional (can set to null)
      "address": "string | null",        // Optional (can set to null)
      "role": "string"            // Optional, (admin only, with self-demotion restriction)
    }
    ```
*   **Responses**:
    *   `200 OK`: User successfully updated.
        ```json
        {
          "success": true,
          "message": "User updated successfully.",
          "data": {
            "id": "usr_...",
            "username": "string",
            "email": "string",
            "first_name": "string",
            "role": "customer",
            "updated_at": "ISO 8601 timestamp"
          }
        }
        ```
    *   `400 Bad Request`: Invalid input (e.g., invalid email, weak password, invalid role change).
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: Authorization rules violated (e.g., non-admin changing role, admin self-demotion).
    *   `404 Not Found`: User with the specified ID does not exist.
    *   `409 Conflict`: Email or username already taken by another user.
    *   `500 Internal Server Error`: Database error or unexpected server issue.

---

### `DELETE /users/{userId}`

Deletes a specific user by ID.

*   **Description**: Removes a user account from the system. **Requires `admin` role.**
*   **Path Parameters**:
    *   `userId`: `string` (Required) The ID of the user to delete.
*   **Headers**:
    *   `Authorization`: `Bearer <JWT_TOKEN>`
*   **Authorization**:
    *   **Requires `admin` role.**
    *   **Admins cannot delete their own account.**
*   **Responses**:
    *   `200 OK`: User successfully deleted.
        ```json
        {
          "success": true,
          "message": "User deleted successfully."
        }
        ```
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: Authenticated user is not `admin` or attempting to delete their own admin account.
    *   `404 Not Found`: User with the specified ID does not exist.
    *   `500 Internal Server Error`: Database error or unexpected server issue (e.g., user has existing orders preventing deletion).

---

## 3. Products (Conceptual - similar structure to Users)

*(This section would be expanded with full CRUD for products)*

### `GET /products`
### `GET /products/{productId}`
### `POST /products` (Admin only)
### `PUT /products/{productId}` (Admin only)
### `DELETE /products/{productId}` (Admin only)

---

## 4. Orders (Conceptual - similar structure)

*(This section would be expanded with full CRUD for orders)*

### `POST /orders` (Customer only)
### `GET /orders` (Admin: all orders; Customer: own orders)
### `GET /orders/{orderId}` (Admin: any order; Customer: own order)
### `PUT /orders/{orderId}/status` (Admin only: update status)

---

## 5. Cart (Conceptual - similar structure)

*(This section would be expanded with full CRUD for cart items)*

### `GET /cart` (Customer: retrieve current cart)
### `POST /cart/add` (Customer: add item to cart)
### `PUT /cart/update/{cartItemId}` (Customer: update quantity)
### `DELETE /cart/remove/{cartItemId}` (Customer: remove item)
### `POST /cart/checkout` (Customer: convert cart to order)

---

## Error Responses

All error responses follow a consistent JSON structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING", // e.g., "BAD_REQUEST", "UNAUTHORIZED", "NOT_FOUND", "CONFLICT", "SERVER_ERROR"
    "message": "Human-readable error message explaining the issue.",
    "status": 400 // HTTP status code
  }
}
```