```markdown
# My DevOps Project: Full-Stack Application with Automated CI/CD

This project is a comprehensive, production-ready full-stack application built with TypeScript, Node.js (Express), React, and PostgreSQL, demonstrating a complete DevOps automation system. It encompasses core application logic, database management, Dockerization, CI/CD pipelines, extensive testing, and advanced features like authentication, logging, caching, and rate limiting.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Local Development Setup](#local-development-setup)
    *   [Prerequisites](#prerequisites)
    *   [Backend Setup](#backend-setup)
    *   [Frontend Setup](#frontend-setup)
    *   [Running with Docker Compose](#running-with-docker-compose)
5.  [Database Management](#database-management)
    *   [Migrations](#migrations)
    *   [Seeding](#seeding)
6.  [Testing](#testing)
    *   [Backend Tests](#backend-tests)
    *   [Frontend Tests](#frontend-tests)
    *   [Performance Tests](#performance-tests)
7.  [CI/CD with GitHub Actions](#cicd-with-github-actions)
    *   [Configuration](#configuration)
    *   [Secrets Management](#secrets-management)
8.  [API Documentation](#api-documentation)
9.  [Architecture](#architecture)
10. [Deployment](#deployment)
11. [Additional Features](#additional-features)
12. [License](#license)

---

## 1. Features

### Core Application
*   **User Management:** Register, Login, View, Update, Delete Users.
*   **Product Management:** Create, Read (all, by ID), Update, Delete Products.
*   **Authentication:** JWT-based user authentication.
*   **Authorization:** Role-based access control (Admin vs. Regular User).

### DevOps & Quality
*   **Containerization:** Dockerized Backend, Frontend (Nginx), and PostgreSQL.
*   **Orchestration:** `docker-compose` for local multi-service setup.
*   **CI/CD:** GitHub Actions for automated build, linting, testing, and Docker image pushes.
*   **Testing:** Unit, Integration, and API tests (Jest, Supertest, React Testing Library). Aim for 80%+ test coverage.

### Advanced Features
*   **Logging:** Centralized Winston-based logging for backend activities and errors.
*   **Error Handling:** Global middleware for standardized error responses.
*   **Caching:** In-memory caching for frequently accessed data (e.g., product lists) to improve performance.
*   **Rate Limiting:** Protects API endpoints from abuse with `express-rate-limit`.
*   **Security:** `helmet` middleware for HTTP header security.
*   **Environment Configuration:** `.env` files for flexible environment-specific settings.

---

## 2. Technology Stack

*   **Backend:** Node.js (Express.js), TypeScript
*   **Database:** PostgreSQL
*   **ORM:** TypeORM
*   **Frontend:** React.js, TypeScript, Styled Components
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions
*   **Testing:** Jest, Supertest, React Testing Library
*   **Logging:** Winston
*   **Authentication:** JWT (jsonwebtoken), bcryptjs
*   **Caching:** node-cache
*   **Rate Limiting:** express-rate-limit
*   **API Client:** Axios

---

## 3. Project Structure

```
my-devops-project/
├── .github/                      # GitHub Actions workflows
├── backend/                      # Node.js/Express.js/TypeORM API
│   ├── src/
│   │   ├── config/               # Configuration files (DB, env)
│   │   ├── controllers/          # API request handlers
│   │   ├── entities/             # TypeORM database models
│   │   ├── middleware/           # Auth, error handling, rate limiting
│   │   ├── migrations/           # Database migration scripts
│   │   ├── repositories/         # Custom TypeORM repositories
│   │   ├── routes/               # API endpoint definitions
│   │   ├── services/             # Business logic layer
│   │   ├── tests/                # Unit & Integration tests
│   │   ├── utils/                # Helper utilities (logger, cache)
│   │   ├── app.ts                # Express application setup
│   │   ├── seed.ts               # Database seeding script
│   │   └── server.ts             # Application entry point
│   ├── .env.example              # Example environment variables
│   ├── Dockerfile                # Dockerfile for backend service
│   ├── jest.config.js            # Jest configuration
│   ├── ormconfig.json            # TypeORM CLI configuration
│   ├── package.json              # Backend dependencies and scripts
│   └── tsconfig.json             # TypeScript configuration
├── frontend/                     # React.js UI application
│   ├── public/
│   ├── src/
│   │   ├── api/                  # API client setup (Axios)
│   │   ├── components/           # Reusable UI components
│   │   ├── context/              # React Context for authentication
│   │   ├── pages/                # Page-level components
│   │   ├── styles/               # Global styles
│   │   ├── tests/                # Unit tests for frontend
│   │   ├── App.tsx               # Main application component
│   │   └── index.tsx             # React app entry point
│   ├── .env.example              # Example environment variables
│   ├── Dockerfile                # Dockerfile for frontend service (Nginx)
│   ├── jest.config.js            # Jest configuration
│   ├── nginx.conf                # Nginx configuration for serving React app
│   ├── package.json              # Frontend dependencies and scripts
│   └── tsconfig.json             # TypeScript configuration
├── docker-compose.yml            # Defines and runs multi-container Docker app
├── API_DOCS.md                   # API Documentation (conceptual)
├── ARCHITECTURE.md               # Architecture Overview
├── DEPLOYMENT.md                 # Deployment Guide
├── performance-test.sh           # Simple performance test script
└── .gitignore                    # Git ignore rules
```

---

## 4. Local Development Setup

### Prerequisites

Before you begin, ensure you have the following installed on your machine:
*   [Git](https://git-scm.com/)
*   [Node.js](https://nodejs.org/en/) (v18 or higher) & [npm](https://www.npmjs.com/) (usually comes with Node.js)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop) (includes Docker Engine and Docker Compose)
*   [jq](https://stedolan.github.io/jq/) (for `performance-test.sh`)
*   [ApacheBench (ab)](https://httpd.apache.org/docs/2.4/programs/ab.html) (for `performance-test.sh` - usually part of `apache2-utils` on Linux or available via Homebrew on macOS)

### Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd my-devops-project/backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file from the example:
    ```bash
    cp .env.example .env
    # Adjust `DATABASE_URL` if running PostgreSQL locally without Docker
    # e.g., DATABASE_URL=postgresql://user:password@localhost:5432/mydatabase
    ```
4.  Run database migrations (ensure PostgreSQL is running locally if not using Docker Compose):
    ```bash
    npm run migrate:run
    ```
5.  Seed initial data:
    ```bash
    npm run seed
    ```
6.  Start the backend in development mode:
    ```bash
    npm run dev
    ```
    The backend should be accessible at `http://localhost:5000`.

