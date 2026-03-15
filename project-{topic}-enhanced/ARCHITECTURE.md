# E-commerce System Architecture

This document outlines the architectural design of the E-commerce System, detailing its components, their interactions, and the rationale behind key design decisions.

## 1. High-Level Architecture

The system follows a **Monolithic Service Architecture** for simplicity in this comprehensive example, but with clear **Layered Architecture** principles applied within the Flask application. This structure allows for a clear separation of concerns, making the codebase maintainable and testable, while demonstrating how it could evolve towards a microservices approach.

It is comprised of:

*   **Client (Frontend):** A basic web interface built with Jinja2 templates, HTML, CSS, and vanilla JavaScript, rendered and served by the Flask application. It interacts with the backend API.
*   **Application Server (Backend):** A Python Flask application serving both the frontend and exposing a RESTful API.
*   **Database:** PostgreSQL for persistent data storage.
*   **Caching/Rate Limiting Store:** Redis for high-speed data access and request throttling.
*   **Containerization:** Docker and Docker Compose for development and deployment environment consistency.

```mermaid
graph TD
    A[User's Browser] --HTTP/HTTPS--> B(Load Balancer / Reverse Proxy - Nginx)
    B --HTTP/HTTPS--> C(Web Application - Flask/Gunicorn)
    C --SQL (SQLAlchemy)--> D(Database - PostgreSQL)
    C --Redis Commands (Flask-Caching, Flask-Limiter)--> E(Cache/Rate Limiter - Redis)

    subgraph User Interaction Flow
        A --Frontend HTML/CSS/JS--> C
        C --API Requests--> C
    end

    subgraph Backend Layers
        C1[API Endpoints/Resources] --> C2[Services (Business Logic)]
        C2 --> C3[Models (Data Access / ORM)]
        C3 --> D
    end

    subgraph Infra
        D --Persistent Data--> F(Volumes)
        E --Volatile Data--> G(Volumes)
    end
```

## 2. Layered Architecture (Backend)

The Flask application itself is structured into distinct layers to promote modularity and separation of concerns:

### 2.1. Presentation Layer (API & Frontend Routes)

*   **Purpose:** Handles HTTP requests, parses input, serializes output, and renders HTML templates. It's the entry point for all client interactions.
*   **Components:**
    *   `app/api/`: Contains Flask Blueprints and Flask-RESTful Resources for RESTful API endpoints (e.g., `auth.py`, `products.py`, `users.py`, `cart.py`, `orders.py`). Each resource defines HTTP methods (GET, POST, PUT, DELETE) and interacts with the Service Layer.
    *   `app/routes.py`: Defines Flask routes for serving the Jinja2-based frontend pages (e.g., homepage, product listings, cart, login/register). These routes make HTTP calls to the internal API endpoints using the `requests` library.
    *   `app/templates/`: Jinja2 templates for the user interface.
    *   `app/static/`: Static assets like CSS and JavaScript files.
*   **Key Responsibilities:**
    *   Request parsing and validation (using `webargs`).
    *   Serialization of Python objects to JSON responses.
    *   Authentication and Authorization checks (via JWT decorators).
    *   Rendering of HTML pages.
    *   Error handling middleware for API calls.

### 2.2. Service Layer (Business Logic)

*   **Purpose:** Encapsulates the core business logic of the application. It orchestrates operations involving multiple data models and performs complex validations and calculations. This layer is database-agnostic.
*   **Components:**
    *   `app/services/`: Modules corresponding to major business domains (e.g., `auth_service.py`, `user_service.py`, `product_service.py`, `cart_service.py`, `order_service.py`).
*   **Key Responsibilities:**
    *   Implementing transaction boundaries (e.g., placing an order involves multiple database operations like updating stock, creating order records, clearing cart).
    *   Applying business rules and validations.
    *   Coordinating interactions between different data models.
    *   Handling caching invalidation when data changes.
    *   Abstracting database operations from the Presentation Layer.

### 2.3. Data Access Layer (Models / ORM)

