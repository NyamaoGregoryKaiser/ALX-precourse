# System Architecture Document: Data Visualization Tools

## 1. Introduction

This document outlines the architecture of the Data Visualization Tools System. It is designed as a full-stack application, providing robust backend services and an interactive frontend interface, built with scalability, maintainability, and security in mind.

## 2. High-Level Architecture

The system follows a typical **Client-Server Architecture** with a **Monorepo** structure. It is composed of distinct backend and frontend services, communicating via a RESTful API. A relational database (PostgreSQL) is used for persistent storage, and Redis serves as a caching layer. Docker is employed for containerization, facilitating consistent environments across development, testing, and production.

```
+----------------+       +----------------+       +---------------+
|  Web Browser   | <---> |    Frontend    | <---> |   Backend     |
|   (React.js)   |       |    (Nginx/     |       |   (Node.js/   |
+----------------+       |    Docker)     |       |   Express.js) |
                         +----------------+       +-------+-------+
                                                          |
                                                          | REST/HTTP
                                                          |
                                                          v
+----------------+       +----------------+       +-------+-------+
|  User (Admin/  | <---> |  Authentication| <---> |   API Gateway  | <-- Rate Limiting, CORS, Auth
|    Standard)   |       |  /Authorization|       |   (Backend)   |
+----------------+       +----------------+       +-------+-------+
                                                          |
                                                          |
                                                          v
                                                  +----------------+
                                                  |   Services Layer |
                                                  | (Business Logic, |
                                                  |   Data Ops)    |
                                                  +----------------+
                                                         /   \
                                                        /     \
                                                       v       v
                                               +----------+  +----------+
                                               |  Database  |  |  Cache     |
                                               | (PostgreSQL)|  | (Redis)    |
                                               +----------+  +----------+
```

## 3. Component Breakdown

### 3.1. Frontend (Client)

*   **Technology**: React.js, TypeScript, Styled Components, React Router DOM, Axios, Chart.js.
*   **Purpose**: Provides the user interface for all interactions, including:
    *   User authentication (login, registration).
    *   Dashboard browsing and creation.
    *   Data source management.
    *   Visualization configuration and display.
*   **Key Responsibilities**:
    *   Render interactive UI components.
    *   Manage local UI state.
    *   Communicate with the Backend API via Axios.
    *   Handle client-side routing.
    *   Display data visualizations using Chart.js.
*   **Deployment**: Served by a web server (e.g., Nginx in production Docker container) or directly via Node.js development server.

### 3.2. Backend (Server)

*   **Technology**: Node.js, Express.js, TypeScript, TypeORM.
*   **Purpose**: Exposes a RESTful API to the frontend, manages business logic, interacts with the database, and processes data.
*   **Key Modules/Layers**:
    *   **Controllers**: Handle incoming HTTP requests, validate input, and delegate to services. They map requests to responses.
    *   **Services**: Encapsulate the core business logic. They interact with repositories (ORM) and external data sources, perform data processing, and enforce rules.
    *   **Routes**: Define API endpoints and associate them with controller methods.
    *   **Middleware**:
        *   **Authentication (`authMiddleware`)**: Verifies JWTs and attaches user information to the request.
        *   **Authorization (`authMiddleware`)**: Checks user roles for access control to specific resources.
        *   **Error Handling (`errorHandler`)**: Catches errors, logs them, and sends standardized error responses.
        *   **Rate Limiting (`rateLimiter`)**: Prevents abuse by limiting the number of requests per IP.
        *   **Logging (`loggerMiddleware`)**: Logs incoming requests.
    *   **Database Layer (TypeORM Entities, Data Source)**: Defines the data models and handles interactions with PostgreSQL. Includes migrations for schema evolution.
    *   **Utilities (`utils`)**: Helper functions like CSV parsing, logging (`winston`).
    *   **Configuration (`config`)**: Manages environment variables and application settings.
*   **Data Processing**: The `DataSourceService` contains logic to fetch raw data (e.g., from CSV) and perform basic aggregations (sum, average, count, group by) based on visualization query configurations.

### 3.3. Database (Persistent Storage)

