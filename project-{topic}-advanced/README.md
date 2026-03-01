# Authentication System (C++ & Drogon)

This is a comprehensive, production-ready authentication and authorization system built with C++ using the Drogon web framework. It features user management, role-based access control (RBAC), JWT authentication, and a suite of enterprise-grade functionalities.

## Table of Contents

1.  [Features](#features)
2.  [Prerequisites](#prerequisites)
3.  [Getting Started](#getting-started)
    *   [Local Development (without Docker)](#local-development-without-docker)
    *   [Dockerized Development](#dockerized-development)
4.  [Configuration](#configuration)
5.  [Database](#database)
6.  [API Endpoints](#api-endpoints)
7.  [Testing](#testing)
8.  [Architecture](#architecture)
9.  [Deployment](#deployment)
10. [Additional Features](#additional-features)
11. [ALX Software Engineering Focus](#alx-software-engineering-focus)
12. [Contributing](#contributing)
13. [License](#license)

## 1. Features

*   **User Management:** Register, Login, Logout, Update, Delete users.
*   **Role-Based Access Control (RBAC):** Assign roles to users, define permissions based on roles (Admin, User).
*   **JWT Authentication:** Secure API authentication using JSON Web Tokens.
*   **Password Hashing:** Strong password hashing with BCrypt.
*   **Database:** PostgreSQL with migrations and seed data.
*   **Caching:** In-memory cache for frequently accessed data (e.g., user roles/permissions).
*   **Rate Limiting:** IP-based rate limiting to protect against brute-force attacks and abuse.
*   **Logging & Monitoring:** Structured logging for auditing and debugging.
*   **Error Handling:** Centralized middleware for consistent error responses.
*   **Containerization:** Docker for easy deployment and development.
*   **CI/CD:** Basic GitHub Actions workflow.
*   **Comprehensive Testing:** Unit, integration, and API tests.
*   **Detailed Documentation:** This README, API Docs, Architecture, Deployment Guide.
*   **Server-Rendered Frontend:** Basic HTML pages for login/registration served directly by the C++ backend.

## 2. Prerequisites

*   **C++ Compiler:** C++17 or newer (e.g., GCC 9+, Clang 9+).
*   **CMake:** Version 3.10 or higher.
*   **Conan:** C/C++ Package Manager (recommended, version 1.x).
*   **PostgreSQL:** Database server.
*   **Docker & Docker Compose:** For containerized development and deployment.
*   **OpenSSL Development Libraries:** Often a dependency for Drogon and JWT libraries.
    *   On Ubuntu/Debian: `sudo apt-get update && sudo apt-get install -y build-essential libssl-dev libpq-dev`
    *   On Fedora/RHEL: `sudo dnf install -y gcc-c++ cmake openssl-devel libpq-devel`

## 3. Getting Started

### Local Development (without Docker)

1.  **Clone the repository:**
    ```bash
    git clone --recursive https://github.com/your-username/auth-system.git
    cd auth-system
    ```
2.  **Install Conan (if not already installed):**
    ```bash
    pip install conan==1.* # Or check official Conan docs for latest
    ```
3.  **Set up PostgreSQL:**
    *   Install PostgreSQL locally or ensure you have access to a server.
    *   Create a database (e.g., `auth_db`) and a user (e.g., `postgres` with password `mysecretpassword`) or configure `config/default.json` with your credentials.
    *   **Ensure `libpq-dev` (or equivalent) is installed for your system.**
4.  **Set environment variable for JWT Secret:**
    ```bash
    export JWT_SECRET="your-very-long-and-secure-secret-key-for-jwt"
    # It's crucial for security. Do NOT use simple strings in production.
    ```
5.  **Build the application:**
    ```bash
    chmod +x build.sh
    ./build.sh
    ```
    This will install Conan dependencies into `build/` and compile the application, creating an executable `build/auth_system`.

6.  **Run Database Migrations and Seed Data:**
    ```bash
    ./build/auth_system --skip-orm-sync --no-autocreate-tables \
        --migration-dir db/migrations --run-migration-up \
        --seed-dir db/seed --run-seed \
        --db-connection-string "host=localhost port=5432 user=postgres password=mysecretpassword dbname=auth_db"
    ```
    *(Adjust `db-connection-string` to your local PostgreSQL setup.)*
    This will create tables and insert the default 'admin' and 'user' roles, and an initial 'admin' user with password `admin123`.

7.  **Run the application:**
    ```bash
    ./build/auth_system
    ```
    The application will start on `http://0.0.0.0:8080`.

### Dockerized Development

This is the recommended approach for ease of setup and consistency.

1.  **Clone the repository:**
    ```bash
    git clone --recursive https://github.com/your-username/auth-system.git
    cd auth-system
    ```
2.  **Create a `.env` file:**
    Copy `config/.env.example` to `.env` and fill in your desired `JWT_SECRET` and PostgreSQL credentials.
    ```bash
    cp config/.env.example .env
    # Edit .env file
    ```
3.  **Build and run with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    This will:
    *   Build the C++ application Docker image.
    *   Start a PostgreSQL database container.
    *   Run database migrations and seed data using Drogon's CLI.
    *   Start the authentication system application container.

4.  **Access the application:**
    The application will be available at `http://localhost:8080`.

## 4. Configuration

*   **`config/default.json`**: Main Drogon application configuration.
    *   `listeners`: Defines network ports and HTTPS settings.
    *   `log`: Configures logging level, path, and rotation.
    *   `db_clients`: PostgreSQL connection details.
    *   `document_root` & `static_files_dir`: Paths for serving HTML templates and static assets.
*   **`.env`**: Stores sensitive environment variables like `JWT_SECRET`. **Do not commit this to version control.** Use `config/.env.example` as a template.

## 5. Database

*   **Type:** PostgreSQL.
*   **Schema:** Defined in `db/migrations/001_initial_schema.sql`. Includes `users`, `roles`, `user_roles`, and `sessions` tables.
*   **Migrations:** SQL scripts in `db/migrations/`. Managed by Drogon's CLI (`--migration-dir`).
*   **Seed Data:** `db/seed/seed.sql` contains initial data, including default roles (`admin`, `user`) and an `admin` user with password `admin123` (hashed).
*   **Query Optimization:** Indexes are applied to frequently queried columns (e.g., `users.email`, `sessions.expires_at`). Drogon's ORM uses parameterized queries.

## 6. API Endpoints

All API endpoints are prefixed with `/api/v1`.

### Authentication

*   **`POST /api/v1/register`**
    *   **Description:** Register a new user.
    *   **Request Body:** `{"username": "string", "email": "string", "password": "string"}`
    *   **Response:** `200 OK` (User created) or `409 Conflict` (User exists), `400 Bad Request`, `500 Internal Server Error`.
*   **`POST /api/v1/login`**
    *   **Description:** Authenticate a user and receive a JWT token.
    *   **Request Body:** `{"identifier": "string (username or email)", "password": "string"}`
    *   **Response:** `200 OK` (with `token` and `user` data) or `401 Unauthorized` (Invalid credentials), `400 Bad Request`, `500 Internal Server Error`.
*   **`POST /api/v1/logout`**
    *   **Description:** Invalidate the current JWT token (effectively logging out).
    *   **Headers:** `Authorization: Bearer <JWT_TOKEN>`
    *   **Response:** `200 OK` (Logged out) or `401 Unauthorized`, `400 Bad Request`, `500 Internal Server Error`.

### User Management

*(Requires `Authorization: Bearer <JWT_TOKEN>`)*

*   **`GET /api/v1/users`**
    *   **Description:** Get a list of all users.
    *   **Access:** `admin` role only.
    *   **Response:** `200 OK` (List of user objects).
*   **`GET /api/v1/users/{id}`**
    *   **Description:** Get details of a specific user.
    *   **Access:** `admin` role or the user themselves.
    *   **Response:** `200 OK` (User object) or `404 Not Found`.
*   **`PATCH /api/v1/users/{id}`**
    *   **Description:** Update a user's details.
    *   **Access:** `admin` role can update any user; `user` role can only update their own `username` or `email`. `enabled` status can only be changed by `admin`.
    *   **Request Body:** `{"username": "string (optional)", "email": "string (optional)", "enabled": "boolean (optional)"}`
    *   **Response:** `200 OK` (Updated user object) or `403 Forbidden`, `404 Not Found`, `409 Conflict` (username/email already exists).
*   **`DELETE /api/v1/users/{id}`**
    *   **Description:** Delete a user.
    *   **Access:** `admin` role only. Admin cannot delete their own account via this endpoint.
    *   **Response:** `200 OK` (User deleted) or `403 Forbidden`, `404 Not Found`.
*   **`PUT /api/v1/users/{id}/roles`**
    *   **Description:** Assign or re-assign roles to a user. This replaces existing roles.
    *   **Access:** `admin` role only.
    *   **Request Body:** `{"roles": ["role_name1", "role_name2"]}`
    *   **Response:** `200 OK` (Roles assigned) or `400 Bad Request`, `403 Forbidden`, `404 Not Found`.
*   **`GET /api/v1/users/{id}/roles`**
    *   **Description:** Get roles assigned to a specific user.
    *   **Access:** `admin` role or the user themselves.
    *   **Response:** `200 OK` (Array of role names).

## 7. Testing

The project uses [Google Test](https://github.com/google/googletest) for unit and integration testing.

*   **Unit Tests:** Focus on individual components (e.g., `PasswordHasher`, `JWTHelper`, `CacheService`).
*   **Integration Tests:** Test interactions between components and API endpoints, often requiring a running database and application instance.
*   **API Tests:** Covered by integration tests, verifying correct HTTP responses, status codes, and JSON payloads.
*   **Performance Tests:** Explanation provided in `README` and `DEPLOYMENT.md`. Use tools like `ApacheBench` or `JMeter`.

**To run tests (after building locally):**

```bash
cd build
./tests/run_tests
```
*(Requires `drogon` application to be running in a separate process/container for integration tests)*

## 8. Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed overview.

## 9. Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment instructions.

## 10. Additional Features

*   **Authentication/Authorization:** Implemented using JWTs and custom middleware for role-based access control.
*   **Logging and Monitoring:** Drogon's built-in logging captures application events. Configured in `config/default.json`.
*   **Error Handling Middleware:** A global error handler catches unhandled exceptions and returns consistent JSON or HTML error responses.
*   **Caching Layer:** An in-memory `CacheService` is used for storing user roles/permissions to reduce database load.
*   **Rate Limiting:** An IP-based `RateLimiter` middleware protects API endpoints from excessive requests.

## 11. ALX Software Engineering Focus

This project demonstrates:

*   **Programming Logic:** Complex C++ logic for handling HTTP requests, database interactions, and business rules.
*   **Algorithm Design:** Implementations for password hashing (BCrypt concept), JWT token generation/validation, caching strategies (LRU/TTL concept), and rate limiting algorithms (sliding window/fixed window concept).
*   **Technical Problem Solving:** Designing a modular, scalable, and secure authentication system, including database schema, API design, error handling, and security considerations.
*   **Modular Design:** Separation of concerns into controllers, services, models, and middleware.
*   **Asynchronous Programming:** Extensive use of Drogon's `AsyncTask` for non-blocking I/O.
*   **Memory Management:** C++ smart pointers and RAII principles implicitly used by Drogon and modern C++ practices.

## 12. Contributing

Contributions are welcome! Please follow standard GitHub flow: fork the repository, create a feature branch, and submit a pull request.

## 13. License

This project is licensed under the MIT License. See the `LICENSE` file for details.
```