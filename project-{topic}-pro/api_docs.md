# ALX CMS Backend API Documentation

This document describes the RESTful API endpoints for the ALX Content Management System backend.

**Base URL:** `http://localhost:9080` (or `/api/` if accessed via frontend Nginx proxy)

## Authentication

All protected endpoints require a JWT (JSON Web Token) provided in the `Authorization` header as `Bearer <token>`.

### 1. Register User

*   **URL:** `/auth/register`
*   **Method:** `POST`
*   **Description:** Creates a new user account. Default role is 'user'.
*   **Request Body (application/json):**
    ```json
    {
      "username": "john_doe",
      "email": "john.doe@example.com",
      "password": "StrongPassword123!",
      "role": "editor" // Optional, ignored for non-admin registrations
    }
    ```
*   **Responses:**
    *   `201 Created`:
        ```json
        {
          "id": 1,
          "username": "john_doe",
          "email": "john.doe@example.com",
          "role": "user",
          "createdAt": 1678886400,
          "updatedAt": 1678886400
        }
        ```
    *   `400 Bad Request`: Invalid input (e.g., missing fields, weak password).
    *   `409 Conflict`: User with this email already exists.
    *   `500 Internal Server Error`: Server-side error.

### 2. Login User

*   **URL:** `/auth/login`
*   **Method:** `POST`
*   **Description:** Authenticates a user and returns a JWT.
*   **Request Body (application/json):**
    ```json
    {
      "email": "john.doe@example.com",
      "password": "StrongPassword123!"
    }
    ```
*   **Responses:**
    *   `200 OK`:
        ```json
        {
          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "userId": 1,
          "username": "john_doe",
          "role": "user"
        }
        ```
    *   `400 Bad Request`: Missing email or password.
    *   `401 Unauthorized`: Invalid credentials.
    *   `500 Internal Server Error`: Server-side error.

---

## User Management (Protected - Admin/Self-owned)

### 3. Get All Users

*   **URL:** `/users`
*   **Method:** `GET`
*   **Description:** Retrieves a list of all users.
*   **Authorization:** Required (Admin only).
*   **Query Parameters:**
    *   `limit` (optional, default: 100): Maximum number of users to return.
    *   `offset` (optional, default: 0): Number of users to skip.
*   **Responses:**
    *   `200 OK`: Array of user objects.
        ```json
        [
          { "id": 1, "username": "adminuser", "email": "admin@example.com", "role": "admin", ... },
          { "id": 2, "username": "editoruser", "email": "editor@example.com", "role": "editor", ... }
        ]
        ```
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: User does not have admin role.

### 4. Get User by ID

*   **URL:** `/users/:id`
*   **Method:** `GET`
*   **Description:** Retrieves a specific user by their ID.
*   **Authorization:** Required (Admin or the user themselves).
*   **Path Parameters:**
    *   `id` (integer): The ID of the user.
*   **Responses:**
    *   `200 OK`: User object.
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: User not authorized to view this profile.
    *   `404 Not Found`: User not found.

### 5. Update User

*   **URL:** `/users/:id`
*   **Method:** `PUT`
*   **Description:** Updates an existing user's information.
*   **Authorization:** Required (Admin or the user themselves for specific fields).
*   **Path Parameters:**
    *   `id` (integer): The ID of the user to update.
*   **Request Body (application/json):**
    ```json
    {
      "username": "new_username",          // Optional
      "email": "new_email@example.com",    // Optional
      "password": "NewStrongPassword123!", // Optional
      "role": "editor"                     // Optional, Admin only can change roles
    }
    ```
*   **Responses:**
    *   `200 OK`: Updated user object.
    *   `400 Bad Request`: Invalid input.
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: User not authorized to update these fields or this user.
    *   `404 Not Found`: User not found.

### 6. Delete User

*   **URL:** `/users/:id`
*   **Method:** `DELETE`
*   **Description:** Deletes a user account.
*   **Authorization:** Required (Admin only).
*   **Path Parameters:**
    *   `id` (integer): The ID of the user to delete.
*   **Responses:**
    *   `204 No Content`: User successfully deleted.
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: User does not have admin role.
    *   `404 Not Found`: User not found.

---

## Content Management (Protected - Editor/Admin)

### 7. Create Content

