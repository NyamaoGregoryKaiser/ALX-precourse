# System Architecture - Task Management System

This document outlines the high-level architecture of the Enterprise-Grade Task Management System.

## Table of Contents

1.  [Overview](#1-overview)
2.  [System Components](#2-system-components)
    *   [Backend Application](#21-backend-application-cpp)
    *   [Database Layer](#22-database-layer-postgresql)
    *   [CLI Client](#23-cli-client-cpp)
    *   [Containerization](#24-containerization-docker)
3.  [Architectural Patterns](#3-architectural-patterns)
    *   [Layered Architecture](#31-layered-architecture)
    *   [Microservices Principles (Applied)](#32-microservices-principles-applied)
    *   [API-First Design](#33-api-first-design)
4.  [Data Flow](#4-data-flow)
5.  [Key Design Decisions](#5-key-design-decisions)
    *   [Technology Stack](#51-technology-stack)
    *   [Authentication & Authorization](#52-authentication--authorization)
    *   [Error Handling](#53-error-handling)
    *   [Configuration Management](#54-configuration-management)
6.  [Scalability & Performance](#6-scalability--performance)
7.  [Security Considerations](#7-security-considerations)
8.  [Testing Strategy](#8-testing-strategy)
9.  [Future Enhancements](#9-future-enhancements)

---

## 1. Overview

The Task Management System is a robust application designed to manage tasks, projects, and users effectively. It follows a client-server model, where a C++ backend provides a RESTful API, consumed by a C++ command-line client and potentially other clients (e.g., web or mobile applications). The entire system is containerized using Docker for ease of deployment and scalability.

**High-Level Diagram:**

```
+-------------------+      +-------------------+      +---------------------+
|    CLI Client     |<---->|  Load Balancer    |<---->|  Backend (C++ API)  |
|      (C++)        |      |    (Nginx/HAProxy)|      |    (Drogon)         |
+-------------------+      +-------------------+      +---------------------+
                                     ^                       |
                                     |                       | (ORM)
                                     |                       V
                                     |           +-------------------------+
                                     +-----------|    PostgreSQL Database  |
                                                 | (Users, Projects, Tasks)|
                                                 +-------------------------+
```

*(Note: Load Balancer is shown for production context; locally, clients connect directly to the backend.)*

## 2. System Components

### 2.1. Backend Application (C++)

The core of the system, implemented using the **Drogon Web Framework**. It's responsible for:
*   Exposing RESTful API endpoints.
*   Implementing business logic (CRUD operations, validation, state transitions).
*   Interacting with the database via Drogon's ORM.
*   Handling authentication and authorization.
*   Logging, error handling, and applying middleware (filters).

**Internal Structure:**

```
backend/
├── src/
│   ├── main.cc                   <-- Entry point, server setup
│   ├── controllers/              <-- API request handlers (Auth, User, Project, Task, Tag)
│   │   └── (Request parsing, validation, service invocation, response formatting)
│   ├── filters/                  <-- Middleware (AuthFilter, AdminFilter, RateLimitFilter)
│   │   └── (Pre-request processing: JWT validation, permission checks, rate limiting)
│   ├── services/                 <-- Business logic layer
│   │   └── (Orchestrates ORM calls, applies business rules, transactional logic)
│   ├── models/                   <-- Drogon ORM generated models (User, Project, Task, Tag)
│   │   └── (Represents database tables, handles basic data persistence)
│   ├── utils/                    <-- Shared utilities (JWT handling, custom errors, JSON helpers)
│   │   └── (Helper functions, common logic)
│   └── config/                   <-- Configuration loading
│       └── (Loads .env variables and config.json)
```

### 2.2. Database Layer (PostgreSQL)

A relational database management system chosen for its robustness, reliability, and powerful feature set.
*   **Schema**: Defines tables for `users`, `projects`, `tasks`, `tags`, and junction tables (`project_tasks`, `task_tags`).
*   **Drogon ORM**: Provides an object-relational mapping, abstracting SQL queries into C++ objects, enhancing type safety and developer productivity.
*   **Migrations**: SQL scripts manage schema evolution.
*   **Query Optimization**: Utilizes proper indexing, efficient queries, and transactions managed by the ORM.

### 2.3. CLI Client (C++)

A standalone C++ executable that serves as a client to the backend API.
*   **HTTP Client**: Uses `libcurl` or a similar library to make HTTP requests.
*   **Authentication**: Stores and sends JWT tokens received from the backend.
*   **User Interface**: Provides command-line interface for users to interact with tasks, projects, etc.
*   **JSON Parsing**: Parses JSON responses from the backend to display information to the user.

### 2.4. Containerization (Docker)

Docker is used to package the backend application and its dependencies into isolated containers.
*   **Dockerfile**: Defines how to build the backend application image.
*   **docker-compose.yml**: Orchestrates the backend application container, PostgreSQL database container, and potentially other services like Redis.
*   **init-db.sh**: A script run within the database container to apply migrations and seed data, ensuring a consistent database state.

## 3. Architectural Patterns

### 3.1. Layered Architecture

The backend follows a typical 3-tier layered architecture:

*   **Presentation Layer (Controllers)**: Handles HTTP requests, parses input, calls appropriate services, and formats JSON responses.
*   **Business Logic Layer (Services)**: Contains the core application logic, rules, and workflows. It orchestrates interactions with the data layer.
*   **Data Access Layer (ORM Models)**: Interacts with the database, performing CRUD operations and mapping relational data to C++ objects.

This separation of concerns improves maintainability, testability, and scalability.

### 3.2. Microservices Principles (Applied)

While implemented as a monolithic application for initial simplicity and C++ constraints, some microservices principles are adopted:
*   **Modularity**: Clear separation of concerns into distinct modules (Auth, User, Project, Task, Tag) with well-defined interfaces (services).
*   **API-First**: Emphasis on designing robust, well-documented RESTful APIs.
*   **Containerization**: Each core component (backend, DB) is a separate container, facilitating future breakdown into microservices if needed.

### 3.3. API-First Design

The system is built with an API-first approach, meaning the RESTful API endpoints are considered primary interfaces. This ensures consistency, reusability, and facilitates integration with various client applications (CLI, web, mobile).

## 4. Data Flow

1.  **Client Request**: A CLI command (or web request) is sent to the backend API endpoint.
2.  **HTTP Server (Drogon)**: Receives the request.
3.  **Middleware/Filters**:
    *   `RateLimitFilter`: Checks if the client has exceeded request limits.
    *   `AuthFilter`: Validates the JWT token in the request header for authenticated routes.
    *   `AdminFilter`: (If applicable) Checks user roles for administrative routes.
4.  **Controller**: Maps the request to the appropriate controller method. Parses request body/parameters.
5.  **Service Layer**: The controller calls a method in the relevant service (e.g., `TaskService`). The service implements business logic, validation, and authorization checks based on the authenticated user's context.
6.  **Data Access Layer (ORM)**: The service interacts with Drogon's ORM models to perform database operations (e.g., fetch, create, update, delete tasks).
7.  **Database (PostgreSQL)**: Executes SQL queries.
8.  **Response Back**: Database results are returned to the ORM, then to the service, then formatted by the controller into a JSON response.
9.  **HTTP Server (Drogon)**: Sends the JSON response back to the client.
10. **Client Processing**: The CLI client receives the JSON, parses it, and displays information to the user.

## 5. Key Design Decisions

### 5.1. Technology Stack

*   **Backend**: C++ with **Drogon Web Framework**: Chosen for its high performance, modern C++ features, asynchronous nature, and built-in ORM.
*   **Database**: **PostgreSQL**: Robust, open-source, ACID-compliant, and feature-rich relational database.
*   **Authentication**: **JWT (JSON Web Tokens)**: Stateless, scalable authentication mechanism suitable for distributed systems.
*   **C++ Libraries**: `jwt-cpp` for JWT handling, `libcurl` for client-side HTTP, `jsoncpp` for general JSON utilities, `Google Test` for testing.

### 5.2. Authentication & Authorization

*   **Authentication**: Users register with username/password. Passwords are cryptographically hashed (BCrypt). Upon successful login, a JWT is issued. This token must be included in `Authorization: Bearer <token>` header for protected routes.
*   **Authorization**: Simple role-based access control (RBAC) with `user` and `admin` roles. `AdminFilter` or service-level checks enforce permissions. JWT payloads include user ID and roles.

### 5.3. Error Handling

*   **Custom Exceptions**: Defined in `AppErrors.h` to differentiate between various application-specific errors (e.g., `NotFoundException`, `UnauthorizedException`, `ValidationException`).
*   **Global Handler**: Drogon's framework is configured to catch these exceptions and map them to appropriate HTTP status codes and standardized JSON error responses. This ensures a consistent error API.

### 5.4. Configuration Management

*   **Environment Variables**: Used for sensitive data (database credentials, JWT secret) and environment-specific settings (ports, API URLs). Loaded via a `ConfigLoader` utility.
*   **`config.json`**: Drogon-specific server configurations (logging, HTTP server settings).
*   **Docker Compose `.env`**: Centralizes environment variables for Dockerized deployments.

## 6. Scalability & Performance

*   **Asynchronous I/O (Drogon)**: Drogon's event-driven, non-blocking architecture allows handling many concurrent connections efficiently.
*   **Database Indexing**: Critical for query performance, especially on `id`, `user_id`, `project_id`, `created_at`, `due_date` columns.
*   **Connection Pooling**: Drogon's ORM manages database connection pools to reduce overhead.
*   **Caching (Future)**: Integration with **Redis** can dramatically improve performance by caching frequently accessed data (e.g., user profiles, project details) and managing session state.
*   **Rate Limiting**: Protects against abuse and ensures fair resource usage, preventing server overload.
*   **Horizontal Scaling**: Backend containers can be scaled horizontally behind a load balancer.

## 7. Security Considerations

*   **Input Validation**: All incoming API requests are validated to prevent injection attacks (SQL, XSS).
*   **Password Hashing**: BCrypt is used for strong password hashing.
*   **JWT Security**: Tokens are signed using a strong secret. Short expiry times and a token revocation mechanism (e.g., blacklist in Redis) can be implemented.
*   **HTTPS**: For production, all API traffic *must* be served over HTTPS to protect against man-in-the-middle attacks. Nginx/Load Balancer would handle SSL termination.
*   **Least Privilege**: Database users are granted only necessary permissions.
*   **Dependency Management**: Keep C++ libraries updated to mitigate known vulnerabilities.

## 8. Testing Strategy

*   **Unit Tests**: Focus on individual components (services, utilities, specific business logic functions) in isolation using **Google Test**. Aim for high code coverage (80%+).
*   **Integration Tests**: Verify the interaction between different components (e.g., controllers calling services, services interacting with the ORM/database). Drogon's testing utilities allow mocking HTTP requests.
*   **API Tests**: End-to-end tests for critical API endpoints, ensuring correct responses, status codes, and data integrity. Can be done with the integration tests or external tools like Postman/cURL.
*   **Performance Tests (Future)**: Using tools like `Locust` or `JMeter` to simulate load and identify bottlenecks.

## 9. Future Enhancements

*   **Real-time Updates**: WebSockets for immediate task updates to clients.
*   **Notifications**: Email/in-app notifications for task assignments, due dates.
*   **Advanced Search & Filtering**: More sophisticated query capabilities.
*   **File Attachments**: Ability to attach files to tasks/projects.
*   **UI Frontend**: A proper web-based frontend using a JavaScript framework (React, Vue, Angular) or a native mobile application.
*   **Admin Dashboard**: Dedicated interface for managing users, roles, and system settings.
*   **Background Jobs**: Separate worker processes for long-running tasks (e.g., data export, complex reporting).
*   **OpenAPI/Swagger Integration**: Generate API documentation directly from code.