# ALX E-commerce System - API Documentation

This document provides an overview of the RESTful API endpoints for the ALX E-commerce System. For interactive exploration and testing of the API, please refer to the **Swagger UI**.

## 1. Accessing Swagger UI

Once the backend application is running, you can access the interactive API documentation at:

**Local Development:** `http://localhost:8080/swagger-ui.html`

The Swagger UI provides:
*   A list of all available API endpoints grouped by tags (e.g., "Authentication & Authorization", "Product Management").
*   Detailed information for each endpoint, including HTTP method, path, request parameters, request body schema, and response schemas.
*   The ability to "Try it out" and execute API requests directly from the browser.
*   Authentication mechanism (Bearer Token) for testing protected endpoints.

## 2. Authentication

All protected endpoints require a JWT (JSON Web Token) in the `Authorization` header.

**Endpoint:** `/api/v1/auth`

*   `POST /register`
    *   **Description:** Register a new user account. Defaults to `ROLE_USER`.
    *   **Request Body:** `RegisterRequest` (firstName, lastName, username, email, password)
    *   **Responses:** `201 Created` (MessageResponse), `400 Bad Request` (if username/email taken or validation errors)
*   `POST /login`
    *   **Description:** Authenticate a user and receive a JWT access token.
    *   **Request Body:** `LoginRequest` (usernameOrEmail, password)
    *   **Responses:** `200 OK` (JwtAuthResponse with accessToken, username, email, role), `401 Unauthorized` (if invalid credentials)

**How to Authenticate in Swagger UI:**
1.  Click the "Authorize" button (usually a lock icon) at the top of the Swagger UI page.
2.  In the dialog, enter your JWT token obtained from `/api/v1/auth/login` in the format: `Bearer <your_jwt_token>`.
3.  Click "Authorize" and then "Close".
4.  The lock icons next to protected endpoints will now appear closed, indicating you are authorized to try them out.

## 3. Product Management

**Endpoint:** `/api/v1/products`

*   `POST /`
    *   **Description:** Create a new product.
    *   **Authentication:** Required (ROLE_ADMIN)
    *   **Request Body:** `ProductRequest` (name, description, price, stockQuantity, imageUrl, categoryId)
    *   **Responses:** `201 Created` (ProductResponse), `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found` (if categoryId invalid)
*   `GET /`
    *   **Description:** Retrieve a paginated and sorted list of all products.
    *   **Authentication:** Required (ROLE_USER, ROLE_ADMIN)
    *   **Query Params:** `pageNo` (default 0), `pageSize` (default 10), `sortBy` (default "id"), `sortDir` (default "asc")
    *   **Responses:** `200 OK` (Page<ProductResponse>), `401 Unauthorized`
*   `GET /{id}`
    *   **Description:** Retrieve a single product by its ID.
    *   **Authentication:** Required (ROLE_USER, ROLE_ADMIN)
    *   **Path Variable:** `id` (Long)
    *   **Responses:** `200 OK` (ProductResponse), `404 Not Found`, `401 Unauthorized`
*   `PUT /{id}`
    *   **Description:** Update an existing product.
    *   **Authentication:** Required (ROLE_ADMIN)
    *   **Path Variable:** `id` (Long)
    *   **Request Body:** `ProductRequest` (name, description, price, stockQuantity, imageUrl, categoryId)
    *   **Responses:** `200 OK` (ProductResponse), `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`
*   `DELETE /{id}`
    *   **Description:** Delete a product by its ID.
    *   **Authentication:** Required (ROLE_ADMIN)
    *   **Path Variable:** `id` (Long)
    *   **Responses:** `204 No Content` (MessageResponse), `401 Unauthorized`, `403 Forbidden`, `404 Not Found`
*   `GET /search?q={query}`
    *   **Description:** Search for products by name or description.
    *   **Authentication:** Required (ROLE_USER, ROLE_ADMIN)
    *   **Query Param:** `q` (String)
    *   **Responses:** `200 OK` (List<ProductResponse>), `401 Unauthorized`

## 4. Category Management

**Endpoint:** `/api/v1/categories`

*   `POST /`
    *   **Description:** Create a new product category.
    *   **Authentication:** Required (ROLE_ADMIN)
    *   **Request Body:** `Category` (name, description)
    *   **Responses:** `201 Created` (Category), `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`
*   `GET /`
    *   **Description:** Retrieve a paginated and sorted list of all categories.
    *   **Authentication:** Required (ROLE_USER, ROLE_ADMIN)
    *   **Query Params:** `pageNo`, `pageSize`, `sortBy`, `sortDir`
    *   **Responses:** `200 OK` (Page<Category>), `401 Unauthorized`
*   `GET /{id}`
    *   **Description:** Retrieve a single category by its ID.
    *   **Authentication:** Required (ROLE_USER, ROLE_ADMIN)
    *   **Path Variable:** `id` (Long)
    *   **Responses:** `200 OK` (Category), `404 Not Found`, `401 Unauthorized`
