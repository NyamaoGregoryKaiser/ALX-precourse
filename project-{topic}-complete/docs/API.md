```markdown
# DB-Optimizer: API Documentation

This document describes the RESTful API endpoints for the DB-Optimizer application.
The API follows standard REST principles, uses JSON for request and response bodies, and employs JWT for authentication.

**Base URL:** `http://localhost:8080` (or your configured server host/port)

## Authentication

### 1. Register User
Registers a new user with the DB-Optimizer system.
- **URL:** `/auth/register`
- **Method:** `POST`
- **Request Body:**
  ```json
  {
    "username": "newuser",
    "email": "user@example.com",
    "password": "strongpassword123",
    "role": "user" // or "admin"
  }
  ```
- **Responses:**
  - `201 Created`:
    ```json
    {
      "message": "User registered successfully",
      "user_id": 1
    }
    ```
  - `400 Bad Request`: If required fields are missing or invalid.
  - `409 Conflict`: If email or username already exists.
  - `500 Internal Server Error`

### 2. Login User
Authenticates a user and returns a JWT access token.
- **URL:** `/auth/login`
- **Method:** `POST`
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "strongpassword123"
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "token": "eyJhbGciOiJIUzI1Ni...",
      "expires_in_minutes": 60
    }
    ```
  - `401 Unauthorized`: If email or password is incorrect.
  - `500 Internal Server Error`

---

## User Management (Requires Authentication & Admin Role for some endpoints)

**Authentication Header:** `Authorization: Bearer <JWT_TOKEN>`

### 3. Get All Users
Retrieves a list of all registered users.
- **URL:** `/users`
- **Method:** `GET`
- **Authentication:** Required (Admin role)
- **Responses:**
  - `200 OK`:
    ```json
    [
      {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "role": "admin",
        "created_at": "2023-10-27T10:00:00Z"
      },
      {
        "id": 2,
        "username": "devuser",
        "email": "dev@example.com",
        "role": "user",
        "created_at": "2023-10-27T10:05:00Z"
      }
    ]
    ```
  - `401 Unauthorized`: If no token or invalid token.
  - `403 Forbidden`: If user does not have 'admin' role.
  - `500 Internal Server Error`

### 4. Get User By ID
Retrieves details of a specific user.
- **URL:** `/users/{id}`
- **Method:** `GET`
- **Authentication:** Required (User can view their own, Admin can view any)
- **Path Parameters:**
  - `id` (integer): The ID of the user.
- **Responses:**
  - `200 OK`:
    ```json
    {
      "id": 2,
      "username": "devuser",
      "email": "dev@example.com",
      "role": "user",
      "created_at": "2023-10-27T10:05:00Z"
    }
    ```
  - `401 Unauthorized`
  - `403 Forbidden`
  - `404 Not Found`: If user with `id` does not exist.
  - `500 Internal Server Error`

### 5. Update User (Admin only for role, user can update self)
Updates details of a specific user.
- **URL:** `/users/{id}`
- **Method:** `PUT`
- **Authentication:** Required (User can update their own username/password, Admin can update any field including role)
- **Path Parameters:**
  - `id` (integer): The ID of the user.
- **Request Body:**
  ```json
  {
    "username": "updated_devuser",
    "email": "updated_dev@example.com",
    "password": "newstrongpassword",
    "role": "admin" // Only admin can change roles
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "message": "User updated successfully"
    }
    ```
  - `400 Bad Request`
  - `401 Unauthorized`
  - `403 Forbidden`
  - `404 Not Found`
  - `500 Internal Server Error`

### 6. Delete User (Admin only)
Deletes a specific user.
- **URL:** `/users/{id}`
- **Method:** `DELETE`
- **Authentication:** Required (Admin role)
- **Path Parameters:**
  - `id` (integer): The ID of the user.
- **Responses:**
  - `200 OK`:
    ```json
    {
      "message": "User deleted successfully"
    }
    ```
  - `401 Unauthorized`
  - `403 Forbidden`
  - `404 Not Found`
  - `500 Internal Server Error`

---

## Monitored Databases (Requires Authentication)

**Authentication Header:** `Authorization: Bearer <JWT_TOKEN>`

### 7. Add Monitored Database
Registers a new external database to be monitored.
- **URL:** `/monitored-dbs`
- **Method:** `POST`
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "name": "Production E-commerce DB",
    "db_type": "PostgreSQL",
    "host": "my-prod-db.example.com",
    "port": 5432,
    "db_name": "ecommerce_db",
    "db_user": "monitor_user",
    "db_password": "secure_db_password"
  }
  ```
  **Note:** In a real production system, `db_password` should be handled via a secure secrets management system, not passed in plain text.
- **Responses:**
  - `201 Created`:
    ```json
    {
      "id": 1,
      "message": "Monitored database added successfully"
    }
    ```
  - `400 Bad Request`
  - `401 Unauthorized`
  - `500 Internal Server Error`

