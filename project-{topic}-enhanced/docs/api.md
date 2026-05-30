# Task Management System API Documentation (OpenAPI / Swagger Style)

This document outlines the RESTful API endpoints for the Task Management System.

**Base URL**: `/v1`

---

## 1. Authentication

### `POST /v1/auth/register`

Register a new user.

*   **Description**: Creates a new user account with the provided details and returns authentication tokens.
*   **Authentication**: None (public endpoint)
*   **Request Body**:
    *   `firstName` (string, required): User's first name.
    *   `lastName` (string, required): User's last name.
    *   `email` (string, required): Unique email address.
    *   `password` (string, required): User's password (min 8 chars, at least 1 letter & 1 number).
    *   `role` (string, optional): User's role (`member`, `projectOwner`, `admin`). Default is `member`.
*   **Responses**:
    *   `201 Created`:
        ```json
        {
          "user": {
            "id": "uuid",
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@example.com",
            "role": "member",
            "isEmailVerified": false,
            "createdAt": "timestamp",
            "updatedAt": "timestamp"
          },
          "tokens": {
            "access": {
              "token": "jwt_access_token",
              "expires": "iso_date_string"
            },
            "refresh": {
              "token": "jwt_refresh_token",
              "expires": "iso_date_string"
            }
          }
        }
        ```
    *   `400 Bad Request`: If validation fails (e.g., invalid email, password too weak, email already taken).
        ```json
        {
          "code": 400,
          "message": "Email already taken"
        }
        ```

### `POST /v1/auth/login`

Authenticate user and receive tokens.

*   **Description**: Logs in a user with their email and password, returning access and refresh tokens.
*   **Authentication**: None (public endpoint)
*   **Request Body**:
    *   `email` (string, required): User's email address.
    *   `password` (string, required): User's password.
*   **Responses**:
    *   `200 OK`:
        ```json
        {
          "user": {
            "id": "uuid",
            "email": "john.doe@example.com",
            "role": "member",
            "firstName": "John",
            "lastName": "Doe"
          },
          "tokens": {
            "access": {
              "token": "jwt_access_token",
              "expires": "iso_date_string"
            },
            "refresh": {
              "token": "jwt_refresh_token",
              "expires": "iso_date_string"
            }
          }
        }
        ```
    *   `401 Unauthorized`: If email or password is incorrect.
        ```json
        {
          "code": 401,
          "message": "Incorrect email or password"
        }
        ```

### `POST /v1/auth/logout`

Log out an authenticated user.

*   **Description**: Invalidates the provided refresh token, effectively logging out the user. Requires an active access token to prevent CSRF.
*   **Authentication**: JWT Access Token (in `Authorization` header)
*   **Request Body**:
    *   `refreshToken` (string, required): The refresh token to invalidate.
*   **Responses**:
    *   `204 No Content`: Successful logout.
    *   `401 Unauthorized`: If access token is missing or invalid.
    *   `404 Not Found`: If the provided refresh token is not found.

### `POST /v1/auth/refresh-tokens`

Generate new access and refresh tokens.

