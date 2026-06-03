```markdown
# Architecture Documentation: Payment Processing System

This document outlines the high-level architecture of the Payment Processing System.

## 1. System Overview

The Payment Processing System is designed as a modular, layered application primarily using a Node.js/Express backend, a PostgreSQL database, and a Redis caching layer. It aims to provide a robust, scalable, and secure platform for managing users, merchants, payment methods, and transactions, integrating with external payment gateways.

## 2. Core Principles

*   **Modularity**: Clear separation of concerns (controllers, services, models, middleware).
*   **Scalability**: Stateless backend services, horizontal scaling potential for web and worker processes.
*   **Security**: Authentication, authorization, input validation, encryption, secure configuration.
*   **Reliability**: Robust error handling, logging, eventual consistency for asynchronous processes (webhooks).
*   **Observability**: Comprehensive logging and monitoring hooks.
*   **Testability**: Designed for easy unit, integration, and API testing.

## 3. High-Level Diagram

```mermaid
graph TD
    A[Clients: Web App, Mobile App] -->|HTTP/S| B(Load Balancer / API Gateway)
    B --> C1(Backend Service 1: Node.js/Express)
    B --> C2(Backend Service 2: Node.js/Express)
    B --> C3(...)

    C1 --> D(Database: PostgreSQL)
    C1 --> E(Caching / Rate Limiting: Redis)
    C1 --> F(External Payment Gateway - Mocked)
    C1 --> G(Webhook Dispatcher - Async)

    D --> H(Database Replicas / Read-Only)
    E --> I(Redis Sentinel / Cluster)

    F --> C1(Backend Service)
    F -- Callback/Webhook --> C1

    G --> J(Merchant Webhook Endpoints)

    SubGraph Operational Tools
        K[Monitoring & Alerting: Prometheus/Grafana]
        L[Logging Aggregation: ELK Stack / Loki]
        M[CI/CD Pipeline: GitHub Actions]
    End

    C1 --- K
    C2 --- K
    C3 --- K
    C1 --- L
    C2 --- L
    C3 --- L
    M --> C1
    M --> C2
