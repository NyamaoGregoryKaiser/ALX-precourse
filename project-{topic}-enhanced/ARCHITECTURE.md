# Task Management System - Architecture Documentation

## 1. Introduction

This document outlines the architectural design of the Task Management System, covering its high-level structure, key components, data flow, and design principles. The system follows a layered, modular, and service-oriented approach to ensure scalability, maintainability, and extensibility.

## 2. High-Level Architecture

The system is designed as a **Monorepo** containing a separate Backend API and a Frontend Single-Page Application (SPA). It leverages a microservices-like philosophy in its backend modularity, though it's deployed as a single Express application for simplicity and development efficiency.

```
+---------------------+           +---------------------+           +---------------------+
|                     |           |                     |           |                     |
|     User (Browser)  | <----->   |     Frontend SPA    | <----->   |    Backend API      |
|                     |           |   (React, TS)       |           |   (Node.js, Express, TS) |
+---------------------+           +---------------------+           +---------------------+
                                            |                                    |
                                            | HTTP/REST                          | RESTful API
                                            |                                    |
                                            V                                    V
                                    +---------------------+           +---------------------+
                                    |                     | <----->   |     PostgreSQL      |
                                    |     Redis Cache     |           |     Database        |
                                    |                     |           |   (TypeORM)         |
                                    +---------------------+           +---------------------+
```

### Key Architectural Characteristics:

*   **Client-Server:** Standard web architecture with a decoupled frontend and backend.
*   **Layered Backend:** Organized into distinct layers (Routes, Controllers, Services, Entities) for clear separation of concerns.
*   **Modular Design:** Backend modules for Auth, Users, Projects, and Tasks, each with its own routes, controllers, and services.
*   **Microservice-ready (Conceptual):** The service layer abstraction allows for easier refactoring into actual microservices if the application scales significantly.
*   **Stateless API:** The API is stateless, relying on JWT for authentication, which aids scalability.
*   **Event-Driven (Potential):** While not explicitly implemented, the logging and error handling provide hooks for future integration with event-driven monitoring systems.
*   **Containerized:** Utilizes Docker for consistent development and deployment environments.

## 3. Backend Architecture (Node.js/Express/TypeScript)

The backend is structured into several layers:

