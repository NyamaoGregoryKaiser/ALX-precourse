```markdown
# Mobile Task Backend API Documentation

This document provides a comprehensive overview of the RESTful API endpoints for the Mobile Task Management Backend.

## Base URL

`http://localhost:3000/api/v1` (for local development)

## Authentication

All protected endpoints require a JSON Web Token (JWT) sent in the `Authorization` header as a Bearer token.

**Example:**

`Authorization: Bearer <YOUR_JWT_TOKEN>`

Upon successful login, the JWT token is returned in the response body and also set as an `HttpOnly` cookie named `jwt`. For mobile clients, you should store the token securely (e.g., Secure Storage in React Native, KeyChain in iOS, SharedPreferences in Android) and include it in the `Authorization` header for subsequent requests.

## Error Responses

The API returns standardized JSON error responses in case of failures:

```json
{
  "status": "fail" | "error",
  "message": "Descriptive error message",
  "error": { /* Optional: detailed error object in development mode */ },
  "stack": "..." /* Optional: stack trace in development mode */
}
```

**Common Status Codes:**

*   `200 OK`: Request successful.
*   `201 Created`: Resource successfully created.
*   `204 No Content`: Request successful, but no content to return (e.g., deletion).
*   `400 Bad Request`: Invalid input data (e.g., validation error).
*   `401 Unauthorized`: Authentication required or invalid token.
*   `403 Forbidden`: Authenticated, but user does not have necessary permissions.
*   `404 Not Found`: Resource not found.
*   `409 Conflict`: Resource already exists (e.g., duplicate email/username).
*   `429 Too Many Requests`: Rate limit exceeded.
*   `500 Internal Server Error`: Unexpected server error.

## Schemas

### User

Represents a user in the system.

| Field      | Type     | Description                                | Example               |
| :--------- | :------- | :----------------------------------------- | :-------------------- |
| `id`       | `string` | Unique identifier for the user (UUID)      | `a1b2c3d4-e5f6-7890-...` |
| `username` | `string` | Unique username                            | `johndoe`             |
| `email`    | `string` | Unique email address                       | `john.doe@example.com` |
| `role`     | `string` | User's role (`USER`, `ADMIN`)              | `USER`                |
| `createdAt`| `string` | Date and time of user creation (ISO 8601)  | `2024-07-20T10:00:00Z` |
| `updatedAt`| `string` | Date and time of last update (ISO 8601)    | `2024-07-20T10:30:00Z` |
| `password` | `string` | **(Hidden)** Hashed password (not returned in API responses) | |

### Category

Represents a user-defined category for tasks.

| Field      | Type     | Description                                | Example               |
| :--------- | :------- | :----------------------------------------- | :-------------------- |
| `id`       | `string` | Unique identifier for the category (UUID)  | `cat123-abc-...`      |
| `name`     | `string` | Name of the category                       | `Work Tasks`          |
| `userId`   | `string` | ID of the user who owns this category      | `a1b2c3d4-e5f6-7890-...` |
| `createdAt`| `string` | Date and time of creation (ISO 8601)       | `2024-07-20T11:00:00Z` |
| `updatedAt`| `string` | Date and time of last update (ISO 8601)    | `2024-07-20T11:05:00Z` |

### Task

Represents a single task.

| Field         | Type     | Description                                | Example               |
| :------------ | :------- | :----------------------------------------- | :-------------------- |
| `id`          | `string` | Unique identifier for the task (UUID)      | `task123-xyz-...`     |
| `title`       | `string` | Title of the task                          | `Buy groceries`       |
| `description` | `string` | Optional detailed description              | `Milk, eggs, bread.`  |
| `status`      | `string` | Current status (`PENDING`, `IN_PROGRESS`, `COMPLETED`) | `PENDING`             |
| `priority`    | `string` | Priority level (`LOW`, `MEDIUM`, `HIGH`)   | `MEDIUM`              |
| `dueDate`     | `string` | Optional due date and time (ISO 8601)      | `2024-07-25T17:00:00Z` |
| `userId`      | `string` | ID of the user who owns this task          | `a1b2c3d4-e5f6-7890-...` |
| `categoryId`  | `string` | Optional ID of the associated category     | `cat123-abc-...`      |
| `category`    | `object` | **(Optional, populated on `GET` task/tasks)** Nested category object `{ id, name }` | `{ "id": "...", "name": "Work" }` |
| `createdAt`   | `string` | Date and time of creation (ISO 8601)       | `2024-07-20T12:00:00Z` |
| `updatedAt`   | `string` | Date and time of last update (ISO 8601)    | `2024-07-20T12:00:00Z` |

---

## API Endpoints

### 1. Authentication (`/api/v1/auth`)

#### `POST /register`
Registers a new user.

