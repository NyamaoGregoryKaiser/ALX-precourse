```markdown
# ALX-ECommerce-Pro: API Documentation

This document provides a comprehensive overview of the RESTful API endpoints for the ALX-ECommerce-Pro backend.

**Base URL:** `http://localhost:5000/api` (or your deployed backend URL)

## Authentication

All protected endpoints require a `Bearer` token in the `Authorization` header: `Authorization: Bearer <JWT_TOKEN>`.

### 1. Auth Endpoints

*   **`POST /api/auth/register`**
    *   **Description:** Register a new user.
    *   **Request Body:**
        ```json
        {
          "email": "string",
          "password": "string", (min 8 chars)
          "name": "string", (min 3 chars)
          "address": "string", (optional)
          "phone": "string" (optional)
        }
        ```
    *   **Success Response (201 Created):**
        ```json
        {
          "status": "success",
          "token": "string",
          "data": {
            "user": {
              "id": "uuid",
              "email": "string",
              "name": "string",
              "role": "USER",
              "createdAt": "datetime",
              "updatedAt": "datetime"
              // address, phone included if provided
            }
          }
        }
        ```
    *   **Error Responses (400 Bad Request, 409 Conflict):**
        ```json
        {
          "status": "fail",
          "message": "Error message"
        }
        ```

*   **`POST /api/auth/login`**
    *   **Description:** Log in an existing user. Rate-limited to prevent brute-force attacks.
    *   **Request Body:**
        ```json
        {
          "email": "string",
          "password": "string"
        }
        ```
    *   **Success Response (200 OK):** (Same as register success response, but status 200)
    *   **Error Responses (400 Bad Request, 401 Unauthorized, 429 Too Many Requests):**
        ```json
        {
          "status": "fail",
          "message": "Invalid credentials"
        }
        ```

*   **`GET /api/auth/me`**
    *   **Description:** Get the profile of the currently authenticated user.
    *   **Authentication:** Required (User or Admin)
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": {
            "user": {
              "id": "uuid",
              "email": "string",
              "name": "string",
              "role": "USER" | "ADMIN",
              "address": "string",
              "phone": "string",
              "createdAt": "datetime",
              "updatedAt": "datetime"
            }
          }
        }
        ```
    *   **Error Responses (401 Unauthorized, 404 Not Found):**

---

### 2. Product & Category Endpoints

#### Categories

*   **`POST /api/products/categories`**
    *   **Description:** Create a new product category.
    *   **Authentication:** Required (ADMIN)
    *   **Request Body:**
        ```json
        {
          "name": "string"
        }
        ```
    *   **Success Response (201 Created):**
        ```json
        {
          "status": "success",
          "data": {
            "category": {
              "id": "uuid",
              "name": "string",
              "createdAt": "datetime",
              "updatedAt": "datetime"
            }
          }
        }
        ```
    *   **Error Responses (400 Bad Request, 401 Unauthorized, 403 Forbidden, 409 Conflict):**

*   **`GET /api/products/categories`**
    *   **Description:** Get all product categories.
    *   **Authentication:** Optional (Publicly accessible, cached)
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "results": "number",
          "data": {
            "categories": [
              {
                "id": "uuid",
                "name": "string",
                "createdAt": "datetime",
                "updatedAt": "datetime"
              }
            ]
          }
        }
        ```

#### Products

*   **`POST /api/products`**
    *   **Description:** Create a new product.
    *   **Authentication:** Required (ADMIN)
    *   **Request Body:**
        ```json
        {
          "name": "string", (min 3 chars)
          "description": "string", (min 10 chars)
          "price": "number", (positive, 2 decimal places)
          "stock": "number", (integer, min 0)
          "imageUrl": "string", (valid URI)
          "categoryId": "uuid"
        }
        ```
    *   **Success Response (201 Created):**
        ```json
        {
          "status": "success",
          "data": {
            "product": {
              "id": "uuid",
              "name": "string",
              "description": "string",
              "price": "number",
              "stock": "number",
              "imageUrl": "string",
              "categoryId": "uuid",
              "createdAt": "datetime",
              "updatedAt": "datetime"
            }
          }
        }
        ```
    *   **Error Responses (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found - for categoryId):**

