```markdown
# ShopSwift API Documentation

This document provides a detailed overview of the ShopSwift RESTful API endpoints.
The API is designed to be consumed by web, mobile, and other client applications.

**Base URL**: `http://localhost:5000/api` (for local development)

## Authentication

All protected endpoints require a JSON Web Token (JWT) in the `Authorization` header: `Bearer <access_token>`.

### Common Security Schemes:

*   **BearerAuth**: JWT Access Token (in header)

### Common Response Status Codes:

*   `200 OK`: Request successful.
*   `201 Created`: Resource created successfully.
*   `204 No Content`: Resource deleted or action performed successfully with no content to return.
*   `400 Bad Request`: Invalid request data (e.g., validation error).
*   `401 Unauthorized`: Authentication failed or missing token.
*   `403 Forbidden`: Authenticated user does not have necessary permissions.
*   `404 Not Found`: Resource not found.
*   `409 Conflict`: Request conflicts with current state of the server.
*   `500 Internal Server Error`: An unexpected error occurred on the server.

---

## 1. Authentication & User Management (`/api/auth`)

### `POST /api/auth/register`

Registers a new user.

*   **Summary**: Register a new user
*   **Request Body**:
    *   `username` (string, required): User's chosen username. (Min 3, Max 80 chars)
    *   `email` (string, required, format: email): User's email address.
    *   `password` (string, required, format: password): User's password. (Min 6 chars)
*   **Responses**:
    *   `201 Created`:
        ```json
        {
          "message": "User registered successfully",
          "user": {
            "id": "uuid",
            "username": "string",
            "email": "string",
            "role": "customer",
            "created_at": "datetime",
            "updated_at": "datetime"
          }
        }
        ```
    *   `400 Bad Request`: Invalid input or user already exists.

### `POST /api/auth/login`

Logs in a user and returns JWT access and refresh tokens.

*   **Summary**: Login a user
*   **Request Body**:
    *   `email` (string, required, format: email): User's email address.
    *   `password` (string, required, format: password): User's password.
*   **Responses**:
    *   `200 OK`:
        ```json
        {
          "message": "Logged in successfully",
          "access_token": "string (JWT)",
          "refresh_token": "string (JWT)",
          "user": {
            "id": "uuid",
            "username": "string",
            "email": "string",
            "role": "customer",
            "created_at": "datetime",
            "updated_at": "datetime"
          }
        }
        ```
    *   `401 Unauthorized`: Invalid credentials.

### `POST /api/auth/refresh`

Refreshes an expired access token using a refresh token.

*   **Summary**: Refresh access token
*   **Security**: BearerAuth (Refresh Token)
*   **Responses**:
    *   `200 OK`:
        ```json
        {
          "access_token": "string (new JWT)"
        }
        ```
    *   `401 Unauthorized`: Invalid or expired refresh token.

### `GET /api/auth/protected` (Example)

Access protected resource (requires any valid access token).

*   **Summary**: Access protected resource
*   **Security**: BearerAuth (Access Token)
*   **Responses**:
    *   `200 OK`: `{"message": "Hello <username>, you are authorized!", "logged_in_as": "uuid", "user_role": "string"}`
    *   `401 Unauthorized`

### `GET /api/auth/admin-only` (Example)

Access admin-only resource (requires admin role access token).

*   **Summary**: Access admin-only resource
*   **Security**: BearerAuth (Access Token)
*   **Responses**:
    *   `200 OK`: `{"message": "Hello Admin <username>, you have admin access!", "logged_in_as": "uuid", "user_role": "admin"}`
    *   `401 Unauthorized`
    *   `403 Forbidden`: Not an admin.

---

## 2. User Profile Management (`/api/users`)

### `GET /api/users/<uuid:user_id>`

Get user profile by ID. Accessible by the user themselves or an admin.

*   **Summary**: Get user profile
*   **Parameters**:
    *   `user_id` (path, uuid, required): ID of the user to retrieve.
