```markdown
# Mobile Task Manager Backend API Documentation

This document provides a detailed overview of the API endpoints for the Mobile Task Manager Backend.

---

## Base URL

`https://your-api-domain.com/api/v1` (replace with your actual domain or `http://localhost:5000/api/v1` for local development)

---

## Authentication

All protected routes require a JSON Web Token (JWT) sent in the `Authorization` header as a Bearer token:

`Authorization: Bearer <your_access_token>`

### Register User

`POST /auth/register`

Registers a new user account.

*   **Request Body:**
    ```json
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "password": "Password123!"
    }
    ```
*   **Responses:**
    *   `201 Created`: User registered successfully.
        ```json
        {
          "status": "success",
          "message": "User registered successfully",
          "data": {
            "user": {
              "id": "uuid-string",
              "name": "John Doe",
              "email": "john.doe@example.com",
              "role": "user"
            },
            "accessToken": "jwt-token-string"
          }
        }
        ```
    *   `400 Bad Request`: Validation error (e.g., invalid email, weak password).
    *   `409 Conflict`: User with this email already exists.
        ```json
        {
          "status": "fail",
          "message": "User with this email already exists"
        }
        ```

### Login User

`POST /auth/login`

Authenticates a user and provides an access token. A refresh token is set as an `HttpOnly` cookie.

*   **Request Body:**
    ```json
    {
      "email": "john.doe@example.com",
      "password": "Password123!"
    }
    ```
*   **Responses:**
    *   `200 OK`: Login successful.
        ```json
        {
          "status": "success",
          "message": "Logged in successfully",
          "data": {
            "user": {
              "id": "uuid-string",
              "name": "John Doe",
              "email": "john.doe@example.com",
              "role": "user"
            },
            "accessToken": "jwt-token-string"
          }
        }
        ```
        **Cookies:** `Set-Cookie: jid=<refresh_token>; HttpOnly; Secure; Max-Age=...`
    *   `401 Unauthorized`: Incorrect email or password.
        ```json
        {
          "status": "fail",
          "message": "Incorrect email or password"
        }
        ```
    *   `429 Too Many Requests`: Rate limit exceeded.

### Logout User

`POST /auth/logout`

Logs out the current user by clearing the refresh token cookie.

*   **Headers:** `Cookie: jid=<refresh_token>` (optional, but recommended to ensure cookie is cleared)
*   **Responses:**
    *   `200 OK`: Logout successful.
        ```json
        {
          "status": "success",
          "message": "Logged out successfully"
        }
        ```
        **Cookies:** `Set-Cookie: jid=; HttpOnly; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT`

---

## User Profile

Requires **Authentication**

### Get My Profile

`GET /users/me`

Retrieves the profile of the authenticated user.

*   **Responses:**
    *   `200 OK`: User profile retrieved.
        ```json
        {
          "status": "success",
          "data": {
            "user": {
              "id": "uuid-string",
              "name": "John Doe",
              "email": "john.doe@example.com",
              "role": "user",
              "createdAt": "2023-10-27T10:00:00.000Z",
              "updatedAt": "2023-10-27T10:00:00.000Z"
            }
          }
        }
        ```
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: User not found (should not happen with valid token).

### Update My Profile

`PATCH /users/me`

Updates the profile of the authenticated user. Only provided fields are updated.

*   **Request Body:** (partial update)
    ```json
    {
      "name": "Johnny D.",
      "password": "NewSecurePassword123!"
    }
    ```
*   **Responses:**
    *   `200 OK`: User profile updated.
        ```json
        {
          "status": "success",
          "message": "User profile updated successfully",
          "data": {
            "user": {
              "id": "uuid-string",
              "name": "Johnny D.",
              "email": "john.doe@example.com",
              "role": "user",
              "createdAt": "2023-10-27T10:00:00.000Z",
              "updatedAt": "2023-10-27T10:30:00.000Z"
            }
          }
        }
        ```
    *   `400 Bad Request`: Validation error (e.g., invalid email format, password too short).
    *   `401 Unauthorized`: Invalid or missing token.
    *   `409 Conflict`: Email already in use by another user.

### Delete My Account

`DELETE /users/me`

Deletes the authenticated user's account and all associated tasks and categories.

*   **Responses:**
    *   `204 No Content`: Account deleted successfully.
    *   `401 Unauthorized`: Invalid or missing token.

---

## Categories

Requires **Authentication**

### Create Category

`POST /categories`

Creates a new task category for the authenticated user.