*   **`GET /api/products`**
    *   **Description:** Get a list of all products. Supports pagination, search, and filtering.
    *   **Authentication:** Optional (Publicly accessible, cached)
    *   **Query Parameters:**
        *   `page`: `number` (default: 1)
        *   `limit`: `number` (default: 10)
        *   `search`: `string` (case-insensitive name or description search)
        *   `categoryId`: `uuid` (filter by category)
        *   `minPrice`: `number` (filter by minimum price)
        *   `maxPrice`: `number` (filter by maximum price)
        *   `sortBy`: `string` (e.g., `createdAt`, `price`, `name`; default: `createdAt`)
        *   `sortOrder`: `string` (`asc` or `desc`; default: `desc`)
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "results": "number",
          "pagination": {
            "total": "number",
            "page": "number",
            "limit": "number",
            "totalPages": "number"
          },
          "data": {
            "products": [
              {
                "id": "uuid",
                "name": "string",
                "description": "string",
                "price": "number",
                "stock": "number",
                "imageUrl": "string",
                "categoryId": "uuid",
                "category": { // Included relation
                  "id": "uuid",
                  "name": "string"
                },
                "createdAt": "datetime",
                "updatedAt": "datetime"
              }
            ]
          }
        }
        ```

*   **`GET /api/products/:id`**
    *   **Description:** Get details of a single product by its ID.
    *   **Authentication:** Optional (Publicly accessible, cached)
    *   **Path Parameters:**
        *   `id`: `uuid` (Product ID)
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": {
            "product": {
              "id": "uuid",
              "name": "string",
              "description": "string",
              "price": "number",
              "stock": "number",
              "imageUrl": "string",
              "categoryId": "uuid",
              "category": {
                  "id": "uuid",
                  "name": "string"
              },
              "createdAt": "datetime",
              "updatedAt": "datetime"
            }
          }
        }
        ```
    *   **Error Responses (404 Not Found):**

*   **`PATCH /api/products/:id`**
    *   **Description:** Update an existing product.
    *   **Authentication:** Required (ADMIN)
    *   **Path Parameters:**
        *   `id`: `uuid` (Product ID)
    *   **Request Body:** (Any subset of product creation fields, min 1 field)
        ```json
        {
          "name": "string", (optional)
          "description": "string", (optional)
          "price": "number", (optional)
          "stock": "number", (optional)
          "imageUrl": "string", (optional)
          "categoryId": "uuid" (optional)
        }
        ```
    *   **Success Response (200 OK):** (Same as create product success response)
    *   **Error Responses (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found):**

*   **`DELETE /api/products/:id`**
    *   **Description:** Delete a product.
    *   **Authentication:** Required (ADMIN)
    *   **Path Parameters:**
        *   `id`: `uuid` (Product ID)
    *   **Success Response (204 No Content):** (No body)
    *   **Error Responses (401 Unauthorized, 403 Forbidden, 404 Not Found):**

---

### 3. User Endpoints

*   **`GET /api/users/me`**
    *   **Description:** Get the profile of the currently authenticated user. (Alias for `/api/auth/me`).
    *   **Authentication:** Required (User or Admin)
    *   **Success Response (200 OK):** Same as `GET /api/auth/me`.

*   **`PATCH /api/users/updateMe`**
    *   **Description:** Update the profile of the currently authenticated user.
    *   **Authentication:** Required (User or Admin)
    *   **Request Body:** (Any subset of user fields, excluding password and role)
        ```json
        {
          "name": "string", (optional)
          "email": "string", (optional)
          "address": "string", (optional)
          "phone": "string" (optional)
        }
        ```
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": {
            "user": {
              "id": "uuid",
              "email": "string",
              "name": "string",
              "role": "USER" | "ADMIN",
              "address": "string",
              "phone": "string",
              "createdAt": "datetime",
              "updatedAt": "datetime"
            }
          }
        }
        ```
    *   **Error Responses (400 Bad Request, 401 Unauthorized, 403 Forbidden - if trying to change role):**

---

### 4. Admin User Management Endpoints

These endpoints are only accessible by users with the `ADMIN` role.

*   **`GET /api/users`**
    *   **Description:** Get a list of all users. Supports pagination, search, and filtering by role.
    *   **Authentication:** Required (ADMIN)
    *   **Query Parameters:**
        *   `page`: `number` (default: 1)
        *   `limit`: `number` (default: 10)
        *   `search`: `string` (case-insensitive name, email, address, or phone search)
        *   `role`: `string` (`USER` or `ADMIN`; filter by role)
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "results": "number",
          "pagination": {
            "total": "number",
            "page": "number",
            "limit": "number",
            "totalPages": "number"
          },
          "data": {
            "users": [
              {
                "id": "uuid",
                "email": "string",
                "name": "string",
                "role": "USER" | "ADMIN",
                "address": "string",
                "phone": "string",
                "createdAt": "datetime",
                "updatedAt": "datetime"
              }
            ]
          }
        }
        ```
    *   **Error Responses (401 Unauthorized, 403 Forbidden):**

