# Task Manager System API Documentation (v1)

This document describes the RESTful API endpoints for the Task Manager System.

## Base URL

`http://localhost:8080/api/v1` (replace `localhost:8080` with your deployed domain)

## Authentication

All protected endpoints require a JSON Web Token (JWT) provided in the `Authorization` header as a Bearer token.

`Authorization: Bearer <your_jwt_token>`

### 1. Register User

`POST /auth/register`

Creates a new user account.

**Request Body:**
```json
{
  "username": "string",  // Unique username
  "email": "string",     // Unique email
  "password": "string"   // Minimum 8 characters, strong password recommended
}
```

**Response (200 OK):**
```json
{
  "message": "User registered successfully."
}
```

**Error Responses:**
*   `400 Bad Request`: Invalid input (e.g., missing fields, weak password).
*   `409 Conflict`: Username or email already exists.
*   `500 Internal Server Error`: Server-side error.

### 2. Login User

`POST /auth/login`

Authenticates a user and returns a JWT.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful.",
  "token": "string" // JWT token to be used for authorized requests
}
```

**Error Responses:**
*   `400 Bad Request`: Missing username/password.
*   `401 Unauthorized`: Invalid username or password.
*   `500 Internal Server Error`: Server-side error.

## Users

### 1. Get All Users (Admin Only)

`GET /users`

Retrieves a list of all registered users. Requires `admin` role.

**Headers:**
*   `Authorization: Bearer <your_jwt_token>`

**Response (200 OK):**
```json
[
  {
    "id": "string",
    "username": "string",
    "email": "string",
    "role": "string", // e.g., "user", "admin"
    "created_at": "string" // ISO 8601 datetime
  }
  // ... more users
]
```

**Error Responses:**
*   `401 Unauthorized`: Missing or invalid JWT.
*   `403 Forbidden`: User does not have `admin` role.
*   `500 Internal Server Error`: Server-side error.

### 2. Get User by ID

`GET /users/{id}`

Retrieves details of a specific user. Requires `admin` role or the `id` must match the authenticated user's ID.

**Path Parameters:**
*   `id` (string): The ID of the user.

**Headers:**
*   `Authorization: Bearer <your_jwt_token>`

**Response (200 OK):**
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "role": "string",
  "created_at": "string"
}
```

**Error Responses:**
*   `401 Unauthorized`: Missing or invalid JWT.
*   `403 Forbidden`: User not authorized to view this user's details.
*   `404 Not Found`: User with the given ID does not exist.
*   `500 Internal Server Error`: Server-side error.

### 3. Update User (Admin Only or Self)

`PUT /users/{id}`

Updates details of a specific user. Requires `admin` role or the `id` must match the authenticated user's ID. Non-admin users can only update their own username and email. Admin users can update username, email, and role. Password updates are via a separate endpoint for security.

**Path Parameters:**
*   `id` (string): The ID of the user to update.

**Headers:**
*   `Authorization: Bearer <your_jwt_token>`

**Request Body:**
```json
{
  "username": "string", // Optional
  "email": "string",    // Optional
  "role": "string"      // Optional, only for admin
}
```

**Response (200 OK):**
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "role": "string",
  "created_at": "string"
}
```

**Error Responses:**
*   `400 Bad Request`: Invalid input (e.g., username/email conflict, invalid role).
*   `401 Unauthorized`: Missing or invalid JWT.
*   `403 Forbidden`: User not authorized to update this user or specific fields.
*   `404 Not Found`: User with the given ID does not exist.
*   `500 Internal Server Error`: Server-side error.

### 4. Delete User (Admin Only)

`DELETE /users/{id}`

Deletes a user account. Requires `admin` role.

**Path Parameters:**
*   `id` (string): The ID of the user to delete.

**Headers:**
*   `Authorization: Bearer <your_jwt_token>`

**Response (200 OK):**
```json
{
  "message": "User deleted successfully."
}
```

**Error Responses:**
*   `401 Unauthorized`: Missing or invalid JWT.
*   `403 Forbidden`: User does not have `admin` role.
*   `404 Not Found`: User with the given ID does not exist.
*   `500 Internal Server Error`: Server-side error.

## Tasks

### 1. Create Task

`POST /tasks`

Creates a new task.

**Headers:**
*   `Authorization: Bearer <your_jwt_token>`

**Request Body:**
```json
{
  "title": "string",          // Required
  "description": "string",    // Optional
  "status": "string",         // Optional, default "TODO" (e.g., "TODO", "IN_PROGRESS", "DONE")
  "priority": "string",       // Optional, default "Medium" (e.g., "Low", "Medium", "High")
  "due_date": "string",       // Optional, ISO 8601 date (e.g., "2023-12-31")
  "assigned_to": "string"     // Optional, user ID. Must be an existing user.
}
```

**Response (200 OK):**
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "status": "string",
  "priority": "string",
  "due_date": "string",
  "assigned_to": "string",
  "created_by": "string",
  "created_at": "string",
  "updated_at": "string"
}
```

