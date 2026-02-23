```markdown
# SecureTask API Documentation

This document provides a comprehensive overview of the RESTful API endpoints for the SecureTask application.

**Base URL:** `/api/v1`

## Authentication

All protected routes require a JWT token in the `Authorization` header: `Bearer <token>`.

### 1. Register User
*   **URL:** `/auth/register`
*   **Method:** `POST`
*   **Rate Limit:** 100 requests per 15 minutes per IP.
*   **Description:** Registers a new user with an email, password, and optional role.
*   **Request Body (JSON):**
    ```json
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "password": "StrongPassword@123",
      "role": "MEMBER" // Optional: "MEMBER", "MANAGER", "ADMIN". Default is MEMBER.
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "status": "success",
      "token": "eyJhbGciOiJIUzI1Ni...",
      "user": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "MEMBER"
      }
    }
    ```
*   **Error Responses:** 400 Bad Request (Validation errors, Email already exists), 429 Too Many Requests.

### 2. Login User
*   **URL:** `/auth/login`
*   **Method:** `POST`
*   **Rate Limit:** 100 requests per 15 minutes per IP.
*   **Description:** Authenticates a user and issues a JWT token.
*   **Request Body (JSON):**
    ```json
    {
      "email": "john.doe@example.com",
      "password": "StrongPassword@123"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "token": "eyJhbGciOiJIUzI1Ni...",
      "user": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "MEMBER"
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized (Incorrect credentials), 400 Bad Request (Validation errors), 429 Too Many Requests.

### 3. Logout User
*   **URL:** `/auth/logout`
*   **Method:** `GET`
*   **Description:** Clears the JWT cookie (if used) and logs out the user.
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "message": "Logged out successfully"
    }
    ```

## User Management (Protected, Admin Only for most operations)

### 1. Get All Users
*   **URL:** `/users`
*   **Method:** `GET`
*   **Access:** `ADMIN`
*   **Description:** Retrieves a list of all registered users.
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "results": 2,
      "data": {
        "users": [
          { "id": "uuid", "name": "Admin User", "email": "admin@example.com", "role": "ADMIN", "createdAt": "ISO date" },
          { "id": "uuid", "name": "Manager One", "email": "manager1@example.com", "role": "MANAGER", "createdAt": "ISO date" }
        ]
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized, 403 Forbidden.

### 2. Get User by ID
*   **URL:** `/users/:id`
*   **Method:** `GET`
*   **Access:** `ADMIN` (any user), `MANAGER` (any user), `MEMBER` (their own profile)
*   **Description:** Retrieves details of a specific user.
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "user": { "id": "uuid", "name": "John Doe", "email": "john.doe@example.com", "role": "MEMBER", "createdAt": "ISO date" }
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found.

### 3. Update User by ID
*   **URL:** `/users/:id`
*   **Method:** `PATCH`
*   **Access:** `ADMIN` (any user), `MANAGER` (any user), `MEMBER` (their own profile, limited fields)
*   **Description:** Updates details of a specific user. Admins can update all fields including `role`. Users can update their `name`, `email`, `password`.
*   **Request Body (JSON):**
    ```json
    {
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "password": "NewStrongPassword@123",
      "role": "MANAGER" // Admin-only field
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "user": { "id": "uuid", "name": "Jane Doe", "email": "jane.doe@example.com", "role": "MEMBER" }
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized, 403 Forbidden (e.g., changing role without admin privileges), 404 Not Found, 400 Bad Request (Validation errors).

### 4. Delete User by ID
*   **URL:** `/users/:id`
*   **Method:** `DELETE`
*   **Access:** `ADMIN`
*   **Description:** Deletes a specific user.
*   **Response (204 No Content):** Empty response.
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found.

## Project Management (Protected)

### 1. Create Project
*   **URL:** `/projects`
*   **Method:** `POST`
*   **Access:** `ADMIN`, `MANAGER` (managerId must be their own ID if MANAGER)
*   **Description:** Creates a new project.
*   **Request Body (JSON):**
    ```json
    {
      "name": "New Awesome Project",
      "description": "Details about the new project.",
      "managerId": "uuid-of-manager",
      "memberIds": ["uuid-of-member1", "uuid-of-member2"] // Optional array of member IDs
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "project": {
          "id": "uuid",
          "name": "New Awesome Project",
          "description": "Details...",
          "status": "PENDING",
          "manager": { "id": "uuid", "name": "Manager One" },
          "members": [ { "id": "uuid", "name": "Member One" } ]
        }
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 400 Bad Request.

### 2. Get All Projects
*   **URL:** `/projects`
*   **Method:** `GET`
*   **Access:** `ADMIN` (all projects), `MANAGER`/`MEMBER` (projects they manage or are a member of)
*   **Description:** Retrieves a list of projects accessible to the authenticated user.
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "results": 2,
      "data": {
        "projects": [
          {
            "id": "uuid",
            "name": "Project Alpha",
            "description": "...",
            "status": "IN_PROGRESS",
            "manager": { "id": "uuid", "name": "Manager One" },
            "members": [...],
            "_count": { "tasks": 5 }
          }
        ]
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized.

### 3. Get Project by ID
*   **URL:** `/projects/:id`
*   **Method:** `GET`
*   **Access:** `ADMIN`, `MANAGER` (of the project), `MEMBER` (of the project)
*   **Description:** Retrieves details of a specific project, including its tasks and members.
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "project": {
          "id": "uuid",
          "name": "Project Alpha",
          "description": "...",
          "status": "IN_PROGRESS",
          "manager": { "id": "uuid", "name": "Manager One" },
          "members": [ { "id": "uuid", "name": "Member One" } ],
          "tasks": [ { "id": "uuid", "title": "Task 1", "status": "PENDING", "...": "..." } ]
        }
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found.

### 4. Update Project by ID
*   **URL:** `/projects/:id`
*   **Method:** `PATCH`
*   **Access:** `ADMIN`, `MANAGER` (of the project)
*   **Description:** Updates details of a specific project.
*   **Request Body (JSON):**
    ```json
    {
      "name": "Revised Project Name",
      "description": "Updated details.",
      "status": "COMPLETED",
      "addMemberIds": ["new-member-uuid"], // Optional: Add members
      "removeMemberIds": ["old-member-uuid"] // Optional: Remove members
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "project": { "id": "uuid", "name": "Revised Project Name", "status": "COMPLETED", "..." }
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found, 400 Bad Request.

### 5. Delete Project by ID
*   **URL:** `/projects/:id`
*   **Method:** `DELETE`
*   **Access:** `ADMIN`, `MANAGER` (of the project)
*   **Description:** Deletes a specific project and all its associated tasks and comments.
*   **Response (204 No Content):** Empty response.
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found.

## Task Management (Protected, Nested under Projects)

### 1. Get All Tasks in a Project
*   **URL:** `/projects/:projectId/tasks`
*   **Method:** `GET`
*   **Access:** `ADMIN`, `MANAGER` (of the project), `MEMBER` (of the project)
*   **Description:** Retrieves a list of all tasks for a given project.
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "results": 3,
      "data": {
        "tasks": [
          {
            "id": "uuid",
            "title": "Task 1",
            "description": "...",
            "status": "PENDING",
            "priority": "HIGH",
            "dueDate": "ISO date",
            "assignedTo": { "id": "uuid", "name": "Member One" },
            "comments": [{"id": "uuid"}, {"id": "uuid"}] // Simplified comment count
          }
        ]
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found (Project).

### 2. Get Task by ID
*   **URL:** `/projects/:projectId/tasks/:id`
*   **Method:** `GET`
*   **Access:** `ADMIN`, `MANAGER` (of the project), `MEMBER` (of the project)
*   **Description:** Retrieves details of a specific task within a project.
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "task": {
          "id": "uuid",
          "title": "Task 1",
          "description": "...",
          "status": "PENDING",
          "priority": "HIGH",
          "dueDate": "ISO date",
          "assignedTo": { "id": "uuid", "name": "Member One" },
          "comments": [
            { "id": "uuid", "content": "Comment content", "createdAt": "ISO date", "author": { "id": "uuid", "name": "Author Name" } }
          ]
        }
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found (Project or Task).

### 3. Create Task
*   **URL:** `/projects/:projectId/tasks`
*   **Method:** `POST`
*   **Access:** `ADMIN`, `MANAGER` (of the project)
*   **Description:** Creates a new task for a specific project.
*   **Request Body (JSON):**
    ```json
    {
      "title": "Develop Feature X",
      "description": "Implement the new feature.",
      "assignedToId": "uuid-of-member",
      "priority": "MEDIUM", // "LOW", "MEDIUM", "HIGH"
      "dueDate": "2024-12-31T00:00:00Z" // Optional
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "task": { "id": "uuid", "title": "Develop Feature X", "status": "PENDING", "assignedTo": { "id": "uuid", "name": "..." } }
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found (Project), 400 Bad Request (e.g., assigning to non-project member).

### 4. Update Task by ID
*   **URL:** `/projects/:projectId/tasks/:id`
*   **Method:** `PATCH`
*   **Access:** `ADMIN`, `MANAGER` (of the project) - all fields; `MEMBER` (assigned to task) - `title`, `description`, `status`
*   **Description:** Updates details of a specific task within a project.
*   **Request Body (JSON):**
    ```json
    {
      "status": "IN_PROGRESS",
      "assignedToId": "uuid-of-another-member", // Admin/Manager only
      "priority": "HIGH"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "task": { "id": "uuid", "title": "...", "status": "IN_PROGRESS", "assignedTo": { "id": "uuid", "name": "..." } }
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found (Project or Task), 400 Bad Request.

### 5. Delete Task by ID
*   **URL:** `/projects/:projectId/tasks/:id`
*   **Method:** `DELETE`
*   **Access:** `ADMIN`, `MANAGER` (of the project)
*   **Description:** Deletes a specific task and its associated comments.
*   **Response (204 No Content):** Empty response.
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found (Project or Task).

## Comment Management (Protected, Nested under Tasks)

### 1. Get All Comments for a Task
*   **URL:** `/projects/:projectId/tasks/:taskId/comments`
*   **Method:** `GET`
*   **Access:** `ADMIN`, `MANAGER` (of project), `MEMBER` (of project)
*   **Description:** Retrieves a list of all comments for a given task.
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "results": 2,
      "data": {
        "comments": [
          {
            "id": "uuid",
            "content": "This is a comment.",
            "createdAt": "ISO date",
            "author": { "id": "uuid", "name": "Commenter Name" }
          }
        ]
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found (Task).

### 2. Create Comment
*   **URL:** `/projects/:projectId/tasks/:taskId/comments`
*   **Method:** `POST`
*   **Access:** `ADMIN`, `MANAGER` (of project), `MEMBER` (of project or assigned to task)
*   **Description:** Adds a new comment to a specific task.
*   **Request Body (JSON):**
    ```json
    {
      "content": "Great progress on this task!"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "comment": { "id": "uuid", "content": "Great progress...", "author": { "id": "uuid", "name": "Author Name" } }
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found (Task), 400 Bad Request.

### 3. Update Comment by ID
*   **URL:** `/projects/:projectId/tasks/:taskId/comments/:id`
*   **Method:** `PATCH`
*   **Access:** `ADMIN`, `AUTHOR` (of the comment)
*   **Description:** Updates the content of a specific comment.
*   **Request Body (JSON):**
    ```json
    {
      "content": "Revised comment content."
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "comment": { "id": "uuid", "content": "Revised comment...", "author": { "id": "uuid", "name": "Author Name" } }
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found (Comment), 400 Bad Request.

### 4. Delete Comment by ID
*   **URL:** `/projects/:projectId/tasks/:taskId/comments/:id`
*   **Method:** `DELETE`
*   **Access:** `ADMIN`, `MANAGER` (of project), `AUTHOR` (of the comment)
*   **Description:** Deletes a specific comment.
*   **Response (204 No Content):** Empty response.
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found (Comment).
```