*   **Request Body:**
    ```json
    {
      "username": "string",
      "email": "string (email)",
      "password": "string (min 8 chars)"
    }
    ```
*   **Response:** `201 Created`
    ```json
    {
      "status": "success",
      "token": "jwt_token_string",
      "data": { "user": { /* User object without password */ } }
    }
    ```

#### `POST /login`
Logs in an existing user. Sets an `HttpOnly` JWT cookie.

*   **Request Body:**
    ```json
    {
      "email": "string (email)",
      "password": "string"
    }
    ```
*   **Response:** `200 OK`
    ```json
    {
      "status": "success",
      "token": "jwt_token_string",
      "data": { "user": { /* User object without password */ } }
    }
    ```

#### `POST /logout`
Logs out the authenticated user. Clears the JWT cookie.

*   **Authentication:** Required
*   **Response:** `200 OK`
    ```json
    {
      "status": "success",
      "message": "Logged out successfully"
    }
    ```

---

### 2. User Management (`/api/v1/users`)

#### `GET /me`
Retrieves the profile of the currently authenticated user.

*   **Authentication:** Required
*   **Response:** `200 OK`
    ```json
    {
      "status": "success",
      "data": { "user": { /* User object */ } }
    }
    ```

#### `PATCH /update-me`
Updates the profile information of the currently authenticated user.

*   **Authentication:** Required
*   **Request Body:**
    ```json
    {
      "username": "string (optional)",
      "email": "string (email, optional)"
    }
    ```
*   **Response:** `200 OK`
    ```json
    {
      "status": "success",
      "data": { "user": { /* Updated User object */ } }
    }
    ```

#### `PATCH /update-password`
Updates the password of the currently authenticated user.

*   **Authentication:** Required
*   **Request Body:**
    ```json
    {
      "currentPassword": "string",
      "newPassword": "string (min 8 chars)"
    }
    ```
*   **Response:** `200 OK`
    ```json
    {
      "status": "success",
      "message": "Password updated successfully."
    }
    ```

#### `DELETE /deactivate-me`
Deactivates (deletes) the account of the currently authenticated user.

*   **Authentication:** Required
*   **Response:** `204 No Content`

---

#### Admin-only User Endpoints

Requires `ADMIN` role.

#### `GET /`
Retrieves a list of all users. Supports filtering, sorting, and pagination.

*   **Authentication:** Required (Admin)
*   **Query Parameters:**
    *   `page`: `number` (Default: 1)
    *   `limit`: `number` (Default: 20, Max: 100)
    *   `sort`: `string` (e.g., `-createdAt`, `username,-email`)
    *   `fields`: `string` (e.g., `id,username,email`)
    *   `email`: `string` (filter by email)
    *   `username`: `string` (filter by username)
    *   `role`: `string` (`USER`, `ADMIN`) (filter by role)
*   **Response:** `200 OK`
    ```json
    {
      "status": "success",
      "results": "number",
      "total": "number",
      "data": { "users": [ { /* User object */ }, ... ] }
    }
    ```

#### `GET /:id`
Retrieves a specific user by ID.

*   **Authentication:** Required (Admin)
*   **Path Parameters:**
    *   `id`: `string` (User ID - UUID)
*   **Response:** `200 OK`
    ```json
    {
      "status": "success",
      "data": { "user": { /* User object */ } }
    }
    ```

#### `PATCH /:id/role`
Updates a user's role.

*   **Authentication:** Required (Admin)
*   **Path Parameters:**
    *   `id`: `string` (User ID - UUID)
*   **Request Body:**
    ```json
    {
      "role": "string (USER or ADMIN)"
    }
    ```
*   **Response:** `200 OK`
    ```json
    {
      "status": "success",
      "data": { "user": { /* Updated User object */ } }
    }
    ```

#### `DELETE /:id`
Deletes a user account.

*   **Authentication:** Required (Admin)
*   **Path Parameters:**
    *   `id`: `string` (User ID - UUID)
*   **Response:** `204 No Content`

---

### 3. Category Management (`/api/v1/categories`)

All category endpoints require user authentication.

#### `POST /`
Creates a new task category for the authenticated user.

*   **Authentication:** Required
*   **Request Body:**
    ```json
    {
      "name": "string (min 1, max 50 chars)"
    }
    ```
*   **Response:** `201 Created`
    ```json
    {
      "status": "success",
      "data": { "category": { /* Category object */ } }
    }
    ```

#### `GET /`
Retrieves all task categories for the authenticated user. Supports filtering, sorting, and pagination.

*   **Authentication:** Required
*   **Query Parameters:**
    *   `page`: `number` (Default: 1)
    *   `limit`: `number` (Default: 20, Max: 100)
    *   `sort`: `string` (e.g., `name`, `-createdAt`)
    *   `name`: `string` (filter by category name)