*   **Security**: BearerAuth
*   **Responses**:
    *   `200 OK`: User object (`UserSchema`)
    *   `401 Unauthorized`
    *   `403 Forbidden`
    *   `404 Not Found`

### `PUT /api/users/<uuid:user_id>`

Update user profile by ID. Accessible by the user themselves or an admin.

*   **Summary**: Update user profile
*   **Parameters**:
    *   `user_id` (path, uuid, required): ID of the user to update.
*   **Request Body**: (Partial update allowed)
    *   `username` (string, optional): New username.
    *   `email` (string, optional, format: email): New email.
    *   `password` (string, optional, format: password): New password.
*   **Security**: BearerAuth
*   **Responses**:
    *   `200 OK`: Updated User object (`UserSchema`)
    *   `400 Bad Request`
    *   `401 Unauthorized`
    *   `403 Forbidden`
    *   `404 Not Found`

### `DELETE /api/users/<uuid:user_id>`

Delete a user by ID. Accessible by the user themselves or an admin.

*   **Summary**: Delete user
*   **Parameters**:
    *   `user_id` (path, uuid, required): ID of the user to delete.
*   **Security**: BearerAuth
*   **Responses**:
    *   `204 No Content`
    *   `401 Unauthorized`
    *   `403 Forbidden`
    *   `404 Not Found`

### `GET /api/users/`

Get all users. (Admin only).

*   **Summary**: Get all users
*   **Security**: BearerAuth (Admin Role)
*   **Responses**:
    *   `200 OK`: Array of User objects (`[UserSchema, ...]`)
    *   `401 Unauthorized`
    *   `403 Forbidden`

---

## 3. Category Management (`/api/categories`)

### `POST /api/categories/`

Create a new category. (Admin only).

*   **Summary**: Create category
*   **Request Body**:
    *   `name` (string, required): Category name. (Min 3, Max 100 chars)
    *   `description` (string, optional): Category description.
*   **Security**: BearerAuth (Admin Role)
*   **Responses**:
    *   `201 Created`: Category object (`CategorySchema`)
    *   `400 Bad Request`
    *   `401 Unauthorized`
    *   `403 Forbidden`

### `GET /api/categories/`

Get all categories.

*   **Summary**: Get all categories
*   **Responses**:
    *   `200 OK`: Array of Category objects (`[CategorySchema, ...]`)

### `GET /api/categories/<uuid:category_id>`

Get category by ID.

*   **Summary**: Get category by ID
*   **Parameters**:
    *   `category_id` (path, uuid, required): ID of the category to retrieve.
*   **Responses**:
    *   `200 OK`: Category object (`CategorySchema`)
    *   `404 Not Found`

### `PUT /api/categories/<uuid:category_id>`

Update category by ID. (Admin only).

*   **Summary**: Update category
*   **Parameters**:
    *   `category_id` (path, uuid, required): ID of the category to update.
*   **Request Body**: (Partial update allowed)
    *   `name` (string, optional): New category name.
    *   `description` (string, optional): New category description.
*   **Security**: BearerAuth (Admin Role)
*   **Responses**:
    *   `200 OK`: Updated Category object (`CategorySchema`)
    *   `400 Bad Request`
    *   `401 Unauthorized`
    *   `403 Forbidden`
    *   `404 Not Found`

### `DELETE /api/categories/<uuid:category_id>`

Delete category by ID. (Admin only).

*   **Summary**: Delete category
*   **Parameters**:
    *   `category_id` (path, uuid, required): ID of the category to delete.
*   **Security**: BearerAuth (Admin Role)
*   **Responses**:
    *   `204 No Content`
    *   `400 Bad Request`: Cannot delete category with associated products.
    *   `401 Unauthorized`
    *   `403 Forbidden`
    *   `404 Not Found`

---

## 4. Product Management (`/api/products`)

### `POST /api/products/`

Create a new product. (Admin only).

