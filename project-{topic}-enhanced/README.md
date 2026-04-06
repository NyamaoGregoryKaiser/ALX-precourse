```markdown
# DBOptiFlow: Database Optimization System

DBOptiFlow is a comprehensive, production-ready system designed to monitor database performance, identify bottlenecks, and recommend optimizations. Built with a modern full-stack approach (Node.js/TypeScript backend, React/TypeScript frontend), PostgreSQL, Redis, and Docker, it aims to provide an enterprise-grade solution for database health and performance management.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Environment Setup](#environment-setup)
    *   [Running with Docker Compose](#running-with-docker-compose)
    *   [Running Locally (without Docker)](#running-locally-without-docker)
4.  [Backend API Documentation](#backend-api-documentation)
5.  [Testing](#testing)
6.  [CI/CD](#ci/cd)
7.  [Deployment Guide](#deployment-guide)
8.  [Contribution](#contribution)
9.  [License](#license)

---

## 1. Features

**Core Optimization Logic:**
*   **Simulated Slow Query Monitoring:** Captures and stores simulated slow query logs from connected databases.
*   **Intelligent Recommendation Engine:** Analyzes slow query data to suggest:
    *   Index creation for frequently filtered or joined columns.
    *   Potential query rewrites or schema optimizations.
*   **Recommendation Management:** View, filter, mark as applied/dismissed for optimization suggestions.

**Application Features:**
*   **User Authentication & Authorization:** Secure JWT-based login, registration, and role-based access control (Admin/User).
*   **Target Database Management:** CRUD operations for adding, editing, and removing target database connections.
*   **Dashboard:** High-level overview of database health, open recommendations, and recent slow queries.
*   **Caching Layer (Redis):** Improves performance for frequently accessed data (e.g., user sessions, dashboard aggregates).
*   **Robust Error Handling:** Centralized error handling middleware for consistent API responses.
*   **Comprehensive Logging:** Structured logging (Winston) for backend operations, errors, and requests.
*   **Rate Limiting:** Protects API endpoints from abuse.

**Operational Features:**
*   **Containerization (Docker):** Easy setup and deployment across environments.
*   **CI/CD Pipeline (GitHub Actions):** Automated build, test, and deployment workflows.
*   **Unit, Integration, and API Tests:** High test coverage for reliability.
*   **Performance Testing (k6):** Baseline performance measurements.

---

## 2. Architecture

DBOptiFlow follows a microservices-inspired layered architecture, deployed using Docker containers.

*   **Frontend (React/TypeScript):**
    *   User Interface for interaction with the DBOptiFlow backend.
    *   Uses `axios` for API calls and `@tanstack/react-query` for data fetching and caching.
    *   Secured with JWT stored in HTTP-only cookies.
*   **Backend (Node.js/TypeScript/Express):**
    *   **Auth Module:** Handles user registration, login, token generation, and refresh.
    *   **User Module:** User profile management.
    *   **DB Connection Module:** Manages credentials and configurations for target databases.
    *   **Monitoring Module (Simulated):** Generates and stores synthetic slow query logs and metrics.
    *   **Recommendation Module:** Analyzes monitoring data to create optimization recommendations.
    *   **Dashboard Module:** Aggregates data for the dashboard view.
    *   **Middleware:** Authentication, error handling, rate limiting, request logging.
    *   **Services:** Business logic encapsulated.
    *   **Controllers:** Handle HTTP requests and responses.
*   **Database (PostgreSQL):**
    *   Primary data store for DBOptiFlow's operational data (users, db connections, slow query logs, recommendations).
    *   Managed with TypeORM for ORM capabilities, migrations, and schema definition.
*   **Cache (Redis):**
    *   Used for storing JWT refresh tokens, potentially session data, and transient aggregated data for improved read performance.
*   **External Database (Conceptual):**
    *   The "target" database that DBOptiFlow monitors. For this project, its monitoring is **simulated** via the backend's `monitoring.service`. A real-world system would integrate with actual database performance counters, slow query logs, or vendor APIs.

**Data Flow:**

1.  **User Interaction:** Frontend sends requests to the Backend API.
2.  **Authentication:** Auth middleware validates JWT; if valid, request proceeds.
3.  **Business Logic:** Backend services process requests, interacting with PostgreSQL (via TypeORM) for data persistence and Redis for caching.
4.  **Monitoring (Simulated):** A background scheduler in the backend periodically generates `SlowQueryLog` entries for active `DbConnection`s.
5.  **Recommendation Generation:** The Recommendation service processes `SlowQueryLog` entries to identify patterns and create `Recommendation` entries.
6.  **Response:** Backend sends data back to the frontend, which renders the UI.

You can find a more detailed architectural breakdown in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 3. Getting Started

### Prerequisites

Make sure you have the following installed:
*   [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
*   [Node.js](https://nodejs.org/en/download/) (v20 or higher)
*   [npm](https://www.npmjs.com/get-npm) (comes with Node.js)
*   [Docker](https://www.docker.com/products/docker-desktop/) & [Docker Compose](https://docs.docker.com/compose/install/)

### Environment Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/db-optiflow.git
    cd db-optiflow
    ```

