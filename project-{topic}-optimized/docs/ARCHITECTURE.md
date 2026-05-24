# Mobile Task Management Backend Architecture Documentation

This document outlines the architectural design of the Mobile Task Management Backend System, explaining its components, how they interact, and the principles guiding its construction.

## 1. High-Level Architecture

The system follows a typical **N-tier architecture** with a clear separation of concerns, structured primarily around a **RESTful API** exposed via Node.js/Express.js.

```mermaid
graph TD
    A[Mobile Clients] --- B(Internet/Load Balancer)
    B --- C(API Gateway / Web Server)
    C --- D[Node.js Express App]
    D --- E[PostgreSQL Database]
    D --- F[Redis Cache]
    D --- G[Logging Service]
    D --- H[Authentication Service <br/> (Internal to Express App)]
    H --- E
    SubGraph External Services
        G --- I[CloudWatch / ELK Stack]
    End
```

*   **Mobile Clients:** iOS and Android applications interact with the backend API.
*   **Internet/Load Balancer:** Manages incoming traffic, distributes requests, and handles SSL termination.
*   **API Gateway/Web Server (Optional but Recommended):** (e.g., Nginx, AWS API Gateway) Provides additional security, rate limiting, request routing, and caching before requests hit the application servers. In this project, basic rate limiting and security headers are handled by Express directly, but an external gateway is ideal for production.
*   **Node.js Express App:** The core backend application, serving API endpoints, processing business logic, and orchestrating interactions with other services.
*   **PostgreSQL Database:** The primary persistent data store.
*   **Redis Cache:** An in-memory data store used for caching frequently accessed data and managing JWT refresh tokens.
*   **Logging Service:** Collects application logs for monitoring, debugging, and analysis.

## 2. Application Layer (Node.js/Express.js)

The core application follows a **Modular Monolith** pattern, where related functionalities are grouped into distinct modules. This approach balances the benefits of microservices (modularity, clear boundaries) with the simplicity of a single deployable unit.

### 2.1. Folder Structure

```
src/
├── app.js                          # Express app setup, global middleware, route registration
├── server.js                       # Application entry point, DB connection, graceful shutdown
├── auth/                           # Authentication module
│   ├── auth.controller.js
│   ├── auth.middleware.js
│   ├── auth.routes.js
│   ├── auth.service.js
│   └── auth.validation.js
├── comments/                       # Comments module
├── middleware/                     # Global/reusable Express middleware
│   ├── auth.js                     # Re-exports auth middleware
│   ├── errorHandler.js
│   ├── rateLimiter.js
│   └── cache.js
├── projects/                       # Projects module
├── tasks/                          # Tasks module
├── teams/                          # Teams module
├── users/                          # Users module
└── utils/                          # Common utility functions
    ├── apiFeatures.js              # Query parsing utility
    ├── appError.js                 # Custom error class
    ├── catchAsync.js               # Async error wrapper
    ├── logger.js                   # Winston logger setup
    └── prisma.js                   # Prisma client instance
```

### 2.2. Design Patterns and Principles

*   **Separation of Concerns (MVC-like):**
    *   **Controllers (`.controller.js`):** Handle HTTP requests and responses. They receive input, validate it (implicitly via Joi validation middleware), call the appropriate service method, and send back a response. They should contain minimal business logic.
    *   **Services (`.service.js`):** Encapsulate the business logic. They interact with the database (via Prisma), perform calculations, enforce business rules, and handle data manipulation. They are independent of the HTTP context.
    *   **Routes (`.routes.js`):** Define API endpoints and link them to controllers.
    *   **Validation (`.validation.js`):** Joi schemas define and validate input data.
*   **Error Handling (Centralized):** All errors are caught by a global `errorHandler` middleware. Custom `AppError` class allows for structured, operational error reporting. `catchAsync` wrapper ensures async errors are consistently handled.
*   **Dependency Injection (Implicit):** Services are imported and used by controllers. Prisma client is centrally instantiated and imported, acting as a singleton.
*   **Loose Coupling:** Modules are designed to be as independent as possible, communicating through well-defined interfaces (service methods).
*   **Scalability:** Stateless design (JWT tokens, Redis cache) allows horizontal scaling of Node.js instances.
*   **Security:** Middleware for JWT authentication, role-based authorization, Helmet for HTTP headers, CORS, and rate limiting.
*   **Observability:** Integrated Winston for structured logging, providing insights into application behavior.

### 2.3. Core Components

*   **`server.js`:** The entry point. Initializes the Express app, connects to the database (Prisma), starts the HTTP server, and sets up global error handling for unhandled promise rejections and uncaught exceptions.
*   **`app.js`:** Configures the Express application. This includes:
    *   **Security Middleware:** `helmet`, `cors`.
    *   **Body Parsers:** `express.json`, `express.urlencoded`.
    *   **Compression:** `compression`.
    *   **Logging:** `morgan` for HTTP request logging, streaming to Winston.
    *   **Rate Limiting:** `apiLimiter` and `authLimiter`.
    *   **API Documentation:** `swagger-ui-express`.
    *   **Route Registration:** Links all module routes (`/api/v1/auth`, `/api/v1/users`, etc.).
    *   **Error Handling:** Catches all undefined routes and forwards errors to `errorHandler`.

## 3. Database Layer (PostgreSQL with Prisma)