*   **Request Body:**
    ```json
    {
      "name": "Project Alpha"
    }
    ```
*   **Responses:**
    *   `201 Created`: Category created.
        ```json
        {
          "status": "success",
          "message": "Category created successfully",
          "data": {
            "category": {
              "id": "uuid-string",
              "name": "Project Alpha",
              "userId": "user-uuid-string",
              "createdAt": "2023-10-27T11:00:00.000Z",
              "updatedAt": "2023-10-27T11:00:00.000Z"
            }
          }
        }
        ```
    *   `400 Bad Request`: Validation error.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `409 Conflict`: Category with this name already exists for the user.

### Get All Categories

`GET /categories`

Retrieves all categories belonging to the authenticated user.

*   **Responses:**
    *   `200 OK`: List of categories.
        ```json
        {
          "status": "success",
          "results": 2,
          "data": {
            "categories": [
              { "id": "uuid-string-1", "name": "Work", "userId": "user-uuid-string", ... },
              { "id": "uuid-string-2", "name": "Personal", "userId": "user-uuid-string", ... }
            ]
          }
        }
        ```
    *   `401 Unauthorized`: Invalid or missing token.

### Get Category by ID

`GET /categories/:id`

Retrieves a specific category by its ID, ensuring it belongs to the authenticated user.

*   **Path Params:**
    *   `id` (string, UUID): The ID of the category.
*   **Responses:**
    *   `200 OK`: Category data.
        ```json
        {
          "status": "success",
          "data": {
            "category": {
              "id": "uuid-string-1",
              "name": "Work",
              "userId": "user-uuid-string",
              "createdAt": "2023-10-27T11:00:00.000Z",
              "updatedAt": "2023-10-27T11:00:00.000Z"
            }
          }
        }
        ```
    *   `400 Bad Request`: Invalid ID format.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: Category not found or not owned by the user.

### Update Category

`PATCH /categories/:id`

Updates a specific category by its ID, ensuring it belongs to the authenticated user.

*   **Path Params:**
    *   `id` (string, UUID): The ID of the category.
*   **Request Body:**
    ```json
    {
      "name": "Updated Work Category"
    }
    ```
*   **Responses:**
    *   `200 OK`: Category updated.
        ```json
        {
          "status": "success",
          "message": "Category updated successfully",
          "data": {
            "category": {
              "id": "uuid-string-1",
              "name": "Updated Work Category",
              "userId": "user-uuid-string",
              "createdAt": "2023-10-27T11:00:00.000Z",
              "updatedAt": "2023-10-27T11:30:00.000Z"
            }
          }
        }
        ```
    *   `400 Bad Request`: Invalid ID format or validation error.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: Category not found or not owned by the user.
    *   `409 Conflict`: Another category with the new name already exists for the user.

### Delete Category

`DELETE /categories/:id`

Deletes a specific category by its ID, ensuring it belongs to the authenticated user. Tasks associated with this category will have their `categoryId` set to `NULL` (due to `onDelete: SetNull` in Prisma schema).

*   **Path Params:**
    *   `id` (string, UUID): The ID of the category.
*   **Responses:**
    *   `204 No Content`: Category deleted successfully.
    *   `400 Bad Request`: Invalid ID format.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: Category not found or not owned by the user.

---

## Tasks

Requires **Authentication**

### Create Task

`POST /tasks`

Creates a new task for the authenticated user.

