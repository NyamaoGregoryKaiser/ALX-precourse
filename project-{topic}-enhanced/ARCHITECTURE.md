# Architecture Document: Data Visualization Tools System

## 1. Introduction

This document provides a detailed overview of the architecture for the Data Visualization Tools System. The system is designed to be robust, scalable, and performant, enabling users to create, manage, and share interactive data visualizations and dashboards.

## 2. Goals & Principles

*   **Performance**: Optimize data processing and API response times.
*   **Scalability**: Design for horizontal scaling of backend services and database.
*   **Reliability**: Implement error handling, logging, and monitoring for high availability.
*   **Security**: Secure data at rest and in transit, implement robust authentication and authorization.
*   **Flexibility**: Support diverse data sources and visualization types.
*   **Maintainability**: Clear separation of concerns, modular design, comprehensive testing.

## 3. High-Level Architecture

The system follows a typical three-tier web application architecture, with a distinct client, server, and data storage layer.

```mermaid
graph TD
    User(Browser/Client)
    User --> |HTTP/S| CDN[CDN / Load Balancer]
    CDN --> Frontend[Frontend Application]
    Frontend --> |REST API (HTTP/S)| BackendGW[API Gateway / Backend Load Balancer]

    subgraph Backend Services
        BackendGW --> AuthService[Auth Service (C++)]
        BackendGW --> DataService[Data Service (C++)]
        BackendGW --> VizService[Visualization Service (C++)]
        BackendGW --> DashboardService[Dashboard Service (C++)]
    end

    AuthService <--> Database[PostgreSQL Database]
    DataService <--> Database
    VizService <--> Database
    DashboardService <--> Database

    DataService <--> ExternalDS[External Data Sources]
    VizService <--> Cache[Redis Cache]

    BackendGW -- Monitoring/Logs --> Observability[Prometheus, Grafana, ELK Stack]
    BackendGW -- Rate Limiting --> RateLimit[Rate Limiter (e.g., Nginx, Envoy)]
    BackendGW -- Caching --> Cache
```

**Key components:**

*   **Client (Frontend Application)**: A single-page application (SPA) built with a modern JavaScript framework (e.g., React, Vue, Angular). It's responsible for user interface, interactive dashboard layouts, and rendering charts using libraries like D3.js or Plotly.js. It communicates with the C++ backend via RESTful APIs.
*   **Backend Services (C++)**: The core application logic. This could be a monolithic C++ application or split into multiple C++ microservices (e.g., Auth, Data, Visualization, Dashboard) for larger scale. For simplicity in this blueprint, it's structured as a modular monolithic C++ application.
    *   **HTTP Server**: Handles all incoming requests (Boost.Beast).
    *   **Router**: Maps incoming requests to appropriate controllers and applies middlewares.
    *   **Middlewares**: Intercepts requests for cross-cutting concerns (authentication, authorization, logging, error handling, rate limiting, caching).
    *   **Controllers**: Implement API endpoints and orchestrate business logic.
    *   **Business Logic / Data Processing Engine**: The heart of the data handling. Written in C++ for performance, capable of filtering, aggregating, joining, and transforming data.
    *   **Database Layer**: Manages secure and efficient interaction with the PostgreSQL database using `libpqxx`.
    *   **Caching Layer**: Integrates with Redis for caching frequently accessed data or processed visualization results.
*   **Database (PostgreSQL)**: A robust relational database management system. It stores metadata for users, data sources, visualization configurations, and dashboard layouts. It also acts as a data lake for small to medium file-based data sources (e.g., CSV uploads).
*   **External Data Sources**: The system can connect to various external data sources (other databases, APIs, cloud storage) to fetch data for processing and visualization.
*   **Redis Cache**: An in-memory data structure store used for caching API responses, processed visualization data, and potentially session data (e.g., JWT blacklists).
*   **Logging & Monitoring**: Integrated logging (e.g., custom C++ logger, spdlog) and metrics collection (e.g., Prometheus exporters) to observe system health and performance.

## 4. Detailed Backend Architecture (C++)

The C++ backend is designed with modularity and performance in mind.

### 4.1. Core Modules

*   **`server/`**:
    *   `HttpServer`: Boost.Beast-based HTTP server for handling TCP connections and HTTP parsing.
    *   `Router`: Dispatches requests to appropriate handlers based on method and path, supports path parameters.
    *   `middlewares/`: Global and route-specific interceptors for cross-cutting concerns (Auth, Rate Limiting, Error Handling).
    *   `controllers/`: Contains handler functions for specific API endpoints (Auth, Data Sources, Visualizations, Dashboards). Each controller is responsible for validating input, orchestrating business logic, and returning responses.
