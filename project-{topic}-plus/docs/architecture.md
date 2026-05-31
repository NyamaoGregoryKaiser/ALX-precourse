# Architecture Documentation

## 1. High-Level Overview

The Project Security System (PMS) is a multi-tier, microservices-oriented (though currently monolithic in deployment for simplicity) application designed for managing projects and tasks. It consists of a decoupled frontend and a robust backend API, interacting with a PostgreSQL database and an in-memory caching layer.

```mermaid
graph TD
    User -->|Browser/Client| Frontend[Frontend (React/TypeScript)]
    Frontend -->|HTTP/HTTPS| LoadBalancer(Load Balancer / API Gateway)
    LoadBalancer --> BackendAPI[Backend API (Node.js/Express.js)]
    BackendAPI --> SecurityMiddleware(Security Middleware)
    SecurityMiddleware --> Services(Business Logic Services)
    Services --> ORM(Prisma ORM)
    ORM --> Database[PostgreSQL Database]
    SecurityMiddleware --> Cache[Node-Cache / Redis]
    Services --> Cache
    BackendAPI -- Logs --> LoggingMonitoring(Logging & Monitoring - Winston)
    BackendAPI -- Errors --> ErrorHandling(Centralized Error Handling)
```

## 2. Component Breakdown

### 2.1. Frontend (React/TypeScript)

*   **Purpose:** User Interface for interacting with the PMS.
*   **Technologies:** React, TypeScript, React Router, Axios (for API calls), UI Library (e.g., Material-UI, TailwindCSS).
*   **Responsibilities:**
    *   User authentication and session management (storing JWTs).
    *   Displaying project and task data.
    *   User input forms and validation (client-side).
    *   Routing and navigation.
*   **Security Considerations:**
    *   HTTPS for all communication.
    *   Secure storage of JWT (e.g., HttpOnly cookies for refresh tokens, browser memory for access tokens, combined with CSRF protection). *Note: Current implementation assumes `Bearer` token in `Authorization` header, which implies local storage or memory for the access token.*
    *   Client-side input validation (supplementary, not a replacement for server-side validation).
    *   Role-based UI elements and navigation based on authenticated user's role.

### 2.2. Backend API (Node.js/Express.js)

*   **Purpose:** Provides RESTful API endpoints for the frontend and other clients. Handles all business logic, data persistence, and core security features.
*   **Technologies:** Node.js, Express.js, TypeScript.
*   **Responsibilities:**
    *   Authentication (User registration, login, JWT issuance/verification).
    *   Authorization (Role-Based Access Control - RBAC).
    *   Input validation (server-side, robust).
    *   Business logic for Users, Projects, Tasks.
    *   Database interaction via ORM.
    *   Logging, error handling, caching, rate limiting.
*   **Security Layers:**
    *   **Authentication Middleware (`protect`):** Verifies JWT tokens, ensures user existence, and attaches user info to `req.user`.
    *   **Authorization Middleware (`restrictTo`):** Checks if the authenticated user's role is permitted for the accessed resource.
    *   **Input Validation Middleware (`validate`):** Uses Zod schemas to ensure incoming data conforms to expected types and constraints.
    *   **Password Hashing:** `bcrypt` for secure storage of user passwords.
    *   **Rate Limiting (`express-rate-limit`):** Protects against brute-force attacks and API abuse on specific endpoints (e.g., login) and globally.
    *   **Error Handling:** Centralized `errorHandler` middleware catches `AppError` instances, Zod errors, and Prisma errors, returning standardized error responses without exposing sensitive details.
    *   **Environment Configuration:** `dotenv` and `zod` for strict validation of environment variables, preventing misconfigurations.
    *   **CORS:** Configured to allow requests from the frontend origin.

### 2.3. Database (PostgreSQL with Prisma ORM)

*   **Purpose:** Persistent storage for application data.
*   **Technologies:** PostgreSQL, Prisma ORM.
*   **Schema:** `User`, `Project`, `Task` models with appropriate relationships, indices, and data types. Roles are defined using a Prisma `enum`.
*   **Responsibilities:**
    *   Data storage and retrieval.
    *   Referential integrity (e.g., CASCADE onDelete).
    *   Query optimization (via Prisma, indices).
