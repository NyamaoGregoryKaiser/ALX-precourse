```markdown
# DataVizSystem: A Comprehensive Data Visualization Platform

## Overview

DataVizSystem is an enterprise-grade data visualization platform built with a high-performance C++ backend, a robust PostgreSQL database, and an interactive React frontend. This system is designed to allow users to upload datasets (e.g., CSV), manage their data, define visualization configurations, and generate dynamic charts and graphs.

The C++ backend handles data ingestion, complex data processing (filtering, aggregation, sorting), API management with full CRUD operations, authentication, and authorization. It leverages modern C++ standards and libraries for efficiency and reliability.

### Core Features

*   **User Management**: Registration, Login, Role-based Access Control (User, Admin).
*   **Dataset Management**: Upload, store, retrieve, update, and delete datasets (CSV support, extensible).
*   **Data Processing**: Server-side filtering, grouping, aggregation (sum, avg, count, min, max), and sorting of raw data.
*   **Visualization Management**: Create, store, update, and delete visualization configurations (e.g., bar charts, line charts) linked to datasets.
*   **Interactive Frontend**: A React application for uploading files, browsing datasets, configuring visualizations, and displaying charts.
*   **Authentication & Authorization**: JWT-based authentication for secure API access and role-based access control.
*   **Comprehensive Testing**: Unit, integration, and API tests to ensure quality and reliability.
*   **Containerization**: Docker and Docker Compose for easy deployment and environment consistency.
*   **CI/CD**: GitHub Actions pipeline for automated testing and deployment.
*   **Logging & Monitoring**: Structured logging with `spdlog`.
*   **Error Handling**: Centralized error handling middleware.
*   **Caching (Conceptual)**: Redis integration for potential future data caching.
*   **Rate Limiting (Conceptual)**: Can be integrated with Nginx or a C++ middleware.

## Architecture

For a detailed architectural overview, refer to [ARCHITECTURE.md](ARCHITECTURE.md).

## API Documentation

For a detailed API reference, refer to [API.md](API.md).

## Deployment Guide

For instructions on deploying the system, refer to [DEPLOYMENT.md](DEPLOYMENT.md).

## Setup and Installation

This guide will help you set up and run the DataVizSystem using Docker Compose.

### Prerequisites

*   Docker (v20.10.0 or later)
*   Docker Compose (v2.0.0 or later)
*   Git

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/DataVizSystem.git
cd DataVizSystem
```

### 2. Configure Environment Variables

Create `.env` files for both the backend and frontend services.
Copy the example files and populate them with your desired values.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**`backend/.env`**:
```ini
# Backend Configuration
DATA_VIZ_APP_PORT=18080
DATA_VIZ_LOG_LEVEL=info # debug, info, warn, error, critical

# Database Configuration
DATA_VIZ_DB_HOST=database # This refers to the service name in docker-compose
DATA_VIZ_DB_PORT=5432
DATA_VIZ_DB_USER=dataviz_user
DATA_VIZ_DB_PASSWORD=dataviz_password
DATA_VIZ_DB_NAME=dataviz_db

# JWT Secret (MUST be strong and kept secret in production)
DATA_VIZ_JWT_SECRET="your_super_secret_jwt_key_please_change_in_production_1234567890"

# Data storage path (relative to executable or absolute path in container)
DATA_VIZ_STORAGE_PATH=/app/assets/datasets
```

**`frontend/.env`**:
```ini
# Frontend Configuration
# In development, points directly to the backend service on localhost
REACT_APP_API_BASE_URL=http://localhost:18080/api

# In production (via Docker Compose), Nginx handles proxying to the backend service.
# This variable might be ignored or dynamically configured by Nginx in the Docker setup.
```

### 3. Prepare Sample Data (for testing/initial use)

Create the directory for dataset storage and place a sample CSV file there.
This directory (`backend/assets/datasets`) will be mounted as a Docker volume.

```bash
mkdir -p backend/assets/datasets
# Create a sample_sales.csv file inside backend/assets/datasets/
# Example content for backend/assets/datasets/sample_sales.csv:
cat <<EOF > backend/assets/datasets/sample_sales.csv
Product,Sales,Region,Date
Laptop,1200,North,2023-01-15
Mouse,25,North,2023-01-16
Keyboard,75,South,2023-01-17
Laptop,1500,South,2023-02-01
Monitor,300,East,2023-02-02
Mouse,30,East,2023-02-03
EOF
```
This `sample_sales.csv` corresponds to the `seed_data.sql` entry for `Sample Sales Data`.

### 4. Build and Run with Docker Compose

```bash
docker-compose up --build -d
```

This command will:
1.  Build the `backend` C++ application image.
2.  Build the `frontend` React application image.
3.  Start the `database` (PostgreSQL), `redis` (caching), `backend` API, and `frontend` (Nginx serving React) services.
4.  Apply database schema (`V1__create_tables.sql`) and seed data (`seed_data.sql`) to PostgreSQL.
5.  Create Docker volumes for persistent data (database, Redis, and uploaded datasets).

Wait a few moments for all services to start and for the database to initialize. You can check the logs:
```bash
docker-compose logs -f
```

### 5. Access the Application

*   **Frontend**: Open your web browser and navigate to `http://localhost:3000`
*   **Backend API**: The API will be accessible via `http://localhost:18080/api` (or the port you configured).
    *   **Health Check**: `http://localhost:18080/health`
    *   **Swagger/OpenAPI**: (Not auto-generated for C++ Crow, but detailed in `API.md`)

### Initial Credentials (from `database/seed_data.sql`)

*   **Admin User**:
    *   Email: `admin@example.com`
    *   Password: `adminpass`
*   **Regular User**:
    *   Email: `user@example.com`
    *   Password: `userpass`

Please log in with these credentials in the frontend.

### Stopping the Application

```bash
docker-compose down
```
This will stop and remove the containers and networks. If you also want to remove volumes (which deletes all data including your database data and uploaded datasets):
```bash
docker-compose down --volumes
```

## Testing

### Running C++ Backend Tests

The C++ backend tests are integrated into the `build-and-test-backend` job in the CI/CD pipeline.
To run locally:

```bash
# Ensure you have C++ build tools, cmake, gtest, and other libs installed
# on your host system if you're not using a Docker dev container.
# Recommended approach for local dev:
docker-compose run --rm builder /bin/bash # Access the builder stage container
# Inside container:
cd /app
cmake -B build -S .
cmake --build build
./build/run_tests
exit # To exit the container
```

### Running Frontend Tests

```bash
cd frontend
npm test
```

## Contributing

Contributions are welcome! Please follow the standard GitHub flow:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write tests for your changes.
5.  Ensure all tests pass.
6.  Commit your changes (`git commit -m 'Add new feature'`).
7.  Push to the branch (`git push origin feature/your-feature-name`).
8.  Open a Pull Request.

---
```