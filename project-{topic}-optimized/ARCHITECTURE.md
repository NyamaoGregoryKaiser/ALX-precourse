# Mobile Task Manager Backend - Architecture Document

This document outlines the architecture of the Mobile Task Manager Backend, detailing its core components, interactions, and design principles.

## 1. High-Level Architecture

The backend follows a microservice-lite or modular monolith approach, structured around a FastAPI application, interacting with a PostgreSQL database and Redis for caching/rate limiting. It's designed for an API-first mobile application, providing clear endpoints for client consumption.

```
+----------------+       +-------------------+       +-----------------+
| Mobile Client  | <---> | Load Balancer/API | <---> |  FastAPI App    |
| (iOS/Android)  |       |     Gateway       |       |  (Python/Uvicorn)|
+----------------+       +-------------------+       |                 |
                                                     |  - API Endpoints|
                                                     |  - Auth/AuthZ   |
                                                     |  - Business Logic|
                                                     |  - Caching      |
                                                     |  - Rate Limiting|
                                                     +--------+--------+
                                                              |
                                                    +---------+----------+
                                                    |                    |
                                            +-------v-------+   +--------v--------+
                                            |  PostgreSQL   |   |     Redis       |
                                            |   (Database)  |   | (Cache/RateLimit)|
                                            |               |   |                 |
                                            | - User Data   |   | - Session/Token |
                                            | - Project Data|   | - Rate Limiters |
                                            | - Task Data   |   | - Cached Data   |
                                            +---------------+   +-----------------+
```

## 2. Core Components

### 2.1. FastAPI Application (`app/`)

The heart of the backend, implemented using FastAPI.

*   **`main.py`**:
    *   Initializes the FastAPI application.
    *   Configures global middleware (CORS, Logging, Request Timing).
    *   Registers custom exception handlers (Validation Errors, HTTP Exceptions, Generic Errors).
    *   Includes API routers from `app/api/v1/`.
    *   Manages application lifecycle events (startup: DB/Redis connection, rate limiter init; shutdown: DB/Redis disconnect).
*   **`api/v1/`**:
    *   Contains versioned API endpoints (`auth.py`, `users.py`, `projects.py`, `tasks.py`).
    *   Each file defines routes for a specific resource, enforcing authentication and authorization using FastAPI's dependency injection system.
*   **`crud/`**:
    *   Provides a layer of abstraction for database operations (Create, Read, Update, Delete).
    *   `base.py` offers a generic CRUD class for common operations.
    *   Specific CRUD classes (`user.py`, `project.py`, `task.py`) extend `CRUDBase` and add domain-specific logic (e.g., `get_by_email` for users, `get_multi_by_owner` for projects).
    *   This separation ensures business logic in API endpoints is lean and reusable database logic is centralized.
*   **`models/`**:
    *   Defines SQLAlchemy ORM models (`user.py`, `project.py`, `task.py`) that map to database tables.
    *   Uses `app/db/base_class.py` for common attributes (UUID `id`, `created_at`, `updated_at`).
    *   Relationships between models (e.g., User has Projects, Project has Tasks) are defined here.
*   **`schemas/`**:
    *   Pydantic models for data validation, serialization, and deserialization.
    *   Used for request bodies (`Create`, `Update` schemas) and response bodies (`Read` schemas).
    *   Ensures data integrity and consistent API contracts.
*   **`core/`**:
    *   **`config.py`**: Manages application settings and environment variables using Pydantic Settings.
    *   **`security.py`**: Handles password hashing (bcrypt) and JWT token creation/verification.
    *   **`dependencies.py`**: Defines FastAPI dependency injection functions for common tasks:
        *   `get_db`: Provides an `AsyncSession` to route handlers.
        *   `get_current_user`: Extracts and validates JWT token, fetches the current user, enforcing authentication.
        *   `get_current_active_superuser`: Extends `get_current_user` to enforce superuser authorization.
    *   **`errors.py`**: Custom exception classes for common HTTP error scenarios (e.g., `NotFoundException`, `ForbiddenException`).
    *   **`caching.py`**: Manages Redis connection and client instance.
*   **`db/`**:
    *   **`session.py`**: Configures the SQLAlchemy `AsyncEngine` and `AsyncSessionLocal` for asynchronous database interactions.
    *   **`base_class.py`**: The declarative base for SQLAlchemy models, providing UUID IDs and timestamps.
    *   **`init_db.py`**: Script for initial database seeding (e.g., creating a default superuser).

### 2.2. Database (PostgreSQL)

