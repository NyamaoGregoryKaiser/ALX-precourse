```markdown
# ALX-Shop: Architecture Documentation

## 1. High-Level Architecture

The ALX-Shop is built as a microservice-oriented application, with a clear separation of concerns. At its core, it's a **backend API** serving a variety of clients (web frontend, mobile apps, other services). The system follows a layered architecture pattern to ensure modularity, maintainability, and scalability.

```
+----------------+       +-------------------+       +-------------------+
|   Clients      |       |                   |       |                   |
| (Web UI, Mobile)| <---> |  Load Balancer    | <---> | Reverse Proxy     |
|                |       |  (e.g., Nginx)    |       | (e.g., Nginx)     |
+----------------+       +-------------------+       +-------------------+
                                   |                           |
                                   v                           v
                      +-----------------------------+   +----------------+
                      |       ALX-Shop API          |   |      Redis     |
                      |    (FastAPI Application)    |<->| (Cache, Rate   |
                      |                             |   |   Limiter)     |
                      +-----------------------------+   +----------------+
                                   |
                                   v
                      +-----------------------------+
                      |         PostgreSQL          |
                      |        (Database)           |
                      +-----------------------------+
```

**Key Components:**

*   **Clients**: Any consumer of the API (e.g., a Single Page Application (SPA) built with React/Vue/Angular, mobile applications, or other backend services).
*   **Load Balancer (Optional, Production)**: Distributes incoming traffic across multiple instances of the API, ensuring high availability and scalability.
*   **Reverse Proxy (e.g., Nginx)**: Handles SSL termination, static file serving, URL rewriting, request routing, and can implement rate limiting and basic security measures at the edge.
*   **ALX-Shop API (FastAPI Application)**: The core Python backend, exposing RESTful API endpoints.
*   **Redis**: Used as an in-memory data store for:
    *   **Caching**: Storing frequently accessed data (e.g., product listings) to reduce database load and improve response times.
    *   **Rate Limiting**: Tracking request counts per user/IP to prevent abuse.
*   **PostgreSQL Database**: The primary data store, chosen for its robustness, ACID compliance, and excellent support for relational data.

## 2. API Application Architecture (FastAPI)

The FastAPI application follows a common layered architecture, promoting separation of concerns and testability.

```
.
├── app/
│   ├── api/                      # API Endpoints (Controllers)
│   │   └── v1/                   # Versioned API routes
│   │       ├── auth.py           # Authentication-related endpoints
│   │       ├── products.py       # Product CRUD endpoints
│   │       ├── users.py          # User CRUD endpoints
│   │       └── orders.py         # Order CRUD endpoints
│   ├── core/                     # Core utilities and configurations
│   │   ├── config.py             # Application settings
│   │   ├── security.py           # JWT, password hashing, auth dependencies
│   │   ├── database.py           # SQLAlchemy setup, DB session management
│   │   ├── exceptions.py         # Custom exceptions and handlers
│   │   ├── middlewares.py        # Global FastAPI middlewares (e.g., logging)
│   │   ├── rate_limiter.py       # Rate limiting configuration
│   │   └── logging_config.py     # Centralized logging setup
│   ├── models/                   # SQLAlchemy ORM Models (Database Schema)
│   │   ├── base.py               # Base class for all models (Id, Timestamps)
│   │   ├── user.py               # User table definition
│   │   ├── product.py            # Product table definition
│   │   └── order.py              # Order & OrderItem table definitions
│   ├── schemas/                  # Pydantic Models (Data validation/serialization)
│   │   ├── token.py              # JWT token structures
│   │   ├── user.py               # User request/response schemas
│   │   ├── product.py            # Product request/response schemas
│   │   └── order.py              # Order request/response schemas
│   ├── services/                 # Business Logic (Service Layer)
│   │   ├── auth_service.py       # User authentication/registration logic
│   │   ├── product_service.py    # Product-related business rules (stock, price)
│   │   ├── user_service.py       # User-related business rules
│   │   └── order_service.py      # Order creation, status updates, inventory interaction
│   └── main.py                   # FastAPI application entry point, router inclusion, global setup
```

**Layer Responsibilities:**

*   **`main.py`**: Initializes the FastAPI app, registers global middlewares, exception handlers, and includes all API routers. It acts as the orchestrator.
*   **`api/` (Controllers)**:
    *   Handles HTTP requests, defines routes (`GET`, `POST`, `PUT`, `DELETE`).
    *   Validates incoming request data using Pydantic schemas.
    *   Uses FastAPI's dependency injection to get database sessions, authenticated users, and other resources.
    *   Calls the appropriate service layer functions to execute business logic.
    *   Formats responses based on Pydantic schemas.
    *   Handles API-specific error responses.
*   **`services/` (Business Logic)**:
    *   Contains the core business rules and logic of the application.
    *   Interacts with the `models/` layer to perform database operations.
    *   Should not directly handle HTTP requests or responses.
    *   Ensures data integrity and applies complex business rules (e.g., stock management during order creation).
*   **`models/` (Data Access Layer - ORM)**:
    *   Defines the SQLAlchemy ORM models, representing the database schema.
    *   Manages the mapping between Python objects and database tables.
    *   Handles relationships between entities (e.g., User has many Orders).
    *   `BaseORM` provides common fields (`id`, `created_at`, `updated_at`) for all models.
*   **`schemas/` (Data Transfer Objects - DTOs)**:
    *   Pydantic models for data validation, serialization, and deserialization.
    *   Used for defining request bodies, response models, and data passed between layers.
    *   Ensures type safety and data integrity at the API boundary.
*   **`core/` (Cross-Cutting Concerns)**:
    *   **`config.py`**: Manages environment variables and application settings using `pydantic-settings`.
    *   **`security.py`**: Centralizes JWT handling (creation, decoding), password hashing, and FastAPI authentication/authorization dependencies.
    *   **`database.py`**: Sets up the SQLAlchemy asynchronous engine and session factory, providing the `get_db_session` dependency for consistent database access.
    *   **`exceptions.py`**: Defines custom application exceptions and a global handler for consistent error responses.
    *   **`middlewares.py`**: Custom FastAPI middlewares, like `LoggingMiddleware`, to intercept requests/responses.
    *   **`rate_limiter.py`**: Integrates `fastapi-limiter` for API rate limiting using Redis.
    *   **`logging_config.py`**: Standardized logging setup for the application.

## 3. Data Flow

1.  **Client Request**: A client (e.g., web browser) sends an HTTP request to an API endpoint (e.g., `POST /api/v1/login`).
2.  **Reverse Proxy/Load Balancer (Optional)**: Request passes through, potentially handled for SSL, basic rate limiting, or routed to an available API instance.
3.  **FastAPI Application (`main.py`)**:
    *   **Middlewares**: `LoggingMiddleware` records request details. `FastAPILimiter` checks rate limits.
    *   **Router (`api/v1/auth.py`)**: The request is routed to the `login_for_access_token` function.
    *   **Dependency Injection**: FastAPI injects `OAuth2PasswordRequestForm` (parsed request body) and an `AsyncSession` from `get_db_session`.
    *   **Service Layer Call (`auth_service.py`)**: The router calls `auth_service.authenticate_user(email, password)`.
    *   **Database Interaction (`user_service.py` -> `models/user.py`)**: `auth_service` calls `user_service.get_user_by_email` which queries the `User` model using the `AsyncSession` to retrieve user credentials.
    *   **Security (`security.py`)**: `auth_service` uses `security.verify_password` to check credentials and `security.create_access_token`/`create_refresh_token` to generate JWTs.
4.  **Response Generation**: The `auth_service` returns tokens, which the router serializes using the `Token` Pydantic schema.
5.  **Client Response**: FastAPI sends the JSON response back through the middlewares and eventually to the client.

## 4. Database Schema (Simplified ERD)

```mermaid
erDiagram
    USERS {
        int id PK
        varchar email UK "email address"
        varchar hashed_password
        varchar full_name
        boolean is_active
        enum role "customer, admin"
        datetime created_at
        datetime updated_at
    }

    PRODUCTS {
        int id PK
        varchar name IX
        text description
        float price
        int stock
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    ORDERS {
        int id PK
        int user_id FK "References USERS"
        float total_price
        enum status "pending, processing, shipped, delivered, cancelled, refunded"
        text shipping_address
        datetime created_at
        datetime updated_at
    }

    ORDER_ITEMS {
        int id PK
        int order_id FK "References ORDERS"
        int product_id FK "References PRODUCTS"
        int quantity
        float price_at_purchase
        datetime created_at
        datetime updated_at
    }

    USERS ||--o{ ORDERS : places
    ORDERS ||--o{ ORDER_ITEMS : contains
    PRODUCTS ||--o{ ORDER_ITEMS : included_in
```

## 5. Security Considerations

*   **JWT Authentication**: Stateless and scalable. Access tokens are short-lived, refresh tokens are longer.
*   **Password Hashing**: `bcrypt` (via `passlib`) is used for secure password storage.
*   **Role-Based Access Control (RBAC)**: Implemented via FastAPI dependencies (`get_current_active_user`, `get_current_active_admin`) to control access to endpoints based on user roles.
*   **Input Validation**: Pydantic schemas are used extensively to validate all incoming request data, preventing common injection attacks and data integrity issues.
*   **Rate Limiting**: Protects against brute-force attacks and API abuse.
*   **CORS**: Configured to allow only specified origins, preventing cross-origin attacks.
*   **Environment Variables**: Sensitive data (e.g., `SECRET_KEY`, database credentials) are stored in environment variables and managed securely (e.g., GitHub Secrets in CI/CD).

## 6. Scalability and Performance

*   **Asynchronous Programming**: FastAPI and SQLAlchemy with `asyncpg` leverage Python's `asyncio` for non-blocking I/O, allowing the application to handle many concurrent connections efficiently.
*   **Database Connection Pooling**: SQLAlchemy's engine manages a pool of connections to the database, reducing overhead for new connections.
*   **Caching (Redis)**: Reduces database load for read-heavy operations (e.g., product listings).
*   **Rate Limiting (Redis)**: Prevents individual clients from overwhelming the server.
*   **Dockerization**: Facilitates horizontal scaling by easily running multiple instances of the application container behind a load balancer.
*   **Uvicorn Workers**: Configured to run multiple worker processes (e.g., `--workers 2` in `Dockerfile`) to utilize multiple CPU cores.
*   **Query Optimization**: Strategic indexing, eager loading, and server-side filtering at the database layer.

This architecture provides a solid foundation for a robust, scalable, and maintainable e-commerce platform, adhering to modern DevOps and software engineering best practices.
```