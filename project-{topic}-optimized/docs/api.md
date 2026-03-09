```markdown
# API Documentation

This document provides a high-level overview of the API endpoints for the ALX Comprehensive CMS. For interactive documentation, please refer to the [Swagger UI](#8-api-documentation) at `http://localhost:3000/api-docs` when the backend is running.

## Base URL

`http://localhost:3000/` (or your deployed backend URL)

## Authentication

All protected endpoints require a JSON Web Token (JWT) in the `Authorization` header.

**Header Example:**
`Authorization: Bearer <YOUR_ACCESS_TOKEN>`

### `POST /auth/login`

*   **Description:** Authenticates a user and returns an access token.
*   **Request Body:**
    ```json
    {
      "email": "string",
      "password": "string"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "accessToken": "string"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid credentials.
    *   `400 Bad Request`: Validation errors.

### `POST /auth/register`

*   **Description:** Registers a new user with `SUBSCRIBER` role by default.
*   **Request Body:**
    ```json
    {
      "email": "string",
      "password": "string",
      "firstName": "string",
      "lastName": "string"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "id": "string (uuid)",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "role": "subscriber",
      "createdAt": "date-time",
      "updatedAt": "date-time"
    }
    ```
*   **Error Responses:**
    *   `409 Conflict`: User with this email already exists.
    *   `400 Bad Request`: Validation errors.

## Users Module

### `GET /users`

*   **Description:** Retrieves a list of all users.
*   **Authentication:** Required (Admin or Editor roles only).
*   **Success Response (200 OK):**
    ```json
    [
      {
        "id": "string (uuid)",
        "email": "string",
        "firstName": "string",
        "lastName": "string",
        "role": "string",
        "createdAt": "date-time",
        "updatedAt": "date-time"
      }
      // ... more users
    ]
    ```

### `GET /users/:id`

*   **Description:** Retrieves a single user by ID.
*   **Authentication:** Required (Admin or Editor roles, or user's own ID).
*   **Parameters:** `id` (uuid) - The ID of the user.
*   **Success Response (200 OK):**
    ```json
    {
      "id": "string (uuid)",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "role": "string",
      "createdAt": "date-time",
      "updatedAt": "date-time"
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: User not found.
    *   `403 Forbidden`: Insufficient permissions.

### `PATCH /users/:id`

*   **Description:** Updates an existing user's information.
*   **Authentication:** Required (Admin role, or user's own ID).
*   **Parameters:** `id` (uuid) - The ID of the user.
*   **Request Body:** (Partial update, any combination of fields)
    ```json
    {
      "firstName": "string",
      "lastName": "string",
      "password": "string",
      "role": "string (enum: admin, editor, author, subscriber)"
    }
    ```
*   **Success Response (200 OK):** Returns the updated user object.
*   **Error Responses:**
    *   `404 Not Found`: User not found.
    *   `403 Forbidden`: Insufficient permissions (e.g., non-admin trying to change role).
    *   `400 Bad Request`: Validation errors.

### `DELETE /users/:id`

*   **Description:** Deletes a user.
*   **Authentication:** Required (Admin role only).
*   **Parameters:** `id` (uuid) - The ID of the user.
*   **Success Response (200 OK):** Returns the deleted user object.
*   **Error Responses:**
    *   `404 Not Found`: User not found.
    *   `403 Forbidden`: Insufficient permissions.

## Posts Module

### `POST /posts`

*   **Description:** Creates a new post.
*   **Authentication:** Required (Admin, Editor, or Author roles).
*   **Request Body:**
    ```json
    {
      "title": "string",
      "content": "string",
      "slug": "string",
      "status": "string (enum: draft, published, archived) - optional, defaults to 'draft'"
    }
    ```
*   **Success Response (201 Created):** Returns the newly created post.
*   **Error Responses:**
    *   `409 Conflict`: Post with this slug already exists.
    *   `400 Bad Request`: Validation errors.

### `GET /posts`

*   **Description:** Retrieves a list of all posts.
*   **Authentication:** Required (Admin, Editor, or Author roles for all posts; Subscribers only see 'published' posts).
*   **Query Parameters (Optional):**
    *   `status`: Filter by post status (`draft`, `published`, `archived`).
*   **Success Response (200 OK):** Returns an array of post objects.

### `GET /posts/:id`

*   **Description:** Retrieves a single post by ID.
*   **Authentication:** Required (Admin, Editor, Author roles for any post; Subscribers for 'published' posts).
*   **Parameters:** `id` (uuid) - The ID of the post.
*   **Success Response (200 OK):** Returns the post object.
*   **Error Responses:**
    *   `404 Not Found`: Post not found.
    *   `403 Forbidden`: Insufficient permissions for accessing a non-published post.

### `PATCH /posts/:id`

*   **Description:** Updates an existing post.
*   **Authentication:** Required (Admin or Editor roles, or Author of the post).
*   **Parameters:** `id` (uuid) - The ID of the post.
*   **Request Body:** (Partial update, any combination of fields)
    ```json
    {
      "title": "string",
      "content": "string",
      "slug": "string",
      "status": "string (enum: draft, published, archived)"
    }
    ```
*   **Success Response (200 OK):** Returns the updated post object.
*   **Error Responses:**
    *   `404 Not Found`: Post not found.
    *   `403 Forbidden`: Insufficient permissions.
    *   `400 Bad Request`: Validation errors.

### `DELETE /posts/:id`

*   **Description:** Deletes a post.
*   **Authentication:** Required (Admin or Editor roles, or Author of the post).
*   **Parameters:** `id` (uuid) - The ID of the post.
*   **Success Response (200 OK):** Returns the deleted post object.
*   **Error Responses:**
    *   `404 Not Found`: Post not found.
    *   `403 Forbidden`: Insufficient permissions.
```