```markdown
# DataVizSystem Architecture Documentation

## 1. High-Level Overview

The DataVizSystem is designed as a distributed, multi-tiered application to provide a scalable and robust platform for data visualization. It follows a client-server architecture with a clear separation of concerns, enabling independent development and scaling of components.

```mermaid
graph TD
    A[Client Web Browser] -->|HTTP/HTTPS| B(Nginx Reverse Proxy / Frontend)
    B -->|Static Files| C(React.js Frontend)
    C -->|REST API Calls (JSON)| B
    B -->|Proxy Requests| D(C++ Backend Service)

    D -->|PostgreSQL Client (pqxx)| E(PostgreSQL Database)
    D -->|Redis Client (hiredis/cpp_redis)| F(Redis Cache)
    D -->|File System| G(Dataset Storage)

    E -->|Persistent Data| H(Database Volume)
    G -->|Persistent Data| I(Dataset Volume)

    subgraph Infrastructure
        K[Docker Compose / Kubernetes]
        L[CI/CD Pipeline (GitHub Actions)]
        M[Monitoring & Logging (Prometheus/Grafana, spdlog)]
    end
    D --- M
    B --- M
    K --- D
    K --- E
    K --- F
    K --- G
    L --- B
    L --- D
```

## 2. Component Breakdown

### 2.1. Frontend (React.js)

*   **Technology**: React.js, Material-UI, Nivo (or Chart.js) for visualizations, Axios for API calls.
*   **Purpose**: Provides the user interface for interacting with the system.
*   **Key Responsibilities**:
    *   User authentication (login, registration).
    *   Displaying user's datasets and visualizations.
    *   Uploading new datasets.
    *   Configuring visualization parameters (chart type, axes, filters, aggregations).
    *   Fetching processed data from the backend and rendering interactive charts.
    *   Client-side routing and state management.

### 2.2. Nginx Reverse Proxy (Optional, but used in Docker)

*   **Technology**: Nginx
*   **Purpose**: Serves the static React frontend files and proxies API requests to the C++ backend.
*   **Key Responsibilities**:
    *   Load balancing (if multiple backend instances).
    *   SSL/TLS termination.
    *   Routing `/api/` requests to the `backend` service.
    *   Serving static assets for the `frontend`.
    *   Potential for rate limiting and caching at the edge.

### 2.3. Backend Service (C++)

*   **Technology**: C++17/20, Crow (web framework), nlohmann/json, spdlog, pqxx (PostgreSQL client), jwt-cpp, Argon2/OpenSSL (for crypto).
*   **Purpose**: The core application logic, data processing, and API provider. Designed for high performance.
*   **Key Responsibilities**:
    *   **REST API**: Exposes endpoints for user authentication, dataset CRUD, visualization CRUD, and data processing.
    *   **Authentication & Authorization**: Validates JWT tokens, enforces role-based access control, and checks resource ownership.
    *   **Database Interaction**: Manages connections to PostgreSQL, executes queries via `pqxx`, and maps database rows to C++ models.
    *   **Data Ingestion**: Handles uploaded files (e.g., CSV), saves them to persistent storage.
    *   **Data Processing (`DataProcessor`)**: Implements algorithms for filtering, grouping, aggregation (sum, avg, count, min, max), and sorting on raw dataset (in-memory `DataTable`).
    *   **Dataset Management (`DatasetManager`)**: Manages physical data files, infers column metadata, and provides a caching layer for frequently accessed datasets.
    *   **Logging (`Logger`)**: Centralized logging using `spdlog`.
    *   **Error Handling**: Catches exceptions and returns standardized JSON error responses.

#### C++ Backend Modules:

*   **`main.cpp`**: Application entry point, initializes Config, Logger, and `HttpServer`.
*   **`config/`**: Handles application configuration loaded from environment variables.
*   **`utils/`**: General utilities like `Logger`, `Crypto` (password hashing), `TokenManager` (JWT).
*   **`server/`**:
    *   `HttpServer.h/.cpp`: Initializes the Crow application, registers middlewares and routes.
    *   `middleware/`: Implementations for `LoggingMiddleware`, `ErrorMiddleware`, `AuthMiddleware`.
    *   `routes/`: Organizes API endpoints into logical groups (`AuthRoutes`, `DatasetRoutes`, `VisualizationRoutes`).
    *   `utils/JsonUtils.h/.cpp`: Helper for standardized JSON responses and request body parsing.
*   **`db/`**:
    *   `Database.h/.cpp`: Manages PostgreSQL connection and transactions (`pqxx`).
    *   `*Repository.h/.cpp`: Repository pattern for CRUD operations on `User`, `Dataset`, `Visualization` models.
*   **`data/`**:
    *   `models/`: C++ structs/classes representing `User`, `Dataset`, `Visualization` data.
    *   `DatasetManager.h/.cpp`: Manages file I/O for datasets, parses raw files (CSV), infers column types, and implements in-memory data caching.
    *   `DataProcessor.h/.cpp`: Contains the core algorithms for transforming raw `DataTable` based on visualization requests.

### 2.4. PostgreSQL Database

*   **Technology**: PostgreSQL
*   **Purpose**: Stores all application metadata, including user accounts, dataset references, column schemas, and visualization configurations.
*   **Key Responsibilities**:
    *   Persisting `users`, `datasets`, and `visualizations` tables.
    *   Enforcing data integrity with foreign keys and constraints.
    *   Providing efficient data retrieval through indexing.
    *   `JSONB` columns used for flexible storage of `columns_metadata` and `visualization.config`.

### 2.5. Redis Cache

*   **Technology**: Redis
*   **Purpose**: In-memory data store used for high-speed caching.
*   **Key Responsibilities