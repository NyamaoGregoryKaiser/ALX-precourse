# API Documentation

This document describes the RESTful API for the Enterprise-Grade C++ DevOps Automation System. All API requests and responses are in JSON format.

**Base URL:** `http://localhost:8080` (or your deployed URL)

## Authentication

### 1. Register User

Registers a new user account.

*   **URL:** `/auth/register`
*   **Method:** `POST`
*   **Request Body:** `application/json`
    ```json
    {
      "username": "string",        // Required, unique username
      "email": "string",           // Required, unique email
      "password": "string",        // Required, min 8 chars
      "role": "string"             // Optional, default "USER". Can be "USER" or "ADMIN".
    }
    ```
*   **Response (201 Created):** `application/json`
    ```json
    {
      "message": "User registered successfully",
      "user_id": 1,
      "username": "newuser",
      "email": "newuser@example.com",
      "role": "USER",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // JWT token
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid input (e.g., missing fields, invalid email, weak password).
    *   `409 Conflict`: Username or email already exists.
    *   `500 Internal Server Error`: Server-side issues.

### 2. Login User

Authenticates a user and returns a JWT token for subsequent protected requests.

*   **URL:** `/auth/login`
*   **Method:** `POST`
*   **Request Body:** `application/json`
    ```json
    {
      "username": "string",        // Required
      "password": "string"         // Required
    }
    ```
*   **Response (200 OK):** `application/json`
    ```json
    {
      "message": "Login successful",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // JWT token
      "user_id": 1,
      "username": "testuser",
      "role": "USER"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing username or password.
    *   `401 Unauthorized`: Invalid username or password.
    *   `500 Internal Server Error`: Server-side issues.

## User Management (Protected Routes - Requires JWT)

All endpoints in this section require a valid JWT token in the `Authorization` header: `Authorization: Bearer <YOUR_JWT_TOKEN>`

### 3. Get User Profile

Retrieves the profile of the authenticated user.

*   **URL:** `/users/me`
*   **Method:** `GET`
*   **Headers:** `Authorization: Bearer <JWT_TOKEN>`
*   **Response (200 OK):** `application/json`
    ```json
    {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "role": "USER",
      "created_at": "2023-10-27T10:00:00Z",
      "updated_at": "2023-10-27T10:00:00Z"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `404 Not Found`: User not found (shouldn't happen for authenticated user but good for robustness).
    *   `500 Internal Server Error`.

### 4. Get User by ID (Admin Only)

Retrieves a user's profile by ID. Requires `ADMIN` role.

*   **URL:** `/users/{id}`
*   **Method:** `GET`
*   **Headers:** `Authorization: Bearer <JWT_TOKEN>`
*   **Path Parameters:**
    *   `id`: `integer` - The ID of the user to retrieve.
*   **Response (200 OK):** `application/json` (Same as "Get User Profile")
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User does not have `ADMIN` role.
    *   `404 Not Found`: User with the given ID not found.
    *   `500 Internal Server Error`.

### 5. Update User Profile

Updates the profile of the authenticated user.

*   **URL:** `/users/me`
*   **Method:** `PUT`
*   **Headers:** `Authorization: Bearer <JWT_TOKEN>`
*   **Request Body:** `application/json` (all fields are optional, only provided fields will be updated)
    ```json
    {
      "email": "string",
      "password": "string" // Will be hashed
    }
    ```
*   **Response (200 OK):** `application/json`
    ```json
    {
      "message": "User profile updated successfully",
      "id": 1,
      "username": "testuser",
      "email": "updated@example.com",
      "role": "USER",
      "created_at": "2023-10-27T10:00:00Z",
      "updated_at": "2023-10-27T10:30:00Z"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid input (e.g., invalid email, weak password).
    *   `401 Unauthorized`: Missing or invalid token.
    *   `409 Conflict`: Email already in use by another user.
    *   `500 Internal Server Error`.

### 6. Delete User (Admin Only)

Deletes a user account by ID. Requires `ADMIN` role.

*   **URL:** `/users/{id}`
*   **Method:** `DELETE`
*   **Headers:** `Authorization: Bearer <JWT_TOKEN>`
*   **Path Parameters:**
    *   `id`: `integer` - The ID of the user to delete.
*   **Response (204 No Content):** No content is returned on successful deletion.
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User does not have `ADMIN` role.
    *   `404 Not Found`: User with the given ID not found.
    *   `500 Internal Server Error`.

## Product Management (Protected Routes - Requires JWT, Admin for CRUD)

All endpoints in this section require a valid JWT token.
*   `GET /products` and `GET /products/{id}` are accessible to `USER` and `ADMIN`.
*   `POST`, `PUT`, `DELETE` on products require `ADMIN` role.

### 7. Create Product (Admin Only)

Creates a new product.

*   **URL:** `/products`
*   **Method:** `POST`
*   **Headers:** `Authorization: Bearer <JWT_TOKEN>`
*   **Request Body:** `application/json`
    ```json
    {
      "name": "string",        // Required, unique product name
      "description": "string", // Optional
      "price": "number",       // Required, positive value
      "stock_quantity": "integer" // Required, non-negative value
    }
    ```
*   **Response (201 Created):** `application/json`
    ```json
    {
      "message": "Product created successfully",
      "id": 1,
      "name": "New Product",
      "description": "A new product description.",
      "price": 99.99,
      "stock_quantity": 100,
      "created_at": "2023-10-27T10:00:00Z",
      "updated_at": "2023-10-27T10:00:00Z"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid input.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User does not have `ADMIN` role.
    *   `409 Conflict`: Product name already exists.
    *   `500 Internal Server Error`.

### 8. Get All Products

Retrieves a list of all products.

*   **URL:** `/products`
*   **Method:** `GET`
*   **Headers:** `Authorization: Bearer <JWT_TOKEN>`
*   **Response (200 OK):** `application/json`
    ```json
    [
      {
        "id": 1,
        "name": "Product A",
        "description": "Description of Product A",
        "price": 10.50,
        "stock_quantity": 50,
        "created_at": "2023-10-27T10:00:00Z",
        "updated_at": "2023-10-27T10:00:00Z"
      },
      {
        "id": 2,
        "name": "Product B",
        "description": "Description of Product B",
        "price": 25.00,
        "stock_quantity": 120,
        "created_at": "2023-10-27T10:05:00Z",
        "updated_at": "2023-10-27T10:05:00Z"
      }
    ]
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `500 Internal Server Error`.

### 9. Get Product by ID

Retrieves a single product by its ID.

*   **URL:** `/products/{id}`
*   **Method:** `GET`
*   **Headers:** `Authorization: Bearer <JWT_TOKEN>`
*   **Path Parameters:**
    *   `id`: `integer` - The ID of the product to retrieve.
*   **Response (200 OK):** `application/json` (single product object, same format as above)
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `404 Not Found`: Product with the given ID not found.
    *   `500 Internal Server Error`.

### 10. Update Product (Admin Only)

Updates an existing product by ID.

*   **URL:** `/products/{id}`
*   **Method:** `PUT`
*   **Headers:** `Authorization: Bearer <JWT_TOKEN>`
*   **Path Parameters:**
    *   `id`: `integer` - The ID of the product to update.
*   **Request Body:** `application/json` (all fields are optional, only provided fields will be updated)
    ```json
    {
      "name": "string",
      "description": "string",
      "price": "number",
      "stock_quantity": "integer"
    }
    ```
*   **Response (200 OK):** `application/json`
    ```json
    {
      "message": "Product updated successfully",
      "id": 1,
      "name": "Updated Product Name",
      "description": "Updated description.",
      "price": 12.99,
      "stock_quantity": 45,
      "created_at": "2023-10-27T10:00:00Z",
      "updated_at": "2023-10-27T10:45:00Z"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid input.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User does not have `ADMIN` role.
    *   `404 Not Found`: Product with the given ID not found.
    *   `409 Conflict`: Product name already exists (if name is updated to an existing one).
    *   `500 Internal Server Error`.

### 11. Delete Product (Admin Only)

Deletes a product by ID.

*   **URL:** `/products/{id}`
*   **Method:** `DELETE`
*   **Headers:** `Authorization: Bearer <JWT_TOKEN>`
*   **Path Parameters:**
    *   `id`: `integer` - The ID of the product to delete.
*   **Response (204 No Content):** No content is returned on successful deletion.
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User does not have `ADMIN` role.
    *   `404 Not Found`: Product with the given ID not found.
    *   `500 Internal Server Error`.

## Common Error Response Structure

In case of an error, the API will return a JSON object with a consistent structure:

```json
{
  "status_code": "integer",    // HTTP status code
  "error": "string",           // Short error type (e.g., "Bad Request", "Unauthorized")
  "message": "string"          // A more detailed, human-readable error message
}
```

---
**Note:** The `/orders` endpoints are defined in models/services but not explicitly implemented in controllers in this example to keep the API docs concise. However, they would follow a similar CRUD pattern.
---