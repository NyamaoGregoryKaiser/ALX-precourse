```markdown
# ALX Payment Processor - Architecture Documentation

This document provides a detailed overview of the architectural design of the ALX Payment Processor system.

## 1. System Goals and Principles

**Goals:**
*   **Reliability:** Ensure transactions are processed accurately and consistently.
*   **Security:** Protect sensitive financial and personal data.
*   **Scalability:** Ability to handle increasing loads and data volumes.
*   **Maintainability:** Clear code structure, modularity, and good documentation.
*   **Observability:** Easy to monitor, log, and debug.
*   **Extensibility:** Simple to add new payment methods, features, or integrations.

**Principles:**
*   **Separation of Concerns:** Each component/module has a single responsibility.
*   **Layered Architecture:** Clear division between presentation, business logic, data access.
*   **Loose Coupling:** Components should have minimal dependencies on each other.
*   **Idempotency:** Operations can be safely retried without unintended side effects (especially critical for payments).
*   **Security by Design:** Security considerations are integrated from the initial design phase.

## 2. High-Level Architecture

The system is designed as a **modular monolithic application** for the backend, supported by external services like PostgreSQL and Redis. While a full-scale production payment system might lean towards microservices, this approach offers simplicity in deployment and communication for this project, while still enforcing modularity.

```mermaid
graph TD
    subgraph Clients
        A[Web Frontend (React/Next.js)]
        B[Mobile App (Conceptual)]
        C[Third-Party Integrations (via Webhooks)]
    end

    subgraph Infrastructure
        LB(Load Balancer / API Gateway)
        DB(PostgreSQL Database)
        REDIS(Redis Cache & Rate Limiter)
        MQ(Message Queue - e.g., RabbitMQ, Kafka - Optional for async tasks)
    end

    subgraph Backend Application (Node.js/TypeScript - Modular Monolith)
        MW[Middlewares: Auth, Logging, Error Handling, Rate Limiting]
        API(API Routers: /auth, /users, /merchants, /transactions, ...)
        CONTROLLERS[Controllers: Handles HTTP requests, delegates to Services]
        SERVICES[Services: Business Logic, orchestrates Repositories & external calls]
        REPOSITORIES[Repositories: Data Access Layer, abstracts ORM]
        ENTITIES[Entities: TypeORM Models]
        EXTERNAL_GW(External Payment Gateway Service - Mock)
        LOGGER(Logging Service)
        CACHESERVICE(Caching Service)
    end

    A -- HTTP/S --> LB
    B -- HTTP/S --> LB
    C -- HTTP/S --> LB
    LB -- Route requests --> MW
    MW -- Authenticate/Process --> API
    API --> CONTROLLERS
    CONTROLLERS --> SERVICES
    SERVICES --> REPOSITORIES
    REPOSITORIES --> DB
    SERVICES --> EXTERNAL_GW
    SERVICES --> CACHESERVICE
    CACHESERVICE <--> REDIS
    MW --> LOGGER
    SERVICES --> LOGGER
    CONTROLLERS --> LOGGER
    EXTERNAL_GW --> LOGGER
    DB -- Stores Data --> ENTITIES
    DB -- Indexes --> ENTITIES
    MQ -- Pub/Sub --> SERVICES
    SERVICES -- Pub/Sub --> MQ
