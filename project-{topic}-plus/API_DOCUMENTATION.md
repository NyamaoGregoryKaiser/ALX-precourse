# API Documentation: Task Management System

This document provides a comprehensive overview of the RESTful API for the Task Management System. It describes the available endpoints, request/response formats, authentication requirements, and error handling.

**Base URL**: `http://localhost:9080` (or `http://your-server-ip:9080` in deployment)

## Authentication

All protected endpoints require a JSON Web Token (JWT) provided in the `Authorization` header as a Bearer token.

**Header**: `Authorization: Bearer <JWT_TOKEN>`

### 1. Register User
Registers a new user account.

*   **Endpoint**: `POST /auth/register`
*   **Description**: Creates a new user with a username, password, and optional role.
*   **Request Body (JSON)**:
    ```json
    {
        "username": "unique_username",
        "password": "strong_password",
        "role": "user"  // Optional, default is "user". Can be "admin" if allowed by system.
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
        "status": "success",
        "message": "User registered successfully.",
        "user": {
            "id": 1,
            "username": "unique_username",
            "role": "user",
            "created_at": "2023-11-20T10:30:00+00:00",
            "updated_at": "2023-11-20T10:30:00+00:00"
        }
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid JSON or missing required fields (`username`, `password`). E.g., `{"status": "error", "message": "Username and password cannot be empty."}`
    *   `409 Conflict`: Username already exists. E.g., `{"status": "error", "message": "Username already taken."}`

### 2. Login User
Authenticates a user and returns a JWT token.

*   **Endpoint**: `POST /auth/login`
*   **Description**: Authenticates user credentials and issues a JWT token for subsequent API requests.
*   **Request Body (JSON)**:
    ```json
    {
        "username": "existing_username",
        "password": "user_password"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
        "status": "success",
        "message": "Login successful.",
        "token": "eyJhbGciOiJIUzI1Ni...",
        "expires_in": 3600 // Token valid for 1 hour (3600 seconds)
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid JSON or missing required fields (`username`, `password`).
    *   `401 Unauthorized`: Invalid credentials (username or password). E.g., `{"status": "error", "message": "Invalid credentials."}`

---

## Tasks

### 3. Get All Tasks
Retrieves a list of tasks.
*   **Endpoint**: `GET /tasks`
*   **Description**:
    *   **User**: Returns tasks owned by the authenticated user.
    *   **Admin**: Returns all tasks in the system.
*   **Authentication**: Required
*   **Success Response (200 OK)**:
    ```json
    {
        "status": "success",
        "data": [
            {
                "id": 1,
                "title": "Buy groceries",
                "description": "Milk, eggs, bread",
                "status": "pending",
                "due_date": "2023-12-31",
                "user_id": 1,
                "created_at": "2023-11-20T10:30:00+00:00",
                "updated_at": "2023-11-20T10:30:00+00:00"
            },
            {
                "id": 2,
                "title": "Clean house",
                "description": "Vacuum, mop, dust",
                "status": "in_progress",
                "due_date": "2023-11-25",
                "user_id": 1,
                "created_at": "2023-11-20T11:00:00+00:00",
                "updated_at": "2023-11-20T11:00:00+00:00"
            }
        ]
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Missing or invalid token.

### 4. Get Task by ID
Retrieves a single task by its ID.
*   **Endpoint**: `GET /tasks/:id`
*   **Description**: Returns details for a specific task.
*   **Authentication**: Required. Only the task owner or an admin can access.
*   **Path Parameters**:
    *   `id` (integer, required): The ID of the task to retrieve.
*   **Success Response (200 OK)**:
    ```json
    {
        "status": "success",
        "data": {
            "id": 1,
            "title": "Buy groceries",
            "description": "Milk, eggs, bread",
            "status": "pending",
            "due_date": "2023-12-31",
            "user_id": 1,
            "created_at": "2023-11-20T10:30:00+00:00",
            "updated_at": "2023-11-20T10:30:00+00:00"
        }
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid task ID format.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Authenticated user does not own the task and is not an admin.
    *   `404 Not Found`: Task with the specified ID does not exist.

### 5. Create Task
Creates a new task.
*   **Endpoint**: `POST /tasks`
*   **Description**: Creates a new task associated with the authenticated user.
*   **Authentication**: Required.
*   **Request Body (JSON)**:
    ```json
    {
        "title": "New Task Title",
        "description": "Detailed description of the task.",
        "status": "pending", // Optional, default is "pending". Can be "in_progress", "completed", "cancelled".
        "due_date": "2023-12-31" // YYYY-MM-DD format
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
        "status": "success",
        "message": "Task created successfully.",
        "task": {
            "id": 3,
            "title": "New Task Title",
            "description": "Detailed description of the task.",
            "status": "pending",
            "due_date": "2023-12-31",
            "user_id": 1,
            "created_at": "2023-11-20T12:00:00+00:00",
            "updated_at": "2023-11-20T12:00:00+00:00"
        }
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid JSON or missing required fields (`title`, `description`, `due_date`).
    *   `401 Unauthorized`: Missing or invalid token.

### 6. Update Task
Updates an existing task.
*   **Endpoint**: `PUT /tasks/:id`
*   **Description**: Modifies an existing task identified by its ID. Only provided fields will be updated.
*   **Authentication**: Required. Only the task owner or an admin can update.
*   **Path Parameters**:
    *   `id` (integer, required): The ID of the task to update.
*   **Request Body (JSON)**:
    ```json
    {
        "title": "Updated Task Title",       // Optional
        "description": "New description.",   // Optional
        "status": "completed",               // Optional
        "due_date": "2024-01-15"             // Optional
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
        "status": "success",
        "message": "Task updated successfully.",
        "task": {
            "id": 1,
            "title": "Updated Task Title",
            "description": "New description.",
            "status": "completed",
            "due_date": "2024-01-15",
            "user_id": 1,
            "created_at": "2023-11-20T10:30:00+00:00",
            "updated_at": "2023-11-20T13:00:00+00:00"
        }
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid JSON or invalid task ID format.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Authenticated user does not own the task and is not an admin.
    *   `404 Not Found`: Task with the specified ID does not exist.

### 7. Delete Task
Deletes an existing task.
*   **Endpoint**: `DELETE /tasks/:id`
*   **Description**: Removes a task from the system.
*   **Authentication**: Required. Only an **admin** user can delete tasks.
*   **Path Parameters**:
    *   `id` (integer, required): The ID of the task to delete.
*   **Success Response (200 OK)**:
    ```json
    {
        "status": "success",
        "message": "Task deleted successfully."
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid task ID format.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Authenticated user is not an admin.
    *   `404 Not Found`: Task with the specified ID does not exist.

---

## General Error Responses

The API uses a standardized JSON error response format:

```json
{
    "status": "error",
    "message": "Descriptive error message."
}
```

Common HTTP status codes for errors:

*   **`400 Bad Request`**: The server cannot process the request due to client error (e.g., malformed syntax, invalid request parameters).
*   **`401 Unauthorized`**: Authentication is required or has failed (e.g., missing or invalid JWT).
*   **`403 Forbidden`**: The client does not have permission to access the resource (e.g., insufficient role, rate limit exceeded).
*   **`404 Not Found`**: The requested resource could not be found.
*   **`405 Method Not Allowed`**: The HTTP method used is not supported for the resource.
*   **`409 Conflict`**: The request could not be completed due to a conflict with the current state of the resource (e.g., duplicate username).
*   **`429 Too Many Requests`**: The user has sent too many requests in a given amount of time (rate limiting).
*   **`500 Internal Server Error`**: An unexpected error occurred on the server.
```