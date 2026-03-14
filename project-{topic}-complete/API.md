```markdown
# Task Management System API Documentation

This document describes the RESTful API endpoints for the Task Management System.

**Base URL**: `/api`

## Authentication

All protected endpoints require a JSON Web Token (JWT) in the `Authorization` header: `Authorization: Bearer <access_token>`.

### Register a new user
*   **Endpoint**: `POST /api/auth/register`
*   **Description**: Creates a new user account.
*   **Rate Limit**: 5 requests per minute.
*   **Request Body**: `application/json`
    ```json
    {
      "username": "newuser",
      "email": "newuser@example.com",
      "password": "strongpassword123",
      "role": "user" // Optional, default is 'user'. 'admin' or 'manager' for privileged users.
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "created_at": "2023-10-27T10:00:00.000000",
      "email": "newuser@example.com",
      "id": 1,
      "is_active": true,
      "role": "user",
      "updated_at": "2023-10-27T10:00:00.000000",
      "username": "newuser"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid input (e.g., missing fields, duplicate username/email).
    *   `429 Too Many Requests`: Rate limit exceeded.

### Login a user
*   **Endpoint**: `POST /api/auth/login`
*   **Description**: Authenticates a user and returns JWT access and refresh tokens.
*   **Rate Limit**: 10 requests per minute.
*   **Request Body**: `application/json`
    ```json
    {
      "username": "existinguser",
      "password": "password123"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "access_token": "eyJ...",
      "refresh_token": "eyJ...",
      "user": {
        "created_at": "...",
        "email": "existinguser@example.com",
        "id": 1,
        "is_active": true,
        "role": "user",
        "updated_at": "...",
        "username": "existinguser"
      }
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Missing username/password.
    *   `401 Unauthorized`: Invalid credentials or inactive account.
    *   `429 Too Many Requests`: Rate limit exceeded.

### Refresh Access Token
*   **Endpoint**: `POST /api/auth/refresh`
*   **Description**: Generates a new access token using a valid refresh token.
*   **Authorization**: Requires a valid **Refresh Token**.
*   **Rate Limit**: 5 requests per hour.
*   **Success Response (200 OK)**:
    ```json
    {
      "access_token": "eyJ..."
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Invalid or expired refresh token.

### Logout a user
*   **Endpoint**: `POST /api/auth/logout`
*   **Description**: Invalidates the current access token (conceptually, in a real app might add to a blacklist).
*   **Authorization**: Requires a valid **Access Token**.
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "Successfully logged out"
    }
    ```

### Get current user details
*   **Endpoint**: `GET /api/auth/me`
*   **Description**: Retrieves details of the authenticated user.
*   **Authorization**: Requires a valid **Access Token**.
*   **Success Response (200 OK)**: (Same format as `user` object in login response)
    ```json
    {
      "created_at": "...",
      "email": "currentuser@example.com",
      "id": 1,
      "is_active": true,
      "role": "user",
      "updated_at": "...",
      "username": "currentuser"
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Missing or invalid access token.

## User Management (Admin Only)

### Create a new user
*   **Endpoint**: `POST /api/users/`
*   **Description**: Creates a new user account. Only accessible by `admin` role.
*   **Authorization**: Requires an **Admin Access Token**.
*   **Request Body**: Same as `POST /api/auth/register`.
*   **Success Response (201 Created)**: Same as `POST /api/auth/register`.
*   **Error Responses**: `400`, `403` (Forbidden), `409` (Conflict).

### Get all users
*   **Endpoint**: `GET /api/users/`
*   **Description**: Retrieves a paginated list of all users. Only accessible by `admin` role.
*   **Authorization**: Requires an **Admin Access Token**.
*   **Query Parameters**:
    *   `page` (int, default: 1): Page number.
    *   `per_page` (int, default: 10): Items per page.
*   **Success Response (200 OK)**:
    ```json
    {
      "users": [
        { /* user object */ },
        { /* user object */ }
      ],
      "total": 100,
      "pages": 10,
      "page": 1
    }
    ```
*   **Error Responses**: `401`, `403`.

### Get user by ID
*   **Endpoint**: `GET /api/users/<int:user_id>`
*   **Description**: Retrieves a specific user by their ID. Only accessible by `admin` role.
*   **Authorization**: Requires an **Admin Access Token**.
*   **Success Response (200 OK)**: (Same as current user details)
*   **Error Responses**: `401`, `403`, `404` (Not Found).

### Update user by ID
*   **Endpoint**: `PUT /api/users/<int:user_id>`
*   **Description**: Updates details for a specific user. Only accessible by `admin` role.
*   **Authorization**: Requires an **Admin Access Token**.
*   **Request Body**: `application/json` (partial updates allowed)
    ```json
    {
      "username": "updatedusername",
      "email": "updated@example.com",
      "password": "newpassword",
      "role": "manager",
      "is_active": false
    }
    ```
*   **Success Response (200 OK)**: Updated user object.
*   **Error Responses**: `400`, `401`, `403`, `404`, `409`.

### Delete user by ID
*   **Endpoint**: `DELETE /api/users/<int:user_id>`
*   **Description**: Deletes a specific user. Only accessible by `admin` role.
*   **Authorization**: Requires an **Admin Access Token**.
*   **Success Response (204 No Content)**: Empty response.
*   **Error Responses**: `401`, `403`, `404`.

## Project Management

### Create a new project
*   **Endpoint**: `POST /api/projects/`
*   **Description**: Creates a new project. Accessible by `admin` or `manager` roles. If `manager_id` is not provided, the authenticated user's ID is used.
*   **Authorization**: Requires an **Admin or Manager Access Token**.
*   **Request Body**: `application/json`
    ```json
    {
      "name": "Project Apollo",
      "description": "Develop new features for the Apollo platform.",
      "manager_id": 2, // Optional, defaults to current user's ID
      "status": "active", // Optional, default is 'active'
      "start_date": "2023-01-01T00:00:00", // Optional
      "end_date": "2023-12-31T23:59:59" // Optional
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "id": 1,
      "name": "Project Apollo",
      "description": "Develop new features for the Apollo platform.",
      "manager_id": 2,
      "status": "active",
      "start_date": "2023-01-01T00:00:00",
      "end_date": "2023-12-31T23:59:59",
      "created_at": "2023-10-27T10:00:00.000000",
      "updated_at": "2023-10-27T10:00:00.000000"
    }
    ```
*   **Error Responses**: `400`, `401`, `403`, `409`.

### Get all projects
*   **Endpoint**: `GET /api/projects/`
*   **Description**: Retrieves a paginated list of all projects. Accessible by any authenticated user.
*   **Authorization**: Requires a valid **Access Token**.
*   **Query Parameters**:
    *   `page` (int, default: 1): Page number.
    *   `per_page` (int, default: 10): Items per page.
    *   `status` (string, optional): Filter by project status (e.g., 'active', 'completed').
    *   `manager_id` (int, optional): Filter by project manager.
*   **Success Response (200 OK)**:
    ```json
    {
      "projects": [
        { /* project object */ }
      ],
      "total": 50,
      "pages": 5,
      "page": 1
    }
    ```
*   **Error Responses**: `401`.

### Get project by ID
*   **Endpoint**: `GET /api/projects/<int:project_id>`
*   **Description**: Retrieves a specific project by its ID. Accessible by any authenticated user.
*   **Authorization**: Requires a valid **Access Token**.
*   **Success Response (200 OK)**: (Same as project object in create response)
*   **Error Responses**: `401`, `404`.

### Update project by ID
*   **Endpoint**: `PUT /api/projects/<int:project_id>`
*   **Description**: Updates details for a specific project. Accessible by `admin` role or the project's `manager`.
*   **Authorization**: Requires an **Admin or Project Manager Access Token**.
*   **Request Body**: `application/json` (partial updates allowed)
    ```json
    {
      "name": "Apollo Platform Revamp",
      "status": "on_hold",
      "end_date": "2024-03-31T23:59:59"
    }
    ```
*   **Success Response (200 OK)**: Updated project object.
*   **Error Responses**: `400`, `401`, `403`, `404`, `409`.

### Delete project by ID
*   **Endpoint**: `DELETE /api/projects/<int:project_id>`
*   **Description**: Deletes a specific project and all associated tasks/comments. Accessible by `admin` role or the project's `manager`.
*   **Authorization**: Requires an **Admin or Project Manager Access Token**.
*   **Success Response (204 No Content)**: Empty response.
*   **Error Responses**: `401`, `403`, `404`.

## Task Management

### Create a new task
*   **Endpoint**: `POST /api/tasks/`
*   **Description**: Creates a new task within a project. Accessible by any authenticated user. `creator_id` defaults to the authenticated user.
*   **Authorization**: Requires a valid **Access Token**.
*   **Request Body**: `application/json`
    ```json
    {
      "title": "Implement User Authentication",
      "description": "Develop the backend for user registration and login.",
      "project_id": 1,
      "creator_id": 3, // Optional, defaults to current user
      "assigned_to_id": 4, // Optional
      "status": "open", // Optional, default 'open'
      "priority": "high", // Optional, default 'medium'
      "due_date": "2023-11-15T17:00:00" // Optional
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "id": 1,
      "title": "Implement User Authentication",
      "description": "Develop the backend for user registration and login.",
      "project_id": 1,
      "creator_id": 3,
      "assigned_to_id": 4,
      "status": "open",
      "priority": "high",
      "due_date": "2023-11-15T17:00:00",
      "created_at": "2023-10-27T10:00:00.000000",
      "updated_at": "2023-10-27T10:00:00.000000"
    }
    ```
*   **Error Responses**: `400`, `401`, `404`.

### Get all tasks
*   **Endpoint**: `GET /api/tasks/`
*   **Description**: Retrieves a paginated list of all tasks. Accessible by any authenticated user.
*   **Authorization**: Requires a valid **Access Token**.
*   **Query Parameters**:
    *   `page` (int, default: 1): Page number.
    *   `per_page` (int, default: 10): Items per page.
    *   `project_id` (int, optional): Filter by project.
    *   `assigned_to_id` (int, optional): Filter by assignee.
    *   `status` (string, optional): Filter by task status (e.g., 'open', 'in_progress').
    *   `priority` (string, optional): Filter by priority (e.g., 'high', 'medium').
*   **Success Response (200 OK)**:
    ```json
    {
      "tasks": [
        { /* task object */ }
      ],
      "total": 75,
      "pages": 8,
      "page": 1
    }
    ```
*   **Error Responses**: `401`.

### Get task by ID
*   **Endpoint**: `GET /api/tasks/<int:task_id>`
*   **Description**: Retrieves a specific task by its ID. Accessible by any authenticated user.
*   **Authorization**: Requires a valid **Access Token**.
*   **Success Response (200 OK)**: (Same as task object in create response)
*   **Error Responses**: `401`, `404`.

### Update task by ID
*   **Endpoint**: `PUT /api/tasks/<int:task_id>`
*   **Description**: Updates details for a specific task. Accessible by `admin` role, the task's `creator`, the task's `assignee`, or the `manager` of the task's project.
*   **Authorization**: Requires appropriate **Access Token**.
*   **Request Body**: `application/json` (partial updates allowed)
    ```json
    {
      "title": "Refine User Authentication Flow",
      "status": "in_progress",
      "assigned_to_id": 5,
      "due_date": "2023-11-20T17:00:00"
    }
    ```
*   **Success Response (200 OK)**: Updated task object.
*   **Error Responses**: `400`, `401`, `403`, `404`.

### Delete task by ID
*   **Endpoint**: `DELETE /api/tasks/<int:task_id>`
*   **Description**: Deletes a specific task and all associated comments. Accessible by `admin` role, the task's `creator`, the task's `assignee`, or the `manager` of the task's project.
*   **Authorization**: Requires appropriate **Access Token**.
*   **Success Response (204 No Content)**: Empty response.
*   **Error Responses**: `401`, `403`, `404`.

## Comment Management

### Add a comment to a task
*   **Endpoint**: `POST /api/tasks/<int:task_id>/comments`
*   **Description**: Adds a new comment to a specified task. Accessible by any authenticated user.
*   **Authorization**: Requires a valid **Access Token**.
*   **Request Body**: `application/json`
    ```json
    {
      "content": "This task needs more detailed requirements before starting."
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "id": 1,
      "content": "This task needs more detailed requirements before starting.",
      "task_id": 1,
      "project_id": null,
      "author_id": 3,
      "created_at": "2023-10-27T10:00:00.000000",
      "updated_at": "2023-10-27T10:00:00.000000"
    }
    ```
*   **Error Responses**: `400`, `401`, `404`.

### Get all comments for a task
*   **Endpoint**: `GET /api/tasks/<int:task_id>/comments`
*   **Description**: Retrieves a paginated list of comments for a specific task. Accessible by any authenticated user.
*   **Authorization**: Requires a valid **Access Token**.
*   **Query Parameters**:
    *   `page` (int, default: 1): Page number.
    *   `per_page` (int, default: 10): Items per page.
*   **Success Response (200 OK)**:
    ```json
    {
      "comments": [
        { /* comment object */ }
      ],
      "total": 5,
      "pages": 1,
      "page": 1
    }
    ```
*   **Error Responses**: `401`, `404`.

### Update a comment by ID
*   **Endpoint**: `PUT /api/tasks/comments/<int:comment_id>`
*   **Description**: Updates the content of a specific comment. Only accessible by the comment's `author`.
*   **Authorization**: Requires a valid **Access Token**.
*   **Request Body**: `application/json`
    ```json
    {
      "content": "Revised comment: We need to set up a meeting next week."
    }
    ```
*   **Success Response (200 OK)**: Updated comment object.
*   **Error Responses**: `400`, `401`, `403`, `404`.

### Delete a comment by ID
*   **Endpoint**: `DELETE /api/tasks/comments/<int:comment_id>`
*   **Description**: Deletes a specific comment. Only accessible by the comment's `author` or an `admin`/`manager` (manager of the associated project).
*   **Authorization**: Requires appropriate **Access Token**.
*   **Success Response (204 No Content)**: Empty response.
*   **Error Responses**: `401`, `403`, `404`.

---
```