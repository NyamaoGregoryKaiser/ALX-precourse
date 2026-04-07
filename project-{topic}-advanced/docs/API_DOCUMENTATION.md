# Project Management API (PMApi) - API Documentation

This document describes the RESTful API endpoints for the Project Management API.

**Base URL:** `/api/v1` (when accessed via frontend proxy or directly at `http://localhost:3000/api/v1`)

**Authentication:** Most endpoints require JWT authentication.
*   Provide an `Authorization` header with a `Bearer` token: `Authorization: Bearer <access_token>`
*   Access tokens expire relatively quickly (e.g., 30 minutes). Use the refresh token to obtain a new access token.

**Roles:**
*   `user`: Can manage their own projects and tasks, view tasks assigned to them.
*   `admin`: Can manage all users, projects, and tasks.

---

## 1. Authentication (`/auth`)

### 1.1 Register a new user

*   **Endpoint:** `POST /auth/register`
*   **Description:** Creates a new user account.
*   **Authentication:** None required.
*   **Request Body:**
    ```json
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "password": "MyStrongPassword123",
      "role": "user" // Optional, defaults to 'user'. Only admin can set 'admin' role.
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "user": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "user",
        "isEmailVerified": false,
        "createdAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
        "updatedAt": "YYYY-MM-DDTHH:mm:ss.sssZ"
      },
      "tokens": {
        "access": {
          "token": "jwt_access_token",
          "expires": "YYYY-MM-DDTHH:mm:ss.sssZ"
        },
        "refresh": {
          "token": "jwt_refresh_token",
          "expires": "YYYY-MM-DDTHH:mm:ss.sssZ"
        }
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid input (e.g., weak password, invalid email format, missing required fields), email already taken.

### 1.2 Login a user

*   **Endpoint:** `POST /auth/login`
*   **Description:** Authenticates a user and returns access and refresh tokens.
*   **Authentication:** None required.
*   **Request Body:**
    ```json
    {
      "email": "john.doe@example.com",
      "password": "MyStrongPassword123"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "user": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "user",
        "isEmailVerified": false,
        "createdAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
        "updatedAt": "YYYY-MM-DDTHH:mm:ss.sssZ"
      },
      "tokens": {
        "access": {
          "token": "jwt_access_token",
          "expires": "YYYY-MM-DDTHH:mm:ss.sssZ"
        },
        "refresh": {
          "token": "jwt_refresh_token",
          "expires": "YYYY-MM-DDTHH:mm:ss.sssZ"
        }
      }
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Incorrect email or password.

### 1.3 Refresh authentication tokens

