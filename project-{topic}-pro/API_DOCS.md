# Task Management System API Documentation

This document describes the RESTful API endpoints for the Task Management System. It outlines available resources, HTTP methods, request/response structures, and authentication requirements.

## Base URL

`http://localhost:5000/api` (for local development)

## Authentication

All protected endpoints require a JSON Web Token (JWT) provided in the `Authorization` header as a Bearer token.

**Header Example:**
`Authorization: Bearer <your_jwt_token_here>`

## Error Handling

API errors are returned in a standardized JSON format:

```json
{
  "message": "Error description",
  "statusCode": 400,
  "errors": [ // Optional, for validation errors
    {
      "path": ["field"],
      "message": "Validation error details"
    }
  ]
}
```

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
Registers a new user.

- **Description**: Creates a new user account with the provided credentials.
- **Request Body**:
    ```json
    {
      "username": "string",  // Min 3, Max 20 chars
      "email": "string (email format)",
      "password": "string"  // Min 8 chars, strong password recommended
    }
    ```
- **Responses**:
    - `201 Created`:
        ```json
        {
          "message": "User registered successfully",
          "user": {
            "id": "uuid",
            "username": "string",
            "email": "string",
            "role": "member"
          }
        }
        ```
    - `400 Bad Request`: Validation error (e.g., invalid email, short password, etc.)
    - `409 Conflict`: User with this email or username already exists.

### `POST /api/auth/login`
Logs in a user and provides a JWT.

- **Description**: Authenticates a user with email and password, returning a JWT for subsequent API calls.
- **Request Body**:
    ```json
    {
      "email": "string (email format)",
      "password": "string"
    }
    ```
- **Responses**:
    - `200 OK`:
        ```json
        {
          "message": "Logged in successfully",
          "token": "string (JWT)",
          "user": {
            "id": "uuid",
            "username": "string",
            "email": "string",
            "role": "string"
          }
        }
        ```
    - `400 Bad Request`: Validation error.
    - `401 Unauthorized`: Invalid credentials.

---

## 2. User Endpoints

### `GET /api/users/me`
Retrieves the profile of the authenticated user.

- **Description**: Returns the details of the currently logged-in user.
- **Authentication**: Required (JWT)
- **Responses**:
    - `200 OK`:
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
    - `401 Unauthorized`: No token or invalid token.
    - `404 Not Found`: User not found (should not happen if token is valid).

### `PUT /api/users/me`
Updates the authenticated user's profile.

- **Description**: Allows the authenticated user to update their own profile information.
- **Authentication**: Required (JWT)
- **Request Body**:
    ```json
    {
      "username": "string (optional)",
      "email": "string (email format, optional)",
      "password": "string (optional)" // Provide old password to change password
    }
    ```
- **Responses**:
    - `200 OK`:
        ```json
        {
          "message": "User profile updated successfully",
          "user": { /* updated user object */ }
        }
        ```
    - `400 Bad Request`: Validation error.
    - `401 Unauthorized`: Invalid token or old password mismatch.
    - `409 Conflict`: Username or email already taken by another user.

---

## 3. Workspace Endpoints

### `GET /api/workspaces`
Retrieves all workspaces owned by the authenticated user.

- **Description**: Fetches a list of all workspaces associated with the current user.
- **Authentication**: Required (JWT)
- **Responses**:
    - `200 OK`:
        ```json
        [
          {
            "id": "uuid",
            "name": "string",
            "description": "string",
            "ownerId": "uuid",
            "createdAt": "datetime",
            "updatedAt": "datetime",
            "projects": [ /* array of project objects */ ]
          }
        ]
        ```

### `GET /api/workspaces/:workspaceId`
Retrieves a specific workspace by ID.

- **Description**: Fetches details for a single workspace. User must own the workspace.
- **Authentication**: Required (JWT)
- **URL Parameters**:
    - `workspaceId`: `uuid` - The ID of the workspace.
