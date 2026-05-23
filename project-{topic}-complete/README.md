```markdown
# Comprehensive Enterprise-Grade C++ CMS

This project implements a full-scale, production-ready Content Management System (CMS) using C++ with the Drogon web framework. It includes a robust RESTful API backend, a basic server-side rendered admin frontend, a PostgreSQL database layer, comprehensive testing, Dockerization, and detailed documentation.

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Features](#features)
3.  [Technology Stack](#technology-stack)
4.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup](#local-development-setup)
    *   [Running Tests](#running-tests)
5.  [Project Structure](#project-structure)
6.  [API Documentation](#api-documentation)
7.  [Architecture](#architecture)
8.  [CI/CD Configuration](#ci/cd-configuration)
9.  [Deployment Guide](#deployment-guide)
10. [Future Enhancements](#future-enhancements)
11. [License](#license)

---

## 1. Project Overview

This CMS aims to demonstrate a comprehensive C++ application adhering to enterprise-grade standards. It provides functionalities for managing users, posts, and categories, complete with authentication, authorization, caching, and robust error handling. The focus is on clean code, efficient algorithms, and technical problem-solving, aligned with ALX Software Engineering principles.

## 2. Features

*   **Core CMS Functionality**:
    *   User Management (CRUD)
    *   Post Management (CRUD, including publishing status and content type)
    *   Category Management (CRUD)
*   **RESTful API**: Full CRUD operations for all entities, JSON-based.
*   **Authentication & Authorization**:
    *   JWT (JSON Web Token) based authentication for API endpoints.
    *   Role-based authorization (Admin, Editor, Viewer) for fine-grained access control.
    *   Session-based authentication for the basic SSR admin panel.
*   **Database Layer**:
    *   PostgreSQL for persistent data storage.
    *   Schema definitions, migration scripts, and seed data.
    *   Basic query optimization with indexes.
*   **Caching**: Simple in-memory response caching for read-heavy API endpoints.
*   **Rate Limiting**: IP-based rate limiting middleware to protect against abuse.
*   **Logging & Monitoring**: Integrated logging with Drogon, configurable log levels.
*   **Error Handling**: Centralized error handling middleware for consistent API responses.
*   **Dockerization**: Complete Docker and Docker Compose setup for easy development and deployment.
*   **CI/CD**: Example Jenkinsfile for continuous integration and deployment.
*   **Testing**: Unit, Integration, and Performance tests.
*   **Documentation**: Comprehensive README, API docs, Architecture docs, and Deployment guide.
*   **Frontend (Basic SSR Admin)**: A minimal server-side rendered admin interface using Drogon's CppTemplate engine for demonstration purposes, allowing basic content management.

## 3. Technology Stack

*   **Backend**: C++17/20 with [Drogon Web Framework](https://drogon.org/)
*   **Database**: [PostgreSQL](https://www.postgresql.org/)
*   **Package Manager**: [Conan](https://conan.io/) for C++ dependencies
*   **Authentication**: [jwt-cpp](https://github.com/Thalhammer/jwt-cpp)
*   **JSON Handling**: [json-cpp](https://github.com/open-source-parsers/jsoncpp)
*   **Testing**: [Google Test](https://github.com/google/googletest) (Unit, Integration), [Locust](https://locust.io/) (Performance)
*   **Containerization**: [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/)
*   **CI/CD**: [Jenkins](https://www.jenkins.io/) (example `Jenkinsfile`)

## 4. Getting Started

### Prerequisites

*   **Docker & Docker Compose**: Essential for running the application and database.
    *   [Install Docker Engine](https://docs.docker.com/engine/install/)
    *   [Install Docker Compose](https://docs.docker.com/compose/install/)
*   **Git**: For cloning the repository.
*   (Optional for local C++ development, not required if using Docker for build)
    *   **Conan**: C++ package manager. [Install Conan](https://docs.conan.io/en/latest/installation.html)
    *   **CMake**: Build system. [Install CMake](https://cmake.org/download/)
    *   **C++ Compiler**: GCC 11+ or Clang 11+.

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/cms-cpp-drogon.git
    cd cms-cpp-drogon
    ```

