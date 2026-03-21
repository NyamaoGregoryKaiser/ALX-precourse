```markdown
# Payment Processing System - Architecture Documentation

This document describes the high-level and detailed architecture of the Payment Processing System.

## Table of Contents

1.  [High-Level Overview](#1-high-level-overview)
    *   [Component Diagram](#component-diagram)
    *   [Technology Stack](#technology-stack)
2.  [Detailed Component Breakdown](#2-detailed-component-breakdown)
    *   [API Gateway (Crow C++ App)](#api-gateway-crow-c-app)
    *   [Middleware Layer](#middleware-layer)
    *   [Controllers Layer](#controllers-layer)
    *   [Services/Business Logic Layer](#servicesbusiness-logic-layer)
    *   [Models (Data Structures)](#models-data-structures)
    *   [Database Layer](#database-layer)
    *   [Utilities](#utilities)
3.  [Data Flow](#3-data-flow)
    *   [Example: User Registration Flow](#example-user-registration-flow)
    *   [Example: Payment Processing Flow](#example-payment-processing-flow)
4.  [Design Principles](#4-design-principles)
5.  [Scalability and Reliability](#5-scalability-and-reliability)
6.  [Security Considerations](#6-security-considerations)
7.  [Future Enhancements](#7-future-enhancements)

---

### 1. High-Level Overview

The Payment Processing System is built as a modular, API-driven backend. It follows a layered architectural pattern to ensure separation of concerns, maintainability, and testability.

#### Component Diagram

```
+---------------+           +-----------------+
|   Client      | <-------> |   API Gateway   |
| (Web/Mobile)  |           | (Crow C++ App)  |
+---------------+           +--------+--------+
                                     |
+-----------------+                  |
|   Database      |                  | (1) Middleware: Auth, Logging, Error Handling
| (SQLite/PostgreSQL) | <------------+
+-----------------+                  | (2) Controllers: Request Handling, DTO Mapping
                                     |
                          +----------v----------+
                          | Business Logic      |
                          | Services            | (3) Services: Core Domain Logic
                          | (Auth, Account, Txn)  |
                          +----------^----------+
                                     |
                                     | (4) Models/DTOs: Data Structures
                                     | (5) Utilities: Hashing, JWT
                          +----------+----------+
                          |   Database Manager  | (6) Database Layer: CRUD Operations
                          +---------------------+
