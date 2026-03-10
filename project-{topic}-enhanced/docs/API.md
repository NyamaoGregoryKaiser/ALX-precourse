```markdown
# CMS API Documentation

This document provides a comprehensive overview of the RESTful API endpoints for the CMS backend.

**Base URL:** `/api/v1`

---

## Authentication

### 1. Register User

*   **URL:** `/auth/register`
*   **Method:** `POST`
*   **Access:** Public
*   **Description:** Creates a new user account.
*   **Request Body:**
    ```json
    {
      "username": "john.doe",
      "email": "john@example.com",
      "password": "password123",
      "role": "subscriber" // Optional, default is 'subscriber'. Admin can set to 'admin', 'editor', 'author'.
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "success": true,
      "message": "User registered successfully. Please log in.",
      "user": {
        "id": "uuid-of-user",
        "username": "john.doe",
        "email": "john@example.com",
        "role": "subscriber"
      }
    }
    ```
*   **Error Responses (400 Bad Request):**
    *   `{"success": false, "message": "Please provide username, email, and password"}`
    *   `{"success": false, "message": "User with that email already exists"}`
    *   Validation errors (e.g., password too short)

### 2. Login User

*   **URL:** `/auth/login`
*   **Method:** `POST`
*   **Access:** Public
*   **Description:** Authenticates a user and sets an HttpOnly JWT cookie.
*   **Request Body:**
    ```json
    {
      "email": "john@example.com",
      "password": "password123"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Logged in successfully",
      "user": {
        "id": "uuid-of-user",
        "username": "john.doe",
        "email": "john@example.com",
        "role": "subscriber"
      }
    }
    ```
    *   **Note:** A `token` HttpOnly cookie is set with the JWT.
*   **Error Responses (401 Unauthorized):**
    *   `{"success": false, "message": "Invalid credentials"}`
    *   `{"success": false, "message": "Invalid credentials or inactive user"}`

### 3. Get Current User Profile

*   **URL:** `/auth/me`
*   **Method:** `GET`
*   **Access:** Private (requires JWT)
*   **Description:** Retrieves the profile of the currently authenticated user.
*   **Request Headers:** `Authorization: Bearer <JWT_TOKEN>` (or a valid `token` cookie)
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": "uuid-of-user",
        "username": "john.doe",
        "email": "john@example.com",
        "role": "subscriber",
        "isActive": true,
        "createdAt": "2023-10-27T10:00:00.000Z",
        "updatedAt": "2023-10-27T10:00:00.000Z"
      }
    }
    ```
*   **Error Responses (401 Unauthorized):**
    *   `{"success": false, "message": "Not authorized to access this route. No token provided."}`
    *   `{"success": false, "message": "Not authorized to access this route. Invalid token."}`

### 4. Logout User

*   **URL:** `/auth/logout`
*   **Method:** `GET`
*   **Access:** Private (requires JWT)
*   **Description:** Clears the HttpOnly JWT cookie, effectively logging out the user.
*   **Request Headers:** `Authorization: Bearer <JWT_TOKEN>` (or a valid `token` cookie)
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {},
      "message": "Logged out successfully"
    }
    ```

---

## Users

### 1. Get All Users

*   **URL:** `/users`
*   **Method:** `GET`
*   **Access:** Private (Admin only)
*   **Description:** Retrieves a list of all registered users. Passwords are excluded.
*   **Request Headers:** `Authorization: Bearer <JWT_TOKEN>`
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "count": 2,
      "data": [
        { /* user object 1 */ },
        { /* user object 2 */ }
      ]
    }
    ```
*   **Error Responses (401 Unauthorized, 403 Forbidden):** Standard auth errors.

### 2. Create User

*   **URL:** `/users`
*   **Method:** `POST`
*   **Access:** Private (Admin only)
*   **Description:** Creates a new user.
*   **Request Body:** Same as register, but `role` can be any valid enum.
*   **Success Response (201 Created):**
    ```json
    {
      "success": true,
      "data": { /* new user object, password excluded */ }
    }
    ```

### 3. Get User by ID