*   **URL:** `/content`
*   **Method:** `POST`
*   **Description:** Creates a new content item (post, page, etc.).
*   **Authorization:** Required (Editor or Admin).
*   **Request Body (application/json):**
    ```json
    {
      "title": "My Awesome Article",
      "slug": "my-awesome-article",
      "body": "<p>This is the content of the article.</p>",
      "summary": "A brief summary of the article.",
      "image_url": "http://example.com/image.jpg",
      "status": "draft",       // "draft", "published", "archived"
      "type": "post",          // "post", "page"
      "authorId": 1,           // Must be valid user ID (usually the authenticated user's ID)
      "categoryId": 1          // Optional
    }
    ```
*   **Responses:**
    *   `201 Created`: Content object.
    *   `400 Bad Request`: Invalid input (e.g., missing fields, duplicate slug).
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: User not authorized to create content.
    *   `500 Internal Server Error`: Server-side error.

### 8. Get All Content (Public/Protected)

*   **URL:** `/content`
*   **Method:** `GET`
*   **Description:** Retrieves a list of content items. Can filter by status.
*   **Authorization:** Optional. If unauthenticated, only `published` content is returned. If authenticated as Editor/Admin, can view `draft`, `archived` content as well.
*   **Query Parameters:**
    *   `status` (optional, default: 'published' for public, or all for authenticated editor/admin): `draft`, `published`, `archived`.
    *   `type` (optional): `post`, `page`.
    *   `categoryId` (optional): Filter by category ID.
    *   `authorId` (optional): Filter by author ID.
    *   `limit` (optional, default: 100).
    *   `offset` (optional, default: 0).
*   **Responses:**
    *   `200 OK`: Array of content objects.
    *   `401 Unauthorized`: Invalid token if status other than 'published' is requested by non-admin.

### 9. Get Content by Slug/ID

*   **URL:** `/content/:slugOrId`
*   **Method:** `GET`
*   **Description:** Retrieves a single content item by its slug or ID.
*   **Authorization:** Optional (published content is public). Required for draft/archived content.
*   **Path Parameters:**
    *   `slugOrId` (string/integer): The slug or ID of the content.
*   **Responses:**
    *   `200 OK`: Content object.
    *   `401 Unauthorized`: Attempt to access draft/archived content without authentication.
    *   `403 Forbidden`: User not authorized to view this content.
    *   `404 Not Found`: Content not found.

### 10. Update Content

*   **URL:** `/content/:id`
*   **Method:** `PUT`
*   **Description:** Updates an existing content item.
*   **Authorization:** Required (Admin, or Editor who is the author of the content).
*   **Path Parameters:**
    *   `id` (integer): The ID of the content to update.
*   **Request Body (application/json):** (Fields are optional for partial updates)
    ```json
    {
      "title": "Updated Article Title",
      "status": "published",
      "categoryId": 2
      // ... other fields
    }
    ```
*   **Responses:**
    *   `200 OK`: Updated content object.
    *   `400 Bad Request`: Invalid input.
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: User not authorized to update this content.
    *   `404 Not Found`: Content not found.

### 11. Delete Content

*   **URL:** `/content/:id`
*   **Method:** `DELETE`
*   **Description:** Deletes a content item.
*   **Authorization:** Required (Admin, or Editor who is the author).
*   **Path Parameters:**
    *   `id` (integer): The ID of the content to delete.
*   **Responses:**
    *   `204 No Content`: Content successfully deleted.
    *   `401 Unauthorized`: No token or invalid token.
    *   `403 Forbidden`: User not authorized to delete this content.
    *   `404 Not Found`: Content not found.

---

## Category Management (Protected - Editor/Admin)

### 12. Create Category

*   **URL:** `/categories`
*   **Method:** `POST`
*   **Description:** Creates a new category.
*   **Authorization:** Required (Editor or Admin).
*   **Request Body (application/json):**
    ```json
    {
      "name": "Programming",
      "slug": "programming",
      "description": "Articles about various programming languages and concepts."
    }
    ```
*   **Responses:**
    *   `201 Created`: Category object.
    *   `400 Bad Request`: Invalid input (e.g., duplicate slug).

### 13. Get All Categories

*   **URL:** `/categories`
*   **Method:** `GET`
*   **Description:** Retrieves all categories.
*   **Authorization:** Optional (Public access).
*   **Responses:**
    *   `200 OK`: Array of category objects.

---
(Similar sections for Comments Management, each with CRUD operations and detailed API specifications.)
```

#### `architecture.md`
```markdown