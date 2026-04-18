# Project Management API

A comprehensive, production-ready API development system for managing projects, tasks, users, and teams. Built with C++ using the Crow framework, PostgreSQL, Docker, and JWT authentication.

## Table of Contents

1.  [Features](#features)
2.  [Project Structure](#project-structure)
3.  [Technologies Used](#technologies-used)
4.  [Prerequisites](#prerequisites)
5.  [Setup and Installation](#setup-and-installation)
    *   [Using Docker Compose (Recommended)](#using-docker-compose-recommended)
    *   [Manual Setup](#manual-setup)
6.  [Database Setup](#database-setup)
7.  [Running the Application](#running-the-application)
8.  [Testing](#testing)
9.  [API Documentation](#api-documentation)
10. [Architecture Documentation](#architecture-documentation)
11. [Deployment Guide](#deployment-guide)
12. [CI/CD](#cicd)
13. [Future Enhancements](#future-enhancements)
14. [License](#license)

## Features

*   **User Management**: Register, Login, Get Profile, Update Profile.
*   **Project Management**: Create, Read (single, all), Update, Delete projects. Associate projects with teams and owners.
*   **Task Management**: Create, Read (single, by project), Update, Delete tasks. Assign tasks to users.
*   **Team Management**: Create, Read, Update, Delete teams. Add/remove users from teams.
*   **Authentication**: JWT-based authentication for secure API access.
*   **Authorization**: Role-based access control (owner, member).
*   **Database Layer**: PostgreSQL with schema definitions, migrations, and seed data.
*   **Configuration**: Environment-based configuration.
*   **Containerization**: Docker and Docker Compose for easy setup and deployment.
*   **Logging**: Centralized, structured logging with `spdlog`.
*   **Error Handling**: Global error handling middleware for consistent API responses.
*   **Testing**: Unit and Integration tests using Google Test.
*   **Documentation**: Comprehensive README, API docs, Architecture docs, Deployment guide.
*   **CI/CD**: GitHub Actions workflow for automated testing and building.

## Project Structure

Refer to the project structure section above or browse the repository for a detailed file layout.

## Technologies Used

*   **Backend**: C++17/20
    *   **Web Framework**: Crow
    *   **Database Driver**: libpqxx
    *   **JSON**: nlohmann/json
    *   **Logging**: spdlog
    *   **JWT**: jwt-cpp
*   **Database**: PostgreSQL
*   **Containerization**: Docker, Docker Compose
*   **Testing**: Google Test, Google Mock
*   **Build System**: CMake
*   **CI/CD**: GitHub Actions

## Prerequisites

*   Git
*   Docker and Docker Compose (recommended)
*   OR (for manual setup):
    *   C++ Compiler (GCC 10+ or Clang 10+)
    *   CMake 3.10+
    *   PostgreSQL client libraries (`libpq-dev` or equivalent)
    *   `libpqxx` development headers
    *   `nlohmann/json` headers
    *   `spdlog` headers
    *   `jwt-cpp` headers
    *   `crow` headers
    *   `Google Test` headers and libraries

## Setup and Installation

### Using Docker Compose (Recommended)

This is the easiest way to get the entire system up and running.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/project-management-api.git
    cd project-management-api
    ```

2.  **Create `.env` file**:
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
    Review and update the variables in `.env` as needed (e.g., `POSTGRES_PASSWORD`, `JWT_SECRET`).

3.  **Build and run the services**:
    ```bash
    docker-compose up --build
    ```
    This will:
    *   Build the C++ application Docker image.
    *   Start a PostgreSQL container.
    *   Apply database migrations and seed data.
    *   Start the C++ API server.

    The API will be accessible at `http://localhost:18080`.

### Manual Setup

If you prefer to run the application directly on your machine without Docker:

1.  **Install dependencies**:
    *   **C++ Libraries**: You'll need `libpqxx`, `nlohmann/json`, `spdlog`, `jwt-cpp`, and `Crow`. The easiest way is often to install them via your system's package manager (e.g., `sudo apt-get install libpqxx-dev libjson-dev libspdlog-dev libjwt-cpp-dev` on Debian/Ubuntu, though some might require manual installation from source or `vcpkg`). `Crow` is typically header-only, just clone it.
    *   **PostgreSQL**: Install PostgreSQL server and client libraries.

2.  **Build the application**:
    ```bash
    mkdir build
    cd build
    cmake ..
    make
    ```

3.  **Database Setup**:
    Follow the [Database Setup](#database-setup) instructions below to manually set up your PostgreSQL database.

4.  **Run the application**:
    First, ensure your environment variables are set according to `.env.example`.
    ```bash
    cd build
    ./project_management_api
    ```

## Database Setup

The `docker-compose.yml` automatically handles migrations and seeding upon startup. If running manually:

1.  **Create a PostgreSQL database**:
    ```bash
    psql -U postgres
    CREATE DATABASE project_management_db;
    CREATE USER pma_user WITH PASSWORD 'pma_password';
    GRANT ALL PRIVILEGES ON DATABASE project_management_db TO pma_user;
    \q
    ```
    (Replace `pma_password` with the one from your `.env`)

2.  **Apply migrations**:
    ```bash
    psql -U pma_user -d project_management_db -f database/migrations/V1__create_tables.sql
    psql -U pma_user -d project_management_db -f database/migrations/V2__add_roles_and_seed_data.sql
    ```

3.  **Seed initial data**:
    ```bash
    psql -U pma_user -d project_management_db -f database/seed/seed.sql
    ```

## Running the Application

Once built and configured (either via Docker Compose or manually), the API server will listen on `http://localhost:18080` (or the port configured in `.env`).

## Testing

The project includes unit and integration tests using Google Test.

1.  **Build tests**:
    If you've followed the manual build steps:
    ```bash
    cd build
    make tests
    ```
    If using Docker, you can build a separate test image or run tests within the main app container:
    ```bash
    docker-compose run --rm app /bin/bash -c "mkdir -p build && cd build && cmake .. -DBUILD_TESTS=ON && make && ./tests/run_tests"
    ```

2.  **Run tests**:
    ```bash
    cd build
    ./tests/run_tests # or the specific test executable, e.g., ./tests/unit/unit_tests
    ```
    *Unit tests aim for 80%+ coverage on core logic.*

## API Documentation

Refer to [docs/api.md](docs/api.md) for a detailed list of all API endpoints, their methods, request/response formats, and authentication requirements.

## Architecture Documentation

Refer to [docs/architecture.md](docs/architecture.md) for an overview of the system's design, component interactions, and data flow.

## Deployment Guide

Refer to [docs/deployment.md](docs/deployment.md) for instructions on deploying the application to a production environment.

## CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that automates the following:
*   Building the C++ application.
*   Running unit and integration tests.
*   (Optional) Building a Docker image and pushing it to a registry.

## Future Enhancements

*   **Advanced Authorization**: Fine-grained permissions (e.g., project-specific roles).
*   **Websockets**: Real-time updates for tasks or project changes.
*   **Search**: Full-text search capabilities for projects and tasks.
*   **Audit Logging**: Track all changes made to resources.
*   **Background Jobs**: Asynchronous processing for long-running tasks.
*   **Frontend Application**: Build a client-side application (React, Vue, Angular) to consume the API.
*   **Performance Monitoring**: Integrate with tools like Prometheus/Grafana.
*   **Caching**: Implement Redis for frequently accessed data.
*   **Rate Limiting**: Implement a more robust rate-limiting mechanism (e.g., using Nginx or a dedicated middleware).

## License

This project is licensed under the MIT License - see the LICENSE file for details.
```