2.  **Prepare environment variables:**
    The project uses a `.env` file for database credentials. An example is provided.
    ```bash
    cp .env.example .env
    # You can edit .env if you need to change default credentials or ports.
    ```

3.  **Run the setup script:**
    This script will build the Docker images, start the containers (CMS app and PostgreSQL database), and wait for the database to be ready.
    ```bash
    chmod +x scripts/setup.sh
    ./scripts/setup.sh
    ```
    This command will:
    *   Create a `.env` file if one doesn't exist.
    *   Build the `cms-app` Docker image (this might take some time on the first run as it downloads Conan dependencies and compiles Drogon).
    *   Start the `db` (PostgreSQL) and `cms-app` containers.
    *   Automatically apply database schema (`db/schema.sql`) and seed data (`db/seed.sql`).
    *   Wait for the `db` service to report as healthy.

4.  **Access the application:**
    *   **API Endpoints**: `http://localhost:8080/api/v1/...`
    *   **Admin Panel (SSR)**: `http://localhost:8080/admin/login`

    **Default Admin Credentials (from `db/seed.sql`):**
    *   **Email**: `admin@example.com`
    *   **Password**: `password123`

5.  **Stop the application:**
    ```bash
    docker-compose down
    ```

### Running Tests

1.  **Ensure Docker containers are running:**
    ```bash
    ./scripts/setup.sh
    ```
    This ensures the database is available for integration tests.

2.  **Execute C++ Tests (Unit & Integration):**
    You need Conan and CMake installed locally, or you can run tests within the builder Docker image.
    
    **Option A: Local Execution (Recommended for faster iteration if Conan/CMake setup is done)**
    ```bash
    # Go to the root of the project
    cd cms-cpp-drogon
    
    # Create a build directory
    mkdir -p build && cd build
    
    # Install Conan dependencies (this might take a while the first time)
    conan install .. --output-folder=. --build=missing
    
    # Configure CMake
    cmake -DCMAKE_TOOLCHAIN_FILE=conan_toolchain.cmake -DCMAKE_BUILD_TYPE=Debug ..
    
    # Build tests
    cmake --build . --target unit_tests integration_tests
    
    # Run tests
    ./bin/unit_tests
    ./bin/integration_tests
    # Or to run all tests registered with CTest:
    # ctest
    ```

    **Option B: Inside Docker (Ensures consistent test environment)**
    ```bash
    # Go to the root of the project
    cd cms-cpp-drogon

    # Build the application container (if not already built)
    docker build -t cms-builder -f Dockerfile .

    # Run tests inside a temporary container from the builder image
    # Note: This will not connect to the `db` service by default without
    # careful networking configuration or starting the DB in the same container.
    # For integration tests needing the DB, it's better to use `docker-compose exec`.

    # Example for unit tests (assuming no DB needed for pure unit tests):
    docker run --rm cms-builder /app/build/Release/unit_tests
    
    # For integration tests that need the 'db' service:
    docker-compose run --rm cms-app /app/build/Release/integration_tests
    # Note: `cms-app` container's `CMD` is `cms_server`, so you're temporarily overriding it.
    # Ensure your `cms-app`'s Dockerfile has copied the test binaries.
    ```

3.  **Performance Tests (Locust):**
    ```bash
    # Ensure Docker containers are running
    ./scripts/setup.sh

    # Install Locust (if not already installed)
    pip install locust

    # Run Locust from the project root
    locust -f tests/performance/post_performance.py

    # Open your browser to http://localhost:8089 to access the Locust web UI
    ```

## 5. Project Structure

(See the "Directory Structure" section at the top of this document.)

## 6. API Documentation

This section outlines the RESTful API endpoints. All API responses are in JSON format.
Base URL: `http://localhost:8080/api/v1`

**Authentication:**
For protected endpoints, include a `Bearer` token in the `Authorization` header:
`Authorization: Bearer <YOUR_JWT_TOKEN>`

### Auth Endpoints

