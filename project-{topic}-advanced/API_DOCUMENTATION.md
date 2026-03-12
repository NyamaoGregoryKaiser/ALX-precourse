# Task Management System API Documentation

This document provides a comprehensive overview of the RESTful API endpoints for the Task Management System.

**Base URL**: `http://localhost:5000/api` (or your deployed backend URL)

## Authentication

All protected endpoints require a JSON Web Token (JWT) sent in the `Authorization` header as a Bearer token: `Authorization: Bearer <YOUR_JWT_TOKEN>`.

### 1. Auth Endpoints

*   **`POST /api/auth/register`**
    *   **Description**: Register a new user.
    *   **Access**: Public
    *   **Request Body**:
        ```json
        {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "strongpassword123"
        }
        ```
    *   **Response (201 Created)**:
        ```json
        {
            "id": "uuid-of-user",
            "username": "newuser",
            "email": "newuser@example.com",
            "role": "user",
            "token": "jwt-token-string"
        }
        ```
    *   **Error (400 Bad Request)**: If email already exists or validation fails.

*   **`POST /api/auth/login`**
    *   **Description**: Authenticate user and get a JWT.
    *   **Access**: Public
    *   **Request Body**:
        ```json
        {
            "email": "user@example.com",
            "password": "password123"
        }
        ```
    *   **Response (200 OK)**:
        ```json
        {
            "id": "uuid-of-user",
            "username": "user",
            "email": "user@example.com",
            "role": "user",
            "token": "jwt-token-string"
        }
        ```
    *   **Error (401 Unauthorized)**: If invalid credentials.

*   **`GET /api/auth/me`**
    *   **Description**: Get current authenticated user's profile.
    *   **Access**: Private (Authenticated User)
    *   **Response (200 OK)**:
        ```json
        {
            "id": "uuid-of-user",
            "username": "user",
            "email": "user@example.com",
            "role": "user",
            "createdAt": "2023-01-01T10:00:00.000Z",
            "updatedAt": "2023-01-01T10:00:00.000Z"
        }
        ```
    *   **Error (401 Unauthorized)**: If token is missing or invalid.

### 2. User Endpoints

*   **`GET /api/users`**
    *   **Description**: Get a list of all users.
    *   **Access**: Private (Admin Only)
    *   **Response (200 OK)**: Array of user objects (without passwords).
        ```json
        [
            {
                "id": "uuid-of-user1",
                "username": "adminuser",
                "email": "admin@example.com",
                "role": "admin",
                "createdAt": "...",
                "updatedAt": "..."
            },
            ...
        ]
        ```
    *   **Error (403 Forbidden)**: If authenticated user is not an admin.

