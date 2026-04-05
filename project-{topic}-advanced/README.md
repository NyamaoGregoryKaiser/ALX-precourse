```markdown
# PerformancePulse - Enterprise-Grade Performance Monitoring System

PerformancePulse is a comprehensive, production-ready system for monitoring the performance and availability of web services and URLs. It features a robust backend built with Node.js/Express and TypeScript, a dynamic frontend with React, a PostgreSQL database, and integrated tools for caching, logging, authentication, and performance testing.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Local Setup with Docker Compose](#local-setup-with-docker-compose)
    *   [Manual Local Setup (Backend)](#manual-local-setup-backend)
    *   [Manual Local Setup (Frontend)](#manual-local-setup-frontend)
4.  [API Endpoints](#api-endpoints)
5.  [Running Tests](#running-tests)
6.  [CI/CD](#ci-cd)
7.  [Deployment](#deployment)
8.  [Documentation](#documentation)
9.  [Contributing](#contributing)
10. [License](#license)

## Features

*   **Service Monitoring:** Define URLs/services to monitor.
*   **Metric Collection:** Automatically collects response time, HTTP status, and error details.
*   **Data Visualization:** Interactive charts on the frontend to display performance trends.
*   **Alerting:** Configure alerts based on metric thresholds (e.g., high response time, status code failures).
*   **User Management:** Secure user registration, login, and role-based authorization.
*   **Project Organization:** Group monitors under projects for better management.
*   **Scalable Backend:** Node.js, Express, TypeScript, TypeORM with PostgreSQL.
*   **Interactive Frontend:** React, TypeScript, React Router, ApexCharts for data visualization.
*   **Authentication & Authorization:** JWT-based authentication, role-based access control.
*   **Caching:** Redis integration for API response caching to improve performance.
*   **Rate Limiting:** Protects API endpoints from abuse.
*   **Structured Logging:** Winston for consistent and searchable logs.
*   **Error Handling:** Centralized, robust error handling middleware.
*   **Observability:** Exposes Prometheus metrics for the PerformancePulse backend itself.
*   **Containerization:** Docker support for easy setup and deployment.
*   **Comprehensive Testing:** Unit, Integration, API, and Performance tests.
*   **Detailed Documentation:** README, API docs, Architecture, Deployment guides.

## Architecture

For a detailed explanation of the system's architecture, please refer to [ARCHITECTURE.md](ARCHITECTURE.md).

## Getting Started

### Prerequisites

*   Node.js (v18+)
*   npm or yarn
*   Docker & Docker Compose (recommended for local setup)
*   PostgreSQL (if not using Docker)
*   Redis (if not using Docker)

### Local Setup with Docker Compose (Recommended)

This is the fastest way to get all services (backend, frontend, PostgreSQL, Redis, Prometheus, Grafana) up and running.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/performance-pulse.git
    cd performance-pulse
    ```

2.  **Create `.env` files:**
    *   Copy `.env.example` to `.env` in both the `backend/` and `frontend/` directories.
        ```bash
        cp backend/.env.example backend/.env
        cp frontend/.env.example frontend/.env
        ```
    *   Review and adjust variables in both `.env` files if necessary. Default values should work for local development.

3.  **Build and run services:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build Docker images for the backend and frontend.
    *   Start PostgreSQL, Redis, Prometheus, Grafana containers.
    *   Run database migrations and seed data for the backend.

4.  **Access the applications:**
    *   **Frontend:** `http://localhost:3000`
    *   **Backend API:** `http://localhost:5000`
    *   **Grafana:** `http://localhost:3001` (default user/pass: admin/admin)
    *   **Prometheus:** `http://localhost:9090`

5.  **Stop services:**
    ```bash
    docker-compose down
    ```

### Manual Local Setup (Backend)

1.  **Navigate to the backend directory:**
    ```bash
    cd performance-pulse/backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install
    ```

3.  **Create and configure `.env`:**
    ```bash
    cp .env.example .env
    ```
    Ensure your database (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`) and Redis (`REDIS_HOST`, `REDIS_PORT`) configurations are correct for your local setup.

4.  **Start PostgreSQL and Redis servers:**
    Ensure you have PostgreSQL and Redis running locally and accessible via the configured credentials.

5.  **Run database migrations:**
    ```bash
    npm run typeorm migration:run -d src/database/data-source.ts
    ```

6.  **Seed initial data (optional):**
    ```bash
    npm run seed
    ```

7.  **Start the backend server:**
    ```bash
    npm run start:dev
    ```
    The backend API will be available at `http://localhost:5000`.

### Manual Local Setup (Frontend)

1.  **Navigate to the frontend directory:**
    ```bash
    cd performance-pulse/frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install
    ```

3.  **Create and configure `.env`:**
    ```bash
    cp .env.example .env
    ```
    Ensure `REACT_APP_BACKEND_URL` points to your backend API (e.g., `http://localhost:5000`).

4.  **Start the frontend development server:**
    ```bash
    npm start
    ```
    The frontend application will open in your browser at `http://localhost:3000`.

## API Endpoints

For a detailed list of all backend API endpoints, their methods, request/response bodies, and authentication requirements, please refer to [API.md](API.md).

## Running Tests

### Backend Tests

Navigate to `backend/` and run:

*   **All tests:** `npm test`
*   **Unit tests:** `npm test -- tests/unit`
*   **Integration tests:** `npm test -- tests/integration`
*   **API tests:** `npm test -- tests/api`
*   **Coverage report:** `npm test -- --coverage`

### Frontend Tests

Navigate to `frontend/` and run:

*   **All tests:** `npm test` (this will run tests in watch mode, press `a` to run all)

### Performance Tests (K6)

These tests simulate load on the backend API. Ensure your backend is running.

1.  **Install K6:** Follow instructions on [k6.io](https://k6.io/docs/getting-started/installation/).
2.  **Run the script:**
    ```bash
    cd performance-pulse/k6
    k6 run script.js
    ```

## CI/CD

A basic GitHub Actions workflow (`.github/workflows/ci.yml`) is provided for linting, building, and testing the backend and frontend on push. Refer to the file for details.

## Deployment

For instructions on deploying PerformancePulse to a production environment using Docker and Docker Compose, including considerations for NGINX proxy, SSL, and scaling, please refer to [DEPLOYMENT.md](DEPLOYMENT.md).

## Documentation

*   **[ARCHITECTURE.md](ARCHITECTURE.md):** High-level design and architectural decisions.
*   **[API.md](API.md):** Detailed API documentation.
*   **[DEPLOYMENT.md](DEPLOYMENT.md):** Guide for deploying the application.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License - see the `LICENSE` file for details (not included in this single file response, but would be present in a real project).
```