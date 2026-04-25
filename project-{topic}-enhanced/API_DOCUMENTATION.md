```markdown
# API Documentation: Enterprise Security System

This document provides detailed information about the API endpoints of the Enterprise Security System.

**Base URL**: `http://localhost:5000/api/v1`

---

## Authentication Endpoints

These endpoints handle user registration, login, token refresh, and profile retrieval.

### 1. Register User

-   **URL**: `/auth/register`
-   **Method**: `POST`
-   **Description**: Registers a new user with a specified username, email, password, and role.
-   **Authentication**: None
-   **Request Body**: `application/json`
    ```json
    {
        "username": "string",       // Required, min 3, max 30 alphanumeric
        "email": "string",          // Required, valid email format
        "password": "string",       // Required, min 8 characters
        "role": "string"            // Optional, default "user". Enum: "user", "admin"
    }
    ```
-   **Response (201 Created)**:
    ```json
    {
        "status": "success",
        "message": "User registered successfully",
        "data": {
            "user": {
                "id": "uuid",
                "username": "string",
                "email": "string",
                "role": "string"
            }
        },
        "tokens": {
            "accessToken": "string",
            "refreshToken": "string"
        }
    }
    ```
-   **Error Responses**:
    -   `400 Bad Request`: Invalid input data (e.g., weak password, invalid email, missing fields).
    -   `409 Conflict`: User with provided email already exists.
    -   `500 Internal Server Error`: Server-side issues.

### 2. Login User

-   **URL**: `/auth/login`
-   **Method**: `POST`
-   **Description**: Authenticates a user and returns an access token and a refresh token.
-   **Authentication**: None
-   **Request Body**: `application/json`
    ```json
    {
        "email": "string",          // Required, valid email format
        "password": "string"        // Required
    }
    ```
-   **Response (200 OK)**:
    ```json
    {
        "status": "success",
        "message": "Logged in successfully",
        "data": {
            "user": {
                "id": "uuid",
                "username": "string",
                "email": "string",
                "role": "string"
            }
        },
        "tokens": {
            "accessToken": "string",
            "refreshToken": "string"
        }
    }
    ```
-   **Error Responses**:
    -   `400 Bad Request`: Invalid input data (e.g., missing fields).
    -   `401 Unauthorized`: Incorrect email or password.
    -   `500 Internal Server Error`: Server-side issues.

### 3. Refresh Access Token

-   **URL**: `/auth/refresh-token`
-   **Method**: `POST`
-   **Description**: Uses a refresh token to obtain a new access token and a new refresh token (token rotation).
-   **Authentication**: None (uses refresh token in body)
-   **Request Body**: `application/json`
    ```json
    {
        "refreshToken": "string"    // Required, a valid refresh token
    }
    ```
-   **Response (200 OK)**:
    ```json
    {
        "status": "success",
        "message": "Access token refreshed successfully",
        "tokens": {
            "accessToken": "string",
            "refreshToken": "string"
        }
    }
    ```
-   **Error Responses**:
    -   `400 Bad Request`: Invalid input (e.g., missing refresh token).
    -   `401 Unauthorized`: Invalid or expired refresh token.
    -   `500 Internal Server Error`: Server-side issues.

### 4. Logout User

-   **URL**: `/auth/logout`
-   **Method**: `POST`
-   **Description**: Invalidates the provided refresh token, effectively logging out the user from all sessions using that token. Requires an access token for authentication.
-   **Authentication**: Required (Bearer Token)
-   **Request Body**: `application/json`
    ```json
    {
        "refreshToken": "string"    // Required, the refresh token to invalidate
    }
    ```
-   **Response (200 OK)**:
    ```json
    {
        "status": "success",
        "message": "Logged out successfully"
    }
    ```
-   **Error Responses**:
    -   `400 Bad Request`: Missing refresh token in body.
    -   `401 Unauthorized`: Invalid or missing access token.
    -   `404 Not Found`: Refresh token not found or already invalidated.
    -   `500 Internal Server Error`: Server-side issues.

### 5. Get User Profile

-   **URL**: `/auth/profile`
-   **Method**: `GET`
-   **Description**: Retrieves the profile details of the authenticated user.
-   **Authentication**: Required (Bearer Token)
-   **Response (200 OK)**:
    ```json
    {
        "status": "success",
        "data": {
            "user": {
                "id": "uuid",
                "username": "string",
                "email": "string",
                "role": "string"
            }
        }
    }
    ```
-   **Error Responses**:
    -   `401 Unauthorized`: Invalid or missing access token.
    -   `404 Not Found`: User not found (should generally not happen if token is valid).
    -   `500 Internal Server Error`: Server-side issues.

---

## User Management Endpoints (Admin Only)

These endpoints allow administrators to manage user accounts.

-   **Authentication**: Required (Bearer Token)
-   **Authorization**: `admin` role required for all operations.

### 1. Get All Users