**Error Responses:**
*   `400 Bad Request`: Invalid input (e.g., missing title, invalid user ID for `assigned_to`).
*   `401 Unauthorized`: Missing or invalid JWT.
*   `500 Internal Server Error`: Server-side error.

### 2. Get All Tasks

`GET /tasks`

Retrieves a list of all tasks.
Optionally filters by `assigned_to` and `status`.

**Headers:**
*   `Authorization: Bearer <your_jwt_token>`

**Query Parameters:**
*   `assigned_to` (string, optional): Filter tasks assigned to a specific user ID.
*   `status` (string, optional): Filter tasks by status (e.g., "TODO", "IN_PROGRESS").

**Response (200 OK):**
```json
[
  {
    "id": "string",
    "title": "string",
    "description": "string",
    "status": "string",
    "priority": "string",
    "due_date": "string",
    "assigned_to": "string",
    "created_by": "string",
    "created_at": "string",
    "updated_at": "string"
  }
  // ... more tasks
]
```

**Error Responses:**
*   `401 Unauthorized`: Missing or invalid JWT.
*   `500 Internal Server Error`: Server-side error.

### 3. Get Task by ID

`GET /tasks/{id}`

Retrieves details of a specific task.

**Path Parameters:**
*   `id` (string): The ID of the task.

**Headers:**
*   `Authorization: Bearer <your_jwt_token>`

**Response (200 OK):**
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "status": "string",
  "priority": "string",
  "due_date": "string",
  "assigned_to": "string",
  "created_by": "string",
  "created_at": "string",
  "updated_at": "string"
}
```

**Error Responses:**
*   `401 Unauthorized`: Missing or invalid JWT.
*   `404 Not Found`: Task with the given ID does not exist.
*   `500 Internal Server Error`: Server-side error.

### 4. Update Task

`PUT /tasks/{id}`

Updates details of a specific task. Only the `created_by` user or an `admin` can update a task.

**Path Parameters:**
*   `id` (string): The ID of the task to update.

**Headers:**
*   `Authorization: Bearer <your_jwt_token>`

**Request Body:**
```json
{
  "title": "string",          // Optional
  "description": "string",    // Optional
  "status": "string",         // Optional
  "priority": "string",       // Optional
  "due_date": "string",       // Optional
  "assigned_to": "string"     // Optional
}
```

**Response (200 OK):**
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "status": "string",
  "priority": "string",
  "due_date": "string",
  "assigned_to": "string",
  "created_by": "string",
  "created_at": "string",
  "updated_at": "string"
}
```

**Error Responses:**
*   `400 Bad Request`: Invalid input.
*   `401 Unauthorized`: Missing or invalid JWT.
*   `403 Forbidden`: User not authorized to update this task.
*   `404 Not Found`: Task with the given ID does not exist.
*   `500 Internal Server Error`: Server-side error.

### 5. Delete Task

`DELETE /tasks/{id}`

Deletes a task. Only the `created_by` user or an `admin` can delete a task.

**Path Parameters:**
*   `id` (string): The ID of the task to delete.

**Headers:**
*   `Authorization: Bearer <your_jwt_token>`

**Response (200 OK):**
```json
{
  "message": "Task deleted successfully."
}
```

**Error Responses:**
*   `401 Unauthorized`: Missing or invalid JWT.
*   `403 Forbidden`: User not authorized to delete this task.
*   `404 Not Found`: Task with the given ID does not exist.
*   `500 Internal Server Error`: Server-side error.

---