### Frontend Setup

1.  Navigate to the `frontend` directory:
    ```bash
    cd my-devops-project/frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file from the example:
    ```bash
    cp .env.example .env
    # Ensure REACT_APP_API_BASE_URL points to your backend (e.g., http://localhost:5000/api)
    ```
4.  Start the frontend development server:
    ```bash
    npm start
    ```
    The frontend should be accessible at `http://localhost:3000`.

### Running with Docker Compose

This is the recommended way to run the entire application locally, as it includes the database, backend, and frontend services.

1.  Navigate to the root of the project:
    ```bash
    cd my-devops-project
    ```
2.  Build and start all services using Docker Compose:
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Rebuilds images even if they exist (useful for code changes).
    *   `-d`: Runs containers in detached mode (in the background).

    This will:
    *   Start a PostgreSQL database (`db`).
    *   Build and start the backend service (`backend`), running migrations and seeding data automatically (as defined in `Dockerfile` and `docker-compose.yml`).
    *   Build and start the frontend service (`frontend`), serving the React app via Nginx.

3.  Verify services are running:
    ```bash
    docker-compose ps
    ```
    You should see `db`, `backend`, and `frontend` containers in a `running` or `healthy` state.

4.  Access the application:
    *   Frontend: `http://localhost:3000`
    *   Backend API: `http://localhost:5000/api`

5.  To view logs from all services:
    ```bash
    docker-compose logs -f
    ```

6.  To stop and remove containers, networks, and volumes (for a fresh start):
    ```bash
    docker-compose down -v
    ```

---

## 5. Database Management

The backend uses TypeORM for database interactions and migrations.

