# System Architecture Document

## 1. Introduction

This document outlines the architecture of the Enterprise-Grade C++ DevOps Automation System. It describes the high-level design, key components, their interactions, and the rationale behind significant design choices.

## 2. Goals and Principles

The primary goals of this architecture are:
*   **Modularity:** Clear separation of concerns to enhance maintainability and testability.
*   **Scalability:** Design choices that allow the system to handle increased load and data volumes.
*   **Reliability:** Robust error handling, logging, and monitoring to ensure operational stability.
*   **Security:** Implementation of authentication, authorization, and secure coding practices.
*   **Automation:** Full integration with CI/CD for rapid and reliable deployment.
*   **Performance:** Efficient C++ implementation and strategic use of caching and rate limiting.

Key architectural principles include:
*   **Layered Architecture:** Clear division into presentation, service, and data access layers.
*   **RESTful API Design:** Standardized and stateless communication interface.
*   **Microservices-oriented thinking (within a monolith):** While a single C++ application, components are designed to be relatively independent.
*   **Test-Driven Development (TDD) / Test-Friendly Design:** Components are designed to be easily testable.

## 3. High-Level Architecture

The system is primarily composed of a C++ backend application that exposes a RESTful API. It interacts with a relational database. The entire system is containerized using Docker, enabling consistent deployment across different environments.

```mermaid
graph TD
    UserClient[User Client (Browser/Mobile/CLI)] -- HTTP/HTTPS --> LoadBalancer
    LoadBalancer -- HTTP/HTTPS --> NginxProxy[Nginx/API Gateway]
    NginxProxy -- HTTP/HTTPS --> AppContainer[C++ Application Container]
    AppContainer -- SQL Queries --> DatabaseContainer[Database (SQLite/PostgreSQL) Container]

    subgraph CI/CD Pipeline
        SourceCode[Source Code (GitHub)] --> GitHubActions[GitHub Actions]
        GitHubActions -- Build --> DockerRegistry[Docker Registry]
        GitHubActions -- Test --> TestingSuite[Unit/Integration/API/Performance Tests]
        GitHubActions -- Deploy --> Kubernetes/VMs[Production Environment (Kubernetes/VMs)]
    end

    AppContainer -- Logs --> CentralizedLogging[Centralized Logging (ELK/Loki)]
    AppContainer -- Metrics --> MonitoringSystem[Monitoring (Prometheus/Grafana)]
```

## 4. Component Breakdown

### 4.1 C++ Backend Application (`app/src`)

The core of the system, implementing the business logic and API endpoints.

#### 4.1.1 Web Server & Routing (`main.cpp`, `controllers/`)
*   **Framework:** `CrowCpp` is used as a lightweight C++ web framework.
*   **Role:** Handles HTTP request parsing, routing to appropriate controllers, and sending HTTP responses.
*   **Middleware:** Integrates various middlewares for cross-cutting concerns (Authentication, Authorization, Logging, Rate Limiting, Error Handling).

#### 4.1.2 Controllers (`app/src/controllers/`)
*   **Responsibility:** Act as the entry points for API requests. They receive requests, extract data, perform input validation, and delegate business logic execution to the Service Layer.
*   **Design:** Each resource (e.g., `User`, `Product`, `Auth`) has its dedicated controller.
*   **Output:** Formats responses (JSON) and handles HTTP status codes.

#### 4.1.3 Services (`app/src/services/`)
*   **Responsibility:** Encapsulate the core business logic. They orchestrate operations involving one or more models, enforce business rules, and interact with the Data Access Layer.
*   **Design:** Each logical domain (e.g., `UserService`, `ProductService`, `AuthService`) has a corresponding service.
*   **Transaction Management:** (Implicitly handled by `Database` utility or explicit in complex operations).

#### 4.1.4 Models (`app/src/models/`)
*   **Responsibility:** Define the data structures for domain entities (e.g., `User`, `Product`, `Order`).
*   **Design:** Simple C++ structs/classes that represent the data, often with methods for serialization/deserialization to/from JSON or database rows.

#### 4.1.5 Utilities (`app/src/utils/`)
*   **`Database`:** Wrapper around `SQLiteCpp` to manage database connections, execute queries, and handle transactions. Provides a higher-level abstraction for data persistence.
*   **`JWT`:** Handles the creation, signing, and verification of JSON Web Tokens for authentication.
*   **`Logger`:** A wrapper for `spdlog` to provide structured and configurable logging throughout the application.
*   **`ErrorHandler`:** Defines custom exception types and provides a global exception handler middleware to catch exceptions and return consistent JSON error responses.
*   **`Caching`:** A simple in-memory key-value cache with Time-To-Live (TTL) functionality, used to reduce database load for frequently accessed data.
*   **`RateLimiter`:** Implements a fixed-window rate limiting algorithm to prevent abuse and protect API endpoints from excessive requests.
*   **`Middleware`:** Contains custom Crow middleware for authentication, authorization, logging, and rate limiting, applied globally or per-route.