*   **URL:** `/users/:id`
*   **Method:** `GET`
*   **Access:** Private (Admin, Editor)
*   **Description:** Retrieves a single user by their ID.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": { /* user object, password excluded */ }
    }
    ```
*   **Error Responses (404 Not Found):** `{"success": false, "message": "User with id <id> not found"}`

### 4. Update User by ID

*   **URL:** `/users/:id`
*   **Method:** `PUT`
*   **Access:** Private (Admin only)
*   **Description:** Updates an existing user's information.
*   **Request Body:** Any valid user fields (e.g., `username`, `email`, `role`, `isActive`). Password update is handled by model hooks.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": { /* updated user object, password excluded */ }
    }
    ```
*   **Error Responses (403 Forbidden):** `{"success": false, "message": "Only admins can assign or update user roles to admin."}`

### 5. Delete User by ID

*   **URL:** `/users/:id`
*   **Method:** `DELETE`
*   **Access:** Private (Admin only)
*   **Description:** Deletes a user.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {}
    }
    ```
*   **Error Responses (400 Bad Request):** `{"success": false, "message": "Cannot delete your own account via this endpoint."}`

---

## Posts

### 1. Create Post

*   **URL:** `/posts`
*   **Method:** `POST`
*   **Access:** Private (Admin, Editor, Author)
*   **Description:** Creates a new content post. Authors can only create posts with their own `authorId`.
*   **Request Body:**
    ```json
    {
      "title": "My Awesome Blog Post",
      "content": "This is the full content of my blog post...",
      "authorId": "uuid-of-author",
      "categoryId": "uuid-of-category",
      "tags": ["programming", "webdev"],
      "status": "draft",       // 'draft', 'published', 'archived'
      "featuredImage": "http://example.com/image.jpg"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "success": true,
      "data": { /* new post object */ }
    }
    ```
*   **Error Responses (403 Forbidden):** `{"success": false, "message": "Authors can only create posts under their own ID."}`

### 2. Get All Posts

*   **URL:** `/posts`
*   **Method:** `GET`
*   **Access:** Public (Cached)
*   **Description:** Retrieves a list of all posts. Supports filtering, pagination, and sorting.
*   **Query Parameters:**
    *   `limit`: Number of posts per page (default: 10)
    *   `offset`: Number of posts to skip
    *   `status`: Filter by post status (`draft`, `published`, `archived`)
    *   `categoryId`: Filter by category ID
    *   `authorId`: Filter by author ID
    *   `search`: Search by title (case-insensitive)
    *   `sort`: Sort order (e.g., `createdAt:desc`, `title:asc`)
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "count": 50,
      "data": [
        {
          "id": "post-uuid-1",
          "title": "Post Title 1",
          "slug": "post-title-1",
          "content": "...",
          "status": "published",
          "publishedAt": "2023-10-27T10:00:00.000Z",
          "author": { "id": "author-uuid", "username": "jane.doe" },
          "category": { "id": "category-uuid", "name": "Tech" },
          "tags": [{ "id": "tag-uuid", "name": "webdev" }]
        },
        { /* post object 2 */ }
      ]
    }
    ```

### 3. Get Post by ID or Slug

*   **URL:** `/posts/:identifier`
*   **Method:** `GET`
*   **Access:** Public (Cached)
*   **Description:** Retrieves a single post using its ID or slug.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": { /* single post object with author, category, tags */ }
    }
    ```
*   **Error Responses (404 Not Found):** `{"success": false, "message": "Post with identifier '<identifier>' not found"}`

### 4. Update Post by ID

*   **URL:** `/posts/:id`
*   **Method:** `PUT`
*   **Access:** Private (Admin, Editor, Author - own posts only)
*   **Description:** Updates an existing post. Authors can only update their own posts.
*   **Request Body:** Any valid post fields (e.g., `title`, `content`, `status`, `categoryId`, `tags`).
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": { /* updated post object */ }
    }
    ```
*   **Error Responses (403 Forbidden):** `{"success": false, "message": "Authors can only update their own posts."}`

### 5. Delete Post by ID

