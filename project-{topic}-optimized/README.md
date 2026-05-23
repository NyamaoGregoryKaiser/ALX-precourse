# ML Utils Hub - Machine Learning Utilities System

ML Utils Hub is a comprehensive, production-ready system designed to empower ML engineers and data scientists with essential utilities for managing machine learning projects and performing common data preprocessing tasks. This full-stack application provides robust tools for dataset, model, and experiment metadata management, alongside practical data transformation functionalities.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Technology Stack](#technology-stack)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup](#local-development-setup)
    *   [Docker Deployment](#docker-deployment)
5.  [Database](#database)
    *   [Schema Overview](#schema-overview)
    *   [Migrations](#migrations)
    *   [Seeding](#seeding)
    *   [Query Optimization](#query-optimization)
6.  [API Documentation](#api-documentation)
    *   [Authentication](#authentication)
    *   [Users](#users)
    *   [Datasets](#datasets)
    *   [Models](#models)
    *   [Experiments](#experiments)
    *   [Preprocessing](#preprocessing)
7.  [Testing](#testing)
    *   [Running Tests](#running-tests)
    *   [Test Coverage](#test-coverage)
    *   [Performance Testing](#performance-testing)
8.  [CI/CD](#ci-cd)
9.  [Additional Features](#additional-features)
    *   [Authentication & Authorization](#authentication--authorization)
    *   [Logging & Monitoring](#logging--monitoring)
    *   [Error Handling](#error-handling)
    *   [Caching](#caching)
    *   [Rate Limiting](#rate-limiting)
10. [Deployment Guide](#deployment-guide)
11. [ALX Software Engineering Principles](#alx-software-engineering-principles)

## Features

*   **User Management**: Secure user registration and authentication (JWT).
*   **Dataset Management**:
    *   Upload CSV files and automatically extract schema.
    *   View, update, and delete dataset metadata.
    *   Store dataset versions and descriptions.
*   **Model Management**:
    *   Record details of ML models (name, version, framework, type, associated dataset, metrics, hyperparameters).
    *   Full CRUD operations for model metadata.
*   **Experiment Tracking**:
    *   Log experiment runs, linking to specific models and datasets.
    *   Store experiment parameters, metrics, and artifact references.
*   **Data Preprocessing Utilities**:
    *   API endpoint to perform common transformations on uploaded data (e.g., normalization, standardization, one-hot encoding).
    *   Supports CSV input/output.
*   **Robust API**: RESTful API with clear endpoints and proper HTTP status codes.
*   **Security**: JWT-based authentication, password hashing, rate limiting.
*   **Observability**: Structured logging with Winston, centralized error handling.
*   **Performance**: Caching layer for frequently accessed data.

## Architecture

The system follows a typical **Monorepo** structure, housing both frontend and backend code, and adheres to a **layered architecture** for the backend:

```
[Client (React)] <--- HTTP/S (REST API) ---> [Server (Node.js/Express)]
                                                      |
                                                      |
                                               [Middleware]
                                               (Auth, Logging, Error, Rate Limit)
                                                      |
                                                 [Controllers]
                                               (Request/Response Handling, Validation)
                                                      |
                                                 [Services]
                                               (Business Logic, Data Transformation)
                                                      |
                                                  [Database]
                                              (TypeORM, PostgreSQL)
```

*   **Frontend (React)**: A single-page application (SPA) built with React and TypeScript, providing an intuitive user interface.
*   **Backend (Node.js/Express)**: A RESTful API built with Node.js, Express.js, and TypeScript. It handles business logic, data persistence, authentication, and serves the preprocessing utilities.
*   **Database (PostgreSQL)**: A robust relational database managed with TypeORM.
*   **Containerization (Docker)**: The entire application (backend, frontend, database) is containerized for easy deployment and consistency across environments.

## Technology Stack

### Backend
*   **Language**: TypeScript
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database ORM**: TypeORM
*   **Database**: PostgreSQL
*   **Authentication**: JWT (jsonwebtoken, bcrypt)
*   **Logging**: Winston
*   **Validation**: Joi (used internally, not exposed directly in DTOs for brevity in this response)
*   **File Uploads**: Multer
*   **CSV Processing**: PapaParse
*   **Caching**: `node-cache`
*   **Rate Limiting**: `express-rate-limit`
*   **Testing**: Jest, Supertest

### Frontend
*   **Language**: TypeScript
*   **Framework**: React
*   **UI Library**: Chakra UI
*   **Build Tool**: Vite
*   **API Client**: Axios

### DevOps
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions
*   **Performance Testing**: Artillery (configuration provided)

## Setup and Installation

### Prerequisites

*   Node.js (v18+)
*   npm (v9+)
*   Docker & Docker Compose (for containerized setup)
*   Git

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/ml-utils-hub.git # Replace with actual repo
    cd ml-utils-hub
    ```

2.  **Backend Setup:**
    ```bash
    cd server
    cp .env.example .env
    # Edit .env with your PostgreSQL credentials (or use defaults for local)
    # DB_HOST=localhost
    # DB_PORT=5432
    # DB_USER=mlutilshub_user
    # DB_PASSWORD=password
    # DB_NAME=mlutilshub_db
    # JWT_SECRET=your_jwt_secret_key # IMPORTANT: Change this in production
    # CACHE_TTL=3600 # Cache Time-To-Live in seconds
    # RATE_LIMIT_WINDOW_MS=60000 # 1 minute
    # RATE_LIMIT_MAX_REQUESTS=100

    npm install
    npm run typeorm migration:run # Apply database migrations
    npm run seed # Seed initial data (optional)
    npm run dev # Start the backend server in development mode
    ```
    The backend will run on `http://localhost:3000`.

3.  **Frontend Setup:**
    ```bash
    cd ../client
    npm install
    npm run dev # Start the frontend development server
    ```
    The frontend will run on `http://localhost:5173`. Access the application via your browser at this address.

### Docker Deployment

Ensure Docker and Docker Compose are installed.

1.  **From the project root (`ml-utils-hub`):**
    ```bash
    cp server/.env.example server/.env
    # Customize server/.env for production, especially JWT_SECRET, DB_PASSWORD, etc.
    # Note: DB_HOST inside docker-compose will be 'db' (the service name), not 'localhost'

    docker-compose up --build -d
    ```

    This command will:
    *   Build Docker images for the backend and frontend.
    *   Start a PostgreSQL container.
    *   Run database migrations and seed data on backend startup (configured in `docker-entrypoint.sh`).
    *   Start the backend server.
    *   Start the frontend server (or serve build files via Nginx if configured for production).

    Once all services are up, you can access the application at `http://localhost:3000` (backend API) and `http://localhost:5173` (frontend, or port 80/443 if using Nginx in production).

    To stop the services:
    ```bash
    docker-compose down
    ```

## Database

### Schema Overview

The database uses PostgreSQL and TypeORM. Key entities:

*   **User**: `id`, `username` (unique), `password` (hashed), `email` (unique), `role` (`user`, `admin`).
*   **Dataset**: `id`, `name`, `description`, `version`, `uploadedAt`, `schemaJson` (JSONB), `fileUrl` (S3/local path).
*   **MLModel**: `id`, `name`, `version`, `framework`, `type` (`classification`, `regression`, `clustering`, etc.), `description`, `datasetId` (FK to Dataset), `metricsJson` (JSONB), `hyperparametersJson` (JSONB), `trainedAt`.
*   **ExperimentRun**: `id`, `name`, `description`, `modelId` (FK to MLModel), `datasetId` (FK to Dataset), `runAt`, `parametersJson` (JSONB), `metricsJson` (JSONB), `artifactsUrl`.

### Migrations

TypeORM migrations are used for managing database schema changes.

*   **Generate a new migration:**
    ```bash
    cd server
    npm run typeorm migration:generate src/database/migrations/NewFeatureMigration
    ```
*   **Run pending migrations:**
    ```bash
    cd server
    npm run typeorm migration:run
    ```
*   **Revert last migration:**
    ```bash
    cd server
    npm run typeorm migration:revert
    ```

### Seeding

A seed script (`server/src/database/seed.ts`) is provided to populate the database with initial dummy data for testing and development.

```bash
cd server
npm run seed
```

### Query Optimization

*   **Indexing**: `username`, `email` columns on the `User` table are indexed for fast lookups. `datasetId` on `MLModel` and `ExperimentRun` tables are also indexed for efficient joins.
*   **JSONB Type**: Using PostgreSQL's `JSONB` type for `schemaJson`, `metricsJson`, `hyperparametersJson`, `parametersJson` allows for efficient storage and querying of semi-structured data without requiring a rigid schema upfront.
*   **TypeORM Relations**: Proper use of TypeORM relations (`@ManyToOne`, `@OneToMany`) ensures efficient data fetching with minimal queries (e.g., using `relations` option in `find` calls).

## API Documentation

The backend API is designed as a RESTful service. All endpoints are prefixed with `/api`.

**Base URL**: `http://localhost:3000/api` (or your Docker host)

### Authentication

*   `POST /api/auth/register`
    *   **Body**: `{ username, email, password }`
    *   **Response**: `{ message: string, user: { id, username, email } }`
*   `POST /api/auth/login`
    *   **Body**: `{ username, password }`
    *   **Response**: `{ message: string, token: string, user: { id, username, email } }`
    *   **Authorization Header**: `Authorization: Bearer <token>` required for all protected routes.

### Users (Admin only, for example)

*   `GET /api/users` (Protected)
    *   **Response**: `[{ id, username, email, role }]`

### Datasets (Protected)

*   `GET /api/datasets`
    *   **Response**: `[{ id, name, description, version, uploadedAt, schemaJson, fileUrl }]`
*   `GET /api/datasets/:id`
    *   **Response**: `{ id, name, description, version, uploadedAt, schemaJson, fileUrl }`
*   `POST /api/datasets`
    *   **Body**: `multipart/form-data` with `file` (CSV) and `name`, `description` (optional)
    *   **Response**: `{ id, name, description, version, uploadedAt, schemaJson, fileUrl }`
*   `PUT /api/datasets/:id`
    *   **Body**: `{ name, description, version }` (partial update)
    *   **Response**: `{ id, name, description, version, ... }`
*   `DELETE /api/datasets/:id`
    *   **Response**: `{ message: string }`

### Models (Protected)

*   `GET /api/models`
    *   **Response**: `[{ id, name, version, framework, type, description, datasetId, metricsJson, hyperparametersJson, trainedAt }]`
*   `GET /api/models/:id`
    *   **Response**: `{ id, name, version, framework, type, description, datasetId, metricsJson, hyperparametersJson, trainedAt }`
*   `POST /api/models`
    *   **Body**: `{ name, version, framework, type, description, datasetId, metricsJson, hyperparametersJson }`
    *   **Response**: `{ id, name, version, framework, ... }`
*   `PUT /api/models/:id`
    *   **Body**: `{ name, version, framework, type, description, datasetId, metricsJson, hyperparametersJson }` (partial update)
    *   **Response**: `{ id, name, version, framework, ... }`
*   `DELETE /api/models/:id`
    *   **Response**: `{ message: string }`

### Experiments (Protected)

*   `GET /api/experiments`
    *   **Response**: `[{ id, name, description, modelId, datasetId, runAt, parametersJson, metricsJson, artifactsUrl }]`
*   `GET /api/experiments/:id`
    *   **Response**: `{ id, name, description, modelId, datasetId, runAt, parametersJson, metricsJson, artifactsUrl }`
*   `POST /api/experiments`
    *   **Body**: `{ name, description, modelId, datasetId, parametersJson, metricsJson, artifactsUrl }`
    *   **Response**: `{ id, name, description, modelId, ... }`
*   `PUT /api/experiments/:id`
    *   **Body**: `{ name, description, modelId, datasetId, parametersJson, metricsJson, artifactsUrl }` (partial update)
    *   **Response**: `{ id, name, description, modelId, ... }`
*   `DELETE /api/experiments/:id`
    *   **Response**: `{ message: string }`

### Preprocessing (Protected)

*   `POST /api/preprocessing/transform`
    *   **Body**: `multipart/form-data` with `file` (CSV), `transformationType` (`normalize`, `standardize`, `oneHotEncode`), `columnName` (for single-column transforms), `outputFormat` (`csv`, `json`).
    *   **Response**: Transformed data (CSV file or JSON array).
    *   **Example Body (Normalize)**:
        *   `file`: (your_csv_file.csv)
        *   `transformationType`: `normalize`
        *   `columnName`: `feature_column_1`
        *   `outputFormat`: `csv`
    *   **Example Body (One-Hot Encode)**:
        *   `file`: (your_csv_file.csv)
        *   `transformationType`: `oneHotEncode`
        *   `columnName`: `categorical_feature`
        *   `outputFormat`: `json`

## Testing

The project includes comprehensive tests across multiple layers:

*   **Unit Tests**: Verify individual functions and services in isolation.
*   **Integration Tests**: Test the interaction between different modules (e.g., service and database).
*   **API Tests**: Validate API endpoints, including authentication, request/response formats, and error handling.

### Running Tests

To run all tests:

```bash
cd server
npm test
```

To run tests with coverage reporting:

```bash
cd server
npm test -- --coverage
```

### Test Coverage

The project aims for **80%+ test coverage** for critical backend services and utilities.

### Performance Testing

An Artillery configuration file (`artillery.yml`) is provided for basic performance testing. This can be used to simulate load on the API endpoints.

1.  **Install Artillery (if not already installed):**
    ```bash
    npm install -g artillery
    ```
2.  **Run the performance test (from the project root):**
    ```bash
    artillery run artillery.yml
    ```
    *(Note: Adjust the `target` URL in `artillery.yml` if your backend is not running on `http://localhost:3000`)*

## CI/CD

A GitHub Actions workflow (`.github/workflows/main.yml`) is configured to:

1.  **Trigger**: On `push` to `main` and `pull_request` to `main`.
2.  **Lint**: Run ESLint on the backend code.
3.  **Test**: Execute all backend tests (unit, integration, API).
4.  **Build**: Build the TypeScript backend code.
5.  **Docker Build**: Build the Docker image for the backend.

This provides automated quality checks and ensures the codebase remains healthy. For a full production CI/CD, deployment steps (e.g., to a cloud provider) would be added.

## Additional Features

### Authentication & Authorization

*   **JWT (JSON Web Tokens)**: Used for secure, stateless authentication. Users receive a token upon successful login, which must be sent with subsequent requests in the `Authorization: Bearer <token>` header.
*   **Password Hashing**: Passwords are securely hashed using `bcrypt` before storage.
*   **Middleware**: `authMiddleware` verifies JWTs and `authorizeMiddleware` checks user roles for access control.

### Logging & Monitoring

*   **Winston**: A robust logging library is used for structured logging.
*   **Log Levels**: Configured to log messages at different levels (debug, info, warn, error) to console and potentially to files or external log aggregators.
*   **Centralized Logging**: All application events and errors are logged via a single logger instance.

### Error Handling

*   **Centralized Error Handling Middleware**: A dedicated middleware (`errorHandler`) catches all unhandled errors, formats them consistently, and sends appropriate HTTP responses.
*   **Custom Error Classes**: Specific error classes (e.g., `NotFoundError`, `UnauthorizedError`) can be created for more granular error handling.
*   **Asynchronous Error Handling**: Wrapped async route handlers with `asyncHandler` utility to automatically catch exceptions and pass them to the error handling middleware.

### Caching

*   **`node-cache`**: A simple in-memory caching layer is implemented using `node-cache`.
*   **Example Usage**: Dataset schemas, which are relatively static and frequently accessed, are cached to reduce database load and improve response times.
*   **Configurable TTL**: Cache Time-To-Live (TTL) is configurable via environment variables.

### Rate Limiting

*   **`express-rate-limit`**: Middleware to limit repeated requests to public APIs (e.g., login, registration) or all APIs to prevent brute-force attacks and abuse.
*   **Configuration**: Configurable window size and maximum requests per window via environment variables.

## Deployment Guide

### Using Docker Compose (for production-like environment)

1.  **Set up a Linux server (e.g., Ubuntu VM/EC2 instance).**
2.  **Install Docker and Docker Compose:**
    ```bash
    sudo apt update
    sudo apt install docker.io docker-compose
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER # Log out and back in for this to take effect
    ```
3.  **Clone your repository to the server.**
4.  **Navigate to the project root:** `cd ml-utils-hub`
5.  **Configure Environment Variables:**
    *   Create `server/.env` based on `server/.env.example`.
    *   **Crucially, set strong, unique values for `JWT_SECRET`, `DB_PASSWORD`, and any other sensitive credentials.**
    *   Adjust `DB_HOST` within `server/.env` to `db` if using the `docker-compose.yml` service name.
    *   Consider setting `NODE_ENV=production`.
6.  **Build and Run:**
    ```bash
    docker-compose up --build -d
    ```
    This will pull/build images, start containers, and run migrations/seeds.
7.  **Expose Ports (if necessary):**
    *   Ensure firewall rules (e.g., `ufw`, security groups) allow traffic on ports 80/443 (for frontend) and 3000 (for backend API) if you intend to access them directly. In a production setup, you would typically put a reverse proxy (like Nginx) in front of the frontend and potentially the backend.
8.  **Monitoring**: Set up external monitoring for your Docker containers and logs.

### Scaling (Considerations)

*   For high availability, run multiple instances of the backend service behind a load balancer.
*   Externalize persistent data storage (e.g., AWS S3 for uploaded files, RDS for PostgreSQL) instead of relying on Docker volumes tied to a single host.
*   Use a managed Kubernetes cluster (EKS, GKE, AKS) for orchestration and scaling.

## ALX Software Engineering Principles

This project has been meticulously developed applying core ALX Software Engineering precourse materials:

*   **Programming Logic**: Clear, readable code, well-defined functions, and logical flow throughout the application, especially in the preprocessing utilities.
*   **Algorithm Design**: The preprocessing utility functions (normalization, standardization, one-hot encoding) demonstrate basic algorithmic thinking for data transformation.
*   **Technical Problem Solving**:
    *   **Modularity**: The application is broken down into distinct modules (auth, datasets, models, experiments, preprocessing) and layers (controllers, services, database), promoting separation of concerns.
    *   **Error Handling**: Robust error handling middleware ensures the application gracefully manages unexpected situations and provides meaningful feedback.
    *   **Resource Management**: Efficient use of database connections (TypeORM pooling), file handling, and caching to optimize resource utilization.
    *   **Security**: Implementation of authentication (JWT), authorization, and password hashing to address security concerns.
    *   **Scalability**: Designed with a stateless backend, allowing for horizontal scaling of application instances.
    *   **Maintainability**: Adherence to coding standards (ESLint, Prettier), consistent project structure, and comprehensive documentation make the codebase easy to understand and extend.
    *   **Testing**: A strong emphasis on unit, integration, and API testing ensures the reliability and correctness of the system.
    *   **Version Control**: Designed for use with Git and CI/CD workflows.

---
```