*   **`core/`**:
    *   `DataProcessor`: Implements the core business logic for data manipulation. This includes filtering, aggregation (sum, average, count), sorting, and potentially basic data type inference and conversion. Optimized for speed using efficient C++ algorithms.
    *   `CsvParser`: Utility for parsing CSV files, handling delimiters, quoted fields, and headers.
    *   `JsonParser`: (Implicit, via `nlohmann/json`) For handling JSON configuration and data.
*   **`database/`**:
    *   `DBManager`: An abstraction layer for PostgreSQL interaction using `libpqxx`. Manages connection, transaction, and provides CRUD operations for application entities (Users, Data Sources, Visualizations, Dashboards).
    *   `models/`: Plain Old Data Structures (PODs) representing database entities (e.g., `User`, `DataSource`). Includes methods for JSON serialization/deserialization.
    *   `repositories/`: (Conceptual, for larger scale) Specialized classes for complex database queries for each entity.
*   **`utils/`**:
    *   `Logger`: Custom logging utility for structured and configurable output (DEBUG, INFO, WARN, ERROR).
    *   `JWT`: Helper for generating and verifying JSON Web Tokens. (Note: Production implementation needs a robust cryptographic library).
    *   `Cache`: Interface/client for interacting with an external caching service like Redis.

### 4.2. Data Flow (Example: Get Visualization Data)

1.  **Client Request**: Frontend requests `/api/v1/visualizations/{id}/data`.
2.  **HTTP Server**: `HttpServer` receives the request, parses HTTP, and passes it to `Router`.
3.  **Middlewares**:
    *   `ErrorHandler` (global): Catches exceptions.
    *   `RateLimiter` (global): Checks request rate.
    *   `AuthMiddleware` (route-group specific): Validates JWT from `Authorization` header, extracts `user_id`, and attaches it to the `HttpRequest` object. If token is invalid/missing, returns `401/403`.
4.  **Router**: Matches the request to `VisualizationController::getVisualizationData` and populates `req.params["id"]`.
5.  **Visualization Controller**:
    *   Fetches `Visualization` by `id` from `DBManager`.
    *   Verifies `user_id` matches the authenticated user.
    *   Fetches associated `DataSource` by `data_source_id` from `DBManager`.
    *   Determines data source type (e.g., "CSV").
    *   Reads raw data: If CSV, uses `CsvParser` to read from `data_uploads/{file_path}`. If PostgreSQL, it would connect to the external DB (or use another `DBManager` instance).
    *   Parses `Visualization.configuration` (JSON string) to extract processing instructions (filters, aggregations, x/y-axis mappings).
    *   Passes raw data and configuration to `DataProcessor::process()`.
6.  **Data Processor**: Applies configured transformations to the raw data. This is where the core algorithms for filtering, grouping, and summing data occur.
7.  **Response**: The processed data (as JSON) is returned through the `VisualizationController`, back through middlewares, and sent by the `HttpServer` to the client.

## 5. Data Storage

### 5.1. PostgreSQL Schema

*   **`users`**: Stores user authentication and profile information.
    *   `id` (UUID, PK)
    *   `username` (VARCHAR, UNIQUE)
    *   `email` (VARCHAR, UNIQUE, Indexed)
    *   `password_hash` (TEXT)
    *   `created_at`, `updated_at` (TIMESTAMP)
*   **`data_sources`**: Stores metadata about data sources.
    *   `id` (UUID, PK)
    *   `user_id` (UUID, FK to `users`, Indexed, CASCADE DELETE)
    *   `name` (VARCHAR, UNIQUE per user)
    *   `type` (VARCHAR: 'CSV', 'PostgreSQL', 'API')
    *   `connection_string` (TEXT, nullable, for DB/API connections)
    *   `schema_definition` (JSONB, nullable, for explicit schema if needed)
    *   `file_path` (TEXT, nullable, for local file paths)
    *   `created_at`, `updated_at` (TIMESTAMP)
*   **`visualizations`**: Stores visualization configurations.
    *   `id` (UUID, PK)
    *   `user_id` (UUID, FK to `users`, Indexed, CASCADE DELETE)
    *   `name` (VARCHAR, UNIQUE per user)
    *   `description` (TEXT, nullable)
    *   `data_source_id` (UUID, FK to `data_sources`, Indexed, CASCADE DELETE)
    *   `type` (VARCHAR: 'bar_chart', 'line_chart', 'pie_chart', etc.)
    *   `configuration` (JSONB, detailed chart options, data mappings, transforms)
    *   `created_at`, `updated_at` (TIMESTAMP)
