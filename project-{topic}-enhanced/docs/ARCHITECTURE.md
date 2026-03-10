```markdown
# CMS Project Architecture

This document outlines the high-level architecture and design decisions for the Comprehensive Content Management System (CMS).

## 1. Overview

The CMS is built as a **monorepo** with a clear separation between its backend and frontend components. It follows a **microservices-like** approach where the backend API serves as a central data and business logic provider, and the frontend consumes this API to render the user interface. All components are containerized using Docker for easy deployment and scalability.

## 2. High-Level Diagram

```
+-------------------+      +-----------------+      +-----------------+
|   Client (Browser)| <--> |   Frontend      | <--> |     Backend     |
| (React.js SPA)    |      | (React/Nginx)   |      | (Node.js/Express)|
+-------------------+      +-----------------+      +-----------------+
        ^                                                   |
        |  API Requests (HTTP/S)                            | API Calls
        V                                                   |
+-------------------+                                       |
|  External Services|                                       V
| (e.g., CDN, S3)   |                                  +-------------+
+-------------------+                                  |  Caching    |
                                                       | (Redis)     |
                                                       +-------------+
                                                              |
                                                              V
                                                       +-------------+
                                                       |  Database   |
                                                       | (PostgreSQL)|
                                                       +-------------+
```

## 3. Component Breakdown

### 3.1. Frontend (Client Application)

*   **Technology Stack:** React.js, React Router, Axios for API communication, HTML/CSS.
*   **Deployment:** Dockerized using Nginx to serve static files.
*   **Key Responsibilities:**
    *   User Interface (UI) rendering.
    *   Client-side routing.
    *   User authentication state management (via `AuthContext`).
    *   Interaction with the Backend API.
    *   Form handling and client-side validation.
*   **Folder Structure:**
    *   `src/api`: Centralized Axios instance for API calls.
    *   `src/components`: Reusable UI components (e.g., buttons, cards, forms).
    *   `src/contexts`: React Context API for global state like authentication.
    *   `src/hooks`: Custom React hooks for shared logic.
    *   `src/pages`: Top-level components representing different views/routes.
    *   `src/tests`: Unit and integration tests for React components (Jest, React Testing Library).

### 3.2. Backend (API Server)

*   **Technology Stack:** Node.js, Express.js, Sequelize ORM, PostgreSQL database, Redis for caching/sessions.
*   **Deployment:** Dockerized Node.js application.
*   **Key Responsibilities:**
    *   Exposing RESTful API endpoints for all CRUD operations.
    *   Implementing core business logic (user management, content lifecycle).
    *   Handling data persistence through Sequelize and PostgreSQL.
    *   Authentication (JWT-based, via HttpOnly cookies) and Authorization (Role-Based Access Control).
    *   Logging, Error Handling, and Security (Helmet, XSS-clean, HPP, Rate Limiting).
    *   Caching API responses with Redis.
*   **Layered Architecture:**
    *   **Routes:** Defines API endpoint paths and maps them to controllers.
    *   **Controllers:** Handle incoming HTTP requests, validate input, call appropriate services, and send HTTP responses. Minimal logic.
    *   **Services:** Encapsulate business logic. They interact with models/database and apply transformations.
    *   **Models:** Define database schemas and relationships using Sequelize. Include hooks for operations like password hashing.
    *   **Middleware:** Functions executed before/after route handlers for cross-cutting concerns (auth, logging, error handling, rate limiting, caching).
    *   **Config:** Manages environment variables, database connections, and other application settings.
    *   **Utils:** Helper functions (logger, custom error classes).
*   **Folder Structure:**
    *   `config`: Database, environment variables, Redis connection.
    *   `controllers`: Request handling logic.
    *   `middleware`: Express middleware for various concerns.
    *   `models`: Sequelize model definitions.
    *   `migrations`: Database schema evolution scripts.
    *   `seeders`: Initial data population scripts.
    *   `routes`: API route definitions.
    *   `services`: Core business logic.
    *   `utils`: Helper utilities (logger, custom error).
    *   `tests`: Unit, integration, and API tests.

### 3.3. Database (Data Persistence)

*   **Technology:** PostgreSQL
*   **ORM:** Sequelize (Node.js)
*   **Key Features:**
    *   Relational database for structured data storage.
    *   `uuid` for primary keys.
    *   Defined relationships (one-to-many, many-to-many).
    *   Migrations for schema evolution.
    *   Seeders for initial data.
    *   Indexes for query optimization.

### 3.4. Caching & Session Store

*   **Technology:** Redis
*   **Key Features:**
    *   **API Response Caching:** Speeds up read-heavy API endpoints (e.g., fetching all posts). Implemented as middleware.
    *   **Session Store:** Used by `express-session` for managing user sessions in a scalable manner, replacing default in-memory storage.

## 4. Cross-Cutting Concerns

### 4.1. Authentication & Authorization

*   **Authentication:** JWT (JSON Web Tokens) are used. Upon successful login, a JWT is generated and stored in an `HttpOnly` cookie. This cookie is sent with subsequent requests to authenticate the user.
*   **Authorization:** Role-Based Access Control (RBAC) is implemented using middleware (`authorize`). Each user has a `role` (`admin`, `editor`, `author`, `subscriber`), and routes are protected based on these roles.

### 4.2. Logging

*   **Tool:** Winston
*   **Implementation:** Centralized logger utility (`utils/logger.js`) provides structured logging. Logs are output to console (development) and files (error.log, combined.log).

### 4.3. Error Handling

*   **Mechanism:** A custom `ApiError` class is used to distinguish operational errors from programming errors.
*   **Implementation:** A centralized error handling middleware (`middleware/errorHandler.js`) catches all errors, logs them, and sends a consistent JSON error response to the client.

### 4.4. Caching

*   **Mechanism:** Redis is used for caching API responses.
*   **Implementation:** `cacheMiddleware` intercepts GET requests. If data is in cache, it's served directly. Otherwise, the response is cached before being sent. `clearCache` utility invalidates cache on data modification (POST, PUT, DELETE).

### 4.5. Rate Limiting

*   **Mechanism:** Protects API endpoints from abuse.
*   **Implementation:** `express-rate-limit` middleware limits requests per IP address over a defined window.

### 4.6. Security

*   **Helmet:** Sets various HTTP headers to enhance security (e.g., X-Content-Type-Options, Strict-Transport-Security).
*   **XSS-clean:** Sanitizes user input to prevent Cross-Site Scripting (XSS) attacks.
*   **HPP (HTTP Parameter Pollution):** Protects against parameter pollution attacks.
*   **CORS:** Configured to allow requests from the frontend origin.

## 5. Development & Deployment Workflow

### 5.1. Local Development

*   **Tools:** Docker Compose, `nodemon` (for backend hot-reloading), `react-scripts` (for frontend hot-reloading).
*   **Process:** Developers use `docker-compose up` to spin up all services. Source code changes on the host are mounted into containers, triggering live reloads.

### 5.2. CI/CD (Continuous Integration/Continuous Deployment)

*   **Tool:** GitHub Actions.
*   **Stages:**
    1.  **Build & Test Backend:** Linting, dependency installation, database setup for testing, unit/integration/API tests, coverage reporting.
    2.  **Build & Test Frontend:** Linting, dependency installation, unit/component tests, build static assets.
    3.  **Deploy (Optional/Conditional):** If all tests pass on the `main` branch, Docker images are built, tagged, pushed to a registry (e.g., Docker Hub), and then deployed to a production server (e.g., EC2) using SSH to update `docker-compose` configurations and restart services.

## 6. Scalability Considerations

*   **Stateless Backend:** The API server is designed to be stateless (sessions managed by Redis), allowing for easy horizontal scaling by adding more backend instances.
*   **Database Scaling:** PostgreSQL can be scaled vertically (more powerful server) or horizontally (read replicas, sharding - more complex).
*   **Caching:** Redis significantly reduces database load for read-heavy operations, improving response times.
*   **Frontend Scaling:** Static frontend assets are served by Nginx and can be deployed to a CDN for global distribution and faster loading.

## 7. Future Enhancements

*   **File Uploads:** Integrate `multer` with a cloud storage service (AWS S3, Google Cloud Storage) for media management.
*   **Full-text Search:** Implement robust search functionality using PostgreSQL's built-in capabilities or dedicated search engines like Elasticsearch.
*   **Webhooks/Eventing:** For integrating with other services.
*   **GraphQL API:** As an alternative to REST for more flexible data fetching.
*   **Admin Panel UI:** A more comprehensive UI for managing users, categories, tags, and site settings.
*   **Content Versioning/Revisions:** For tracking changes to posts.
*   **Internationalization (i18n):** Support for multiple languages.
```