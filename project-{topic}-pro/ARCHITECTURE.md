```markdown
# Payment Processing System Architecture

This document outlines the high-level architecture of the Payment Processing System.

## 1. System Overview

The Payment Processing System is a backend-focused application designed to handle financial transactions, user accounts, and authentication. It provides a RESTful API for external clients (e.g., web frontends, mobile apps, merchant systems) to interact with its core functionalities.

The architecture emphasizes modularity, separation of concerns, and scalability, using a layered approach.

## 2. Architectural Diagram

```mermaid
graph TD
    A[Clients: Web / Mobile / Merchants] --> B(API Gateway / Load Balancer)
    B --> C1(Payment Processor API Server - Instance 1)
    B --> C2(Payment Processor API Server - Instance 2)
    C1 <--> D[Redis Cache / Rate Limiter]
    C2 <--> D
    C1 --> E(PostgreSQL Database)
    C2 --> E
    E -- (asynchronous) --> F(Transaction Log / Audit Service)
    C1 --> G(External Payment Gateway - e.g., Stripe, PayPal)
    C2 --> G
    C1 --> H(Monitoring / Alerting - Prometheus, Grafana)
    C2 --> H
    C1 --> I(Logging Service - ELK Stack)
    C2 --> I

    subgraph Payment Processor Core (C++)
        C1
        C2
    end
