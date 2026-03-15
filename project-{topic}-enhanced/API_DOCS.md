# E-commerce System API Documentation

This document provides a static overview of the RESTful API endpoints for the E-commerce System. For an interactive experience, please visit the **Swagger UI** when the application is running at `http://localhost:5000/api/docs`.

**Base URL:** `http://localhost:5000/api`

**Authentication:** Most endpoints require a JWT Access Token in the `Authorization` header: `Bearer <YOUR_ACCESS_TOKEN>`.

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Registers a new user.
*   **Rate Limit:** 10 requests per hour.
*   **Request Body:**
    ```json
    {
        "username": "string",
        "email": "string",
        "password": "string",
        "role": "customer" | "admin" (default: "customer")
    }
    ```
*   **Responses:**
    *   `201 Created`: `{"message": "User registered successfully", "user_id": 1}`
    *   `400 Bad Request`: Missing fields, invalid email format.
    *   `409 Conflict`: Username or email already taken.

### `POST /api/auth/login`
Authenticates a user and returns JWT tokens.
*   **Rate Limit:** 5 requests per minute.
*   **Request Body:**
    ```json
    {
        "email": "string",
        "password": "string"
    }
    ```
*   **Responses:**
    *   `200 OK`: `{"access_token": "...", "refresh_token": "..."}`
    *   `400 Bad Request`: Missing fields.
    *   `401 Unauthorized`: Invalid credentials.

### `POST /api/auth/refresh`
Refreshes an expired access token using a refresh token.
*   **Authentication:** Requires a valid *Refresh Token* in the `Authorization` header.
*   **Responses:**
    *   `200 OK`: `{"access_token": "..."}`
    *   `401 Unauthorized`: Invalid or missing refresh token.

---

## 2. User Endpoints (`/api/users`)

### `GET /api/users/<int:user_id>`
Retrieves details of a specific user.
*   **Authentication:** Required. Users can view their own data. Admins can view any user's data.
*   **Responses:**
    *   `200 OK`: User object `{ "id": 1, "username": "testuser", "email": "test@example.com", "role": "customer", ... }`
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not authorized to view another user's data.
    *   `404 Not Found`: User not found.

### `PUT /api/users/<int:user_id>`
Updates details of a specific user.
*   **Authentication:** Required. Users can update their own data. Admins can update any user's data.
    *   **Note:** Regular users cannot change their `role` or `is_active` status.
*   **Request Body:**
    ```json
    {
        "username": "string",
        "email": "string",
        "password": "string",
        "role": "customer" | "admin",
        "is_active": true | false
    }
    ```
*   **Responses:**
    *   `200 OK`: `{"message": "User updated successfully", "user_id": 1}`
    *   `400 Bad Request`: Invalid data.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not authorized to update another user's data or change role/active status.
    *   `404 Not Found`: User not found.
    *   `409 Conflict`: Username or email already exists.

### `DELETE /api/users/<int:user_id>`
Deletes a specific user.
*   **Authentication:** Admin required.
*   **Responses:**
    *   `204 No Content`: User deleted successfully.
    *   `400 Bad Request`: Cannot delete own account.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not an admin.
    *   `404 Not Found`: User not found.

### `GET /api/users/`
Retrieves a list of all users.
*   **Authentication:** Admin required.
*   **Responses:**
    *   `200 OK`: `[ { ...user object... }, ... ]`
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not an admin.

---

## 3. Product & Category Endpoints (`/api/products`)

### `GET /api/products/products`
Retrieves a list of all active products.
*   **Query Parameters:**
    *   `category_id` (int): Filter products by category.
    *   `search_term` (string): Search products by name or description.
    *   `limit` (int, default: 20): Number of results to return.
    *   `offset` (int, default: 0): Offset for pagination.
*   **Responses:**
    *   `200 OK`: `[ { "id": 1, "name": "Laptop Pro", "price": 1200.00, ... }, ... ]`

### `POST /api/products/products`
Creates a new product.
*   **Authentication:** Admin required.
*   **Request Body:**
    ```json
    {
        "name": "string",
        "slug": "string",
        "description": "string",
        "price": 0.00,
        "stock_quantity": 0,
        "image_url": "string",
        "category_id": 1
    }
    ```
*   **Responses:**
    *   `201 Created`: `{"message": "Product created", "id": 1, "name": "...", "slug": "..."}`
    *   `400 Bad Request`: Invalid data, missing fields, category not found.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not an admin.
    *   `409 Conflict`: Slug already exists.

### `GET /api/products/products/<int:product_id>`
Retrieves details of a specific product.
*   **Responses:**
    *   `200 OK`: Product object `{ "id": 1, "name": "Laptop Pro", "description": "...", "price": 1200.00, ... }`
    *   `404 Not Found`: Product not found or inactive.

### `PUT /api/products/products/<int:product_id>`
Updates details of a specific product.
*   **Authentication:** Admin required.
*   **Request Body:** (Partial updates are allowed, fields are optional)
    ```json
    {
        "name": "string",
        "slug": "string",
        "price": 0.00,
        "stock_quantity": 0,
        "is_active": true | false,
        "category_id": 1
    }
    ```
*   **Responses:**
    *   `200 OK`: `{"message": "Product updated", "id": 1, "name": "..."}`
    *   `400 Bad Request`: Invalid data.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not an admin.
    *   `404 Not Found`: Product not found.
    *   `409 Conflict`: Slug already exists.

### `DELETE /api/products/products/<int:product_id>`
Deletes a specific product.
*   **Authentication:** Admin required.
*   **Responses:**
    *   `204 No Content`: Product deleted successfully.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not an admin.
    *   `404 Not Found`: Product not found.

### `GET /api/products/categories`
Retrieves a list of all categories.
*   **Responses:**
    *   `200 OK`: `[ { "id": 1, "name": "Electronics", "slug": "electronics", ... }, ... ]`

### `POST /api/products/categories`
Creates a new category.
*   **Authentication:** Admin required.
*   **Request Body:**
    ```json
    {
        "name": "string",
        "slug": "string",
        "description": "string"
    }
    ```
*   **Responses:**
    *   `201 Created`: `{"message": "Category created", "id": 1, "name": "..."}`
    *   `400 Bad Request`: Invalid data, missing fields.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not an admin.
    *   `409 Conflict`: Slug already exists.

### `GET /api/products/categories/<int:category_id>`
Retrieves details of a specific category.
*   **Responses:**
    *   `200 OK`: Category object `{ "id": 1, "name": "Electronics", "slug": "electronics", ... }`
    *   `404 Not Found`: Category not found.

### `PUT /api/products/categories/<int:category_id>`
Updates details of a specific category.
*   **Authentication:** Admin required.
*   **Request Body:** (Partial updates are allowed)
    ```json
    {
        "name": "string",
        "slug": "string",
        "description": "string"
    }
    ```
*   **Responses:**
    *   `200 OK`: `{"message": "Category updated", "id": 1, "name": "..."}`
    *   `400 Bad Request`: Invalid data.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not an admin.
    *   `404 Not Found`: Category not found.
    *   `409 Conflict`: Slug already exists.

### `DELETE /api/products/categories/<int:category_id>`
Deletes a specific category.
*   **Authentication:** Admin required.
*   **Note:** Cannot delete a category if products are associated with it.
*   **Responses:**
    *   `204 No Content`: Category deleted successfully.
    *   `400 Bad Request`: Cannot delete category with associated products.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Not an admin.
    *   `404 Not Found`: Category not found.

---

## 4. Cart Endpoints (`/api/cart`)

### `GET /api/cart`
Retrieves all items in the authenticated user's cart.
*   **Authentication:** Customer