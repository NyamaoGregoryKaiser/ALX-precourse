```markdown
# Product Management System - API Documentation

This document provides a high-level overview of the RESTful API endpoints for the Product Management System.
For interactive API exploration, please refer to the [Swagger UI](#swagger-ui) accessible when the application is running.

## Base URL

The base URL for all API endpoints is `http://localhost:8080/api`.

## Authentication

All protected endpoints require a JSON Web Token (JWT) in the `Authorization` header, formatted as `Bearer <YOUR_JWT_TOKEN>`.

### 1. Authentication Endpoints

*   **Register User**
    *   `POST /api/auth/register`
    *   **Description:** Registers a new user with `ROLE_USER`.
    *   **Request Body:**
        ```json
        {
          "username": "newuser",
          "email": "newuser@example.com",
          "password": "strongpassword"
        }
        ```
    *   **Responses:**
        *   `201 Created`: User registered successfully.
        *   `400 Bad Request`: Invalid input or username/email already exists.

*   **Login User**
    *   `POST /api/auth/login`
    *   **Description:** Authenticates a user and returns a JWT token.
    *   **Request Body:**
        ```json
        {
          "username": "testuser",
          "password": "password"
        }
        ```
    *   **Responses:**
        *   `200 OK`:
            ```json
            {
              "token": "eyJhbGciOiJIUzI1Ni...",
              "type": "Bearer"
            }
            ```
        *   `401 Unauthorized`: Invalid credentials.

---

### 2. Category Management Endpoints

**Roles:**
*   `GET` operations: `ROLE_USER`, `ROLE_MANAGER`, `ROLE_ADMIN`
*   `POST`, `PUT`, `DELETE` operations: `ROLE_ADMIN`

*   **Get All Categories**
    *   `GET /api/categories`
    *   **Description:** Retrieves a list of all product categories.
    *   **Responses:**
        *   `200 OK`: `[ { "id": 1, "name": "Electronics" }, ... ]`

*   **Get Category by ID**
    *   `GET /api/categories/{id}`
    *   **Description:** Retrieves a single category by its ID.
    *   **Responses:**
        *   `200 OK`: `{ "id": 1, "name": "Electronics" }`
        *   `404 Not Found`: Category not found.

*   **Create Category**
    *   `POST /api/categories` (Requires `ROLE_ADMIN`)
    *   **Description:** Creates a new product category.
    *   **Request Body:**
        ```json
        {
          "name": "Books"
        }
        ```
    *   **Responses:**
        *   `201 Created`: Created category details.
        *   `400 Bad Request`: Invalid input.
        *   `403 Forbidden`: User does not have `ROLE_ADMIN`.

*   **Update Category**
    *   `PUT /api/categories/{id}` (Requires `ROLE_ADMIN`)
    *   **Description:** Updates an existing product category.
    *   **Request Body:** (Same as Create Category)
    *   **Responses:**
        *   `200 OK`: Updated category details.
        *   `400 Bad Request`: Invalid input.
        *   `403 Forbidden`: User does not have `ROLE_ADMIN`.
        *   `404 Not Found`: Category not found.

*   **Delete Category**
    *   `DELETE /api/categories/{id}` (Requires `ROLE_ADMIN`)
    *   **Description:** Deletes a category by its ID.
    *   **Responses:**
        *   `204 No Content`: Category deleted successfully.
        *   `403 Forbidden`: User does not have `ROLE_ADMIN`.
        *   `404 Not Found`: Category not found.

---

### 3. Product Management Endpoints

**Roles:**
*   `GET` operations: `ROLE_USER`, `ROLE_MANAGER`, `ROLE_ADMIN`
*   `POST`, `PUT` operations: `ROLE_MANAGER`, `ROLE_ADMIN`
*   `DELETE` operations: `ROLE_ADMIN`

*   **Get All Products**
    *   `GET /api/products`
    *   **Description:** Retrieves a paginated list of products with optional filtering and sorting.
    *   **Query Parameters:**
        *   `page`: (int, default: 0) Page number.
        *   `size`: (int, default: 10) Number of items per page.
        *   `sort`: (string, default: `name,asc`) Sort by field and direction (e.g., `price,desc`).
        *   `name`: (string, optional) Filter by product name (partial match).
        *   `categoryId`: (long, optional) Filter by category ID.
        *   `minPrice`: (double, optional) Filter by minimum price.
        *   `maxPrice`: (double, optional) Filter by maximum price.
    *   **Responses:**
        *   `200 OK`: Paginated list of products.
            ```json
            {
              "content": [
                {
                  "id": 101,
                  "name": "Smartphone X",
                  "description": "...",
                  "price": 699.99,
                  "stock": 150,
                  "categoryId": 1,
                  "categoryName": "Electronics",
                  "createdAt": "2023-10-27T10:00:00",
                  "updatedAt": "2023-10-27T10:00:00"
                }
              ],
              "pageable": { ... },
              "totalPages": 1,
              "totalElements": 1,
              "last": true,
              "size": 10,
              "number": 0,
              "sort": { "empty": false, "sorted": true, "unsorted": false },
              "numberOfElements": 1,
              "first": true,
              "empty": false
            }
            ```
        *   `429 Too Many Requests`: Rate limit exceeded.

*   **Get Product by ID**
    *   `GET /api/products/{id}`
    *   **Description:** Retrieves a single product by its ID.
    *   **Responses:**
        *   `200 OK`: Product details.
        *   `404 Not Found`: Product not found.

*   **Create Product**
    *   `POST /api/products` (Requires `ROLE_MANAGER` or `ROLE_ADMIN`)
    *   **Description:** Creates a new product.
    *   **Request Body:**
        ```json
        {
          "name": "New Gaming Headset",
          "description": "High-fidelity sound, comfortable fit.",
          "price": 79.99,
          "stock": 200,
          "categoryId": 1
        }
        ```
    *   **Responses:**
        *   `201 Created`: Created product details.
        *   `400 Bad Request`: Invalid input (e.g., missing fields, invalid price).
        *   `403 Forbidden`: User does not have `ROLE_MANAGER` or `ROLE_ADMIN`.
        *   `404 Not Found`: Category not found.

*   **Update Product**
    *   `PUT /api/products/{id}` (Requires `ROLE_MANAGER` or `ROLE_ADMIN`)
    *   **Description:** Updates an existing product.
    *   **Request Body:** (Same as Create Product, `id` in path determines which product to update)
    *   **Responses:**
        *   `200 OK`: Updated product details.
        *   `400 Bad Request`: Invalid input.
        *   `403 Forbidden`: User does not have `ROLE_MANAGER` or `ROLE_ADMIN`.
        *   `404 Not Found`: Product or Category not found.

*   **Delete Product**
    *   `DELETE /api/products/{id}` (Requires `ROLE_ADMIN`)
    *   **Description:** Deletes a product by its ID.
    *   **Responses:**
        *   `204 No Content`: Product deleted successfully.
        *   `403 Forbidden`: User does not have `ROLE_ADMIN`.
        *   `404 Not Found`: Product not found.

---

## Swagger UI

When the application is running, you can access the interactive API documentation at:
`http://localhost:8080/swagger-ui.html`

This interface allows you to view all available endpoints, their expected parameters, request bodies, and example responses. You can also directly test the API by providing authentication tokens.
```