```

## 3. Core Components

### 3.1. REST API Server (Pistache C++)

*   **Technology**: C++17/20, [Pistache](https://github.com/oktal/pistache)
*   **Role**: The primary interface for clients. It exposes RESTful endpoints for all business operations (auth, account, transactions).
*   **Modules**:
    *   **HTTP Server**: Handles incoming HTTP requests and routes them to appropriate controllers.
    *   **Controllers**: Act as the entry point for API requests, parse input, call business services, and format responses.
    *   **Middleware**: Intercepts requests for cross-cutting concerns like authentication, authorization, logging, and error handling.

### 3.2. Business Logic Services

*   **Role**: Encapsulate the core business rules and orchestrate operations involving multiple data entities. They are independent of the API layer.
*   **Examples**:
    *   `AuthService`: Handles user registration, login, password hashing, and JWT generation.
    *   `AccountService`: Manages user accounts, balance updates, and account lifecycle.
    *   `TransactionService`: Orchestrates payment flows (initiation, processing, status updates, refunds), ensures atomicity of financial operations.
    *   `GatewayService`: Abstract layer for integrating with external payment gateways.

### 3.3. Data Access Layer (Repositories)

*   **Technology**: C++, [libpqxx](https://libpqxx.readthedocs.io/en/7.7/)
*   **Role**: Provides an abstraction over the database. Each service interacts with one or more repositories to perform CRUD operations on specific data entities.
*   **Examples**:
    *   `UserRepository`: Manages `User` persistence.
    *   `AccountRepository`: Manages `Account` persistence.
    *   `TransactionRepository`: Manages `Transaction` persistence.
*   **Design Principle**: Keeps SQL queries and database-specific logic isolated from business logic, promoting portability and testability.

### 3.4. Database (PostgreSQL)

*   **Technology**: [PostgreSQL](https://www.postgresql.org/)
*   **Role**: The primary relational data store for all application data (users, accounts, transactions, etc.). Chosen for its reliability, ACID compliance, and advanced features.
*   **Schema**: Designed for financial integrity, including proper indexing, foreign keys, and data types (e.g., `NUMERIC` for monetary values).
*   **Migrations**: Managed through SQL scripts to ensure schema evolution.

### 3.5. Utilities and Shared Components

*   **`Config`**: Handles loading application configuration from JSON files and environment variables.
*   **`Logger`**: Centralized logging utility using `spdlog` for structured and efficient logging.
*   **`CryptoUtils`**: Provides cryptographic operations like password hashing (e.g., Argon2/bcrypt), JWT token generation/validation, and UUID generation.
*   **`DatabaseManager`**: Manages PostgreSQL connections (e.g., connection string, basic connection pooling if implemented).
*   **`Exceptions`**: Custom exception hierarchy for structured error handling within the API and business logic.

## 4. Cross-Cutting Concerns

### 4.1. Authentication & Authorization

*   **Mechanism**: JWT (JSON Web Tokens).
*   **Flow**:
    1.  User logs in via `/auth/login`, receives a signed JWT.
    2.  The JWT is included in the `Authorization: Bearer <token>` header for subsequent requests.
    3.  `AuthMiddleware` verifies the token's signature and expiration.
    4.  Controllers then extract user roles/permissions from the token payload to perform fine-grained authorization checks.

### 4.2. Logging and Monitoring

*   **Logging**: `spdlog` is used for application logging. Logs are directed to `stdout` and a file, configurable via `config.json`. Critical errors trigger alerts.
*   **Monitoring**: (Conceptual) Integration with tools like Prometheus for metrics collection (e.g., request latency, error rates) and Grafana for visualization.

### 4.3. Error Handling

*   **Mechanism**: Custom C++ exception hierarchy (`ApiException`, `BadRequestException`, etc.).
*   **Flow**: Exceptions are thrown by services/repositories, caught by controllers or global error handlers in the `HttpServer`, and translated into appropriate HTTP status codes and JSON error messages for the client.

### 4.4. Caching (Conceptual)

*   **Technology**: [Redis](https://redis.io/) (conceptual, not fully implemented in provided code).
*   **Role**: To improve performance for frequently accessed but slowly changing data (e.g., user profiles, account details) or for session management.
*   **Implementation**: Can be integrated via a Redis client library.

### 4.5. Rate Limiting (Conceptual)

*   **Technology**: Redis or in-memory counters (conceptual).
*   **Role**: To prevent abuse and ensure fair usage of the API by limiting the number of requests a client can make within a certain timeframe.
*   **Implementation**: A middleware component would track request counts per IP or authenticated user.

## 5. Deployment Considerations

*   **Containerization**: Docker for consistent build and runtime environments.
*   **Orchestration**: Docker Compose for local development, Kubernetes for production deployments.
*   **Scalability**: Stateless API servers allow horizontal scaling. PostgreSQL can be scaled vertically or with replication. Redis provides high performance for caching/rate limiting.
*   **Security**: HTTPS, strong JWT secrets, secure password hashing, least privilege database access.
*   **CI/CD**: GitHub Actions for automated testing and deployment to staging/production environments.

## 6. Data Flow Example: Processing a Payment

1.  **Client Request**: A client sends a `POST /transactions/process` request with `sourceAccountId`, `destinationAccountId`, `amount`, etc., along with a JWT in the `Authorization` header.
2.  **HTTP Server / Middleware**: The Pistache server receives the request.
    *   `LogRequest` middleware logs the incoming request.
    *   `AuthMiddleware` verifies the JWT. If invalid/missing, `401/403` is returned. If valid, user details are extracted (e.g., user ID, role).
3.  **TransactionController**: Parses the request body into a transaction request DTO. It checks basic input validity and calls `TransactionService::processPayment`.
4.  **TransactionService**:
    *   Retrieves `sourceAccount` and `destinationAccount` from `AccountRepository`.
    *   Performs business validations (e.g., sufficient funds in source, accounts are active, currency matching, user authorization to use source account).
    *   Initiates a database transaction (ACID property).
    *   Updates `sourceAccount` balance (debit).
    *   Updates `destinationAccount` balance (credit).
    *   Creates a new `Transaction` record in `TransactionRepository` with `status='pending'`.
    *   (Optional) Interacts with `GatewayService` to simulate or call an external payment gateway.
    *   Updates `Transaction` status to `processed` or `failed` based on internal logic/gateway response.
    *   Commits or rolls back the database transaction.
5.  **Repository Layer**: `AccountRepository` and `TransactionRepository` execute SQL queries via `libpqxx` to update/insert data in PostgreSQL.
6.  **Response**: `TransactionController` formats the processed transaction details into a JSON response and returns `200 OK` to the client. If any step fails, an `ApiException` is thrown and handled by the server's error middleware, returning an appropriate error code.
```