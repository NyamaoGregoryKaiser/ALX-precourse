```markdown
# E-commerce API Documentation

This document provides a comprehensive overview of the E-commerce API endpoints, including request formats, response structures, and authentication requirements.

**Base URL**: `/api/v1`

## Authentication

All protected routes require a JSON Web Token (JWT) to be sent in the `Authorization` header as a Bearer token.

**Header Example:**
`Authorization: Bearer <your_jwt_token>`

### 1. Register User

*   **URL**: `/auth/register`
*   **Method**: `POST`
*   **Access**: Public
*   **Description**: Registers a new customer user.
*   **Request Body (application/json)**:
    ```json
    {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "password": "StrongPassword123!"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "status": "success",
      "data": {
        "user": {
          "id": "uuid-string",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com",
          "role": "customer",
          "isActive": true,
          "createdAt": "2023-10-26T10:00:00.000Z",
          "updatedAt": "2023-10-26T10:00:00.000Z"
        }
      },
      "token": "jwt-token-string"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid input (e.g., weak password, invalid email format).
    *   `409 Conflict`: User with this email already exists.

### 2. Login User

*   **URL**: `/auth/login`
*   **Method**: `POST`
*   **Access**: Public
*   **Description**: Authenticates a user and returns a JWT token.
*   **Request Body (application/json)**:
    ```json
    {
      "email": "john.doe@example.com",
      "password": "StrongPassword123!"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "status": "success",
      "data": {
        "user": {
          "id": "uuid-string",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com",
          "role": "customer",
          "isActive": true,
          "createdAt": "2023-10-26T10:00:00.000Z",
          "updatedAt": "2023-10-26T10:00:00.000Z"
        }
      },
      "token": "jwt-token-string"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Missing credentials.
    *   `401 Unauthorized`: Incorrect email or password.

### 3. Get Current User Profile

*   **URL**: `/auth/me`
*   **Method**: `GET`
*   **Access**: Private (Authenticated Users)
*   **Description**: Retrieves the profile of the currently authenticated user.
*   **Response (200 OK)**:
    ```json
    {
      "status": "success",
      "data": {
        "user": {
          "id": "uuid-string",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com",
          "role": "customer",
          "isActive": true,
          "createdAt": "2023-10-26T10:00:00.000Z",
          "updatedAt": "2023-10-26T10:00:00.000Z"
        }
      }
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: No token, invalid token, or expired token.

---

## Products

### 1. Get All Products

*   **URL**: `/products`
*   **Method**: `GET`
*   **Access**: Public
*   **Description**: Retrieves a list of all products. Supports filtering, sorting, pagination, and field selection.
*   **Query Parameters**:
    *   `category`: Filter by category slug.
    *   `price[gte|lte|gt|lt]`: Filter by price range (e.g., `price[gte]=100`).
    *   `name[regex]`: Search product names (case-insensitive contains).
    *   `sort`: Sort results (e.g., `sort=price,-ratingsAverage`).
    *   `fields`: Select specific fields (e.g., `fields=name,price,category`).
    *   `page`: Page number for pagination (default: 1).
    *   `limit`: Number of results per page (default: 100).
*   **Example Request**: `GET /api/v1/products?category=electronics&price[gte]=100&sort=-price&page=2&limit=10`
*   **Response (200 OK)**:
    ```json
    {
      "status": "success",
      "results": 10,
      "total": 100,
      "data": {
        "products": [
          {
            "id": "uuid-string",
            "name": "Smartphone X",
            "description": "...",
            "price": 999.99,
            "stock": 50,
            "images": ["url1", "url2"],
            "ratingsAverage": 4.5,
            "ratingsQuantity": 10,
            "category": { "id": "uuid-string", "name": "Electronics" },
            "seller": { "id": "uuid-string", "firstName": "Jane" },
            "createdAt": "...",
            "updatedAt": "..."
          }
        ]
      }
    }
    ```

### 2. Get Product by ID

*   **URL**: `/products/:id`
*   **Method**: `GET`
*   **Access**: Public
*   **Description**: Retrieves a single product by its ID.
*   **Response (200 OK)**:
    ```json
    {
      "status": "success",
      "data": {
        "product": {
          "id": "uuid-string",
          "name": "Smartphone X",
          "description": "...",
          "price": 999.99,
          "stock": 50,
          "images": ["url1", "url2"],
          "ratingsAverage": 4.5,
          "ratingsQuantity": 10,
          "category": { "id": "uuid-string", "name": "Electronics" },
          "seller": { "id": "uuid-string", "firstName": "Jane" },
          "createdAt": "...",
          "updatedAt": "..."
        }
      }
    }
    ```
*   **Error Responses**:
    *   `404 Not Found`: Product with the given ID does not exist.

### 3. Create Product

*   **URL**: `/products`
*   **Method**: `POST`
*   **Access**: Private (Admin, Seller)
*   **Description**: Creates a new product. The `seller` will be automatically set to the authenticated user.
*   **Request Body (application/json)**:
    ```json
    {
      "name": "New Awesome Gadget",
      "description": "A very detailed description of the gadget.",
      "price": 129.99,
      "stock": 200,
      "images": ["https://example.com/gadget-1.jpg"],
      "categoryId": "uuid-of-an-existing-category"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "status": "success",
      "data": {
        "product": { /* New product object */ }
      }
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Not authenticated.
    *   `403 Forbidden`: User does not have permission (e.g., customer trying to create product).
    *   `400 Bad Request`: Invalid input or missing required fields.

### 4. Update Product

*   **URL**: `/products/:id`
*   **Method**: `PUT` or `PATCH`
*   **Access**: Private (Admin, or Seller for their own products)
*   **Description**: Updates an existing product.
*   **Request Body (application/json)**:
    ```json
    {
      "price": 119.99,
      "stock": 180
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "status": "success",
      "data": {
        "product": { /* Updated product object */ }
      }
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Not authenticated.
    *   `403 Forbidden`: User does not have permission (e.g., seller updating another seller's product).
    *   `404 Not Found`: Product with the given ID does not exist.
    *   `400 Bad Request`: Invalid input.

### 5. Delete Product

*   **URL**: `/products/:id`
*   **Method**: `DELETE`
*   **Access**: Private (Admin, or Seller for their own products)
*   **Description**: Deletes a product.
*   **Response (204 No Content)**:
    ```json
    {
      "status": "success",
      "data": null
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Not authenticated.
    *   `403 Forbidden`: User does not have permission.
    *   `404 Not Found`: Product with the given ID does not exist.

---

**Other Modules (Categories, Carts, Orders, Reviews):**
(Similar sections would follow for each module, detailing their respective CRUD operations, query parameters, request/response bodies, and access control.)

*   **Categories**: `GET /categories`, `GET /categories/:id`, `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id`
*   **Carts**: `GET /carts/me` (for authenticated user's cart), `POST /carts/add`, `PATCH /carts/update/:productId`, `DELETE /carts/remove/:productId`
*   **Orders**: `GET /orders` (admin/seller all, customer own), `GET /orders/:id`, `POST /orders`, `PATCH /orders/:id/status` (admin/seller)
*   **Reviews**: `GET /products/:productId/reviews`, `POST /products/:productId/reviews`, `PUT /reviews/:id`, `DELETE /reviews/:id`
```