*   **Security Considerations:**
    *   Use of ORM (`Prisma`) mitigates SQL injection risks.
    *   Connection string managed via environment variables.
    *   Database user with principle of least privilege.
    *   Secure network access (e.g., VPC, firewalls).

### 2.4. Caching Layer (Node-Cache)

*   **Purpose:** Improve application performance by storing frequently accessed data in memory, reducing database load.
*   **Technologies:** `node-cache` (in-memory, for this example), scalable with Redis for production.
*   **Responsibilities:**
    *   Store responses for GET requests.
    *   Invalidate cache entries upon data modification (POST, PUT, DELETE).
*   **Security Considerations:**
    *   Ensure no sensitive or personalized data is cached incorrectly for all users.
    *   Cache invalidation logic is crucial to prevent stale data.

## 3. Data Flow

1.  **User Interaction:** A user interacts with the Frontend (e.g., attempts to log in, creates a project).
2.  **Frontend Request:** The Frontend sends an HTTP request to the Backend API. For protected routes, it includes a JWT in the `Authorization` header.
3.  **Backend Ingress:**
    *   **Request Logger:** Logs the incoming request with a unique ID.
    *   **CORS:** Checks if the request origin is allowed.
    *   **Rate Limiter:** Checks if the request exceeds the configured rate limit (IP-based for guest, user-ID based for authenticated).
    *   **Body Parser:** Parses JSON payload.
4.  **Authentication (`protect` middleware):** If a protected route, validates the JWT. Decodes the user ID, email, and role, attaching it to `req.user`. If invalid/missing token, returns 401.
5.  **Authorization (`restrictTo` / Controller Logic):** Checks `req.user.role` against allowed roles for the route/resource. If not authorized, returns 403.
6.  **Input Validation (`validate` middleware):** Uses Zod to validate `req.body`, `req.params`, `req.query`. If validation fails, returns 400.
7.  **Business Logic (Service Layer):** The request reaches the relevant controller, which calls the service layer. The service layer performs business logic, potentially interacting with external services (none in this example).
8.  **Database Interaction (Prisma ORM):** The service layer uses Prisma Client to query or modify data in PostgreSQL.
9.  **Caching (for GETs):** Before sending a response for a GET request, the `cacheMiddleware` might store it. After mutations (POST/PUT/DELETE), `clearCache` is called to invalidate relevant entries.
10. **Response Generation:** The controller formats the successful response.
11. **Error Handling:** Any errors throughout this flow (validation, auth, DB, business logic) are caught by the `errorHandler` middleware, which logs the error and sends a standardized, non-sensitive error response.
12. **Backend Egress:** The Backend sends the HTTP response back to the Frontend.
13. **Frontend Display:** The Frontend processes the response and updates the UI accordingly.

## 4. Scalability and Reliability

*   **Stateless Backend:** The use of JWTs makes the backend stateless, enabling easy horizontal scaling by running multiple instances behind a load balancer.
*   **Database Scaling:** PostgreSQL can be scaled vertically (more powerful server) or horizontally (read replicas, sharding for very large scale).
*   **Caching:** Moving from `node-cache` to a distributed cache like Redis is a key step for scaling.
*   **Containerization (Docker):** Facilitates consistent environments and simplifies deployment across multiple servers.
*   **Load Balancing:** Essential for distributing traffic across multiple backend instances.
*   **Monitoring:** Comprehensive logging and external monitoring tools (e.g., Prometheus, Grafana, ELK stack) are crucial for observing system health and performance.

## 5. Future Enhancements

*   **Refresh Tokens:** Implement refresh token mechanism for better security and user experience (short-lived access tokens, long-lived refresh tokens).
*   **Auditing:** Implement detailed audit logs for critical actions.
*   **Two-Factor Authentication (2FA):** Add an extra layer of security for user login.
*   **SSO Integration:** Integrate with OAuth2/OpenID Connect providers (e.g., Google, Okta).
*   **API Gateway:** For advanced routing, security, and analytics.
*   **Websockets:** For real-time updates (e.g., task status changes).
*   **Distributed Tracing:** To monitor requests across multiple services.
*   **Deployment Automation:** Fully automate deployment to cloud providers (AWS, GCP, Azure).
*   **Frontend Security:** More advanced UI security practices.
```