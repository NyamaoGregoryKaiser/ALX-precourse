```markdown
# E-commerce API Documentation

This document outlines the RESTful API endpoints for the E-commerce Solution System.
The API follows a standard REST convention for resource manipulation and is protected with JWT authentication.

**Base URL:** `http://localhost:5000/api/v1` (or `http://localhost/api/v1` if using Nginx)

## Authentication

Authentication is performed using JSON Web Tokens (JWT).
Upon successful login or registration, the API returns `accessToken` and `refreshToken`.
The `accessToken` should be included in the `Authorization` header of subsequent requests as a Bearer token.

**Header Example:**
`Authorization: Bearer <accessToken>`

### Endpoints

---

### 1. Auth

*   **`POST /auth/register`**
    *   **Description**: Register a new user.
    *   **Access**: Public
    *   **Request Body**:
        ```json
        {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com",
          "password": "Password123!"
        }
        ```
    *   **Response**:
        ```json
        {
          "user": {
            "id": "uuid",
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@example.com",
            "role": "user",
            "isEmailVerified": false,
            "createdAt": "timestamp",
            "updatedAt": "timestamp"
          },
          "tokens": {
            "access": {
              "token": "jwt_token",
              "expires": "timestamp"
            },
            "refresh": {
              "token": "jwt_token",
              "expires": "timestamp"
            }
          }
        }
        ```
    *   **Error Codes**: `400 Bad Request` (e.g., email already taken, invalid input)

*   **`POST /auth/login`**
    *   **Description**: Authenticate user and get access and refresh tokens.
    *   **Access**: Public
    *   **Request Body**:
        ```json
        {
          "email": "john.doe@example.com",
          "password": "Password123!"
        }
        ```
    *   **Response**: Same as register response, but without `isEmailVerified` initially.
    *   **Error Codes**: `401 Unauthorized` (incorrect email/password)

*   **`POST /auth/logout`**
    *   **Description**: Invalidate the current access token. (Note: Refresh token remains valid until expiry or explicit invalidation).
    *   **Access**: Authenticated User
    *   **Response**: `204 No Content`

*   **`POST /auth/refresh-tokens`**
    *   **Description**: Generate new access and refresh tokens using a valid refresh token.
    *   **Access**: Public (requires a valid refresh token in the request body or Authorization header)
    *   **Request Body**:
        ```json
        {
          "refreshToken": "your_refresh_token_here"
        }
        ```
    *   **Response**:
        ```json
        {
          "user": { /* user details */ },
          "tokens": {
            "access": {
              "token": "new_access_token",
              "expires": "timestamp"
            },
            "refresh": {
              "token": "new_refresh_token",
              "expires": "timestamp"
            }
          }
        }
        ```
    *   **Error Codes**: `401 Unauthorized` (invalid or expired refresh token)

---

### 2. Users

*   **`GET /users`**
    *   **Description**: Get a list of all users. Can be filtered and paginated.
    *   **Access**: Admin
    *   **Query Parameters**: `firstName`, `lastName`, `email`, `role`, `sortBy`, `limit`, `page`.
    *   **Response**: Paginated user list.
        ```json
        {
          "results": [{ ...user_object }, ...],
          "totalResults": 100,
          "page": 1,
          "limit": 10,
          "totalPages": 10
        }
        ```

*   **`GET /users/:userId`**
    *   **Description**: Get user details by ID.
    *   **Access**: Admin or Owner of the user ID.
    *   **Response**: `200 OK` with user object. `404 Not Found` if user doesn't exist.

*   **`PATCH /users/:userId`**
    *   **Description**: Update user details by ID.
    *   **Access**: Admin or Owner of the user ID (limited fields). Admin can update more fields including role.
    *   **Request Body**: `{ "firstName": "NewName", "email": "new@example.com", ... }`
    *   **Response**: `200 OK` with updated user object.
    *   **Error Codes**: `403 Forbidden` (non-admin trying to change role), `400 Bad Request` (email already taken).

*   **`DELETE /users/:userId`**
    *   **Description**: Delete a user by ID.
    *   **Access**: Admin
    *   **Response**: `204 No Content`

---

### 3. Products

*   **`POST /products`**
    *   **Description**: Create a new product.
    *   **Access**: Admin
    *   **Request Body**:
        ```json
        {
          "name": "New Gadget",
          "description": "A cool new gadget.",
          "price": 49.99,
          "stockQuantity": 100,
          "imageUrl": "https://example.com/gadget.jpg",
          "categoryId": "uuid_of_category"
        }
        ```
    *   **Response**: `201 Created` with product object.

