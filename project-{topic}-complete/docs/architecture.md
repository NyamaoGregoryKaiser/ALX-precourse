```markdown
# Architecture Documentation: Data Visualization Tools System

This document outlines the high-level architecture, component breakdown, and data flow of the Data Visualization Tools System.

## 1. High-Level Architecture

The system follows a typical **Microservices/Monolithic (Modular) Architecture** with a clear separation of concerns between the frontend client, the backend API, and supporting infrastructure services.

```mermaid
graph TD
    UserClient[User (Web Browser)] ---|HTTP/S| Nginx/Proxy(Optional Proxy/Load Balancer)
    Nginx/Proxy --> Frontend(React Frontend)
    Frontend ---|HTTP/S API Requests| Nginx/Proxy
    Nginx/Proxy --> Backend(FastAPI Backend)

    Backend --> DB(PostgreSQL Database)
    Backend --> Redis(Redis Cache/Rate Limit)

    Backend --&gt;|External Connections| ExternalDBs(External Data Sources - PG, MySQL, CSV)
```

**Key Components:**

*   **User Client:** A web browser interacting with the frontend.
*   **Nginx/Proxy (Optional):** A reverse proxy for SSL termination, load balancing, and serving static frontend assets in production. For development, the React dev server and FastAPI server run separately or Nginx serves React directly from its build.
*   **Frontend (React):** The client-side application responsible for user interface, interaction, and making API calls to the backend.
*   **Backend (FastAPI):** The core application logic, RESTful API endpoints, data processing, and business logic, built using Python.
*   **PostgreSQL Database:** The primary persistent storage for the backend, storing metadata about users, data sources, datasets, visualizations, and dashboards.
*   **Redis:** An in-memory data store used for API caching and rate limiting.
*   **External Data Sources:** Databases (PostgreSQL, MySQL, etc.) or file systems (CSV) that the Data Visualization System connects to in order to fetch raw data.

## 2. Backend Architecture (FastAPI)

The FastAPI backend is structured modularly to promote maintainability, scalability, and separation of concerns.

```mermaid
graph TD
    UserRequest[HTTP Request] --> FastAPI(FastAPI Application `app/main.py`)

    FastAPI --> Middleware(CORS, Error Handling, Rate Limiting)
    Middleware --> Routers(API Routers `app/api/v1/`)
    Routers --> Dependencies(Auth, DB Session)
    Routers --> Endpoints(CRUD for Users, DataSources, etc.)

    Endpoints --> Services(DataConnector, DataTransformer)
    Services --> DB(PostgreSQL `app/db/`, `app/models/`)
    Services --> Redis(Redis Cache/Rate Limit)
    Services --> ExternalDataSources(External Databases/Files)

    Endpoints --> CRUD(CRUD Operations `app/crud/`)
    CRUD --> DB
    Dependencies --> CRUD

    FastAPI --&gt;|Uses| Settings(Configuration `app/core/config.py`)
    FastAPI --&gt;|Uses| Security(Auth/Hashing `app/core/security.py`)
    FastAPI --&gt;|Uses| Exceptions(Custom Errors `app/core/exceptions.py`)

    Routers --&gt;|Uses| Schemas(Pydantic Models `app/schemas/`)
    Endpoints --&gt;|Uses| Schemas
