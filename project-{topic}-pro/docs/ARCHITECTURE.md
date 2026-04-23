# ALXPay System Architecture

This document outlines the high-level architecture and component design of the ALXPay payment processing system.

## 1. High-Level Overview

ALXPay is designed as a layered, modular system with a focus on scalability, security, and maintainability. It follows a traditional client-server architecture, with a React-based frontend consuming a Node.js/Express RESTful API. Data persistence is handled by PostgreSQL, with Redis used for caching and rate limiting.

```mermaid
graph TD
    User --> Frontend(React Frontend)
    Merchant_Backend --> Frontend
    Frontend --> |HTTP/REST API| Nginx(Nginx Reverse Proxy)
    Nginx --> Backend(Node.js/Express Backend)
    Backend --> Postgres(PostgreSQL Database)
    Backend --> Redis(Redis Cache/Rate Limiter)
    Backend --> |(Optional) Async| Queue(Message Queue / Job Scheduler)
    Queue --> WebhookService(Webhook Service)
    WebhookService --> |HTTP/REST API| External_Merchant_Webhooks(External Merchant Webhooks)
    MockPaymentGateway(Mock Payment Gateway) --> |HTTP/REST API (Webhook)| Backend
```

**Key Principles:**

*   **API-First:** All functionality is exposed via a well-defined RESTful API.
*   **Layered Architecture:** Clear separation of concerns (presentation, business logic, data access).
*   **Modularity:** Features are grouped into distinct modules (Auth, Payments, Merchants, etc.).
*   **Security:** Authentication, authorization, input validation, and secure communication.
*   **Observability:** Comprehensive logging and potential for monitoring.
*   **Idempotency:** Payment operations designed to be safe when retried.

## 2. Component Breakdown

### 2.1 Frontend (React Application)

*   **Purpose:** Provides a user interface for users and merchants to interact with the ALXPay system. This includes registration, login, dashboard viewing, initiating payments, viewing transaction history, etc.
*   **Technology:** React, TypeScript, Axios for API calls, React Context for state management.
*   **Key Modules/Pages:**
    *   **Auth:** Login, Register
    *   **Dashboard:** Overview for users/merchants
    *   **Payments:** Initiate payment forms, payment history views
    *   **Settings:** User/Merchant profile management
*   **Interaction:** Communicates exclusively with the Backend API via HTTP requests.

### 2.2 Nginx Reverse Proxy (Optional but Recommended for Production)

*   **Purpose:** Sits in front of the backend and frontend applications.
    *   **Load Balancing:** Distributes requests if multiple instances of backend/frontend.
    *   **SSL Termination:** Handles HTTPS, offloading this from the applications.
    *   **Static File Serving:** Can serve frontend static assets.
    *   **API Gateway:** Routes requests to the correct backend service based on path (e.g., `/api/*` to backend, `/` to frontend).
*   **Technology:** Nginx
*   **Role in Docker Compose:** Can be configured to route traffic to `backend` and `frontend` containers.

### 2.3 Backend (Node.js/Express Application)

*   **Purpose:** The core business logic and API server for ALXPay.
*   **Technology:** Node.js, TypeScript, Express.js.
*   **Architecture Layers:**
    *   **`src/routes`:** Defines API endpoints and maps them to controller methods.
    *   **`src/controllers`:** Handles HTTP requests, validates input, calls appropriate services, and formats responses. Contains minimal business logic.
    *   **`src/services`:** Encapsulates core business logic. Interacts with repositories and external services (e.g., mock payment gateway). This is where transactions, payment processing, refunds, etc., are orchestrated.
    *   **`src/repositories`:** Provides an abstraction layer for database operations. Uses TypeORM for interacting with PostgreSQL.
    *   **`src/entities`:** TypeORM entity definitions, representing the database schema and domain models.
*   **Middleware:**
    *   **Authentication (`authMiddleware`):** Verifies JWT tokens and attaches user information to the request.
    *   **Authorization (`authMiddleware`):** Checks user roles and permissions for specific actions.
    *   **Error Handling (`errorHandler`):** Catches all errors and formats a consistent error response.
    *   **Rate Limiting (`rateLimitMiddleware`):** Protects endpoints from excessive requests.
    *   **Caching (`cacheMiddleware`):** Leverages Redis to cache API responses.
    *   **Logging (`morgan`, `winston`):** Logs incoming requests and application events.
*   **External Integrations (Mocked):**
    *   **Payment Gateway:** Simulated interaction for processing payments and refunds. In a real system, this would involve SDKs and secure API calls to providers like Stripe, Paystack, Flutterwave, etc.
    *   **Webhook Destination:** Simulates sending notifications to merchant-configured webhook URLs.

### 2.4 PostgreSQL Database