*   **Summary**: Create product
*   **Request Body**:
    *   `name` (string, required): Product name. (Min 3, Max 255 chars)
    *   `description` (string, optional): Product description.
    *   `price` (number, required, format: float): Product price. (Min 0.01)
    *   `stock` (integer, required): Product stock quantity. (Min 0)
    *   `image_url` (string, optional, format: url): URL of product image.
    *   `category_id` (string, required, format: uuid): ID of the product's category.
*   **Security**: BearerAuth (Admin Role)
*   **Responses**:
    *   `201 Created`: Product object (`ProductSchema`)
    *   `400 Bad Request`
    *   `401 Unauthorized`
    *   `403 Forbidden`

### `GET /api/products/`

Get all products with optional filtering and pagination.

*   **Summary**: Get all products
*   **Parameters**:
    *   `page` (query, integer, optional, default: 1): Page number for pagination.
    *   `per_page` (query, integer, optional, default: 10): Number of items per page.
    *   `category_id` (query, string, optional, format: uuid): Filter by category ID.
    *   `search` (query, string, optional): Search by product name or description.
    *   `min_price` (query, number, optional, format: float): Filter by minimum price.
    *   `max_price` (query, number, optional, format: float): Filter by maximum price.
*   **Responses**:
    *   `200 OK`:
        ```json
        {
          "products": [ProductSchema, ...],
          "total_items": 100,
          "total_pages": 10,
          "current_page": 1,
          "per_page": 10
        }
        ```

### `GET /api/products/<uuid:product_id>`

Get product by ID.

*   **Summary**: Get product by ID
*   **Parameters**:
    *   `product_id` (path, uuid, required): ID of the product to retrieve.
*   **Responses**:
    *   `200 OK`: Product object (`ProductSchema`)
    *   `404 Not Found`

### `GET /api/products/slug/<string:product_slug>`

Get product by slug.

*   **Summary**: Get product by slug
*   **Parameters**:
    *   `product_slug` (path, string, required): Slug of the product to retrieve.
*   **Responses**:
    *   `200 OK`: Product object (`ProductSchema`)
    *   `404 Not Found`

### `PUT /api/products/<uuid:product_id>`

Update product by ID. (Admin only).

*   **Summary**: Update product
*   **Parameters**:
    *   `product_id` (path, uuid, required): ID of the product to update.
*   **Request Body**: (Partial update allowed)
    *   `name` (string, optional): New product name.
    *   `description` (string, optional): New product description.
    *   `price` (number, optional, format: float): New product price.
    *   `stock` (integer, optional): New product stock quantity.
    *   `image_url` (string, optional, format: url): New URL of product image.
    *   `category_id` (string, optional, format: uuid): New ID of the product's category.
*   **Security**: BearerAuth (Admin Role)
*   **Responses**:
    *   `200 OK`: Updated Product object (`ProductSchema`)
    *   `400 Bad Request`
    *   `401 Unauthorized`
    *   `403 Forbidden`
    *   `404 Not Found`

### `DELETE /api/products/<uuid:product_id>`

Delete product by ID. (Admin only).

*   **Summary**: Delete product
*   **Parameters**:
    *   `product_id` (path, uuid, required): ID of the product to delete.
*   **Security**: BearerAuth (Admin Role)
*   **Responses**:
    *   `204 No Content`
    *   `401 Unauthorized`
    *   `403 Forbidden`
    *   `404 Not Found`

---

## 5. Shopping Cart Management (`/api/cart`)

### `GET /api/cart/`

Get the authenticated user's shopping cart.

*   **Summary**: Get user's cart
*   **Security**: BearerAuth (Customer Role)
*   **Responses**:
    *   `200 OK`: Cart object (`CartSchema`)
    *   `401 Unauthorized`
    *   `403 Forbidden`
    *   `404 Not Found` (if cart not found for user, though it should exist)

### `POST /api/cart/items`

Add an item to the authenticated user's cart. If the item exists, its quantity is updated.

*   **Summary**: Add item to cart
*   **Request Body**:
    *   `product_id` (string, required, format: uuid): ID of the product to add.
    *   `quantity` (integer, required, min: 1): Quantity of the product.