*   **Purpose:** Provides an abstraction over the database. It defines the structure of the data and handles basic CRUD (Create, Read, Update, Delete) operations.
*   **Components:**
    *   `app/models/`: SQLAlchemy models for each database entity (e.g., `User`, `Product`, `Category`, `Cart`, `Order`).
    *   `app/__init__.py`: Initializes `SQLAlchemy` and `Flask-Migrate`.
*   **Key Responsibilities:**
    *   Mapping Python objects to database tables (Object-Relational Mapping - ORM).
    *   Defining relationships between entities.
    *   Implementing data validation at the model level (e.g., unique constraints).
    *   Password hashing using `Flask-Bcrypt`.

### 2.4. Core Application / Infrastructure Layer

*   **Purpose:** Manages application setup, configurations, extensions, and global concerns.
*   **Components:**
    *   `app/__init__.py`: Application factory, Flask extension initialization (SQLAlchemy, JWT, Cache, Limiter, Bcrypt, Migrate), blueprint registration, global error handlers, logging setup.
    *   `app/config.py`: Centralized configuration management for different environments (Development, Testing, Production).
    *   `app/utils/`: General utility functions, custom error classes, decorators for authentication/authorization.
    *   `manage.py`: Flask CLI commands for running the app, database migrations, and seeding.
*   **Key Responsibilities:**
    *   Environment-specific settings.
    *   Dependency injection (implicit via Flask extensions).
    *   Cross-cutting concerns like logging, error handling, caching, rate limiting.

## 3. Database Design (PostgreSQL)

The database schema is designed to support core e-commerce functionalities.

```mermaid
erDiagram
    USERS {
        INTEGER id PK
        VARCHAR username UK
        VARCHAR email UK
        VARCHAR password_hash
        VARCHAR role
        BOOLEAN is_active
        DATETIME created_at
        DATETIME updated_at
    }

    CATEGORIES {
        INTEGER id PK
        VARCHAR name UK
        VARCHAR slug UK
        TEXT description
        DATETIME created_at
        DATETIME updated_at
    }

    PRODUCTS {
        INTEGER id PK
        VARCHAR name
        VARCHAR slug UK
        NUMERIC price
        INTEGER stock_quantity
        VARCHAR image_url
        BOOLEAN is_active
        DATETIME created_at
        DATETIME updated_at
        INTEGER category_id FK
    }

    CARTS {
        INTEGER id PK
        INTEGER user_id UK FK
        DATETIME created_at
        DATETIME updated_at
    }

    CART_ITEMS {
        INTEGER id PK
        INTEGER cart_id FK
        INTEGER product_id FK
        INTEGER quantity
        NUMERIC price_at_addition
        DATETIME added_at
    }

    ORDERS {
        INTEGER id PK
        INTEGER user_id FK
        DATETIME order_date
        NUMERIC total_amount
        VARCHAR status
        VARCHAR payment_status
        TEXT shipping_address
        DATETIME created_at
        DATETIME updated_at
    }

    ORDER_ITEMS {
        INTEGER id PK
        INTEGER order_id FK
        INTEGER product_id FK
        INTEGER quantity
        NUMERIC price_at_purchase
    }

    USERS ||--o{ CARTS : "has"
    USERS ||--o{ ORDERS : "places"
    CATEGORIES ||--o{ PRODUCTS : "contains"
    PRODUCTS ||--o{ CART_ITEMS : "added to"
    PRODUCTS ||--o{ ORDER_ITEMS : "part of"
    CARTS ||--o{ CART_ITEMS : "contains"
    ORDERS ||--o{ ORDER_ITEMS : "contains"
```

**Key relationships:**

*   **One-to-One:** `User` has one `Cart`.
*   **One-to-Many:** `User` can place many `Orders`. `Category` can have many `Products`. `Cart` can have many `CartItems`. `Order` can have many `OrderItems`.
*   **Many-to-Many (via join tables):** Implied through `CartItem` and `OrderItem` linking `Products` to `Carts` and `Orders` respectively.

**Data Integrity:**

