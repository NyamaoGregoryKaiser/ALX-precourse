```markdown
# Mobile Backend API Documentation

This document describes the RESTful API endpoints for the Mobile App Backend.

## Base URL

`http://localhost:18080` (or your deployed server URL)

## Authentication

This API uses JWT (JSON Web Tokens) for authentication.

1.  **Register** or **Login** to get a JWT token.
2.  Include this token in the `Authorization` header of all subsequent authenticated requests:
    `Authorization: Bearer <YOUR_JWT_TOKEN>`

## Error Responses

All error responses will have a JSON structure similar to:

```json
{
  "error": "Descriptive error message",
  "status": 400,
  "details": "Optional additional details about the error"
}
```

Possible HTTP status codes for errors:

*   `400 Bad Request`: Invalid input, missing parameters, or business logic validation failure.
*   `401 Unauthorized`: Missing or invalid JWT token.
*   `403 Forbidden`: Authenticated, but not authorized to access the resource.
*   `404 Not Found`: The requested resource does not exist.
*   `429 Too Many Requests`: Rate limit exceeded.
*   `500 Internal Server Error`: An unexpected server-side error occurred.

---

## 1. Authentication Endpoints

### 1.1. Register User

`POST /auth/register`

Registers a new user account.

**Request Body (JSON)**:

```json
{
  "username": "your_username",
  "email": "your_email@example.com",
  "password": "your_strong_password"
}
```

**Response (201 Created)**:

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "your_username",
    "email": "your_email@example.com",
    "created_at": "2023-10-27 10:00:00"
  }
}
```

**Error Responses**:

*   `400 Bad Request`:
    *   `Missing username, email, or password in request.`
    *   `Username, email, and password cannot be empty.`
    *   `Password must be at least 6 characters long.`
    *   `Username or email already registered.`

### 1.2. Login User

`POST /auth/login`

Authenticates a user and returns a JWT token.

**Request Body (JSON)**:

```json
{
  "identifier": "your_username_or_email",
  "password": "your_password"
}
```

**Response (200 OK)**:

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1Ni..."
}
```

**Error Responses**:

*   `400 Bad Request`: `Missing identifier (username/email) or password in request.`
*   `401 Unauthorized`: `Invalid credentials.`
    *   Also for `Authentication failed: could not generate token.` if JWT secret is invalid.

---

## 2. User Endpoints (Authenticated)

These endpoints require a valid JWT token in the `Authorization: Bearer <token>` header.

### 2.1. Get User Profile

`GET /users/me`

Retrieves the profile of the authenticated user.

**Request**: (No body)

**Response (200 OK)**:

```json
{
  "message": "User profile retrieved successfully.",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "created_at": "2023-10-27 10:00:00"
  }
}
```

**Error Responses**:

*   `401 Unauthorized`
*   `404 Not Found`: `User not found.` (Shouldn't happen for authenticated user but possible if data is corrupted)

### 2.2. Update User Profile

`PATCH /users/me`

Updates the username or email of the authenticated user. At least one field is required.

**Request Body (JSON)**:

```json
{
  "username": "new_username",
  "email": "new_email@example.com"
}
```
*(You can provide one or both fields)*

**Response (200 OK)**:

```json
{
  "message": "User profile updated successfully.",
  "user": {
    "id": 1,
    "username": "new_username",
    "email": "new_email@example.com",
    "created_at": "2023-10-27 10:00:00"
  }
}
```

**Error Responses**:

*   `400 Bad Request`:
    *   `No valid fields provided for update (username or email required).`
    *   `Username already taken.`
    *   `Email already taken.`
*   `401 Unauthorized`

### 2.3. Update User Password

`PATCH /users/me/password`

Updates the password of the authenticated user.

**Request Body (JSON)**:

```json
{
  "new_password": "your_new_strong_password"
}
```

**Response (200 OK)**:

```json
{
  "message": "Password updated successfully."
}
```

**Error Responses**:

*   `400 Bad Request`:
    *   `Missing 'new_password' in request.`
    *   `New password must be at least 6 characters long.`
*   `401 Unauthorized`

### 2.4. Delete User Account

`DELETE /users/me`

Deletes the authenticated user's account and all associated data (e.g., tasks).

**Request**: (No body)

**Response (200 OK)**:

```json
{
  "message": "User account deleted successfully."
}
```

**Error Responses**:

*   `401 Unauthorized`
*   `404 Not Found`: `User not found.` (Shouldn't happen for authenticated user)

---

## 3. Task Endpoints (Authenticated)

These endpoints require a valid JWT token in the `Authorization: Bearer <token>` header.

### 3.1. Create Task

`POST /tasks`

Creates a new task for the authenticated user.

**Request Body (JSON)**:

```json
{
  "title": "My new task",
  "description": "This is a detailed description of my task."
}
```
*`description` is optional.*

**Response (201 Created)**:

```json
{
  "message": "Task created successfully.",
  "task": {
    "id": 1,
    "user_id": 1,
    "title": "My new task",
    "description": "This is a detailed description of my task.",
    "completed": false,
    "created_at": "2023-10-27 10:00:00",
    "updated_at": "2023-10-27 10:00:00"
  }
}
```

**Error Responses**:

*   `400 Bad Request`:
    *   `Missing 'title' in request for task creation.`
    *   `Task title cannot be empty.`
*   `401 Unauthorized`

### 3.2. Get Task by ID

`GET /tasks/{task_id}`

Retrieves a specific task by its ID. The task must belong to the authenticated user.

**Path Parameters**:

*   `task_id` (integer): The ID of the task.

**Request**: (No body)

**Response (200 OK)**:

```json
{
  "message": "Task retrieved successfully.",
  "task": {
    "id": 1,
    "user_id": 1,
    "title": "My new task",
    "description": "This is a detailed description of my task.",
    "completed": false,
    "created_at": "2023-10-27 10:00:00",
    "updated_at": "2023-10-27 10:00:00"
  }
}
```

**Error Responses**:

*   `400 Bad Request`: `Invalid task ID.`
*   `401 Unauthorized`
*   `404 Not Found`: `Task not found or does not belong to the user.`

### 3.3. Get All Tasks

`GET /tasks`

Retrieves all tasks for the authenticated user.

**Query Parameters (Optional)**:

*   `completed` (boolean/integer): Filters tasks by their completion status.
    *   `true` or `1`: Returns only completed tasks.
    *   `false` or `0`: Returns only incomplete tasks.

**Example**: `GET /tasks?completed=true`

**Request**: (No body)

**Response (200 OK)**:

```json
{
  "message": "Tasks retrieved successfully.",
  "tasks": [
    {
      "id": 2,
      "user_id": 1,
      "title": "Another task",
      "description": "Done!",
      "completed": true,
      "created_at": "2023-10-27 10:05:00",
      "updated_at": "2023-10-27 10:05:00"
    },
    {
      "id": 1,
      "user_id": 1,
      "title": "My new task",
      "description": "This is a detailed description of my task.",
      "completed": false,
      "created_at": "2023-10-27 10:00:00",
      "updated_at": "2023-10-27 10:00:00"
    }
  ]
}
```
*(Tasks are typically returned in reverse chronological order of creation.)*

**Error Responses**:

*   `400 Bad Request`: `Invalid value for 'completed' query parameter. Use 'true'/'false' or '1'/'0'.`
*   `401 Unauthorized`

### 3.4. Update Task

`PATCH /tasks/{task_id}`

Updates an existing task. The task must belong to the authenticated user. At least one field is required.

**Path Parameters**:

*   `task_id` (integer): The ID of the task to update.

**Request Body (JSON)**:

```json
{
  "title": "Updated task title",
  "description": "New description.",
  "completed": true
}
```
*(You can provide one or more fields)*

**Response (200 OK)**:

```json
{
  "message": "Task updated successfully.",
  "task": {
    "id": 1,
    "user_id": 1,
    "title": "Updated task title",
    "description": "New description.",
    "completed": true,
    "created_at": "2023-10-27 10:00:00",
    "updated_at": "2023-10-27 10:15:00"
  }
}
```

**Error Responses**:

*   `400 Bad Request`:
    *   `Invalid task ID.`
    *   `No valid fields provided for task update (title, description, or completed required).`
    *   `Task title cannot be empty.`
*   `401 Unauthorized`
*   `404 Not Found`: `Task not found or does not belong to the user.`

### 3.5. Delete Task

`DELETE /tasks/{task_id}`

Deletes a task. The task must belong to the authenticated user.

**Path Parameters**:

*   `task_id` (integer): The ID of the task to delete.

**Request**: (No body)

**Response (200 OK)**:

```json
{
  "message": "Task deleted successfully."
}
```

**Error Responses**:

*   `400 Bad Request`: `Invalid task ID.`
*   `401 Unauthorized`
*   `404 Not Found`: `Task not found or does not belong to the user.`
```