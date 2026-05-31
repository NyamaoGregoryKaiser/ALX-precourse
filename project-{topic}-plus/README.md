# Enterprise Security System (Project Management System)

This project demonstrates a comprehensive, production-ready security implementation system built with TypeScript, Node.js, Express, and PostgreSQL. It focuses on robust authentication, authorization, data validation, logging, error handling, caching, and rate limiting within a Project Management System (PMS) context.

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Features](#features)
3.  [Technologies Used](#technologies-used)
4.  [Prerequisites](#prerequisites)
5.  [Setup Instructions](#setup-instructions)
    *   [Backend Setup](#backend-setup)
    *   [Frontend Setup (Minimal)](#frontend-setup-minimal)
    *   [Docker Setup](#docker-setup)
6.  [Running the Application](#running-the-application)
7.  [API Documentation](#api-documentation)
8.  [Testing](#testing)
9.  [CI/CD](#ci-cd)
10. [Architecture](#architecture)
11. [Deployment Guide](#deployment-guide)
12. [License](#license)

---

## 1. Project Overview

This system is designed as a multi-user Project Management System (PMS) with distinct roles and permissions. It aims to showcase enterprise-grade security practices and system design.

**Key Entities:**
*   **Users:** Authenticated individuals with specific roles.
*   **Projects:** High-level containers for tasks, owned by a Project Manager.
*   **Tasks:** Individual work items within a project, assigned to users.

**Roles:**
*   `ADMIN`: Full control over all users, projects, and tasks.
*   `PROJECT_MANAGER`: Can create, view, update, and delete projects they own; manage tasks within their projects. Can view other projects.
*   `MEMBER`: Can view projects and tasks they are assigned to; update the status of their assigned tasks.

## 2. Features

*   **Authentication:** JWT-based user registration and login.
*   **Authorization:** Role-Based Access Control (RBAC) middleware.
*   **Data Validation:** Strict input validation using `zod` schemas.
*   **Secure Passwords:** `bcrypt` hashing and salting.
*   **Centralized Error Handling:** Custom error types and global middleware.
*   **Structured Logging:** `winston` for application events and errors.
*   **Rate Limiting:** Protect against brute-force attacks and API abuse.
*   **Caching Layer:** `node-cache` for performance optimization on read-heavy operations.
*   **CRUD Operations:** Full Create, Read, Update, Delete for Users, Projects, and Tasks.
*   **Database Migrations:** Schema management with Prisma.
*   **Seed Data:** Initial data for roles and an admin user.
*   **Comprehensive Testing:** Unit, integration, and API tests using Jest and Supertest.
*   **Dockerization:** Containerized application for easy deployment.
*   **CI/CD Pipeline:** Basic GitHub Actions workflow for automated testing and building.
*   **API Documentation:** OpenAPI (Swagger) specification.
*   **Architecture & Deployment Docs:** Detailed guides.

## 3. Technologies Used

**Backend:**
*   **TypeScript:** Type-safe JavaScript.
*   **Node.js:** JavaScript runtime.
*   **Express.js:** Web application framework.
*   **Prisma:** ORM for database interaction.
*   **PostgreSQL:** Relational database.
*   **jsonwebtoken:** For JWT creation and verification.
*   **bcrypt:** For password hashing.
*   **dotenv:** For environment variable management.
*   **zod:** For schema validation.
*   **winston:** For logging.
*   **express-rate-limit:** For rate limiting.
*   **node-cache:** For in-memory caching.
*   **http-status-codes:** For standardized HTTP status codes.

**Testing:**
*   **Jest:** Test runner.
*   **Supertest:** For HTTP assertions in integration tests.

**Containerization:**
*   **Docker:** For containerizing the application.
*   **Docker Compose:** For orchestrating multi-container applications (backend, database).

**CI/CD:**
*   **GitHub Actions:** For automated workflows.

**Frontend (Minimal Placeholder):**
*   **React:** UI library.
*   **TypeScript:** Type-safe JavaScript.

## 4. Prerequisites

Before you begin, ensure you have the following installed:

*   Node.js (LTS version, e.g., v18.x or v20.x)
*   npm or yarn
*   Docker & Docker Compose (optional, but recommended for easy setup)
*   Git

## 5. Setup Instructions

You can run the application either directly on your machine or using Docker. Docker is recommended for a consistent environment.

### Backend Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/project-security-system.git
    cd project-security-system/backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install
    ```

3.  **Create `.env` file:**
    Copy `.env.example` to `.env` and fill in the values.
    ```bash
    cp .env.example .env
    ```
    **`.env` example content:**
    ```
    # Application Configuration
    NODE_ENV=development
    PORT=5000
    LOG_LEVEL=info # debug, info, warn, error

    # Database Configuration (PostgreSQL)
    DATABASE_URL="postgresql://user:password@localhost:5432/pms_db?schema=public"
    TEST_DATABASE_URL="postgresql://user:password@localhost:5433/pms_test_db?schema=public"

    # JWT Configuration
    JWT_SECRET=YOUR_VERY_STRONG_JWT_SECRET_KEY_HERE # min 32 characters, generate randomly
    JWT_EXPIRES_IN=1h

    # Hashing Configuration
    SALT_ROUNDS=10 # Number of salt rounds for bcrypt

    # Rate Limiting
    RATE_LIMIT_WINDOW_MS=60000 # 1 minute
    RATE_LIMIT_MAX_REQUESTS=100 # Max 100 requests per window

    # Caching
    CACHE_TTL_SECONDS=300 # 5 minutes
    ```

    **Important:** For `JWT_SECRET`, generate a strong, random string. You can use tools like `openssl rand -base64 32` for this.

4.  **Database Setup (if not using Docker):**
    Ensure you have a PostgreSQL server running. Create a database named `pms_db`.
    *   **Generate Prisma client & run migrations:**
        ```bash
        npx prisma migrate dev --name init # This creates tables based on schema.prisma
        ```
    *   **Seed the database:**
        ```bash
        npx prisma db seed
        ```
        This will create initial roles and an `admin` user.
        *   **Admin Credentials:** `admin@example.com` / `password123`

### Frontend Setup (Minimal)

1.  Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or yarn install
    ```

3.  Start the frontend (it will connect to `http://localhost:5000` by default):
    ```bash
    npm start
    # or yarn start
    ```

### Docker Setup

This is the recommended way to run the entire application (backend + PostgreSQL database).

1.  **Ensure Docker and Docker Compose are installed.**

2.  **Build and start the services:**
    Navigate to the root directory of the project (`project-security-system/`).
    ```bash
    docker-compose up --build -d
    ```
    *   This will:
        *   Build the backend Docker image.
        *   Start a PostgreSQL container.
        *   Start the backend container, which will automatically run Prisma migrations and seeding.

3.  **Verify services:**
    ```bash
    docker-compose ps
    ```
    You should see `backend` and `db` services running.

4.  **Stop services:**
    ```bash
    docker-compose down
    ```

## 6. Running the Application

### Without Docker

1.  **Start the backend:**
    Navigate to `backend/`.
    ```bash
    npm run dev # For development with hot-reloading
    # or npm start # For production build
    ```
    The backend API will be available at `http://localhost:5000`.

2.  **Start the frontend:**
    Navigate to `frontend/`.
    ```bash
    npm start
    ```
    The frontend will typically run on `http://localhost:3000`.

### With Docker

Once `docker-compose up -d` is run:

*   **Backend API:** `http://localhost:5000`
*   **PostgreSQL:** `localhost:5432` (accessible from host machine, mapped in `docker-compose.yml`)

## 7. API Documentation

API documentation is generated using OpenAPI (Swagger) specification.
You can find the definition in `docs/api.yaml`.

*   If running the backend, you can typically access an auto-generated Swagger UI at `/api-docs` (not implemented here, but standard practice). For this project, you'd use a tool like [Swagger Editor](https://editor.swagger.io/) to view `api.yaml`.

## 8. Testing

Tests are written using `Jest` and `Supertest`.

1.  **Unit Tests:** For individual functions/utilities.
    ```bash
    cd backend
    npm run test:unit
    ```

2.  **Integration/API Tests:** For API endpoints and service interactions.
    ```bash
    cd backend
    npm run test:integration
    ```
    **Note:** Integration tests run against a *separate test database*. Ensure your `TEST_DATABASE_URL` in `.env` is correctly configured and points to a dedicated test DB (e.g., `localhost:5433/pms_test_db`). The test setup script will handle migrations for the test DB.

3.  **All Tests:**
    ```bash
    cd backend
    npm test
    ```

## 9. CI/CD

A basic CI/CD pipeline is configured using GitHub Actions.
See `.github/workflows/ci.yml` for the configuration.
This workflow typically runs on `push` to `main` and `pull_requests`, performing:
*   Dependency installation
*   Linting
*   Building
*   Testing

## 10. Architecture

Refer to `docs/architecture.md` for a detailed architectural overview of the system.

## 11. Deployment Guide

Refer to `docs/deployment.md` for instructions on deploying this system to a production environment.

## 12. License

This project is open-source and available under the [MIT License](LICENSE).
```