*   `PUT /{id}`
    *   **Description:** Update an existing category.
    *   **Authentication:** Required (ROLE_ADMIN)
    *   **Path Variable:** `id` (Long)
    *   **Request Body:** `Category` (name, description)
    *   **Responses:** `200 OK` (Category), `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`
*   `DELETE /{id}`
    *   **Description:** Delete a category by its ID.
    *   **Authentication:** Required (ROLE_ADMIN)
    *   **Path Variable:** `id` (Long)
    *   **Responses:** `204 No Content` (MessageResponse), `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

## 5. User Management

**Endpoint:** `/api/v1/users`

*   `GET /`
    *   **Description:** Retrieve a paginated and sorted list of all users.
    *   **Authentication:** Required (ROLE_ADMIN)
    *   **Query Params:** `pageNo`, `pageSize`, `sortBy`, `sortDir`
    *   **Responses:** `200 OK` (Page<UserResponse>), `401 Unauthorized`, `403 Forbidden`
*   `GET /{id}`
    *   **Description:** Retrieve a single user profile by ID.
    *   **Authentication:** Required (ROLE_ADMIN or Owner of the profile)
    *   **Path Variable:** `id` (Long)
    *   **Responses:** `200 OK` (UserResponse), `404 Not Found`, `401 Unauthorized`, `403 Forbidden`
*   `PUT /{id}`
    *   **Description:** Update a user's profile information.
    *   **Authentication:** Required (ROLE_ADMIN or Owner of the profile)
    *   **Path Variable:** `id` (Long)
    *   **Request Body:** `UserUpdateRequest` (firstName, lastName, username, email, password, address, phoneNumber)
    *   **Responses:** `200 OK` (UserResponse), `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`
*   `DELETE /{id}`
    *   **Description:** Delete a user account.
    *   **Authentication:** Required (ROLE_ADMIN)
    *   **Path Variable:** `id` (Long)
    *   **Responses:** `204 No Content` (MessageResponse), `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

## 6. Order Management

**Endpoint:** `/api/v1/orders`

*   `POST /`
    *   **Description:** Create a new order for the authenticated user.
    *   **Authentication:** Required (ROLE_USER, ROLE_ADMIN)
    *   **Request Body:** `{ "productQuantities": { "productId1": quantity1, "productId2": quantity2 }, "shippingAddress": "..." }`
    *   **Responses:** `201 Created` (Order), `400 Bad Request`, `401 Unauthorized`, `404 Not Found`
*   `GET /{id}`
    *   **Description:** Retrieve a single order by its ID.
    *   **Authentication:** Required (ROLE_ADMIN or Owner of the order)
    *   **Path Variable:** `id` (Long)
    *   **Responses:** `200 OK` (Order), `404 Not Found`, `401 Unauthorized`, `403 Forbidden`
*   `GET /my-orders`
    *   **Description:** Retrieve all orders for the currently authenticated user.
    *   **Authentication:** Required (ROLE_USER, ROLE_ADMIN)
    *   **Responses:** `200 OK` (List<Order>), `401 Unauthorized`
*   `GET /`
    *   **Description:** Retrieve a paginated and sorted list of all orders in the system.
    *   **Authentication:** Required (ROLE_ADMIN)
    *   **Query Params:** `pageNo`, `pageSize`, `sortBy` (default "orderDate"), `sortDir` (default "desc")
    *   **Responses:** `200 OK` (Page<Order>), `401 Unauthorized`, `403 Forbidden`
*   `PATCH /{id}/status?newStatus={status}`
    *   **Description:** Update the status of an order.
    *   **Authentication:** Required (ROLE_ADMIN)
    *   **Path Variable:** `id` (Long)
    *   **Query Param:** `newStatus` (String - one of PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
    *   **Responses:** `200 OK` (Order), `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`
*   `DELETE /{id}`
    *   **Description:** Delete an order by its ID. (Note: Orders are typically cancelled/archived in production, not deleted).
    *   **Authentication:** Required (ROLE_ADMIN)
    *   **Path Variable:** `id` (Long)
    *   **Responses:** `204 No Content` (MessageResponse), `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

## 7. Error Handling

The API returns consistent JSON error responses for various scenarios:

**Example Error Response:**

```json
{
  "timestamp": "2023-10-27T10:30:00.123456",
  "status": 404,
  "error": "Not Found",
  "message": "Product not found with id : '123'",
  "details": "uri=/api/v1/products/123"
}
```

*   **`400 Bad Request`**: Input validation failures, invalid request body, or invalid business logic parameters.
*   **`401 Unauthorized`**: Missing or invalid JWT token.
*   **`403 Forbidden`**: Authenticated user lacks the necessary role or permissions to access a resource.
*   **`404 Not Found`**: Resource does not exist (e.g., product or category ID not found).
*   **`500 Internal Server Error`**: Unexpected server-side errors.

This documentation serves as a guide for developers integrating with the ALX E-commerce System API. Always refer to the live Swagger UI for the most up-to-date endpoint specifications.
```

**DEPLOYMENT.md**

```markdown