- **Responses**:
    - `200 OK`: Returns a `Workspace` object including its projects.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User does not own this workspace.
    - `404 Not Found`: Workspace not found.

### `POST /api/workspaces`
Creates a new workspace.

- **Description**: Creates a new workspace and assigns the authenticated user as its owner.
- **Authentication**: Required (JWT)
- **Request Body**:
    ```json
    {
      "name": "string",      // Min 3, Max 50 chars
      "description": "string (optional)"
    }
    ```
- **Responses**:
    - `201 Created`: Returns the newly created `Workspace` object.
    - `400 Bad Request`: Validation error.
    - `401 Unauthorized`: Invalid token.

### `PUT /api/workspaces/:workspaceId`
Updates a specific workspace.

- **Description**: Updates the details of an existing workspace. User must own the workspace.
- **Authentication**: Required (JWT)
- **URL Parameters**:
    - `workspaceId`: `uuid` - The ID of the workspace to update.
- **Request Body**:
    ```json
    {
      "name": "string (optional)",
      "description": "string (optional)"
    }
    ```
- **Responses**:
    - `200 OK`: Returns the updated `Workspace` object.
    - `400 Bad Request`: Validation error.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User does not own this workspace.
    - `404 Not Found`: Workspace not found.

### `DELETE /api/workspaces/:workspaceId`
Deletes a specific workspace.

- **Description**: Deletes a workspace and all its associated projects and tasks. User must own the workspace.
- **Authentication**: Required (JWT)
- **URL Parameters**:
    - `workspaceId`: `uuid` - The ID of the workspace to delete.
- **Responses**:
    - `204 No Content`: Workspace deleted successfully.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User does not own this workspace.
    - `404 Not Found`: Workspace not found.

---

## 4. Project Endpoints

### `GET /api/projects`
Retrieves all projects for a given workspace.

- **Description**: Fetches a list of projects within a specific workspace.
- **Authentication**: Required (JWT)
- **Query Parameters**:
    - `workspaceId`: `uuid` - **(Required)** The ID of the workspace.
- **Responses**:
    - `200 OK`: Returns an array of `Project` objects.
    - `400 Bad Request`: `workspaceId` is missing or invalid.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User does not have access to this workspace.
    - `404 Not Found`: Workspace not found.

### `GET /api/projects/:projectId`
Retrieves a specific project by ID.

- **Description**: Fetches details for a single project. User must have access to the project's workspace.
- **Authentication**: Required (JWT)
- **URL Parameters**:
    - `projectId`: `uuid` - The ID of the project.
- **Responses**:
    - `200 OK`: Returns a `Project` object, including its tasks.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User does not have access to this project's workspace.
    - `404 Not Found`: Project not found.

### `POST /api/projects`
Creates a new project within a workspace.

- **Description**: Creates a new project in the specified workspace. The authenticated user is set as the project owner.
- **Authentication**: Required (JWT)
- **Request Body**:
    ```json
    {
      "name": "string",      // Min 3, Max 50 chars
      "description": "string (optional)",
      "workspaceId": "uuid" // ID of the parent workspace
    }
    ```
- **Responses**:
    - `201 Created`: Returns the newly created `Project` object.
    - `400 Bad Request`: Validation error.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User does not have access to this workspace.
    - `404 Not Found`: Workspace not found.

### `PUT /api/projects/:projectId`
Updates a specific project.

- **Description**: Updates the details of an existing project. User must have access to the project's workspace.
- **Authentication**: Required (JWT)
- **URL Parameters**:
    - `projectId`: `uuid` - The ID of the project to update.
- **Request Body**:
    ```json
    {
      "name": "string (optional)",
      "description": "string (optional)",
      "ownerId": "uuid (optional)" // Can reassign project owner
    }
    ```
- **Responses**:
    - `200 OK`: Returns the updated `Project` object.
    - `400 Bad Request`: Validation error.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User does not have access to this project's workspace.
    - `404 Not Found`: Project or new owner not found.