```

## 3. Backend Application (Node.js/TypeScript)

### 3.1. Layered Structure

The backend follows a strict layered architecture to ensure separation of concerns:

*   **`server.ts`:** Entry point, initializes database, Redis, and starts the Express app.
*   **`app.ts`:** Express application setup, global middlewares, and route registration.
*   **Middlewares (`src/middlewares/`):**
    *   `auth.middleware.ts`: Handles JWT verification and role-based authorization.
    *   `errorHandler.middleware.ts`: Centralized error handling for consistent responses.
    *   `logger.middleware.ts`: Request-level logging.
    *   `rateLimiter.middleware.ts`: Protects endpoints from abuse.
*   **Modules (`src/modules/`):** Each module represents a distinct business domain (e.g., `auth`, `users`, `merchants`, `transactions`).
    *   **Controller:** Handles incoming HTTP requests, validates input (using Joi), and delegates to the corresponding service. Returns HTTP responses.
    *   **Service:** Contains the core business logic. Orchestrates interactions between repositories, other services, and external APIs (like the payment gateway). Ensures transactional integrity.
    *   **Repository:** Abstraction layer for data access. Interacts directly with TypeORM entities to perform CRUD operations on the database. Hides ORM specifics from the service layer.
    *   **Routes:** Defines API endpoints and links them to controller methods, applying relevant middlewares (authentication, authorization, validation).
    *   **Validation:** Joi schemas for input validation.
*   **Services (`src/services/`):** Global, cross-cutting services.
    *   `paymentGateway.service.ts`: Mocks an external payment gateway for processing payments and refunds. In production, this would integrate with actual third-party APIs (Stripe, PayPal, etc.).
    *   `cache.service.ts`: Abstracts Redis interactions for caching.
    *   `logger.service.ts`: Centralized Winston logger.
*   **Configuration (`src/config/`):** Environment variables, constants.
*   **Utilities (`src/utils/`):** Helper functions, custom error classes (`AppError`), async wrappers (`catchAsync`).
*   **Types (`src/types/`):** Shared TypeScript type definitions.

### 3.2. Data Flow for a Transaction (e.g., `POST /api/v1/transactions`)

1.  **Client Request:** Frontend sends a `POST` request to `/api/v1/transactions` with transaction details.
2.  **Load Balancer/API Gateway:** Routes the request to an available backend instance.
3.  **Middlewares:**
    *   `rateLimiter`: Checks if the client's IP has exceeded the allowed request rate.
    *   `requestLogger`: Logs the incoming request.
    *   `authenticate`: Verifies the JWT token in the `Authorization` header. If valid, attaches `req.user` (containing user ID and role).
    *   `authorize`: Checks if `req.user.role` has permission to create a transaction.
4.  **`TransactionController.createTransaction`:**
    *   Receives the request.
    *   Validates `req.body` using `transaction.validation.ts` (Joi).
    *   Calls `TransactionService.createTransaction` with validated data and `initiatorUserId`.
5.  **`TransactionService.createTransaction`:**
    *   Begins a database transaction (`queryRunner.startTransaction()`).
    *   Verifies the `merchantId` exists via `MerchantRepository`.
    *   Creates a `PENDING` transaction record in the database via `TransactionRepository`.
    *   Calls `PaymentGatewayService.processPayment` to simulate interaction with an external payment provider.
    *   Based on the `PaymentGatewayService` result:
        *   If successful, updates the transaction status to `COMPLETED` and stores `externalTransactionId` via `TransactionRepository`.
        *   If failed, updates the transaction status to `FAILED` and stores `failureReason` via `TransactionRepository`.
    *   Commits (`queryRunner.commitTransaction()`) or rolls back (`queryRunner.rollbackTransaction()`) the database transaction.
    *   Returns the final transaction object.
6.  **`TransactionController`:** Sends a `201 Created` response with the transaction data.
7.  **Error Handling:** If any step encounters an error, the `errorHandler.middleware.ts` catches it, logs it, and sends a consistent error response to the client.

## 4. Database (PostgreSQL with TypeORM)

*   **Database:** PostgreSQL is chosen for its robustness, transactional support, and JSONB capabilities (for `metadata` columns).
*   **ORM:** TypeORM provides an object-relational mapping, allowing us to interact with the database using TypeScript classes and objects.
*   **Entities:** TypeScript classes decorated with `@Entity`, `@Column`, `@PrimaryGeneratedColumn`, `@OneToMany`, `@ManyToOne`, etc., define the database schema (e.g., `User`, `Merchant`, `Account`, `Transaction`).
*   **Migrations:** Database schema changes are managed through TypeORM migrations (`src/database/migrations/`). This ensures schema evolution is controlled and reproducible across environments.
*   **Repositories:** Custom repositories (e.g., `UserRepository`) encapsulate common data access logic, providing a cleaner interface for services and centralizing query definitions.
*   **Transactions:** `QueryRunner` is explicitly used within services for complex operations that require database-level transactions (e.g., `createTransaction`) to ensure atomicity.
*   **Indexing:** Crucial columns (foreign keys, frequently queried fields) are indexed to optimize read performance.

## 5. Caching (Redis)

*   **Purpose:** Redis is used as an in-memory data store for caching frequently accessed but less frequently updated data. This reduces direct database load and improves API response times.
*   **Implementation:** `cache.service.ts` provides a simple API (`set`, `get`, `delete`). Integration can occur within services to cache results of expensive database queries.
*   **Session Storage:** Redis can also be used for storing user sessions if a stateless JWT approach is complemented by server-side sessions.

## 6. Rate Limiting (Redis)

*   **Purpose:** Protects API endpoints from abuse, denial-of-service attacks, and brute-force attempts.
*   **Implementation:** `express-rate-limit` with a Redis store ensures distributed rate limiting across multiple backend instances. Different limits can be configured for sensitive endpoints (e.g., login).

## 7. Security Considerations

*   **Authentication:** JWT with secure secret management.
*   **Authorization:** Role-based access control, enforced by middleware.
*   **Password Hashing:** `bcryptjs` is used to securely hash passwords.
*   **Data Validation:** Joi schemas enforce input integrity and prevent common injection attacks.
*   **Security Headers:** `helmet` middleware sets various HTTP headers to enhance security (XSS protection, CSP, etc.).
*   **CORS:** Configured to allow requests from trusted origins.
*   **Environment Variables:** Sensitive information (database credentials, JWT secret) is stored in environment variables, not hardcoded.
*   **Transactions:** Database transactions maintain data consistency and integrity, crucial for financial operations.
*   **Input Sanitization:** While Joi validates, further sanitization (e.g., for user-generated content, though less critical in a pure payment API) might be needed.

## 8. Observability

*   **Logging:** `Winston` for structured application logs (errors, warnings, info). `Morgan` for HTTP access logs. Logs are directed to console (and can be configured to files/external services).
*   **Error Reporting:** Centralized `errorHandler` captures all errors, logs them, and provides meaningful responses without leaking sensitive details in production.
*   **Health Checks:** Basic `/` endpoint and Docker health checks ensure service availability.

## 9. Future Enhancements

*   **Microservices:** Decompose into smaller, independently deployable services (e.g., dedicated Auth Service, Transaction Service, Merchant Service).
*   **Asynchronous Processing:** Integrate a message queue (RabbitMQ, Kafka) for non-blocking operations (e.g., webhook notifications, complex fraud detection, bulk payouts).
*   **Real-time Updates:** WebSockets for real-time transaction status updates to dashboards.
*   **Webhook System:** Allow merchants to subscribe to events (e.g., `transaction.completed`) for real-time notifications.
*   **Advanced Fraud Detection:** Integrate with specialized fraud detection services.
*   **Compliance:** PCI DSS compliance for handling cardholder data (would involve not storing sensitive data directly and using tokenization via payment gateways).
*   **GraphQL API:** Provide a flexible API interface.
*   **Frontend Development:** Implement a fully functional React/Next.js dashboard and potentially a public-facing payment page.
```