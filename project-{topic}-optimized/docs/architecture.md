# Mobile Backend Architecture

This document outlines the high-level architecture of the mobile backend system, focusing on its components, interactions, and design principles.

## 1. System Overview

The system is designed as a microservice (or a monolithic application with clear logical separation) exposed via a RESTful API. It serves as the backend for a mobile e-commerce application, managing users, products, and orders.

**Key Design Principles:**

*   **Layered Architecture**: Separation of concerns into distinct layers (Controller, Service, Repository, Utility) to improve maintainability and testability.
*   **Statelessness**: The backend itself is largely stateless, relying on JWT for session management and external data stores (PostgreSQL, Redis) for state.
*   **Scalability**: Designed with horizontal scaling in mind, leveraging Docker for easy deployment and load balancing.
*   **Security**: Authentication (JWT), authorization (role-based), password hashing, and secure communication (implicitly TLS/SSL in production setup).
*   **Observability**: Comprehensive logging and readiness for monitoring integration.
*   **Robustness**: Error handling, input validation, and transactional integrity (where applicable).

## 2. Component Diagram

```
+-------------------+     +-----------------+     +-----------------+
| Mobile Frontend   | <-> |   Load Balancer | <-> |   Backend (C++) |
| (iOS/Android)     |     |  (Nginx/ALB)    |     |   (Drogon App)  |
+-------------------+     +-----------------+     +-----------------+
                                   ^     ^
                                   |     |
                           (API Requests) (Responses)
                                   |     |
                                   v     v
                  +-----------------------------------+
                  |      Backend Instances (Containerized) |
                  |                                   |
                  |  +-----------------------------+  |
                  |  |  1. Controllers           |  |
                  |  |     (Auth, User, Product, Order) |  |
                  |  |                           |  |
                  |  |  2. Middleware            |  |
                  |  |     (Auth, Error Handler) |  |
                  |  |                           |  |
                  |  |  3. Services              |  |
                  |  |     (Auth, User, Product, Order) |  |
                  |  |                           |  |
                  |  |  4. Repositories          |  |
                  |  |     (User, Product, Order) |  |
                  |  |                           |  |
                  |  |  5. Utilities             |  |
                  |  |     (AppConfig, JWT, Crypto, Redis) |  |
                  |  +-----------------------------+  |
                  +-----------------------------------+
                                   ^     ^
                                   |     |
                           (DB Queries) (Cache Ops)
                                   |     |
                                   v     v
                         +-----------------+    +-----------------+
                         |   PostgreSQL    |    |      Redis      |
                         |   (Database)    |    |    (Cache)      |
                         +-----------------+    +-----------------+
```

## 3. Layered Architecture

The C++ backend follows a classical layered architecture:

### 3.1. Controllers Layer

*   **Responsibilities**:
    *   Receive HTTP requests from the client.
    *   Parse request parameters, body, and headers.
    *   Delegate business logic execution to the Services layer.
    *   Format responses (JSON) and set appropriate HTTP status codes.
    *   Handle route definitions and integrate middleware.
*   **Technology**: Drogon `HttpController`.
*   **Interactions**: Interacts with Middleware for request pre-processing and Service layer for core logic.

### 3.2. Middleware Layer

*   **Responsibilities**:
    *   **Authentication**: Verify JWT tokens, extract user identity and roles, attach user info to request context.
    *   **Authorization**: Check if the authenticated user has the necessary permissions for the requested action/resource.
    *   **Error Handling**: Catch exceptions thrown by controllers or services, format consistent JSON error responses, and log errors.
    *   **Logging**: Log incoming requests and outgoing responses.
    *   **Rate Limiting** (not fully implemented, but conceptually here): Limit request frequency.
*   **Technology**: Drogon `HttpFilter`.
*   **Interactions**: Operates before and after Controllers process the request.

### 3.3. Services Layer (Business Logic)