*   **Endpoint:** `POST /auth/refresh-token`
*   **Description:** Uses a refresh token to obtain new access and refresh tokens. Invalidates the old refresh token.
*   **Authentication:** None required, but requires a valid `refreshToken` in the body.
*   **Request Body:**
    ```json
    {
      "refreshToken": "existing_jwt_refresh_token"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "access": {
        "token": "new_jwt_access_token",
        "expires": "YYYY-MM-DDTHH:mm:ss.sssZ"
      },
      "refresh": {
        "token": "new_jwt_refresh_token",
        "expires": "YYYY-MM-DDTHH:mm:ss.sssZ"
      }
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or expired refresh token.

---

## 2. User Management (`/users`)

**Required Role:** `admin` for all user management operations.

### 2.1 Create a new user

*   **Endpoint:** `POST /users`
*   **Description:** Creates a new user (admin privilege to set role).
*   **Authentication:** Required (`admin` role).
*   **Request Body:** (Same as `/auth/register`, but `role` can be explicitly set to `admin`)
    ```json
    {
      "name": "Admin Two",
      "email": "admin2@example.com",
      "password": "AdminPassword123",
      "role": "admin"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "id": "uuid",
      "name": "Admin Two",
      "email": "admin2@example.com",
      "role": "admin",
      "isEmailVerified": false,
      "createdAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "updatedAt": "YYYY-MM-DDTHH:mm:ss.sssZ"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an `admin`.
    *   `400 Bad Request`: Validation errors, email already taken.

### 2.2 Get all users

*   **Endpoint:** `GET /users`
*   **Description:** Retrieves a list of all users. Supports pagination and filtering.
*   **Authentication:** Required (`admin` role).
*   **Query Parameters:**
    *   `name` (string): Filter by user name (partial match).
    *   `role` (enum: `user`, `admin`): Filter by user role.
    *   `email` (string): Filter by user email.
    *   `sortBy` (string): Field to sort by, e.g., `name:asc`, `createdAt:desc`.
    *   `limit` (number): Maximum number of results per page (default: 10).
    *   `page` (number): Current page number (default: 1).
*   **Response (200 OK):**
    ```json
    {
      "results": [
        {
          "id": "uuid",
          "name": "Admin User",
          "email": "admin@example.com",
          "role": "admin",
          "isEmailVerified": true,
          "createdAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
          "updatedAt": "YYYY-MM-DDTHH:mm:ss.sssZ"
        }
      ],
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "totalResults": 1
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an `admin`.

### 2.3 Get a single user by ID

*   **Endpoint:** `GET /users/:userId`
*   **Description:** Retrieves details of a specific user.
*   **Authentication:** Required (`admin` role).
*   **Path Parameters:**
    *   `userId` (UUID): The ID of the user.
*   **Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin",
      "isEmailVerified": true,
      "createdAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "updatedAt": "YYYY-MM-DDTHH:mm:ss.sssZ"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an `admin`.
    *   `404 Not Found`: User with the given ID does not exist.

### 2.4 Update a user by ID

*   **Endpoint:** `PATCH /users/:userId`
*   **Description:** Updates details of a specific user.
*   **Authentication:** Required (`admin` role).
*   **Path Parameters:**
    *   `userId` (UUID): The ID of the user to update.
*   **Request Body:** (Partial update, any field can be updated)
    ```json
    {
      "name": "Super Admin",
      "role": "admin"
    }
    ```
*   **Response (200 OK):**
    (Returns the updated user object)
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an `admin`.
    *   `404 Not Found`: User with the given ID does not exist.
    *   `400 Bad Request`: Validation errors, email already taken.

### 2.5 Delete a user by ID

*   **Endpoint:** `DELETE /users/:userId`
*   **Description:** Deletes a specific user.
*   **Authentication:** Required (`admin` role).
*   **Path Parameters:**
    *   `userId` (UUID): The ID of the user to delete.
*   **Response (204 No Content):**
    (Successful deletion returns no content)
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an `admin`.
    *   `404 Not Found`: User with the given ID does not exist.

---

## 3. Project Management (`/projects`)

**Required Role:** `user` or `admin`. Access control is applied based on `createdBy` field.

### 3.1 Create a new project

*   **Endpoint:** `POST /projects`
*   **Description:** Creates a new project. The `createdBy` field is automatically set to the authenticated user's ID.
*   **Authentication:** Required (`user` or `admin` role).
*   **Request Body:**
    ```json
    {
      "name": "My New Project",
      "description": "A detailed description of the project goals and objectives.",
      "status": "pending", // Optional, defaults to 'pending'. (pending, in-progress, completed, cancelled)
      "startDate": "2024-07-26T00:00:00.000Z", // Optional
      "endDate": "2024-09-26T00:00:00.000Z"    // Optional, must be after startDate
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "id": "uuid",
      "name": "My New Project",
      "description": "A detailed description of the project goals and objectives.",
      "status": "pending",
      "createdBy": "creator_user_id",
      "startDate": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "endDate": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "createdAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "updatedAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "creator": {
        "id": "creator_user_id",
        "name": "Creator Name",
        "email": "creator@example.com"
      }
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `400 Bad Request`: Validation errors, project name already exists.

### 3.2 Get all projects

*   **Endpoint:** `GET /projects`
*   **Description:** Retrieves a list of projects. `user` role can only see projects they created. `admin` can see all projects. Supports pagination and filtering.
*   **Authentication:** Required (`user` or `admin` role).
*   **Query Parameters:**
    *   `name` (string): Filter by project name (partial match).
    *   `status` (enum: `pending`, `in-progress`, `completed`, `cancelled`): Filter by project status.
    *   `createdBy` (UUID): (Admin only) Filter projects by the ID of the creator.
    *   `sortBy` (string): Field to sort by, e.g., `name:asc`, `createdAt:desc`.
    *   `limit` (number): Maximum number of results per page (default: 10).
    *   `page` (number): Current page number (default: 1).
*   **Response (200 OK):**
    ```json
    {
      "results": [
        {
          "id": "uuid",
          "name": "PMApi Backend Development",
          "description": "...",
          "status": "in-progress",
          "createdBy": "creator_user_id",
          "startDate": "YYYY-MM-DDTHH:mm:ss.sssZ",
          "endDate": "YYYY-MM-DDTHH:mm:ss.sssZ",
          "createdAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
          "updatedAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
          "creator": { "id": "uuid", "name": "Creator Name", "email": "email@example.com" }
        }
      ],
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "totalResults": 1
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.

### 3.3 Get a single project by ID

*   **Endpoint:** `GET /projects/:projectId`
*   **Description:** Retrieves details of a specific project.
*   **Authentication:** Required (`user` or `admin` role). `user` can only access projects they created.
*   **Path Parameters:**
    *   `projectId` (UUID): The ID of the project.
*   **Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "name": "PMApi Backend Development",
      "description": "...",
      "status": "in-progress",
      "createdBy": "creator_user_id",
      "startDate": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "endDate": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "createdAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "updatedAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "creator": { "id": "uuid", "name": "Creator Name", "email": "email@example.com" }
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: `user` attempting to access another user's project.
    *   `404 Not Found`: Project with the given ID does not exist.

### 3.4 Update a project by ID

*   **Endpoint:** `PATCH /projects/:projectId`
*   **Description:** Updates details of a specific project.
*   **Authentication:** Required (`user` or `admin` role). `user` can only update projects they created. `admin` can update any project.
*   **Path Parameters:**
    *   `projectId` (UUID): The ID of the project to update.
*   **Request Body:** (Partial update, any field can be updated)
    ```json
    {
      "name": "Updated Project Title",
      "status": "completed"
    }
    ```
*   **Response (200 OK):**
    (Returns the updated project object)
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Unauthorized to update project.
    *   `404 Not Found`: Project with the given ID does not exist.
    *   `400 Bad Request`: Validation errors, project name already exists.

### 3.5 Delete a project by ID

*   **Endpoint:** `DELETE /projects/:projectId`
*   **Description:** Deletes a specific project and all its associated tasks.
*   **Authentication:** Required (`user` or `admin` role). `user` can only delete projects they created. `admin` can delete any project.
*   **Path Parameters:**
    *   `projectId` (UUID): The ID of the project to delete.
*   **Response (204 No Content):**
    (Successful deletion returns no content)
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Unauthorized to delete project.
    *   `404 Not Found`: Project with the given ID does not exist.

---

## 4. Task Management (`/tasks`)

Tasks can be accessed globally (`/tasks`) or nested under a project (`/projects/:projectId/tasks`).

**Required Role:** `user` or `admin`. Access control is applied based on project ownership, task creation, and task assignment.

### 4.1 Create a new task

*   **Endpoint:** `POST /projects/:projectId/tasks`
*   **Description:** Creates a new task for a specific project. The `createdBy` field is automatically set to the authenticated user's ID.
*   **Authentication:** Required (`user` or `admin` role). Only project creator or admin can create tasks in a project.
*   **Path Parameters:**
    *   `projectId` (UUID): The ID of the project to add the task to.
*   **Request Body:**
    ```json
    {
      "title": "Implement API Tests",
      "description": "Write comprehensive unit, integration, and API tests for the backend.",
      "status": "in-progress", // Optional, defaults to 'todo'. (todo, in-progress, done, blocked)
      "priority": "high",       // Optional, defaults to 'medium'. (low, medium, high)
      "dueDate": "2024-08-10T00:00:00.000Z", // Optional
      "assignedTo": "user_id" // Optional, UUID of the user to assign the task to
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "id": "uuid",
      "title": "Implement API Tests",
      "description": "...",
      "status": "in-progress",
      "priority": "high",
      "dueDate": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "projectId": "project_id",
      "assignedTo": "assignee_user_id",
      "createdBy": "creator_user_id",
      "createdAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "updatedAt": "YYYY-MM-DDTHH:mm:ss.sssZ"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Unauthorized to create tasks in this project.
    *   `404 Not Found`: Project not found.
    *   `400 Bad Request`: Validation errors.

### 4.2 Get all tasks

*   **Endpoint:** `GET /tasks` (Global list, can filter by `projectId` in query)
*   **Endpoint:** `GET /projects/:projectId/tasks` (Tasks within a specific project)
*   **Description:** Retrieves a list of tasks.
    *   **Global (`/tasks`):** Admin sees all tasks. Regular users see tasks they created or are assigned to.
    *   **Project-specific (`/projects/:projectId/tasks`):** Admin and project creator see all tasks in that project. Regular users assigned to a task in that project can see that task.
*   **Authentication:** Required (`user` or `admin` role).
*   **Path Parameters (for nested route):**
    *   `projectId` (UUID): The ID of the project.
*   **Query Parameters:**
    *   `projectId` (UUID): (Optional for global endpoint) Filter by project ID.
    *   `title` (string): Filter by task title (partial match).
    *   `status` (enum: `todo`, `in-progress`, `done`, `blocked`): Filter by task status.
    *   `priority` (enum: `low`, `medium`, `high`): Filter by task priority.
    *   `assignedTo` (UUID): Filter by assignee user ID.
    *   `createdBy` (UUID): Filter by creator user ID.
    *   `sortBy` (string): Field to sort by, e.g., `dueDate:asc`, `createdAt:desc`.
    *   `limit` (number): Maximum number of results per page (default: 10).
    *   `page` (number): Current page number (default: 1).
*   **Response (200 OK):**
    ```json
    {
      "results": [
        {
          "id": "uuid",
          "title": "Implement User Authentication",
          "description": "...",
          "status": "in-progress",
          "priority": "high",
          "dueDate": "YYYY-MM-DDTHH:mm:ss.sssZ",
          "projectId": "project_id",
          "assignedTo": "assignee_user_id",
          "createdBy": "creator_user_id",
          "createdAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
          "updatedAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
          "project": { "id": "uuid", "name": "Project Name", "status": "in-progress" },
          "assignee": { "id": "uuid", "name": "Assignee Name", "email": "assignee@example.com" },
          "creator": { "id": "uuid", "name": "Creator Name", "email": "creator@example.com" }
        }
      ],
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "totalResults": 1
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Unauthorized to view tasks in the specified project or general tasks.
    *   `404 Not Found`: Project not found (if `projectId` is provided).

### 4.3 Get a single task by ID

*   **Endpoint:** `GET /tasks/:taskId` (Global access)
*   **Endpoint:** `GET /projects/:projectId/tasks/:taskId` (Task within a specific project)
*   **Description:** Retrieves details of a specific task.
*   **Authentication:** Required (`user` or `admin` role).
    *   Admin can view any task.
    *   Project creator can view any task within their project.
    *   Task creator can view their task.
    *   Task assignee can view their assigned task.
*   **Path Parameters:**
    *   `taskId` (UUID): The ID of the task.
    *   `projectId` (UUID): (Optional for global endpoint, required for nested) The ID of the project. If provided, the task must belong to this project.
*   **Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "title": "Implement User Authentication",
      "description": "...",
      "status": "in-progress",
      "priority": "high",
      "dueDate": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "projectId": "project_id",
      "assignedTo": "assignee_user_id",
      "createdBy": "creator_user_id",
      "createdAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "updatedAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "project": { "id": "uuid", "name": "Project Name", "status": "in-progress" },
      "assignee": { "id": "uuid", "name": "Assignee Name", "email": "assignee@example.com" },
      "creator": { "id": "uuid", "name": "Creator Name", "email": "creator@example.com" }
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Unauthorized to view this task.
    *   `404 Not Found`: Task or associated project not found.
    *   `400 Bad Request`: Task does not belong to the specified project (if `projectId` is in path).

### 4.4 Update a task by ID

*   **Endpoint:** `PATCH /tasks/:taskId`
*   **Endpoint:** `PATCH /projects/:projectId/tasks/:taskId`
*   **Description:** Updates details of a specific task.
*   **Authentication:** Required (`user` or `admin` role).
    *   Admin can update any task.
    *   Project creator can update any task within their project.
    *   Task creator can update their task.
    *   Task assignee can update their assigned task.
*   **Path Parameters:**
    *   `taskId` (UUID): The ID of the task to update.
    *   `projectId` (UUID): (Optional for global endpoint, required for nested) The ID of the project. If provided, the task must belong to this project.
*   **Request Body:** (Partial update)
    ```json
    {
      "status": "done",
      "assignedTo": "new_assignee_user_id" // Set to null to unassign
    }
    ```
*   **Response (200 OK):**
    (Returns the updated task object)
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Unauthorized to update this task.
    *   `404 Not Found`: Task or associated project not found.
    *   `400 Bad Request`: Validation errors, task does not belong to the specified project.

### 4.5 Delete a task by ID

*   **Endpoint:** `DELETE /tasks/:taskId`
*   **Endpoint:** `DELETE /projects/:projectId/tasks/:taskId`
*   **Description:** Deletes a specific task.
*   **Authentication:** Required (`user` or `admin` role).
    *   Admin can delete any task.
    *   Project creator can delete any task within their project.
    *   Task creator can delete their task.
*   **Path Parameters:**
    *   `taskId` (UUID): The ID of the task to delete.
    *   `projectId` (UUID): (Optional for global endpoint, required for nested) The ID of the project. If provided, the task must belong to this project.
*   **Response (204 No Content):**
    (Successful deletion returns no content)
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Unauthorized to delete this task.
    *   `404 Not Found`: Task or associated project not found.
    *   `400 Bad Request`: Task does not belong to the specified project.
```