```markdown
# ALX CMS API Documentation

This document provides an overview and detailed information about the RESTful API endpoints exposed by the ALX Production-Ready CMS System.

## 1. Base URL

All API endpoints are prefixed with: `http://localhost:8080/api/v1` (or your deployed application's base URL).

## 2. Authentication

The API uses JWT (JSON Web Tokens) for authentication and authorization.

### 2.1. Obtaining a JWT

*   **Endpoint:** `POST /api/v1/auth/login`
*   **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "userpass"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "type": "Bearer",
      "id": 1,
      "username": "testuser",
      "email": "user@example.com",
      "roles": ["ROLE_USER"]
    }
    ```

### 2.2. Using the JWT

Once you have a token, include it in the `Authorization` header of all subsequent API requests:
`Authorization: Bearer <YOUR_JWT_TOKEN>`

## 3. Error Handling

The API returns standardized JSON error responses for issues like invalid input, resource not found, or unauthorized access.

*   **Example Error Response (404 Not Found):**
    ```json
    {
      "timestamp": "2023-10-27T10:30:00.123Z",
      "status": 404,
      "error": "Not Found",
      "message": "Resource not found with id: 123",
      "path": "/api/v1/contents/123"
    }
    ```
*   **Example Error Response (400 Bad Request - Validation):**
    ```json
    {
      "timestamp": "2023-10-27T10:35:00.456Z",
      "status": 400,
      "error": "Bad Request",
      "message": "Validation failed: title must be between 5 and 255 characters",
      "details": {
          "title": "title must be between 5 and 255 characters"
      },
      "path": "/api/v1/contents"
    }
    ```

## 4. API Endpoints

### 4.1. Content Management (`/api/v1/contents`)

Manages articles, blog posts, pages, and other content types.

#### 4.1.1. `POST /api/v1/contents`

*   **Description:** Creates a new content item.
*   **Authentication:** Required (Roles: `ADMIN`, `MODERATOR`)
*   **Request Body (`ContentDTO`):**
    ```json
    {
      "title": "My New Blog Post",
      "slug": "my-new-blog-post",
      "body": "This is the exciting content of my new blog post.",
      "published": false,
      "authorId": 1,
      "categoryId": 1,
      "tagIds": [1, 2]
    }
    ```
*   **Response (201 Created):** `ContentDTO` of the created item.

#### 4.1.2. `GET /api/v1/contents/{id}`

*   **Description:** Retrieves a content item by its ID.
*   **Authentication:** Required (Roles: `USER`, `MODERATOR`, `ADMIN`)
*   **Path Variable:** `id` (Long) - The ID of the content.
*   **Response (200 OK):** `ContentDTO`.
*   **Response (404 Not Found):** If content does not exist.

#### 4.1.3. `GET /api/v1/contents/slug/{slug}`

*   **Description:** Retrieves a content item by its URL-friendly slug.
*   **Authentication:** Required (Roles: `USER`, `MODERATOR`, `ADMIN`)
*   **Path Variable:** `slug` (String) - The slug of the content.
*   **Response (200 OK):** `ContentDTO`.
*   **Response (404 Not Found):** If content does not exist.

#### 4.1.4. `GET /api/v1/contents`

*   **Description:** Retrieves a paginated list of all content items.
*   **Authentication:** Required (Roles: `USER`, `MODERATOR`, `ADMIN`)
*   **Query Parameters:**
    *   `page` (int, default: 0): Page number (0-indexed).
    *   `size` (int, default: 10): Number of items per page.
    *   `sort` (String, default: `createdAt,desc`): Sorting criteria (e.g., `title,asc`, `id,desc`).
*   **Response (200 OK):** Page object containing a list of `ContentDTO`s.
    ```json
    {
      "content": [...],
      "pageable": { ... },
      "last": false,
      "totalPages": 5,
      "totalElements": 42,
      ...
    }
    ```

#### 4.1.5. `PUT /api/v1/contents/{id}`

*   **Description:** Updates an existing content item by its ID.
*   **Authentication:** Required (Roles: `ADMIN`, `MODERATOR`)
*   **Path Variable:** `id` (Long) - The ID of the content to update.
*   **Request Body (`ContentDTO`):** Fields to update.
*   **Response (200 OK):** `ContentDTO` of the updated item.
*   **Response (404 Not Found):** If content does not exist.

#### 4.1.6. `DELETE /api/v1/contents/{id}`

*   **Description:** Deletes a content item by its ID.
*   **Authentication:** Required (Role: `ADMIN`)
*   **Path Variable:** `id` (Long) - The ID of the content to delete.
*   **Response (204 No Content):** If successful.
*   **Response (404 Not Found):** If content does not exist.

#### 4.1.7. `PATCH /api/v1/contents/{id}/publish`

*   **Description:** Publishes a content item.
*   **Authentication:** Required (Roles: `ADMIN`, `MODERATOR`)
*   **Path Variable:** `id` (Long) - The ID of the content to publish.
*   **Response (200 OK):** `ContentDTO` of the published item.
*   **Response (404 Not Found):** If content does not exist.

#### 4.1.8. `PATCH /api/v1/contents/{id}/unpublish`

*   **Description:** Unpublishes a content item.
*   **Authentication:** Required (Roles: `ADMIN`, `MODERATOR`)
*   **Path Variable:** `id` (Long) - The ID of the content to unpublish.
*   **Response (200 OK):** `ContentDTO` of the unpublished item.
*   **Response (404 Not Found):** If content does not exist.

### 4.2. Category Management (`/api/v1/categories`)

*(Similar CRUD endpoints as Content, with appropriate DTOs and permissions)*

*   `POST /api/v1/categories` (Admin/Moderator)
*   `GET /api/v1/categories/{id}` (All Authenticated)
*   `GET /api/v1/categories` (All Authenticated)
*   `PUT /api/v1/categories/{id}` (Admin/Moderator)
*   `DELETE /api/v1/categories/{id}` (Admin)

### 4.3. Tag Management (`/api/v1/tags`)

*(Similar CRUD endpoints as Content, with appropriate DTOs and permissions)*

*   `POST /api/v1/tags` (Admin/Moderator)
*   `GET /api/v1/tags/{id}` (All Authenticated)
*   `GET /api/v1/tags` (All Authenticated)
*   `PUT /api/v1/tags/{id}` (Admin/Moderator)
*   `DELETE /api/v1/tags/{id}` (Admin)

### 4.4. User Management (`/api/v1/users`)

*(Similar CRUD endpoints for users, with higher permissions required)*

*   `POST /api/v1/users` (Admin - for creating new users with roles)
*   `GET /api/v1/users/{id}` (Admin, or self for current user)
*   `GET /api/v1/users` (Admin)
*   `PUT /api/v1/users/{id}` (Admin, or self for current user's non-sensitive info)
*   `DELETE /api/v1/users/{id}` (Admin)
*   `PATCH /api/v1/users/{id}/roles` (Admin - for updating user roles)

## 5. Swagger UI

For an interactive experience and to try out the APIs directly, please visit the Swagger UI interface once the application is running:
`http://localhost:8080/swagger-ui.html`
```