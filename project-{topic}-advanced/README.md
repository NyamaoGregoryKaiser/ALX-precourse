```markdown
# Enterprise-Grade Task Management System

This is a comprehensive, production-ready Task Management System built with a focus on scalability, maintainability, and security. It features a modern full-stack architecture using Node.js/Express/TypeScript for the backend and React/TypeScript for the frontend, backed by PostgreSQL.

## Table of Contents

1.  [Features](#1-features)
2.  [Technology Stack](#2-technology-stack)
3.  [Project Structure](#3-project-structure)
4.  [Local Development Setup](#4-local-development-setup)
    *   [Prerequisites](#prerequisites)
    *   [Environment Variables](#environment-variables)
    *   [Database & Cache Setup (Docker Compose)](#database--cache-setup-docker-compose)
    *   [Backend Setup](#backend-setup)
    *   [Frontend Setup](#frontend-setup)
    *   [Running the Application](#running-the-application)
5.  [API Documentation](#5-api-documentation)
6.  [Testing](#6-testing)
7.  [Architecture](#7-architecture)
8.  [Deployment Guide](#8-deployment-guide)
9.  [Contributing](#9-contributing)
10. [License](#10-license)

## 1. Features

*   **User Management:** Register, Login, User Profiles, Role-based Access Control (Admin, Member, Guest).
*   **Project Management:** Create, View, Update, Delete projects. Assign project owners.
*   **Task Management:** Create, Assign, Update (status, priority, due date), Delete tasks. Filter, sort, and search tasks.
*   **Comments:** Add and manage comments for tasks.
*   **Authentication & Authorization:** JWT-based secure access with middleware for role-based permissions.
*   **Robust Error Handling:** Centralized error middleware, custom `AppError` types for predictable error responses.
*   **Logging & Monitoring:** Structured logging with Winston for effective debugging and operational insights. Custom request logger.
*   **Caching:** Redis integration for improved data retrieval performance for frequently accessed data.
*   **Rate Limiting:** Protects against abuse and Denial-of-Service (DoS) attacks.
*   **Input Validation:** Joi-based schema validation for all incoming API requests.
*   **Dockerized Development:** Easy setup and consistent development/production environments using Docker Compose.
*   **CI/CD Ready:** GitHub Actions configuration for automated testing and linting on every push/pull request.
*   **Comprehensive Documentation:** Detailed `README`, interactive API documentation with Swagger/OpenAPI, and architectural overview.

## 2. Technology Stack

*   **Backend:** Node.js, Express.js, TypeScript, TypeORM
*   **Frontend:** React, TypeScript, Vite, Tailwind CSS (for styling examples)
*   **Database:** PostgreSQL
*   **Caching:** Redis
*   **Authentication:** JSON Web Tokens (JWT), `bcryptjs` for password hashing
*   **Containerization:** Docker, Docker Compose
*   **Testing:** Jest, Supertest (backend), React Testing Library (frontend)
*   **Validation:** Joi
*   **Logging:** Winston
*   **API Documentation:** Swagger/OpenAPI (YAML)
*   **CI/CD:** GitHub Actions

## 3. Project Structure

The project uses a monorepo-like structure with separate `backend` and `frontend` directories, along with shared Docker configurations.

```
task-management-system/
├── backend/                  # Node.js/Express/TypeScript API
│   ├── src/                  # Source code for the backend
│   │   ├── config/           # Environment and application configurations
│   │   ├── controllers/      # Request handlers, call services
│   │   ├── middlewares/      # Express middlewares (auth, error, rate limiting, logging)
│   │   ├── models/           # TypeORM entities (database schemas)
│   │   ├── migrations/       # Database migration scripts
│   │   ├── routes/           # API route definitions
│   │   ├── services/         # Business logic, interacts with repositories
│   │   ├── utils/            # Utility functions (logger, JWT, validation schemas, errors)
│   │   ├── data-source.ts    # TypeORM data source configuration & seeding
│   │   ├── app.ts            # Express application setup
│   │   └── server.ts         # Application entry point
│   ├── swagger.yaml          # OpenAPI/Swagger definition (auto-generated or manually maintained)
│   ├── .env.example          # Example environment variables
│   ├── package.json          # Backend dependencies and scripts
│   ├── tsconfig.json         # TypeScript configuration
│   └── ormconfig.ts          # TypeORM CLI configuration
├── frontend/                 # React/TypeScript application
│   ├── public/               # Static assets
│   ├── src/                  # Source code for the frontend
│   │   ├── assets/           # Images, icons
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React Context providers (e.g., AuthContext)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Main application views
│   │   ├── services/         # API client (Axios), other external services
│   │   ├── types/            # TypeScript type definitions
│   │   ├── utils/            # Frontend utility functions (e.g., logger)
│   │   ├── App.tsx           # Main application component, routing
│   │   └── main.tsx          # React entry point
│   ├── .env.example          # Example environment variables for frontend
│   ├── package.json          # Frontend dependencies and scripts
│   └── tsconfig.json         # TypeScript configuration
├── docker-compose.yml        # Docker Compose for local development (DB, Redis, Backend, Frontend)
├── Dockerfile.backend        # Dockerfile for backend production image
├── Dockerfile.frontend       # Dockerfile for frontend production image
├── nginx/                    # Nginx configuration for frontend serving & API proxy
│   └── nginx.conf
├── .github/                  # GitHub Actions CI/CD workflows
│   └── workflows/
│       └── ci.yml
└── README.md                 # Project documentation
```

## 4. Local Development Setup

### Prerequisites

Before you begin, ensure you have the following installed:

*   **Git**
*   **Node.js** (v20 or higher recommended)
*   **Yarn** (or npm, but `yarn` is used in scripts)
*   **Docker Desktop** (or Docker Engine and Docker Compose)

### Environment Variables

1.  **Clone the repository:**
    ```bash
    git clone https://github.your-username/task-management-system.git
    cd task-management-system
    ```

2.  **Create `.env` files:**
    *   Copy `backend/.env.example` to `backend/.env`
    *   Copy `frontend/.env.example` to `frontend/.env`
    *   Edit these files with your desired configurations. For local Docker Compose setup, the default values in `.env.example` should work well.

    **`backend/.env` (example for local Docker Compose setup):**
    ```dotenv
    NODE_ENV=development
    PORT=5000
    FRONTEND_PORT=3000
    FRONTEND_URL=http://localhost:3000

    # These point to the Docker service names for inter-container communication
    DB_HOST=postgres
    DB_PORT=5432
    DB_USER=postgres
    DB_PASSWORD=postgres
    DB_NAME=task_management_db

    JWT_SECRET=a_super_secret_key_for_development_only_do_not_use_in_production
    JWT_EXPIRES_IN=1h

    REDIS_HOST=redis
    REDIS_PORT=6379

    RATE_LIMIT_WINDOW_MS=60000
    RATE_LIMIT_MAX_REQUESTS=100
    ```

    **`frontend/.env` (example for local direct backend access):**
    ```dotenv
    # In local development without the Nginx proxy, the frontend directly calls the backend
    VITE_API_BASE_URL=http://localhost:5000/api/v1
    ```
    *Note: If you plan to run frontend and backend via `docker-compose up` without individual `yarn dev` for frontend, then `VITE_API_BASE_URL` should be `/api/v1` in `Dockerfile.frontend` for Nginx to proxy it.*

### Database & Cache Setup (Docker Compose)

Use Docker Compose to spin up your PostgreSQL database and Redis cache services. The `healthcheck` in `docker-compose.yml` ensures that the backend and frontend wait for these services to be ready.

```bash
docker-compose up -d postgres redis
```
You can check the status with `docker-compose ps` and logs with `docker-compose logs -f postgres`.

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    yarn install
    # or npm install
    ```