*   **Persistent Storage**: Stores all application data (users, projects, tasks).
*   **SQLAlchemy ORM**: Used for programmatic interaction, abstracting raw SQL.
*   **Alembic**: Manages database schema changes through migrations, ensuring safe and version-controlled updates.
*   **Query Optimization**: Utilizes indexing on frequently queried columns and eager loading (`selectinload`) to prevent N+1 issues.

### 2.3. Caching & Rate Limiting (Redis)

*   **Caching**: Redis is used for a simple caching layer, primarily for JWT token to user ID mapping. This can be extended to cache frequently accessed user profiles, project lists, or other data to reduce database load.
*   **Rate Limiting**: `fastapi-limiter` library leverages Redis to implement API rate limiting, protecting the backend from abuse and ensuring fair usage.

## 3. Data Flow

1.  **Client Request**: A mobile client sends an HTTP request to the API.
2.  **API Gateway/Load Balancer (Optional in Dev)**: (In production) Routes the request to an available FastAPI instance.
3.  **FastAPI Application**:
    *   **Middleware**:
        *   CORS checks.
        *   Request logging and timing.
        *   Rate limiting (checks Redis).
    *   **Routing**: Matches the request URL and method to a registered API endpoint.
    *   **Dependency Injection**:
        *   `get_db()` provides an asynchronous database session.
        *   `get_current_user()` (for protected routes) validates the JWT token (potentially from Redis cache) and retrieves the `User` object.
    *   **Pydantic Validation**: Validates incoming request data (query parameters, path parameters, request body) against defined schemas.
    *   **Business Logic**: The route handler orchestrates operations:
        *   Calls `crud` functions to interact with the database.
        *   Applies authorization rules (e.g., is user the project owner? is user a superuser?).
        *   Interacts with Redis for caching or invalidation if necessary.
4.  **Database Interaction**: CRUD operations are translated by SQLAlchemy into SQL queries, executed against PostgreSQL.
5.  **Response**: Data is retrieved/modified, converted back to Pydantic schemas, and returned as a JSON HTTP response to the client.
6.  **Error Handling**: If any error occurs (validation, authentication, authorization, database, unexpected), the relevant exception handler intercepts it and returns a standardized JSON error response.

## 4. Security Considerations

*   **Authentication**: JWTs are used for stateless authentication. Tokens are signed with a strong secret key.
*   **Authorization**: Role-based (superuser) and ownership-based (project owner, task assignee) authorization checks are implemented using FastAPI dependencies.
*   **Password Hashing**: `bcrypt` (via `passlib`) is used for strong, one-way password hashing.
*   **Input Validation**: Pydantic schemas rigorously validate all incoming data, preventing common injection attacks and data integrity issues.
*   **Environment Variables**: Sensitive data (e.g., `SECRET_KEY`, database credentials) are managed via environment variables and loaded securely by `Pydantic Settings`.
*   **CORS**: Configured to allow necessary cross-origin requests, but should be restricted to known client origins in production.

## 5. Scalability and Reliability

*   **Asynchronous I/O**: FastAPI and SQLAlchemy with `asyncpg` fully leverage Python's `asyncio` for non-blocking I/O, allowing the application to handle many concurrent connections efficiently.
*   **Containerization (Docker)**: Enables consistent deployment across environments and simplifies scaling by running multiple instances.
*   **Load Balancing**: The architecture assumes a load balancer in front of multiple FastAPI instances in production to distribute traffic.
*   **Database Scaling**: PostgreSQL can be scaled vertically (more powerful server) or horizontally (read replicas, sharding) as needed.
*   **Redis**: Provides a fast, in-memory data store for caching and offloading work from the database, improving response times and reducing database load.
*   **Observability**: Structured logging provides insights into application behavior, crucial for debugging and performance monitoring.
*   **Graceful Shutdown**: Application ensures proper closure of database and Redis connections during shutdown.

## 6. Future Enhancements

*   **Background Tasks**: Integrate with a task queue (e.g., Celery with Redis/RabbitMQ) for long-running operations.
*   **WebSocket Support**: For real-time updates (e.g., task status changes), integrate FastAPI's WebSocket capabilities.
*   **Advanced Caching**: Implement more sophisticated caching strategies (e.g., cache invalidation mechanisms, cache-aside patterns).
*   **Full-text Search**: Integrate with search engines like Elasticsearch for advanced task/project searching.
*   **Object Storage**: For storing user-uploaded files (e.g., task attachments), integrate with S3-compatible storage.
*   **Metrics & Tracing**: Integrate Prometheus/Grafana for metrics collection and Jaeger/OpenTelemetry for distributed tracing.

This architecture provides a solid foundation for a robust, scalable, and maintainable mobile application backend.
```