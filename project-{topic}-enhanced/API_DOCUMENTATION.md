# Database Optimization System API Documentation

This document outlines the RESTful API endpoints for the Database Optimization System (DBO).

**Base URL**: `http://localhost:8080/api/v1`

---

## Authentication

All protected endpoints require a valid JWT token in the `Authorization` header, in the format `Bearer <TOKEN>`.

### `POST /auth/login`

Authenticates a user and returns a JWT token.

*   **Request Body**: `application/json`
    ```json
    {
        "username": "string",
        "password": "string"
    }
    ```
*   **Responses**:
    *   `200 OK`: Successful login.
        ```json
        {
            "token": "string"
        }
        ```
    *   `401 Unauthorized`: Invalid credentials.
        ```json
        {
            "status": 401,
            "message": "Invalid credentials"
        }
        ```
    *   `400 Bad Request`: Invalid JSON payload.

### `POST /auth/register`

Registers a new user. Default role is 'USER'.

*   **Request Body**: `application/json`
    ```json
    {
        "username": "string",
        "password_hash": "string",  // This field temporarily holds the clear password for registration
        "email": "string"
    }
    ```
*   **Responses**:
    *   `201 Created`: User registered successfully.
        ```json
        {
            "message": "User registered successfully"
        }
        ```
    *   `400 Bad Request`: Missing required fields or invalid JSON.
    *   `409 Conflict`: User with this username or email already exists.
    *   `500 Internal Server Error`: Server-side error.

---

## Users (Admin Only)

Requires `ADMIN` role.

### `GET /users`

Retrieves a list of all users.

*   **Authentication**: Required (Admin Role)
*   **Responses**:
    *   `200 OK`: List of users.
        ```json
        [
            {
                "id": 1,
                "username": "admin",
                "email": "admin@example.com",
                "role": "ADMIN",
                "created_at": "2023-10-27T10:00:00Z",
                "updated_at": "2023-10-27T10:00:00Z"
            }
        ]
        ```
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Insufficient role.

### `GET /users/{id}`

Retrieves a user by ID.

*   **Authentication**: Required (Admin Role)
*   **Parameters**:
    *   `id` (path): `integer` - The ID of the user.
*   **Responses**:
    *   `200 OK`: User object.
    *   `404 Not Found`: User not found.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Insufficient role.

### `PUT /users/{id}`

Updates an existing user.

*   **Authentication**: Required (Admin Role)
*   **Parameters**:
    *   `id` (path): `integer` - The ID of the user to update.
*   **Request Body**: `application/json` (partial or full user object)
    ```json
    {
        "email": "new.email@example.com",
        "role": "USER"
    }
    ```
*   **Responses**:
    *   `200 OK`: User updated successfully.
    *   `404 Not Found`: User not found.
    *   `400 Bad Request`: Invalid JSON or data.
    *   `401 Unauthorized`/`403 Forbidden`.

### `DELETE /users/{id}`

Deletes a user by ID.

*   **Authentication**: Required (Admin Role)
*   **Parameters**:
    *   `id` (path): `integer` - The ID of the user to delete.
*   **Responses**:
    *   `200 OK`: User deleted successfully.
    *   `404 Not Found`: User not found.
    *   `401 Unauthorized`/`403 Forbidden`.

---

## Optimization Recommendations

Accessible to authenticated users.

### `GET /recommendations`

Retrieves a list of all index recommendations.

*   **Authentication**: Required
*   **Responses**:
    *   `200 OK`: Array of recommendation objects.
        ```json
        [
            {
                "id": 1,
                "table_name": "customers",
                "column_name": "email",
                "recommendation_type": "B-TREE INDEX",
                "recommendation_sql": "CREATE INDEX idx_customers_email ON customers (email);",
                "description": "Index email column for faster email lookups.",
                "status": "PENDING",
                "severity": "MEDIUM",
                "cost_savings": "High",
                "created_at": "2023-10-27T10:00:00Z",
                "updated_at": "2023-10-27T10:00:00Z"
            }
        ]
        ```
    *   `401 Unauthorized`: Missing or invalid token.

### `GET /recommendations/{id}`

Retrieves a single index recommendation by ID.

*   **Authentication**: Required
*   **Parameters**:
    *   `id` (path): `integer` - The ID of the recommendation.
*   **Responses**:
    *   `200 OK`: Recommendation object.
    *   `404 Not Found`: Recommendation not found.
    *   `401 Unauthorized`.

### `POST /recommendations`

Creates a new index recommendation.

*   **Authentication**: Required
*   **Request Body**: `application/json`
    ```json
    {
        "table_name": "string",
        "column_name": "string",
        "recommendation_type": "string",
        "recommendation_sql": "string",
        "description": "string",
        "severity": "string",
        "cost_savings": "string"
    }
    ```
*   **Responses**:
    *   `201 Created`: Recommendation created.
    *   `400 Bad Request`: Invalid JSON or data.
    *   `401 Unauthorized`.

### `PUT /recommendations/{id}`

Updates an existing index recommendation.

*   **Authentication**: Required
*   **Parameters**:
    *   `id` (path): `integer` - The ID of the recommendation to update.
*   **Request Body**: `application/json` (partial or full recommendation object)
    ```json
    {
        "status": "APPLIED",
        "description": "Updated description..."
    }
    ```
*   **Responses**:
    *   `200 OK`: Recommendation updated.
    *   `404 Not Found`: Recommendation not found.
    *   `400 Bad Request`: Invalid JSON or data.
    *   `401 Unauthorized`.

### `DELETE /recommendations/{id}`

Deletes an index recommendation.

*   **Authentication**: Required
*   **Parameters**:
    *   `id` (path): `integer` - The ID of the recommendation to delete.
*   **Responses**:
    *   `200 OK`: Recommendation deleted.
    *   `404 Not Found`: Recommendation not found.
    *   `401 Unauthorized`.

---

## Analysis Endpoints (Admin Only)

These endpoints trigger database analysis processes.

### `POST /analyze/queries`

Initiates an analysis of recent query logs to identify potential index improvements. This is typically an asynchronous operation.

*   **Authentication**: Required (Admin Role)
*   **Responses**:
    *   `200 OK`: Analysis initiated message.
        ```json
        {
            "message": "Query analysis initiated. Check recommendations later."
        }
        ```
    *   `401 Unauthorized`/`403 Forbidden`.
    *   `500 Internal Server Error`: Analysis failed.

### `POST /analyze/schema`

Initiates an analysis of the current database schema for issues like missing foreign keys, suboptimal data types, etc.

*   **Authentication**: Required (Admin Role)
*   **Responses**:
    *   `200 OK`: Analysis initiated message.
        ```json
        {
            "message": "Schema analysis initiated. Check schema issues later."
        }
        ```
    *   `401 Unauthorized`/`403 Forbidden`.
    *   `500 Internal Server Error`: Analysis failed.

---
```