*   **Purpose:** Persistent storage for all application data (users, merchants, payments, transactions, accounts, webhook events).
*   **Technology:** PostgreSQL
*   **Key Features Used:**
    *   **Relational Model:** Ensures data integrity and consistency.
    *   **UUIDs:** Used as primary keys for distributed system compatibility.
    *   **`jsonb` fields:** For flexible metadata storage (e.g., `Payment.metadata`).
    *   **Transactions:** Ensures atomic operations for critical financial flows.
    *   **Indexes:** For query optimization (e.g., on `email`, `merchantId`).
*   **ORM:** TypeORM is used to interact with PostgreSQL, providing an object-relational mapping.

### 2.5 Redis Cache / Rate Limiter

*   **Purpose:**
    *   **Caching:** Stores frequently accessed API responses or data to reduce database load and improve response times.
    *   **Rate Limiting:** Tracks request counts per IP address to prevent abuse.
*   **Technology:** Redis
*   **Integration:**
    *   `cacheMiddleware` uses Redis to store/retrieve cached responses.
    *   `express-rate-limit` (internally or with `connect-redis`) uses Redis for distributed rate limiting.

### 2.6 Message Queue / Job Scheduler (Conceptual/Future Expansion)

*   **Purpose:** For asynchronous processing of tasks that don't need to block the main request-response cycle.
*   **Example Use Cases:**
    *   **Webhook Delivery:** Decoupling webhook sending from payment processing. A separate worker would pick up `WebhookEvent` records and attempt delivery.
    *   **Fraud Detection:** Asynchronously submitting transactions for fraud analysis.
    *   **Reporting:** Generating complex reports in the background.
*   **Technology (Potential):** Redis Queues (BullMQ), RabbitMQ, Kafka.
*   **Current Implementation:** Webhook delivery is triggered directly from the payment service but could be easily refactored into a separate background job.

## 3. Data Flow Example: Payment Processing

1.  **Frontend/Merchant Backend** sends a `POST /api/payments/initiate` request to the ALXPay Backend.
2.  **Backend Controller** receives the request, validates input, calls `PaymentService.initiatePayment`.
3.  **PaymentService** creates a `Payment` entity with `status: INITIATED` in PostgreSQL.
4.  **Backend** returns a `202 Accepted` response to the client.
5.  **(External/Mock Gateway Interaction):** The ALXPay system (or the merchant's system) would then typically redirect the customer to an external payment gateway or process the payment details securely.
6.  **External Payment Gateway** processes the payment. Upon completion (success or failure), it sends a webhook/callback to ALXPay's `POST /api/payments/process-webhook` endpoint.
7.  **Backend Controller** receives the webhook, calls `PaymentService.processPayment`.
8.  **PaymentService** starts a database transaction:
    *   Updates the `Payment` entity's status (e.g., to `SUCCESS` or `FAILED`).
    *   Creates a `Transaction` record.
    *   If `SUCCESS`, updates the `Merchant`'s balance.
    *   Creates a `WebhookEvent` record in PostgreSQL (e.g., `payment.success`).
    *   Commits the database transaction.
9.  **Backend** returns a `200 OK` to the external gateway.
10. **WebhookService (via Job Scheduler/Cron):** Periodically queries for `WebhookEvent` records with `status: PENDING`.
11. **WebhookService** attempts to `POST` the `payload` to the `webhookUrl` configured for the merchant.
12. **External Merchant Webhook** (on merchant's server) receives the notification and updates their internal order status.
13. **WebhookService** updates the `WebhookEvent` status to `SENT` or `FAILED` (with retry attempts) based on the merchant's webhook endpoint response.

## 4. Security Considerations

*   **Authentication:** JWT for session management, bcrypt for password hashing.
*   **Authorization:** Role-based access control (`authorize` middleware).
*   **Input Validation:** Handled within controllers and services.
*   **Secure Communications:** HTTPS (handled by Nginx in production).
*   **Sensitive Data Handling:**
    *   Password hashes stored, not plain text.
    *   API Secret Keys for merchants (conceptual, should be hashed/encrypted or stored in a secure vault in production).
    *   PCI DSS compliance is *not* fully implemented here (e.g., direct card processing). ALXPay offloads this to external payment gateways.
*   **Rate Limiting:** Prevents brute-force attacks and resource exhaustion.
*   **Error Handling:** Prevents leaking sensitive information in production error responses.

## 5. Scalability & Resilience

*   **Stateless Backend:** Facilitates horizontal scaling of the backend services.
*   **Caching with Redis:** Reduces load on the database.
*   **Database Read Replicas:** (Future) Can be added for read-heavy workloads.
*   **Message Queues:** (Future) For asynchronous, fault-tolerant processing of background tasks.
*   **Dockerization:** Enables easy deployment and scaling using container orchestration platforms (Kubernetes).
*   **Database Transactions:** Ensures data consistency for critical operations.
```