*   **`GET /api/users/:id`**
    *   **Description:** Get details of a single user by their ID.
    *   **Authentication:** Required (ADMIN)
    *   **Path Parameters:**
        *   `id`: `uuid` (User ID)
    *   **Success Response (200 OK):** (Same as `GET /api/auth/me` success response)
    *   **Error Responses (401 Unauthorized, 403 Forbidden, 404 Not Found):**

*   **`PATCH /api/users/:id`**
    *   **Description:** Update an existing user's profile, including their role.
    *   **Authentication:** Required (ADMIN)
    *   **Path Parameters:**
        *   `id`: `uuid` (User ID)
    *   **Request Body:** (Any subset of user fields)
        ```json
        {
          "name": "string", (optional)
          "email": "string", (optional)
          "address": "string", (optional)
          "phone": "string", (optional)
          "role": "USER" | "ADMIN" (optional)
        }
        ```
    *   **Success Response (200 OK):** (Same as `PATCH /api/users/updateMe` success response)
    *   **Error Responses (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict):**

*   **`DELETE /api/users/:id`**
    *   **Description:** Delete a user.
    *   **Authentication:** Required (ADMIN)
    *   **Path Parameters:**
        *   `id`: `uuid` (User ID)
    *   **Success Response (204 No Content):** (No body)
    *   **Error Responses (401 Unauthorized, 403 Forbidden - cannot delete own admin account, 404 Not Found):**

---

### 5. Cart Endpoints

All cart endpoints require user authentication.

*   **`GET /api/cart`**
    *   **Description:** Get the authenticated user's shopping cart details.
    *   **Authentication:** Required (USER or ADMIN)
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": {
            "cart": {
              "id": "uuid",
              "userId": "uuid",
              "createdAt": "datetime",
              "updatedAt": "datetime",
              "items": [
                {
                  "id": "uuid",
                  "cartId": "uuid",
                  "productId": "uuid",
                  "quantity": "number",
                  "createdAt": "datetime",
                  "updatedAt": "datetime",
                  "product": { // Product details included
                    "id": "uuid",
                    "name": "string",
                    "description": "string",
                    "price": "number",
                    "stock": "number",
                    "imageUrl": "string"
                  }
                }
              ],
              "total": "number" // Calculated total price of items in cart
            }
          }
        }
        ```
    *   **Error Responses (401 Unauthorized):**

*   **`POST /api/cart`**
    *   **Description:** Add a product to the cart or update its quantity if already present.
    *   **Authentication:** Required (USER or ADMIN)
    *   **Request Body:**
        ```json
        {
          "productId": "uuid",
          "quantity": "number" (min 1)
        }
        ```
    *   **Success Response (200 OK):** (Same as `GET /api/cart` success response)
    *   **Error Responses (400 Bad Request - e.g., insufficient stock, 401 Unauthorized, 404 Not Found - for productId):**

*   **`PATCH /api/cart/:cartItemId`**
    *   **Description:** Update the quantity of a specific item in the cart. If `quantity` is 0, the item is removed.
    *   **Authentication:** Required (USER or ADMIN)
    *   **Path Parameters:**
        *   `cartItemId`: `uuid` (ID of the cart item)
    *   **Request Body:**
        ```json
        {
          "quantity": "number" (min 0)
        }
        ```
    *   **Success Response (200 OK):** (Same as `GET /api/cart` success response)
    *   **Error Responses (400 Bad Request - e.g., insufficient stock, 401 Unauthorized, 404 Not Found - for cartItemId):**

*   **`DELETE /api/cart/:cartItemId`**
    *   **Description:** Remove a specific item from the cart.
    *   **Authentication:** Required (USER or ADMIN)
    *   **Path Parameters:**
        *   `cartItemId`: `uuid` (ID of the cart item)
    *   **Success Response (200 OK):** (Same as `GET /api/cart` success response)
    *   **Error Responses (401 Unauthorized, 404 Not Found - for cartItemId):**

*   **`DELETE /api/cart`**
    *   **Description:** Clear all items from the user's cart.
    *   **Authentication:** Required (USER or ADMIN)
    *   **Success Response (200 OK):** (Same as `GET /api/cart` success response, but with empty items array)
    *   **Error Responses (401 Unauthorized):**
```