### Migrations

Migrations are used to manage schema changes in a version-controlled way.

*   **Create a new migration file:**
    ```bash
    cd backend
    npm run migrate:make --name=YourMigrationName
    ```
    This generates an empty migration file in `src/migrations`. You'll need to manually add `up` (apply changes) and `down` (revert changes) logic.

*   **Run pending migrations:**
    ```bash
    cd backend
    npm run migrate:run
    ```
    This applies all migrations that haven't been run yet to the database. This command is also executed automatically by the backend Docker container on startup in the `Dockerfile`.

*   **Revert the last migration:**
    ```bash
    cd backend
    npm run migrate:revert
    ```
    **Use with caution**, especially in production.

### Seeding

The `seed.ts` script populates the database with initial user and product data.

*   **Run the seeding script:**
    ```bash
    cd backend
    npm run seed
    ```
    This command is also executed automatically by the backend Docker container on startup in the `docker-compose.yml` (for development setup) or can be integrated into your production deployment strategy.

---

## 6. Testing

The project has a robust testing suite for both backend and frontend.

### Backend Tests

Run all backend unit and integration tests (using Jest and Supertest):

```bash
cd backend
npm test
# To watch for changes and re-run tests:
# npm run test:watch
```

This will run tests, generate a coverage report (`coverage/` directory), and display coverage statistics in the console. The goal is to maintain 80%+ code coverage for critical logic.

### Frontend Tests

Run all frontend unit tests (using Jest and React Testing Library):

```bash
cd frontend
npm test
# To watch for changes and re-run tests:
# npm run test:watch
```

This will run tests, generate a coverage report (`coverage/` directory), and display coverage statistics.

### Performance Tests

A simple shell script is provided to demonstrate basic performance testing using `curl` and `ApacheBench (ab)`.

1.  Ensure the Docker Compose services are running (`docker-compose up -d`).
2.  Run the performance test script from the project root:
    ```bash
    ./performance-test.sh
    ```
    This script will:
    *   Attempt to register a test user.
    *   Login to get a JWT token.
    *   Perform a basic `GET /api/products` request with `curl`.
    *   Run `ab` to stress test `GET /api/products` with `100` requests and `10` concurrent connections, saving results to `ab_results_products.txt`.