```

#### Technology Stack

*   **Backend Framework:** Crow C++ Microframework
*   **Language:** C++17
*   **Database:** SQLite3 (for simplicity, easily swappable with PostgreSQL/MySQL)
*   **Database ORM/Wrapper:** `sqlite3pp`
*   **JSON Handling:** `nlohmann/json`
*   **Logging:** `spdlog`
*   **Build System:** `CMake`
*   **Containerization:** `Docker`, `docker-compose`
*   **Testing:** `Google Test` (Unit), `curl`/`pytest` (Integration/API)
*   **CI/CD:** `GitHub Actions`

### 2. Detailed Component Breakdown

#### API Gateway (Crow C++ App)

*   **Role:** The main entry point for all HTTP requests. It's responsible for routing requests to the appropriate controllers.
*   **Framework:** `Crow` provides a lightweight, fast, and asynchronous web server.
*   **Features:** Request parsing, response serialization (JSON), basic HTTP server functionalities.

#### Middleware Layer

*   **Role:** Intercepts requests before they reach the controllers and responses before they are sent back. Handles cross-cutting concerns.
*   **Components:**
    *   `AuthMiddleware`: Verifies JWT tokens, extracts user identity and role, and populates `AuthContext` for subsequent layers. Returns 401 Unauthorized if token is missing or invalid.
    *   `ErrorHandlerMiddleware`: Catches exceptions thrown by controllers or services and transforms them into standardized HTTP error responses (e.g., 400 Bad Request, 404 Not Found, 500 Internal Server Error).
    *   `LoggerMiddleware` (Conceptual, integrated into `ErrorHandler` and core logic): Logs incoming requests, processing steps, and outgoing responses.
    *   `RateLimitingMiddleware` (Future): Prevents abuse by limiting the number of requests a client can make within a certain timeframe.
    *   `CachingMiddleware` (Future): Caches responses for frequently accessed read-only data.

#### Controllers Layer

*   **Role:** Handles incoming HTTP requests, parses request bodies, validates input (basic level), calls appropriate services, and formats responses.
*   **Structure:** Each controller (`AuthController`, `AccountController`, `TransactionController`) corresponds to a major resource or domain.
*   **Responsibility:** Translates HTTP requests into service calls and service results into HTTP responses. Does **not** contain complex business logic.

#### Services/Business Logic Layer

*   **Role:** Contains the core business logic and domain rules of the application. These services encapsulate all operations related to a specific domain.
*   **Components:**
    *   `AuthService`: Manages user registration, login, password hashing, and JWT token generation/validation.
    *   `AccountService`: Manages merchant accounts, including creation, retrieval, updates, and balance adjustments.
    *   `TransactionService`: Handles the complex logic of processing payments, refunds, deposits, withdrawals, and updating their statuses. Interacts with `AccountService` for balance changes.
*   **Characteristics:** High cohesion, low coupling. Services depend on the `DatabaseManager` and other services (via dependency injection) but are independent of HTTP concerns.

#### Models (Data Structures)

*   **Role:** Defines the structure of data entities (`User`, `Account`, `Transaction`) that represent domain objects. Also includes Data Transfer Objects (DTOs) for request and response payloads.
*   **Location:** `src/models/`
*   **Features:** JSON serialization/deserialization helpers using `nlohmann/json`.

#### Database Layer

*   **Role:** Provides an abstraction layer over the raw database. Handles all CRUD (Create, Read, Update, Delete) operations.
*   **Component:** `DatabaseManager`
*   **Features:**
    *   Manages SQLite database connection.
    *   Ensures table schema existence (`createTables`).
    *   Uses prepared statements (`sqlite3pp`) for security and performance.
    *   Handles transactions for atomic operations.
    *   Includes basic query optimization (indexes).

#### Utilities

*   **Role:** Contains helper functions and classes that are reusable across different layers.
*   **Components:**
    *   `Hasher`: Handles password hashing (conceptual `bcrypt`/`Argon2` integration).
    *   `JwtManager`: Manages JWT token generation, signing, and verification.
    *   `Logger`: Singleton wrapper for `spdlog` for structured logging.
    *   `AppConfig`: Singleton for loading and accessing application configuration.

### 3. Data Flow

#### Example: User Registration Flow

1.  **Client** sends `POST /api/v1/auth/register` with `username`, `password`, `email`, `role`.
2.  **API Gateway** routes the request to `AuthController::registerUser`.
3.  `AuthController` parses the JSON body into `RegisterUserRequestDTO`.
4.  `AuthController` calls `AuthService::registerUser` with the DTO data.
5.  `AuthService`:
    *   Performs business validations (e.g., username/email uniqueness, password strength).
    *   Calls `Hasher::hashPassword` to hash the password.
    *   Creates a `User` model.
    *   Calls `DatabaseManager::createUser` to persist the user.
    *   Retrieves the full `User` object (with generated ID and timestamps) from `DatabaseManager`.
6.  `AuthService` returns the `User` model to `AuthController`.
7.  `AuthController` serializes the `User` model into a JSON response (excluding `passwordHash`).
8.  **API Gateway** sends a `201 Created` response with the user data back to the Client.

#### Example: Payment Processing Flow

1.  **Client** sends `POST /api/v1/transactions` with `accountId`, `externalId`, `type`, `amount`, `currency`, `description`.
2.  **AuthMiddleware** intercepts the request, verifies the JWT token, and attaches `AuthContext` (userId, userRole). If invalid, returns 401.
3.  **API Gateway** routes the request to `TransactionController::processTransaction`.
4.  `TransactionController`:
    *   Checks `AuthContext` for required permissions (e.g., `MERCHANT` or `ADMIN` role).
    *   Parses JSON body into `ProcessTransactionRequestDTO`.
    *   Calls `AccountService::getAccountById` to verify account ownership (Authorization).
    *   Calls `TransactionService::processTransaction`.
5.  `TransactionService`:
    *   Validates transaction details (amount, currency).
    *   Retrieves `Account` details from `DatabaseManager`.
    *   Performs business rules (e.g., account status, currency matching, sufficient funds if debit).
    *   Calls `AccountService::updateAccountBalance` to adjust the balance.
    *   Creates a `Transaction` model with `PENDING` or `COMPLETED` status.
    *   Calls `DatabaseManager::createTransaction` to record the transaction.
    *   Retrieves the full `Transaction` object.
6.  `TransactionService` returns the `Transaction` model to `TransactionController`.
7.  `TransactionController` serializes the `Transaction` model into a JSON response.
8.  **API Gateway** sends a `201 Created` response with the transaction data back to the Client.

### 4. Design Principles

*   **Separation of Concerns:** Each component (Model, DB, Service, Controller, Middleware) has a distinct responsibility.
*   **Modularity:** Code is organized into logical units, making it easier to understand, maintain, and extend.
*   **Loose Coupling:** Components interact through well-defined interfaces (e.g., services use `DatabaseManager` interface, not direct SQL). Dependency Injection is used to achieve this.
*   **Testability:** Clear separation allows for easier unit testing of individual components.
*   **Robust Error Handling:** Centralized error handling via middleware ensures consistent API responses for various error conditions.
*   **Logging:** Comprehensive logging aids in debugging and operational monitoring.
*   **Security by Design:** Authentication, authorization, and secure coding practices are considered from the outset.

### 5. Scalability and Reliability

*   **Stateless API:** JWT tokens enable a stateless API, allowing any server instance to handle any request, facilitating horizontal scaling.
*   **Multithreaded Server:** Crow is configured for multithreading to handle concurrent requests efficiently.
*   **Database Choice:** While SQLite is used for simplicity, the `DatabaseManager` abstraction allows for easy migration to a more scalable RDBMS like PostgreSQL or MySQL, which can be deployed as highly available clusters.
*   **Containerization:** Docker facilitates easy deployment, scaling, and environment consistency across development, testing, and production.
*   **Load Balancing:** In a multi-instance deployment, a load balancer would distribute traffic across multiple C++ application instances.

### 6. Security Considerations

*   **Authentication:** JWT for API authentication.
*   **Authorization:** Role-based access control (RBAC) enforced in controllers and services.
*   **Password Security:** Hashing passwords (never store plain text). Use strong, salted, adaptive hashing algorithms (e.g., Argon2, bcrypt).
*   **Input Validation:** Sanitize and validate all user inputs to prevent injection attacks (SQL, XSS, etc.).
*   **Secure Communication:** Use HTTPS in production.
*   **Secrets Management:** Store sensitive information (like JWT secret, database credentials) securely using environment variables or dedicated secret management systems (e.g., Docker Secrets, Kubernetes Secrets, HashiCorp Vault).
*   **Logging:** Avoid logging sensitive information (passwords, full tokens, PII).

### 7. Future Enhancements

*   **Real Payment Gateway Integration:** Integrate with actual payment providers (Stripe, PayPal, etc.) using their SDKs/APIs.
*   **Webhook Handling:** Implement endpoints to receive webhooks from payment gateways for asynchronous transaction status updates.
*   **Caching Layer:** Integrate `Redis` for caching frequently accessed data (e.g., user sessions, account details) to reduce database load.
*   **Rate Limiting:** Implement a robust rate-limiting middleware using `Redis` to protect against DoS attacks and abuse.
*   **Advanced Monitoring:** Integrate with Prometheus/Grafana for metric collection and visualization.
*   **Audit Logging:** More detailed, immutable logs of all critical actions and data changes.
*   **Internationalization (i18n):** Support for multiple languages and currencies with proper handling.
*   **Advanced Analytics/Reporting:** Generate reports on transactions, revenue, etc.
*   **GraphQL API:** Provide a more flexible API interface.
*   **Asynchronous Processing:** Use message queues (RabbitMQ, Kafka) for background tasks like fraud detection, notifications, or complex reconciliation.
*   **Microservices Architecture:** Break down the monolith into smaller, independent services for user management, account management, transaction processing, etc., for ultimate scalability.
```