```

## 4. Layered Architecture (Backend)

The backend is structured into distinct layers to promote maintainability and separation of concerns:

### 4.1. Entry Point (`server.js`)
*   Initializes the Express application (`app.js`).
*   Configures global error handling for `uncaughtException` and `unhandledRejection`.
*   Starts the HTTP server.

### 4.2. Application Setup (`app.js`)
*   Configures global Express middlewares:
    *   **Security**: `helmet`, `cors`, `hpp`.
    *   **Logging**: `morgan` (dev), `winston` (application-wide).
    *   **Parsing**: `express.json`, `express.urlencoded`, `cookie-parser`.
    *   **Compression**: `compression`.
    *   **Rate Limiting**: `express-rate-limit`.
*   Mounts API routes (`/api/v1/*`).
*   Registers a global error handling middleware (`errorHandler.js`).

### 4.3. Middleware
*   **`auth.js`**: Handles JWT verification and role-based access control (`protect`, `restrictTo`).
*   **`errorHandler.js`**: Centralized error handling. Catches `AppError` (operational errors) and provides meaningful responses; logs and hides details of programming errors.
*   **`rateLimiter.js`**: Applies request rate limits using Redis.
*   **`cache.js`**: Caching layer using Redis to cache API responses for better performance.

### 4.4. Routes
*   Define API endpoints and link them to controller methods.
*   Apply middleware like authentication, authorization, validation, and caching.
*   Examples: `authRoutes.js`, `userRoutes.js`, `merchantRoutes.js`, `transactionRoutes.js`.

### 4.5. Controllers
*   Receive requests from routes.
*   Perform input validation (using Joi).
*   Delegate business logic to services.
*   Construct HTTP responses.
*   Focus on request/response handling, minimal business logic.

### 4.6. Services (Business Logic Layer)
*   Contain the core business logic of the application.
*   Interact with the database (via Knex.js), external APIs (payment gateways), and other services (e.g., `cacheService`, `webhookService`).
*   Responsible for complex operations like transaction processing, user registration, data consistency.
*   Ensure atomicity for critical operations using database transactions.
*   Examples: `authService.js`, `transactionService.js`, `paymentGatewayService.js`, `webhookService.js`, `cacheService.js`.

### 4.7. Utilities (`utils/`)
*   **`logger.js`**: Winston-based logging setup.
*   **`appError.js`**: Custom error class for distinguishing operational errors.
*   **`jwt.js`**: Helper for JWT token generation and verification.
*   **`crypt.js`**: Functions for password hashing (bcrypt) and sensitive data encryption (e.g., mock card details).
*   **`validator.js`**: Joi schemas and validation middleware.
*   **`catchAsync.js`**: Wrapper for async Express route handlers to catch errors and pass them to the global error middleware.

## 5. Data Stores

*   **PostgreSQL**:
    *   Primary relational database.
    *   Stores users, merchants, payment methods (tokens/encrypted metadata), transactions, webhook logs, etc.
    *   Managed with `Knex.js` for migrations, schema definition, and query building.
*   **Redis**:
    *   In-memory data store.
    *   Used for:
        *   API rate limiting (stores request counts).
        *   Caching frequently accessed data (e.g., user profiles, lists of transactions).
        *   Potentially session management.

## 6. External Integrations

*   **Payment Gateway (Mocked)**:
    *   Simulates a third-party payment processor (e.g., Stripe, PayPal).
    *   Handles `charge` and `refund` operations.
    *   Communicates via HTTP/S API calls.
*   **Webhook Destinations**:
    *   Merchant-defined URLs where the system sends event notifications (e.g., `charge.succeeded`, `charge.failed`).
    *   Asynchronous "fire-and-forget" mechanism in this blueprint, but in production would involve a robust queue and retry system.

## 7. Security Considerations

*   **Authentication**: JWT for stateless, scalable authentication.
*   **Authorization**: Role-based access control (RBAC) enforced in middleware and controllers.
*   **Data Protection**:
    *   Passwords hashed with `bcrypt.js`.
    *   Sensitive non-PCI data (e.g., names on cards if stored) encrypted using symmetric encryption (`crypto`).
    *   **PCI Compliance**: *Crucially, direct storage of raw credit card numbers, expiry dates, and CVVs on your server is **NOT PCI DSS compliant**.* A production system would use client-side tokenization (card data goes directly from browser to payment gateway, gateway returns a token to your backend). The blueprint *simulates* local encryption for other sensitive PII and the *concept* of tokenization.
*   **API Security**: Rate limiting, Helmet (HTTP headers), CORS, HPP (parameter pollution protection).
*   **Input Validation**: Joi schemas validate all incoming request bodies and query parameters.

## 8. Development & Operations (DevOps)

*   **Containerization**: Docker and Docker Compose simplify local development setup and provide consistent environments for staging/production.
*   **CI/CD**: GitHub Actions (conceptual) for automated testing, building, and deployment.
*   **Logging**: Centralized, structured logging with Winston for debugging and auditing.
*   **Monitoring**: Integration points for Prometheus/Grafana (conceptual) to collect metrics and alert on issues.

## 9. Data Flow Example: Credit Card Charge

1.  **Client (Frontend)**: User submits payment form with card details.
    *   *Real-World PCI*: Client-side SDK (e.g., Stripe.js) sends card data directly to Stripe, receives a payment token.
    *   *This Blueprint*: Client sends raw card details (for mock gateway) to backend.
2.  **Backend (API `/transactions` POST)**:
    *   `auth` middleware authenticates user.
    *   `validator` middleware validates request body (amount, currency, card details).
    *   `transactionController` receives request.
    *   `transactionService.createTransaction` is called:
        *   Validates merchant existence.
        *   Initiates a database transaction.
        *   Creates a `pending` transaction record in `transactions` table.
        *   Calls `paymentGatewayService.processPayment` (which calls mock external gateway).
        *   Upon gateway response:
            *   Updates transaction status (`completed` or `failed`) in `transactions` table.
            *   Stores `gateway_transaction_id` and full `gateway_response`.
            *   Commits/Rollbacks database transaction.
        *   Dispatches an asynchronous webhook (via `webhookService`) to the merchant's `webhook_url` about the transaction outcome.
    *   `transactionController` sends a 201 Created response to the client.
3.  **Merchant Webhook Endpoint**: Receives the webhook, updates its own records.
```