*   **URL:** `/posts/:id`
*   **Method:** `DELETE`
*   **Access:** Private (Admin, Editor, Author - own posts only)
*   **Description:** Deletes a post. Authors can only delete their own posts.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {}
    }
    ```
*   **Error Responses (403 Forbidden):** `{"success": false, "message": "Authors can only delete their own posts."}`

---

## Categories (CRUD)

*   **Base URL:** `/categories`
*   **Access:** Private (Admin, Editor for creation/update/delete; all authenticated for read)

### 1. Create Category

*   **URL:** `/categories`
*   **Method:** `POST`
*   **Request Body:** `{"name": "New Category", "description": "Category description"}`
*   **Success Response (201 Created):** `{"success": true, "data": { /* category object */ }}`

### 2. Get All Categories

*   **URL:** `/categories`
*   **Method:** `GET`
*   **Success Response (200 OK):** `{"success": true, "count": N, "data": [{ /* category object */ }]}`

### 3. Get Category by ID

*   **URL:** `/categories/:id`
*   **Method:** `GET`
*   **Success Response (200 OK):** `{"success": true, "data": { /* category object */ }}`

### 4. Update Category by ID

*   **URL:** `/categories/:id`
*   **Method:** `PUT`
*   **Request Body:** `{"name": "Updated Category Name"}`
*   **Success Response (200 OK):** `{"success": true, "data": { /* updated category object */ }}`

### 5. Delete Category by ID

*   **URL:** `/categories/:id`
*   **Method:** `DELETE`
*   **Success Response (200 OK):** `{"success": true, "data": {}}`

---

## Tags (CRUD)

*   **Base URL:** `/tags`
*   **Access:** Private (Admin, Editor for creation/update/delete; all authenticated for read)

### 1. Create Tag

*   **URL:** `/tags`
*   **Method:** `POST`
*   **Request Body:** `{"name": "New Tag"}`
*   **Success Response (201 Created):** `{"success": true, "data": { /* tag object */ }}`

### 2. Get All Tags

*   **URL:** `/tags`
*   **Method:** `GET`
*   **Success Response (200 OK):** `{"success": true, "count": N, "data": [{ /* tag object */ }]}`

### 3. Get Tag by ID

*   **URL:** `/tags/:id`
*   **Method:** `GET`
*   **Success Response (200 OK):** `{"success": true, "data": { /* tag object */ }}`

### 4. Update Tag by ID

*   **URL:** `/tags/:id`
*   **Method:** `PUT`
*   **Request Body:** `{"name": "Updated Tag Name"}`
*   **Success Response (200 OK):** `{"success": true, "data": { /* updated tag object */ }}`

### 5. Delete Tag by ID

*   **URL:** `/tags/:id`
*   **Method:** `DELETE`
*   **Success Response (200 OK):** `{"success": true, "data": {}}`

---

## Media (CRUD - Simulated)

*   **Base URL:** `/media`
*   **Access:** Private (Admin, Editor, Author)
*   **Note:** This implementation simulates media storage by accepting URLs. In a real-world scenario, this would involve actual file uploads to cloud storage (e.g., AWS S3, Google Cloud Storage) via `multer`.

### 1. Upload Media (Simulated)

*   **URL:** `/media`
*   **Method:** `POST`
*   **Request Body:**
    ```json
    {
      "filename": "my-image.jpg",
      "mimeType": "image/jpeg",
      "url": "https://example.com/uploads/my-image.jpg",
      "altText": "A descriptive alt text",
      "description": "Optional description for the image."
    }
    ```
*   **Success Response (201 Created):** `{"success": true, "data": { /* media object */ }}`

### 2. Get All Media

*   **URL:** `/media`
*   **Method:** `GET`
*   **Success Response (200 OK):** `{"success": true, "count": N, "data": [{ /* media object */ }]}`

### 3. Get Media by ID

*   **URL:** `/media/:id`
*   **Method:** `GET`
*   **Success Response (200 OK):** `{"success": true, "data": { /* media object */ }}`

### 4. Update Media by ID

*   **URL:** `/media/:id`
*   **Method:** `PUT`
*   **Request Body:** Any valid media fields (e.g., `altText`, `description`).
*   **Success Response (200 OK):** `{"success": true, "data": { /* updated media object */ }}`

### 5. Delete Media by ID

*   **URL:** `/media/:id`
*   **Method:** `DELETE`
*   **Success Response (200 OK):** `{"success": true, "data": {}}`
```