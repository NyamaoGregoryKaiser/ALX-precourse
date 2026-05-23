# E-commerce C++ API Architecture Document

This document describes the high-level architecture, design principles, and component interactions of the E-commerce C++ API.

## 1. High-Level Architecture

The system is designed as a **monolithic API service** built in C++ for maximum performance and control over resources. It exposes a RESTful API to be consumed by a separate frontend application (e.g., Single Page Application, mobile app). It leverages a relational database (PostgreSQL) for persistent storage and Redis for caching and rate limiting.

```
+----------------+       +-------------------+       +--------------------+
|                |       |                   |       |                    |
| Frontend (SPA) | <---> | C++ Backend (API) | <---> | PostgreSQL (DB)    |
| (e.g., React)  |       |                   |       |                    |
|                |       |                   |       | Redis (Cache/RL)   |
+----------------+       +-------------------+       +--------------------+
                              ^       ^
                              |       |
                              +-------+
                                Logging / Monitoring
```

## 2. Core Application Design Principles

The C++ backend follows a **layered architecture** to promote separation of concerns, testability, and maintainability.

### 2.1. Layered Architecture

1.  **Presentation Layer (Controllers)**:
    *   **Purpose**: Handles HTTP requests, parses incoming JSON, calls appropriate service methods, and formats responses (JSON).
    *   **Components**: `AuthController`, `UserController`, `ProductController`, `OrderController`.
    *   **Responsibilities**: Request/response handling, basic input validation (e.g., presence of required fields), authentication and authorization checks (delegated to middleware).
    *   **Technologies**: `CrowCpp` web framework, `nlohmann/json` for JSON parsing.

2.  **Service Layer (Business Logic)**:
    *   **Purpose**: Contains the core business logic, orchestrates data operations, and enforces business rules.
    *   **Components**: `UserService`, `ProductService`, `OrderService`.
    *   **Responsibilities**: Complex input validation, transaction management (across multiple DAO calls), data consistency, security logic (e.g., password hashing before storage).
    *   **Interaction**: Interacts with one or more DAOs.

3.  **Data Access Layer (DAO - Data Access Objects)**:
    *   **Purpose**: Provides an abstraction over the persistent storage (database).
    *   **Components**: `UserDAO`, `ProductDAO`, `OrderDAO`, `CartItemDAO`.
    *   **Responsibilities**: CRUD operations for specific entities, mapping between database rows and C++ model objects, handling database-specific exceptions.
    *   **Technologies**: `libpqxx` (PostgreSQL C++ client), `DBManager` for connection pooling.

4.  **Domain Model Layer (Models)**:
    *   **Purpose**: Represents the core business entities and their properties.
    *   **Components**: `User`, `Product`, `Order`, `CartItem`, `BaseEntity`.
    *   **Responsibilities**: Data structure definition, basic data transformations (e.g., to/from JSON, to/from SQL row), data validation (simple structural checks).

### 2.2. Cross-Cutting Concerns

*   **Configuration**:
    *   `AppConfig` singleton: Loads application settings from environment variables. Ensures consistent configuration across modules.
*   **Logging**:
    *   `Logger` wrapper: Provides a unified interface for structured logging using `spdlog`. Configurable log levels and output (console, file).
    *   `LoggingMiddleware`: Logs incoming requests and outgoing responses.
*   **Error Handling**:
    *   `ErrorHandlingMiddleware`: Centralized exception handling, catches various exception types (database, service, JSON parsing) and returns standardized JSON error responses.
    *   Custom Exceptions: `DatabaseException`, `UserServiceException` (and its specializations like `UserAlreadyExistsException`, `UserNotFoundException`, `InvalidCredentialsException`).
*   **Authentication & Authorization**:
    *   `JwtUtils`: Utility functions for encoding and decoding JWT tokens.
    *   `AuthMiddleware`: Intercepts requests, validates JWT tokens, extracts claims (user ID, role), and stores them in the request context for subsequent authorization checks in controllers.
    *   Role-Based Access Control (RBAC): `AuthMiddleware::has_role()` helper function for granular access control.
*   **Rate Limiting**:
    *   `RateLimitingMiddleware`: Limits the number of requests per client IP address over a time window to prevent abuse. (Current implementation is in-memory; a production-ready solution would use Redis).
*   **Utilities**:
    *   `JsonUtils`: Helper functions for safe JSON manipulation (get optional values, check required keys).
    *   `BcryptWrapper`: Secure password hashing and verification using `bcrypt`.

