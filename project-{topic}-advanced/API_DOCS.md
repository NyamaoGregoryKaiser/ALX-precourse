```markdown
# ALX E-commerce System - API Documentation

This document provides a comprehensive overview of the RESTful API endpoints for the ALX E-commerce System. For interactive exploration and testing, please refer to the Swagger UI available at `http://localhost:8080/api/v1/swagger-ui.html` when the application is running.

All endpoints are prefixed with `/api/v1`.

---

## Authentication

Authentication is performed using JWT (JSON Web Tokens). After successful login, a token is returned, which must be included in the `Authorization` header of subsequent requests as `Bearer <token>`.

### 1. Register User

`POST /api/v1/auth/register`

Registers a new user account with the `CUSTOMER` role.

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "securepassword123",
  "firstName": "New",
  "lastName": "User"
}
```

**Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1Ni...",
  "username": "newuser",
  "role": "CUSTOMER"
}
```

**Error Responses:**
*   `400 Bad Request`: Invalid input (e.g., weak password, invalid email format).
*   `409 Conflict`: Username or email already exists.

### 2. Authenticate User

`POST /api/v1/auth/authenticate`

Authenticates an existing user and returns a JWT token. Login can be done using either `username` or `email` as the `identifier`.

**Request Body:**
```json
{
  "identifier": "newuser@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1Ni...",
  "username": "newuser",
  "role": "CUSTOMER"
}
```

**Error Responses:**
*   `400 Bad Request`: Invalid request payload.
*   `401 Unauthorized`: Invalid username/email or password.

---

## Users

These endpoints manage user profiles. Some endpoints require `ADMIN` role.

### 1. Get Authenticated User Profile

`GET /api/v1/users/me`

Retrieves the profile information of the currently authenticated user.

**Authentication:** Required (Bearer Token)

**Response (200 OK):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "username": "newuser",
  "email": "newuser@example.com",
  "firstName": "New",
  "lastName": "User",
  "role": "CUSTOMER",
  "createdAt": "2023-01-01T10:00:00",
  "updatedAt": "2023-01-01T10:00:00"
}
```

### 2. Get User by ID (Admin Only)

`GET /api/v1/users/{id}`

Retrieves details of a specific user by their UUID.

**Authentication:** Required (`ADMIN` role)

**Path Parameters:**
*   `id` (UUID): The UUID of the user.

**Response (200 OK):** (Same as above)

**Error Responses:**
*   `401 Unauthorized`: No token or invalid token.
*   `403 Forbidden`: User does not have `ADMIN` role.
*   `404 Not Found`: User not found.

### 3. Get All Users (Admin Only)

`GET /api/v1/users`

Retrieves a list of all users in the system.

**Authentication:** Required (`ADMIN` role)

**Response (200 OK):**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "username": "newuser",
    "email": "newuser@example.com",
    "firstName": "New",
    "lastName": "User",
    "role": "CUSTOMER",
    "createdAt": "2023-01-01T10:00:00",
    "updatedAt": "2023-01-01T10:00:00"
  },
  {
    "id": "b1c2d3e4-f5a6-7890-1234-567890abcdef",
    "username": "adminuser",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ADMIN",
    "createdAt": "2023-01-01T09:00:00",
    "updatedAt": "2023-01-01T11:00:00"
  }
]
```

### 4. Update Authenticated User Profile

`PUT /api/v1/users/me`