*   **`POST /api/v1/login`**
    *   **Description**: Authenticate a user and return a JWT token.
    *   **Request Body**:
        ```json
        {
            "email": "user@example.com",
            "password": "user_password"
        }
        ```
    *   **Success Response (200 OK)**:
        ```json
        {
            "message": "Login successful",
            "token": "eyJhbGciOiJIUzI1Ni...",
            "user": {
                "id": 1,
                "username": "adminuser",
                "email": "admin@example.com",
                "role": "admin",
                "created_at": "...",
                "updated_at": "..."
            }
        }
        ```
    *   **Error Response (401 Unauthorized)**: `{"error": "Invalid credentials"}`
    *   **Error Response (400 Bad Request)**: `{"error": "Email and password are required"}`

### User Endpoints

*   **`POST /api/v1/users`**
    *   **Description**: Create a new user account.
    *   **Authentication**: None required (public registration).
    *   **Request Body**:
        ```json
        {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "strongpassword",
            "role": "viewer" // Optional, default is 'viewer'
        }
        ```
    *   **Success Response (201 Created)**: `{"message": "User created successfully", "user": { ... }}`
    *   **Error Response (409 Conflict)**: If email/username already exists.
    *   **Error Response (400 Bad Request)**: Missing fields.

*   **`GET /api/v1/users`**
    *   **Description**: Retrieve a list of all users.
    *   **Authentication**: Required (Role: `admin`)
    *   **Success Response (200 OK)**: `[ { "id": 1, "username": "...", ... }, { ... } ]`
    *   **Error Response (401 Unauthorized)**: Invalid/missing token.
    *   **Error Response (403 Forbidden)**: Insufficient permissions.

*   **`GET /api/v1/users/{id}`**
    *   **Description**: Retrieve a specific user by ID.
    *   **Authentication**: Required (Role: `admin` OR `editor` OR `viewer` if viewing own profile)
    *   **Success Response (200 OK)**: `{ "id": 1, "username": "...", ... }`
    *   **Error Response (404 Not Found)**: User not found.
    *   **Error Response (403 Forbidden)**: Not authorized to view this user.

*   **`PUT /api/v1/users/{id}`**
    *   **Description**: Update an existing user.
    *   **Authentication**: Required (Role: `admin` OR `editor` if updating own profile)
    *   **Request Body**: (Partial updates allowed)
        ```json
        {
            "username": "updated_username",
            "email": "updated@example.com",
            "password": "new_password",
            "role": "editor" // Only 'admin' can change roles
        }
        ```
    *   **Success Response (200 OK)**: `{"message": "User updated successfully", "user": { ... }}`
    *   **Error Response (404 Not Found)**: User not found.
    *   **Error Response (403 Forbidden)**: Not authorized to update this user or change role.

*   **`DELETE /api/v1/users/{id}`**
    *   **Description**: Delete a user.
    *   **Authentication**: Required (Role: `admin`)
    *   **Success Response (204 No Content)**
    *   **Error Response (404 Not Found)**: User not found.
    *   **Error Response (403 Forbidden)**: Insufficient permissions.

### Post Endpoints

*   **`GET /api/v1/posts`**
    *   **Description**: Retrieve a list of all *published* posts.
    *   **Authentication**: None (public access)
    *   **Success Response (200 OK)**: `[ { "id": 1, "title": "...", "published": true, ... }, { ... } ]`

*   **`GET /api/v1/posts/{id}`**
    *   **Description**: Retrieve a specific post by ID.
    *   **Authentication**: None (public access for *published* posts). If unpublished, requires `admin`/`editor` role or to be the `author_id`.
    *   **Success Response (200 OK)**: `{ "id": 1, "title": "...", ... }`
    *   **Error Response (404 Not Found)**: Post not found or not published/authorized.

*   **`POST /api/v1/posts`**
    *   **Description**: Create a new post.
    *   **Authentication**: Required (Role: `admin`, `editor`)
    *   **Request Body**:
        ```json
        {
            "title": "My New Article",
            "content": "This is the content of my new article in markdown format.",
            "category_id": 1,
            "published": false, // Optional, default is false
            "content_type": "markdown" // Optional, default is 'markdown'
        }
        ```
    *   **Success Response (201 Created)**: `{"message": "Post created successfully", "post": { ... }}`
    *   **Error Response (400 Bad Request)**: Missing fields or invalid `category_id`.