3.  **Run database migrations:**
    ```bash
    yarn typeorm migration:run
    # This will create tables based on your entities and migration scripts.
    ```

4.  **Seed the database (optional, for development/testing):**
    ```bash
    yarn seed
    # This will populate your database with initial admin and member users, projects, and tasks.
    # Check `backend/src/data-source.ts` for the `seedDatabase` function details.
    ```

5.  **Build Swagger Documentation:**
    ```bash
    yarn build:swagger
    # This generates `swagger.yaml` from JSDoc comments in routes and models.
    # It's also run as a `predev` hook, so `yarn dev` will build it automatically.
    ```

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../frontend
    ```

2.  **Install dependencies:**
    ```bash
    yarn install
    # or npm install
    ```

### Running the Application

1.  **Start the Backend (in a new terminal):**
    ```bash
    cd ../backend
    yarn dev
    # The backend will start on http://localhost:5000
    ```

2.  **Start the Frontend (in another new terminal):**
    ```bash
    cd ../frontend
    yarn dev
    # The frontend will start on http://localhost:3000 (or as configured in frontend/.env)
    ```

Now, open your browser to `http://localhost:3000` to access the application.

**Default Login Credentials (after seeding):**
*   **Admin:** `email: admin@example.com`, `password: adminpassword`
*   **Member:** `email: member@example.com`, `password: memberpassword`

