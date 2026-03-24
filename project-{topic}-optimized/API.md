# API Documentation: Product Management System

This document provides a detailed overview of the RESTful API endpoints for the Product Management System. All API interactions require authentication using a JSON Web Token (JWT), except for registration and login.

For interactive API exploration and testing, please refer to the [Swagger UI](#swagger-ui).

## Table of Contents

1.  [Base URL](#1-base-url)
2.  [Authentication](#2-authentication)
3.  [Categories](#3-categories)
4.  [Products](#4-products)
5.  [Error Responses](#5-error-responses)
6.  [Authentication Header](#6-authentication-header)
7.  [Swagger UI](#7-swagger-ui)

## 1. Base URL

The base URL for all API endpoints is:
`http://localhost:8080/api` (for local development)

## 2. Authentication

### Register a new user

*   **Endpoint:** `POST /api/auth/register`
*   **Description:** Creates a new user account with `ROLE_USER`.
*   **Request Body (`application/json`):**
    ```json
    {
      "username": "newuser",
      "email": "newuser@example.com",
      "password": "securepassword123"
    }
    ```
    *   `username` (string, required): Unique username for the new user. Min 3, Max 50 characters.
    *   `email` (string, required): Unique email address for the new user. Max 100 characters, valid email format.
    *   `password` (string, required): Password for the new user. Min 6 characters.
*   **Success Response (201 Created):**
    ```
    User registered successfully: newuser
    ```
*   **Error Responses:**
    *   `400 Bad Request`:
        *   If username or email already exists.
        *   If validation fails (e.g., empty fields, invalid email format, password too short).
        *   Example: `Username is already taken!` or `{ "message": "Email Address already in use!" }`
    *   `500 Internal Server Error`: Generic server error.

### Authenticate user and get JWT token

*   **Endpoint:** `POST /api/auth/login`
*   **Description:** Authenticates a user with username and password, returning a JWT token upon success.
*   **Request Body (`application/json`):**
    ```json
    {
      "username": "newuser",
      "password": "securepassword123"
    }
    ```
    *   `username` (string, required): Username of the existing user.
    *   `password` (string, required): Password of the existing user.
*   **Success Response (200 OK):**
    ```json
    {
      "accessToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJuZXd1c2VyIiwiaWF0IjoxNjcyNTYwMDAwLCJleHAiOjE2NzI2NDY0MDAsInJvbGVzIjpbIlJPTEVfVVNFUiJdfQ.EXAMPLE_JWT_TOKEN",
      "tokenType": "Bearer"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid username or password.
    *   `400 Bad Request`: Invalid request body (e.g., empty fields).
    *   `500 Internal Server Error`: Generic server error.

## 3. Categories

**Requires `Authorization: Bearer <JWT_TOKEN>` header for all endpoints.**

### Get all categories

*   **Endpoint:** `GET /api/categories`
*   **Description:** Retrieves a list of all product categories.
*   **Authorization:** `ROLE_USER`, `ROLE_ADMIN`
*   **Success Response (200 OK):**
    ```json
    [
      {
        "id": 1,
        "name": "Electronics",
        "description": "Gadgets and electronic devices"
      },
      {
        "id": 2,
        "name": "Books",
        "description": "Fiction and non-fiction books"
      }
    ]
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid JWT token.
    *   `500 Internal Server Error`: Generic server error.

### Get category by ID

*   **Endpoint:** `GET /api/categories/{id}`
*   **Description:** Retrieves a single category by its unique ID.
*   **Authorization:** `ROLE_USER`, `ROLE_ADMIN`
*   **Path Parameters:**
    *   `id` (long, required): The ID of the category.
*   **Success Response (200 OK):**
    ```json
    {
      "id": 1,
      "name": "Electronics",
      "description": "Gadgets and electronic devices"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid JWT token.
    *   `404 Not Found`: Category with the specified ID does not exist.
    *   `500 Internal Server Error`: Generic server error.

### Create a new category

*   **Endpoint:** `POST /api/categories`
*   **Description:** Creates a new product category.
*   **Authorization:** `ROLE_ADMIN` only
*   **Request Body (`application/json`):**
    ```json
    {
      "name": "New Category",
      "description": "Description for the new category"
    }
    ```
    *   `name` (string, required): The name of the category. Must be unique. Min 2, Max 100 characters.
    *   `description` (string, optional): A brief description of the category. Max 255 characters.
*   **Success Response (201 Created):**
    ```json
    {
      "id": 3,
      "name": "New Category",
      "description": "Description for the new category"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid JWT token.
    *   `403 Forbidden`: Authenticated user does not have `ROLE_ADMIN`.
    *   `400 Bad Request`:
        *   Invalid input (e.g., missing name, name too short/long).
        *   Category with the given name already exists.
    *   `500 Internal Server Error`: Generic server error.

### Update an existing category

*   **Endpoint:** `PUT /api/categories/{id}`
*   **Description:** Updates an existing product category.
*   **Authorization:** `ROLE_ADMIN` only
*   **Path Parameters:**
    *   `id` (long, required): The ID of the category to update.
*   **Request Body (`application/json`):**
    ```json
    {
      "name": "Updated Category Name",
      "description": "Updated description"
    }
    ```
    *   `name` (string, required): The new name for the category. Must be unique if changed from original. Min 2, Max 100 characters.
    *   `description` (string, optional): The new description for the category. Max 255 characters.
*   **Success Response (200 OK):**
    ```json
    {
      "id": 1,
      "name": "Updated Category Name",
      "description": "Updated description"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid JWT token.
    *   `403 Forbidden`: Authenticated user does not have `ROLE_ADMIN`.
    *   `404 Not Found`: Category with the specified ID does not exist.
    *   `400 Bad Request`:
        *   Invalid input.
        *   Updated category name already exists.
    *   `500 Internal Server Error`: Generic server error.

### Delete a category

*   **Endpoint:** `DELETE /api/categories/{id}`
*   **Description:** Deletes a product category by its ID.
*   **Authorization:** `ROLE_ADMIN` only
*   **Path Parameters:**
    *   `id` (long, required): The ID of the category to delete.
*   **Success Response (204 No Content):**
    *   No content is returned for a successful deletion.
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid JWT token.
    *   `403 Forbidden`: Authenticated user does not have `ROLE_ADMIN`.
    *   `404 Not Found`: Category with the specified ID does not exist.
    *   `500 Internal Server Error`: Generic server error.

## 4. Products

**Requires `Authorization: Bearer <JWT_TOKEN>` header for all endpoints.**

### Get all products / Search products

*   **Endpoint:** `GET /api/products`
*   **Description:** Retrieves a list of all products. Can be filtered by a search keyword.
*   **Authorization:** `ROLE_USER`, `ROLE_ADMIN`
*   **Query Parameters:**
    *   `search` (string, optional): A keyword to search for in product names or descriptions (case-insensitive).
*   **Success Response (200 OK):**
    ```json
    [
      {
        "id": 101,
        "name": "Laptop Pro X",
        "description": "High-performance laptop for professionals",
        "price": 1200.00,
        "stockQuantity": 50,
        "categoryId": 1,
        "categoryName": "Electronics"
      },
      {
        "id": 102,
        "name": "Wireless Headphones",
        "description": "Noise-cancelling over-ear headphones",
        "price": 199.99,
        "stockQuantity": 75,
        "categoryId": 1,
        "categoryName": "Electronics"
      }
    ]
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid JWT token.
    *   `500 Internal Server Error`: Generic server error.

### Get product by ID

*   **Endpoint:** `GET /api/products/{id}`
*   **Description:** Retrieves a single product by its unique ID.
*   **Authorization:** `ROLE_USER`, `ROLE_ADMIN`
*   **Path Parameters:**
    *   `id` (long, required): The ID of the product.
*   **Success Response (200 OK):**
    ```json
    {
      "id": 101,
      "name": "Laptop Pro X",
      "description": "High-performance laptop for professionals",
      "price": 1200.00,
      "stockQuantity": 50,
      "categoryId": 1,
      "categoryName": "Electronics"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid JWT token.
    *   `404 Not Found`: Product with the specified ID does not exist.
    *   `500 Internal Server Error`: Generic server error.

### Create a new product

*   **Endpoint:** `POST /api/products`
*   **Description:** Creates a new product and associates it with an existing category.
*   **Authorization:** `ROLE_ADMIN` only
*   **Request Body (`application/json`):**
    ```json
    {
      "name": "New Smartphone",
      "description": "Latest model with advanced features",
      "price": 799.99,
      "stockQuantity": 150,
      "categoryId": 1
    }
    ```
    *   `name` (string, required): The name of the product.
    *   `description` (string, optional): A brief description of the product.
    *   `price` (number, required): The price of the product. Must be greater than 0.
    *   `stockQuantity` (integer, required): The number of units in stock. Must be non-negative.
    *   `categoryId` (long, required): The ID of the category the product belongs to.
*   **Success Response (201 Created):**
    ```json
    {
      "id": 108,
      "name": "New Smartphone",
      "description": "Latest model with advanced features",
      "price": 799.99,
      "stockQuantity": 150,
      "categoryId": 1,
      "categoryName": "Electronics"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid JWT token.
    *   `403 Forbidden`: Authenticated user does not have `ROLE_ADMIN`.
    *   `400 Bad Request`:
        *   Invalid input (e.g., missing name, negative price/stock, invalid category ID).
        *   Category with `categoryId` does not exist.
    *   `500 Internal Server Error`: Generic server error.

### Update an existing product

*   **Endpoint:** `PUT /api/products/{id}`
*   **Description:** Updates an existing product's details.
*   **Authorization:** `ROLE_ADMIN` only
*   **Path Parameters:**
    *   `id` (long, required): The ID of the product to update.
*   **Request Body (`application/json`):**
    ```json
    {
      "name": "Updated Laptop Model",
      "description": "Improved performance and battery life",
      "price": 1350.00,
      "stockQuantity": 45,
      "categoryId": 1
    }
    ```
    *   `name` (string, required): The new name for the product.
    *   `description` (string, optional): The new description.
    *   `price` (number, required): The new price.
    *   `stockQuantity` (integer, required): The new stock quantity.
    *   `categoryId` (long, required): The ID of the category.
*   **Success Response (200 OK):**
    ```json
    {
      "id": 101,
      "name": "Updated Laptop Model",
      "description": "Improved performance and battery life",
      "price": 1350.00,
      "stockQuantity": 45,
      "categoryId": 1,
      "categoryName": "Electronics"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid JWT token.
    *   `403 Forbidden`: Authenticated user does not have `ROLE_ADMIN`.
    *   `404 Not Found`: Product with the specified ID or `categoryId` does not exist.
    *   `400 Bad Request`: Invalid input.
    *   `500 Internal Server Error`: Generic server error.

### Delete a product

*   **Endpoint:** `DELETE /api/products/{id}`
*   **Description:** Deletes a product by its ID.
*   **Authorization:** `ROLE_ADMIN` only
*   **Path Parameters:**
    *   `id` (long, required): The ID of the product to delete.
*   **Success Response (204 No Content):**
    *   No content is returned for a successful deletion.
*   **Error Responses:**
    *   `401 Unauthorized`: Missing or invalid JWT token.
    *   `403 Forbidden`: Authenticated user does not have `ROLE_ADMIN`.
    *   `404 Not Found`: Product with the specified ID does not exist.
    *   `500 Internal Server Error`: Generic server error.

## 5. Error Responses

The API provides consistent error responses in JSON format:

*   **400 Bad Request:**
    ```json
    {
      "timestamp": "2023-01-01T12:34:56.789+00:00",
      "status": 400,
      "error": "Bad Request",
      "message": "Validation failed: Category name is required; Price must be greater than 0",
      "path": "/api/products"
    }
    ```
    or for `IllegalArgumentException`:
    ```json
    {
      "timestamp": "2023-01-01T12:34:56.789+00:00",
      "status": 400,
      "error": "Bad Request",
      "message": "Category with name 'Existing Category' already exists.",
      "path": "/api/categories"
    }
    ```
*   **401 Unauthorized:**
    ```json
    {
      "timestamp": "2023-01-01T12:34:56.789+00:00",
      "status": 401,
      "error": "Unauthorized",
      "message": "Full authentication is required to access this resource",
      "path": "/api/products"
    }
    ```
*   **403 Forbidden:**
    ```json
    {
      "timestamp": "2023-01-01T12:34:56.789+00:00",
      "status": 403,
      "error": "Forbidden",
      "message": "Access Denied",
      "path": "/api/categories"
    }
    ```
*   **404 Not Found:**
    ```json
    {
      "timestamp": "2023-01-01T12:34:56.789+00:00",
      "status": 404,
      "error": "Not Found",
      "message": "Product not found with id: 99",
      "path": "/api/products/99"
    }
    ```
*   **429 Too Many Requests:**
    ```json
    {
      "timestamp": "2023-01-01T12:34:56.789+00:00",
      "status": 429,
      "error": "Too Many Requests",
      "message": "You have exceeded your request limit. Please try again later.",
      "path": "/api/products"
    }
    ```
*   **500 Internal Server Error:**
    ```json
    {
      "timestamp": "2023-01-01T12:34:56.789+00:00",
      "status": 500,
      "error": "Internal Server Error",
      "message": "An unexpected error occurred",
      "path": "/api/some-endpoint"
    }
    ```

## 6. Authentication Header

For all protected endpoints, include the JWT in the `Authorization` header:

```
Authorization: Bearer <YOUR_JWT_TOKEN_HERE>
```

Example `cURL` command for fetching products:

```bash
curl -X GET \
  http://localhost:8080/api/products \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer <YOUR_JWT_TOKEN>'
```

## 7. Swagger UI

An interactive API documentation generated by Springdoc OpenAPI is available at:
[http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

You can use the "Authorize" button in Swagger UI to provide your JWT token, and then directly test the protected endpoints.