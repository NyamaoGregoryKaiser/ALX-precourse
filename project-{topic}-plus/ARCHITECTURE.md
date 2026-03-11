# ALX E-commerce Solution - Architecture Documentation

This document describes the high-level and detailed architecture of the ALX E-commerce Solution.

## Table of Contents

1.  [High-Level Architecture](#1-high-level-architecture)
    *   [C4 Model - System Context Diagram](#c4-model---system-context-diagram)
2.  [Detailed Backend Architecture](#2-detailed-backend-architecture)
    *   [Layered Architecture](#layered-architecture)
    *   [Modules](#modules)
    *   [Data Flow](#data-flow)
    *   [Technology Choices](#technology-choices)
3.  [Data Model (Database Schema)](#3-data-model-database-schema)
4.  [Non-Functional Requirements](#4-non-functional-requirements)
    *   [Scalability](#scalability)
    *   [Security](#security)
    *   [Reliability](#reliability)
    *   [Maintainability](#maintainability)
    *   [Performance](#performance)
    *   [Observability](#observability)
5.  [Future Enhancements](#5-future-enhancements)

---

## 1. High-Level Architecture

The system is designed as a monolithic Spring Boot application for the backend, exposed via REST APIs, and consumed by a separate frontend application. This approach provides a good balance of rapid development and ease of deployment for a medium-sized application, while retaining options for future microservice decomposition if necessary.

### C4 Model - System Context Diagram

```
+-------------------------------------------------------------+
| System: ALX E-commerce Solution                             |
|                                                             |
|   +-------------------+       +------------------------+    |
|   | User (Customer)   |------>| Web Browser (Frontend) |    |
|   |                   |       +------------------------+    |
|   |                   |<------|       (React App)      |    |
|   +-------------------+       +------------------------+    |
|                                     |                       |
|                                     | HTTP(S) / JSON        |
|                                     v                       |
|   +-------------------------------------------------------+ |
|   | E-commerce Backend (Spring Boot Application)          | |
|   |   - User Management                                   | |
|   |   - Product Catalog                                   | |
|   |   - Shopping Cart                                     | |
|   |   - Order Processing                                  | |
|   |   - Authentication/Authorization                      | |
|   +-------------------------------------------------------+ |
|        |           |          |                            |
|        | (JPA/JDBC)| (Redis)  | (Liquibase)                |
|        v           v          v                            |
|   +----------+  +-------+  +-----------+                   |
|   | PostgreSQL |  | Redis |  | Filesystem  |               |
|   | (Database) |  | (Cache)|  | (Log Files) |               |
|   +----------+  +-------+  +-----------+                   |
|                                                             |
+-------------------------------------------------------------+
```
**Explanation:**
*   **User (Customer)**: Interacts with the e-commerce platform through a web browser.
*   **Web Browser (Frontend)**: A single-page application (React) running in the user's browser, responsible for the user interface and experience. It communicates with the backend via REST APIs.
*   **E-commerce Backend (Spring Boot Application)**: The core application logic. It handles all business operations, manages data, and provides APIs.
*   **PostgreSQL**: The primary relational database for persistence of all transactional data (users, products, orders, etc.).
*   **Redis**: An in-memory data store used for caching frequently accessed data (e.g., product lists, categories) to improve response times and reduce database load. Also used for rate limiting state.
*   **Filesystem**: Used for storing application logs.

---

## 2. Detailed Backend Architecture

The backend application follows a standard **layered architecture** and is organized into functional modules.

### Layered Architecture

*   **Controller Layer**: (e.g., `UserController`, `ProductController`)
    *   Handles incoming HTTP requests.
    *   Maps requests to service methods.
    *   Performs input validation using `@Valid` and DTOs.
    *   Returns HTTP responses.
    *   Uses Springdoc OpenAPI for API documentation.
    *   `GlobalExceptionHandler` provides consistent error responses.
    *   `RateLimitFilter` acts as a request gateway to prevent abuse.
*   **Service Layer**: (e.g., `UserService`, `ProductService`, `CartService`, `OrderService`)
    *   Contains the core business logic.
    *   Orchestrates operations across multiple repositories.
    *   Applies transactions (`@Transactional`).
    *   Handles complex data processing and calculations.
    *   Integrates caching (`@Cacheable`, `@CacheEvict`).
    *   Performs domain-specific validations.
*   **Repository Layer**: (e.g., `UserRepository`, `ProductRepository`)
    *   Provides data access abstraction using Spring Data JPA.
    *   Performs CRUD operations on entities.
    *   Translates business objects to database entities and vice-versa.
*   **Domain Layer (Entities)**: (e.g., `User`, `Product`, `Order`)
    *   Represents the core business objects and their relationships.
    *   Annotated with JPA for ORM mapping.
    *   Includes `User` (authentication, roles), `Category`, `Product`, `Cart`, `CartItem`, `Order`, `OrderItem`.
*   **DTO (Data Transfer Object) Layer**: (e.g., `UserDTO`, `ProductDTO`, `LoginRequest`)
    *   Objects used for data exchange between the client and the server, and between layers.
    *   Decouples the API contract from internal data models.
    *   Allows for data transformation and hiding sensitive information.
*   **Configuration Layer**: (e.g., `SecurityConfig`, `RedisConfig`, `OpenApiConfig`)
    *   Sets up Spring Boot components, security rules, caching mechanisms, etc.

### Modules

The backend is logically divided into modules to separate concerns:

*   **`com.alx.ecommerce.config`**: Global application configurations, including Spring Security, JWT, OpenAPI, Redis, and Rate Limiting filters.
*   **`com.alx.ecommerce.common`**: Shared utilities like `ApiResponse` for standardized responses and global exception handling.
*   **`com.alx.ecommerce.user`**: Manages user authentication, authorization, and profile.
    *   `model`: `User`, `Role`, `ERole`
    *   `repository`: `UserRepository`, `RoleRepository`
    *   `dto`: `SignupRequest`, `LoginRequest`, `JwtResponse`, `UserDTO`
    *   `service`: `UserService`, `CustomUserDetailsService`
    *   `controller`: `UserController`
*   **`com.alx.ecommerce.product`**: Handles product catalog and category management.
    *   `model`: `Product`, `Category`
    *   `repository`: `ProductRepository`, `CategoryRepository`
    *   `dto`: `ProductDTO`, `CategoryDTO`
    *   `service`: `ProductService`, `CategoryService`
    *   `controller`: `ProductController`, `CategoryController`
*   **`com.alx.ecommerce.order`**: Manages shopping cart functionality and order processing.
    *   `model`: `Cart`, `CartItem`, `Order`, `OrderItem`
    *   `repository`: `CartRepository`, `CartItemRepository`, `OrderRepository`, `OrderItemRepository`
    *   `dto`: `AddToCartRequest`, `CartDTO`, `OrderDTO`
    *   `service`: `CartService`, `OrderService`
    *   `controller`: `CartController`, `OrderController`
*   **`com.alx.ecommerce.util`**: Helper utilities, specifically `JwtUtil` for JWT token generation and validation.

### Data Flow

1.  **Client Request**: A frontend (React App) or other client sends an HTTP request to the Backend API (e.g., `POST /api/auth/signin`).
2.  **Rate Limiting**: The `RateLimitFilter` intercepts the request, checks the client's IP against rate limits, and allows/denies the request.
3.  **Authentication/Authorization**: `JwtAuthFilter` extracts JWT from the `Authorization` header, validates it using `JwtUtil`, and sets Spring Security's `SecurityContext`. Spring Security then authorizes access based on roles (`@PreAuthorize`).
4.  **Controller Processing**: The relevant `@RestController` receives the request. Input DTOs are validated (`@Valid`).
5.  **Service Logic**: The Controller calls a method in the appropriate `@Service`. Business logic is executed, including:
    *   Fetching/saving data via `@Repository` interfaces.
    *   Interacting with Redis for caching.
    *   Performing complex calculations (e.g., cart total).
    *   Updating product stock during order placement.
6.  **Database Interaction**: The `@Repository` interacts with PostgreSQL via Hibernate/JPA. Liquibase manages database schema changes.
7.  **Cache Interaction**: Services interact with Redis to store/retrieve cached data.
8.  **Response Generation**: The Service returns a result (e.g., DTO). The Controller wraps it in an `ApiResponse` and returns an HTTP response to the client.
9.  **Error Handling**: If an exception occurs, `GlobalExceptionHandler` intercepts it and returns a standardized error response.
10. **Logging**: All layers utilize SLF4J/Logback for structured logging, aiding in debugging and monitoring.

### Technology Choices

*   **Spring Boot**: Chosen for its convention-over-configuration, rapid development features, and robust ecosystem for building enterprise-grade Java applications.
*   **PostgreSQL**: A powerful, open-source relational database known for its reliability, data integrity, and advanced features, suitable for transactional e-commerce data.
*   **Redis**: Selected as a high-performance in-memory data store for caching due to its speed and simplicity, effectively reducing database load.
*   **Spring Security + JWT**: A industry-standard combination for securing REST APIs, providing stateless authentication and role-based authorization.
*   **Liquibase**: For managing database schema changes reliably and versioning them.
*   **Spring Data JPA**: Simplifies data access layer development by abstracting boilerplate code for CRUD operations.
*   **Springdoc OpenAPI**: Automatically generates OpenAPI (Swagger) documentation from Spring Boot annotations, providing clear API contracts.
*   **Lombok**: Reduces boilerplate code (getters, setters, constructors) for DTOs and entities, making code cleaner.
*   **Bucket4j**: A Java library for rate limiting, providing efficient token bucket algorithm implementation.

---

## 3. Data Model (Database Schema)

The database schema is managed by Liquibase and is defined in `backend/database/liquibase/changelogs/*.sql` files.

**Key Tables:**

*   **`users`**: Stores user authentication and profile information.
    *   `id` (PK), `username` (UNIQUE), `email` (UNIQUE), `password` (hashed), `created_at`, `updated_at`.
*   **`roles`**: Stores user roles (e.g., ROLE_USER, ROLE_ADMIN).
    *   `id` (PK), `name` (UNIQUE).
*   **`user_roles`**: Join table for many-to-many relationship between `users` and `roles`.
*   **`categories`**: Stores product categories.
    *   `id` (PK), `name` (UNIQUE), `description`, `image_url`, `created_at`, `updated_at`.
*   **`products`**: Stores product details.
    *   `id` (PK), `name`, `sku` (UNIQUE), `description`, `price`, `stock_quantity`, `image_url`, `category_id` (FK to `categories`), `created_at`, `updated_at`.
*   **`carts`**: Represents a user's shopping cart.
    *   `id` (PK), `user_id` (FK to `users`, UNIQUE), `created_at`, `updated_at`.
*   **`cart_items`**: Items within a shopping cart.
    *   `id` (PK), `cart_id` (FK to `carts`), `product_id` (FK to `products`), `quantity`, `price_at_time_of_addition`, `created_at`, `updated_at`. (UNIQUE on `cart_id`, `product_id`).
*   **`orders`**: Stores order details.
    *   `id` (PK), `user_id` (FK to `users`), `total_amount`, `shipping_address`, `order_status`, `order_date`, `updated_at`.
*   **`order_items`**: Items purchased in an order.
    *   `id` (PK), `order_id` (FK to `orders`), `product_id` (FK to `products`), `quantity`, `price_at_purchase`, `created_at`, `updated_at`.

---

## 4. Non-Functional Requirements

### Scalability
*   **Stateless Backend**: JWT-based authentication ensures the backend is stateless, allowing horizontal scaling of application instances.
*   **Database**: PostgreSQL can be scaled vertically (more powerful server) and horizontally (read replicas, sharding for very large scale, though not implemented here).
*   **Caching (Redis)**: Offloads read requests from the database, reducing database load and improving response times, which is crucial for scalability.
*   **Docker/Kubernetes**: Designed for containerized deployment, facilitating easy scaling of services in container orchestration platforms.

### Security
*   **Authentication & Authorization**: JWT with Spring Security provides robust, industry-standard authentication and role-based access control.
*   **Password Hashing**: BCrypt algorithm is used for secure storage of user passwords.
*   **Input Validation**: `jakarta.validation` annotations ensure input data integrity and prevent common injection attacks.
*   **Error Handling**: Global exception handler prevents sensitive information leakage in error responses.
*   **HTTPS**: (Deployment consideration) Should be enforced in production for all communication.
*   **Rate Limiting**: Protects against brute-force attacks and denial-of-service attempts by limiting request frequency.

### Reliability
*   **Transactional Operations**: `@Transactional` annotations ensure data consistency for multi-step operations (e.g., placing an order, updating stock).
*   **Database Migrations (Liquibase)**: Manages schema evolution in a controlled and versioned manner, preventing data loss and ensuring database consistency across environments.
*   **Logging**: Comprehensive logging provides visibility into application behavior, aiding in troubleshooting and identifying issues.

### Maintainability
*   **Modular Design**: Code is organized into logical modules and layers, making it easier to understand, test, and maintain.
*   **Clean Code Principles**: Adherence to Java coding conventions, meaningful naming, and proper use of design patterns.
*   **Automated Tests**: Unit and integration tests ensure changes do not introduce regressions and help maintain code quality.
*   **API Documentation (Swagger)**: Provides up-to-date documentation of API endpoints, simplifying integration for frontend developers and other consumers.

### Performance
*   **Caching (Redis)**: Significantly improves read performance for frequently accessed data like products and categories.
*   **Database Indexing**: (Implicit via JPA, explicit in migrations if needed) Ensures fast data retrieval.
*   **Efficient Queries**: Spring Data JPA's derived query methods and `@Query` annotations allow for optimized database interactions.
*   **Lazy Loading**: JPA's `FetchType.LAZY` prevents loading unnecessary data, improving performance for complex object graphs.

### Observability
*   **Logging**: Configured with Logback for structured logging to console and files, supporting easy integration with log aggregation systems.
*   **Actuator Endpoints**: Spring Boot Actuator provides endpoints for monitoring application health, metrics (integrated with Prometheus), and other operational insights.
*   **Error Handling**: Centralized error logging and detailed stack traces (in logs) for rapid error diagnosis.

---

## 5. Future Enhancements

This solution provides a strong foundation. Potential future enhancements include:

*   **Payment Gateway Integration**: Implement integration with third-party payment providers (e.g., Stripe, PayPal).
*   **Search & Filtering**: Advanced search capabilities (faceted search, full-text search) and more robust filtering options.
*   **User Reviews & Ratings**: Allow users to leave reviews and ratings for products.
*   **Wishlist Functionality**: Users can save products to a wishlist.
*   **Email Notifications**: Send transactional emails (order confirmation, shipping updates, password reset).
*   **Admin Dashboard**: A dedicated frontend or module for administrators to manage users, products, orders, etc., with richer analytics.
*   **Image Upload Service**: Integrate with cloud storage (e.g., AWS S3) for product images.
*   **Discount & Promotions**: Implement coupon codes, sales, and promotional offers.
*   **Shipping & Inventory Management**: More sophisticated logic for calculating shipping costs and real-time inventory updates.
*   **Event-Driven Architecture**: Introduce message queues (Kafka, RabbitMQ) for asynchronous processing of orders, notifications, etc., for greater scalability and resilience.
*   **Container Orchestration**: Deploy to Kubernetes for advanced scaling, self-healing, and management.
*   **Frontend**: Develop a full-featured, interactive React/Angular/Vue frontend.
*   **Comprehensive Performance Tests**: Dedicated project with JMeter/Gatling scripts and detailed analysis.
*   **Security Audits**: Regular security scans and penetration testing.
*   **Circuit Breakers**: Implement circuit breakers (e.g., Resilience4j) for external service calls.