-   **URL**: `/users`
-   **Method**: `GET`
-   **Description**: Retrieves a list of all registered users.
-   **Response (200 OK)**:
    ```json
    {
        "status": "success",
        "results": 2, // Number of users
        "data": {
            "users": [
                {
                    "id": "uuid",
                    "username": "string",
                    "email": "string",
                    "role": "string"
                }
                // ... more user objects
            ]
        }
    }
    ```
-   **Error Responses**:
    -   `401 Unauthorized`: Invalid or missing access token.
    -   `403 Forbidden`: User does not have `admin` role.
    -   `500 Internal Server Error`: Server-side issues.

### 2. Create User

-   **URL**: `/users`
-   **Method**: `POST`
-   **Description**: Creates a new user account. This is distinct from `/auth/register` as it's for admin-driven creation.
-   **Request Body**: `application/json`
    ```json
    {
        "username": "string",       // Required, min 3, max 30 alphanumeric
        "email": "string",          // Required, valid email format
        "password": "string",       // Required, min 8 characters
        "role": "string"            // Required, Enum: "user", "admin"
    }
    ```
-   **Response (201 Created)**:
    ```json
    {
        "status": "success",
        "message": "User created successfully",
        "data": {
            "user": {
                "id": "uuid",
                "username": "string",
                "email": "string",
                "role": "string"
            }
        }
    }
    ```
-   **Error Responses**:
    -   `400 Bad Request`: Invalid input data.
    -   `401 Unauthorized`: Invalid or missing access token.
    -   `403 Forbidden`: User does not have `admin` role.
    -   `409 Conflict`: User with provided email already exists.
    -   `500 Internal Server Error`: Server-side issues.

### 3. Get User by ID

-   **URL**: `/users/:id`
-   **Method**: `GET`
-   **Description**: Retrieves details of a specific user by their ID.
-   **Path Parameters**:
    -   `id`: `uuid` (Required) - The UUID of the user.
-   **Response (200 OK)**:
    ```json
    {
        "status": "success",
        "data": {
            "user": {
                "id": "uuid",
                "username": "string",
                "email": "string",
                "role": "string"
            }
        }
    }
    ```
-   **Error Responses**:
    -   `400 Bad Request`: Invalid UUID format.
    -   `401 Unauthorized`: Invalid or missing access token.
    -   `403 Forbidden`: User does not have `admin` role.
    -   `404 Not Found`: User with the specified ID not found.
    -   `500 Internal Server Error`: Server-side issues.

### 4. Update User

-   **URL**: `/users/:id`
-   **Method**: `PUT`
-   **Description**: Updates the details of a specific user.
-   **Path Parameters**:
    -   `id`: `uuid` (Required) - The UUID of the user.
-   **Request Body**: `application/json` (at least one field required)
    ```json
    {
        "username": "string",       // Optional, min 3, max 30 alphanumeric
        "email": "string",          // Optional, valid email format
        "password": "string",       // Optional, min 8 characters (will be hashed)
        "role": "string"            // Optional, Enum: "user", "admin"
    }
    ```
-   **Response (200 OK)**:
    ```json
    {
        "status": "success",
        "message": "User updated successfully",
        "data": {
            "user": {
                "id": "uuid",
                "username": "string",
                "email": "string",
                "role": "string"
            }
        }
    }
    ```
-   **Error Responses**:
    -   `400 Bad Request`: Invalid input data or UUID format.
    -   `401 Unauthorized`: Invalid or missing access token.
    -   `403 Forbidden`: User does not have `admin` role.
    -   `404 Not Found`: User with the specified ID not found.
    -   `409 Conflict`: Attempted to update with a duplicate email.
    -   `500 Internal Server Error`: Server-side issues.

### 5. Delete User

-   **URL**: `/users/:id`
-   **Method**: `DELETE`
-   **Description**: Deletes a specific user account.
-   **Path Parameters**:
    -   `id`: `uuid` (Required) - The UUID of the user.
-   **Response (204 No Content)**:
    -   Successful deletion returns an empty response body.
-   **Error Responses**:
    -   `400 Bad Request`: Invalid UUID format.
    -   `401 Unauthorized`: Invalid or missing access token.
    -   `403 Forbidden`: User does not have `admin` role.
    -   `404 Not Found`: User with the specified ID not found.
    -   `500 Internal Server Error`: Server-side issues.

---

## Product Management Endpoints

These endpoints allow management of product resources. Some are publicly accessible and cached, others require authentication and admin privileges.

### 1. Get All Products

-   **URL**: `/products`
-   **Method**: `GET`
-   **Description**: Retrieves a list of all products. This endpoint is public and uses a caching layer.
-   **Authentication**: None
-   **Response (200 OK)**:
    ```json
    {
        "status": "success",
        "results": 3, // Number of products
        "message": "Data from cache" // Or omitted if from DB
        "data": {
            "products": [
                {
                    "id": "uuid",
                    "name": "string",
                    "description": "string",
                    "price": "decimal",
                    "stock": "integer",
                    "createdAt": "datetime",
                    "updatedAt": "datetime"
                }
                // ... more product objects
            ]
        }
    }
    ```