2.  **Create `.env` file:**
    Copy the `.env.example` file to `.env` in the root directory and fill in the values.
    ```bash
    cp .env.example .env
    ```
    **Important:** Change `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to strong, random values in a real environment.

### Running with Docker Compose (Recommended)

This is the easiest way to get all services (backend, frontend, PostgreSQL, Redis) running.

1.  **Build and start the containers:**
    ```bash
    docker compose up --build -d
    ```
    *   `--build`: Builds images from Dockerfiles. Use this on first run or after code changes.
    *   `-d`: Runs containers in detached mode (in the background).

2.  **Verify services are running:**
    ```bash
    docker compose ps
    ```
    You should see `db-optiflow-postgres`, `db-optiflow-redis`, `db-optiflow-backend`, and `db-optiflow-frontend` in a healthy state.

3.  **Access the application:**
    *   **Frontend:** Open your browser to `http://localhost:3000`
    *   **Backend API:** `http://localhost:5000/api`
    *   **Swagger UI (API Docs):** `http://localhost:5000/api-docs`

4.  **Initial Seed Data (Optional, but recommended for testing):**
    To populate the database with an admin user, a regular user, some connected DBs, and sample slow queries/recommendations:
    ```bash
    docker exec -it db-optiflow-backend npm run seed
    ```
    *   **Admin User:** `admin@example.com` / `adminpassword`
    *   **Regular User:** `user@example.com` / `userpassword`

5.  **Stop the services:**
    ```bash
    docker compose down
    ```
    To also remove volumes (database data), use:
    ```bash
    docker compose down -v
    ```

### Running Locally (without Docker for services)

If you prefer to run the backend and frontend directly on your machine and manage PostgreSQL/Redis separately.

**1. Start PostgreSQL & Redis:**
Ensure you have PostgreSQL and Redis running, and configure your `.env` file to point to them (e.g., `DB_HOST=localhost`).

**2. Backend Setup:**
```bash
cd backend
npm install
npm run migration:run # Apply database migrations
npm run seed        # Optional: Seed initial data
npm run dev         # Start the backend in development mode
```
The backend will be available at `http://localhost:5000`.

**3. Frontend Setup:**
```bash
cd frontend
npm install
npm run dev         # Start the frontend in development mode
```
The frontend will be available at `http://localhost:3000`.

---

## 4. Backend API Documentation

The backend includes Swagger/OpenAPI documentation. Once the backend is running, you can access it at:
`http://localhost:5000/api-docs`

This provides an interactive interface to explore all API endpoints, their expected request/response formats, and allows you to test them directly.

---

## 5. Testing

The project is extensively tested with Jest for both backend and frontend.

### Backend Tests

Run all backend tests:
```bash
cd backend
npm test
```
To run tests with watch mode:
```bash
cd backend
npm run test:watch
```
Test coverage report will be generated in `backend/coverage/`.

### Frontend Tests

Run all frontend tests:
```bash
cd frontend
npm test
```
To run tests with watch mode:
```bash
cd frontend
npm run test:watch
```
Test coverage report will be generated in `frontend/coverage/`.

### Performance Tests (k6)

To run the performance tests, you need `k6` installed.
1.  **Install k6:** Follow instructions at [k6.io](https://k6.io/docs/getting-started/installation/).
2.  **Run the test:**
    ```bash
    cd db-optiflow # Ensure you are in the root directory
    k6 run -e VITE_API_BASE_URL=http://localhost:5000/api -e ADMIN_EMAIL=admin@example.com -e ADMIN_PASSWORD=adminpassword k6-performance-test.js
    ```
    This will generate a summary in your console and an `summary.html` report.

---

## 6. CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/ci-cd.yml`) that automates:
*   **Build & Test:** Runs backend and frontend builds and tests on every push/pull request to `main` or `develop` branches.
*   **Docker Build & Push:** Builds Docker images for backend and frontend and pushes them to Docker Hub on successful tests for `main` and `develop` branches.
*   **Deployment:**
    *   Deploys to a `staging` environment when changes are pushed to `develop`.
    *   Deploys to a `production` environment when changes are pushed to `main`.
    (Requires SSH secrets for deployment targets to be configured in GitHub repository settings).

---

## 7. Deployment Guide

A detailed deployment guide is available in [DEPLOYMENT.md](DEPLOYMENT.md). This document outlines steps for deploying DBOptiFlow to a production environment, including considerations for security, scalability, and monitoring.

---

## 8. Contribution

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch for your feature or bug fix (`git checkout -b feature/your-feature-name`).
3.  Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
4.  Push to your fork (`git push origin feature/your-feature-name`).
5.  Open a Pull Request to the `develop` branch.

---

## 9. License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
```