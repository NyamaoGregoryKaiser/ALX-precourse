```markdown
# CMS API Documentation (OpenAPI 3.0.3 Specification Style)

This document describes the RESTful API endpoints for the Content Management System.
The API is designed to be consumed by various clients, including web applications, mobile apps, or other services.

## Base URL

`http://localhost:5000/api/v1` (Development)

## Authentication

This API uses **JSON Web Tokens (JWT)** for authentication.
Access tokens must be sent in the `Authorization` header as a Bearer token:
`Authorization: Bearer <access_token>`

Refresh tokens are used to obtain new access tokens when the current one expires.

### Security Schemes

*   `access_token`: HTTP Bearer Authentication for access tokens.
*   `refresh_token`: HTTP Bearer Authentication for refresh tokens (used specifically by the `/auth/refresh` endpoint).

## Error Handling

All API errors return a JSON object with a consistent structure:

```json
{
  "code": 400,
  "name": "Bad Request",
  "description": "The request could not be understood or was missing required parameters.",
  "status": "error",
  "errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

*   `code`: HTTP status code.
*   `name`: Short, human-readable name for the error.
*   `description`: More detailed explanation of the error.
*   `status`: Always "error" for error responses.
*   `errors` (optional): A dictionary containing validation errors, where keys are field names and values are lists of error messages.

## Rate Limiting

Endpoints are rate-limited to prevent abuse. When a rate limit is exceeded, the API will return a `429 Too Many Requests` status code with a message indicating the limit.
Look for `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers in responses for rate limit information.

---

## 1. Authentication Endpoints (`/auth`)