### `DELETE /api/projects/:projectId`
Deletes a specific project.

- **Description**: Deletes a project and all its associated tasks and comments. User must have access to the project's workspace.
- **Authentication**: Required (JWT)
- **URL Parameters**:
    - `projectId`: `uuid` - The ID of the project to delete.
- **Responses**:
    - `204 No Content`: Project deleted successfully.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User does not have access to this project's workspace.
    - `404 Not Found`: Project not found.

---

## 5. Task Endpoints

### `GET /api/tasks`
Retrieves tasks.

- **Description**: Fetches tasks based on query parameters.
- **Authentication**: Required (JWT)
- **Query Parameters**:
    - `projectId`: `uuid` - **(Required)** Filter tasks by project.
    - `status`: `string (optional)` - Filter by status (e.g., `open`, `in_progress`).
    - `assigneeId`: `uuid (optional)` - Filter by assignee.
    - `priority`: `string (optional)` - Filter by priority.
- **Responses**:
    - `200 OK`: Returns an array of `Task` objects.
    - `400 Bad Request`: `projectId` is missing or invalid.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User does not have access to the specified project.
    - `404 Not Found`: Project not found.

### `GET /api/tasks/:taskId`
Retrieves a specific task by ID.

- **Description**: Fetches details for a single task. User must have access to the task's project.
- **Authentication**: Required (JWT)
- **URL Parameters**:
    - `taskId`: `uuid` - The ID of the task.
- **Responses**:
    - `200 OK`: Returns a `Task` object, including its comments and tags.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User does not have access to this task's project.
    - `404 Not Found`: Task not found.

### `POST /api/tasks`
Creates a new task within a project.

- **Description**: Creates a new task in the specified project.
- **Authentication**: Required (JWT)
- **Request Body**:
    ```json
    {
      "title": "string",      // Min 3, Max 100 chars
      "description": "string (optional)",
      "status": "enum (optional, default: 'open')", // 'open', 'in_progress', 'review', 'closed', 'archived'
      "priority": "enum (optional, default: 'medium')", // 'low', 'medium', 'high', 'critical'
      "dueDate": "string (ISO 8601 date, optional)",
      "projectId": "uuid",   // ID of the parent project
      "assigneeId": "uuid (optional)", // ID of the user assigned
      "tagIds": ["uuid"] // Array of tag IDs to associate
    }
    ```
- **Responses**:
    - `201 Created`: Returns the newly created `Task` object.
    - `400 Bad Request`: Validation error.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User does not have access to this project.
    - `404 Not Found`: Project, assignee, or tag not found.

### `PUT /api/tasks/:taskId`
Updates a specific task.

- **Description**: Updates the details of an existing task. User must have access to the task's project.
- **Authentication**: Required (JWT)
- **URL Parameters**:
    - `taskId`: `uuid` - The ID of the task to update.
- **Request Body**:
    ```json
    {
      "title": "string (optional)",
      "description": "string (optional)",
      "status": "enum (optional)",
      "priority": "enum (optional)",
      "dueDate": "string (ISO 8601 date, optional)",
      "assigneeId": "uuid (optional)",
      "tagIds": ["uuid"] // Array of tag IDs to associate (replaces existing tags)
    }
    ```
- **Responses**:
    - `200 OK`: Returns the updated `Task` object.
    - `400 Bad Request`: Validation error.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User does not have access to this project.
    - `404 Not Found`: Task, assignee, or tag not found.

### `DELETE /api/tasks/:taskId`
Deletes a specific task.

- **Description**: Deletes a task and all its associated comments. User must have access to the task's project.
- **Authentication**: Required (JWT)
- **URL Parameters**:
    - `taskId`: `uuid` - The ID of the task to delete.
- **Responses**:
    - `204 No Content`: Task deleted successfully.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User does not have access to this project.
    - `404 Not Found`: Task not found.

---

## 6. Comment Endpoints