## 3. Data Flow Example: User Registration

1.  **Client Request**: Frontend sends `POST /api/v1/auth/register` with user data (username, email, password, etc.) in JSON format.
2.  **CrowCpp Dispatch**: `CrowCpp` receives the request and passes it through middlewares.
3.  **LoggingMiddleware**: Logs the incoming request details.
4.  **RateLimitingMiddleware**: Checks if the client's IP has exceeded the allowed request rate. If so, returns `429 Too Many Requests`.
5.  **AuthController**:
    *   Parses the request body JSON using `JsonUtils`.
    *   Creates a `User` model object from the JSON (template, `password_hash` is temporary).
    *   Calls `UserService::registerUser()` with the `User` object and raw password.
6.  **UserService**:
    *   Performs business-level validation (e.g., email format, password strength).
    *   Checks if username or email already exists by calling `UserDAO::findUserByUsername()` and `UserDAO::findUserByEmail()`. If found, throws `UserAlreadyExistsException`.
    *   Hashes the raw password using `BcryptWrapper::hashPassword()`.
    *   Updates the `User` object with the generated `id` and `password_hash`.
    *   Calls `UserDAO::createUser()` to persist the user in the database.
7.  **UserDAO**:
    *   Acquires a database connection from `DBManager` pool.
    *   Constructs and executes an `INSERT` SQL query using `libpqxx` with parameterized values.
    *   Commits the transaction.
    *   Returns the database connection to the pool.
    *   Returns the created `User` object (or `std::nullopt`) to `UserService`.
8.  **UserService**: Returns the `User` object to `AuthController`.
9.  **AuthController**:
    *   Generates a JWT token for the newly registered user using `JwtUtils::encode()`.
    *   Constructs a `201 Created` JSON response containing the user details and the JWT token.
10. **CrowCpp Response**: Sends the JSON response back to the client.
11. **LoggingMiddleware**: Logs the outgoing response details and request duration.
12. **Client**: Frontend receives the response, stores the JWT token, and redirects the user.

## 4. Scalability Considerations

*   **Stateless Services**: The C++ application is designed to be largely stateless, making it easy to scale horizontally by running multiple instances behind a load balancer.
*   **Database Scaling**: PostgreSQL can be scaled vertically (more powerful hardware) or horizontally (read replicas, sharding for extreme loads).
*   **Connection Pooling**: `DBManager` manages a pool of database connections, reducing overhead and improving throughput under load.
*   **Caching with Redis**: Redis (conceptualized) can offload database reads for frequently accessed data, improving response times and reducing database load.
*   **Message Queues**: For asynchronous tasks (e.g., sending emails, processing large reports), integrating a message queue (like RabbitMQ or Apache Kafka) would decouple components and improve responsiveness.
*   **Containerization**: Docker and Docker Compose facilitate easy deployment, scaling, and environment consistency.

## 5. Security Considerations

*   **HTTPS**: All API communication should be over HTTPS in production.
*   **JWT Security**: Strong, regularly rotated `JWT_SECRET` key. Short expiry times for tokens.
*   **Password Hashing**: `bcrypt` for secure storage of user passwords.
*   **Input Validation**: Extensive validation at both controller and service layers to prevent injection attacks and ensure data integrity.
*   **Parameterized Queries**: `libpqxx` handles this automatically, preventing SQL injection.
*   **Role-Based Access Control (RBAC)**: Fine-grained authorization checks in controllers and services.
*   **Rate Limiting**: Protects against brute-force attacks and denial-of-service attempts.
*   **Logging**: Detailed logging helps in detecting and troubleshooting security incidents.

## 6. Future Enhancements

*   **Microservices Refinement**: Break down the monolithic C++ API into smaller, independent microservices (e.g., dedicated user service, product catalog service, order processing service).
*   **Event-Driven Architecture**: Introduce event buses/brokers for asynchronous communication between services.
*   **Advanced Caching**: Implement more sophisticated caching strategies (e.g., cache invalidation mechanisms, distributed caching with Redis Cluster).
*   **Observability**: Integrate with Prometheus for metrics collection, Grafana for dashboards, and Elastic Stack for centralized log management.
*   **GraphQL API**: Offer a GraphQL interface for more flexible data fetching.
*   **Background Jobs**: Integrate a task queue system (e.g., Celery in Python, or a C++ equivalent) for long-running or periodic tasks.