*   **Description**: Uses a valid refresh token to obtain a new pair of access and refresh tokens. The old refresh token is invalidated.
*   **Authentication**: None (public endpoint, as it's for refreshing tokens)
*   **Request Body**:
    *   `refreshToken` (string, required): A valid refresh token.
*   **Responses**:
    *   `200 OK`:
        ```json
        {
          "access": {
            "token": "new_jwt_access_token",
            "expires": "iso_date_string"
          },
          "refresh": {
            "token": "new_jwt_refresh_token",
            "expires": "iso_date_string"
          }
        }
        ```
    *   `401 Unauthorized`: If the refresh token is missing, invalid, or expired.

---

## 2. Users

### `POST /v1/users`

Create a new user.

*   **Description**: Creates a new user account. Only `admin` role can perform this.
*   **Authentication**: JWT Access Token (`Authorization: Bearer <token>`)
*   **Required Rights**: `manageUsers`
*   **Request Body**: Same as `POST /v1/auth/register`
*   **Responses**:
    *   `201 Created`: Returns the created user object (without password).
    *   `400 Bad Request`: If validation fails or email taken.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user does not have `manageUsers` rights.

### `GET /v1/users`

Retrieve a list of users.

*   **Description**: Fetches a paginated list of users.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `getUsers`
*   **Query Parameters**:
    *   `firstName` (string, optional): Filter by first name.
    *   `lastName` (string, optional): Filter by last name.
    *   `email` (string, optional): Filter by email.
    *   `role` (string, optional): Filter by role (`member`, `projectOwner`, `admin`).
    *   `sortBy` (string, optional): Sort order (e.g., `createdAt:desc`, `email:asc`).
    *   `limit` (number, optional): Maximum number of results per page (default: 10).
    *   `page` (number, optional): Current page number (default: 1).
*   **Responses**:
    *   `200 OK`: Returns a paginated list of user objects.
        ```json
        {
          "results": [
            { "id": "uuid", "firstName": "...", "email": "...", "role": "..." }
          ],
          "page": 1,
          "limit": 10,
          "totalPages": 5,
          "totalResults": 42
        }
        ```
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user does not have `getUsers` rights.

### `GET /v1/users/:userId`

Retrieve a single user by ID.

*   **Description**: Fetches a single user's details.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `getUsers` (or self-access)
*   **Path Parameters**:
    *   `userId` (string, required): The UUID of the user.
*   **Responses**:
    *   `200 OK`: Returns the user object (without password).
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user does not have `getUsers` rights and is not accessing their own profile.
    *   `404 Not Found`: If user not found.

### `PATCH /v1/users/:userId`

Update a user by ID.

*   **Description**: Updates specific fields of a user. Only `admin` role can update any user. Users can update their own profile fields (except role).
*   **Authentication**: JWT Access Token
*   **Required Rights**: `manageUsers` (or self-access for allowed fields)
*   **Path Parameters**:
    *   `userId` (string, required): The UUID of the user.
*   **Request Body**:
    *   `firstName` (string, optional)
    *   `lastName` (string, optional)
    *   `email` (string, optional)
    *   `password` (string, optional)
    *   `role` (string, optional): Can only be updated by `admin`.
*   **Responses**:
    *   `200 OK`: Returns the updated user object.
    *   `400 Bad Request`: If validation fails or email already taken.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks rights.
    *   `404 Not Found`: If user not found.

### `DELETE /v1/users/:userId`

Delete a user by ID.

*   **Description**: Deletes a user account. Only `admin` role can perform this.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `manageUsers`
*   **Path Parameters**:
    *   `userId` (string, required): The UUID of the user.
*   **Responses**:
    *   `204 No Content`: Successful deletion.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks rights.
    *   `404 Not Found`: If user not found.

---

## 3. Projects

### `POST /v1/projects`

Create a new project.

*   **Description**: Creates a new project. The `ownerId` is automatically set to the authenticated user's ID.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `manageProjects`
*   **Request Body**:
    *   `title` (string, required): Project title.
    *   `description` (string, optional): Project description.
    *   `status` (string, optional): Project status (`planning`, `in_progress`, `completed`, `cancelled`). Default: `planning`.
*   **Responses**:
    *   `201 Created`: Returns the created project object.
    *   `400 Bad Request`: If validation fails.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks `manageProjects` rights.

### `GET /v1/projects`

Retrieve a list of projects.

*   **Description**: Fetches a paginated list of projects.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `getProjects`
*   **Query Parameters**:
    *   `title` (string, optional): Filter by project title.
    *   `status` (string, optional): Filter by project status.
    *   `ownerId` (string, optional): Filter by project owner UUID.
    *   `sortBy`, `limit`, `page`: Standard pagination options.
*   **Responses**:
    *   `200 OK`: Returns a paginated list of project objects.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks `getProjects` rights.

### `GET /v1/projects/:projectId`

Retrieve a single project by ID.

*   **Description**: Fetches a single project's details.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `getProjects` (or `projectOwner` if owner of project)
*   **Path Parameters**:
    *   `projectId` (string, required): The UUID of the project.
*   **Responses**:
    *   `200 OK`: Returns the project object.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks rights and is not the project owner.
    *   `404 Not Found`: If project not found.

### `PATCH /v1/projects/:projectId`

Update a project by ID.

*   **Description**: Updates specific fields of a project. Only project owners or administrators can update projects.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `manageProjects` (or `projectOwner` if owner of project)
*   **Path Parameters**:
    *   `projectId` (string, required): The UUID of the project.
*   **Request Body**:
    *   `title` (string, optional)
    *   `description` (string, optional)
    *   `status` (string, optional)
*   **Responses**:
    *   `200 OK`: Returns the updated project object.
    *   `400 Bad Request`: If validation fails.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks rights or is not the project owner.
    *   `404 Not Found`: If project not found.

### `DELETE /v1/projects/:projectId`

Delete a project by ID.

*   **Description**: Deletes a project. Only project owners or administrators can delete projects.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `manageProjects` (or `projectOwner` if owner of project)
*   **Path Parameters**:
    *   `projectId` (string, required): The UUID of the project.
*   **Responses**:
    *   `204 No Content`: Successful deletion.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks rights or is not the project owner.
    *   `404 Not Found`: If project not found.

---

## 4. Tasks

### `POST /v1/tasks`

Create a new task.

*   **Description**: Creates a new task within a specified project.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `manageTasks`
*   **Request Body**:
    *   `title` (string, required)
    *   `description` (string, optional)
    *   `status` (string, optional): `to_do`, `in_progress`, `done`. Default: `to_do`.
    *   `priority` (string, optional): `low`, `medium`, `high`. Default: `medium`.
    *   `dueDate` (date, optional): ISO 8601 format.
    *   `projectId` (string, required): UUID of the parent project.
    *   `assignedTo` (string, optional): UUID of the user assigned to this task.
*   **Responses**:
    *   `201 Created`: Returns the created task object.
    *   `400 Bad Request`: If validation fails.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks `manageTasks` rights or permission for the project.

### `GET /v1/tasks`

Retrieve a list of tasks.

*   **Description**: Fetches a paginated list of tasks.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `getTasks`
*   **Query Parameters**:
    *   `title`, `status`, `priority`, `projectId`, `assignedTo`: Filters.
    *   `sortBy`, `limit`, `page`: Standard pagination options.
*   **Responses**:
    *   `200 OK`: Returns a paginated list of task objects.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks `getTasks` rights.

### `GET /v1/tasks/:taskId`

Retrieve a single task by ID.

*   **Description**: Fetches a single task's details.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `getTasks`
*   **Path Parameters**:
    *   `taskId` (string, required): The UUID of the task.
*   **Responses**:
    *   `200 OK`: Returns the task object.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks rights.
    *   `404 Not Found`: If task not found.

### `PATCH /v1/tasks/:taskId`

Update a task by ID.

*   **Description**: Updates specific fields of a task.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `manageTasks`
*   **Path Parameters**:
    *   `taskId` (string, required): The UUID of the task.
*   **Request Body**:
    *   `title`, `description`, `status`, `priority`, `dueDate`, `projectId`, `assignedTo` (all optional)
*   **Responses**:
    *   `200 OK`: Returns the updated task object.
    *   `400 Bad Request`: If validation fails.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks rights.
    *   `404 Not Found`: If task not found.

### `DELETE /v1/tasks/:taskId`

Delete a task by ID.

*   **Description**: Deletes a task.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `manageTasks`
*   **Path Parameters**:
    *   `taskId` (string, required): The UUID of the task.
*   **Responses**:
    *   `204 No Content`: Successful deletion.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks rights.
    *   `404 Not Found`: If task not found.

---

## 5. Comments

### `POST /v1/comments`

Create a new comment.

*   **Description**: Adds a new comment to a specified task. The `userId` is automatically set to the authenticated user's ID.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `manageComments`
*   **Request Body**:
    *   `content` (string, required): The comment text.
    *   `taskId` (string, required): UUID of the parent task.
*   **Responses**:
    *   `201 Created`: Returns the created comment object.
    *   `400 Bad Request`: If validation fails.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks `manageComments` rights.

### `GET /v1/comments`

Retrieve a list of comments.

*   **Description**: Fetches a paginated list of comments.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `getComments`
*   **Query Parameters**:
    *   `taskId` (string, optional): Filter by parent task UUID.
    *   `userId` (string, optional): Filter by user UUID who made the comment.
    *   `sortBy`, `limit`, `page`: Standard pagination options.
*   **Responses**:
    *   `200 OK`: Returns a paginated list of comment objects.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks `getComments` rights.

### `GET /v1/comments/:commentId`

Retrieve a single comment by ID.

*   **Description**: Fetches a single comment's details.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `getComments`
*   **Path Parameters**:
    *   `commentId` (string, required): The UUID of the comment.
*   **Responses**:
    *   `200 OK`: Returns the comment object.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks rights.
    *   `404 Not Found`: If comment not found.

### `PATCH /v1/comments/:commentId`

Update a comment by ID.

*   **Description**: Updates the content of a comment. Only the comment's creator or an administrator can update it.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `manageComments`
*   **Path Parameters**:
    *   `commentId` (string, required): The UUID of the comment.
*   **Request Body**:
    *   `content` (string, optional): The updated comment text.
*   **Responses**:
    *   `200 OK`: Returns the updated comment object.
    *   `400 Bad Request`: If validation fails.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks rights or is not the comment owner.
    *   `404 Not Found`: If comment not found.

### `DELETE /v1/comments/:commentId`

Delete a comment by ID.

*   **Description**: Deletes a comment. Only the comment's creator, project owner, or an administrator can delete it.
*   **Authentication**: JWT Access Token
*   **Required Rights**: `manageComments`
*   **Path Parameters**:
    *   `commentId` (string, required): The UUID of the comment.
*   **Responses**:
    *   `204 No Content`: Successful deletion.
    *   `401 Unauthorized`: If no token provided or invalid.
    *   `403 Forbidden`: If authenticated user lacks rights or is not authorized to delete the comment.
    *   `404 Not Found`: If comment not found.
```

**`docs/architecture.md`**
```markdown