### `POST /auth/register`
Register a new user.

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "StrongPassword123"
}
```
**Responses:**
*   `201 Created`: User registered successfully.
    ```json
    {
      "id": "uuid",
      "username": "newuser",
      "email": "newuser@example.com",
      "role": "contributor"
    }
    ```
*   `400 Bad Request`: Invalid input data (e.g., missing fields, invalid email format).
*   `409 Conflict`: Username or email already exists.
*   `429 Too Many Requests`: Rate limit exceeded.

### `POST /auth/login`
Authenticate a user and return JWT access and refresh tokens.

**Request Body:**
```json
{
  "username": "testuser",
  "password": "password123"
}
```
**Responses:**
*   `200 OK`: User logged in successfully.
    ```json
    {
      "access_token": "jwt_access_token_string",
      "refresh_token": "jwt_refresh_token_string",
      "user": {
        "id": "uuid",
        "username": "testuser",
        "email": "testuser@example.com",
        "role": "author"
      }
    }
    ```
*   `400 Bad Request`: Missing username or password.
*   `401 Unauthorized`: Invalid credentials.
*   `429 Too Many Requests`: Rate limit exceeded.

### `POST /auth/refresh`
Refresh JWT tokens. Requires a valid refresh token in the `Authorization` header.

**Security:** `refresh_token`
**Responses:**
*   `200 OK`: New access and refresh tokens provided.
    ```json
    {
      "access_token": "new_jwt_access_token_string",
      "refresh_token": "new_jwt_refresh_token_string"
    }
    ```
*   `401 Unauthorized`: Invalid or expired refresh token.
*   `429 Too Many Requests`: Rate limit exceeded.

### `POST /auth/logout`
Revoke the current access token. The token will be blacklisted.

**Security:** `access_token`
**Responses:**
*   `200 OK`: Access token revoked.
    ```json
    {
      "message": "Token revoked successfully."
    }
    ```
*   `401 Unauthorized`: Missing or invalid access token.
*   `429 Too Many Requests`: Rate limit exceeded.

### `POST /auth/logout_refresh`
Revoke the current refresh token. The token will be blacklisted.

**Security:** `refresh_token`
**Responses:**
*   `200 OK`: Refresh token revoked.
    ```json
    {
      "message": "Token revoked successfully."
    }
    ```
*   `401 Unauthorized`: Missing or invalid refresh token.
*   `429 Too Many Requests`: Rate limit exceeded.

### `GET /auth/protected`
Access a protected resource. Requires a valid access token.

**Security:** `access_token`
**Responses:**
*   `200 OK`: Access granted.
    ```json
    {
      "message": "Hello from protected endpoint, user <user_id>!",
      "user_id": "uuid",
      "user_role": "admin"
    }
    ```
*   `401 Unauthorized`: Missing or invalid token.

### `GET /auth/admin_only`
Access an admin-only resource. Requires a valid access token with an 'admin' role.

**Security:** `access_token`
**Responses:**
*   `200 OK`: Admin access granted.
    ```json
    {
      "message": "Welcome, Admin! This is a secret admin page.",
      "user_id": "uuid",
      "user_role": "admin"
    }
    ```
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Insufficient role.

---

## 2. Content Management Endpoints (`/content`)

### 2.1 Posts

#### `GET /content/posts`
Retrieves a paginated list of posts.

**Parameters:**
*   `page` (query, integer, default: 1): Page number.
*   `per_page` (query, integer, default: 10): Number of items per page.
*   `status` (query, string, enum: `draft`, `pending`, `published`, `archived`): Filter by post status.
*   `category_id` (query, string, uuid): Filter by category ID.
*   `author_id` (query, string, uuid): Filter by author ID.
*   `tag_id` (query, string, uuid): Filter by tag ID.

**Responses:**
*   `200 OK`: A list of posts.
    ```json
    {
      "posts": [ { ...Post Object... } ],
      "total_pages": 5,
      "current_page": 1,
      "total_items": 42
    }
    ```
*   `429 Too Many Requests`: Rate limit exceeded.

#### `GET /content/posts/{post_id}`
Retrieves a single post by its ID.

**Parameters:**
*   `post_id` (path, string, uuid, required): UUID of the post to retrieve.

**Responses:**
*   `200 OK`: Post details.
    ```json
    { ...Post Object... }
    ```
*   `404 Not Found`: Post not found.
*   `429 Too Many Requests`: Rate limit exceeded.

#### `POST /content/posts`
Creates a new post. Requires authentication and an 'admin', 'editor', or 'author' role.

**Security:** `access_token`
**Request Body:**
```json
{
  "title": "My New Awesome Post",
  "content": "This is the full detailed content of my new post. It's very informative!",
  "excerpt": "A short summary.",
  "status": "draft",
  "visibility": "public",
  "category_id": "uuid_of_category",
  "tag_ids": ["uuid_of_tag1", "uuid_of_tag2"],
  "published_at": "2023-11-20T10:00:00Z"
}
```
**Responses:**
*   `201 Created`: Post created successfully.
    ```json
    { ...Post Object... }
    ```
*   `400 Bad Request`: Invalid input data.
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Insufficient role.
*   `409 Conflict`: Post with this slug already exists.
*   `429 Too Many Requests`: Rate limit exceeded.

#### `PUT /content/posts/{post_id}`
Updates an existing post by its ID. Requires authentication and appropriate role. Authors can only update their own posts. Admins/Editors can update any post.

**Security:** `access_token`
**Parameters:**
*   `post_id` (path, string, uuid, required): UUID of the post to update.

**Request Body:** (Partial updates are supported)
```json
{
  "title": "Updated Post Title",
  "status": "published",
  "tag_ids": ["new_tag_uuid"]
}
```
**Responses:**
*   `200 OK`: Post updated successfully.
    ```json
    { ...Post Object... }
    ```
*   `400 Bad Request`: Invalid input data.
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Insufficient role or not authorized to update this specific post.
*   `404 Not Found`: Post not found.
*   `409 Conflict`: Post with this slug already exists.
*   `429 Too Many Requests`: Rate limit exceeded.

#### `DELETE /content/posts/{post_id}`
Deletes a post by its ID. Requires authentication and appropriate role. Authors can only delete their own posts. Admins/Editors can delete any post.

**Security:** `access_token`
**Parameters:**
*   `post_id` (path, string, uuid, required): UUID of the post to delete.

**Responses:**
*   `200 OK`: Post deleted successfully.
    ```json
    { "message": "Post deleted successfully" }
    ```
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Insufficient role or not authorized to delete this specific post.
*   `404 Not Found`: Post not found.
*   `429 Too Many Requests`: Rate limit exceeded.

### 2.2 Categories

#### `GET /content/categories`
Retrieves a list of all categories.

**Responses:**
*   `200 OK`: A list of categories.
    ```json
    [ { ...Category Object... } ]
    ```
*   `429 Too Many Requests`: Rate limit exceeded.

#### `GET /content/categories/{category_id}`
Retrieves a single category by its ID.

**Parameters:**
*   `category_id` (path, string, uuid, required): UUID of the category to retrieve.

**Responses:**
*   `200 OK`: Category details.
    ```json
    { ...Category Object... }
    ```
*   `404 Not Found`: Category not found.
*   `429 Too Many Requests`: Rate limit exceeded.

#### `POST /content/categories`
Creates a new category. Requires authentication and 'admin' or 'editor' role.

**Security:** `access_token`
**Request Body:**
```json
{
  "name": "Programming",
  "slug": "programming",
  "description": "Posts related to coding and software development."
}
```
**Responses:**
*   `201 Created`: Category created successfully.
    ```json
    { ...Category Object... }
    ```
*   `400 Bad Request`: Invalid input.
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Insufficient role.
*   `409 Conflict`: Category with this slug already exists.
*   `429 Too Many Requests`: Rate limit exceeded.

#### `PUT /content/categories/{category_id}`
Updates a category by its ID. Requires authentication and 'admin' or 'editor' role.

**Security:** `access_token`
**Parameters:**
*   `category_id` (path, string, uuid, required): UUID of the category to update.

**Request Body:** (Partial updates are supported)
```json
{
  "name": "Software Development",
  "slug": "software-development"
}
```
**Responses:**
*   `200 OK`: Category updated successfully.
    ```json
    { ...Category Object... }
    ```
*   `400 Bad Request`: Invalid input.
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Insufficient role.
*   `404 Not Found`: Category not found.
*   `409 Conflict`: Category with this slug already exists.
*   `429 Too Many Requests`: Rate limit exceeded.

#### `DELETE /content/categories/{category_id}`
Deletes a category by its ID. Requires authentication and 'admin' role. Posts associated with this category will have their `category_id` set to `NULL`.

**Security:** `access_token`
**Parameters:**
*   `category_id` (path, string, uuid, required): UUID of the category to delete.

**Responses:**
*   `200 OK`: Category deleted successfully.
    ```json
    { "message": "Category deleted successfully" }
    ```
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Insufficient role.
*   `404 Not Found`: Category not found.
*   `429 Too Many Requests`: Rate limit exceeded.

### 2.3 Tags

#### `GET /content/tags`
Retrieves a list of all tags.

**Responses:**
*   `200 OK`: A list of tags.
    ```json
    [ { ...Tag Object... } ]
    ```
*   `429 Too Many Requests`: Rate limit exceeded.

#### `GET /content/tags/{tag_id}`
Retrieves a single tag by its ID.

**Parameters:**
*   `tag_id` (path, string, uuid, required): UUID of the tag to retrieve.

**Responses:**
*   `200 OK`: Tag details.
    ```json
    { ...Tag Object... }
    ```
*   `404 Not Found`: Tag not found.
*   `429 Too Many Requests`: Rate limit exceeded.

#### `POST /content/tags`
Creates a new tag. Requires authentication and 'admin' or 'editor' role.

**Security:** `access_token`
**Request Body:**
```json
{
  "name": "Python",
  "slug": "python"
}
```
**Responses:**
*   `201 Created`: Tag created successfully.
    ```json
    { ...Tag Object... }
    ```
*   `400 Bad Request`: Invalid input.
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Insufficient role.
*   `409 Conflict`: Tag with this slug already exists.
*   `429 Too Many Requests`: Rate limit exceeded.

#### `PUT /content/tags/{tag_id}`
Updates a tag by its ID. Requires authentication and 'admin' or 'editor' role.

**Security:** `access_token`
**Parameters:**
*   `tag_id` (path, string, uuid, required): UUID of the tag to update.

**Request Body:** (Partial updates are supported)
```json
{
  "name": "Flask Framework",
  "slug": "flask-framework"
}
```
**Responses:**
*   `200 OK`: Tag updated successfully.
    ```json
    { ...Tag Object... }
    ```
*   `400 Bad Request`: Invalid input.
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Insufficient role.
*   `404 Not Found`: Tag not found.
*   `409 Conflict`: Tag with this slug already exists.
*   `429 Too Many Requests`: Rate limit exceeded.

#### `DELETE /content/tags/{tag_id}`
Deletes a tag by its ID. Requires authentication and 'admin' role.

**Security:** `access_token`
**Parameters:**
*   `tag_id` (path, string, uuid, required): UUID of the tag to delete.

**Responses:**
*   `200 OK`: Tag deleted successfully.
    ```json
    { "message": "Tag deleted successfully" }
    ```
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Insufficient role.
*   `404 Not Found`: Tag not found.
*   `429 Too Many Requests`: Rate limit exceeded.

---

## 3. User Management Endpoints (`/users`)

### `GET /users`
Retrieves a paginated list of all users. Requires 'admin' role.

**Security:** `access_token`
**Parameters:**
*   `page` (query, integer, default: 1): Page number.
*   `per_page` (query, integer, default: 10): Number of items per page.

**Responses:**
*   `200 OK`: A list of users.
    ```json
    {
      "users": [ { ...User Object... } ],
      "total_pages": 2,
      "current_page": 1,
      "total_items": 15
    }
    ```
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Insufficient role.
*   `429 Too Many Requests`: Rate limit exceeded.

### `GET /users/{user_id}`
Retrieves a single user by ID. Accessible by 'admin' for any user, or by the user themselves for their own profile.

**Security:** `access_token`
**Parameters:**
*   `user_id` (path, string, uuid, required): UUID of the user to retrieve.

**Responses:**
*   `200 OK`: User details.
    ```json
    { ...User Object... }
    ```
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Not authorized to view this user's profile.
*   `404 Not Found`: User not found.
*   `429 Too Many Requests`: Rate limit exceeded.

### `PUT /users/{user_id}`
Updates a user's information. Accessible by 'admin' for any user, or by the user themselves for their own profile (limited fields). Admins can modify all fields, including role. Other users cannot change roles.

**Security:** `access_token`
**Parameters:**
*   `user_id` (path, string, uuid, required): UUID of the user to update.

**Request Body:** (Partial updates are supported)
```json
{
  "username": "updated_username",
  "email": "updated@example.com",
  "password": "NewStrongPassword!",
  "role": "editor",       // Admin only
  "is_active": false      // Admin only
}
```
**Responses:**
*   `200 OK`: User updated successfully.
    ```json
    { ...User Object... }
    ```
*   `400 Bad Request`: Invalid input data.
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Insufficient permissions or not authorized.
*   `404 Not Found`: User not found.
*   `409 Conflict`: Username or email already exists.
*   `429 Too Many Requests`: Rate limit exceeded.

### `DELETE /users/{user_id}`
Deletes a user by ID. Requires 'admin' role. Admins cannot delete their own account.

**Security:** `access_token`
**Parameters:**
*   `user_id` (path, string, uuid, required): UUID of the user to delete.

**Responses:**
*   `200 OK`: User deleted successfully.
    ```json
    { "message": "User deleted successfully" }
    ```
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Insufficient role or cannot delete own account.
*   `404 Not Found`: User not found.
*   `429 Too Many Requests`: Rate limit exceeded.

---

## 4. Admin Endpoints (`/admin`)

### `GET /admin/dashboard_stats`
Retrieves key statistics for the admin dashboard. Requires 'admin' role.

**Security:** `access_token`
**Responses:**
*   `200 OK`: Admin dashboard statistics.
    ```json
    {
      "total_users": 10,
      "active_users": 8,
      "total_posts": 50,
      "published_posts": 35,
      "draft_posts": 10,
      "total_categories": 7,
      "total_tags": 12
    }
    ```
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Not an admin.
*   `429 Too Many Requests`: Rate limit exceeded.

### `PUT /admin/manage_user_status/{user_id}`
Activates or deactivates a user account. Requires 'admin' role. Admins cannot deactivate their own account.

**Security:** `access_token`
**Parameters:**
*   `user_id` (path, string, uuid, required): UUID of the user to manage.

**Request Body:**
```json
{
  "is_active": true
}
```
**Responses:**
*   `200 OK`: User status updated successfully.
    ```json
    {
      "message": "User status updated to active",
      "user_id": "uuid",
      "is_active": true
    }
    ```
*   `400 Bad Request`: Invalid input.
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Not an admin or cannot deactivate own account.
*   `404 Not Found`: User not found.
*   `429 Too Many Requests`: Rate limit exceeded.

### `PUT /admin/moderate_comment/{comment_id}`
Moderates a comment (e.g., sets status to 'approved' or 'spam'). Requires 'admin' or 'editor' role.

**Security:** `access_token`
**Parameters:**
*   `comment_id` (path, string, uuid, required): UUID of the comment to moderate.

**Request Body:**
```json
{
  "status": "approved"
}
```
**Responses:**
*   `200 OK`: Comment status updated.
    ```json
    {
      "message": "Comment status updated to approved",
      "comment_id": "uuid",
      "status": "approved"
    }
    ```
*   `400 Bad Request`: Invalid input.
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Insufficient role.
*   `404 Not Found`: Comment not found.
*   `429 Too Many Requests`: Rate limit exceeded.

---

## 5. Components Schemas (Data Models)

### `User`
```yaml
type: object
properties:
  id:
    type: string
    format: uuid
    readOnly: true
  username:
    type: string
    minLength: 3
    maxLength: 80
  email:
    type: string
    format: email
  role:
    type: string
    enum: [admin, editor, author, contributor]
    default: contributor
  is_active:
    type: boolean
    readOnly: true
  created_at:
    type: string
    format: date-time
    readOnly: true
  updated_at:
    type: string
    format: date-time
    readOnly: true