### 8. Get All Monitored Databases
Retrieves a list of all databases registered for monitoring by the authenticated user.
- **URL:** `/monitored-dbs`
- **Method:** `GET`
- **Authentication:** Required
- **Responses:**
  - `200 OK`:
    ```json
    [
      {
        "id": 1,
        "user_id": 2,
        "name": "Production E-commerce DB",
        "db_type": "PostgreSQL",
        "host": "my-prod-db.example.com",
        "port": 5432,
        "db_name": "ecommerce_db",
        "db_user": "monitor_user",
        "created_at": "2023-10-27T11:00:00Z"
      }
    ]
    ```
  - `401 Unauthorized`
  - `500 Internal Server Error`

### 9. Get Monitored Database By ID
Retrieves details of a specific monitored database.
- **URL:** `/monitored-dbs/{id}`
- **Method:** `GET`
- **Authentication:** Required (User can only view their own monitored DBs, Admin can view any)
- **Path Parameters:**
  - `id` (integer): The ID of the monitored database.
- **Responses:**
  - `200 OK`: (Same as above, for a single DB)
  - `401 Unauthorized`
  - `403 Forbidden`
  - `404 Not Found`
  - `500 Internal Server Error`

### 10. Update Monitored Database
Updates details of a specific monitored database.
- **URL:** `/monitored-dbs/{id}`
- **Method:** `PUT`
- **Authentication:** Required (User can only update their own monitored DBs, Admin can update any)
- **Path Parameters:**
  - `id` (integer): The ID of the monitored database.
- **Request Body:** (Partial updates are supported)
  ```json
  {
    "name": "Updated E-commerce DB Name",
    "db_password": "new_secure_password"
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "message": "Monitored database updated successfully"
    }
    ```
  - `400 Bad Request`
  - `401 Unauthorized`
  - `403 Forbidden`
  - `404 Not Found`
  - `500 Internal Server Error`

### 11. Delete Monitored Database
Deletes a specific monitored database entry.
- **URL:** `/monitored-dbs/{id}`
- **Method:** `DELETE`
- **Authentication:** Required (User can only delete their own monitored DBs, Admin can delete any)
- **Path Parameters:**
  - `id` (integer): The ID of the monitored database.
- **Responses:**
  - `200 OK`:
    ```json
    {
      "message": "Monitored database deleted successfully"
    }
    ```
  - `401 Unauthorized`
  - `403 Forbidden`
  - `404 Not Found`
  - `500 Internal Server Error`

### 12. Trigger Manual Analysis
Triggers an immediate analysis cycle for a specific monitored database. (Normally runs on a schedule).
- **URL:** `/monitored-dbs/{id}/analyze`
- **Method:** `POST`
- **Authentication:** Required
- **Path Parameters:**
  - `id` (integer): The ID of the monitored database.
- **Responses:**
  - `200 OK`:
    ```json
    {
      "message": "Analysis triggered successfully for database ID 1"
    }
    ```
  - `401 Unauthorized`
  - `403 Forbidden`
  - `404 Not Found`
  - `500 Internal Server Error`

---

## Optimization Reports (Requires Authentication)

**Authentication Header:** `Authorization: Bearer <JWT_TOKEN>`

### 13. Get Optimization Reports
Retrieves all optimization reports for a specific monitored database.
- **URL:** `/monitored-dbs/{db_id}/optimization-reports`
- **Method:** `GET`
- **Authentication:** Required (User can only view reports for their own monitored DBs, Admin can view any)
- **Path Parameters:**
  - `db_id` (integer): The ID of the monitored database.
- **Responses:**
  - `200 OK`:
    ```json
    [
      {
        "id": 101,
        "monitored_db_id": 1,
        "report_type": "Index Recommendation",
        "recommendation": "CREATE INDEX idx_products_category_id ON products (category_id);",
        "details": {
          "query_sample": "SELECT * FROM products WHERE category_id = 1",
          "reason": "Sequential scan detected on products table for category_id filter."
        },
        "generated_at": "2023-10-27T11:30:00Z",
        "status": "pending"
      },
      {
        "id": 102,
        "monitored_db_id": 1,
        "report_type": "Query Rewrite Suggestion",
        "recommendation": "Consider rewriting large IN clauses as JOINs or temporary tables.",
        "details": {
          "query_sample": "SELECT * FROM orders WHERE user_id IN (large_list_of_ids)",
          "reason": "Inefficient IN clause with many values causing planner overhead."
        },
        "generated_at": "2023-10-27T11:45:00Z",
        "status": "pending"
      }
    ]
    ```
  - `401 Unauthorized`
  - `403 Forbidden`
  - `404 Not Found`
  - `500 Internal Server Error`

---

## Health Check

### 14. Health Check
Checks the status of the API server.
- **URL:** `/health`
- **Method:** `GET`
- **Authentication:** None
- **Responses:**
  - `200 OK`:
    ```json
    {
      "status": "UP"
    }
    ```
  - `500 Internal Server Error`

---
```