*   **Security**: BearerAuth (Customer Role)
*   **Responses**:
    *   `200 OK`: Updated Cart object (`CartSchema`)
    *   `400 Bad Request`: Invalid input, product not found, or insufficient stock.
    *   `401 Unauthorized`
    *   `403 Forbidden`

### `PUT /api/cart/items/<uuid:product_id>`

Update the quantity of a specific item in the authenticated user's cart.

*   **Summary**: Update cart item quantity
*   **Parameters**:
    *   `product_id` (path, uuid, required): ID of the product in the cart.
*   **Request Body**:
    *   `quantity` (integer, required, min: 1): New quantity for the product.
*   **Security**: BearerAuth (Customer Role)
*   **Responses**:
    *   `200 OK`: Updated Cart object (`CartSchema`)
    *   `400 Bad Request`
    *   `401 Unauthorized`
    *   `403 Forbidden`
    *   `404 Not Found`: Cart item or product not found.

### `DELETE /api/cart/items/<uuid:product_id>`

Remove a specific item from the authenticated user's cart.

*   **Summary**: Remove item from cart
*   **Parameters**:
    *   `product_id` (path, uuid, required): ID of the product to remove from cart.
*   **Security**: BearerAuth (Customer Role)
*   **Responses**:
    *   `204 No Content`
    *   `401 Unauthorized`
    *   `403 Forbidden`
    *   `404 Not Found`: Cart item not found.

### `DELETE /api/cart/clear`

Clear all items from the authenticated user's cart.

*   **Summary**: Clear user's cart
*   **Security**: BearerAuth (Customer Role)
*   **Responses**:
    *   `204 No Content`
    *   `401 Unauthorized`
    *   `403 Forbidden`
    *   `404 Not Found`: Cart not found.

---

## 6. Order Management (`/api/orders`)

### `POST /api/orders/`

Create a new order from the authenticated user's cart.

*   **Summary**: Create order from cart
*   **Request Body**:
    *   `shipping_address` (string, required): Address for shipping.
*   **Security**: BearerAuth (Customer Role)
*   **Responses**:
    *   `201 Created`: Order object (`OrderSchema`)
    *   `400 Bad Request`: Invalid input, empty cart, or insufficient product stock.
    *   `401 Unauthorized`
    *   `403 Forbidden`

### `GET /api/orders/my-orders`

Get all orders for the authenticated user.

*   **Summary**: Get authenticated user's orders
*   **Security**: BearerAuth (Customer Role)
*   **Responses**:
    *   `200 OK`: Array of Order objects (`[OrderSchema, ...]`)
    *   `401 Unauthorized`
    *   `403 Forbidden`

### `GET /api/orders/<uuid:order_id>`

Get details of a specific order. Accessible by the order owner or an admin.

*   **Summary**: Get order details by ID
*   **Parameters**:
    *   `order_id` (path, uuid, required): ID of the order to retrieve.
*   **Security**: BearerAuth
*   **Responses**:
    *   `200 OK`: Order object (`OrderSchema`)
    *   `401 Unauthorized`
    *   `403 Forbidden`
    *   `404 Not Found`

### `POST /api/orders/<uuid:order_id>/cancel`

Cancel a specific order. Accessible by the order owner or an admin.

*   **Summary**: Cancel an order
*   **Parameters**:
    *   `order_id` (path, uuid, required): ID of the order to cancel.
*   **Security**: BearerAuth
*   **Responses**:
    *   `200 OK`: `{"message": "Order <id> cancelled successfully."}`
    *   `400 Bad Request`: Order cannot be cancelled (e.g., already shipped).
    *   `401 Unauthorized`
    *   `403 Forbidden`
    *   `404 Not Found`

### `GET /api/orders/`

Get all orders. (Admin only).

*   **Summary**: Get all orders (Admin)
*   **Parameters**:
    *   `page` (query, integer, optional, default: 1): Page number for pagination.
    *   `per_page` (query, integer, optional, default: 10): Number of items per page.
