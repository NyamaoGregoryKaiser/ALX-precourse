```markdown
# API Documentation: Enterprise-Grade Project Management System

This document provides a comprehensive overview of the RESTful API endpoints for the Project Management System.

**Base URL:** `/api`
**Authentication:** JWT Bearer Token (required for most endpoints)

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Registers a new user.
*   **Description:** Creates a new user account with a unique username and email.
*   **Rate Limit:** Applied
*   **Request Body (JSON):**
    ```json
    {
      "username": "string",  // Min 3, Max 30 alphanumeric
      "email": "string",     // Valid email format
      "password": "string",  // Min 6, Max 30, alphanumeric and special chars
      "role": "string"       // Optional: "user", "manager", "admin". Default: "user"
    }
    ```
*   **Response (201 OK):**
    ```json
    {
      "message": "User registered successfully",
      "user": {
        "id": "uuid",
        "username": "string",
        "email": "string",
        "role": "string"
      },
      "accessToken": "string",
      "refreshToken": "string"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid input data (Joi validation failure).
    *   `409 Conflict`: User with email/username already exists.

### `POST /api/auth/login`
Authenticates a user and issues JWTs.
*   **Description:** Authenticates a user with email and password, returning an access token and a refresh token.
*   **Rate Limit:** Applied
*   **Request Body (JSON):**
    ```json
    {
      "email": "string",
      "password": "string"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "message": "Logged in successfully",
      "user": {
        "id": "uuid",
        "username": "string",
        "email": "string",
        "role": "string"
      },
      "accessToken": "string",
      "refreshToken": "string"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid input data.
    *   `401 Unauthorized`: Invalid credentials.

### `POST /api/auth/refresh-token`
Refreshes an expired access token using a refresh token.
*   **Description:** Provides a new access token if the provided refresh token is valid.
*   **Rate Limit:** Applied
*   **Request Body (JSON):**
    ```json
    {
      "refreshToken": "string"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "message": "Access token refreshed successfully",
      "accessToken": "string"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or expired refresh token.

### `POST /api/auth/logout`
Logs out the current user.
*   **Description:** Simulates logout. In a production system with stored refresh tokens, this would invalidate the refresh token.
*   **Authentication:** Not required
*   **Response (200 OK):**
    ```json
    {
      "message": "Logged out successfully."
    }
    ```

---

## 2. User Management Endpoints (`/api/users`)

**Authentication:** Required (Bearer Token)
**Authorization:** `ADMIN` role required for all endpoints in this section.

### `GET /api/users`
Retrieves a list of all users.
*   **Description:** Returns an array of all registered users (excluding passwords).
*   **Response (200 OK):**
    ```json
    [
      {
        "id": "uuid",
        "username": "string",
        "email": "string",
        "role": "string",
        "createdAt": "datetime",
        "updatedAt": "datetime"
      }
    ]
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have `ADMIN` role.

### `GET /api/users/:id`
Retrieves a user by ID.
*   **Description:** Returns details of a specific user by their UUID.
*   **Path Parameters:**
    *   `id` (string, uuid): The UUID of the user.
*   **Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "role": "string",
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have `ADMIN` role.
    *   `404 Not Found`: User not found.

### `PUT /api/users/:id/role`
Updates a user's role.
*   **Description:** Allows an admin to change the role of any user.
*   **Path Parameters:**
    *   `id` (string, uuid): The UUID of the user.
*   **Request Body (JSON):**
    ```json
    {
      "role": "string" // Must be one of "user", "manager", "admin"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "message": "User <username>'s role updated to <role>",
      "user": {
        "id": "uuid",
        "username": "string",
        "email": "string",
        "role": "string"
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid role provided.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have `ADMIN` role.
    *   `404 Not Found`: User not found.

### `DELETE /api/users/:id`
Deletes a user.
*   **Description:** Deletes a user account by their UUID.
*   **Path Parameters:**
    *   `id` (string, uuid): The UUID of the user to delete.
*   **Response (204 No Content):**
    *   Successful deletion with no content in the response body.
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have `ADMIN` role.
    *   `404 Not Found`: User not found.

---

## 3. Project Endpoints (`/api/projects`)

**Authentication:** Required (Bearer Token)
**Authorization:** Varies per endpoint (specified below).

### `POST /api/projects`
Creates a new project.
*   **Authorization:** `USER`, `MANAGER`, `ADMIN` (owner is set to the authenticated user).
*   **Request Body (JSON):**
    ```json
    {
      "name": "string",        // Min 3, Max 100
      "description": "string", // Min 10, Max 500
      "startDate": "date",     // ISO 8601 format (e.g., "2024-07-01")
      "endDate": "date",       // ISO 8601 format, must be after startDate
      "status": "string"       // Optional: "planned", "in-progress", "completed", "cancelled". Default: "planned"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "startDate": "date",
      "endDate": "date",
      "status": "string",
      "ownerId": "uuid",
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid input data.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have sufficient role.

### `GET /api/projects`
Retrieves a list of all projects.
*   **Authorization:** `USER`, `MANAGER`, `ADMIN`.
    *   `ADMIN`/`MANAGER`: Can view all projects.
    *   `USER`: Can view all projects (current implementation; service can be enhanced to filter by owned/assigned projects).
*   **Caching:** Applied (1 hour expiration)
*   **Response (200 OK):**
    ```json
    [
      {
        "id": "uuid",
        "name": "string",
        "description": "string",
        "startDate": "date",
        "endDate": "date",
        "status": "string",
        "ownerId": "uuid",
        "owner": { ...user_details },
        "createdAt": "datetime",
        "updatedAt": "datetime"
      }
    ]
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have sufficient role.

### `GET /api/projects/:id`
Retrieves a project by ID.
*   **Authorization:** `USER`, `MANAGER`, `ADMIN`.
    *   `USER`: Must be the project owner.
    *   `MANAGER`/`ADMIN`: Can view any project.
*   **Path Parameters:**
    *   `id` (string, uuid): The UUID of the project.
*   **Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "startDate": "date",
      "endDate": "date",
      "status": "string",
      "ownerId": "uuid",
      "owner": { ...user_details },
      "tasks": [ { ...task_details } ],
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have permission to view this project.
    *   `404 Not Found`: Project not found.

### `PUT /api/projects/:id`
Updates an existing project.
*   **Authorization:** `USER` (must be owner), `MANAGER`, `ADMIN`.
*   **Path Parameters:**
    *   `id` (string, uuid): The UUID of the project.
*   **Request Body (JSON):** (All fields are optional, at least one must be provided)
    ```json
    {
      "name": "string",
      "description": "string",
      "startDate": "date",
      "endDate": "date",
      "status": "string"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "startDate": "date",
      "endDate": "date",
      "status": "string",
      "ownerId": "uuid",
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid input data.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have permission to update this project.
    *   `404 Not Found`: Project not found.

### `DELETE /api/projects/:id`
Deletes a project.
*   **Authorization:** `USER` (must be owner), `ADMIN`.
*   **Path Parameters:**
    *   `id` (string, uuid): The UUID of the project.
*   **Response (204 No Content):**
    *   Successful deletion.
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have permission to delete this project.
    *   `404 Not Found`: Project not found.

---

## 4. Task Endpoints (`/api/tasks`)

**Authentication:** Required (Bearer Token)
**Authorization:** Varies per endpoint (specified below).

### `POST /api/tasks`
Creates a new task within a project.
*   **Authorization:** `USER` (must be project owner), `MANAGER`, `ADMIN`.
*   **Request Body (JSON):**
    ```json
    {
      "title": "string",         // Min 3, Max 100
      "description": "string",   // Min 10, Max 500
      "projectId": "uuid",       // ID of the project the task belongs to
      "assignedToId": "uuid",    // Optional: ID of the user assigned to the task, or null
      "dueDate": "date",         // ISO 8601 format
      "status": "string",        // Optional: "todo", "in-progress", "done", "blocked". Default: "todo"
      "priority": "string"       // Optional: "low", "medium", "high". Default: "medium"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "projectId": "uuid",
      "assignedToId": "uuid | null",
      "dueDate": "date",
      "status": "string",
      "priority": "string",
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid input data, project not found, or assigned user not found.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have permission to create tasks in this project.

### `GET /api/tasks/project/:projectId`
Retrieves all tasks for a specific project.
*   **Authorization:** `USER` (must be project owner OR assigned to a task in the project), `MANAGER`, `ADMIN`.
*   **Path Parameters:**
    *   `projectId` (string, uuid): The UUID of the project.
*   **Response (200 OK):**
    ```json
    [
      {
        "id": "uuid",
        "title": "string",
        "description": "string",
        "projectId": "uuid",
        "assignedToId": "uuid | null",
        "assignedTo": { ...user_details | null },
        "dueDate": "date",
        "status": "string",
        "priority": "string",
        "createdAt": "datetime",
        "updatedAt": "datetime"
      }
    ]
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have permission to view tasks in this project.
    *   `404 Not Found`: Project not found.

### `GET /api/tasks/:id`
Retrieves a single task by ID.
*   **Authorization:** `USER` (must be project owner OR assigned to this task), `MANAGER`, `ADMIN`.
*   **Path Parameters:**
    *   `id` (string, uuid): The UUID of the task.
*   **Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "projectId": "uuid",
      "project": { ...project_details },
      "assignedToId": "uuid | null",
      "assignedTo": { ...user_details | null },
      "dueDate": "date",
      "status": "string",
      "priority": "string",
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have permission to view this task.
    *   `404 Not Found`: Task not found.

### `PUT /api/tasks/:id`
Updates an existing task.
*   **Authorization:** `USER` (must be project owner OR assigned to this task), `MANAGER`, `ADMIN`.
*   **Path Parameters:**
    *   `id` (string, uuid): The UUID of the task.
*   **Request Body (JSON):** (All fields are optional, at least one must be provided)
    ```json
    {
      "title": "string",
      "description": "string",
      "assignedToId": "uuid | null", // Set to null to unassign
      "dueDate": "date",
      "status": "string",
      "priority": "string"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "projectId": "uuid",
      "assignedToId": "uuid | null",
      "dueDate": "date",
      "status": "string",
      "priority": "string",
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid input data, or assigned user not found.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have permission to update this task.
    *   `404 Not Found`: Task not found.

### `DELETE /api/tasks/:id`
Deletes a task.
*   **Authorization:** `USER` (must be project owner), `ADMIN`.
*   **Path Parameters:**
    *   `id` (string, uuid): The UUID of the task.
*   **Response (204 No Content):**
    *   Successful deletion.
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have permission to delete this task.
    *   `404 Not Found`: Task not found.
```