*   **`GET /api/users/:id`**
    *   **Description**: Get a single user by ID. Includes owned projects and assigned tasks.
    *   **Access**: Private (Admin or User's own profile)
    *   **Response (200 OK)**:
        ```json
        {
            "id": "uuid-of-user",
            "username": "testuser",
            "email": "user@example.com",
            "role": "user",
            "createdAt": "...",
            "updatedAt": "...",
            "ownedProjects": [...],
            "assignedTasks": [...]
        }
        ```
    *   **Error (403 Forbidden)**: If authenticated user is neither admin nor the requested user.
    *   **Error (404 Not Found)**: If user not found.

*   **`PUT /api/users/:id`**
    *   **Description**: Update user details. Cannot change password via this route. Regular users cannot change their `role`.
    *   **Access**: Private (Admin or User's own profile)
    *   **Request Body**:
        ```json
        {
            "username": "updatedusername",
            "email": "updated@example.com",
            "role": "admin" // Only admin can change this
        }
        ```
    *   **Response (200 OK)**: Updated user object.
    *   **Error (400 Bad Request)**: If trying to change password.
    *   **Error (403 Forbidden)**: If not authorized (not admin, or not own profile).
    *   **Error (404 Not Found)**: If user not found.

*   **`DELETE /api/users/:id`**
    *   **Description**: Delete a user.
    *   **Access**: Private (Admin Only)
    *   **Response (200 OK)**:
        ```json
        {
            "message": "User deleted successfully"
        }
        ```
    *   **Error (400 Bad Request)**: If admin tries to delete their own account (for safety).
    *   **Error (403 Forbidden)**: If authenticated user is not an admin.
    *   **Error (404 Not Found)**: If user not found.

### 3. Project Endpoints

*   **`POST /api/projects`**
    *   **Description**: Create a new project. The `ownerId` is automatically set to the authenticated user's ID.
    *   **Access**: Private (Authenticated User)
    *   **Request Body**:
        ```json
        {
            "name": "New Project Title",
            "description": "Details about the project.",
            "status": "active"
        }
        ```
    *   **Response (201 Created)**:
        ```json
        {
            "id": "uuid-of-project",
            "name": "New Project Title",
            "description": "Details about the project.",
            "status": "active",
            "ownerId": "uuid-of-current-user",
            "createdAt": "...",
            "updatedAt": "..."
        }
        ```
    *   **Error (400 Bad Request)**: If `name` is missing.

*   **`GET /api/projects`**
    *   **Description**: Get a list of projects.
    *   **Access**: Private (Authenticated User)
    *   **Query Parameters**:
        *   `myProjects=true`: (Optional) If set to `true`, only returns projects owned by the authenticated user. Otherwise, all accessible projects are returned (can be configured to be only owned projects by default for regular users).
    *   **Response (200 OK)**: Array of project objects, including owner and tasks details.
        ```json
        [
            {
                "id": "uuid-of-project1",
                "name": "Website Redesign",
                "description": "...",
                "status": "active",
                "ownerId": "uuid-of-owner",
                "owner": { "id": "...", "username": "...", "email": "..." },
                "tasks": [...]
            },
            ...
        ]
        ```

*   **`GET /api/projects/:id`**
    *   **Description**: Get a single project by ID. Includes owner and associated tasks.
    *   **Access**: Private (Project Owner, Admin, or user assigned to a task within the project).
    *   **Response (200 OK)**:
        ```json
        {
            "id": "uuid-of-project",
            "name": "Website Redesign",
            "description": "...",
            "status": "active",
            "ownerId": "uuid-of-owner",
            "owner": { "id": "...", "username": "...", "email": "..." },
            "tasks": [
                {
                    "id": "uuid-of-task1",
                    "title": "Design homepage",
                    "status": "in-progress",
                    "priority": "high",
                    "dueDate": "...",
                    "assignedTo": "...",
                    "assignee": { "id": "...", "username": "..." }
                },
                ...
            ]
        }
        ```
    *   **Error (403 Forbidden)**: If not authorized to view the project.
    *   **Error (404 Not Found)**: If project not found.

*   **`PUT /api/projects/:id`**
    *   **Description**: Update project details.
    *   **Access**: Private (Project Owner or Admin Only)
    *   **Request Body**:
        ```json
        {
            "name": "Updated Project Name",
            "description": "Revised description.",
            "status": "completed"
        }
        ```
    *   **Response (200 OK)**: Updated project object.
    *   **Error (403 Forbidden)**: If not authorized to update the project.
    *   **Error (404 Not Found)**: If project not found.

*   **`DELETE /api/projects/:id`**
    *   **Description**: Delete a project. This will also cascade delete all associated tasks.
    *   **Access**: Private (Project Owner or Admin Only)
    *   **Response (200 OK)**:
        ```json
        {
            "message": "Project deleted successfully"
        }
        ```
    *   **Error (403 Forbidden)**: If not authorized to delete the project.
    *   **Error (404 Not Found)**: If project not found.

### 4. Task Endpoints

*   **`POST /api/tasks`**
    *   **Description**: Create a new task. The `creatorId` is automatically set to the authenticated user's ID.
    *   **Access**: Private (Authenticated User)
    *   **Request Body**:
        ```json
        {
            "title": "Implement authentication API",
            "description": "Develop login, register, JWT generation endpoints.",
            "status": "to-do",
            "priority": "high",
            "dueDate": "2024-07-30T10:00:00.000Z",
            "projectId": "uuid-of-project",
            "assignedTo": "uuid-of-user" // Optional, can be null
        }
        ```
    *   **Response (201 Created)**:
        ```json
        {
            "id": "uuid-of-task",
            "title": "Implement authentication API",
            "description": "...",
            "status": "to-do",
            "priority": "high",
            "dueDate": "2024-07-30T10:00:00.000Z",
            "projectId": "uuid-of-project",
            "assignedTo": "uuid-of-user",
            "creatorId": "uuid-of-current-user",
            "createdAt": "...",
            "updatedAt": "..."
        }
        ```
    *   **Error (400 Bad Request)**: If `title` or `projectId` are missing.
    *   **Error (404 Not Found)**: If `projectId` or `assignedTo` user does not exist.

*   **`GET /api/tasks`**
    *   **Description**: Get a list of tasks. Supports filtering.
    *   **Access**: Private (Authenticated User)
    *   **Query Parameters**:
        *   `projectId`: (Optional) Filter tasks by project ID.
        *   `assignedTo`: (Optional) Filter tasks by assignee ID.
        *   `status`: (Optional) Filter tasks by status (`to-do`, `in-progress`, `done`).
        *   `priority`: (Optional) Filter tasks by priority (`low`, `medium`, `high`).
        *   `dueDate`: (Optional) Filter tasks with `dueDate` on or after the specified date (e.g., `2024-07-15`).
        *   `search`: (Optional) Search tasks by title (case-insensitive partial match).
    *   **Authorization Notes**:
        *   Admins can view all tasks.
        *   Regular users can view their assigned tasks, or tasks within projects they own, or tasks where they are the creator.
        *   If no filter is provided by a regular user, it defaults to tasks assigned to them.
    *   **Response (200 OK)**: Array of task objects, including project, assignee, and creator details.
        ```json
        [
            {
                "id": "uuid-of-task1",
                "title": "Design UI/UX",
                "description": "...",
                "status": "in-progress",
                "priority": "high",
                "dueDate": "2024-07-30T10:00:00.000Z",
                "projectId": "uuid-of-project",
                "assignedTo": "uuid-of-assignee",
                "creatorId": "uuid-of-creator",
                "project": { "id": "...", "name": "..." },
                "assignee": { "id": "...", "username": "...", "email": "..." },
                "creator": { "id": "...", "username": "...", "email": "..." }
            },
            ...
        ]
        ```

*   **`GET /api/tasks/:id`**
    *   **Description**: Get a single task by ID. Includes project, assignee, and creator details.
    *   **Access**: Private (Assigned User, Task Creator, Project Owner, or Admin).
    *   **Response (200 OK)**:
        ```json
        {
            "id": "uuid-of-task",
            "title": "Design UI/UX",
            "description": "...",
            "status": "in-progress",
            "priority": "high",
            "dueDate": "2024-07-30T10:00:00.000Z",
            "projectId": "uuid-of-project",
            "assignedTo": "uuid-of-assignee",
            "creatorId": "uuid-of-creator",
            "project": { "id": "...", "name": "..." },
            "assignee": { "id": "...", "username": "...", "email": "..." },
            "creator": { "id": "...", "username": "...", "email": "..." },
            "createdAt": "...",
            "updatedAt": "..."
        }
        ```
    *   **Error (403 Forbidden)**: If not authorized to view the task.
    *   **Error (404 Not Found)**: If task not found.

*   **`PUT /api/tasks/:id`**
    *   **Description**: Update task details.
    *   **Access**: Private (Assigned User, Task Creator, Project Owner, or Admin).
    *   **Request Body**:
        ```json
        {
            "title": "Refined UI/UX Design",
            "description": "Updated details for the design.",
            "status": "done",
            "priority": "low",
            "dueDate": "2024-07-25T10:00:00.000Z",
            "assignedTo": "uuid-of-new-assignee" // Can change assignee
        }
        ```
    *   **Response (200 OK)**: Updated task object.
    *   **Error (403 Forbidden)**: If not authorized to update the task.
    *   **Error (404 Not Found)**: If task or new assignee not found.

*   **`DELETE /api/tasks/:id`**
    *   **Description**: Delete a task.
    *   **Access**: Private (Task Creator, Project Owner, or Admin).
    *   **Response (200 OK)**:
        ```json
        {
            "message": "Task deleted successfully"
        }
        ```
    *   **Error (403 Forbidden)**: If not authorized to delete the task.
    *   **Error (404 Not Found)**: If task not found.
```