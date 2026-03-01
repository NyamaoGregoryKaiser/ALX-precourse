# Authentication System API Documentation

This document provides detailed information about the RESTful API endpoints of the Authentication System. All endpoints are versioned under `/api/v1`.

## Base URL

`http://localhost:8080/api/v1` (for local development)

## Authentication

### 1. Register User

`POST /api/v1/register`

Registers a new user with a unique username and email.

*   **Headers:**
    *   `Content-Type: application/json`
*   **Request Body:**
    ```json
    {
      "username": "newuser",
      "email": "newuser@example.com",
      "password": "StrongPassword123!"
    }
    ```
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "status": 200,
          "message": "User registered successfully",
          "data": {
            "id": 101,
            "username": "newuser",
            "email": "newuser@example.com",
            "created_at": "YYYY-MM-DD HH:MM:SS",
            "updated_at": "YYYY-MM-DD HH:MM:SS",
            "enabled": true
          }
        }
        ```
    *   `400 Bad Request`: Missing `username`, `email`, or `password`.
        ```json
        { "status": 400, "message": "Missing required fields" }
        ```
    *   `409 Conflict`: Username or email already exists.
        ```json
        { "status": 409, "message": "User already exists" }
        ```
    *   `500 Internal Server Error`: Generic server error.

### 2. Login User

`POST /api/v1/login`

Authenticates a user and returns a JSON Web Token (JWT) for subsequent authenticated requests.

*   **Headers:**
    *   `Content-Type: application/json`
*   **Request Body:**
    ```json
    {
      "identifier": "username_or_email",
      "password": "user_password"
    }
    ```
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "status": 200,
          "message": "User logged in successfully",
          "data": {
            "user": {
              "id": 101,
              "username": "username_or_email",
              "email": "user@example.com",
              "created_at": "YYYY-MM-DD HH:MM:SS",
              "updated_at": "YYYY-MM-DD HH:MM:SS",
              "enabled": true
            },
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2..."
            "roles": ["user"]
          }
        }
        ```
    *   `400 Bad Request`: Missing `identifier` or `password`.
    *   `401 Unauthorized`: Invalid credentials (username/email or password).
        ```json
        { "status": 401, "message": "Invalid credentials" }
        ```
    *   `429 Too Many Requests`: Rate limit exceeded.
    *   `500 Internal Server Error`: Generic server error.

### 3. Logout User

`POST /api/v1/logout`

Invalidates the provided JWT token, effectively logging the user out. The token will no longer be accepted.

*   **Headers:**
    *   `Authorization: Bearer <JWT_TOKEN>`
*   **Request Body:** None
*   **Responses:**
    *   `200 OK`:
        ```json
        { "status": 200, "message": "User logged out successfully" }
        ```
    *   `401 Unauthorized`: Missing or invalid token.
        ```json
        { "status": 401, "message": "Invalid or expired token" }
        ```
    *   `400 Bad Request`: Failed to invalidate token.
    *   `500 Internal Server Error`: Generic server error.

## User Management

All endpoints under this section require a valid JWT token in the `Authorization` header. Specific roles may be required for certain operations.

*   **Headers (for all user management endpoints):**
    *   `Authorization: Bearer <JWT_TOKEN>`

### 1. Get All Users

`GET /api/v1/users`

Retrieves a list of all registered users in the system.

*   **Access:** `admin` role only.
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "status": 200,
          "message": "Users retrieved successfully",
          "data": [
            { "id": 1, "username": "admin", "email": "admin@example.com", ... },
            { "id": 2, "username": "jane_doe", "email": "jane@example.com", ... }
          ]
        }
        ```
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have `admin` role.
    *   `500 Internal Server Error`: Generic server error.

### 2. Get User by ID

`GET /api/v1/users/{id}`

Retrieves details for a specific user.

*   **Access:** `admin` role can retrieve any user; a `user` can only retrieve their own details.
*   **Path Parameters:**
    *   `id` (integer): The ID of the user.
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "status": 200,
          "message": "User retrieved successfully",
          "data": {
            "id": 101,
            "username": "exampleuser",
            "email": "example@example.com",
            "created_at": "YYYY-MM-DD HH:MM:SS",
            "updated_at": "YYYY-MM-DD HH:MM:SS",
            "enabled": true
          }
        }
        ```
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User attempts to access another user's details without `admin` role.
    *   `404 Not Found`: User with the given ID does not exist.
    *   `500 Internal Server Error`: Generic server error.

### 3. Update User

`PATCH /api/v1/users/{id}`

Updates specified fields for a user.

*   **Access:** `admin` role can update any user; a `user` can only update their own `username` or `email`. The `enabled` status can only be modified by an `admin`.
*   **Path Parameters:**
    *   `id` (integer): The ID of the user to update.
*   **Request Body:** (Partial update, any combination of fields)
    ```json
    {
      "username": "new_username",
      "email": "new_email@example.com",
      "enabled": false
    }
    ```
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "status": 200,
          "message": "User updated successfully",
          "data": { /* Updated user object */ }
        }
        ```
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User lacks permissions (e.g., trying to update another user, or change `enabled` status as non-admin).
    *   `404 Not Found`: User with the given ID does not exist.
    *   `409 Conflict`: Provided `username` or `email` is already taken by another user.
    *   `500 Internal Server Error`: Generic server error.

### 4. Delete User

`DELETE /api/v1/users/{id}`

Deletes a user from the system. Associated roles and sessions are also removed.

*   **Access:** `admin` role only. An admin cannot delete their own account through this endpoint.
*   **Path Parameters:**
    *   `id` (integer): The ID of the user to delete.
*   **Request Body:** None
*   **Responses:**
    *   `200 OK`:
        ```json
        { "status": 200, "message": "User deleted successfully" }
        ```
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User lacks `admin` role, or an admin attempts to delete themselves.
    *   `404 Not Found`: User with the given ID does not exist.
    *   `500 Internal Server Error`: Generic server error.

### 5. Assign Roles to User

`PUT /api/v1/users/{id}/roles`

Assigns a new set of roles to a user. This operation *replaces* all existing roles for the user with the roles provided in the request body.

*   **Access:** `admin` role only.
*   **Path Parameters:**
    *   `id` (integer): The ID of the user.
*   **Request Body:**
    ```json
    {
      "roles": ["admin", "editor"]
    }
    ```
*   **Responses:**
    *   `200 OK`:
        ```json
        { "status": 200, "message": "Roles assigned successfully" }
        ```
    *   `400 Bad Request`: Missing or invalid `roles` array, or invalid role names.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User lacks `admin` role.
    *   `404 Not Found`: User with the given ID does not exist.
    *   `500 Internal Server Error`: Generic server error.

### 6. Get User Roles

`GET /api/v1/users/{id}/roles`

Retrieves the list of roles assigned to a specific user.

*   **Access:** `admin` role can retrieve roles for any user; a `user` can only retrieve their own roles.
*   **Path Parameters:**
    *   `id` (integer): The ID of the user.
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "status": 200,
          "message": "User roles retrieved successfully",
          "data": ["user", "premium"]
        }
        ```
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User attempts to access another user's roles without `admin` role.
    *   `404 Not Found`: User with the given ID does not exist.
    *   `500 Internal Server Error`: Generic server error.

## Error Responses

The API uses standard HTTP status codes and consistent JSON error payloads:

```json
{
  "status": 401,
  "message": "Unauthorized access"
}
```
Common error status codes include:
*   `400 Bad Request`
*   `401 Unauthorized`
*   `403 Forbidden`
*   `404 Not Found`
*   `409 Conflict`
*   `429 Too Many Requests`
*   `500 Internal Server Error`
```