*   `UniqueConstraint` on `username` and `email` in `User` model.
*   `UniqueConstraint` on `slug` in `Category` and `Product` models for SEO-friendly URLs.
*   `stock_quantity` in `Product` is critical and updated transactionally during order placement.
*   `price_at_addition` and `price_at_purchase` are stored in `CartItem` and `OrderItem` respectively to preserve the price at the time of action, even if the product's price changes later.

## 4. Authentication and Authorization

*   **Authentication:** JWT (JSON Web Tokens) via `Flask-JWT-Extended`.
    *   On login, an access token (short-lived) and a refresh token (long-lived) are issued.
    *   The access token is sent with subsequent API requests in the `Authorization: Bearer <token>` header.
    *   The refresh token is used to obtain a new access token when the current one expires, without requiring re-login.
*   **Authorization:** Role-Based Access Control (RBAC).
    *   `User` model has a `role` field ('customer', 'admin').
    *   Custom decorators (`@admin_required`, `@customer_required`) in `app/utils/decorators.py` check the user's role extracted from the JWT claims to restrict access to specific API endpoints.

## 5. Caching

*   `Flask-Caching` is used with Redis as the backend.
*   Strategies:
    *   **Decorator-based caching:** `@cache.cached()` decorator on service methods (e.g., `ProductService.get_all_products`, `ProductService.get_product_by_id`) caches method results for a specified duration.
    *   **Manual invalidation:** `cache.clear()` is called in service methods (e.g., `create_product`, `update_product`, `delete_product`) to invalidate relevant caches when underlying data changes, ensuring data freshness.

## 6. Rate Limiting

*   `Flask-Limiter` is used with Redis as the storage backend.
*   Applies limits to prevent abuse and brute-force attacks.
*   Global default limits are set in `app/config.py`.
*   Specific endpoints (e.g., `/api/auth/register`, `/api/auth/login`) have stricter limits defined via the `@limiter.limit()` decorator.
*   Authenticated users can have different (typically higher) limits.

## 7. Logging and Error Handling

*   **Logging:** Python's standard `logging` module is configured in `app/__init__.py`.
    *   Logs are written to both console and a rotating file (`app.log`) in production.
    *   Different log levels (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`) are used across the application.
    *   Request/response details are logged for debugging.
*   **Error Handling:**
    *   Custom exception classes (`APIError`, `NotFoundError`, etc.) are defined in `app/utils/errors.py`.
    *   A centralized error handler in `app/__init__.py` catches these exceptions and returns standardized JSON error responses with appropriate HTTP status codes, improving API client experience.

## 8. Scalability Considerations

While presented as a monolith, the layered architecture and use of standard technologies facilitate future scalability:

*   **Horizontal Scaling:** The stateless nature of Flask/Gunicorn allows the `web` service to be scaled horizontally by running multiple instances behind a load balancer.
*   **Database Scaling:** PostgreSQL can be scaled with read replicas or sharding if needed.
*   **Caching Layer:** Redis offloads database reads, significantly improving response times for frequently accessed data.
*   **Queues/Async Tasks:** For long-running operations (e.g., processing payments, sending emails, generating reports), integration with a message queue (e.g., Celery, RabbitMQ, Kafka) could decouple these tasks from the main request-response cycle. This would be a natural extension from the Service Layer.

## 9. Future Enhancements

*   **Full-fledged Frontend SPA:** Migrate the Jinja2 frontend to a dedicated React/Vue/Angular application.
*   **Payment Gateway Integration:** Integrate with real payment providers (Stripe, PayPal).
*   **Search Engine:** Implement a dedicated search engine (Elasticsearch, Solr) for advanced product search capabilities.
*   **Image Storage:** Use cloud storage solutions (AWS S3, Google Cloud Storage) for product images.
*   **Email Notifications:** For order confirmations, shipping updates.
*   **Admin Dashboard:** A more sophisticated admin interface for managing products, categories, orders, and users.
*   **Recommendations:** Implement product recommendation algorithms.
*   **Advanced Analytics:** Integrate with analytics platforms.
*   **Security Audits:** Regular security reviews and penetration testing.

This architecture provides a robust foundation for an enterprise-grade e-commerce system, emphasizing best practices in software development and operational readiness.