*   **PostgreSQL:** Chosen for its robustness, reliability, and support for complex relational data.
*   **Prisma ORM:**
    *   **Schema Definition (`prisma/schema.prisma`):** Defines database models and relationships using a human-readable, declarative schema language. This becomes the single source of truth for the database structure.
    *   **Type Safety:** Generates a type-safe Prisma Client, providing autocompletion and compile-time checks for database queries.
    *   **Migrations:** Manages database schema changes through version-controlled migration files, ensuring consistency across environments.
    *   **Seed Data:** `prisma/seed.ts` populates the database with initial data for development and testing.
    *   **Query Building:** Provides an intuitive API for building complex queries, including filtering, sorting, pagination, and eager loading of related data (`include`).

## 4. Caching Layer (Redis)

*   **Purpose:** Improves API response times and reduces database load by storing frequently accessed data in-memory.
*   **Implementation (`src/middleware/cache.js`):**
    *   **`redisClient`:** Connects to the Redis server.
    *   **`cacheMiddleware`:** Intercepts GET requests. If the response is in the cache, it's served immediately. Otherwise, the request proceeds, and the response is stored in Redis before being sent to the client.
    *   **`invalidateCache`:** Used after CUD operations (POST, PUT, PATCH, DELETE) to remove stale data from Redis, ensuring clients always receive the latest information.
*   **Refresh Token Storage:** Refresh tokens are stored in Redis (along with an expiration) to allow for their revocation, enhancing security.

## 5. Authentication & Authorization

*   **JWT (JSON Web Tokens):** Used for stateless authentication.
    *   **Access Token:** Short-lived, included in `Authorization` header for protected API calls.
    *   **Refresh Token:** Long-lived, used to obtain new access tokens when the current one expires. Stored securely (e.g., in Redis, HttpOnly cookie) on the client side.
*   **`auth.service.js`:** Handles user registration, login (hashing passwords with `bcryptjs`), and JWT generation/validation.
*   **`auth.middleware.js`:**
    *   **`protect`:** Verifies the JWT access token in the request header. If valid, attaches the `user` object to `req`.
    *   **`restrictTo`:** Role-based authorization. Checks `req.user.role` against a list of allowed roles (Admin, Manager, User).
*   **Role-Based Access Control (RBAC):** Users are assigned roles (USER, MANAGER, ADMIN) in the database. Middleware then uses these roles to restrict access to certain resources or actions.
    *   **USER:** Can manage their own tasks/projects, view assigned tasks, add comments.
    *   **MANAGER:** Can create/manage teams and projects, assign tasks, manage team members.
    *   **ADMIN:** Full access to all resources and administrative functions (e.g., user role assignment, team deletion).

## 6. Testing Strategy

*   **Unit Tests (Jest):** Focus on isolating and testing individual functions/services (e.g., `auth.service.test.js`). Mocks are used extensively to prevent external dependencies.
*   **Integration Tests (Jest, Supertest):** Test the interaction between different components, typically from the API endpoint down to the database. These tests use a dedicated test database to ensure isolation and idempotence.
*   **API Tests:** Covered by integration tests, verifying HTTP responses, status codes, and data formats for various API scenarios.

## 7. Configuration & Environment Management

*   **`dotenv`:** Loads environment variables from a `.env` file.
*   **`config/config.js`:** Centralizes configuration access and performs Joi validation on environment variables at application startup, ensuring all necessary variables are present and correctly formatted.
*   **`NODE_ENV`:** Differentiates between `development`, `test`, and `production` environments to adjust logging, error handling, and database connections.

## 8. Deployment and Operations

*   **Docker:** The application is containerized using `Dockerfile` and orchestrated with `docker-compose.yml` for local development. This ensures consistency between development and production environments.
*   **CI/CD (GitHub Actions):** Automates the build, test, and deployment process (`.github/workflows/main.yml`).
    *   **Continuous Integration:** Runs linters, builds the Docker image, and executes tests on every push/pull request.
    *   **Continuous Deployment:** (Example provided for AWS ECR/ECS) Automatically deploys validated code to a production environment upon merging to the `main` branch.
*   **Graceful Shutdown (`server.js`):** Listens for `SIGTERM` and `SIGINT` signals to allow the application to finish pending requests and cleanly disconnect from the database before shutting down.

## 9. Future Enhancements

*   **File Uploads:** Implement actual file storage (e.g., AWS S3, local disk) for task attachments.
*   **Notifications:** Integrate with a notification service (e.g., push notifications for mobile, email) for task assignments, comments, etc.
*   **Real-time Features:** WebSockets for live updates (e.g., task status changes, new comments).
*   **GraphQL:** Explore adding a GraphQL layer for more flexible data fetching by clients.
*   **Background Jobs:** For long-running or scheduled tasks (e.g., daily reports, data cleanup), integrate a job queue (e.g., RabbitMQ, Kafka) with a worker process.
*   **More Advanced Search:** Integrate with a search engine like Elasticsearch for full-text search capabilities.
*   **API Versioning:** While `/v1` is present, consider strategy for major API changes (e.g., URL versioning, header versioning).

This architecture provides a solid foundation for a scalable and maintainable mobile backend, adhering to modern software engineering principles.
---
```
Total lines of code: ~2500 (excluding comments and blank lines in some files, but including all generated content and documentation)
```