*   **Request Body:**
    ```json
    {
      "title": "Finish project report",
      "description": "Write and review the final project report for Q4.",
      "dueDate": "2023-11-15T17:00:00.000Z",
      "categoryId": "category-uuid-string",
      "status": "IN_PROGRESS"
    }
    ```
    *   `dueDate` should be an ISO 8601 string.
    *   `status` must be one of `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. Defaults to `PENDING`.
*   **Responses:**
    *   `201 Created`: Task created.
        ```json
        {
          "status": "success",
          "message": "Task created successfully",
          "data": {
            "task": {
              "id": "uuid-string",
              "title": "Finish project report",
              "description": "...",
              "dueDate": "2023-11-15T17:00:00.000Z",
              "status": "IN_PROGRESS",
              "userId": "user-uuid-string",
              "categoryId": "category-uuid-string",
              "createdAt": "2023-10-27T12:00:00.000Z",
              "updatedAt": "2023-10-27T12:00:00.000Z",
              "category": { "id": "category-uuid-string", "name": "Project Alpha" }
            }
          }
        }
        ```
    *   `400 Bad Request`: Validation error (e.g., invalid status, categoryId not found or not owned by user).
    *   `401 Unauthorized`: Invalid or missing token.

### Get All Tasks

`GET /tasks`

Retrieves all tasks belonging to the authenticated user, with optional filtering, sorting, and pagination.

*   **Query Parameters:**
    *   `status` (string, optional): Filter by task status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
    *   `categoryId` (string, UUID, optional): Filter by category ID.
    *   `search` (string, optional): Search by title or description (case-insensitive).
    *   `sortBy` (string, optional): Field to sort by (`createdAt`, `dueDate`, `title`, `status`). Default: `createdAt`.
    *   `sortOrder` (string, optional): Sort order (`asc` or `desc`). Default: `desc`.
    *   `page` (number, optional): Page number for pagination. Default: `1`.
    *   `limit` (number, optional): Number of tasks per page. Default: `10`.
*   **Responses:**
    *   `200 OK`: List of tasks.
        ```json
        {
          "status": "success",
          "results": 2,
          "data": {
            "tasks": [
              { "id": "uuid-string-1", "title": "Task A", "status": "PENDING", ... },
              { "id": "uuid-string-2", "title": "Task B", "status": "COMPLETED", ... }
            ]
          }
        }
        ```
    *   `400 Bad Request`: Validation error for query parameters.
    *   `401 Unauthorized`: Invalid or missing token.

### Get Task by ID

`GET /tasks/:id`

Retrieves a specific task by its ID, ensuring it belongs to the authenticated user.

*   **Path Params:**
    *   `id` (string, UUID): The ID of the task.
*   **Responses:**
    *   `200 OK`: Task data.
        ```json
        {
          "status": "success",
          "data": {
            "task": {
              "id": "uuid-string",
              "title": "Finish project report",
              "description": "...",
              "dueDate": "2023-11-15T17:00:00.000Z",
              "status": "IN_PROGRESS",
              "userId": "user-uuid-string",
              "categoryId": "category-uuid-string",
              "createdAt": "2023-10-27T12:00:00.000Z",
              "updatedAt": "2023-10-27T12:00:00.000Z",
              "category": { "id": "category-uuid-string", "name": "Project Alpha" }
            }
          }
        }
        ```
    *   `400 Bad Request`: Invalid ID format.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: Task not found or not owned by the user.

### Update Task

`PATCH /tasks/:id`

Updates a specific task by its ID, ensuring it belongs to the authenticated user. Only provided fields are updated.

*   **Path Params:**
    *   `id` (string, UUID): The ID of the task.
*   **Request Body:** (partial update)
    ```json
    {
      "description": "Updated description with new details.",
      "status": "COMPLETED"
    }
    ```
*   **Responses:**
    *   `200 OK`: Task updated.
        ```json
        {
          "status": "success",
          "message": "Task updated successfully",
          "data": {
            "task": {
              "id": "uuid-string",
              "title": "Finish project report",
              "description": "Updated description with new details.",
              "dueDate": "2023-11-15T17:00:00.000Z",
              "status": "COMPLETED",
              "userId": "user-uuid-string",
              "categoryId": "category-uuid-string",
              "createdAt": "2023-10-27T12:00:00.000Z",
              "updatedAt": "2023-10-27T12:30:00.000Z",
              "category": { "id": "category-uuid-string", "name": "Project Alpha" }
            }
          }
        }
        ```
    *   `400 Bad Request`: Invalid ID format, validation error, or categoryId not found/not owned.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: Task not found or not owned by the user.

### Delete Task

`DELETE /tasks/:id`

Deletes a specific task by its ID, ensuring it belongs to the authenticated user.

*   **Path Params:**
    *   `id` (string, UUID): The ID of the task.
*   **Responses:**
    *   `204 No Content`: Task deleted successfully.
    *   `400 Bad Request`: Invalid ID format.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: Task not found or not owned by the user.

---

## Common Error Responses

All error responses follow a consistent JSON structure:

```json
{
  "status": "fail" | "error",
  "message": "A descriptive error message",
  "errors": [ /* Optional: array of specific validation errors */ ]
}
```

*   `4xx` errors (e.g., `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `429 Too Many Requests`) will have `status: "fail"`.
*   `5xx` errors (e.g., `500 Internal Server Error`, `503 Service Unavailable`) will have `status: "error"`.
*   In a development environment, `5xx` errors might include a `stack` trace for debugging. In production, sensitive details are omitted.
```

**Architecture Documentation**