For more advanced performance testing, consider integrating dedicated tools like [k6](https://k6.io/) or [JMeter](https://jmeter.apache.org/).

---

## 7. CI/CD with GitHub Actions

The project uses GitHub Actions to automate the build, test, and deployment process. Workflows are defined in the `.github/workflows/` directory.

### Configuration

*   **`backend-ci.yml`**:
    *   Triggers on `push` to `main` or `develop` branches (only if `backend/` files change) and `pull_request` to `main`/`develop`.
    *   **Jobs**:
        *   `build-and-test`: Sets up Node.js, installs dependencies, lints (`npm run lint`), builds (`npm run build`), and runs tests (`npm test`). Uploads coverage reports as artifacts.
        *   `docker-build-and-push`: Runs only if `build-and-test` passes and on `main`/`develop` branches. Logs into Docker Hub, builds the backend Docker image, and pushes it to `docker.io/<DOCKER_USERNAME>/my-devops-backend:latest`.

*   **`frontend-ci.yml`**:
    *   Similar trigger logic to `backend-ci.yml` but for `frontend/` files.
    *   **Jobs**:
        *   `build-and-test`: Sets up Node.js, installs dependencies, lints (`npm run lint`), builds the React app (`npm run build`), and runs tests (`npm test`). Uploads coverage reports as artifacts.
        *   `docker-build-and-push`: Runs only if `build-and-test` passes and on `main`/`develop` branches. Logs into Docker Hub, builds the frontend Docker image, and pushes it to `docker.io/<DOCKER_USERNAME>/my-devops-frontend:latest`.

### Secrets Management

For Docker Hub login credentials (`DOCKER_USERNAME`, `DOCKER_PASSWORD`) and other sensitive information, you **must** configure GitHub Secrets in your repository:
1.  Go to your GitHub repository.
2.  Navigate to `Settings` -> `Secrets and variables` -> `Actions`.
3.  Add the following repository secrets:
    *   `DOCKER_USERNAME`: Your Docker Hub username.
    *   `DOCKER_PASSWORD`: Your Docker Hub Access Token (recommended over password for automation).

---

## 8. API Documentation

This project's API follows a RESTful design. Below is a conceptual overview of the endpoints. For a full interactive API documentation, tools like Swagger/OpenAPI are recommended to generate dynamic docs from annotations (as conceptually added in `backend/src/routes/*.ts`).

**Base URL**: `http://localhost:5000/api` (or your deployed backend URL)

### Authentication (`/api/auth`)

*   **`POST /register`**
    *   **Description**: Register a new user.
    *   **Request Body**: `{ "email": "user@example.com", "password": "password123", "role": "user" }`
    *   **Success Response**: `201 Created` - `{ "message": "User registered successfully", "user": { "id": "uuid", "email": "...", "role": "..." } }`
    *   **Error Responses**: `400 Bad Request`, `409 Conflict` (user already exists), `500 Internal Server Error`

*   **`POST /login`**
    *   **Description**: Authenticate user and get JWT token.
    *   **Request Body**: `{ "email": "user@example.com", "password": "password123" }`
    *   **Success Response**: `200 OK` - `{ "message": "Login successful", "token": "jwt_token_string", "role": "user" }`
    *   **Error Responses**: `400 Bad Request`, `401 Unauthorized` (invalid credentials), `500 Internal Server Error`

### Users (`/api/users`) - **Requires `Authorization: Bearer <token>`**

*   **`GET /`** (Admin Only)
    *   **Description**: Get a list of all users.
    *   **Success Response**: `200 OK` - `[{ "id": "uuid", "email": "...", "role": "..." }]`
    *   **Error Responses**: `401 Unauthorized`, `403 Forbidden`

*   **`GET /:id`** (Admin or Owner Only)
    *   **Description**: Get a single user by ID.
    *   **Success Response**: `200 OK` - `{ "id": "uuid", "email": "...", "role": "..." }`
    *   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

*   **`PUT /:id`** (Admin or Owner Only)
    *   **Description**: Update a user's details.
    *   **Request Body**: `{ "email"?: "new@example.com", "password"?: "new_password", "role"?: "admin" }` (non-admins cannot change role)
    *   **Success Response**: `200 OK` - `{ "message": "User updated successfully", "user": { ... } }`
    *   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

*   **`DELETE /:id`** (Admin or Owner Only)
    *   **Description**: Delete a user.
    *   **Success Response**: `204 No Content`
    *   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### Products (`/api/products`) - **Requires `Authorization: Bearer <token>`**

*   **`GET /`**
    *   **Description**: Get a list of all products.
    *   **Success Response**: `200 OK` - `[{ "id": "uuid", "name": "...", "price": 10.99, "userId": "...", "user": { "id": "...", "email": "..."} }]`
    *   **Error Responses**: `401 Unauthorized`

*   **`GET /:id`**
    *   **Description**: Get a single product by ID.
    *   **Success Response**: `200 OK` - `{ "id": "uuid", "name": "...", "price": 10.99, "userId": "...", "user": { "id": "...", "email": "..."} }`
    *   **Error Responses**: `401 Unauthorized`, `404 Not Found`

*   **`POST /`**
    *   **Description**: Create a new product.
    *   **Request Body**: `{ "name": "New Product", "description": "...", "price": 25.50, "isActive": true }` (userId is automatically set from token)
    *   **Success Response**: `201 Created` - `{ "message": "Product created successfully", "product": { ... } }`
    *   **Error Responses**: `400 Bad Request`, `401 Unauthorized`, `409 Conflict` (product name exists)

*   **`PUT /:id`** (Admin or Owner Only)
    *   **Description**: Update an existing product.
    *   **Request Body**: `{ "name"?: "Updated Name", "price"?: 30.00, "isActive"?: false }`
    *   **Success Response**: `200 OK` - `{ "message": "Product updated successfully", "product": { ... } }`
    *   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict` (name already exists)

*   **`DELETE /:id`** (Admin or Owner Only)
    *   **Description**: Delete a product.
    *   **Success Response**: `204 No Content`
    *   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

---

## 9. Architecture

This project employs a microservices-inspired architecture, structured into logical layers and deployed using containerization for scalability and maintainability.

### High-Level Overview

```
+---------------------------------+        +---------------------+
|         Frontend (React)        | <----> | Backend (Node/Express) | <----+
|  (Served by Nginx in Docker)    |        | (Dockerized API)    |      |
+---------------------------------+        +---------------------+      |
                                                                        |
                                                                        |
                                                                        |
                                                                        |
                                                                        v
+---------------------------------+
|         PostgreSQL Database     |
|         (Dockerized)            |
+---------------------------------+
```

### Component Breakdown

1.  **Frontend (React.js)**:
    *   **Technology**: React.js with TypeScript, Styled Components for styling, Axios for API calls, React Router for navigation.
    *   **Purpose**: Provides the user interface for interacting with the application.
    *   **Deployment**: Built into static assets and served by an Nginx container.
    *   **Authentication**: Stores JWT tokens in `localStorage` and sends them with authenticated requests.

2.  **Backend (Node.js/Express.js)**:
    *   **Technology**: Node.js with Express.js, TypeScript, TypeORM for ORM, PostgreSQL driver (`pg`).
    *   **Purpose**: Serves as the API layer, handling business logic, data validation, authentication, authorization, and database interactions.
    *   **Layers**:
        *   **`config`**: Application and database configuration.
        *   **`entities`**: TypeORM models defining database schema.
        *   **`repositories`**: Custom TypeORM repositories extending basic CRUD operations.
        *   **`services`**: Contains core business logic, orchestrates data operations, and interacts with repositories. This layer is highly testable.
        *   **`controllers`**: Handles incoming HTTP requests, validates input, calls services, and formats responses.
        *   **`routes`**: Defines API endpoints and maps them to controller methods, applying middleware.
        *   **`middleware`**: Express middleware for cross-cutting concerns like JWT authentication, role-based authorization, error handling, rate limiting, and logging.
        *   **`utils`**: Helper functions for logging (Winston) and caching (NodeCache).
    *   **Deployment**: Dockerized Node.js application.

3.  **Database (PostgreSQL)**:
    *   **Technology**: PostgreSQL relational database.
    *   **Purpose**: Persistent storage for application data (Users, Products).
    *   **Management**: Schema defined by TypeORM entities, managed via TypeORM migrations for controlled updates. Seed data scripts for initial population.
    *   **Deployment**: Dockerized PostgreSQL instance with persistent volume for data.

### Data Flow

1.  **User Interaction**: A user interacts with the **Frontend** (e.g., clicks login, adds a product).
2.  **API Request**: The Frontend makes an HTTP request to the **Backend API** using Axios. For authenticated requests, it includes a JWT token in the `Authorization` header.
3.  **Backend Processing**:
    *   The request first hits global middleware (`rateLimit`, `helmet`, `morgan` for logging).
    *   `authenticateToken` middleware validates the JWT. If valid, `req.user` is populated.
    *   `authorizeRoles` middleware checks if the authenticated user has the necessary permissions.
    *   The request is routed to the appropriate **Controller** method.
    *   The Controller calls one or more **Service** methods to execute business logic.
    *   Services interact with **Repositories** to perform CRUD operations on **Entities** in the **PostgreSQL Database**. Caching (`node-cache`) might be used here for read operations.
4.  **Database Interaction**: TypeORM translates service requests into SQL queries and executes them against PostgreSQL.
5.  **Response**: The Backend sends an HTTP response (JSON) back to the Frontend.
6.  **UI Update**: The Frontend receives the response and updates the UI accordingly.

### DevOps Workflow

*   **Development**: Developers write code, test locally using `npm run dev` and `npm test`, and manage local Docker services with `docker-compose`.
*   **Version Control**: Code is pushed to GitHub (`main` or `develop` branches).
*   **CI/CD (GitHub Actions)**:
    *   A `push` or `pull_request` triggers the relevant CI pipeline (`backend-ci.yml`, `frontend-ci.yml`).
    *   **Build & Test**: Code is linted, compiled, and unit/integration/API tests are run. Coverage reports are generated.
    *   **Docker Build & Push**: If CI passes, Docker images for backend and frontend are built and pushed to Docker Hub.
*   **Deployment (Conceptual)**: Pushed Docker images can then be pulled by a production orchestration system (e.g., Kubernetes, AWS ECS, Google Cloud Run) for deployment. Automated deployment steps would be defined in a CD workflow (e.g., `deploy.yml`).

---

## 10. Deployment

This section outlines the deployment process for a production environment. It assumes a cloud-native approach using Docker images pushed to a container registry.

### 1. Pre-Deployment Steps

*   **Environment Variables**:
    *   **Backend**: Production-ready `.env` variables (`DATABASE_URL`, `JWT_SECRET`, `CACHE_TTL`, `RATE_LIMIT_*`, `NODE_ENV=production`) must be securely configured in your deployment environment (e.g., Kubernetes Secrets, AWS Parameter Store, environment variables in your PaaS).
    *   **Frontend**: `REACT_APP_API_BASE_URL` must point to the *publicly accessible URL* of your backend API. This is usually set during the Docker image build process (`Dockerfile` `ARG` and `ENV`) or as an environment variable for the Nginx container if you have a dynamic configuration.
*   **Container Registry**: Ensure your Docker Hub (`DOCKER_USERNAME` / `DOCKER_PASSWORD` secrets) or another container registry (e.g., AWS ECR, Google Container Registry) is configured for pushing images from CI/CD.
*   **Database Service**: Provision a managed PostgreSQL database service (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL). **Do not use the `db` container from `docker-compose.yml` in production** as it's for development only. Ensure it's accessible from your application's network.

### 2. CI/CD Pipeline (GitHub Actions)

As detailed in the [CI/CD with GitHub Actions](#7-cicd-with-github-actions) section, on successful merges to `main` (or `develop`), the pipelines will:
1.  Run tests and linting.
2.  Build Docker images for `backend` and `frontend`.
3.  Push these images to your configured Docker registry (e.g., Docker Hub).
    *   Backend image: `docker.io/<DOCKER_USERNAME>/my-devops-backend:latest`
    *   Frontend image: `docker.io/<DOCKER_USERNAME>/my-devops-frontend:latest`

### 3. Production Deployment Strategy (Conceptual)

A typical production deployment would involve an orchestration platform pulling these images and managing their lifecycle.

**Example Deployment using Kubernetes (Conceptual)**

For a Kubernetes-based deployment, you would typically define:

*   **Deployment Manifests**: YAML files defining how your `backend` and `frontend` applications run (e.g., `Deployment` objects specifying desired replica counts, container images, resource limits, environment variables).
*   **Service Manifests**: YAML files defining how to expose your applications within the Kubernetes cluster and to the outside world (e.g., `Service` objects for internal communication, `Ingress` for external HTTP/HTTPS access).
*   **Persistent Volume Claim (PVC)**: If your backend required local persistent storage (this project uses external PostgreSQL so not strictly needed for backend, but crucial for the database itself if it were in-cluster).
*   **Secrets**: Kubernetes `Secret` objects for sensitive environment variables like `JWT_SECRET` and `DATABASE_URL`.
*   **Database Migrations**: A separate Kubernetes `Job` or `Init Container` in your backend deployment to run `npm run migrate:run` before the application starts, ensuring the database schema is up-to-date.

**Example `deployment.yaml` (Simplified for backend)**

```yaml
# Kubernetes Backend Deployment Example (Simplified)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-deployment
  labels:
    app: backend
spec:
  replicas: 3 # Run multiple instances for high availability
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: docker.io/<DOCKER_USERNAME>/my-devops-backend:latest # Use your pushed image
        ports:
        - containerPort: 5000
        env:
        - name: PORT
          value: "5000"
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL # From Kubernetes Secret
          valueFrom:
            secretKeyRef:
              name: backend-secrets
              key: DATABASE_URL
        - name: JWT_SECRET # From Kubernetes Secret
          valueFrom:
            secretKeyRef:
              name: backend-secrets
              key: JWT_SECRET
        # Add other environment variables as needed
        resources: # Define resource limits for stable operation
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        livenessProbe: # Checks if the app is still running
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 15
          periodSeconds: 20
        readinessProbe: # Checks if the app is ready to serve traffic
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 10
      initContainers: # Run migrations before the app container starts
      - name: migrate-db
        image: docker.io/<DOCKER_USERNAME>/my-devops-backend:latest # Same image as app
        command: ["npm", "run", "migrate:run"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: backend-secrets
              key: DATABASE_URL
```

**Deployment Workflow using CD Pipeline (e.g., ArgoCD, Flux, or custom script)**

1.  A CD pipeline would watch for new image tags in the container registry.
2.  When a new image is pushed (e.g., `my-devops-backend:latest`), the CD pipeline would update the image tag in the Kubernetes deployment manifest.
3.  Kubernetes would then perform a rolling update, gradually replacing old pods with new ones running the updated image.

### 4. Monitoring & Alerting

*   Integrate monitoring tools (e.g., Prometheus for metrics, Grafana for dashboards, ELK stack for logs, Datadog/New Relic for APM) to observe application health, performance, and resource utilization.
*   Set up alerts for critical issues (e.g., high error rates, low disk space, unresponsive services).

### 5. Rollback Strategy

*   In case of a faulty deployment, the orchestration platform should allow for quick rollback to a previous stable version. Docker image tags (e.g., `my-devops-backend:v1.0.0`, `my-devops-backend:v1.0.1`) are crucial for this.

---

## 11. Additional Features

This project includes several enterprise-grade features for security, performance, and maintainability.

*   **Authentication & Authorization**:
    *   **JWT (JSON Web Tokens)**: Used for stateless authentication. After login, a token is issued and included in subsequent requests to verify user identity.
    *   **Bcrypt**: Passwords are securely hashed using `bcryptjs` before storage to prevent plain-text password exposure.
    *   **Role-Based Access Control (RBAC)**: Middleware (`authorizeRoles`) enforces access based on user roles (`admin`, `user`), ensuring only authorized users can perform specific actions (e.g., only 'admin' can view all users).

*   **Logging and Monitoring**:
    *   **Winston**: A robust logging library used for structured logging of application events, API requests (via `morgan`), and errors. Logs are output to the console and can be configured to write to files or external logging services (e.g., CloudWatch, ELK stack).
    *   **Monitoring**: While full monitoring system integration (Prometheus, Grafana) is beyond the scope of this project's code, the foundation for metrics collection is laid with detailed logging. In a production scenario, you would expose metrics endpoints and use a monitoring agent.

*   **Error Handling Middleware**:
    *   A global error handler (`errorHandler`) catches unhandled exceptions and sends standardized JSON error responses to the client, preventing sensitive stack traces from leaking in production and providing a consistent error experience.
    *   A 404 handler (`notFoundHandler`) catches requests to non-existent routes.

*   **Caching Layer**:
    *   **`node-cache`**: An in-memory cache is implemented for the backend to store frequently accessed data (e.g., all products). This reduces database load and improves response times for read-heavy operations.
    *   **Cache Invalidation**: Middleware (`invalidateProductCacheMiddleware`) automatically invalidates relevant cache entries when data is modified (e.g., creating, updating, or deleting a product invalidates the 'all products' cache). For distributed systems, a more robust solution like Redis would be used.

*   **Rate Limiting**:
    *   **`express-rate-limit`**: Middleware (`apiRateLimiter`) is applied globally to restrict the number of requests a client can make within a specified time window. This protects against brute-force attacks and abuse, improving API stability. Configurable limits (requests per minute) are managed via environment variables.

*   **Security Headers**:
    *   **`helmet`**: A collection of 14 smaller middleware functions that set various HTTP headers to improve application security (e.g., XSS protection, MIME-type sniffing prevention, HSTS).

*   **CORS Configuration**:
    *   Configured using `cors` middleware to control which origins can access the API, preventing cross-site scripting attacks. In production, this should be restricted to known frontend domains.

---

## 12. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details (if you create one).
```