-   **Error Responses**:
    -   `500 Internal Server Error`: Server-side issues.

### 2. Get Product by ID

-   **URL**: `/products/:id`
-   **Method**: `GET`
-   **Description**: Retrieves details of a specific product by its ID. This endpoint is public and uses a caching layer.
-   **Authentication**: None
-   **Path Parameters**:
    -   `id`: `uuid` (Required) - The UUID of the product.
-   **Response (200 OK)**:
    ```json
    {
        "status": "success",
        "message": "Data from cache" // Or omitted if from DB
        "data": {
            "product": {
                "id": "uuid",
                "name": "string",
                "description": "string",
                "price": "decimal",
                "stock": "integer",
                "createdAt": "datetime",
                "updatedAt": "datetime"
            }
        }
    }
    ```
-   **Error Responses**:
    -   `400 Bad Request`: Invalid UUID format.
    -   `404 Not Found`: Product with the specified ID not found.
    -   `500 Internal Server Error`: Server-side issues.

### 3. Create Product

-   **URL**: `/products`
-   **Method**: `POST`
-   **Description**: Creates a new product.
-   **Authentication**: Required (Bearer Token)
-   **Authorization**: `admin` role required.
-   **Request Body**: `application/json`
    ```json
    {
        "name": "string",           // Required, min 3, max 100
        "description": "string",    // Optional, min 10, max 500
        "price": 99.99,             // Required, positive decimal
        "stock": 100                // Optional, default 0, min 0 integer
    }
    ```
-   **Response (201 Created)**:
    ```json
    {
        "status": "success",
        "message": "Product created successfully",
        "data": {
            "product": {
                "id": "uuid",
                "name": "string",
                "description": "string",
                "price": "decimal",
                "stock": "integer",
                "createdAt": "datetime",
                "updatedAt": "datetime"
            }
        }
    }
    ```
-   **Error Responses**:
    -   `400 Bad Request`: Invalid input data.
    -   `401 Unauthorized`: Invalid or missing access token.
    -   `403 Forbidden`: User does not have `admin` role.
    -   `409 Conflict`: Product with provided name already exists.
    -   `500 Internal Server Error`: Server-side issues.

### 4. Update Product

-   **URL**: `/products/:id`
-   **Method**: `PUT`
-   **Description**: Updates the details of a specific product.
-   **Authentication**: Required (Bearer Token)
-   **Authorization**: `admin` role required.
-   **Path Parameters**:
    -   `id`: `uuid` (Required) - The UUID of the product.
-   **Request Body**: `application/json` (at least one field required)
    ```json
    {
        "name": "string",           // Optional, min 3, max 100
        "description": "string",    // Optional, min 10, max 500
        "price": 99.99,             // Optional, positive decimal
        "stock": 100                // Optional, min 0 integer
    }
    ```
-   **Response (200 OK)**:
    ```json
    {
        "status": "success",
        "message": "Product updated successfully",
        "data": {
            "product": {
                "id": "uuid",
                "name": "string",
                "description": "string",
                "price": "decimal",
                "stock": "integer",
                "createdAt": "datetime",
                "updatedAt": "datetime"
            }
        }
    }
    ```
-   **Error Responses**:
    -   `400 Bad Request`: Invalid input data or UUID format.
    -   `401 Unauthorized`: Invalid or missing access token.
    -   `403 Forbidden`: User does not have `admin` role.
    -   `404 Not Found`: Product with the specified ID not found.
    -   `409 Conflict`: Attempted to update with a duplicate name.
    -   `500 Internal Server Error`: Server-side issues.

### 5. Delete Product

-   **URL**: `/products/:id`
-   **Method**: `DELETE`
-   **Description**: Deletes a specific product.
-   **Authentication**: Required (Bearer Token)
-   **Authorization**: `admin` role required.
-   **Path Parameters**:
    -   `id`: `uuid` (Required) - The UUID of the product.
-   **Response (204 No Content)**:
    -   Successful deletion returns an empty response body.
-   **Error Responses**:
    -   `400 Bad Request`: Invalid UUID format.
    -   `401 Unauthorized`: Invalid or missing access token.
    -   `403 Forbidden`: User does not have `admin` role.
    -   `404 Not Found`: Product with the specified ID not found.
    -   `500 Internal Server Error`: Server-side issues.

---

## Other Endpoints

### 1. Health Check

-   **URL**: `/health`
-   **Method**: `GET`
-   **Description**: Basic health check endpoint to verify if the server is running.
-   **Authentication**: None
-   **Response (200 OK)**:
    ```json
    {
        "status": "UP",
        "timestamp": "datetime"
    }
    ```
-   **Error Responses**: (Rare, indicates server failure)
    -   `500 Internal Server Error`

---
```