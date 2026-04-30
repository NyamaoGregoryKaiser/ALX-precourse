# Enterprise-Grade Task Management API System

This project provides a comprehensive, production-ready API development system for managing tasks. It's built with a TypeScript backend (Node.js/Express), a PostgreSQL database, and a React/TypeScript frontend. The system incorporates robust architectural patterns, extensive testing, security features, and deployment configurations, making it suitable for enterprise-grade applications.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Technology Stack](#technology-stack)
4.  [Prerequisites](#prerequisites)
5.  [Setup and Installation](#setup-and-installation)
    *   [1. Clone the Repository](#1-clone-the-repository)
    *   [2. Environment Configuration](#2-environment-configuration)
    *   [3. Database Setup](#3-database-setup)
    *   [4. Backend Setup](#4-backend-setup)
    *   [5. Frontend Setup](#5-frontend-setup)
6.  [Running the Application](#running-the-application)
    *   [Using Docker Compose (Recommended)](#using-docker-compose-recommended)
    *   [Running Locally](#running-locally)
7.  [Database Management](#database-management)
    *   [Migrations](#migrations)
    *   [Seeding](#seeding)
8.  [API Documentation](#api-documentation)
9.  [Testing](#testing)
    *   [Running Tests](#running-tests)
    *   [Test Coverage](#test-coverage)
10. [Deployment Guide](#deployment-guide)
    *   [Docker Deployment](#docker-deployment)
    *   [CI/CD with GitHub Actions](#cicd-with-github-actions)
11. [Additional Features](#additional-features)
    *   [Authentication & Authorization](#authentication--authorization)
    *   [Logging & Monitoring](#logging--monitoring)
    *   [Error Handling](#error-handling)
    *   [Caching Layer](#caching-layer)
    *   [Rate Limiting](#rate-limiting)
12. [Contributing](#contributing)
13. [License](#license)

## Features

*   **User Management:** Secure user registration, login, and profile management.
*   **Task Management:** Full CRUD operations for tasks (create, read, update, delete).
*   **Authentication & Authorization:** JWT-based authentication, protected routes.
*   **Input Validation:** Robust schema-based validation for all API inputs.
*   **Database Management:** PostgreSQL with TypeORM for ORM, migrations, and seeding.
*   **Caching:** Redis integration for improved performance on frequently accessed data.
*   **Rate Limiting:** Protects API from abuse and brute-force attacks.
*   **Centralized Error Handling:** Consistent error responses across the API.
*   **Structured Logging:** Winston-powered logging for application insights.
*   **Comprehensive Testing:** Unit, integration, and API tests with high coverage.
*   **Containerization:** Docker and Docker Compose for easy setup and deployment.
*   **CI/CD:** Basic GitHub Actions workflow for automated testing and building.
*   **API Documentation:** Interactive API documentation using Swagger UI.
*   **Frontend Application:** React-based UI to interact with the API.

## Architecture

The backend follows a layered architecture to ensure separation of concerns, maintainability, and scalability.

```
+----------------+       +-------------------+       +-------------------+
|    Frontend    | ----> |   API Gateway     | ----> |   Rate Limiting   |
| (React/Vite)   |       | (Nginx/ReversePx) |       |   & Caching       |
+----------------+       +-------------------+       +-------------------+
                                   |                           |
                                   v                           v
+-----------------------------------------------------------------------+
|                         Backend Application (Node.js/Express)         |
| +----------------+      +-----------------+      +-----------------+ |
| |   Routes       | <----|   Controllers   | <----|    Services     | |
| | (Endpoint Def) |      | (Request Hndl)  |      | (Business Logic)| |
| +----------------+      +-----------------+      +-----------------+ |
|          ^                         |                        |        |
|          |                         v                        v        |
|          |         +-------------------------------------------------+ |
|          |         |                 Middlewares                     | |
|          |         | (Auth, Error Handling, Logging, Validation)     | |
|          |         +-------------------------------------------------+ |
|          |                                                            |
|          v                                                            |
| +-------------------------------------------------------------------+ |
| |                       Database Layer (TypeORM)                    | |
| |      +-----------------+      +-----------------+      +----------+ |
| |      |   Entities      | <--->|  Repositories   | <--->| Database | |
| |      | (Schema Def)    |      | (CRUD Ops)      |      | (PostgreSQL)|
| |      +-----------------+      +-----------------+      +----------+ |
| +-------------------------------------------------------------------+ |
+-----------------------------------------------------------------------+
```

**Layers Breakdown:**

1.  **Frontend:** A React application consumed by users.
2.  **API Gateway/Reverse Proxy (Optional, but good practice):** Nginx can sit in front of the backend to handle SSL, load balancing, and static file serving. Not fully implemented in `docker-compose.yml` but can be added.
3.  **Middlewares:** Express middleware functions for cross-cutting concerns like authentication, authorization, rate limiting, caching, logging, and error handling.
4.  **Routes:** Defines API endpoints and maps them to specific controller methods.
5.  **Controllers:** Handle incoming HTTP requests, parse inputs, delegate to services, and send HTTP responses. They focus on request/response handling.
6.  **Services:** Contain the core business logic. They orchestrate data operations and complex workflows, interacting with repositories.
7.  **Database Layer (TypeORM):**
    *   **Entities:** Define the database schema (tables, columns, relations) as TypeScript classes.
    *   **Repositories:** Provide methods for interacting with entities (CRUD operations).
    *   **Migrations:** Scripts to evolve the database schema over time.
    *   **Seeding:** Scripts to populate the database with initial data.
    *   **Database (PostgreSQL):** The persistent data store.
8.  **Utilities:** Helper functions for common tasks like password hashing, JWT token management, and input validation.

## Technology Stack

**Backend:**
*   **Runtime:** Node.js
*   **Language:** TypeScript
*   **Framework:** Express.js
*   **Database:** PostgreSQL
*   **ORM:** TypeORM
*   **Authentication:** JSON Web Tokens (JWT)
*   **Password Hashing:** `bcrypt.js`
*   **Validation:** `zod`
*   **Caching:** Redis (`ioredis`)
*   **Rate Limiting:** `express-rate-limit`
*   **Logging:** `winston`
*   **Testing:** Jest, Supertest
*   **API Docs:** Swagger (OpenAPI)

**Frontend:**
*   **Framework:** React
*   **Tooling:** Vite
*   **Language:** TypeScript
*   **State Management:** React Context API (simple)
*   **Styling:** Tailwind CSS (simple setup)

**DevOps:**
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Git:** For cloning the repository.
*   **Node.js:** v18.x or higher (with npm or yarn).
*   **Docker & Docker Compose:** For running the application in containers.
*   (Optional for local setup) **PostgreSQL:** If you prefer running the database natively.
*   (Optional for local setup) **Redis:** If you prefer running Redis natively.

## Setup and Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/task-management-api.git
cd task-management-api
```

### 2. Environment Configuration

Create `.env` files for both the backend and frontend services.

#### Backend `.env`

Create `backend/.env` based on `backend/.env.example`:

```bash
# General
NODE_ENV=development
PORT=5000

# Database (PostgreSQL)
DB_HOST=db
DB_PORT=5432
DB_USERNAME=admin
DB_PASSWORD=admin_password
DB_DATABASE=task_manager_db

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_please_change_this_in_production
JWT_EXPIRATION_TIME=1h

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_CACHE_TTL_SECONDS=3600 # 1 hour

# Logging
LOG_LEVEL=info # debug, info, warn, error
```

#### Frontend `.env`

Create `frontend/.env` based on `frontend/.env.example`:

```bash
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### 3. Database Setup

If running locally without Docker Compose, ensure PostgreSQL is running.
With Docker Compose, this step is handled automatically.

### 4. Backend Setup

Navigate to the `backend` directory, install dependencies, and build the TypeScript code.

```bash
cd backend
npm install
npm run build # Compiles TypeScript to JavaScript
```

### 5. Frontend Setup

Navigate to the `frontend` directory and install dependencies.

```bash
cd ../frontend
npm install
```

## Running the Application

### Using Docker Compose (Recommended)

This method spins up the PostgreSQL database, Redis cache, backend API, and frontend application with a single command.

1.  Ensure you are in the root directory of the project.
2.  Build and run the services:

    ```bash
    docker-compose up --build
    ```

    *   `--build` ensures that Docker images are rebuilt if there are changes in `Dockerfile` or `package.json`.
    *   The first run will take some time as it downloads images and builds custom ones.

3.  Once all services are up:
    *   **Backend API:** `http://localhost:5000/api/v1` (or the `PORT` specified in `backend/.env`)
    *   **Frontend App:** `http://localhost:3000` (or Vite's default port)
    *   **API Docs (Swagger UI):** `http://localhost:5000/api-docs`

4.  To stop the services:

    ```bash
    docker-compose down
    ```

### Running Locally (without Docker Compose for app services)

This assumes you have a local PostgreSQL and Redis instance running and configured as per your `backend/.env` file.

1.  **Start Database & Redis (if not using Docker Compose for them):**
    Ensure your local PostgreSQL and Redis servers are running.

2.  **Run Backend:**
    Navigate to the `backend` directory and start the server:

    ```bash
    cd backend
    npm run start
    # The API will be available at http://localhost:5000/api/v1
    # API Docs: http://localhost:5000/api-docs
    ```

3.  **Run Frontend:**
    Navigate to the `frontend` directory and start the development server:

    ```bash
    cd frontend
    npm run dev
    # The frontend app will be available at http://localhost:3000
    ```

## Database Management

### Migrations

TypeORM migrations allow you to evolve your database schema.

*   **Generate a new migration:**
    (From `backend` directory)
    ```bash
    npm run typeorm migration:generate -- -n YourMigrationName
    ```
    This will create a new migration file in `backend/src/database/migrations`. You'll need to manually add the `up` and `down` logic.

*   **Run migrations:**
    (From `backend` directory)
    ```bash
    npm run typeorm migration:run
    ```
    This applies all pending migrations to the database.

*   **Revert last migration:**
    (From `backend` directory)
    ```bash
    npm run typeorm migration:revert
    ```

*   **Clear Database (DANGER!):**
    (From `backend` directory)
    ```bash
    npm run typeorm schema:drop
    # Then run migrations again to re-create tables
    npm run typeorm migration:run
    ```

### Seeding

Populate your database with initial data.

*   **Run seeders:**
    (From `backend` directory)
    ```bash
    npm run seed
    ```
    This will execute the `backend/src/database/seeders/seed.ts` script.

## API Documentation

The API documentation is generated using Swagger (OpenAPI specification) and served via Swagger UI.

Once the backend is running, access the interactive API documentation at:
`http://localhost:5000/api-docs`

The OpenAPI specification file can be found at `docs/api-swagger.yaml`.

## Testing

The project includes a comprehensive testing suite covering unit, integration, and API tests using Jest and Supertest.

### Running Tests

(From `backend` directory)

*   **Run all tests:**
    ```bash
    npm test
    ```

*   **Run tests with coverage report:**
    ```bash
    npm test -- --coverage
    ```

*   **Run tests in watch mode:**
    ```bash
    npm test -- --watch
    ```

### Test Coverage

The goal is to maintain 80%+ test coverage for critical backend logic (services, controllers, middlewares). The `npm test -- --coverage` command will display a detailed report.

## Deployment Guide

### Docker Deployment

The `docker-compose.yml` file is designed for local development and can be adapted for production. For a production environment, consider:

1.  **Reverse Proxy:** Use Nginx in front of your backend to handle SSL termination, serve static frontend files, and potentially load balance.
2.  **Persistent Storage:** Ensure your PostgreSQL data directory is mapped to a persistent volume, not just a named volume, if using Docker volumes in production.
3.  **Environment Variables:** Use a secure method for injecting production environment variables (e.g., Kubernetes secrets, Docker Swarm secrets, environment files managed by deployment tools).
4.  **Resource Limits:** Define CPU and memory limits for containers in production.

### CI/CD with GitHub Actions

A basic CI/CD pipeline is configured in `.github/workflows/ci.yml`. This workflow:

1.  **Triggers:** On pushes to `main` branch and pull requests.
2.  **Builds Backend:** Installs dependencies, compiles TypeScript.
3.  **Tests Backend:** Runs all Jest tests.
4.  (Placeholder for future expansion): Can be extended to build Docker images, push to a container registry (e.g., Docker Hub, AWS ECR), and deploy to a cloud provider.

To set up production deployment using GitHub Actions, you would typically add steps for:
*   Docker login to a registry.
*   Building and tagging production Docker images (e.g., `backend:latest`, `frontend:latest`).
*   Pushing images to the registry.
*   Triggering a deployment to your cloud environment (e.g., SSH into a server and `docker-compose pull && docker-compose up -d`, or update a Kubernetes deployment).

## Additional Features

### Authentication & Authorization

*   **JWT-based Authentication:** Users receive a JSON Web Token upon successful login. This token is then sent with subsequent requests in the `Authorization` header.
*   **`authMiddleware`:** Verifies the JWT token and attaches the authenticated user's ID to the request object (`req.userId`).
*   **Authorization:** Tasks are associated with `userId`. CRUD operations for tasks are restricted to the owner of the task.

### Logging & Monitoring

*   **Winston Logger:** Configured for structured logging. Logs are output to the console and can be easily configured to write to files or external logging services (e.g., Logz.io, ELK stack).
*   **`requestLogger` Middleware:** Logs details of every incoming HTTP request.
*   **Error Logging:** All caught exceptions are logged with relevant details.
*   **Monitoring (Mention):** For full-scale monitoring, integrate tools like Prometheus for metrics collection and Grafana for visualization.

### Error Handling

*   **Centralized Error Handling Middleware:** All errors thrown in controllers, services, or middleware are caught by `errorHandler` in `backend/src/middlewares/errorHandler.ts`.
*   **Custom Error Classes:** Allows for differentiating between operational errors (e.g., `ValidationError`, `NotFoundError`, `UnauthorizedError`) and programming errors.
*   **Consistent API Responses:** Ensures all error responses have a consistent format (e.g., `statusCode`, `message`).

### Caching Layer

*   **Redis Integration:** `ioredis` is used for an in-memory data store.
*   **`cacheMiddleware`:** Example middleware in `backend/src/middlewares/cacheMiddleware.ts` demonstrates caching GET requests. For instance, frequently accessed task lists could be cached to reduce database load and improve response times.
*   **Cache Invalidation:** When data changes (e.g., a task is updated or deleted), the relevant cache entries are invalidated (e.g., `redisClient.del('tasks:user:${userId}')`).

### Rate Limiting

*   **`express-rate-limit`:** Integrated as `rateLimitMiddleware` in `backend/src/middlewares/rateLimitMiddleware.ts`.
*   **Configuration:** Configured to allow a certain number of requests per IP address within a specified time window (e.g., 100 requests per 15 minutes). This prevents abuse and brute-force attacks.

## Contributing

Feel free to fork the repository, open issues, and submit pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---
### File Separators

**Note:** Due to the extensive nature of the request, some parts of the frontend, non-critical tests (e.g., 80% coverage on all simple getters/setters), and placeholder configurations will be simplified or outlined to focus on the core architecture and meet the token limit. The backend, database, and core features are fully implemented to demonstrate the comprehensive system.

---