*   **`PUT /api/v1/posts/{id}`**
    *   **Description**: Update an existing post.
    *   **Authentication**: Required (Role: `admin`, `editor` OR `author` of the post)
    *   **Request Body**: (Partial updates allowed)
        ```json
        {
            "title": "Updated Article Title",
            "content": "Revised content...",
            "published": true
        }
        ```
    *   **Success Response (200 OK)**: `{"message": "Post updated successfully", "post": { ... }}`
    *   **Error Response (404 Not Found)**: Post not found.
    *   **Error Response (403 Forbidden)**: Not authorized to update this post.

*   **`DELETE /api/v1/posts/{id}`**
    *   **Description**: Delete a post.
    *   **Authentication**: Required (Role: `admin`, `editor` OR `author` of the post)
    *   **Success Response (204 No Content)**
    *   **Error Response (404 Not Found)**: Post not found.
    *   **Error Response (403 Forbidden)**: Not authorized to delete this post.

### Category Endpoints

*   **`GET /api/v1/categories`**
    *   **Description**: Retrieve a list of all categories.
    *   **Authentication**: None (public access)
    *   **Success Response (200 OK)**: `[ { "id": 1, "name": "Technology", ... }, { ... } ]`

*   **`GET /api/v1/categories/{id}`**
    *   **Description**: Retrieve a specific category by ID.
    *   **Authentication**: None (public access)
    *   **Success Response (200 OK)**: `{ "id": 1, "name": "Technology", ... }`
    *   **Error Response (404 Not Found)**: Category not found.

*   **`POST /api/v1/categories`**
    *   **Description**: Create a new category.
    *   **Authentication**: Required (Role: `admin`, `editor`)
    *   **Request Body**:
        ```json
        {
            "name": "New Category",
            "description": "Description of the new category."
        }
        ```
    *   **Success Response (201 Created)**: `{"message": "Category created successfully", "category": { ... }}`
    *   **Error Response (400 Bad Request)**: Missing fields.

*   **`PUT /api/v1/categories/{id}`**
    *   **Description**: Update an existing category.
    *   **Authentication**: Required (Role: `admin`, `editor`)
    *   **Request Body**: (Partial updates allowed)
        ```json
        {
            "name": "Updated Category Name",
            "description": "Updated description."
        }
        ```
    *   **Success Response (200 OK)**: `{"message": "Category updated successfully", "category": { ... }}`
    *   **Error Response (404 Not Found)**: Category not found.
    *   **Error Response (403 Forbidden)**: Insufficient permissions.

*   **`DELETE /api/v1/categories/{id}`**
    *   **Description**: Delete a category.
    *   **Authentication**: Required (Role: `admin`)
    *   **Success Response (204 No Content)**
    *   **Error Response (404 Not Found)**: Category not found.
    *   **Error Response (403 Forbidden)**: Insufficient permissions.
    *   **Error Response (409 Conflict)**: If category has associated posts (due to `ON DELETE RESTRICT`).

## 7. Architecture

(See `docs/ARCHITECTURE.md` for a more detailed diagram and explanation)

The CMS follows a layered architecture, common in web applications:

*   **Presentation Layer (Controllers)**: Handles incoming HTTP requests, routes them, and prepares HTTP responses. This includes both REST API controllers (`src/controllers/api/v1`) and server-side rendered web controllers (`src/controllers/web`).
*   **Application/Service Layer (`src/services`)**: Contains the core business logic, orchestrating interactions between controllers and the data layer. Examples: `AuthService`.
*   **Data Access Layer (Models/Mappers - `src/models`)**: Abstracts database interactions. `UserMapper`, `PostMapper`, `CategoryMapper` handle CRUD operations using Drogon's `DbClient`.
*   **Database (PostgreSQL)**: The persistent storage for all application data.
*   **Middleware/Filters (`src/filters`, `src/middleware`)**: Intercept requests before they reach controllers (e.g., `AuthFilter`, `RateLimitFilter`, `ErrorHandler`).
*   **Utilities (`src/utils`)**: Shared helper functions and components (e.g., `Cache`).

**Drogon's Role:**
Drogon provides the foundational HTTP server, routing, JSON parsing, ORM integration, session management, and templating engine, greatly simplifying the development of these layers in C++.

## 8. CI/CD Configuration

A `Jenkinsfile` is provided as an example for a CI/CD pipeline. This file outlines stages for building, testing, and deploying the application.

---