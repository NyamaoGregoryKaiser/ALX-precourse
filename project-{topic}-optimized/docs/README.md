# ALX C++ Content Management System (CMS)

This is a comprehensive, production-ready Content Management System built entirely in C++, following modern software engineering principles. It demonstrates a full-stack application structure, including a C++ backend for API and static file serving, a PostgreSQL database, Docker containerization, and a suite of additional enterprise-grade features.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Local Setup (with Docker Compose)](#local-setup-with-docker-compose)
    *   [Manual Build & Run (without Docker)](#manual-build--run-without-docker)
4.  [API Reference](#api-reference)
5.  [Testing](#testing)
6.  [Deployment](#deployment)
7.  [Contributing](#contributing)
8.  [License](#license)

---

## 1. Features

This CMS system boasts a rich set of features:

*   **Core C++ Application**:
    *   **RESTful API**: Full CRUD operations for Users, Content, and Media.
    *   **Modular Design**: Clear separation of concerns into Models, Repositories, Services, and API Routes.
    *   **Web Server**: Powered by `Pistache` for high-performance HTTP handling.
    *   **JSON Handling**: Robust data serialization/deserialization using `nlohmann/json`.
    *   **Static File Serving**: Serves a minimal HTML/JS frontend.
*   **Database Layer (PostgreSQL)**:
    *   **Schema**: Defined for `users`, `content`, and `media_files`.
    *   **OR-like Interaction**: Uses `libpqxx` for efficient and safe PostgreSQL querying.
    *   **Migration-ready**: Example migration script included.
    *   **Seed Data**: Pre-populates the database with an admin and editor user, and initial content.
*   **Authentication & Authorization**:
    *   **JWT (JSON Web Tokens)**: Secure, stateless authentication using `jwt-cpp`.
    *   **Role-Based Access Control (RBAC)**: Supports `admin`, `editor`, and `viewer` roles with granular permissions.
    *   **Password Hashing**: Uses `bcrypt` for secure password storage.
*   **Additional Enterprise Features**:
    *   **Logging**: Structured logging with `spdlog` for better observability.
    *   **Error Handling**: Centralized API error handling middleware with custom exception types.
    *   **Caching**: In-memory LRU (Least Recently Used) cache for frequently accessed data (e.g., users, content).
    *   **Rate Limiting**: IP-based request rate limiting to prevent abuse and DDoS attacks.
    *   **Configuration Management**: Environment variable-driven configuration.
*   **Development & Operations (DevOps)**:
    *   **CMake**: Modern C++ build system.
    *   **vcpkg**: C++ library dependency manager.
    *   **Docker & Docker Compose**: Containerized environment for easy setup and consistent deployment.
    *   **CI/CD Pipeline**: GitHub Actions workflow for automated build, test, and (placeholder) deployment.
*   **Testing**:
    *   **Google Test**: Comprehensive unit and integration tests for core logic, repositories, and services.
    *   **API Testing**: Conceptual API tests demonstrating interaction with the running server.
*   **Documentation**:
    *   **Comprehensive README**: This document, covering setup, architecture, and usage.
    *   **API Reference**: Detailed endpoint documentation (conceptual, would link to OpenAPI/Swagger in production).
    *   **Architecture Guide**: Overview of the system's design.
    *   **Deployment Guide**: Instructions for containerized deployment.

---

## 2. Architecture

The CMS follows a layered architecture, common in enterprise applications, to ensure separation of concerns, maintainability, and scalability.

```
+---------------------+
|      Web Client     | (Minimal HTML/JS Frontend, served by C++ backend)
+----------|----------+
           | HTTP / REST API
+----------|----------+
|      Pistache Web Server & API Gateway    |
+----------|----------+ (Handles HTTP requests, serves static files)
|          Middleware         | (Logging, Rate Limiting, Error Handling)
+----------|----------+ (Authentication/Authorization - JWT based)
|          API Routes         | (Maps URLs to controller methods)
+----------|----------+
|          Services           | (Business Logic: User, Content, Media management)
+----------|----------+ (Interacts with Cache and Repositories)
|          Caching            | (LRU Cache: In-memory for performance)
+----------|----------+
|        Repositories         | (Data Access Layer: CRUD operations for Models)
+----------|----------+
|         DB Connection       | (PostgreSQL via libpqxx)
+----------|----------+
|      PostgreSQL Database    | (Data Persistence)
+-----------------------------+
```

**Key Components:**

*   **`src/main.cpp`**: The entry point, responsible for initializing the server, services, repositories, and setting up the API routes.
*   **`src/common/`**: General utilities like logging (`spdlog`), configuration loading (`.env`), UUID generation, and custom error types.
*   **`src/models/`**: Plain Old Data Structures (PODs) representing database entities (e.g., `User`, `Content`, `MediaFile`).
*   **`src/database/`**:
    *   `db_connection.hpp`: Manages PostgreSQL connections using `libpqxx`.
    *   `*_repository.hpp`: Classes encapsulating CRUD operations for specific models, interacting directly with the database.
*   **`src/auth/`**:
    *   `jwt_manager.hpp`: Handles JWT token creation, signing, and verification.
    *   `auth_service.hpp`: Contains business logic for user registration, login, and password hashing (`bcrypt`).
    *   `auth_middleware.hpp`: An HTTP middleware component responsible for intercepting requests, verifying JWTs, and setting authenticated user context.
*   **`src/services/`**:
    *   `*_service.hpp`: Implements the core business logic. These services interact with repositories for data persistence and with the cache for performance optimization. They also enforce authorization rules.
*   **`src/cache/`**:
    *   `lru_cache.hpp`: A generic Least Recently Used (LRU) cache implementation used by services.
*   **`src/api/`**:
    *   `router.hpp`: Central component for defining API routes and applying global middleware.
    *   `*_routes.hpp`: Define specific API endpoints (e.g., `/auth`, `/users`, `/content`, `/media`) and delegate requests to the appropriate services.
    *   `middleware.hpp`: Contains global HTTP middleware for logging, rate limiting, and centralized error handling.
*   **`src/frontend/`**: A minimal static HTML/JS application served by the C++ backend to demonstrate API interaction.
*   **`database/`**: SQL scripts for schema definition (`init.sql`), initial data (`seed.sql`), and an example migration (`migrations/V1__create_initial_tables.sql`).

---

## 3. Getting Started

### Prerequisites

*   **Git**: For cloning the repository.
*   **Docker & Docker Compose**: Recommended for easy setup and consistent environment.
*   **C++ Development Tools (Optional, for manual build)**:
    *   A C++17 compatible compiler (e.g., GCC 9+, Clang 9+).
    *   CMake 3.16+.
    *   vcpkg (recommended for dependency management).
    *   PostgreSQL development libraries (`libpq-dev`).
    *   OpenSSL development libraries (`libssl-dev`).

### Local Setup (with Docker Compose)

This is the recommended way to get the system running quickly.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/cms-system.git
    cd cms-system
    ```

2.  **Prepare environment variables:**
    Create a `.env` file in the project root based on `.env.example`.
    ```bash
    cp .env.example .env
    # You can edit .env to customize settings, e.g., APP_PORT, DB credentials, JWT_SECRET.
    # By default, it's configured for Docker Compose.
    ```

3.  **Build and run with Docker Compose:**
    This command will:
    *   Build the `cms_app` Docker image (installs vcpkg dependencies, compiles C++ code).
    *   Start a PostgreSQL container (`cms_db`).
    *   Initialize the database schema and seed data using `init.sql` and `seed.sql`.
    *   Start the `cms_app` container, linking it to the database.

    ```bash
    docker-compose up --build -d
    ```
    The `--build` flag ensures your C++ application is recompiled if source code changes. The `-d` flag runs containers in detached mode.

4.  **Verify the application is running:**
    ```bash
    docker-compose ps
    ```
    You should see `cms_app` and `cms_db` containers in `Up` state.

5.  **Access the CMS:**
    Open your web browser and navigate to `http://localhost:9080`.
    You should see the minimal HTML/JS frontend.

    *   **Login with seeded users:**
        *   **Admin:** `username: admin`, `password: password`
        *   **Editor:** `username: editor`, `password: password`
        *   **Viewer:** You can register a new viewer from the UI (e.g., `username: viewer_test`, `password: password`).

### Manual Build & Run (without Docker)

This method requires you to set up the C++ development environment and PostgreSQL manually.

1.  **Install Prerequisites:**
    *   C++ Compiler (GCC, Clang) and CMake.
    *   vcpkg: Follow instructions [here](https://vcpkg.io/en/getting-started.html). Set `VCPKG_ROOT` environment variable.
    *   PostgreSQL server and `libpq-dev` (or equivalent for your OS).
    *   OpenSSL development libraries.

2.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/cms-system.git
    cd cms-system
    ```

3.  **Set up PostgreSQL Database:**
    *   Manually create the database and user as specified in `.env.example` (or `docker-compose.yml`).
    *   Apply `database/init.sql` and `database/seed.sql` to your PostgreSQL instance.
    ```bash
    # Example for PostgreSQL:
    # sudo -u postgres psql
    # CREATE USER cms_user WITH PASSWORD 'cms_password';
    # CREATE DATABASE cms_db OWNER cms_user;
    # \q
    # psql -U cms_user -d cms_db -f database/init.sql
    # psql -U cms_user -d cms_db -f database/seed.sql
    ```

4.  **Build the C++ application:**
    ```bash
    # Ensure VCPKG_ROOT is set, e.g., export VCPKG_ROOT=/path/to/vcpkg
    mkdir build
    cd build
    cmake .. -DCMAKE_TOOLCHAIN_FILE=${VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake -DVCPKG_TARGET_TRIPLET=x64-linux -DCMAKE_BUILD_TYPE=Release
    cmake --build . --target cms_app
    ```

5.  **Run the application:**
    Ensure your environment variables (from `.env.example`) are set in your shell before running.
    ```bash
    cd .. # Back to project root
    # Load environment variables (example for bash/zsh):
    export $(grep -v '^#' .env | xargs)
    # Run the compiled application
    ./build/cms_app
    ```

6.  **Access the CMS:**
    Open your web browser to `http://localhost:9080`.

---

## 4. API Reference

The CMS exposes a RESTful API. Below is a summary of the main endpoints and their expected behavior. For a true production system, this would be generated via OpenAPI/Swagger.

**Base URL**: `http://localhost:9080`

### Authentication Endpoints (`/auth`)

*   **`POST /auth/register`**
    *   **Description**: Registers a new user with a default `viewer` role.
    *   **Request Body (JSON)**:
        ```json
        {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "securepassword123"
        }
        ```
    *   **Response (JSON)**:
        ```json
        {
            "message": "User registered successfully",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "user": {
                "id": "uuid",
                "username": "newuser",
                "email": "newuser@example.com",
                "role": "viewer",
                "created_at": "ISO8601_DATETIME",
                "updated_at": "ISO8601_DATETIME"
            }
        }
        ```
    *   **Status Codes**: `201 Created`, `400 Bad Request`, `409 Conflict` (username/email exists).

*   **`POST /auth/login`**
    *   **Description**: Authenticates a user and returns a JWT token.
    *   **Request Body (JSON)**:
        ```json
        {
            "username": "admin",
            "password": "password"
        }
        ```
    *   **Response (JSON)**:
        ```json
        {
            "message": "Login successful",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        }
        ```
    *   **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`.

### User Endpoints (`/users`) - **Requires Authentication**

*   **`GET /users`**
    *   **Description**: Retrieves a list of all users. (Admin only)
    *   **Query Params**: `limit` (int, default 10), `offset` (int, default 0)
    *   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
    *   **Response (JSON Array)**: `[{ "id": "...", "username": "...", "role": "admin", ... }]`
    *   **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`.

*   **`GET /users/:id`**
    *   **Description**: Retrieves details of a specific user. (User can view self, Admin can view any)
    *   **Path Params**: `id` (UUID of the user)
    *   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
    *   **Response (JSON Object)**: `{ "id": "...", "username": "...", "role": "editor", ... }`
    *   **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

*   **`PUT /users/:id`**
    *   **Description**: Updates a user's profile. (User can update self, Admin can update any. Only Admin can change `role`).
    *   **Path Params**: `id` (UUID of the user)
    *   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
    *   **Request Body (JSON)**: (Partial update)
        ```json
        {
            "username": "updated_name",
            "email": "updated@example.com",
            "password": "newpassword",
            "role": "editor"  // Only admin can change this
        }
        ```
    *   **Response (JSON Object)**: Updated user object.
    *   **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`.

*   **`DELETE /users/:id`**
    *   **Description**: Deletes a user. (Admin only. Admin cannot delete self.)
    *   **Path Params**: `id` (UUID of the user)
    *   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
    *   **Response**: No content.
    *   **Status Codes**: `204 No Content`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

### Content Endpoints (`/content`) - **Requires Authentication**

*   **`GET /content`**
    *   **Description**: Retrieves a list of content items. (Viewers see only `published`. Editors/Admins can filter by `status` or see all.)
    *   **Query Params**: `limit` (int, default 10), `offset` (int, default 0), `status` (string, e.g., `draft`, `published`, `archived`)
    *   **Headers**: `Authorization: Bearer <JWT_TOKEN>` (optional for published content)
    *   **Response (JSON Array)**: `[{ "id": "...", "title": "...", "slug": "...", "status": "published", ... }]`
    *   **Status Codes**: `200 OK`, `401 Unauthorized` (if accessing non-published without role), `403 Forbidden`.

*   **`POST /content`**
    *   **Description**: Creates a new content item. (Editor/Admin only)
    *   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
    *   **Request Body (JSON)**:
        ```json
        {
            "title": "My New Article",
            "slug": "my-new-article",
            "body": "This is the content of my new article.",
            "status": "draft"
        }
        ```
    *   **Response (JSON Object)**: Created content item.
    *   **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `409 Conflict` (slug exists).

*   **`GET /content/:id`**
    *   **Description**: Retrieves a specific content item by ID. (Public for `published` status. Requires auth for `draft`/`archived` if not author/admin).
    *   **Path Params**: `id` (UUID of the content)
    *   **Headers**: `Authorization: Bearer <JWT_TOKEN>` (optional for published)
    *   **Response (JSON Object)**: Content item details.
    *   **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

*   **`GET /content/slug/:slug`**
    *   **Description**: Retrieves a specific content item by slug. (Public for `published` status. Requires auth for `draft`/`archived` if not author/admin).
    *   **Path Params**: `slug` (URL-friendly identifier)
    *   **Headers**: `Authorization: Bearer <JWT_TOKEN>` (optional for published)
    *   **Response (JSON Object)**: Content item details.
    *   **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

*   **`PUT /content/:id`**
    *   **Description**: Updates a content item. (Author or Admin only).
    *   **Path Params**: `id` (UUID of the content)
    *   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
    *   **Request Body (JSON)**: (Partial update)
        ```json
        {
            "title": "Updated Article Title",
            "status": "published",
            "published_at": "2023-10-27T10:00:00Z"
        }
        ```
    *   **Response (JSON Object)**: Updated content item.
    *   **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`.

*   **`DELETE /content/:id`**
    *   **Description**: Deletes a content item. (Author or Admin only).
    *   **Path Params**: `id` (UUID of the content)
    *   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
    *   **Response**: No content.
    *   **Status Codes**: `204 No Content`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

### Media Endpoints (`/media`)

*   **`POST /media`**
    *   **Description**: Uploads a new media file. (Editor/Admin only)
    *   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
    *   **Request Body (JSON)**:
        ```json
        {
            "filename": "my_image.png",
            "mimetype": "image/png",
            "content": "base64_encoded_file_content..."
        }
        ```
        *Note: Current implementation expects base64 string for `content`. For real production, multipart form data is more appropriate for file uploads.*
    *   **Response (JSON Object)**: Created media file metadata.
    *   **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`.

*   **`GET /media`**
    *   **Description**: Retrieves a list of all uploaded media files. (Authenticated users)
    *   **Query Params**: `limit` (int, default 10), `offset` (int, default 0)
    *   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
    *   **Response (JSON Array)**: `[{ "id": "...", "filename": "...", "filepath": "uploads/...", ... }]`
    *   **Status Codes**: `200 OK`, `401 Unauthorized`.

*   **`GET /media/:id`**
    *   **Description**: Retrieves metadata for a specific media file by ID. (Authenticated users)
    *   **Path Params**: `id` (UUID of the media file)
    *   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
    *   **Response (JSON Object)**: Media file metadata.
    *   **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`.

*   **`GET /media/uploads/:filename`**
    *   **Description**: Serves the actual media file. (Publicly accessible)
    *   **Path Params**: `filename` (The unique filename stored on the server, e.g., `uuid_originalfilename.jpg`)
    *   **Response**: Binary file content.
    *   **Status Codes**: `200 OK`, `404 Not Found`.

*   **`DELETE /media/:id`**
    *   **Description**: Deletes a media file and its metadata. (Uploader or Admin only).
    *   **Path Params**: `id` (UUID of the media file)
    *   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
    *   **Response**: No content.
    *   **Status Codes**: `204 No Content`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

---

## 5. Testing

The project includes a comprehensive test suite using `Google Test` for C++.

### Running Tests

1.  **With Docker (Recommended for a clean environment):**
    ```bash
    docker-compose run --rm app /bin/bash -c "cd build && ctest --output-on-failure"
    ```
    This command runs the `cms_tests` executable inside a temporary container.

2.  **Manually (after building):**
    First, build the tests:
    ```bash
    cd build
    cmake .. -DCMAKE_TOOLCHAIN_FILE=${VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake -DVCPKG_TARGET_TRIPLET=x64-linux -DCMAKE_BUILD_TYPE=Debug # Build tests in Debug for symbols
    cmake --build . --target cms_tests
    ```
    Then, run them:
    ```bash
    ./cms_tests # For all unit and integration tests
    # Or for detailed output:
    ctest --output-on-failure
    ```

### Test Types

*   **Unit Tests**: Located in `tests/unit/`. These test individual components (e.g., `UUID` generation, `LRUCache`, `JwtManager`) in isolation.
    *   `test_uuid.cpp`: Verifies UUID generation and validation.
    *   `test_lru_cache.cpp`: Tests the LRU cache logic.
    *   `test_jwt_manager.cpp`: Checks JWT token creation and verification.
*   **Integration Tests**: Located in `tests/integration/`. These test the interaction between components, primarily with the database.
    *   `test_db_connection.cpp`: Verifies database connectivity and basic operations.
    *   `test_user_repository.cpp`: Tests CRUD operations for the `UserRepository`.
    *   (Similar tests for `ContentRepository` and `MediaRepository` would follow this pattern).
*   **API Tests**: Located in `tests/api/`. These tests interact with the running HTTP server to verify API endpoint behavior, including authentication, authorization, and CRUD operations.
    *   `test_api_content.cpp`: Example API tests for content management. These tests require the CMS server to be running, ideally in a separate thread or process.
    *   **Note**: The provided `test_api_content.cpp` attempts to start the server in a separate thread within the test suite. For a production-grade setup, using a dedicated testing environment with a pre-running server or a robust mocking framework for HTTP client interactions is recommended.

**Coverage Goal**: The project aims for 80%+ unit test coverage for core business logic and data access layers.

---

## 6. Deployment

The CMS is designed for containerized deployment using Docker.

### Docker-based Deployment

The `docker-compose.yml` file provides a production-ready setup for deploying the CMS application and its PostgreSQL database.

1.  **Build and push Docker image (optional, for remote deployment):**
    If deploying to a remote server or a container registry (e.g., Docker Hub, AWS ECR, GCP GCR), you'll first build the image and push it.
    ```bash
    docker build -t your-registry/alx-cms-system:latest .
    docker push your-registry/alx-cms-system:latest
    ```
    Make sure to configure Docker login if pushing to a private registry.

2.  **Deploy on a server:**
    On your production server, ensure Docker and Docker Compose are installed.
    *   Create a directory for your project, e.g., `/opt/cms-system`.
    *   Copy `docker-compose.yml` and a production `.env` file (containing your actual secrets and database credentials) to this directory.
    *   If using local `database/init.sql` and `database/seed.sql` as volumes, ensure those are also present.
    *   If using a pre-built image from a registry:
        ```yaml
        # In docker-compose.yml, change 'build:' to 'image: your-registry/alx-cms-system:latest'
        image: your-registry/alx-cms-system:latest
        ```
    *   Run Docker Compose:
        ```bash
        cd /opt/cms-system
        docker-compose pull # If using pre-built images
        docker-compose up -d
        ```

3.  **Monitor Logs:**
    ```bash
    docker-compose logs -f
    ```

4.  **Health Checks:**
    The `docker-compose.yml` includes basic health checks for the database. For the application, you can query its `/health` endpoint:
    ```bash
    curl http://localhost:9080/health # Or your public IP/domain
    ```

### Production Considerations

*   **Secrets Management**: For true production, avoid placing sensitive credentials directly in `.env` files. Use Docker secrets, Kubernetes secrets, or a dedicated secrets management solution (e.g., HashiCorp Vault, AWS Secrets Manager).
*   **Persistent Storage**: Ensure your database data (the `db_data` volume in `docker-compose.yml`) is backed up and stored persistently on a reliable volume. Media uploads (`uploads` directory) should also be mapped to a persistent volume.
*   **Reverse Proxy**: In production, place a reverse proxy (e.g., Nginx, Caddy) in front of your C++ application for SSL/TLS termination, load balancing, caching static assets, and advanced routing.
*   **Scalability**: For high traffic, consider running multiple instances of the `cms_app` behind a load balancer. Ensure services are stateless where possible. The `LRUCache` is in-memory and per-instance; for multi-instance deployments, consider a distributed cache (e.g., Redis).
*   **Monitoring**: Integrate with external monitoring tools (e.g., Prometheus, Grafana, ELK stack) for comprehensive observability. `spdlog` provides flexible sinks for this.
*   **CI/CD**: Expand the GitHub Actions workflow to include steps for pushing Docker images to a registry and automating deployments to your target environment.

---

## 7. Contributing

Contributions are welcome! If you find a bug, have a feature request, or want to improve the codebase, please:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes and write tests where applicable.
4.  Ensure all tests pass.
5.  Commit your changes (`git commit -am 'Add new feature'`).
6.  Push to the branch (`git push origin feature/your-feature`).
7.  Create a new Pull Request.

---

## 8. License

This project is licensed under the MIT License - see the `LICENSE` file for details (not included in this response, but would be a standard file in the repo).
```