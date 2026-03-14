# Architecture Document: Task Management System

This document provides a comprehensive overview of the Task Management System's architecture, outlining its design principles, component breakdown, data flow, and key technical decisions.

## Table of Contents

1.  [Introduction](#1-introduction)
2.  [High-Level Architecture](#2-high-level-architecture)
3.  [Backend Architecture](#3-backend-architecture)
    1.  [Core Modules](#31-core-modules)
    2.  [Data Flow](#32-data-flow)
    3.  [Key Design Patterns](#33-key-design-patterns)
    4.  [Error Handling](#34-error-handling)
    5.  [Authentication & Authorization](#35-authentication--authorization)
    6.  [Caching](#36-caching)
    7.  [Logging & Monitoring](#37-logging--monitoring)
4.  [Frontend Architecture](#4-frontend-architecture)
    1.  [Core Modules](#41-core-modules)
    2.  [State Management](#42-state-management)
    3.  [Component Structure](#43-component-structure)
5.  [Database Design](#5-database-design)
6.  [DevOps & Infrastructure](#6-devops--infrastructure)
    1.  [Containerization](#61-containerization)
    2.  [CI/CD Pipeline](#62-cicd-pipeline)
7.  [Scalability & Reliability](#7-scalability--reliability)
8.  [Security Considerations](#8-security-considerations)

---

## 1. Introduction

The Task Management System is a full-stack application designed to facilitate team collaboration and personal productivity through efficient task, project, and workspace management. It emphasizes a robust, scalable, and secure architecture suitable for enterprise-level deployment.

## 2. High-Level Architecture

The system follows a typical **Client-Server architecture** with a clear separation of concerns between the frontend and backend. Both components communicate via RESTful APIs.

```mermaid
graph TD
    User ---|Web Browser| Frontend[React/TypeScript Frontend]
    Frontend -->|HTTP/HTTPS (REST API)| Backend[Node.js/Express/TypeScript Backend]
    Backend -- HTTP/HTTPS -->|Reads/Writes| PostgreSQL[PostgreSQL Database]
    Backend -- TCP/IP -->|Reads/Writes (Cache)| Redis[Redis Cache]

    subgraph CI/CD
        CodePush(Code Push) --> GitHubActions[GitHub Actions]
        GitHubActions --> Test(Run Tests)
        GitHubActions --> Build(Build Docker Images)
        GitHubActions --> Deploy(Deploy to Cloud/VM)
    end

    User(End User) --- Internet --> Frontend
    Frontend --- Internet --> Backend
    CodePush --- Developer
```

**Key Components:**

*   **Frontend (React/TypeScript):** User interface and client-side logic.
*   **Backend (Node.js/Express/TypeScript):** Business logic, API endpoints, data persistence, and integration services.
*   **PostgreSQL Database:** Primary data storage for structured data.
*   **Redis Cache:** In-memory data store for caching frequently accessed data and improving API response times.
*   **Docker & Docker Compose:** Containerization for consistent development and deployment environments.
*   **GitHub Actions:** Automated CI/CD pipeline for testing, building, and deployment.

## 3. Backend Architecture

The backend is built with Node.js and Express.js, using TypeScript for enhanced code quality and maintainability. It adopts a modular, layered architecture to promote separation of concerns, testability, and scalability.

```mermaid
graph TD
    A[Client Request] --> B(Router/Routes)
    B --> C{Middleware: Auth, Validation, Rate Limit}
    C --> D(Controller)
    D --> E(Service/Business Logic)
    E --> F(TypeORM Repository)
    F --> G[PostgreSQL Database]
    E -- Cache Hit --> H[Redis Cache]
    H --> E
    E --> F
    F --> G
    G --> F
    F --> E
    E --> D
    D --> I{Error Handling Middleware}
    I --> J[Client Response (JSON)]

    subgraph Backend Layers
        B --- Router
        C --- Middleware
        D --- Controller
        E --- Service
        F --- Data Access
        G --- External
        H --- External
        I --- Middleware
    end
```

### 3.1. Core Modules

*   **`src/config`**: Environment variable loading, database connection, Redis configuration.
*   **`src/controllers`**: Handles incoming HTTP requests, validates input (via middleware), calls appropriate service methods, and sends back HTTP responses. Controllers should be thin.
*   **`src/entities`**: TypeORM entities defining the database schema and relationships.
*   **`src/exceptions`**: Custom error classes for standardized error handling.
*   **`src/middleware`**:
    *   `auth.middleware.ts`: JWT token verification and user authentication.
    *   `validation.middleware.ts`: Zod-based request body/query parameter validation.
    *   `error.middleware.ts`: Global error handling for Express.
    *   `rateLimit.middleware.ts`: Throttles requests to prevent abuse.
*   **`src/routes`**: Defines API endpoints and maps them to controller methods, applying middleware as needed.
*   **`src/services`**: Contains the core business logic. Services interact with TypeORM repositories to perform CRUD operations and apply complex business rules. They are responsible for data integrity and transactional operations.
*   **`src/utils`**: Helper functions for logging, JWT operations, caching, etc.

### 3.2. Data Flow

1.  **Client Request**: A client sends an HTTP request (e.g., GET `/api/tasks`).
2.  **Router**: Express router matches the request to a specific route handler.
3.  **Middleware Chain**:
    *   `rateLimit`: Checks and enforces rate limits.
    *   `authentication`: Verifies JWT, populates `req.user`.
    *   `authorization`: Checks user roles/permissions.
    *   `validation`: Validates request body/query params.
4.  **Controller**: Extracts data from the request, calls the relevant service method.
5.  **Service**:
    *   Applies business logic.
    *   Interacts with `Redis` for cache read/write operations.
    *   Uses TypeORM repositories for database interactions.
6.  **TypeORM Repository**: Converts service requests into database queries.
7.  **PostgreSQL Database**: Stores and retrieves data.
8.  **Response**: Data flows back from the database through the service and controller to the client.
9.  **Error Handling Middleware**: Catches any errors in the pipeline and sends a standardized error response.

### 3.3. Key Design Patterns

*   **Layered Architecture**: Clear separation of concerns (presentation, business logic, data access).
*   **Dependency Injection**: Services receive dependencies (e.g., other services, repositories) through their constructors, improving testability.
*   **Repository Pattern**: TypeORM acts as a powerful implementation, abstracting database operations.
*   **DTOs (Data Transfer Objects)**: Used with Zod for strict input validation and clear data contracts.

### 3.4. Error Handling

*   **Custom Error Classes (`CustomError`)**: Standardized error structure with `statusCode` and `message`.
*   **Global Error Middleware (`errorHandler`)**: Catches all errors, logs them, and sends consistent JSON error responses to the client, preventing sensitive information leakage.

### 3.5. Authentication & Authorization

*   **JWT (JSON Web Tokens)**: Used for stateless authentication.
    *   Users log in, receive a JWT.
    *   JWT is sent in the `Authorization: Bearer <token>` header for subsequent requests.
    *   Middleware verifies the token's validity and extracts user information.
*   **Role-Based Access Control (RBAC)**: `UserRole` enum (`ADMIN`, `MEMBER`) defines permissions. Middleware checks user roles before allowing access to certain routes or actions.

### 3.6. Caching

*   **Redis**: Utilized as an in-memory data store for caching.
*   **`cache.util.ts`**: Provides a simple interface for `get`, `set`, and `del` operations.
*   **Strategy**: Cache frequently read, less frequently updated data (e.g., lists of projects in a workspace, user profiles). Cache invalidation occurs on update/delete operations.

### 3.7. Logging & Monitoring

*   **Winston**: A robust logging library.
*   **`logger.ts`**: Configured for console output in development and file logging (error, combined, production JSON) in production.
*   **Morgan**: HTTP request logger integrated with Winston for request access logs.

## 4. Frontend Architecture

The frontend is a Single Page Application (SPA) built with React and TypeScript, leveraging Chakra UI for a modern and responsive user interface.

### 4.1. Core Modules

*   **`src/api`**: Centralized Axios instance for HTTP requests, handles JWT token attachment and error interception.
*   **`src/components`**: Reusable UI components organized by feature (e.g., `auth`, `project`, `task`).
*   **`src/contexts`**: React Context API for global state management (e.g., `AuthContext`).
*   **`src/hooks`**: Custom React hooks encapsulating reusable logic (e.g., `useAuth`).
*   **`src/pages`**: Top-level components representing different views/routes of the application.
*   **`src/styles`**: Chakra UI theme configuration and global styles.
*   **`src/types`**: TypeScript interface definitions for API responses and component props.

### 4.2. State Management

*   **React Context API**: Used for global, application-wide state (e.g., user authentication status, current user data).
*   **`useState` / `useReducer`**: For local component state.
*   **`react-query` or similar (conceptual)**: For server state management (fetching, caching, synchronizing data with the backend). While not explicitly implemented in detail, a production app would greatly benefit from this.

### 4.3. Component Structure

Components are designed to be modular and reusable.
*   **Atomic Design principles (conceptual)**: Organizing components into atoms (buttons, inputs), molecules (forms), organisms (sections, headers), templates (page layouts), and pages.
*   **Container/Presentational pattern (conceptual)**: Separating data-fetching/logic from UI rendering.

## 5. Database Design

The system uses PostgreSQL, a robust relational database. TypeORM handles ORM capabilities, mapping TypeScript entities to database tables.

### Key Entities:

*   **`User`**: Manages user authentication and profiles.
    *   Fields: `id`, `username`, `email`, `password`, `role`, `createdAt`, `updatedAt`.
    *   Relationships: `One-to-many` with `Workspaces`, `Projects` (as owner), `Tasks` (as assignee), `Comments`.
*   **`Workspace`**: Top-level organizational unit.
    *   Fields: `id`, `name`, `description`, `ownerId`, `createdAt`, `updatedAt`.
    *   Relationships: `Many-to-one` with `User` (owner), `One-to-many` with `Projects`.
*   **`Project`**: Groups related tasks within a workspace.
    *   Fields: `id`, `name`, `description`, `workspaceId`, `ownerId`, `createdAt`, `updatedAt`.
    *   Relationships: `Many-to-one` with `Workspace`, `Many-to-one` with `User` (owner), `One-to-many` with `Tasks`.
*   **`Task`**: The core unit of work.
    *   Fields: `id`, `title`, `description`, `status`, `priority`, `dueDate`, `projectId`, `assigneeId`, `createdAt`, `updatedAt`.
    *   Relationships: `Many-to-one` with `Project`, `Many-to-one` with `User` (assignee), `One-to-many` with `Comments`, `Many-to-many` with `Tags`.
*   **`Comment`**: Provides contextual discussion on tasks.
    *   Fields: `id`, `content`, `taskId`, `authorId`, `createdAt`, `updatedAt`.
    *   Relationships: `Many-to-one` with `Task`, `Many-to-one` with `User` (author).
*   **`Tag`**: Categorizes tasks for better organization.
    *   Fields: `id`, `name`, `color`, `createdAt`, `updatedAt`.
    *   Relationships: `Many-to-many` with `Tasks`.

### Query Optimization:

*   **Indexes**: Applied on frequently queried columns (e.g., `user.email`, `user.username`, all foreign keys).
*   **Eager/Lazy Loading**: TypeORM allows controlling when related entities are loaded, optimizing query performance.
*   **Connection Pooling**: PostgreSQL connections are managed efficiently to reduce overhead.
*   **`QueryBuilder`**: Used for complex queries where the ORM's basic methods are insufficient for optimal performance.

## 6. DevOps & Infrastructure

### 6.1. Containerization

*   **Docker**: Each service (backend, frontend, database, Redis) is containerized using Dockerfiles. This ensures consistent environments across development, testing, and production.
*   **Docker Compose**: Used for local development to orchestrate multiple containers, define their networks, volumes, and dependencies.

### 6.2. CI/CD Pipeline

A GitHub Actions workflow (`.github/workflows/ci-cd.yml`) automates the following steps on pushes/pull requests to `main` and `develop` branches:

1.  **Build & Test (for both Backend and Frontend):**
    *   Checkout code.
    *   Set up Node.js.
    *   Install dependencies.
    *   Run unit, integration, and API tests (including coverage reports).
    *   Build production artifacts (TypeScript compilation for backend, React build for frontend).
    *   Build Docker images for each service.
    *   Push Docker images to a container registry (e.g., GitHub Container Registry - GHCR).
2.  **Deployment (conditional):**
    *   Only for pushes to the `main` branch.
    *   SSH into the production server (e.g., EC2).
    *   Pull the latest Docker images.
    *   Restart services using `docker compose up -d`.

## 7. Scalability & Reliability

*   **Stateless Backend**: JWT authentication makes the backend stateless, allowing horizontal scaling of API instances behind a load balancer.
*   **Database Scaling**: PostgreSQL can be scaled vertically (more resources) or horizontally (read replicas, sharding - more complex).
*   **Caching with Redis**: Reduces database load by serving frequently accessed data from a fast in-memory store.
*   **Containerization**: Facilitates deployment to container orchestration platforms like Kubernetes for auto-scaling and high availability.
*   **Health Checks**: Implemented in Docker Compose and conceptually for load balancers to ensure only healthy instances receive traffic.
*   **Robust Error Handling**: Prevents application crashes and provides meaningful feedback, improving system stability.

## 8. Security Considerations

*   **HTTPS**: Essential for encrypting communication between client and server in production. (Configured at load balancer/Nginx level).
*   **Password Hashing**: `bcrypt.js` is used to hash user passwords, preventing plaintext storage.
*   **JWT Security**:
    *   Secrets are stored securely in environment variables.
    *   Tokens have limited expiration times (`JWT_EXPIRES_IN`).
    *   Tokens are stored in `localStorage` on the client (consider `httpOnly` cookies for XSS resistance, but more complex for SPAs).
*   **Input Validation**: `Zod` is used for rigorous validation of all incoming API request data, preventing injection attacks and malformed data.
*   **Rate Limiting**: Protects against brute-force attacks and DoS.
*   **Helmet.js**: Adds various HTTP headers to improve security (e.g., XSS protection, MIME-type sniffing prevention).
*   **CORS Configuration**: Explicitly defines allowed origins to prevent cross-site request forgery (CSRF) for API calls.
*   **Least Privilege**: Database users should have only necessary permissions.
*   **Environment Variables**: Sensitive data (database credentials, JWT secrets) are loaded from environment variables and never hardcoded.
*   **Regular Security Audits**: Recommended for production systems.