### 4.2 Database Layer (`db/`)

*   **Type:** SQLite for local development and simplicity. Can be easily swapped for PostgreSQL or MySQL in production by changing `Database` utility and `Dockerfile`.
*   **Schema:** `schema.sql` defines tables, indexes, and constraints.
*   **Migrations:** A `migrations/` directory holds scripts to evolve the database schema over time.
*   **Seed Data:** `seed.sql` populates the database with initial data.

### 4.3 Containerization (`Dockerfile`, `docker-compose.yml`)

*   **`Dockerfile`:** Defines how to build the C++ application into a Docker image. It includes dependencies, build steps, and runtime configuration. Multi-stage builds are used for smaller production images.
*   **`docker-compose.yml`:** Orchestrates multi-container Docker applications. Used for local development to easily spin up the C++ app and the database.

### 4.4 CI/CD Pipeline (`.github/workflows/ci-cd.yml`)

*   **Tool:** GitHub Actions.
*   **Stages:**
    *   **Build:** Compiles the C++ application and builds the Docker image.
    *   **Test:** Executes unit, integration, API, and performance tests.
    *   **Image Push:** Pushes the built Docker image to a container registry.
    *   **Deployment:** (Placeholder) Triggers deployment to a production environment (e.g., Kubernetes, Cloud VMs).

### 4.5 Testing Frameworks (`app/tests/`)

*   **Unit/Integration:** Google Test for C++ code.
*   **API:** `curl` scripts for basic endpoint validation.
*   **Performance:** `hey` (or `ab`) for load generation and performance metrics.

## 5. Data Flow Example: User Registration

1.  **Client Request:** A client sends a `POST /auth/register` request with `username`, `email`, `password`, and `role`.
2.  **Web Server (Crow):** Receives the request.
3.  **Middleware:**
    *   `LoggingMiddleware`: Logs the incoming request.
    *   `RateLimiterMiddleware`: Checks if the client's IP has exceeded the rate limit. If so, rejects the request.
4.  **AuthController:**
    *   Receives the request body.
    *   Validates input data (e.g., email format, password strength).
    *   Calls `AuthService::registerUser()`.
5.  **AuthService:**
    *   Checks if the username or email already exists using `UserService`.
    *   Hashes the password.
    *   Creates a `User` object.
    *   Calls `UserService::createUser()` to persist the user.
    *   If successful, generates a JWT token using `JWT` utility.
6.  **UserService:**
    *   Constructs an SQL `INSERT` query.
    *   Uses `Database` utility to execute the query.
7.  **Database Utility:**
    *   Obtains a database connection.
    *   Executes the `INSERT` query.
    *   Handles potential database errors.
8.  **AuthService:** Returns the newly created user's ID and the JWT token.
9.  **AuthController:** Formats a success JSON response with the user data and token, and sends it back to the client (HTTP 201 Created).
10. **Error Handling:** If any component throws an exception, `ErrorHandlerMiddleware` catches it and returns a consistent JSON error response (e.g., HTTP 400, 401, 500).

## 6. Security Considerations

*   **Authentication:** JWT-based, ensuring stateless and secure API interactions. Tokens are short-lived.
*   **Authorization:** Simple role-based access control implemented via middleware.
*   **Password Hashing:** Passwords are never stored in plain text (use a strong hashing algorithm like bcrypt).
*   **Rate Limiting:** Protects against brute-force attacks and denial-of-service.
*   **Input Validation:** All API inputs are strictly validated to prevent injection attacks and other vulnerabilities.
*   **HTTPS:** Assumed in production (handled by load balancer/reverse proxy).
*   **Secrets Management:** Environment variables (`.env`) for local, dedicated secrets management in production (e.g., Kubernetes Secrets, AWS Secrets Manager).

## 7. Observability

*   **Logging:** `spdlog` provides structured logging with different levels. Logs can be collected by a centralized logging system (e.g., ELK Stack, Loki).
*   **Monitoring:** Describe how to integrate with Prometheus (for metrics like request count, error rates, latency) and Grafana (for visualization). The C++ app can expose a `/metrics` endpoint.
*   **Tracing:** For distributed systems, tracing (e.g., OpenTelemetry) would be integrated, but for a monolith, detailed logging is sufficient initially.

## 8. Future Enhancements

*   **Database Abstraction:** More robust ORM for C++ or a custom abstraction layer supporting multiple SQL databases.
*   **Asynchronous Operations:** Integrating `boost::asio` or `libuv` for fully asynchronous I/O if `CrowCpp`'s internal model isn't sufficient under extreme load.
*   **Microservices:** Decomposing specific domains into independent services.
*   **Advanced Caching:** Distributed caching solutions (e.g., Redis).
*   **Service Mesh:** For managing microservices (e.g., Istio).
*   **Container Orchestration:** Full Kubernetes deployment setup.

This architecture provides a solid foundation for building and operating a reliable and scalable C++ application within a modern DevOps environment.