---

## 5. API Documentation

The backend exposes an OpenAPI/Swagger UI endpoint for interactive API documentation.

*   **Swagger UI:** Access it at `http://localhost:5000/api-docs` when the backend is running.
*   The API definitions are located in `backend/swagger.yaml` and are generated by the `yarn build:swagger` script. This script parses JSDoc comments in your route files and TypeORM entity definitions to construct the OpenAPI specification.

## 6. Testing

The project includes comprehensive tests across the stack to ensure quality and reliability.

*   **Unit Tests:** For individual functions, services, and utilities, focusing on isolated logic. (Jest)
*   **Integration Tests:** For controllers and service interactions with mocked or dedicated test databases, ensuring component collaboration. (Jest, Supertest)
*   **API Tests:** Verifying API endpoints behave as expected from an external perspective. (Supertest, Postman/Newman, Swagger UI)
*   **Frontend Tests:** For React components (rendering, user interaction) and custom hooks. (Jest, React Testing Library)

To run tests:

*   **Backend Tests:**
    ```bash
    cd backend
    yarn test
    # Aim for 80%+ coverage.
    ```
*   **Frontend Tests:**
    ```bash
    cd frontend
    yarn test
    # Aim for 80%+ coverage.
    ```

## 7. Architecture

The system follows a typical **Client-Server** architecture with a **RESTful API** and a layered backend design.

**High-Level Overview:**

```
+-----------------------------------+     +-----------------------------------+     +-------------------------+     +-----------------+
|          Frontend App             |     |            Backend API            |     |      PostgreSQL         |     |      Redis      |
|     (React/TypeScript/Vite)       |<--->|       (Node.js/Express/TS)        |<--->|         Database        |<--->|     (Cache)     |
+-----------------------------------+     +-----------------------------------+     +-------------------------+     +-----------------+
        ^                                        ^                                                                  ^
        |                                        |                                                                  |
        +----------------------------------------+ (HTTPS / HTTP)                                                   |
          Browser/Mobile Client                                                                                     |
                                                 |                                                                  |
                                                 +------------------------------------------------------------------+ (Internal Network)
                                                        Logging, Monitoring, CI/CD, Docker Orchestration
```

**Backend Architecture (Layered):**

The backend employs a layered architecture for clear separation of concerns:

*   **Routes:** Define API endpoints and map incoming requests to appropriate controllers. They also apply common middlewares like authentication, authorization, and validation.
*   **Controllers:** Act as the entry point for API requests. They handle request parsing, input validation (using Joi schemas), and delegate business logic execution to services. They then format the service response into an HTTP response.
*   **Services:** Encapsulate the core business logic of the application. They orchestrate complex operations, interact with repositories (ORM) for data persistence, apply domain-specific rules, and can interact with other services or external APIs. This layer is decoupled from HTTP concerns.
*   **Models (Entities):** TypeORM entities define the database schema, table relationships, data types, and any entity-specific behaviors (e.g., hooks).
*   **Middlewares:** Intercept requests and responses to handle cross-cutting concerns such as authentication, authorization, error handling, request logging, and rate limiting.
*   **Utils:** A collection of helper functions and modules, including JWT token generation/verification, structured logging (Winston), custom error classes, and Joi validation schemas.
*   **`data-source.ts`:** TypeORM's central configuration for database connection, entity registration, and migration management. Also includes a `seedDatabase` function for development.

**Frontend Architecture:**

The frontend follows a component-based architecture using React:

*   **Pages:** Top-level components that represent distinct views or routes in the application (e.g., `DashboardPage`, `ProjectsPage`, `LoginPage`). They often compose multiple smaller components.
*   **Components:** Reusable UI elements (`TaskCard`, `Header`, `Sidebar`, `Button`). They are designed to be modular and encapsulate their own styling and logic.
*   **Context/Hooks:** React Context is used for global state management (e.g., `AuthContext` for user authentication). Custom hooks (`useAuth`, `useTasks`) encapsulate reusable logic and stateful behavior.
*   **Services:** Dedicated modules (e.g., `api.ts` with Axios) handle communication with the backend API.
*   **Types:** TypeScript interfaces and types are used extensively to ensure type safety across the application, especially for API request/response structures.

## 8. Deployment Guide

This project is designed for containerized deployment using Docker. The provided `Dockerfile.backend`, `Dockerfile.frontend`, and `docker-compose.yml` can be extended for various production environments.

1.  **Build Docker Images:**
    Ensure Docker Desktop is running. From the root directory of the project:
    ```bash
    docker build -f Dockerfile.backend -t task-management-backend:latest .
    docker build -f Dockerfile.frontend -t task-management-frontend:latest .
    ```
    (Alternatively, `docker-compose up --build` will build images defined in `docker-compose.yml` automatically).

2.  **Prepare Production Environment Variables:**
    Ensure your `backend/.env` file (or environment variables directly injected into your deployment environment) contains production-ready values. **Critical variables** like `JWT_SECRET`, `DB_PASSWORD`, and `NODE_ENV` must be secure and appropriate for production. For the frontend, `VITE_API_BASE_URL` should be `/api/v1` to leverage the Nginx proxy within Docker.

3.  **Run with Docker Compose (Production-like Environment):**
    For a single-server production-like deployment (suitable for smaller applications or staging), you can use `docker-compose.yml` with production environment variables.
    ```bash
    # Make sure your backend/.env and frontend/.env are configured for production
    # Or export them before running compose:
    # export NODE_ENV=production
    # export DB_HOST=postgres
    # ...
    docker-compose -f docker-compose.yml up --build -d
    ```
    This command will start the PostgreSQL database, Redis cache, backend API, and frontend (served by Nginx) services. The frontend will be accessible on the port mapped for Nginx (e.g., `http://localhost:3000` if `FRONTEND_PORT=3000` in `.env`). Nginx will then proxy `/api/v1/` requests to the backend service.

4.  **Database Migrations on Deployment:**
    In a robust production deployment, running database migrations is a critical step *before* starting the backend application.
    *   **Option A (Docker Exec):** After the `backend` container is running, you can execute the migration command inside it:
        ```bash
        docker exec -it task_management_backend yarn typeorm migration:run
        ```
    *   **Option B (Dedicated Migration Container):** For more automation, you can create a small, temporary Docker container whose sole purpose is to run migrations and then exit. This is ideal for CI/CD pipelines. This would involve a separate service in `docker-compose.yml` or a dedicated Kubernetes Job.
    **Important:** Always keep `synchronize: false` in `backend/src/data-source.ts` for production. `synchronize: true` is extremely dangerous in production as it can lead to data loss.

5.  **CI/CD for Automated Deployment:**
    The `.github/workflows/ci.yml` provides a starting point for GitHub Actions. For a full Continuous Deployment (CD) pipeline, you would extend this workflow to:
    *   Build and push Docker images to a container registry (e.g., Docker Hub, AWS ECR, Google Container Registry) upon successful CI.
    *   Deploy the updated images to your cloud provider's orchestration service (e.g., AWS ECS/EKS, Google Cloud Run/GKE, Azure AKS, DigitalOcean App Platform) using appropriate deployment tools (e.g., Terraform, AWS CLI, Kubectl, Helm charts).
    *   Implement rollback strategies in case of deployment failures.

## 9. Contributing

Contributions are welcome! If you have suggestions, bug reports, or want to add new features, please:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write tests for your changes.
5.  Ensure linting and tests pass (`yarn lint && yarn test`).
6.  Commit your changes (`git commit -am 'feat: Add new feature'`).
7.  Push to your branch (`git push origin feature/your-feature-name`).
8.  Open a Pull Request.

Please adhere to conventional commit messages.

## 10. License

This project is licensed under the MIT License. See the `LICENSE` file in the root of the repository for details.
```