*   **`dashboards`**: Stores dashboard layouts and contained visualization references.
    *   `id` (UUID, PK)
    *   `user_id` (UUID, FK to `users`, Indexed, CASCADE DELETE)
    *   `name` (VARCHAR, UNIQUE per user)
    *   `description` (TEXT, nullable)
    *   `layout_config` (JSONB, defines grid layout and which visualizations (by ID) are placed where)
    *   `created_at`, `updated_at` (TIMESTAMP)

### 5.2. Query Optimization

*   **Indexes**: Already applied on foreign keys and frequently searched columns (e.g., `users.email`).
*   **Prepared Statements**: `libpqxx` uses prepared statements which improve performance and security.
*   **Connection Pooling**: Managed by `libpqxx` at the application level; for very high concurrency, an external pooler like PgBouncer might be considered.
*   **Data Types**: Use appropriate PostgreSQL data types (`JSONB` for flexible schema, `UUID` for IDs) to ensure efficiency.
*   **Disk Storage**: For large CSVs, storing them on disk (e.g., `data_uploads/`) and processing on demand is better than storing in `TEXT` columns in PostgreSQL.

## 6. Security Considerations

*   **Authentication**: JWT-based, ensuring stateless authentication and scalability. Tokens stored client-side (e.g., `localStorage`).
*   **Authorization**: Every API endpoint verifies `user_id` from the JWT against resource ownership (`user_id` column in `data_sources`, `visualizations`, `dashboards`). Role-based access control (RBAC) could be extended.
*   **Password Hashing**: **Critical**: In a production system, replace the placeholder `hashPassword` and `verifyPassword` functions with a strong Key Derivation Function (KDF) like Argon2, bcrypt, or scrypt.
*   **Input Validation**: Strict validation of all incoming API request data (JSON body, query parameters, path parameters) to prevent injection attacks and ensure data integrity.
*   **SQL Injection Prevention**: `libpqxx` uses parameterized queries by default, preventing SQL injection.
*   **HTTPS**: All communication between client and backend should be over HTTPS. This is handled at the load balancer/proxy level in production.
*   **Secret Management**: Environment variables for database credentials, JWT secrets, etc., managed securely (e.g., Docker Secrets, Kubernetes Secrets, Vault).
*   **Dependency Scanning**: Integrate tools like Trivy (as shown in CI/CD) to scan Docker images for known vulnerabilities.

## 7. Scalability and High Availability

*   **Stateless Backend**: The C++ backend is designed to be largely stateless (JWT for auth, Redis for cache), allowing easy horizontal scaling by running multiple instances behind a load balancer.
*   **Database Scaling**: PostgreSQL can scale vertically (larger instance) and horizontally (read replicas). For extreme scale, sharding or a distributed database might be considered.
*   **Caching**: Redis reduces database load for frequently accessed static/semi-static data.
*   **Asynchronous Processing**: For very large data ingestion or complex processing tasks, consider offloading to background worker queues (e.g., RabbitMQ, Kafka + C++ worker processes) to avoid blocking the API server. Boost.Asio's `io_context` design inherently supports asynchronous I/O.
*   **Containerization**: Docker and Docker Compose provide portability and consistent environments; Kubernetes would be the next step for orchestration in production.

## 8. Observability

*   **Logging**: Structured logging (JSON format recommended) to capture application events, errors, and debugging information.
*   **Monitoring**: Collect key metrics (request rates, error rates, response times, CPU/memory usage) using tools like Prometheus and visualize with Grafana.
*   **Tracing**: Distributed tracing (e.g., OpenTelemetry) could be integrated for debugging complex interactions in a microservices environment.

## 9. Future Enhancements

*   **Role-Based Access Control (RBAC)**: More granular permissions for resources.
*   **Multi-Tenancy**: Support for multiple isolated organizations within the same platform.
*   **Advanced Data Connectors**: Connectors for cloud data warehouses (Snowflake, BigQuery, Redshift), streaming data (Kafka).
*   **Real-time Visualizations**: WebSockets for live data updates.
*   **Machine Learning Integration**: Integrate C++ ML libraries for advanced analytics directly within the data processing engine.
*   **Version Control for Visualizations/Dashboards**: Track changes and revert.
*   **Frontend Caching**: ETag headers, client-side data caches.