*   **Technology**: PostgreSQL.
*   **Purpose**: Stores all application data.
*   **Key Entities**:
    *   `User`: User authentication and profile information (username, email, password hash, role).
    *   `DataSource`: Configuration details for external data sources (name, type, connection config, owner).
    *   `Dashboard`: High-level information about a dashboard (name, description, layout, owner).
    *   `Visualization`: Details of a specific chart within a dashboard (title, type, config, data query, associated dashboard and data source).
*   **Schema Design**: Utilizes foreign keys and relationships to maintain data integrity. JSONB fields are used for flexible configurations (`DataSource.config`, `Dashboard.layout`, `Visualization.config`, `Visualization.query`).
*   **Optimization**: Indexes are applied to commonly queried columns (e.g., `user.email`, `dashboard.ownerId`) to improve read performance.

### 3.4. Cache

*   **Technology**: Redis.
*   **Purpose (Conceptual)**: To store frequently accessed data (e.g., aggregated visualization data for a dashboard) to reduce database load and improve response times.
*   **Integration Point**: Could be integrated within `DataSourceService` or `DashboardService` to cache results of expensive data fetching/processing operations.

## 4. Communication Flows

1.  **User Interaction**: A user interacts with the **Frontend** UI.
2.  **API Requests**: The Frontend sends HTTP requests (GET, POST, PUT, DELETE) to the **Backend API**. Requests requiring authentication include a JWT in the `Authorization` header.
3.  **Backend Processing**:
    *   Incoming requests first pass through **Middleware** for logging, rate limiting, authentication, and authorization.
    *   The request is then routed to the appropriate **Controller**.
    *   The Controller calls one or more **Services** to execute business logic.
    *   Services interact with the **Database** via TypeORM to store or retrieve data.
    *   For visualization data, `DataSourceService` fetches data (e.g., from a CSV file) and performs processing based on the `Visualization.query` configuration.
    *   (Optional) Services can interact with **Redis** to check/store cached data.
4.  **Response**: The Backend sends an HTTP response back to the Frontend.
5.  **UI Update**: The Frontend processes the response and updates the UI accordingly, rendering charts using Chart.js.

## 5. Security Considerations

*   **Authentication**: JWT-based authentication for stateless sessions.
*   **Authorization**: Role-based access control (RBAC) via middleware to restrict access to resources.
*   **Password Hashing**: `bcrypt` is used to securely hash user passwords.
*   **Input Validation**: Although not explicitly shown in every snippet, controllers and services should validate all incoming data to prevent injection attacks and ensure data integrity.
*   **CORS**: Configured in Express to allow requests only from the frontend origin.
*   **Helmet**: Used to set various HTTP headers for enhanced security (e.g., XSS protection, MIME type sniffing prevention).
*   **Rate Limiting**: Protects against brute-force attacks and DoS.
*   **Environment Variables**: Sensitive information (database credentials, JWT secret) is stored in environment variables, not hardcoded.

## 6. Scalability

*   **Stateless Backend**: The use of JWTs makes the backend stateless, allowing for easy horizontal scaling of Node.js instances.
*   **Database Scalability**: PostgreSQL can be scaled vertically (more powerful server) or horizontally (read replicas, sharding) as needed.
*   **Caching**: Redis helps offload repetitive database queries, improving performance under load.
*   **Containerization**: Docker and orchestrators like Kubernetes facilitate scaling services up and down based on demand.

## 7. Observability

*   **Logging**: `Winston` provides structured logging, making it easier to analyze application behavior, debug issues, and integrate with log management systems.
*   **Error Handling**: Centralized error handling ensures all unhandled exceptions are caught, logged, and gracefully returned to the client.
*   **Health Checks**: Docker Compose includes health checks for services (PostgreSQL, Redis), ensuring dependencies are ready before the application starts.

## 8. Development and Deployment

*   **Monorepo**: Simplifies dependency management and code sharing between backend and frontend.
*   **TypeScript**: Provides type safety, improving code quality and maintainability.
*   **Docker Compose**: Facilitates local development by orchestrating all services with a single command.
*   **CI/CD (GitHub Actions)**: Automates build, test, and deployment processes, ensuring code quality and rapid delivery.
*   **Migrations**: TypeORM migrations manage database schema changes in a controlled and versioned manner.

This architecture provides a solid foundation for a robust and scalable data visualization platform, adhering to modern software engineering principles.