```
+-----------------------------------------------------------------------------------+
|                          Request Flow                                             |
|                                                                                   |
|  +-------------------+  +-------------------+                                     |
|  |     Client        |->|   Load Balancer   | (e.g., Nginx, AWS ALB)              |
|  |    (Frontend)     |  |    (Optional)     |                                     |
|  +-------------------+  +-------------------+                                     |
|                                     |                                             |
|  +-----------------------------------------------------------------------------+  |
|  |                          Express Application (app.ts)                       |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |                             Middleware Layer                          |  |  |
|  |  |  - CORS                                                             |  |  |
|  |  |  - Helmet (Security Headers)                                        |  |  |
|  |  |  - Request Logger (Winston)                                         |  |  |
|  |  |  - Rate Limiter (express-rate-limit)                                |  |  |
|  |  |  - Body Parsers (JSON, URL-encoded)                                 |  |  |
|  |  |  - Authentication (JWT verification - authMiddleware.ts)            |  |  |
|  |  |  - Authorization (Role/Ownership checks - authMiddleware.ts)        |  |  |
|  |  |  - Error Handler (errorHandler.ts - LAST middleware)                |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                     |                                     |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |                             Routes Layer (routes/*.ts)                |  |  |
|  |  |  - Defines API endpoints (e.g., /api/auth, /api/projects)             |  |  |
|  |  |  - Maps endpoints to Controller methods                               |  |  |
|  |  |  - Applies validation schemas (Joi)                                   |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                     |                                     |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |                          Controllers Layer (controllers/*.ts)         |  |  |
|  |  |  - Handles HTTP requests and responses                                |  |  |
|  |  |  - Performs request validation (using Joi schemas from routes)        |  |  |
|  |  |  - Delegates business logic to Service Layer                          |  |  |
|  |  |  - Catches errors and passes them to the Error Handler                |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                     |                                     |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |                           Services Layer (services/*.ts)              |  |  |
|  |  |  - Contains core business logic and data processing                   |  |  |
|  |  |  - Orchestrates interactions with data sources (ORM, Cache)           |  |  |
|  |  |  - Implements complex algorithms and transactional logic              |  |  |
|  |  |  - Interacts with CacheService for caching operations                 |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                     |                                     |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |                           Data Access Layer                           |  |  |
|  |  |  - TypeORM Repositories (ORM for PostgreSQL)                          |  |  |
|  |  |  - Redis Client (for CacheService)                                    |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                     |                                     |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |                             Database (PostgreSQL)                     |  |  |
|  |  |                             Cache (Redis)                             |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### Key Components:

*   **`src/backend/app.ts` / `src/backend/server.ts`**: Entry points for the Express application. `app.ts` sets up middleware and routes, `server.ts` handles database connection and server startup.
*   **`src/backend/config/`**: Centralized environment-specific configurations, loaded from `.env` files.
*   **`src/backend/database/`**: TypeORM data source configuration, migration scripts.
*   **`src/backend/entities/`**: TypeORM entities (`User`, `Project`, `Task`) defining the database schema and relationships.
*   **`src/backend/middleware/`**:
    *   `authMiddleware.ts`: Handles JWT token verification and user extraction. Includes authorization checks (e.g., `isOwner`).
    *   `errorHandler.ts`: Global error handling, catching exceptions and returning consistent API error responses.
    *   `loggingMiddleware.ts`: Logs incoming requests and basic response information using Winston.
    *   `rateLimiter.ts`: Applies rate limiting to prevent abuse.
*   **`src/backend/controllers/`**: Contain the request handling logic. They receive validated input, call appropriate services, and send HTTP responses. (e.g., `AuthController`, `ProjectController`).
*   **`src/backend/services/`**: Encapsulate the business logic. They interact with TypeORM repositories and the `CacheService` to perform CRUD operations, apply business rules, and handle complex data manipulations. (e.g., `UserService`, `ProjectService`, `CacheService`).
*   **`src/backend/routes/`**: Define the API endpoints, map them to controller methods, and apply middleware (authentication, authorization, validation).
*   **`src/backend/utils/`**: Helper functions for common tasks:
    *   `hash.ts`: Password hashing using `bcryptjs`.
    *   `jwt.ts`: JWT token generation and verification.
    *   `logger.ts`: Winston logger instance.
    *   `validation.ts`: Joi schemas for input validation.

## 4. Frontend Architecture (React/TypeScript)

The frontend is a simple React SPA, designed to interact with the backend API.

*   **`src/frontend/src/App.tsx`**: Main application component, handles routing.
*   **`src/frontend/src/pages/`**: Top-level components for different views (e.g., `HomePage`, `ProjectPage`).
*   **`src/frontend/src/components/`**: Reusable UI components (e.g., `LoginForm`, `ProjectCard`).
*   **`src/frontend/src/api.ts`**: Centralized Axios instance for API calls, including request/response interceptors for JWT handling and error responses.

## 5. Data Flow Example: Creating a Project

1.  **Frontend:** User fills out a "Create Project" form and clicks submit.
2.  **`src/frontend/src/api.ts`:** Axios client sends a `POST` request to `/api/projects` with project data and the JWT token in the `Authorization` header.
3.  **Backend Middleware (`app.ts`):**
    *   `cors`, `helmet`: Request goes through security checks.
    *   `requestLogger`: Request is logged.
    *   `apiRateLimiter`: Rate limit check.
    *   `express.json()`: Request body is parsed.
    *   `authenticate (authMiddleware)`: JWT token is verified, and `req.user` is populated with user details.
4.  **Backend Routes (`projectRoutes.ts`):** The `POST /api/projects` route is matched. Joi validation schema is applied.
5.  **Backend Controller (`ProjectController.ts`):** `createProject` method is invoked. It extracts validated data from `req.body` and the `ownerId` from `req.user`.
6.  **Backend Service (`ProjectService.ts`):** `createProject` method is called.
    *   It uses `AppDataSource.getRepository(Project)` to interact with the database.
    *   It creates a new `Project` entity instance.
    *   It saves the new project to the PostgreSQL database.
7.  **Database (PostgreSQL):** The new project record is inserted.
8.  **Backend Service:** Returns the created project object.
9.  **Backend Controller:** Receives the created project, sends a `201 Created` HTTP response with the project data.
10. **Frontend:** Receives the response, updates the UI (e.g., adds the new project to a list).

## 6. Security Considerations

*   **Authentication:** JWT for stateless, secure user authentication.
*   **Authorization:** Middleware checks user roles and resource ownership for access control.
*   **Input Validation:** Joi schemas prevent common injection attacks (e.g., SQL injection, XSS) by ensuring data integrity.
*   **Rate Limiting:** Protects against brute-force attacks and DDoS.
*   **Security Headers (Helmet):** Mitigates common web vulnerabilities like XSS, clickjacking, etc.
*   **Password Hashing:** `bcryptjs` is used to securely store user passwords.
*   **Environment Variables:** Sensitive information (database credentials, JWT secret) is stored in environment variables, not hardcoded.

## 7. Scalability & Performance

*   **Stateless API:** Enables easy horizontal scaling of the backend application instances.
*   **Database Indexing:** Migrations include indexes on frequently queried columns for performance.
*   **Caching (Redis):** Reduces database load for frequently accessed, less-changing data (e.g., `GET /api/projects` for a user's projects).
*   **Modular Design:** Allows for future extraction of services into separate microservices if specific parts become bottlenecks.
*   **Load Balancing:** The architecture can easily integrate with load balancers (e.g., Nginx, cloud load balancers) to distribute traffic across multiple backend instances.
*   **Connection Pooling:** TypeORM handles database connection pooling automatically.

## 8. Observability

*   **Logging (Winston):** Structured logs provide insights into application behavior, errors, and request flows.
*   **Error Handling:** Consistent error responses and detailed server-side error logging facilitate debugging.
*   **Health Checks:** Docker Compose includes health checks for DB and Redis, and the backend has a simple `/` endpoint for health checks.
*   **Monitoring (Future):** The logging infrastructure lays the groundwork for integration with external monitoring tools (e.g., ELK Stack, Prometheus/Grafana).

## 9. Future Enhancements

*   **WebSockets:** For real-time task updates.
*   **Full-Text Search:** For projects and tasks.
*   **Notifications:** Email/in-app notifications for task assignments, due dates.
*   **Admin Panel:** A dedicated interface for administrative users to manage all users, projects, and tasks.
*   **More Granular Permissions:** Beyond basic owner/assignee roles.
*   **Swagger/OpenAPI:** For automated API documentation generation.
*   **Advanced CI/CD:** Automated deployment to cloud providers (AWS, Azure, GCP).