```

**Key Backend Modules:**

*   **`app/main.py`:**
    *   Initializes the FastAPI application.
    *   Registers API routers.
    *   Configures middleware (CORS, error handling, rate limiting).
    *   Handles startup/shutdown events (Redis initialization, DB cleanup).
*   **`app/core/`:**
    *   `config.py`: Loads application settings from environment variables.
    *   `security.py`: Handles password hashing and JWT token creation/verification.
    *   `exceptions.py`: Defines custom HTTP exceptions for consistent error responses.
*   **`app/db/`:**
    *   `base.py`: Defines the SQLAlchemy declarative base and common mixins (UUID, timestamps).
    *   `session.py`: Manages asynchronous database sessions (`AsyncSessionLocal`).
    *   `init_db.py`: Script for seeding initial data (e.g., superuser, sample data).
*   **`app/models/`:**
    *   SQLAlchemy ORM models defining the database schema (User, DataSource, Dataset, Visualization, Dashboard).
*   **`app/schemas/`:**
    *   Pydantic models defining input (Create, Update) and output (Read) data structures for API requests/responses. Ensures data validation and serialization.
*   **`app/crud/`:**
    *   `base.py`: A generic CRUD base class for common database operations.
    *   Specific CRUD classes (`user.py`, `datasource.py`, etc.) inheriting from `CRUDBase` to handle model-specific logic.
*   **`app/services/`:**
    *   `data_connector.py`: Manages connections to external data sources (PostgreSQL, CSV, etc.) and executes queries. Handles different connection types and potential query timeouts.
    *   `data_transformer.py`: Processes raw data fetched from external sources according to visualization configurations (filtering, aggregation, column selection). This is where the core "algorithm design" for data manipulation resides.
*   **`app/api/v1/`:**
    *   **`__init__.py`:** Aggregates all endpoint routers into a single API router.
    *   **`endpoints/`:** Contains individual routers for each resource (auth, users, datasources, datasets, visualizations, dashboards) with their respective CRUD and business logic.
*   **`app/dependencies.py`:**
    *   Defines FastAPI dependency injection functions, primarily for database session management and user authentication/authorization (e.g., `get_db`, `get_current_user`, `get_current_active_superuser`).

## 3. Data Flow for a Visualization Request

1.  **Client Request:** A user requests a dashboard or specific visualization data from the frontend.
2.  **API Call:** The frontend makes an authenticated `POST` request to `/api/v1/visualizations/{id}/data` (or `/api/v1/dashboards/{id}/data`).
3.  **Authentication/Authorization:** FastAPI's dependencies (`get_current_user`) verify the JWT token and check if the user has permission to access the requested visualization/dashboard and its underlying dataset/data source.
4.  **Retrieve Visualization Metadata:** The endpoint (`app/api/v1/endpoints/visualizations.py`) queries the PostgreSQL database (via `crud_visualization`) to retrieve the `Visualization` object, eagerly loading its associated `Dataset` and `DataSource` using SQLAlchemy's `selectinload`.
5.  **Fetch Raw Data:** The `DataConnector` service (`app/services/data_connector.py`) is invoked with the `DataSource` object's connection details and the `Dataset`'s `query_string` and `parameters`.
    *   `DataConnector` uses appropriate libraries (e.g., `asyncpg` for PostgreSQL) to connect to the external data source.
    *   It executes the query and fetches the raw results as a list of dictionaries.
    *   Error handling for connection issues, query failures, and timeouts is integrated here.
6.  **Transform Data:** The `DataTransformer` service (`app/services/data_transformer.py`) receives the raw data and the `Visualization`'s `config`.
    *   It applies a series of transformations (e.g., filtering, aggregation, column selection/renaming) based on the `config`.
    *   This is where custom algorithms for data manipulation are implemented.
7.  **Return Transformed Data:** The transformed data, along with the visualization metadata, is returned to the client.
8.  **Frontend Rendering:** The React frontend receives the processed data and renders the visualization using a charting library.

## 4. Security Considerations

*   **Authentication:** JWT (JSON Web Tokens) are used for stateless authentication.
*   **Authorization:** Role-based access control (superuser/normal user) is implemented using FastAPI dependencies.
*   **Password Hashing:** `bcrypt` is used via `passlib` to securely hash user passwords.
*   **Connection Strings:** Sensitive connection strings for data sources should ideally be encrypted at rest in the database and decrypted only when needed. For this project, they are stored directly for simplicity, but in production, this is a critical improvement area.
*   **Input Validation:** Pydantic schemas are extensively used to validate all incoming API request data, preventing common injection and malformed data attacks.
*   **CORS:** Configured to allow requests from specified frontend origins.
*   **Rate Limiting:** Prevents abuse and protects against denial-of-service attacks.

## 5. Scalability and Performance

*   **Asynchronous I/O:** FastAPI and SQLAlchemy's async capabilities ensure efficient handling of concurrent requests, especially for I/O-bound operations like database queries.
*   **Database Indexing:** `index=True` is used on frequently queried columns in SQLAlchemy models.
*   **Caching:** Redis is used with `fastapi-cache` to cache results of expensive or frequently accessed endpoints (e.g., `get_dataset_data`, `get_visualization_data`).
*   **Dockerization:** Facilitates easy horizontal scaling by deploying multiple instances of the backend service.
*   **Modular Services:** The separation into `DataConnector` and `DataTransformer` allows for independent optimization and potential future migration to dedicated microservices if data processing becomes extremely complex.

## 6. Future Enhancements

*   **More Data Source Types:** Expand `DataConnector` to support more databases (MySQL, SQL Server) and cloud storage (S3, GCS).
*   **Advanced Data Transformations:** Implement more sophisticated aggregation, pivoting, and scripting capabilities within `DataTransformer`.
*   **Dynamic Query Builder:** A frontend interface to visually build SQL queries or data transformation pipelines.
*   **Real-time Data:** Support for streaming data sources and real-time dashboard updates.
*   **Multi-tenancy:** Isolate data and resources for different organizations/customers.
*   **User Permissions Granularity:** More fine-grained control over which users can access specific data sources, datasets, or dashboards.
*   **Data Masking/Anonymization:** Implement logic to protect sensitive data before visualization.
*   **Frontend UI:** A more comprehensive and interactive React UI for building and managing all entities.
```