# Payment Processing System Architecture

This document outlines the high-level architecture and key design principles of the Payment Processing System.

## 1. High-Level Overview

The system follows a **monolithic backend with a clear modular structure**, designed to be progressively decoupled into microservices if needed for extreme scale. It interacts with external payment gateways for actual fund processing.

```mermaid
graph TD
    A[User Frontend/Mobile App] -->|HTTPS| B(Load Balancer / API Gateway)
    B --> C(Backend API - Node.js/Express)
    C --> D(PostgreSQL Database)
    C --> E(Redis Cache / Rate Limiting)
    C --> F[External Payment Gateways]
    F --> C (Webhooks / Callback)
    C --> G[Logging & Monitoring]
```

## 2. Architectural Layers

The backend is structured into distinct layers to promote separation of concerns, testability, and maintainability.

*   **API Gateway / Load Balancer:**
    *   Entry point for all external requests.
    *   Handles SSL termination, routing, basic request validation, and potentially advanced rate limiting/DDOS protection.
    *   Examples: Nginx, AWS ALB, Cloudflare.

*   **Backend API (Node.js/Express):**
    *   The core application logic written in Node.js with Express.js.
    *   **Controllers:** Handle incoming HTTP requests, validate input, and delegate to services. They are thin and primarily focus on request/response.
    *   **Services:** Contain the core business logic. They orchestrate interactions between models, external APIs, and other services. They are pure functions (or classes with methods) that encapsulate operations.
    *   **Models:** Represent database entities using Objection.js/Knex. They define schema, relationships, and sometimes domain-specific methods (e.g., `validatePassword` on `User`).
    *   **Middleware:** Functions that run before/after controller logic (e.g., authentication, authorization, error handling, rate limiting, caching).
    *   **Utilities:** Helper functions (e.g., logger, database connection, JWT handling, Redis client).
    *   **API Clients:** Abstraction layers for integrating with external services like payment gateways.

*   **Database (PostgreSQL):**
    *   Relational database chosen for its reliability, ACID compliance, data integrity, and support for complex queries/transactions.
    *   **Schema:** Defined using Knex.js migrations, including `users`, `accounts`, `transactions`, `payment_methods` tables.
    *   **Transactions:** Extensive use of database transactions (both explicit and Objection.js implicit transactions) to ensure atomicity and consistency of financial operations.
    *   **Indexing:** Strategically applied to frequently queried columns to optimize read performance.
    *   **Pessimistic Locking:** Employed during critical balance updates (`forUpdate()`) to prevent race conditions in concurrent transactions.

*   **Caching & Rate Limiting (Redis):**
    *   **Redis:** In-memory data store used for:
        *   **Caching API responses:** Reduces load on the database for frequently accessed read-heavy endpoints.
        *   **Rate limiting:** Tracks request counts per IP to prevent abuse and brute-force attacks.
        *   **Session management:** (Not explicitly implemented in this blueprint but a common use case).
        *   **Idempotency keys:** (Could be used to ensure transactions are processed only once even if requested multiple times).

*   **External Payment Gateways:**
    *   Integrates with third-party payment providers (e.g., Stripe, Paystack, Flutterwave) to process actual debit/credit card charges and bank transfers.
    *   Communication involves API calls and receiving webhooks for asynchronous status updates.
    *   An abstraction layer (`PaymentGatewayService`) is used to decouple the core application logic from specific gateway implementations.

*   **Logging & Monitoring:**
    *   **Winston:** Structured logging framework for capturing application events, errors, and warnings.
    *   **Monitoring:** Integration with tools like Prometheus/Grafana (for metrics) or an ELK stack (for log aggregation/analysis) would be crucial in production.

## 3. Data Flow (Example: Initiating a Debit Transaction)

1.  **User Request:** Frontend sends a `POST /api/transactions/initiate` request with `accountId`, `amount`, `currency`, `type='debit'`, and `paymentMethodId` (e.g., a token generated client-side by a payment gateway SDK).
2.  **API Gateway:** Receives the request, performs basic checks, and forwards to the Backend API.
3.  **Authentication Middleware:** `auth()` middleware verifies the JWT in the `Authorization` header, authenticates the user, and attaches `req.user`.
4.  **Rate Limiting Middleware:** `globalRateLimiter` checks if the user's IP has exceeded the allowed request rate.
5.  **Transaction Controller:** `transactionController.initiateTransaction` receives the request.
    *   Validates input using Joi.
    *   Calls `TransactionService.initiateTransaction`.
6.  **Transaction Service:**
    *   Starts a database transaction (`knex.transaction`).
    *   Fetches the `Account` and `User` from the database, applying a **pessimistic lock (`forUpdate()`)** on the `Account` row to prevent race conditions during balance modification.
    *   Performs business logic checks (sufficient funds, account status, currency match).
    *   If `paymentMethodId` is provided (external debit):
        *   Calls `PaymentGatewayService.initiatePayment` to communicate with the external payment gateway (e.g., Stripe, Paystack).
        *   If the gateway responds with success, proceeds. If failure, rolls back.
    *   Updates the `Account` balance in the database.
    *   Creates a `Transaction` record in the database with `status: 'completed'` (or `pending` if async).
    *   Commits the database transaction.
    *   Invalidates relevant Redis cache entries (`clearCache`).
7.  **Controller Response:** Returns a `201 Created` response with the new `Transaction` object.
8.  **Logging:** `logger` records the transaction details and any errors throughout the process.

## 4. Key Design Principles

*   **Separation of Concerns:** Clear distinction between controllers, services, and models.
*   **Modularity:** Code is organized into logical modules, making it easier to understand, maintain, and test.
*   **Testability:** Services and utilities are designed to be easily unit-tested. Integration tests cover interactions between layers.
*   **Scalability:**
    *   Stateless backend (facilitates horizontal scaling).
    *   Database connection pooling.
    *   Caching with Redis.
    *   Asynchronous processing (e.g., webhooks) for external integrations.
    *   Docker/Containerization for easy deployment and scaling.
*   **Security:**
    *   JWT-based authentication and role-based authorization.
    *   Password hashing (bcrypt).
    *   Input validation (Joi).
    *   Protection against common web vulnerabilities (Helmet middleware).
    *   Rate limiting.
    *   Database transaction isolation.
*   **Observability:** Robust logging, error handling, and potential for metrics monitoring.
*   **Idempotency:** Designing API endpoints (especially for `initiatePayment`) to be idempotent is crucial to prevent duplicate processing on retries. (Not fully detailed in blueprint but vital in production).
*   **Fault Tolerance:** Centralized error handling, graceful shutdown, and retry mechanisms for external API calls (e.g., with circuit breakers) if extended.

## 5. Future Considerations / Evolution to Microservices

While starting as a modular monolith, the design allows for future evolution:

*   **User Service:** Decouple authentication and user management into a dedicated service.
*   **Account Service:** Separate account creation, retrieval, and balance management.
*   **Transaction Service:** Handle all transaction-related logic, possibly with event-driven communication (Kafka/RabbitMQ) for inter-service communication.
*   **Payment Gateway Service:** A standalone service that encapsulates all integrations with various payment providers.
*   **Webhook Service:** A dedicated, robust service for receiving and processing webhooks, potentially using a message queue for reliable delivery.

This initial architecture provides a solid, production-ready foundation that can be scaled and evolved as business needs grow.