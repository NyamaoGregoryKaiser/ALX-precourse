# ALX E-commerce Solutions System: API Documentation (OpenAPI/Swagger)

This document provides an overview of the RESTful API endpoints for the E-commerce Solutions System. The API is designed to be consumed by the frontend application and potentially by other third-party services.

For an interactive, up-to-date API documentation, please visit the Swagger UI endpoint:
**Interactive API Docs:** `http://localhost:5000/api/v1/docs` (when backend is running locally)

---

## 1. Base URL

`http://localhost:5000/api/v1` (for local development)
`https://api.yourdomain.com/api/v1` (for production)

## 2. Authentication

The API uses **JWT (JSON Web Token) Bearer Token** authentication.

1.  **Register** or **Login** to get a JWT.
2.  Include the JWT in the `Authorization` header of all protected requests: `Authorization: Bearer <your_jwt_token>`

## 3. Error Handling

API errors are returned in a standardized JSON format:

```json
{
  "message": "Error description here",
  "stack": "Stack trace (only in development environment)"
}
```

**Common Status Codes:**
*   `200 OK`: Successful request.
*   `201 Created`: Resource successfully created.
*   `204 No Content`: Successful request, but no content to return (e.g., DELETE).
*   `400 Bad Request`: Invalid request payload or parameters (e.g., validation error).
*   `401 Unauthorized`: Authentication required or failed (e.g., missing/invalid token).
*   `403 Forbidden`: Authenticated, but not authorized to access the resource.
*   `404 Not Found`: Resource not found.
*   `409 Conflict`: Resource conflict (e.g., duplicate email during registration).
*   `429 Too Many Requests`: Rate limit exceeded.
*   `500 Internal Server Error`: Unexpected server error.

---

## 4. API Endpoints

### 4.1. Authentication (`/auth`)

**`POST /auth/register`**
*   **Description:** Registers a new user with `CUSTOMER` role.
*   **Request Body:**
    ```json
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "password": "strongpassword123"
    }
    ```
*   **Responses:**
    *   `201 Created`: `{"message": "Registration successful", "user": {...}, "token": "..."}`
    *   `400 Bad Request`: Validation error.
    *   `409 Conflict`: User with email already exists.

**`POST /auth/login`**
*   **Description:** Logs in a user and returns a JWT.
*   **Request Body:**
    ```json
    {
      "email": "john.doe@example.com",
      "password": "strongpassword123"
    }
    ```
*   **Responses:**
    *   `200 OK`: `{"message": "Login successful", "user": {...}, "token": "..."}`
    *   `400 Bad Request`: Validation error.
    *   `401 Unauthorized`: Invalid credentials.

**`GET /auth/me`**
*   **Description:** Retrieves the profile of the currently authenticated user.
*   **Authentication:** Required (Bearer Token).
*   **Responses:**
    *   `200 OK`: User object (`{"id": "...", "name": "...", "email": "...", "role": "CUSTOMER"}`)
    *   `401 Unauthorized`: Invalid or missing token.

### 4.2. Products (`/products`)

**`GET /products`**
*   **Description:** Retrieves a list of all products, with optional filtering and pagination.
*   **Query Parameters:**
    *   `categoryId`: Filter by category ID (UUID).
    *   `search`: Search by product name or description (case-insensitive).
    *   `page`: Page number (default: `1`).
    *   `limit`: Number of items per page (default: `10`).
*   **Responses:**
    *   `200 OK`: `{"products": [...], "total": 100, "page": 1, "limit": 10}`

**`GET /products/:id`**
*   **Description:** Retrieves a single product by its ID.
*   **Path Parameters:**
    *   `id` (string, UUID): The product's unique identifier.
*   **Responses:**
    *   `200 OK`: Product object.
    *   `404 Not Found`: Product not found.

**`POST /products`**
*   **Description:** Creates a new product.
*   **Authentication:** Required (Admin role).
*   **Request Body:**
    ```json
    {
      "name": "New Awesome Gadget",
      "description": "This is a detailed description of the new gadget.",
      "price": 99.99,
      "stock": 150,
      "categoryId": "uuid-of-an-existing-category",
      "imageUrl": "http://example.com/gadget.jpg"
    }
    ```
*   **Responses:**
    *   `201 Created`: Newly created Product object.
    *   `400 Bad Request`: Validation error or category not found.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an ADMIN.

**`PUT /products/:id`**
*   **Description:** Updates an existing product by its ID.
*   **Authentication:** Required (Admin role).
*   **Path Parameters:**
    *   `id` (string, UUID): The product's unique identifier.
*   **Request Body:** (Partial update allowed)
    ```json
    {
      "name": "Updated Gadget Name",
      "price": 109.99
    }
    ```
*   **Responses:**
    *   `200 OK`: Updated Product object.
    *   `400 Bad Request`: Validation error or category not found.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an ADMIN.
    *   `404 Not Found`: Product not found.

**`DELETE /products/:id`**
*   **Description:** Deletes a product by its ID.
*   **Authentication:** Required (Admin role).
*   **Path Parameters:**
    *   `id` (string, UUID): The product's unique identifier.
*   **Responses:**
    *   `204 No Content`: Product successfully deleted.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an ADMIN.
    *   `404 Not Found`: Product not found.

### 4.3. Categories (`/categories`)

*(Conceptual endpoints, implemented following the same pattern as products)*

**`GET /categories`**
*   **Description:** Retrieves a list of all product categories.
*   **Responses:** `200 OK`

