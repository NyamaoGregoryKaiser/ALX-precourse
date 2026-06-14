```markdown
# Aurora Metrics API Documentation

This document describes the RESTful API endpoints for the Aurora Metrics system.

## Base URL

`http://localhost:8080/api/v1` (or your deployed domain)

## Authentication

All protected endpoints require a JSON Web Token (JWT) provided in the `Authorization` header as a Bearer token.

`Authorization: Bearer <your_jwt_token>`

## Error Handling

API errors are returned in a JSON format:

```json
{
  "status": "error",
  "message": "A human-readable error message.",
  "code": 400
}
```

Standard HTTP status codes are used to indicate the type of error (e.g., `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`).

## Endpoints

---

### 1. Authentication

#### `POST /auth/register`

Register a new user account.

*   **Request:**
    ```json
    {
      "username": "newuser",
      "password": "strongpassword",
      "email": "newuser@example.com" (optional)
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "message": "User registered successfully."
    }
    ```
*   **Error (400 Bad Request):** If username already exists or password is too weak.

#### `POST /auth/login`

Authenticate a user and obtain a JWT token.

*   **Request:**
    ```json
    {
      "username": "existinguser",
      "password": "userpassword"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiI...",
      "expires_in": 3600
    }
    ```
*   **Error (401 Unauthorized):** Invalid username or password.

---

### 2. Users (Protected)

Requires JWT authentication.

#### `GET /users`

Retrieve a list of all users.

*   **Request:** `GET /users`
*   **Response (200 OK):**
    ```json
    [
      {
        "id": "uuid-of-user-1",
        "username": "admin",
        "email": "admin@example.com",
        "created_at": "2023-10-27T10:00:00Z"
      },
      {
        "id": "uuid-of-user-2",
        "username": "api_test_user",
        "email": "api_test_user@example.com",
        "created_at": "2023-10-27T10:05:00Z"
      }
    ]
    ```

#### `GET /users/<username>`

Retrieve details of a specific user by username.

*   **Request:** `GET /users/admin`
*   **Response (200 OK):**
    ```json
    {
      "id": "uuid-of-admin",
      "username": "admin",
      "email": "admin@example.com",
      "created_at": "2023-10-27T10:00:00Z"
    }
    ```
*   **Error (404 Not Found):** If user does not exist.

#### `GET /users/me`

Retrieve details of the authenticated user.

*   **Request:** `GET /users/me`
*   **Response (200 OK):** Returns the current authenticated user's details, same format as `GET /users/<username>`.

#### `PUT /users/<username>`

Update user details.

*   **Request:** `PUT /users/api_test_user`
    ```json
    {
      "email": "updated_email@example.com"
      // Password update logic would be more complex and usually a separate endpoint
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "message": "User updated successfully."
    }
    ```
*   **Error (400 Bad Request, 403 Forbidden, 404 Not Found):** E.g., trying to update another user without sufficient permissions, or user not found.

#### `DELETE /users/<username>`

Delete a user.

*   **Request:** `DELETE /users/api_test_user`
*   **Response (200 OK):**
    ```json
    {
      "message": "User deleted successfully."
    }
    ```
*   **Error (403 Forbidden, 404 Not Found):** E.g., insufficient permissions or user not found.

---

### 3. Metrics (Protected)

Requires JWT authentication.

#### `POST /metrics`

Ingest one or more performance metrics.

*   **Request:**
    ```json
    [
      {
        "metric_name": "system.cpu.usage",
        "value": 55.7,
        "timestamp": 1678886400000
      },
      {
        "metric_name": "app.request.latency",
        "value": 125.3,
        "timestamp": 1678886401500
      }
    ]
    ```
    *   `timestamp` should be a Unix timestamp in milliseconds.
*   **Response (200 OK):**
    ```json
    {
      "message": "Metrics ingested successfully."
    }
    ```
*   **Error (400 Bad Request):** Invalid JSON or missing required fields.

#### `GET /metrics/<metric_name>`

Retrieve raw data points for a specific metric.

*   **Path Parameters:**
    *   `metric_name`: The name of the metric (e.g., `system.cpu.usage`).
*   **Query Parameters:**
    *   `start` (optional): Start Unix timestamp (milliseconds). Default: 1 hour ago.
    *   `end` (optional): End Unix timestamp (milliseconds). Default: current time.
    *   `limit` (optional): Maximum number of data points to return. Default: 100.
*   **Request:** `GET /metrics/system.cpu.usage?start=1678885000000&end=1678887000000&limit=50`
*   **Response (200 OK):**
    ```json
    [
      {
        "metric_name": "system.cpu.usage",
        "value": 50.1,
        "timestamp": 1678886400000
      },
      {
        "metric_name": "system.cpu.usage",
        "value": 52.3,
        "timestamp": 1678886410000
      }
    ]
    ```
*   **Error (500 Internal Server Error):** Database or internal service error.

#### `GET /metrics/aggregate/<metric_name>`

Retrieve aggregated data points for a specific metric over a time range.

*   **Path Parameters:**
    *   `metric_name`: The name of the metric.
*   **Query Parameters:**
    *   `start` (optional): Start Unix timestamp (milliseconds). Default: 24 hours ago.
    *   `end` (optional): End Unix timestamp (milliseconds). Default: current time.
    *   `interval` (optional): Aggregation interval (e.g., `1m`, `5m`, `1h`, `1d`). Default: `1m`.
    *   `type` (optional): Aggregation type (`avg`, `min`, `max`, `sum`, `count`). Default: `avg`.
*   **Request:** `GET /metrics/aggregate/system.cpu.usage?start=1678800000000&end=1678886400000&interval=1h&type=avg`
*   **Response (200 OK):**
    ```json
    [
      {
        "timestamp": 1678800000000,
        "value": 45.2
      },
      {
        "timestamp": 1678803600000,
        "value": 51.8
      }
    ]
    ```
    *   `timestamp` represents the start of the aggregation interval.
*   **Error (400 Bad Request):** Invalid `interval` or `type` parameter.

#### `GET /metrics/available`

Retrieve a list of all unique metric names that have been ingested.

*   **Request:** `GET /metrics/available`
*   **Response (200 OK):**
    ```json
    [
      "system.cpu.usage",
      "system.memory.used_gb",
      "app.request.latency"
    ]
    ```

---
```