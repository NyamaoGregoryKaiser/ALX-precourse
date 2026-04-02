```markdown
# API Documentation - Task Management System

This document outlines the RESTful API endpoints for the Task Management System.

**Base URL**: `http://localhost:18080` (or your deployment's base URL)

**Authentication**: All protected routes require a JSON Web Token (JWT) passed in the `Authorization` header as `Bearer [JWT_TOKEN]`.

---

## 1. Authentication Endpoints

### `POST /auth/register`

Registers a new user.

*   **Request Body**: `application/json`
    ```json
    {
        "username": "string",  // Required, unique
        "password": "string",  // Required, plain text, will be hashed
        "email": "string"      // Optional, unique
    }
    ```
*   **Responses**:
    *   `201 Created`:
        ```json
        {
            "message": "User registered successfully.",
            "user": {
                "id": 1,
                "username": "string",
                "email": "string",
                "role": "user",
                "created_at": "YYYY-MM-DD HH:MM:SS",
                "updated_at": "YYYY-MM-DD HH:MM:SS"
            }
        }
        ```
    *   `400 Bad Request`: Invalid input (e.g., missing username/password).
    *   `409 Conflict`: Username or email already exists.

### `POST /auth/login`

Authenticates a user and returns a JWT token.

*   **Request Body**: `application/json`
    ```json
    {
        "username": "string",  // Required
        "password": "string"   // Required, plain text
    }
    ```
*   **Responses**:
    *   `200 OK`:
        ```json
        {
            "message": "Login successful.",
            "user_id": 1,
            "username": "string",
            "role": "string", // "user" or "admin"
            "token": "string" // JWT token
        }
        ```
    *   `400 Bad Request`: Invalid input.
    *   `401 Unauthorized`: Invalid username or password.

### `GET /auth/me` (Protected)

Retrieves information about the currently authenticated user.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]`
*   **Responses**:
    *   `200 OK`:
        ```json
        {
            "id": 1,
            "username": "string",
            "email": "string",
            "role": "user",
            "created_at": "YYYY-MM-DD HH:MM:SS",
            "updated_at": "YYYY-MM-DD HH:MM:SS"
        }
        ```
    *   `401 Unauthorized`: Missing or invalid token.

---

## 2. User Endpoints

### `GET /users` (Protected, Admin Only)

Retrieves a list of all users.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]` (Admin token required)
*   **Query Parameters**:
    *   `limit`: Integer (default: 100)
    *   `offset`: Integer (default: 0)
*   **Responses**:
    *   `200 OK`: `[ { /* User Object */ }, ... ]` (Password hash omitted)
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an administrator.

### `GET /users/{id}` (Protected, Admin or Self)

Retrieves a user by ID.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]`
*   **Path Parameters**: `id` (integer, user ID)
*   **Responses**:
    *   `200 OK`: `{ /* User Object */ }` (Password hash omitted)
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not authorized to view this user (not admin and not self).
    *   `404 Not Found`: User not found.

### `PUT /users/{id}` (Protected, Admin or Self)

Updates a user's information.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]`
*   **Path Parameters**: `id` (integer, user ID)
*   **Request Body**: `application/json` (Fields are optional, only provided fields will be updated)
    ```json
    {
        "username": "string",
        "email": "string",
        "role": "string" // "user" or "admin", only modifiable by admin
    }
    ```
*   **Responses**:
    *   `200 OK`: `{ /* Updated User Object */ }`
    *   `400 Bad Request`: Invalid input.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not authorized to update this user, or attempting to change role without admin privileges.
    *   `404 Not Found`: User not found.
    *   `409 Conflict`: Username or email already exists.

### `PUT /users/{id}/change-password` (Protected, Admin or Self)

Changes a user's password.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]`
*   **Path Parameters**: `id` (integer, user ID)
*   **Request Body**: `application/json`
    ```json
    {
        "new_password": "string" // Required, plain text
    }
    ```
*   **Responses**:
    *   `200 OK`: `{"message": "Password updated successfully."}`
    *   `400 Bad Request`: Missing new password.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not authorized to change this user's password.
    *   `404 Not Found`: User not found.
    *   `422 Unprocessable Entity`: New password is empty.

### `DELETE /users/{id}` (Protected, Admin Only)

Deletes a user.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]` (Admin token required)
*   **Path Parameters**: `id` (integer, user ID)
*   **Responses**:
    *   `204 No Content`: User deleted successfully.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an administrator, or an admin attempting to delete their own account.
    *   `404 Not Found`: User not found.

---

## 3. Project Endpoints

### `POST /projects` (Protected)

Creates a new project. The authenticated user becomes the owner.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]`
*   **Request Body**: `application/json`
    ```json
    {
        "name": "string",       // Required
        "description": "string" // Optional
    }
    ```