**`POST /categories`**
*   **Description:** Creates a new category.
*   **Authentication:** Required (Admin role).
*   **Request Body:** `{"name": "Electronics", "slug": "electronics", "description": "Electronic gadgets"}`
*   **Responses:** `201 Created`

### 4.4. Users (`/users`)

*(Conceptual endpoints, implemented following the same pattern as products)*

**`GET /users`**
*   **Description:** Retrieves a list of all users.
*   **Authentication:** Required (Admin role).
*   **Responses:** `200 OK`

**`GET /users/:id`**
*   **Description:** Retrieves a single user by ID.
*   **Authentication:** Required (Admin role).
*   **Responses:** `200 OK`

### 4.5. Orders (`/orders`)

*(Conceptual endpoints, basic implementation for order creation would involve validating cart, checking stock, creating order and order items, updating product stock, and clearing cart)*

**`POST /orders`**
*   **Description:** Creates a new order from the user's cart.
*   **Authentication:** Required (Customer or Admin role).
*   **Request Body:** `{"shippingAddress": "123 Main St, City, Country", "items": [{"productId": "...", "quantity": 1}]}` (simplified for conceptual)
*   **Responses:** `201 Created`

**`GET /orders/me`**
*   **Description:** Retrieves orders for the authenticated user.
*   **Authentication:** Required.
*   **Responses:** `200 OK`

**`GET /orders/:id`**
*   **Description:** Retrieves a single order by ID.
*   **Authentication:** Required (user must own order OR be Admin).
*   **Responses:** `200 OK`

---

## 5. Swagger/OpenAPI Configuration

The API documentation is generated using `swagger-jsdoc` and served by `swagger-ui-express`.

**`backend/src/config/swagger.config.ts`:**
```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env.config';

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'ALX E-commerce API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the ALX E-commerce Solutions System.',
      contact: {
        name: 'ALX Team',
        url: 'https://www.alx-africa.com/',
        email: 'support@alx-ecommerce.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}${config.apiVersion}`,
        description: 'Local Development Server',
      },
      {
        url: 'https://api.yourdomain.com/api/v1',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter the access token obtained from /auth/login or /auth/register',
        },
      },
      schemas: {
        // --- Shared Models ---
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['CUSTOMER', 'ADMIN'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          example: {
            id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'CUSTOMER',
            createdAt: '2023-01-01T10:00:00Z',
            updatedAt: '2023-01-01T10:00:00Z',
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          example: {
            id: 'e290f1ee-6c54-4b01-90e6-d701748f0851',
            name: 'Electronics',
            slug: 'electronics',
            description: 'Gadgets and electronic devices',
            createdAt: '2023-01-01T10:00:00Z',
            updatedAt: '2023-01-01T10:00:00Z',
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number', format: 'float' },
            stock: { type: 'integer' },
            imageUrl: { type: 'string', format: 'uri', nullable: true },
            categoryId: { type: 'string', format: 'uuid' },
            category: { $ref: '#/components/schemas/Category' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          example: {
            id: 'f290f1ee-6c54-4b01-90e6-d701748f0851',
            name: 'Wireless Bluetooth Headphones',
            description: 'Premium sound quality with noise-cancelling features and long battery life.',
            price: 129.99,
            stock: 120,
            imageUrl: 'https://example.com/headphones.jpg',
            categoryId: 'e290f1ee-6c54-4b01-90e6-d701748f0851',
            category: {
              id: 'e290f1ee-6c54-4b01-90e6-d701748f0851',
              name: 'Electronics',
              slug: 'electronics',
              description: 'Gadgets and electronic devices',
              createdAt: '2023-01-01T10:00:00Z',
              updatedAt: '2023-01-01T10:00:00Z',
            },
            createdAt: '2023-01-01T10:00:00Z',
            updatedAt: '2023-01-01T10:00:00Z',
          },
        },
        // --- DTOs (Data Transfer Objects) ---
        CreateProductDTO: {
          type: 'object',
          required: ['name', 'description', 'price', 'stock', 'categoryId'],
          properties: {
            name: { type: 'string', minLength: 3, maxLength: 255 },
            description: { type: 'string', minLength: 10, maxLength: 1000 },
            price: { type: 'number', format: 'float', minimum: 0.01 },
            stock: { type: 'integer', minimum: 0 },
            categoryId: { type: 'string', format: 'uuid' },
            imageUrl: { type: 'string', format: 'uri', nullable: true },
          },
          example: {
            name: 'New Gadget',
            description: 'A fantastic new product.',
            price: 50.00,
            stock: 200,
            categoryId: 'e290f1ee-6c54-4b01-90e6-d701748f0851',
            imageUrl: 'http://example.com/new-gadget.jpg',
          },
        },
        UpdateProductDTO: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 3, maxLength: 255 },
            description: { type: 'string', minLength: 10, maxLength: 1000 },
            price: { type: 'number', format: 'float', minimum: 0.01 },
            stock: { type: 'integer', minimum: 0 },
            categoryId: { type: 'string', format: 'uuid' },
            imageUrl: { type: 'string', format: 'uri', nullable: true },
          },
          example: {
            name: 'Updated Gadget Name',
            price: 55.00,
          },
        },
      },
    },
  },
  apis: [
    './src/routes/*.ts', // Path to your API route files
    './src/types/*.ts',  // Path to your types/DTOs if you define swagger components there
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
```
---

## 6. Versioning

The API uses URI versioning: `api/v1`. This allows for future backward-incompatible changes to be introduced under a new version (e.g., `api/v2`) without breaking existing clients.

---

This API documentation provides a clear contract for interacting with the E-commerce system.
```