*   **Security**: BearerAuth (Admin Role)
*   **Responses**:
    *   `200 OK`:
        ```json
        {
          "orders": [OrderSchema, ...],
          "total_items": 100,
          "total_pages": 10,
          "current_page": 1,
          "per_page": 10
        }
        ```
    *   `401 Unauthorized`
    *   `403 Forbidden`

### `PUT /api/orders/<uuid:order_id>/status`

Update the status of an order. (Admin only).

*   **Summary**: Update order status (Admin)
*   **Parameters**:
    *   `order_id` (path, uuid, required): ID of the order to update.
*   **Request Body**:
    *   `status` (string, required, enum: `pending`, `processing`, `shipped`, `delivered`, `cancelled`): New status for the order.
*   **Security**: BearerAuth (Admin Role)
*   **Responses**:
    *   `200 OK`: Updated Order object (`OrderSchema`)
    *   `400 Bad Request`: Invalid status or order not found.
    *   `401 Unauthorized`
    *   `403 Forbidden`
    *   `404 Not Found`

---

## 7. Schemas Reference (Marshmallow)

### `UserSchema`
*   `id`: UUID (read-only)
*   `username`: String
*   `email`: String (email format)
*   `role`: Enum (`admin`, `customer`) (read-only)
*   `created_at`: Datetime (read-only)
*   `updated_at`: Datetime (read-only)

### `UserRegisterSchema` (inherits `UserSchema`)
*   `password`: String (write-only, min 6 chars)
*   `role`: Enum (`admin`, `customer`) (write-only, default `customer`)

### `CategorySchema`
*   `id`: UUID (read-only)
*   `name`: String (min 3, max 100 chars)
*   `slug`: String (read-only)
*   `description`: String
*   `created_at`: Datetime (read-only)
*   `updated_at`: Datetime (read-only)

### `ProductSchema`
*   `id`: UUID (read-only)
*   `name`: String (min 3, max 255 chars)
*   `slug`: String (read-only)
*   `description`: String
*   `price`: Decimal (as string, 2 decimal places, min 0.01)
*   `stock`: Integer (min 0)
*   `image_url`: String (URL format)
*   `category_id`: UUID
*   `category`: Nested `CategorySchema` (read-only, partial fields)
*   `created_at`: Datetime (read-only)
*   `updated_at`: Datetime (read-only)

### `CartItemSchema`
*   `id`: UUID (read-only)
*   `product_id`: UUID
*   `quantity`: Integer (min 1)
*   `product`: Nested `ProductSchema` (read-only, partial fields)
*   `created_at`: Datetime (read-only)
*   `updated_at`: Datetime (read-only)

### `CartSchema`
*   `id`: UUID (read-only)
*   `user_id`: UUID (read-only)
*   `items`: Array of `CartItemSchema` (read-only)
*   `created_at`: Datetime (read-only)
*   `updated_at`: Datetime (read-only)

### `OrderItemSchema`
*   `id`: UUID (read-only)
*   `order_id`: UUID (read-only)
*   `product_id`: UUID
*   `quantity`: Integer (min 1)
*   `price`: Decimal (as string, 2 decimal places, min 0.01) (price at time of order)
*   `product`: Nested `ProductSchema` (read-only, partial fields)
*   `created_at`: Datetime (read-only)
*   `updated_at`: Datetime (read-only)

### `OrderSchema`
*   `id`: UUID (read-only)
*   `user_id`: UUID (read-only)
*   `total_amount`: Decimal (as string, 2 decimal places) (read-only)
*   `status`: Enum (`pending`, `processing`, `shipped`, `delivered`, `cancelled`) (read-only)
*   `shipping_address`: String
*   `items`: Array of `OrderItemSchema` (read-only)
*   `created_at`: Datetime (read-only)
*   `updated_at`: Datetime (read-only)

### `OrderUpdateSchema`
*   `status`: Enum (`pending`, `processing`, `shipped`, `delivered`, `cancelled`)
```