```

### `Category`
```yaml
type: object
properties:
  id:
    type: string
    format: uuid
    readOnly: true
  name:
    type: string
    minLength: 3
    maxLength: 100
  slug:
    type: string
    minLength: 3
    maxLength: 100
  description:
    type: string
    nullable: true
  created_at:
    type: string
    format: date-time
    readOnly: true
  updated_at:
    type: string
    format: date-time
    readOnly: true
```

### `Tag`
```yaml
type: object
properties:
  id:
    type: string
    format: uuid
    readOnly: true
  name:
    type: string
    minLength: 2
    maxLength: 50
  slug:
    type: string
    minLength: 2
    maxLength: 50
  created_at:
    type: string
    format: date-time
    readOnly: true
  updated_at:
    type: string
    format: date-time
    readOnly: true
```

### `Post`
```yaml
type: object
properties:
  id:
    type: string
    format: uuid
    readOnly: true
  title:
    type: string
    minLength: 5
    maxLength: 255
  slug:
    type: string
    minLength: 5
    maxLength: 255
  content:
    type: string
    minLength: 10
  excerpt:
    type: string
    nullable: true
  status:
    type: string
    enum: [draft, pending, published, archived]
    default: draft
  visibility:
    type: string
    enum: [public, private, password_protected]
    default: public
  published_at:
    type: string
    format: date-time
    nullable: true
  created_at:
    type: string
    format: date-time
    readOnly: true
  updated_at:
    type: string
    format: date-time
    readOnly: true
  author_id:
    type: string
    format: uuid
  category_id:
    type: string
    format: uuid
    nullable: true
  author:
    $ref: '#/components/schemas/User'
    readOnly: true
  category:
    $ref: '#/components/schemas/Category'
    readOnly: true
  tags:
    type: array
    items:
      $ref: '#/components/schemas/Tag'
    readOnly: true
  comments:
    type: array
    items:
      $ref: '#/components/schemas/Comment'
    readOnly: true
  media_items:
    type: array
    items:
      $ref: '#/components/schemas/Media'
    readOnly: true
```

### `Comment`
```yaml
type: object
properties:
  id:
    type: string
    format: uuid
    readOnly: true
  post_id:
    type: string
    format: uuid
  author_id:
    type: string
    format: uuid
    nullable: true
  author_name:
    type: string
    maxLength: 100
    nullable: true
  author_email:
    type: string
    format: email
    nullable: true
  content:
    type: string
    minLength: 1
  status:
    type: string
    enum: [pending, approved, spam]
    default: pending
  created_at:
    type: string
    format: date-time
    readOnly: true
  updated_at:
    type: string
    format: date-time
    readOnly: true
```

### `Media`
```yaml
type: object
properties:
  id:
    type: string
    format: uuid
    readOnly: true
  filename:
    type: string
  filepath:
    type: string
    format: url
  filetype:
    type: string
  filesize:
    type: integer
    format: int64
    nullable: true
  title:
    type: string
    maxLength: 255
    nullable: true
  alt_text:
    type: string
    maxLength: 255
    nullable: true
  description:
    type: string
    nullable: true
  uploaded_at:
    type: string
    format: date-time
    readOnly: true
  uploader_id:
    type: string
    format: uuid
    readOnly: true
```
```