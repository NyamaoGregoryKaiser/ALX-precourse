# API Documentation

This document describes the RESTful API endpoints for the Mobile Backend System.

## Base URL

`http://localhost:8080` (or your configured server host and port)

## Authentication

All protected endpoints require a JSON Web Token (JWT) provided in the `Authorization` header with the `Bearer` scheme.

`Authorization: Bearer <YOUR_JWT_TOKEN>`

## Error Responses

Errors are returned in a standardized JSON format:

```json
{
  "code": 400,          // HTTP status code
  "errorCode": "BAD_REQUEST", // Application-specific error code
  "message": "Invalid input provided." // Human-readable error message
}
```

## 1. Authentication Endpoints

### 1.1. Register User

*   **URL**: `/register`
*   **Method**: `POST`
*   **Description**: Registers a new user with a username, email, and password.
*   **Request Body**:
    ```json
    {
      "username": "newuser",
      "email": "newuser@example.com",
      "password": "strongpassword123"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "User registered successfully.",
      "token": "eyJhbGciOiJIUzI1Ni...",
      "user_id": 101,
      "role": "user"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid input (e.g., empty fields, weak password, invalid email format).
    *   `409 Conflict`: Username or email already exists.
    *   `500 Internal Server Error`: Server-side issue during registration.

### 1.2. Login User

*   **URL**: `/login`
*   **Method**: `POST`
*   **Description**: Authenticates a user and returns a JWT token.
*   **Request Body**:
    ```json
    {
      "username_or_email": "newuser@example.com",
      "password": "strongpassword123"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "Login successful.",
      "token": "eyJhbGciOiJIUzI1Ni...",
      "user_id": 101,
      "role": "user"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Missing fields.
    *   `401 Unauthorized`: Invalid credentials.
    *   `500 Internal Server Error`: Server-side issue during login.

## 2. User Endpoints

### 2.1. Get User Profile

*   **URL**: `/profile`
*   **Method**: `GET`
*   **Description**: Retrieves the profile of the authenticated user.
*   **Authentication**: Required (User or Admin)
*   **Success Response (200 OK)**:
    ```json
    {
      "id": 101,
      "username": "newuser",
      "email": "newuser@example.com",
      "role": "user",
      "created_at": "2023-10-27T10:00:00Z",
      "updated_at": "2023-10-27T10:00:00Z"
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Missing or invalid token.
    *   `404 Not Found`: User profile not found (internal error).

### 2.2. (Admin) Get All Users

*   **URL**: `/admin/users`
*   **Method**: `GET`
*   **Description**: Retrieves a list of all registered users.
*   **Authentication**: Required (Admin only)
*   **Success Response (200 OK)**:
    ```json
    [
      {
        "id": 1,
        "username": "admin_user",
        "email": "admin@example.com",
        "role": "admin",
        "created_at": "2023-10-27T10:00:00Z",
        "updated_at": "2023-10-27T10:00:00Z"
      },
      {
        "id": 101,
        "username": "newuser",
        "email": "newuser@example.com",
        "role": "user",
        "created_at": "2023-10-27T10:00:00Z",
        "updated_at": "2023-10-27T10:00:00Z"
      }
    ]
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an admin.

### 2.3. (Admin) Get User by ID

*   **URL**: `/admin/users/{id}`
*   **Method**: `GET`
*   **Description**: Retrieves a specific user's profile by ID.
*   **Authentication**: Required (Admin only)
*   **Path Parameters**:
    *   `id`: The ID of the user.
*   **Success Response (200 OK)**: (Same as `Get User Profile`)
*   **Error Responses**:
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an admin.
    *   `404 Not Found`: User with the specified ID not found.

### 2.4. (Admin) Update User by ID

*   **URL**: `/admin/users/{id}`
*   **Method**: `PUT`
*   **Description**: Updates a user's information by ID.
*   **Authentication**: Required (Admin only)
*   **Path Parameters**:
    *   `id`: The ID of the user to update.
*   **Request Body**:
    ```json
    {
      "username": "updated_username",
      "email": "updated@example.com",
      "role": "admin"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "User updated successfully."
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid input (e.g., missing fields).
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an admin.
    *   `404 Not Found`: User with the specified ID not found.
    *   `409 Conflict`: Username or email already taken by another user.

### 2.5. (Admin) Delete User by ID

*   **URL**: `/admin/users/{id}`
*   **Method**: `DELETE`
*   **Description**: Deletes a user by ID.
*   **Authentication**: Required (Admin only)
*   **Path Parameters**:
    *   `id`: The ID of the user to delete.
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "User deleted successfully."
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an admin.
    *   `404 Not Found`: User with the specified ID not found.

## 3. Product Endpoints

### 3.1. Get All Products

*   **URL**: `/products`
*   **Method**: `GET`
*   **Description**: Retrieves a list of all available products.
*   **Authentication**: None
*   **Success Response (200 OK)**:
    ```json
    [
      {
        "id": 1,
        "name": "Smartphone X",
        "description": "Latest generation smartphone...",
        "price": 999.99,
        "stock_quantity": 99,
        "created_at": "2023-10-27T10:00:00Z",
        "updated_at": "2023-10-27T10:00:00Z"
      },
      {
        "id": 2,
        "name": "Laptop Pro 15",
        "description": "High-performance laptop...",
        "price": 1499.00,
        "stock_quantity": 50,
        "created_at": "2023-10-27T10:00:00Z",
        "updated_at": "2023-10-27T10:00:00Z"
      }
    ]
    ```
*   **Error Responses**:
    *   `500 Internal Server Error`: Server-side issue.

### 3.2. Get Product by ID

*   **URL**: `/products/{id}`
*   **Method**: `GET`
*   **Description**: Retrieves details of a specific product by ID.
*   **Authentication**: None
*   **Path Parameters**:
    *   `id`: The ID of the product.
*   **Success Response (200 OK)**:
    ```json
    {
      "id": 1,
      "name": "Smartphone X",
      "description": "Latest generation smartphone...",
      "price": 999.99,
      "stock_quantity": 99,
      "created_at": "2023-10-27T10:00:00Z",
      "updated_at": "2023-10-27T10:00:00Z"
    }
    ```
*   **Error Responses**:
    *   `404 Not Found`: Product with the specified ID not found.

### 3.3. (Admin) Create Product

*   **URL**: `/admin/products`
*   **Method**: `POST`
*   **Description**: Creates a new product.
*   **Authentication**: Required (Admin only)
*   **Request Body**:
    ```json
    {
      "name": "New Awesome Gadget",
      "description": "This is a brief description of the new gadget.",
      "price": 123.45,
      "stock_quantity": 500
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "message": "Product created successfully.",
      "id": 6
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Missing or invalid product fields.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an admin.
    *   `409 Conflict`: Product with this name already exists.

### 3.4. (Admin) Update Product by ID

*   **URL**: `/admin/products/{id}`
*   **Method**: `PUT`
*   **Description**: Updates an existing product's information by ID.
*   **Authentication**: Required (Admin only)
*   **Path Parameters**:
    *   `id`: The ID of the product to update.
*   **Request Body**:
    ```json
    {
      "name": "Updated Gadget Name",
      "description": "An updated description for the gadget.",
      "price": 119.99,
      "stock_quantity": 480
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "Product updated successfully."
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Missing or invalid product fields.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an admin.
    *   `404 Not Found`: Product with the specified ID not found.
    *   `409 Conflict`: Another product with this name already exists.

### 3.5. (Admin) Delete Product by ID

*   **URL**: `/admin/products/{id}`
*   **Method**: `DELETE`
*   **Description**: Deletes a product by ID.
*   **Authentication**: Required (Admin only)
*   **Path Parameters**:
    *   `id`: The ID of the product to delete.
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "Product deleted successfully."
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an admin.
    *   `404 Not Found`: Product with the specified ID not found.

### 3.6. (Admin) Update Product Stock

*   **URL**: `/admin/products/{id}/stock`
*   **Method**: `PUT`
*   **Description**: Adjusts the stock quantity of a product.
*   **Authentication**: Required (Admin only)
*   **Path Parameters**:
    *   `id`: The ID of the product.
*   **Request Body**:
    ```json
    {
      "quantity_change": -10   // Can be positive (add) or negative (subtract)
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "Product stock updated successfully."
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid `quantity_change` or insufficient stock.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an admin.
    *   `404 Not Found`: Product with the specified ID not found.

## 4. Order Endpoints

### 4.1. Get Order by ID

*   **URL**: `/orders/{id}`
*   **Method**: `GET`
*   **Description**: Retrieves details of a specific order by ID.
*   **Authentication**: Required (User or Admin)
*   **Authorization**: Users can only view their own orders. Admins can view any order.
*   **Path Parameters**:
    *   `id`: The ID of the order.
*   **Success Response (200 OK)**:
    ```json
    {
      "id": 1,
      "user_id": 101,
      "order_date": "2023-10-27T10:00:00Z",
      "total_amount": 1259.49,
      "status": "processed",
      "created_at": "2023-10-27T10:00:00Z",
      "updated_at": "2023-10-27T10:00:00Z",
      "items": [
        {
          "id": 1,
          "order_id": 1,
          "product_id": 1,
          "product_name": "Smartphone X",
          "price_at_purchase": 999.99,
          "quantity": 1
        },
        {
          "id": 2,
          "order_id": 1,
          "product_id": 3,
          "product_name": "Wireless Earbuds Z",
          "price_at_purchase": 129.50,
          "quantity": 2
        }
      ]
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User tries to access another user's order without admin rights.
    *   `404 Not Found`: Order with the specified ID not found.

### 4.2. Get Orders for Authenticated User

*   **URL**: `/orders`
*   **Method**: `GET`
*   **Description**: Retrieves a list of all orders for the authenticated user.
*   **Authentication**: Required (User or Admin)
*   **Success Response (200 OK)**: (Array of Order objects, similar to 4.1. response)
*   **Error Responses**:
    *   `401 Unauthorized`: Missing or invalid token.

### 4.3. Create New Order

*   **URL**: `/orders`
*   **Method**: `POST`
*   **Description**: Creates a new order for the authenticated user. Deducts product stock.
*   **Authentication**: Required (User or Admin)
*   **Request Body**:
    ```json
    {
      "items": [
        {
          "product_id": 1,
          "quantity": 1
        },
        {
          "product_id": 4,
          "quantity": 2
        }
      ]
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "message": "Order created successfully.",
      "id": 10
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Empty items list, invalid product ID or quantity, insufficient stock.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `404 Not Found`: Product not found.
    *   `500 Internal Server Error`: Server-side issue during order creation or stock update (potential rollback).

### 4.4. Cancel Order

*   **URL**: `/orders/{id}/cancel`
*   **Method**: `POST`
*   **Description**: Cancels an existing order. Reverts product stock if order is cancellable.
*   **Authentication**: Required (User or Admin)
*   **Authorization**: Users can only cancel their own orders. Admins can cancel any order.
*   **Path Parameters**:
    *   `id`: The ID of the order to cancel.
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "Order cancelled successfully."
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Order status does not allow cancellation (e.g., already shipped/delivered).
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User tries to cancel another user's order without admin rights.
    *   `404 Not Found`: Order with the specified ID not found.
    *   `500 Internal Server Error`: Server-side issue during cancellation or stock reversion.

### 4.5. (Admin) Update Order Status

*   **URL**: `/admin/orders/{id}/status`
*   **Method**: `PUT`
*   **Description**: Updates the status of an order.
*   **Authentication**: Required (Admin only)
*   **Path Parameters**:
    *   `id`: The ID of the order to update.
*   **Request Body**:
    ```json
    {
      "status": "shipped" // Allowed values: "pending", "processed", "shipped", "delivered", "cancelled"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "Order status updated successfully."
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid status value or invalid status transition.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an admin.
    *   `404 Not Found`: Order with the specified ID not found.

### 4.6. (Admin) Delete Order

*   **URL**: `/admin/orders/{id}`
*   **Method**: `DELETE`
*   **Description**: Permanently deletes an order from the system.
*   **Authentication**: Required (Admin only)
*   **Path Parameters**:
    *   `id`: The ID of the order to delete.
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "Order deleted successfully."
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Order cannot be deleted due to its status (e.g., delivered).
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an admin.
    *   `404 Not Found`: Order with the specified ID not found.
```

**`docs/architecture.md`**
```markdown