*   **`GET /products`**
    *   **Description**: Get a list of all products. Supports filtering, pagination, sorting, and population of related `category`.
    *   **Access**: Public (cached)
    *   **Query Parameters**: `name`, `categoryId`, `minPrice`, `maxPrice`, `availability`, `sortBy`, `limit`, `page`, `populate=category`.
    *   **Response**: Paginated product list.

*   **`GET /products/:productId`**
    *   **Description**: Get product details by ID.
    *   **Access**: Public (cached)
    *   **Response**: `200 OK` with product object.

*   **`PATCH /products/:productId`**
    *   **Description**: Update product details by ID.
    *   **Access**: Admin
    *   **Request Body**: `{ "price": 55.00, "stockQuantity": 90, ... }`
    *   **Response**: `200 OK` with updated product object.

*   **`DELETE /products/:productId`**
    *   **Description**: Delete a product by ID.
    *   **Access**: Admin
    *   **Response**: `204 No Content`

---

### 4. Categories

*   **`POST /products/categories`**
    *   **Description**: Create a new product category.
    *   **Access**: Admin
    *   **Request Body**: `{ "name": "Electronics", "description": "Electronic gadgets and devices" }`
    *   **Response**: `201 Created` with category object.

*   **`GET /products/categories`**
    *   **Description**: Get a list of all categories.
    *   **Access**: Public (cached)
    *   **Response**: Array of category objects.

*   **`GET /products/categories/:categoryId`**
    *   **Description**: Get category details by ID.
    *   **Access**: Public (cached)
    *   **Response**: `200 OK` with category object.

*   **`PATCH /products/categories/:categoryId`**
    *   **Description**: Update category details by ID.
    *   **Access**: Admin
    *   **Request Body**: `{ "name": "Consumer Electronics" }`
    *   **Response**: `200 OK` with updated category object.

*   **`DELETE /products/categories/:categoryId`**
    *   **Description**: Delete a category by ID. Products associated with this category will have their `categoryId` set to `NULL`.
    *   **Access**: Admin
    *   **Response**: `204 No Content`

---

### 5. Orders

*   **`POST /orders`**
    *   **Description**: Create a new order. Deducts stock quantities.
    *   **Access**: Authenticated User
    *   **Request Body**:
        ```json
        {
          "items": [
            { "productId": "uuid1", "quantity": 1 },
            { "productId": "uuid2", "quantity": 2 }
          ],
          "shippingAddress": {
            "street": "123 Main St",
            "city": "Anytown",
            "state": "Anystate",
            "zipCode": "12345",
            "country": "USA"
          },
          "paymentMethod": "credit_card"
        }
        ```
    *   **Response**: `201 Created` with order object.
    *   **Error Codes**: `400 Bad Request` (insufficient stock, invalid items), `404 Not Found` (product not found).

*   **`GET /orders`**
    *   **Description**: Get a list of orders. Users can view their own orders. Admins can view all orders and filter by `userId`.
    *   **Access**: Authenticated User or Admin
    *   **Query Parameters**: `userId` (Admin only), `status`, `paymentStatus`, `sortBy`, `limit`, `page`, `populate=user,orderItems,orderItems.product`.
    *   **Response**: Paginated order list.

*   **`GET /orders/:orderId`**
    *   **Description**: Get order details by ID.
    *   **Access**: Owner of the order or Admin.
    *   **Response**: `200 OK` with order object including `user` and `orderItems`.

*   **`PATCH /orders/:orderId/status`**
    *   **Description**: Update the status of an order (e.g., `processing`, `shipped`, `delivered`).
    *   **Access**: Admin
    *   **Request Body**: `{ "status": "shipped" }`
    *   **Response**: `200 OK` with updated order object.
    *   **Error Codes**: `400 Bad Request` (invalid status, invalid state transition), `404 Not Found`.

*   **`PATCH /orders/:orderId/payment-status`**
    *   **Description**: Update the payment status of an order (e.g., `paid`, `refunded`).
    *   **Access**: Admin (or triggered by payment gateway webhooks).
    *   **Request Body**: `{ "paymentStatus": "paid" }`
    *   **Response**: `200 OK` with updated order object.

*   **`PATCH /orders/:orderId/cancel`**
    *   **Description**: Cancel an order and restore product stock.
    *   **Access**: Owner of the order or Admin.
    *   **Response**: `200 OK` with updated order object (status set to `cancelled`).
    *   **Error Codes**: `400 Bad Request` (cannot cancel delivered orders).

---
```