*   **Response:** `200 OK`
    ```json
    {
      "status": "success",
      "results": "number",
      "total": "number",
      "data": { "categories": [ { /* Category object */ }, ... ] }
    }
    ```

#### `GET /:id`
Retrieves a specific task category by ID.

*   **Authentication:** Required
*   **Path Parameters:**
    *   `id`: `string` (Category ID - UUID)
*   **Response:** `200 OK`
    ```json
    {
      "status": "success",
      "data": { "category": { /* Category object */ } }
    }
    ```

#### `PATCH /:id`
Updates a task category.

*   **Authentication:** Required
*   **Path Parameters:**
    *   `id`: `string` (Category ID - UUID)
*   **Request Body:**
    ```json
    {
      "name": "string (min 1, max 50 chars)"
    }
    ```
*   **Response:** `200 OK`
    ```json
    {
      "status": "success",
      "data": { "category": { /* Updated Category object */ } }
    }
    ```

#### `DELETE /:id`
Deletes a task category. Tasks previously associated with this category will have their `categoryId` set to `null`.

*   **Authentication:** Required
*   **Path Parameters:**
    *   `id`: `string` (Category ID - UUID)
*   **Response:** `204 No Content`

---

### 4. Task Management (`/api/v1/tasks`)

All task endpoints require user authentication.

#### `POST /`
Creates a new task for the authenticated user.

*   **Authentication:** Required
*   **Request Body:**
    ```json
    {
      "title": "string (min 1, max 255 chars)",
      "description": "string (max 1000 chars, optional, nullable)",
      "status": "string (PENDING, IN_PROGRESS, COMPLETED, default: PENDING)",
      "priority": "string (LOW, MEDIUM, HIGH, default: MEDIUM)",
      "dueDate": "string (ISO 8601 date-time, optional, nullable)",
      "categoryId": "string (UUID, optional, nullable)"
    }
    ```
*   **Response:** `201 Created`
    ```json
    {
      "status": "success",
      "data": { "task": { /* Task object */ } }
    }
    ```

#### `GET /`
Retrieves all tasks for the authenticated user. Supports filtering, sorting, and pagination.

*   **Authentication:** Required
*   **Query Parameters:**
    *   `page`: `number` (Default: 1)
    *   `limit`: `number` (Default: 20, Max: 100)
    *   `sort`: `string` (e.g., `-dueDate`, `status,priority`)
    *   `fields`: `string` (e.g., `id,title,status`)
    *   `title`: `string` (filter by task title - partial match)
    *   `status`: `string` (`PENDING`, `IN_PROGRESS`, `COMPLETED`)
    *   `priority`: `string` (`LOW`, `MEDIUM`, `HIGH`)
    *   `dueDate`: `string` (ISO 8601 date-time, filter by exact date)
    *   `dueDate[gt]`: `string` (ISO 8601 date-time, filter tasks due after this date)
    *   `dueDate[lt]`: `string` (ISO 8601 date-time, filter tasks due before this date)
    *   `categoryId`: `string` (UUID, filter by category ID, use `null` string to filter tasks without category)
*   **Response:** `200 OK`
    ```json
    {
      "status": "success",
      "results": "number",
      "total": "number",
      "data": { "tasks": [ { /* Task object with nested category */ }, ... ] }
    }
    ```

#### `GET /:id`
Retrieves a specific task by ID.

*   **Authentication:** Required
*   **Path Parameters:**
    *   `id`: `string` (Task ID - UUID)
*   **Response:** `200 OK`
    ```json
    {
      "status": "success",
      "data": { "task": { /* Task object with nested category */ } }
    }
    ```

#### `PATCH /:id`
Updates a task.

*   **Authentication:** Required
*   **Path Parameters:**
    *   `id`: `string` (Task ID - UUID)
*   **Request Body:**
    ```json
    {
      "title": "string (optional)",
      "description": "string (optional, nullable)",
      "status": "string (optional, PENDING, IN_PROGRESS, COMPLETED)",
      "priority": "string (optional, LOW, MEDIUM, HIGH)",
      "dueDate": "string (ISO 8601 date-time, optional, nullable)",
      "categoryId": "string (UUID, optional, nullable)"
    }
    ```
*   **Response:** `200 OK`
    ```json
    {
      "status": "success",
      "data": { "task": { /* Updated Task object */ } }
    }
    ```

#### `DELETE /:id`
Deletes a task.

*   **Authentication:** Required
*   **Path Parameters:**
    *   `id`: `string` (Task ID - UUID)
*   **Response:** `204 No Content`

---

## Conclusion

This API documentation covers all major functionalities of the Mobile Task Backend. For detailed request/response examples and schema definitions, please refer to the OpenAPI/Swagger specification (if generated) or directly to the route definitions within the codebase.
```