### `GET /api/tasks/:taskId/comments`
Retrieves all comments for a specific task.

- **Description**: Fetches a list of comments for a given task.
- **Authentication**: Required (JWT)
- **URL Parameters**:
    - `taskId`: `uuid` - The ID of the task.
- **Responses**:
    - `200 OK`: Returns an array of `Comment` objects.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User does not have access to this task.
    - `404 Not Found`: Task not found.

### `POST /api/tasks/:taskId/comments`
Adds a new comment to a task.

- **Description**: Creates a new comment for the specified task. The authenticated user is the author.
- **Authentication**: Required (JWT)
- **URL Parameters**:
    - `taskId`: `uuid` - The ID of the task.
- **Request Body**:
    ```json
    {
      "content": "string" // Min 1, Max 1000 chars
    }
    ```
- **Responses**:
    - `201 Created`: Returns the newly created `Comment` object.
    - `400 Bad Request`: Validation error.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User does not have access to this task.
    - `404 Not Found`: Task not found.

### `PUT /api/comments/:commentId`
Updates a specific comment.

- **Description**: Updates the content of an existing comment. User must be the author of the comment.
- **Authentication**: Required (JWT)
- **URL Parameters**:
    - `commentId`: `uuid` - The ID of the comment to update.
- **Request Body**:
    ```json
    {
      "content": "string" // Min 1, Max 1000 chars
    }
    ```
- **Responses**:
    - `200 OK`: Returns the updated `Comment` object.
    - `400 Bad Request`: Validation error.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User is not the author of this comment.
    - `404 Not Found`: Comment not found.

### `DELETE /api/comments/:commentId`
Deletes a specific comment.

- **Description**: Deletes an existing comment. User must be the author of the comment (or an Admin).
- **Authentication**: Required (JWT)
- **URL Parameters**:
    - `commentId`: `uuid` - The ID of the comment to delete.
- **Responses**:
    - `204 No Content`: Comment deleted successfully.
    - `401 Unauthorized`: Invalid token.
    - `403 Forbidden`: User is not the author of this comment (and not an Admin).
    - `404 Not Found`: Comment not found.

---

## 7. Tag Endpoints (Conceptual/Minimal)

*Note: Tags would typically be managed within the context of tasks or a separate tag management interface. These are basic CRUD operations for the tags themselves.*

### `GET /api/tags`
Retrieves all available tags.

- **Description**: Fetches a list of all tags created in the system.
- **Authentication**: Required (JWT)
- **Responses**:
    - `200 OK`: Returns an array of `Tag` objects.

### `POST /api/tags`
Creates a new tag.

- **Description**: Creates a new tag. (Admin role might be required or any authenticated user).
- **Authentication**: Required (JWT)
- **Request Body**:
    ```json
    {
      "name": "string", // Unique, min 2, max 30 chars
      "color": "string (optional, e.g., '#FF0000')"
    }
    ```
- **Responses**:
    - `201 Created`: Returns the new `Tag` object.
    - `400 Bad Request`: Validation error, tag name not unique.

### `PUT /api/tags/:tagId`
Updates a tag.

- **Description**: Updates an existing tag.
- **Authentication**: Required (JWT)
- **URL Parameters**:
    - `tagId`: `uuid` - The ID of the tag.
- **Request Body**:
    ```json
    {
      "name": "string (optional)",
      "color": "string (optional)"
    }
    ```
- **Responses**:
    - `200 OK`: Returns the updated `Tag` object.
    - `400 Bad Request`: Validation error, tag name not unique.
    - `404 Not Found`: Tag not found.

### `DELETE /api/tags/:tagId`
Deletes a tag.

- **Description**: Deletes a tag. Note that deleting a tag might remove it from all associated tasks.
- **Authentication**: Required (JWT)
- **URL Parameters**:
    - `tagId`: `uuid` - The ID of the tag.
- **Responses**:
    - `204 No Content`: Tag deleted successfully.
    - `404 Not Found`: Tag not found.