*   **Responses**:
    *   `201 Created`: `{ /* Project Object */ }`
    *   `400 Bad Request`: Invalid input (e.g., missing name).
    *   `401 Unauthorized`: Missing or invalid token.

### `GET /projects` (Protected)

Retrieves a list of projects. Admins see all projects; regular users see projects they own.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]`
*   **Query Parameters**:
    *   `limit`: Integer (default: 100)
    *   `offset`: Integer (default: 0)
*   **Responses**:
    *   `200 OK`: `[ { /* Project Object */ }, ... ]`
    *   `401 Unauthorized`: Missing or invalid token.

### `GET /projects/{id}` (Protected)

Retrieves a project by ID.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]`
*   **Path Parameters**: `id` (integer, project ID)
*   **Responses**:
    *   `200 OK`: `{ /* Project Object */ }`
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not authorized to view this project (not admin and not owner).
    *   `404 Not Found`: Project not found.

### `PUT /projects/{id}` (Protected)

Updates a project's information.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]`
*   **Path Parameters**: `id` (integer, project ID)
*   **Request Body**: `application/json` (Fields are optional)
    ```json
    {
        "name": "string",
        "description": "string",
        "owner_id": 1 // Only modifiable by admin
    }
    ```
*   **Responses**:
    *   `200 OK`: `{ /* Updated Project Object */ }`
    *   `400 Bad Request`: Invalid input, or `owner_id` doesn't exist.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not authorized to update this project, or attempting to change `owner_id` without admin privileges.
    *   `404 Not Found`: Project not found.

### `DELETE /projects/{id}` (Protected)

Deletes a project.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]`
*   **Path Parameters**: `id` (integer, project ID)
*   **Responses**:
    *   `204 No Content`: Project deleted successfully.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not authorized to delete this project (not admin and not owner).
    *   `404 Not Found`: Project not found.

---

## 4. Task Endpoints

### `POST /tasks` (Protected)

Creates a new task within a project.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]`
*   **Request Body**: `application/json`
    ```json
    {
        "title": "string",              // Required
        "description": "string",        // Optional
        "status": "TODO|IN_PROGRESS|DONE|CANCELLED", // Optional, default "TODO"
        "priority": "LOW|MEDIUM|HIGH",  // Optional, default "MEDIUM"
        "due_date": "YYYY-MM-DD HH:MM:SS", // Optional
        "project_id": 1,                // Required, must exist and user must have access
        "assigned_to": 1                // Optional, user ID, must exist
    }
    ```
*   **Responses**:
    *   `201 Created`: `{ /* Task Object */ }`
    *   `400 Bad Request`: Invalid input (e.g., missing title, invalid project_id/assigned_to).
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User not authorized to create tasks in the specified project.

### `GET /tasks` (Protected)

Retrieves a list of tasks. Admins see all tasks; regular users see tasks from projects they own or tasks assigned to them.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]`
*   **Query Parameters**:
    *   `limit`: Integer (default: 100)
    *   `offset`: Integer (default: 0)
*   **Responses**:
    *   `200 OK`: `[ { /* Task Object */ }, ... ]`
    *   `401 Unauthorized`: Missing or invalid token.

### `GET /tasks/{id}` (Protected)

Retrieves a task by ID.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]`
*   **Path Parameters**: `id` (integer, task ID)
*   **Responses**:
    *   `200 OK`: `{ /* Task Object */ }`
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not authorized to view this task (not admin, not project owner, not assigned user).
    *   `404 Not Found`: Task not found.

### `PUT /tasks/{id}` (Protected)

Updates a task's information.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]`
*   **Path Parameters**: `id` (integer, task ID)
*   **Request Body**: `application/json` (Fields are optional)
    ```json
    {
        "title": "string",
        "description": "string",
        "status": "TODO|IN_PROGRESS|DONE|CANCELLED",
        "priority": "LOW|MEDIUM|HIGH",
        "due_date": "YYYY-MM-DD HH:MM:SS",
        "project_id": 1,      // Changing project_id requires project owner or admin privileges
        "assigned_to": 1      // Re-assigning requires project owner or admin privileges
    }
    ```
*   **Responses**:
    *   `200 OK`: `{ /* Updated Task Object */ }`
    *   `400 Bad Request`: Invalid input, or `project_id`/`assigned_to` doesn't exist.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not authorized to update this task, or attempting to change `project_id`/`assigned_to` without sufficient privileges.
    *   `404 Not Found`: Task not found.

### `DELETE /tasks/{id}` (Protected)

Deletes a task.

*   **Request Headers**: `Authorization: Bearer [JWT_TOKEN]`
*   **Path Parameters**: `id` (integer, task ID)
*   **Responses**:
    *   `204 No Content`: Task deleted successfully.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not authorized to delete this task (not admin and not project owner).
    *   `404 Not Found`: Task not found.

---
```