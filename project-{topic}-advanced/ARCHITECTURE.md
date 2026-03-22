```markdown
# Architecture Documentation for Product Catalog DevOps System

## 1. High-Level Architecture Overview

The system follows a typical **Microservices** (or closely-coupled services) architecture, deployed using **Docker containers** and orchestrated by **Docker Compose** for local development and CI/CD. It consists of three main services: a React Frontend, a Node.js/Express Backend, and a PostgreSQL Database.

```mermaid
graph TD
    User[User/Client] --> |HTTP/HTTPS| Nginx[Nginx (Frontend Server)]
    Nginx --> |HTTP/HTTPS| ReactApp(React Frontend)
    ReactApp --> |HTTP/HTTPS API Calls| ExpressApp(Node.js/Express Backend API)
    ExpressApp --> |TCP/IP (PostgreSQL)| PostgreSQLDB[PostgreSQL Database]

    subgraph Infrastructure
        Nginx
        ReactApp
        ExpressApp
        PostgreSQLDB
    end

    subgraph CI/CD Pipeline (GitHub Actions)
        GitPush[Code Push/PR] --> Build[Build Backend/Frontend Docker Images]
        Build --> Test[Run Unit/Integration Tests]
        Test --> Deploy[Deploy to Environment (e.g., Docker Compose on VM)]
    end

    User --> GitPush
```

## 2. Component Breakdown

### 2.1. Frontend Service (React.js)

*   **Purpose**: Provides the user interface for interacting with the Product Catalog.
*   **Technology**: React.js, React Router DOM, Axios for API calls, HTML/CSS (Tailwind CSS for styling).
*   **Key Components**:
    *   **`App.js`**: Main entry point for React app, handles client-side routing.
    *   **`Navbar`**: Navigation component with conditional rendering based on authentication and user roles.
    *   **`AuthContext`**: React Context API for global authentication state management (user, token).
    *   **Pages**: `HomePage`, `LoginPage`, `RegisterPage`, `ProductsPage` (displaying product list), `ProductDetailPage` (single product view), `ManageProductsPage` (Admin CRUD for products).
    *   **API Services (`src/frontend/src/api/`)**: Abstraction layer for backend API calls using Axios. Includes request/response interceptors for JWT token handling.
*   **Deployment**: Served as static assets by an Nginx web server within its own Docker container.

### 2.2. Backend Service (Node.js/Express.js)

*   **Purpose**: Provides the RESTful API for data management, business logic, authentication, and authorization.
*   **Technology**: Node.js, Express.js, Sequelize ORM, bcryptjs (for password hashing), jsonwebtoken (for JWT), winston (for logging), node-cache (for in-memory caching), express-rate-limit (for rate limiting).
*   **Key Components**:
    *   **`server.js`**: Entry point, initializes DB connection, starts Express app.
    *   **`app.js`**: Configures Express, middleware (CORS, security, logging, error handling, rate limiting), and registers API routes.
    *   **`config/`**: Database configuration (`database.js`), Sequelize CLI config (`config.js`), Swagger documentation setup (`swagger.js`).
    *   **`models/`**: Sequelize model definitions (`User`, `Product`) with hooks for data validation and lifecycle events (e.g., password hashing).
    *   **`controllers/`**: Contains business logic for each resource (`authController`, `userController`, `productController`).
    *   **`routes/`**: Defines API endpoints and links them to controllers and middleware (`authRoutes`, `productRoutes`, `userRoutes`).
    *   **`middleware/`**: Custom middleware for authentication (`authMiddleware`), caching (`cacheMiddleware`), error handling (`errorHandler`), and request logging (`loggerMiddleware`).
    *   **`utils/`**: Helper functions for JWT, custom error classes (`appError`), and async error handling (`catchAsync`).
    *   **`migrations/`**: Database schema evolution scripts using `sequelize-cli`.
    *   **`seeders/`**: Initial data population scripts.
*   **Deployment**: Runs as a Node.js application within its own Docker container.

### 2.3. Database Service (PostgreSQL)

*   **Purpose**: Persistent storage for application data (users, products).
*   **Technology**: PostgreSQL.
*   **Key Aspects**:
    *   Docker image `postgres:13-alpine`.
    *   Data persistence using Docker volumes (`db_data`).
    *   Health checks defined in `docker-compose.yml` to ensure the database is ready before the backend attempts to connect.
*   **Deployment**: Runs in its own Docker container.

## 3. Data Flow and Interactions

1.  **User Interaction**: A user interacts with the React Frontend (served by Nginx).
2.  **API Calls**: The React Frontend makes HTTP requests to the Node.js/Express Backend API (e.g., `/api/v1/auth/login`, `/api/v1/products`).
3.  **Backend Processing**:
    *   Requests first hit Express middleware: rate limiting, CORS, security headers, request logging, authentication, and authorization.
    *   If a `GET /products` request is cached, the response is served directly from the `node-cache`.
    *   Otherwise, the request proceeds to the appropriate controller.
    *   Controllers interact with Sequelize models to perform database operations.
    *   Sequelize translates ORM calls into SQL queries, which are executed against the PostgreSQL database.
    *   Database responses are returned to Sequelize, then to the controller, and finally as an API response to the Frontend.
    *   `POST`, `PUT`, `PATCH`, `DELETE` operations on products trigger cache invalidation for affected product data.
4.  **Error Handling**: Any errors (validation, database, authentication, internal server) are caught by the `catchAsync` wrapper and processed by the global `errorHandler` middleware, providing consistent error responses to the Frontend.

## 4. Scalability and Reliability Considerations

*   **Containerization**: Docker allows for easy horizontal scaling of frontend and backend services (e.g., running multiple instances behind a load balancer).
*   **Stateless Backend**: The Node.js backend is largely stateless (session state is managed via JWTs), enabling easy scaling.
*   **External Database**: PostgreSQL runs as a separate service, which can be scaled independently or replaced with a managed database service in a cloud environment.
*   **Caching**: The in-memory `node-cache` improves read performance. For larger-scale production, this could be replaced with a distributed cache like Redis.
*   **Rate Limiting**: Protects against abuse and DoS attacks.
*   **Logging**: Centralized logging helps with monitoring and debugging in distributed environments.
*   **Health Checks**: Docker Compose health checks ensure services are ready before dependent services start.

## 5. CI/CD Workflow

The GitHub Actions pipeline automates the software delivery process:

1.  **Commit/Push**: Developers commit code to feature branches and create Pull Requests.
2.  **CI Trigger**: Pushes/PRs trigger the `build-and-test` job.
3.  **Code Quality**: ESLint runs to enforce coding standards.
4.  **Automated Testing**: Unit and Integration tests ensure code correctness and prevent regressions.
5.  **Artifact Generation**: Docker images for the frontend and backend are built.
6.  **CD (Optional)**: Upon merging to `main` (or a release branch), a deployment job could be triggered to push images to a container registry and deploy them to a staging/production environment (e.g., using Kubernetes, AWS ECS, or a VM with Docker Compose).

This architecture provides a solid foundation for a robust, scalable, and maintainable application, with a strong emphasis on automated DevOps practices.
```

### Deployment Guide

#### `DEPLOYMENT.md`
This file outlines the steps for deploying the application locally using Docker Compose and provides a conceptual guide for cloud deployment.