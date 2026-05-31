```markdown
# ALX CMS API Documentation

This document provides a high-level overview of the RESTful API endpoints for the ALX Content Management System. For interactive documentation and testing, please refer to the Swagger UI at `/api-docs` when the backend is running.

**Base URL:** `http://localhost:3000/api/v1` (or your deployed backend URL)

## Authentication

All protected endpoints require a JSON Web Token (JWT) provided in the `Authorization` header as a Bearer token: `Authorization: Bearer <your_jwt_token>`.

### 1. `POST /auth/login`

Authenticate a user to obtain a JWT.

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
      "access_token": "string",
      "user": {
        "id": "uuid",
        "username": "string",
        "email": "string",
        "role": "admin | editor | author | reader"
      }
    }
    ```
*   **Error Responses:** 401 Unauthorized

### 2. `POST /auth/register`

Register a new user. Default role is typically `author`.

*   **Request Body:**
    ```json
    {
      "username": "string",
      "email": "string",
      "password": "string",
      "role": "author | reader"  # Admin/Editor roles typically not allowed for self-registration
    }
    ```
*   **Success Response (201 Created):** Same as login success response.
*   **Error Responses:** 400 Bad Request (validation, email/username exists), 401 Unauthorized (if attempting to register with disallowed role).

---

## Users Module

### `GET /users`

Retrieve a list of all users.
*   **Authentication:** Required (`ADMIN`, `EDITOR` roles)
*   **Success Response (200 OK):** `User[]` array. Password is excluded.
*   **Error Responses:** 401 Unauthorized, 403 Forbidden

### `GET /users/:id`

Retrieve a single user by ID.
*   **Authentication:** Required (`ADMIN`, `EDITOR`, `AUTHOR` roles)
*   **Success Response (200 OK):** `User` object.
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found

### `POST /users`

Create a new user.
*   **Authentication:** Required (`ADMIN` role)
*   **Request Body:** `CreateUserDto` (see backend DTO)
*   **Success Response (201 Created):** `User` object.
*   **Error Responses:** 400 Bad Request, 401 Unauthorized, 403 Forbidden

### `PATCH /users/:id`

Update an existing user.
*   **Authentication:** Required (`ADMIN`, `EDITOR` roles)
*   **Request Body:** `UpdateUserDto` (partial `CreateUserDto`, see backend DTO)
*   **Success Response (200 OK):** `User` object.
*   **Error Responses:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found

### `DELETE /users/:id`

Delete a user.
*   **Authentication:** Required (`ADMIN` role)
*   **Success Response (204 No Content)**
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found

---

## Categories Module

### `GET /categories`

Retrieve a list of all content categories.
*   **Authentication:** Optional (Publicly accessible)
*   **Caching:** Applied (responds from cache if available)
*   **Success Response (200 OK):** `Category[]` array.
*   **Error Responses:** None specific, standard HTTP errors.

### `GET /categories/:id`

Retrieve a single category by ID.
*   **Authentication:** Optional (Publicly accessible)
*   **Caching:** Applied
*   **Success Response (200 OK):** `Category` object.
*   **Error Responses:** 404 Not Found

### `POST /categories`

Create a new category.
*   **Authentication:** Required (`ADMIN`, `EDITOR` roles)
*   **Request Body:** `CreateCategoryDto` (see backend DTO)
*   **Success Response (201 Created):** `Category` object.
*   **Error Responses:** 400 Bad Request, 401 Unauthorized, 403 Forbidden

### `PATCH /categories/:id`

Update an existing category.
*   **Authentication:** Required (`ADMIN`, `EDITOR` roles)
*   **Request Body:** `UpdateCategoryDto` (partial `CreateCategoryDto`, see backend DTO)
*   **Success Response (200 OK):** `Category` object.
*   **Error Responses:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found

### `DELETE /categories/:id`

Delete a category.
*   **Authentication:** Required (`ADMIN`, `EDITOR` roles)
*   **Success Response (204 No Content)**
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found

---

## Posts Module

### `GET /posts`

Retrieve a list of posts. Can be filtered by `status`.
*   **Authentication:** Optional (Publicly accessible)
*   **Query Parameters:**
    *   `status`: (Optional) `published | draft | pending_review | archived` - Filters posts by their status.
*   **Caching:** Applied
*   **Success Response (200 OK):** `Post[]` array, including `author` and `category` details (eager loaded).
*   **Error Responses:** None specific.

### `GET /posts/:id`

Retrieve a single post by ID.
*   **Authentication:** Optional (Publicly accessible)
*   **Caching:** Applied
*   **Success Response (200 OK):** `Post` object, including `author` and `category` details.
*   **Error Responses:** 404 Not Found

### `POST /posts`

Create a new post. The `authorId` is derived from the authenticated user's token.
*   **Authentication:** Required (`ADMIN`, `EDITOR`, `AUTHOR` roles)
*   **Request Body:** `CreatePostDto` (see backend DTO)
*   **Success Response (201 Created):** `Post` object.
*   **Error Responses:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found (if `categoryId` is invalid)

### `PATCH /posts/:id`

Update an existing post.
*   **Authentication:** Required (`ADMIN`, `EDITOR`, `AUTHOR` roles). Authors can only update their own posts.
*   **Request Body:** `UpdatePostDto` (partial `CreatePostDto`, see backend DTO)
*   **Success Response (200 OK):** `Post` object.
*   **Error Responses:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found

### `DELETE /posts/:id`

Delete a post.
*   **Authentication:** Required (`ADMIN`, `EDITOR` roles)
*   **Success Response (204 No Content)**
*   **Error Responses:** 401 Unauthorized, 403 Forbidden, 404 Not Found

---
```