Updates the profile information of the currently authenticated user.

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "firstName": "UpdatedFirstName",
  "lastName": "UpdatedLastName",
  "email": "updated@example.com"
  // username and role can also be updated (admin only for role)
}
```

**Response (200 OK):** (Updated User Profile)

**Error Responses:**
*   `400 Bad Request`: Invalid input or duplicate username/email.
*   `401 Unauthorized`: No token or invalid token.

### 5. Update User by ID (Admin Only)

`PUT /api/v1/users/{id}`

Updates details of a specific user by their UUID.

**Authentication:** Required (`ADMIN` role)

**Path Parameters:**
*   `id` (UUID): The UUID of the user.

**Request Body:** (Same as Update Authenticated User Profile, but `role` can also be updated)
```json
{
  "username": "updated_username",
  "email": "updated_admin@example.com",
  "role": "ADMIN" // Can change user role
}
```

**Response (200 OK):** (Updated User Profile)

**Error Responses:**
*   `401 Unauthorized`: No token or invalid token.
*   `403 Forbidden`: User does not have `ADMIN` role.
*   `404 Not Found`: User not found.
*   `400 Bad Request`: Invalid input or duplicate username/email.

### 6. Delete User by ID (Admin Only)

`DELETE /api/v1/users/{id}`

Deletes a user by their UUID.

**Authentication:** Required (`ADMIN` role)

**Path Parameters:**
*   `id` (UUID): The UUID of the user.

**Response (204 No Content):**

---

## Products

These endpoints manage the product catalog. Product creation and updates require `ADMIN` role. Public users can view products.

### 1. Create Product (Admin Only)

`POST /api/v1/products`

Adds a new product to the catalog.

**Authentication:** Required (`ADMIN` role)

**Request Body:**
```json
{
  "name": "New Gaming Headset",
  "description": "High-quality gaming headset with surround sound.",
  "price": 79.99,
  "stockQuantity": 150,
  "categoryId": 101,
  "imageUrl": "https://example.com/headset.jpg"
}
```

**Response (201 Created):**
```json
{
  "id": "e1f2g3h4-i5j6-7890-1234-567890abcdef",
  "name": "New Gaming Headset",
  "description": "High-quality gaming headset with surround sound.",
  "price": 79.99,
  "stockQuantity": 150,
  "category": {
    "id": 101,
    "name": "Electronics"
  },
  "imageUrl": "https://example.com/headset.jpg",
  "createdAt": "2023-01-01T12:00:00",
  "updatedAt": "2023-01-01T12:00:00"
}
```

**Error Responses:**
*   `400 Bad Request`: Invalid input (e.g., negative price, missing category ID).
*   `404 Not Found`: Category with `categoryId` not found.

### 2. Get Product by ID

`GET /api/v1/products/{id}`

Retrieves details of a single product by its UUID.

**Authentication:** Optional (Public access)

**Path Parameters:**
*   `id` (UUID): The UUID of the product.

**Response (200 OK):** (Example product from creation)

**Error Responses:**
*   `404 Not Found`: Product not found.

### 3. Get All Products

`GET /api/v1/products`

Retrieves a paginated and sortable list of all products.

**Authentication:** Optional (Public access)

**Query Parameters:**
*   `page` (int, default: 0): Page number (0-indexed).
*   `size` (int, default: 10): Number of items per page.
*   `sort` (string, default: "name,asc"): Sorting criteria (e.g., `name,asc`, `price,desc`).

**Response (200 OK):**
```json
{
  "content": [
    {
      "id": "e1f2g3h4-i5j6-7890-1234-567890abcdef",
      "name": "New Gaming Headset",
      "description": "High-quality gaming headset with surround sound.",
      "price": 79.99,
      "stockQuantity": 150,
      "category": { "id": 101, "name": "Electronics" },
      "imageUrl": "https://example.com/headset.jpg",
      "createdAt": "2023-01-01T12:00:00",
      "updatedAt": "2023-01-01T12:00:00"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10,
    "sort": { "empty": false, "sorted": true, "unsorted": false },
    "offset": 0,
    "paged": true,
    "unpaged": false
  },
  "last": true,
  "totalPages": 1,
  "totalElements": 1,
  "size": 10,
  "number": 0,
  "first": true,
  "numberOfElements": 1,
  "empty": false
}
```

### 4. Get Products by Category ID

`GET /api/v1/products/category/{categoryId}`

Retrieves a list of products belonging to a specific category.

**Authentication:** Optional (Public access)

**Path Parameters:**
*   `categoryId` (Long): The ID of the category.

**Response (200 OK):**
```json
[
  {
    "id": "e1f2g3h4-i5j6-7890-1234-567890abcdef",
    "name": "New Gaming Headset",
    "description": "High-quality gaming headset with surround sound.",
    "price": 79.99,
    "stockQuantity": 150,
    "category": { "id": 101, "name": "Electronics" },
    "imageUrl": "https://example.com/headset.jpg",
    "createdAt": "2023-01-01T12:00:00",
    "updatedAt": "2023-01-01T12:00:00"
  }
]
```

**Error Responses:**
*   `404 Not Found`: No products found for the given category ID.

### 5. Update Product (Admin Only)

`PUT /api/v1/products/{id}`

Updates details of an existing product. Partial updates are supported (only provide fields to change).

**Authentication:** Required (`ADMIN` role)

**Path Parameters:**
*   `id` (UUID): The UUID of the product to update.

**Request Body:**
```json
{
  "price": 89.99,
  "stockQuantity": 120
}
```

**Response (200 OK):** (Updated Product Details)

### 6. Delete Product (Admin Only)

`DELETE /api/v1/products/{id}`

Deletes a product from the catalog.

**Authentication:** Required (`ADMIN` role)

**Path Parameters:**
*   `id` (UUID): The UUID of the product to delete.

**Response (204 No Content):**

---

## Categories

These endpoints manage product categories. Category creation and updates require `ADMIN` role. Public users can view categories.

### 1. Create Category (Admin Only)

`POST /api/v1/categories`

Adds a new product category.

**Authentication:** Required (`ADMIN` role)

**Request Body:**
```json
{
  "name": "Electronics",
  "description": "Gadgets and electronic devices."
}
```

**Response (201 Created):**
```json
{
  "id": 101,
  "name": "Electronics",
  "description": "Gadgets and electronic devices.",
  "createdAt": "2023-01-01T10:00:00",
  "updatedAt": "2023-01-01T10:00:00"
}
```

**Error Responses:**
*   `400 Bad Request`: Invalid input (e.g., missing name).
*   `409 Conflict`: Category with the same name already exists.

### 2. Get Category by ID

`GET /api/v1/categories/{id}`

Retrieves details of a single category by its ID.

**Authentication:** Optional (Public access)

**Path Parameters:**
*   `id` (Long): The ID of the category.

**Response (200 OK):** (Example category from creation)

**Error Responses:**
*   `404 Not Found`: Category not found.

### 3. Get All Categories

`GET /api/v1/categories`

Retrieves a list of all product categories.

**Authentication:** Optional (Public access)

**Response (200 OK):**
```json
[
  {
    "id": 101,
    "name": "Electronics",
    "description": "Gadgets and electronic devices.",
    "createdAt": "2023-01-01T10:00:00",
    "updatedAt": "2023-01-01T10:00:00"
  },
  {
    "id": 102,
    "name": "Books",
    "description": "Fiction, non-fiction, and educational books.",
    "createdAt": "2023-01-01T10:01:00",
    "updatedAt": "2023-01-01T10:01:00"
  }
]
```

### 4. Update Category (Admin Only)

`PUT /api/v1/categories/{id}`

Updates details of an existing category. Partial updates are supported.

**Authentication:** Required (`ADMIN` role)

**Path Parameters:**
*   `id` (Long): The ID of the category to update.

**Request Body:**
```json
{
  "name": "Updated Electronics",
  "description": "All kinds of updated electronic gadgets."
}
```

**Response (200 OK):** (Updated Category Details)

### 5. Delete Category (Admin Only)

`DELETE /api/v1/categories/{id}`

Deletes a category. Note: Products associated with this category might have their `category_id` set to `NULL` (depending on DB foreign key constraint setup).

**Authentication:** Required (`ADMIN` role)

**Path Parameters:**
*   `id` (Long): The ID of the category to delete.

**Response (204 No Content):**

---

## Orders

These endpoints manage customer orders.

### 1. Create Order

`POST /api/v1/orders`

Creates a new order for the authenticated user with specified products.

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "items": [
    {
      "productId": "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      "quantity": 1
    },
    {
      "productId": "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66",
      "quantity": 2
    }
  ],
  "shippingAddress": "123 Main St, Anytown, USA"
}
```

**Response (201 Created):**
```json
{
  "id": "1a2b3c4d-5e6f-7890-1234-567890abcdef",
  "userId": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  "orderDate": "2023-01-01T15:30:00",
  "totalAmount": 1799.00, // (1200 * 1) + (299 * 2)
  "status": "PENDING",
  "shippingAddress": "123 Main St, Anytown, USA",
  "orderItems": [
    {
      "id": "item1-uuid",
      "productId": "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      "productName": "Laptop Pro X",
      "quantity": 1,
      "priceAtPurchase": 1200.00
    },
    {
      "id": "item2-uuid",
      "productId": "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66",
      "productName": "Smartwatch Series 5",
      "quantity": 2,
      "priceAtPurchase": 299.00
    }
  ],
  "createdAt": "2023-01-01T15:30:00",
  "updatedAt": "2023-01-01T15:30:00"
}
```

**Error Responses:**
*   `400 Bad Request`: Invalid input (e.g., insufficient stock, missing product ID).
*   `404 Not Found`: Product not found.

### 2. Get Order by ID

`GET /api/v1/orders/{orderId}`

Retrieves details of a specific order by its UUID. Accessible by the order owner or an `ADMIN` user.

**Authentication:** Required (Bearer Token)

**Path Parameters:**
*   `orderId` (UUID): The UUID of the order.

**Response (200 OK):** (Example order from creation)

**Error Responses:**
*   `403 Forbidden`: User is not the owner and not an `ADMIN`.
*   `404 Not Found`: Order not found.

### 3. Get My Orders

`GET /api/v1/orders/my-orders`

Retrieves a list of all orders placed by the currently authenticated user.

**Authentication:** Required (Bearer Token)

**Response (200 OK):**
```json
[
  {
    "id": "1a2b3c4d-5e6f-7890-1234-567890abcdef",
    "userId": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    "orderDate": "2023-01-01T15:30:00",
    "totalAmount": 1799.00,
    "status": "PENDING",
    "shippingAddress": "123 Main St, Anytown, USA",
    "orderItems": [...],
    "createdAt": "2023-01-01T15:30:00",
    "updatedAt": "2023-01-01T15:30:00"
  }
]
```

### 4. Get All Orders (Admin Only)

`GET /api/v1/orders`

Retrieves a list of all orders in the system.

**Authentication:** Required (`ADMIN` role)

**Response (200 OK):** (List of all orders)

### 5. Update Order Status (Admin Only)

`PATCH /api/v1/orders/{orderId}/status`

Updates the status of a specific order.

**Authentication:** Required (`ADMIN` role)

**Path Parameters:**
*   `orderId` (UUID): The UUID of the order.

**Request Body:**
```json
{
  "status": "SHIPPED"
}
```
**Allowed Statuses:** `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`

**Response (200 OK):** (Updated Order Details)

**Error Responses:**
*   `400 Bad Request`: Invalid status transition or invalid input.
*   `404 Not Found`: Order not found.

### 6. Delete Order

`DELETE /api/v1/orders/{orderId}`

Deletes an order. Only `PENDING` or `CANCELLED` orders can be deleted. Accessible by the order owner or an `ADMIN` user.

**Authentication:** Required (Bearer Token)

**Path Parameters:**
*   `orderId` (UUID): The UUID of the order.

**Response (204 No Content):**

**Error Responses:**
*   `400 Bad Request`: Cannot delete orders that are not `PENDING` or `CANCELLED`.
*   `403 Forbidden`: User is not the owner and not an `ADMIN`.
*   `404 Not Found`: Order not found.

---
```