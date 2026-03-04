# Data Visualization Tools System

This is an enterprise-grade, comprehensive data visualization platform built with a high-performance C++ backend, PostgreSQL database, and a flexible web-based frontend. It allows users to ingest various data sources, process them, create interactive visualizations, and organize them into dashboards.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Technology Stack](#technology-stack)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Environment Variables](#environment-variables)
    *   [Docker Compose Setup](#docker-compose-setup)
    *   [Manual Backend Build (Optional)](#manual-backend-build-optional)
    *   [Frontend Setup (Conceptual)](#frontend-setup-conceptual)
5.  [Running the Application](#running-the-application)
6.  [Testing](#testing)
7.  [API Documentation](#api-documentation)
8.  [Deployment Guide](#deployment-guide)
9.  [Contributing](#contributing)
10. [License](#license)

## 1. Features

*   **User Management**: Registration, Login, Authentication (JWT), Authorization.
*   **Data Source Management**:
    *   CRUD operations for various data source types (CSV, PostgreSQL, API connections).
    *   Data ingestion and storage (for file-based sources).
    *   Basic data schema definition.
*   **Data Processing**: Backend C++ engine for filtering, aggregation, and sorting.
*   **Visualization Management**:
    *   CRUD operations for different chart types (bar, line, pie, scatter).
    *   Flexible configuration options for charts (axes, series, colors, transformations).
*   **Dashboard Management**: Create, update, and delete interactive dashboards with multiple visualizations.
*   **Robust Backend**: Built in C++ for performance and efficiency.
*   **Enterprise Features**: Logging, Monitoring, Error Handling, Caching, Rate Limiting.

## 2. Architecture

The system follows a microservices-oriented architecture with a clear separation of concerns:

*   **Frontend**: A responsive web application (e.g., React/Vue/Angular) for user interaction and rendering visualizations.
*   **C++ Backend**: A high-performance RESTful API server handling business logic, data processing, authentication, and database interactions.
*   **PostgreSQL Database**: Stores all application metadata (users, data sources, visualizations, dashboards).
*   **Redis (Optional)**: In-memory data store for caching frequently accessed data or session management.

For a detailed architecture diagram and explanation, refer to `ARCHITECTURE.md`.

## 3. Technology Stack

**Backend (C++)**:
*   **Language**: C++17/20
*   **Build System**: CMake
*   **HTTP Server**: Boost.Beast
*   **JSON Handling**: `nlohmann/json`
*   **Database ORM/Driver**: `libpqxx` for PostgreSQL
*   **Authentication**: JSON Web Tokens (JWT)
*   **Testing**: Catch2
*   **Concurrency**: Boost.Asio

**Database**:
*   PostgreSQL

**Containerization**:
*   Docker
*   Docker Compose

**CI/CD**:
*   GitHub Actions

**Frontend (Conceptual)**:
*   JavaScript Framework (e.g., React)
*   Visualization Libraries (e.g., D3.js, Plotly.js, Chart.js)
*   Build Tool: npm/Yarn

## 4. Setup and Installation

### Prerequisites

*   **Docker** and **Docker Compose**: [Install Docker Engine](https://docs.docker.com/engine/install/)
*   **Git**: For cloning the repository.
*   **C++ Toolchain (Optional, for manual build)**: GCC/Clang (C++17/20 compatible), CMake, Boost libraries (system, thread, program_options, date_time, filesystem), libpqxx-dev.

### Environment Variables

Create a `.env` file in the project root based on `.env.example`. This file configures the backend and database.

```bash
cp .env.example .env
```
Edit `.env` and set appropriate values. **Crucially, change `JWT_SECRET` to a strong, random value for production.**

```dotenv
# .env content
DATABASE_URL="postgresql://user:password@db:5432/datavizdb" # 'db' is the service name in docker-compose
HTTP_ADDRESS="0.0.0.0"
HTTP_PORT="8080"
JWT_SECRET="YOUR_SUPER_SECRET_JWT_KEY_HERE_FOR_PRODUCTION"
LOG_LEVEL="INFO"
```

### Docker Compose Setup

The recommended way to run the system is using Docker Compose. This will set up the PostgreSQL database and the C++ backend.

1.  **Build and Start Services**:
    ```bash
    docker compose build
    docker compose up -d
    ```
    This command will:
    *   Build the `backend` Docker image using the provided `Dockerfile`.
    *   Pull the `postgres:13` image for the database.
    *   Create and start the `db` and `backend` containers.
    *   The `backend` container will automatically run database migrations on startup.

2.  **Verify Services**:
    ```bash
    docker compose ps
    ```
    You should see `dataviz_db` and `dataviz_backend` running and healthy.

### Manual Backend Build (Optional)

If you prefer to build and run the C++ backend directly on your host machine:

1.  **Install Dependencies**:
    ```bash
    sudo apt-get update
    sudo apt-get install -y build-essential cmake libboost-all-dev libpqxx-dev git libssl-dev
    ```
    (Adjust for your OS, e.g., Homebrew for macOS, Chocolatey/vcpkg for Windows)

2.  **Clone Repositories**:
    ```bash
    git clone https://github.com/nlohmann/json.git backend/third_party/nlohmann_json
    git clone https://github.com/catchorg/Catch2.git backend/third_party/Catch2
    ```

3.  **Build**:
    ```bash
    mkdir -p backend/build
    cd backend/build
    cmake .. -DCMAKE_BUILD_TYPE=Release # Or Debug
    make -j $(nproc)
    cd ../..
    ```

4.  **Run PostgreSQL Locally**: You would need a local PostgreSQL instance running and configured as per `DATABASE_URL` in your `.env`.

5.  **Run Backend**:
    ```bash
    # Ensure you are in the project root, and the .env is configured correctly
    export $(grep -v '^#' .env | xargs) # Load environment variables from .env
    ./backend/build/dataviztool
    ```

### Frontend Setup (Conceptual)

The frontend is assumed to be a separate JavaScript application.

1.  **Navigate to Frontend Directory**:
    ```bash
    cd frontend
    ```
2.  **Install Dependencies**:
    ```bash
    npm install # or yarn install
    ```
3.  **Configure API Endpoint**: Ensure `frontend/.env` (or similar) has `REACT_APP_API_BASE_URL` pointing to your backend:
    *   If running frontend outside Docker, accessing Docker backend: `http://localhost:8080/api/v1`
    *   If running frontend inside Docker Compose: `http://backend:8080/api/v1` (where `backend` is the service name).
4.  **Start Frontend**:
    ```bash
    npm start # or yarn start
    ```

## 5. Running the Application

After following the Docker Compose setup:

1.  **Backend API**: Accessible at `http://localhost:8080/api/v1`.
2.  **PostgreSQL**: Accessible at `localhost:5432`. You can connect with `psql -h localhost -U user -d datavizdb`.

The backend will automatically apply migrations. If you want to seed initial data (for development), you can manually run:
```bash
docker compose exec db psql -U user -d datavizdb -f /app/database/seed_data.sql
```
(Requires `seed_data.sql` to be mounted into the `db` container, which it isn't by default in the provided `docker-compose.yml` - you'd need to add a volume mount for `database/seed_data.sql`).

## 6. Testing

The project includes Unit, Integration, and API tests.

*   **Run C++ Tests (Docker)**:
    ```bash
    docker compose exec backend ./dataviztool_tests # Assuming the test executable is named this and copied
    ```
    (Note: The `Dockerfile` and `CMakeLists.txt` need to be updated to copy/run the `DataVizToolTests` executable)

*   **Run C++ Tests (Manual Build)**:
    ```bash
    ./backend/build/DataVizToolTests
    ```
*   **Performance Tests**: Use `locust` (or similar tool) as configured in `locustfile.py`.
    ```bash
    locust -f locustfile.py --host http://localhost:8080
    ```
    Then open your browser to `http://localhost:8089` (Locust UI).

For more details on testing, refer to the `TESTING.md` (conceptual) and the test source files in `backend/tests/`.

## 7. API Documentation

Detailed API endpoints, request/response formats, and authentication requirements are documented in `API.md`.

## 8. Deployment Guide

A guide for deploying this system to a production environment (e.g., cloud VMs, Kubernetes) is available in `DEPLOYMENT.md`. It covers considerations like container orchestration, secret management, monitoring, and scaling.

## 9. Contributing

Contributions are welcome! Please refer to `CONTRIBUTING.md` (conceptual) for guidelines.

## 10. License

This project is licensed under the [MIT License](LICENSE).