*   **Responsibilities**:
    *   Implement the core business rules and workflows (e.g., user registration, order placement, stock management).
    *   Orchestrate interactions between multiple repositories.
    *   Perform complex data validation and transformations beyond basic input parsing.
    *   Manage transactional boundaries (though explicit C++ transaction management is simplified in this example).
    *   Handle specific business exceptions.
*   **Technology**: Plain C++ classes, injected with Repository dependencies.
*   **Interactions**: Interacts with the Repositories layer.

### 3.4. Repositories Layer (Data Access)

*   **Responsibilities**:
    *   Provide an abstraction layer over the database.
    *   Perform CRUD operations for specific entities (User, Product, Order).
    *   Translate application-level models into database-specific queries (SQL).
    *   Handle database-specific exceptions and map them to generic API errors.
    *   Manage database connections (handled by Drogon's DbClient).
*   **Technology**: Plain C++ classes, injected with Drogon `DbClientPtr`.
*   **Interactions**: Interacts directly with the PostgreSQL database.

### 3.5. Models Layer (Data Structures)

*   **Responsibilities**:
    *   Define the structure of data objects used across different layers (e.g., `User`, `Product`, `Order`, `OrderItem`).
    *   Provide methods for serialization/deserialization to/from JSON.
*   **Technology**: C++ `struct`s or `class`es.
*   **Interactions**: Used by all other layers to represent data.

### 3.6. Utilities Layer

*   **Responsibilities**:
    *   Provide common helper functionalities (e.g., configuration loading, JWT token management, cryptographic utilities for password hashing, Redis client management).
*   **Technology**: Singleton C++ classes or namespaces with static functions.
*   **Interactions**: Used by any layer that requires specific utility functions.

## 4. External Services

### 4.1. PostgreSQL Database

*   **Role**: Primary data store for persistent application data (users, products, orders, etc.).
*   **Features**: Relational data model, ACID compliance, indexing for query optimization.
*   **Integration**: Drogon's `DbClient` provides a connection pool and ORM-like capabilities for interacting with PostgreSQL.

### 4.2. Redis Cache

*   **Role**: In-memory data store used for caching frequently accessed data, session management, and potentially rate-limiting counters.
*   **Features**: High-performance key-value store.
*   **Integration**: `RedisManager` utility using `hiredis` client library.

## 5. Data Flow (Example: Create Order)

1.  **Mobile Frontend**: Sends a `POST /orders` request with order items and `Authorization: Bearer <token>`.
2.  **Load Balancer**: Routes the request to an available Backend instance.
3.  **Drogon Controller (`OrderController`)**:
    *   Receives the HTTP request.
    *   `AuthMiddleware` verifies the JWT token, extracts `userId` and `role`, attaches to request.
    *   Parses the JSON request body (order items).
    *   Calls `OrderService::createOrder(userId, items)`.
4.  **Service Layer (`OrderService`)**:
    *   Validates business rules (e.g., items not empty, product IDs valid, quantity > 0).
    *   Iterates through order items:
        *   Calls `ProductRepository::findById()` to fetch product details and current stock.
        *   Performs stock availability check.
    *   Calculates `totalAmount`.
    *   Calls `OrderRepository::create()` to insert the new order record (gets new `orderId`).
    *   Calls `OrderRepository::addOrderItems()` to insert each item associated with `orderId`.
    *   Calls `ProductRepository::updateStock()` for each ordered product to deduct quantities.
    *   If any step fails, it throws an `ApiError` (e.g., `NotFoundError`, `BadRequestError`, `InternalServerError`).
5.  **Repository Layer (`OrderRepository`, `ProductRepository`)**:
    *   Executes SQL queries against the PostgreSQL database.
    *   Handles database interactions and potential `DrogonDbException`s.
6.  **Error Handling (if an exception occurs)**: `ErrorHandler` middleware catches the exception, logs it, and sends a standardized JSON error response (e.g., `400 Bad Request` if `OrderService` found insufficient stock).
7.  **Successful Response**: If all operations succeed, `OrderController` constructs a `201 Created` JSON response with the new `orderId` and sends it back to the client.

This architecture provides a clear separation of concerns, making the system modular, testable, and easier to scale and maintain.