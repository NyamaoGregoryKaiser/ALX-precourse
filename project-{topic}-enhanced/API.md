# Task Management System API Documentation

This document provides a detailed overview of the RESTful API endpoints for the Task Management System.

**Base URL:** `http://localhost:5000/api` (or your configured backend URL)

## Authentication

All protected endpoints require a JSON Web Token (JWT) sent in the `Authorization` header as a Bearer token:

`Authorization: Bearer <YOUR_JWT_TOKEN>`

### 1. User Authentication

#### 1.1 Register User
*   **Endpoint:** `POST /api/auth/register`
*   **Description:** Creates a new user account.
*   **Request Body:**
    ```json
    {
      "username": "string",
      "email": "string (valid email format)",
      "password": "string (min 6 characters)"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "token": "string (JWT)",
      "user": {
        "id": "uuid",
        "username": "string",
        "email": "string",
        "role": "user"
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid input (e.g., missing fields, invalid email, password too short), or email/username already exists.

#### 1.2 Login User
*   **Endpoint:** `POST /api/auth/login`
*   **Description:** Authenticates a user and returns a JWT.
*   **Request Body:**
    ```json
    {
      "email": "string",
      "password": "string"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "token": "string (JWT)",
      "user": {
        "id": "uuid",
        "username": "string",
        "email": "string",
        "role": "user"
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid credentials (email not found, incorrect password).

### 2. User Endpoints

#### 2.1 Get User Profile
*   **Endpoint:** `GET /api/users/profile`
*   **Description:** Retrieves the profile of the authenticated user.
*   **Authentication:** Required
*   **Success Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "role": "string",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No token or invalid token.
    *   `404 Not Found`: User not found (should not happen with valid token).

#### 2.2 Update User Profile
*   **Endpoint:** `PUT /api/users/profile`
*   **Description:** Updates the profile of the authenticated user.
*   **Authentication:** Required
*   **Request Body:** (Partial update, any of the following fields)
    ```json
    {
      "username": "string (optional)",
      "email": "string (optional, valid email)",
      "password": "string (optional, min 6 characters)"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "role": "string",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No token or invalid token.
    *   `400 Bad Request`: Invalid input or email/username already taken.

### 3. Project Endpoints

#### 3.1 Create New Project
*   **Endpoint:** `POST /api/projects`
*   **Description:** Creates a new project owned by the authenticated user.
*   **Authentication:** Required
*   **Request Body:**
    ```json
    {
      "name": "string (required)",
      "description": "string (optional)"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "ownerId": "uuid",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No token or invalid token.
    *   `400 Bad Request`: Invalid input (e.g., missing project name).

#### 3.2 Get All Projects
*   **Endpoint:** `GET /api/projects`
*   **Description:** Retrieves all projects owned by the authenticated user.
*   **Authentication:** Required
*   **Success Response (200 OK):**
    ```json
    [
      {
        "id": "uuid",
        "name": "string",
        "description": "string",
        "ownerId": "uuid",
        "createdAt": "timestamp",
        "updatedAt": "timestamp"
      },
      ...
    ]
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No token or invalid token.

#### 3.3 Get Project by ID
*   **Endpoint:** `GET /api/projects/:id`
*   **Description:** Retrieves a single project by its ID. Only accessible if the authenticated user is the owner.
*   **Authentication:** Required
*   **Success Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "ownerId": "uuid",
      "createdAt": "timestamp",
      "updatedAt": "timestamp",
      "owner": {
        "id": "uuid",
        "username": "string",
        "email": "string"
      }
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: User is not the owner of the project.
    *   `404 Not Found`: Project with the given ID does not exist.

#### 3.4 Update Project
*   **Endpoint:** `PUT /api/projects/:id`
*   **Description:** Updates an existing project. Only accessible if the authenticated user is the owner.
*   **Authentication:** Required
*   **Request Body:** (Partial update, any of the following fields)
    ```json
    {
      "name": "string (optional)",
      "description": "string (optional)"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "ownerId": "uuid",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: User is not the owner of the project.
    *   `404 Not Found`: Project with the given ID does not exist.
    *   `400 Bad Request`: Invalid input.

#### 3.5 Delete Project
*   **Endpoint:** `DELETE /api/projects/:id`
*   **Description:** Deletes a project. Only accessible if the authenticated user is the owner.
*   **Authentication:** Required
*   **Success Response (204 No Content):** (No body returned)
*   **Error Responses:**
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: User is not the owner of the project.
    *   `404 Not Found`: Project with the given ID does not exist.

### 4. Task Endpoints

#### 4.1 Create New Task (within a project)
*   **Endpoint:** `POST /api/projects/:projectId/tasks`
*   **Description:** Creates a new task for a specific project. The authenticated user must be the project owner.
*   **Authentication:** Required
*   **Request Body:**
    ```json
    {
      "title": "string (required)",
      "description": "string (optional)",
      "status": "enum (optional, default: 'open') - 'open', 'in_progress', 'completed', 'closed'",
      "priority": "enum (optional, default: 'medium') - 'low', 'medium', 'high'",
      "dueDate": "string (optional, ISO 8601 date string, e.g., '2024-12-31T23:59:59Z')",
      "assigneeId": "uuid (optional, ID of a user to assign the task)"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "status": "string",
      "priority": "string",
      "dueDate": "timestamp | null",
      "projectId": "uuid",
      "assigneeId": "uuid | null",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: User is not the owner of the project.
    *   `404 Not Found`: Project or Assignee user does not exist.
    *   `400 Bad Request`: Invalid input.

#### 4.2 Get All Tasks for a Project
*   **Endpoint:** `GET /api/projects/:projectId/tasks`
*   **Description:** Retrieves all tasks belonging to a specific project. The authenticated user must be the project owner or an assigned user (for assigned tasks).
*   **Authentication:** Required
*   **Success Response (200 OK):**
    ```json
    [
      {
        "id": "uuid",
        "title": "string",
        "description": "string",
        "status": "string",
        "priority": "string",
        "dueDate": "timestamp | null",
        "projectId": "uuid",
        "assigneeId": "uuid | null",
        "createdAt": "timestamp",
        "updatedAt": "timestamp",
        "assignee": { "id": "uuid", "username": "string" } // if assigned
      },
      ...
    ]
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: User is not authorized to view tasks for this project.
    *   `404 Not Found`: Project does not exist.

#### 4.3 Get Task by ID (within a project)
*   **Endpoint:** `GET /api/projects/:projectId/tasks/:taskId`
*   **Description:** Retrieves a single task by its ID within a specific project. The authenticated user must be the project owner or the assignee of the task.
*   **Authentication:** Required
*   **Success Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "status": "string",
      "priority": "string",
      "dueDate": "timestamp | null",
      "projectId": "uuid",
      "assigneeId": "uuid | null",
      "createdAt": "timestamp",
      "updatedAt": "timestamp",
      "project": { "id": "uuid", "name": "string" },
      "assignee": { "id": "uuid", "username": "string" } // if assigned
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: User is not authorized to view this task.
    *   `404 Not Found`: Project or Task does not exist.

#### 4.4 Update Task
*   **Endpoint:** `PUT /api/projects/:projectId/tasks/:taskId`
*   **Description:** Updates an existing task. The authenticated user must be the project owner or the assignee of the task.
*   **Authentication:** Required
*   **Request Body:** (Partial update, any of the following fields)
    ```json
    {
      "title": "string (optional)",
      "description": "string (optional)",
      "status": "enum (optional) - 'open', 'in_progress', 'completed', 'closed'",
      "priority": "enum (optional) - 'low', 'medium', 'high'",
      "dueDate": "string (optional, ISO 8601 date string)",
      "assigneeId": "uuid | null (optional, ID of a user, or null to unassign)"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "status": "string",
      "priority": "string",
      "dueDate": "timestamp | null",
      "projectId": "uuid",
      "assigneeId": "uuid | null",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: User is not authorized to update this task.
    *   `404 Not Found`: Project or Task does not exist, or new assignee does not exist.
    *   `400 Bad Request`: Invalid input.

#### 4.5 Delete Task
*   **Endpoint:** `DELETE /api/projects/:projectId/tasks/:taskId`
*   **Description:** Deletes a task. The authenticated user must be the project owner.
*   **Authentication:** Required
*   **Success Response (204 No Content):** (No body returned)
*   **Error Responses:**
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: User is not the owner of the project.
    *   `404 Not Found`: Project or Task does not exist.

### Common Error Responses

*   **`401 Unauthorized`**: Authentication token is missing, invalid, or expired.
    ```json
    {
      "message": "Unauthorized: Invalid or missing token"
    }
    ```
*   **`403 Forbidden`**: User does not have the necessary permissions to access the resource.
    ```json
    {
      "message": "Forbidden: You do not have permission to access this resource"
    }
    ```
*   **`404 Not Found`**: The requested resource does not exist.
    ```json
    {
      "message": "Resource not found"
    }
    ```
*   **`429 Too Many Requests`**: Rate limit exceeded.
    ```json
    {
      "message": "Too many requests, please try again later."
    }
    ```
*   **`500 Internal Server Error`**: An unexpected error occurred on the server.
    ```json
    {
      "message": "Internal Server Error"
    }
    ```