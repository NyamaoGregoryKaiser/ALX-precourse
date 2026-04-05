```markdown
# Task Management System API Documentation

This document describes the RESTful API endpoints for the Task Management System.

## Base URL

`http://localhost:18080` (or your configured application host/port)

## Authentication

All protected endpoints require a JSON Web Token (JWT) provided in the `Authorization` header as a Bearer token.

**Header Example:**
`Authorization: Bearer <YOUR_JWT_TOKEN>`

## Error Responses

All error responses follow a consistent JSON structure:

```json
{
  "status": "error",
  "message": "Descriptive error message",
  "code": 400, // HTTP Status Code
  "details": "Optional details about the error"
}
```

## Endpoints

---

### 1. Health Check

**`GET /health`**

*   **Description:** Checks the API's operational status.
*   **Authentication:** None required.
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "message": "API is healthy"
    }
    ```

---

### 2. User Authentication

#### `POST /auth/register`

*   **Description:** Registers a new user.
*   **Authentication:** None required.
*   **Request Body:**
    ```json
    {
      "username": "newuser",
      "password": "strongpassword123",
      "email": "newuser@example.com"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "status": "success",
      "message": "User registered successfully",
      "user_id": 1
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing/invalid fields, username/email already taken.

#### `POST /auth/login`

*   **Description:** Authenticates a user and returns a JWT.
*   **Authentication:** None required.
*   **Request Body:**
    ```json
    {
      "username": "existinguser",
      "password": "strongpassword123"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "message": "Login successful",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": 1,
        "username": "existinguser",
        "email": "existinguser@example.com",
        "role": "user"
      }
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid credentials.

---

### 3. User Management

#### `GET /api/v1/users/me`

*   **Description:** Retrieves the profile of the authenticated user.
*   **Authentication:** Required (User or Admin role).
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "user": {
        "id": 1,
        "username": "currentuser",
        "email": "currentuser@example.com",
        "role": "user",
        "created_at": "2023-10-27 10:00:00",
        "updated_at": "2023-10-27 10:00:00"
      }
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No/invalid token.

#### `PUT /api/v1/users/me`

*   **Description:** Updates the profile of the authenticated user.
*   **Authentication:** Required (User or Admin role).
*   **Request Body (Partial update allowed):**
    ```json
    {
      "email": "updated@example.com",
      "password": "newstrongpassword"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "message": "User profile updated successfully"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid fields.
    *   `401 Unauthorized`: No/invalid token.

#### `DELETE /api/v1/users/me`

*   **Description:** Deletes the authenticated user's account. This will also delete all associated tasks.
*   **Authentication:** Required (User or Admin role).
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "message": "User account deleted successfully"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No/invalid token.

#### `GET /api/v1/users` (Admin Only)

*   **Description:** Retrieves a list of all users.
*   **Authentication:** Required (Admin role only).
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "users": [
        {
          "id": 1,
          "username": "admin",
          "email": "admin@example.com",
          "role": "admin"
        },
        {
          "id": 2,
          "username": "user1",
          "email": "user1@example.com",
          "role": "user"
        }
      ]
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No/invalid token.
    *   `403 Forbidden`: User is not an admin.

---

### 4. Task Management

#### `POST /api/v1/tasks`

*   **Description:** Creates a new task for the authenticated user.
*   **Authentication:** Required (User or Admin role).
*   **Request Body:**
    ```json
    {
      "title": "Buy groceries",
      "description": "Milk, eggs, bread",
      "status": "pending"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "status": "success",
      "message": "Task created successfully",
      "task_id": 1
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing/invalid fields.
    *   `401 Unauthorized`: No/invalid token.

#### `GET /api/v1/tasks`

*   **Description:** Retrieves all tasks for the authenticated user. Admin users can optionally view all tasks by providing `?all=true`.
*   **Authentication:** Required (User or Admin role).
*   **Query Parameters (for Admin):**
    *   `all`: `true` to retrieve all tasks across all users (Admin only).
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "tasks": [
        {
          "id": 1,
          "user_id": 1,
          "title": "Buy groceries",
          "description": "Milk, eggs, bread",
          "status": "pending",
          "created_at": "2023-10-27 11:00:00",
          "updated_at": "2023-10-27 11:00:00"
        },
        {
          "id": 2,
          "user_id": 1,
          "title": "Finish report",
          "description": null,
          "status": "in_progress",
          "created_at": "2023-10-27 11:30:00",
          "updated_at": "2023-10-27 11:30:00"
        }
      ]
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No/invalid token.
    *   `403 Forbidden`: Non-admin trying to access `?all=true`.

#### `GET /api/v1/tasks/{task_id}`

*   **Description:** Retrieves a specific task by ID.
*   **Authentication:** Required (User or Admin role). Only task owner or Admin can access.
*   **Path Parameters:**
    *   `task_id`: The ID of the task.
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "task": {
        "id": 1,
        "user_id": 1,
        "title": "Buy groceries",
        "description": "Milk, eggs, bread",
        "status": "pending",
        "created_at": "2023-10-27 11:00:00",
        "updated_at": "2023-10-27 11:00:00"
      }
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No/invalid token.
    *   `403 Forbidden`: User not authorized to view this task.
    *   `404 Not Found`: Task with `task_id` not found.

#### `PUT /api/v1/tasks/{task_id}`

*   **Description:** Updates a specific task by ID.
*   **Authentication:** Required (User or Admin role). Only task owner or Admin can modify.
*   **Path Parameters:**
    *   `task_id`: The ID of the task.
*   **Request Body (Partial update allowed):**
    ```json
    {
      "title": "Buy organic groceries",
      "status": "completed"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "message": "Task updated successfully"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid fields.
    *   `401 Unauthorized`: No/invalid token.
    *   `403 Forbidden`: User not authorized to modify this task.
    *   `404 Not Found`: Task with `task_id` not found.

#### `DELETE /api/v1/tasks/{task_id}`

*   **Description:** Deletes a specific task by ID.
*   **Authentication:** Required (User or Admin role). Only task owner or Admin can delete.
*   **Path Parameters:**
    *   `task_id`: The ID of the task.
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "message": "Task deleted successfully"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No/invalid token.
    *   `403 Forbidden`: User not authorized to delete this task.
    *   `404 Not Found`: Task with `task_id` not found.
```