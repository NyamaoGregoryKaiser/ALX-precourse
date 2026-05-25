# Enterprise-Grade Authentication System

This project implements a comprehensive, production-ready authentication and authorization system using Flask, SQLAlchemy, PostgreSQL, and Redis. It's designed to be modular, scalable, and secure, serving as a robust foundation for any web application requiring user management.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup](#local-development-setup)
    *   [Running the Application](#running-the-application)
    *   [Database Migrations](#database-migrations)
    *   [Seed Data & Admin User](#seed-data--admin-user)
4.  [API Documentation](#api-documentation)
    *   [Authentication Endpoints](#authentication-endpoints)
    *   [User Endpoints](#user-endpoints)
    *   [Admin Endpoints](#admin-endpoints)
    *   [Error Responses](#error-responses)
5.  [Testing](#testing)
6.  [Deployment](#deployment)
7.  [Logging & Monitoring](#logging--monitoring)
8.  [Security Considerations](#security-considerations)
9.  [Future Enhancements](#future-enhancements)
10. [License](#license)

---

## 1. Features

*   **User Management**:
    *   User Registration (username, email, password).
    *   User Login (JWT-based access and refresh tokens).
    *   User Profile Management (view, update).
    *   Password Hashing (Bcrypt).
    *   Password Reset (token-based via email).
    *   Email Verification for new accounts.
*   **Authentication & Authorization**:
    *   JSON Web Tokens (JWT) for stateless authentication.
    *   Refresh Tokens for extending user sessions securely.
    *   Token Blacklisting (using Redis) for immediate logout and revocation.
    *   Role-Based Access Control (RBAC): `user` and `admin` roles with protected endpoints.
*   **Database**:
    *   PostgreSQL for robust data storage.
    *   SQLAlchemy ORM for Pythonic database interactions.
    *   Alembic (via Flask-Migrate) for database schema migrations.
*   **Caching**:
    *   Redis integration for high-performance token blacklisting and potential general caching.
*   **Rate Limiting**:
    *   Protects API endpoints from abuse (e.g., brute-force attacks on login, excessive registration attempts).
*   **Error Handling**:
    *   Centralized error handling middleware with consistent JSON error responses.
*   **Logging**:
    *   Structured application logging to console and file.
*   **Containerization**:
    *   Docker and Docker Compose for easy setup, development, and deployment.
*   **Testing**:
    *   Unit, Integration, and API tests using Pytest.
    *   Aims for high test coverage (80%+).
*   **Documentation**:
    *   Comprehensive README, API docs, Architecture docs, Deployment guide.

---

## 2. Architecture

The system follows a typical N-tier architecture:

*   **Presentation Layer (Minimal Frontend)**: A basic HTML/JS page (`templates/index.html`) demonstrating how to interact with the API (register, login, view profile). In a full application, this would be a separate frontend client (React, Angular, Vue, etc.).
*   **Application Layer (Flask Backend)**:
    *   **`app/__init__.py`**: Application factory for creating and configuring the Flask app.
    *   **`app/config.py`**: Manages configuration settings for different environments (development, testing, production).
    *   **`app/extensions.py`**: Initializes Flask extensions (DB, JWT, Mail, Cache, Limiter) and houses JWT token blacklisting logic.
    *   **`app/models.py`**: Defines SQLAlchemy ORM models (`User`, `TokenBlacklist`).
    *   **`app/routes/`**: Blueprints for API endpoints, grouped by functionality (`auth.py`, `user.py`, `admin.py`).
    *   **`app/services/`**: Contains business logic, separating it from route handlers (`auth_service.py`, `user_service.py`, `email_service.py`).
    *   **`app/utils/`**: Helper functions, custom decorators (`@jwt_required`, `@roles_required`), JWT token handling, and general utilities.
    *   **`app/errors.py`**: Custom error handlers for a consistent API error response format.
    *   **`app/cli.py`**: Custom Flask CLI commands for database management (seed, create-admin).
*   **Database Layer**:
    *   **PostgreSQL**: Primary data store for user accounts and other persistent data.
    *   **Redis**: Used for high-speed token blacklisting and potentially for caching.
    *   **SQLAlchemy**: ORM for Python-PostgreSQL interaction.
    *   **Flask-Migrate (Alembic)**: For managing database schema changes.

**Data Flow (Login Example):**
1.  Client sends `POST /api/v1/auth/login` with credentials.
2.  Flask route (`app/routes/auth.py`) receives the request.
3.  Request is validated (e.g., password length, email format).
4.  `AuthService` (`app/services/auth_service.py`) handles business logic:
    *   Queries `User` model (`app/models.py`) via `db` (`app/extensions.py`) to find user.
    *   Verifies password using `bcrypt` (`app/extensions.py`).
    *   Checks account verification status.
    *   If successful, generates JWT access and refresh tokens using `jwt` (`app/extensions.py`).
5.  Tokens are returned to the client.
6.  Client stores tokens (e.g., in `localStorage` or `httpOnly` cookies).
7.  For subsequent requests to protected endpoints, client includes the access token in `Authorization: Bearer <token>` header.
8.  `@jwt_required` decorator (`app/utils/decorators.py`) validates the token. If valid, `current_user` is set.
9.  `@roles_required` decorator checks `current_user`'s role against required roles.
10. If validation/authorization passes, the request proceeds to the endpoint logic.

---

## 3. Getting Started

### Prerequisites

*   Docker and Docker Compose (recommended for easy setup)
*   Python 3.10+ (if running without Docker)

### Local Development Setup (with Docker Compose)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/auth-system.git
    cd auth-system
    ```

2.  **Create `.env` file:**
    Copy the example environment variables file and fill in your details.
    ```bash
    cp .env.example .env
    # Open .env in your editor and replace placeholders (e.g., Mailtrap credentials, secret keys)
    ```

3.  **Build and run Docker containers:**
    This will build the Flask app image, and start PostgreSQL and Redis containers.
    ```bash
    docker-compose up --build -d
    ```
    *   `db`: PostgreSQL database for development.
    *   `db_test`: Separate PostgreSQL database for running tests.
    *   `redis`: Redis server for caching and JWT blacklisting.
    *   `app`: The Flask application.

4.  **Install `wait-for-it.sh` (for CI/CD and potentially local scripts):**
    If you plan to use the `wait-for-it.sh` script, download it to your project root and make it executable:
    ```bash
    wget https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh
    chmod +x wait-for-it.sh
    ```
    _Note: For local development with `docker-compose up`, services are usually started in the correct order, but `wait-for-it` is crucial for CI/CD._

### Running the Application

Once Docker Compose is up, the Flask application will be accessible at `http://localhost:5000`.

You can also run it locally (outside Docker) after installing `requirements.txt`:
```bash
pip install -r requirements.txt
python wsgi.py # Or flask run (if FLASK_APP is set)
```
_Note: If running locally, ensure your `DATABASE_URL`, `REDIS_HOST`, etc. in `.env` point to your Docker containers (e.g., `localhost` instead of `db`/`redis`)._

### Database Migrations

After the `db` service is running:

1.  **Initialize migration repository (first time only):**
    ```bash
    docker exec auth-app flask db init
    ```
2.  **Create initial migration script (first time or after model changes):**
    ```bash
    docker exec auth-app flask db migrate -m "Initial migration."
    ```
3.  **Apply migrations to the database:**
    ```bash
    docker exec auth-app flask db upgrade
    ```

### Seed Data & Admin User

After migrations, you can populate the database:

1.  **Seed dummy users:**
    ```bash
    docker exec auth-app flask db-commands seed --count 20
    ```
2.  **Create an admin user:**
    ```bash
    docker exec auth-app flask db-commands create-admin
    ```
    Follow the prompts for username, email, and password. This user will have the `admin` role and be automatically verified.

---

## 4. API Documentation

All API endpoints return JSON responses. Errors are returned with appropriate HTTP status codes and a JSON body containing `{"message": "Error description", "errors": {"field": "Validation error"}}`.

**Base URL**: `/api/v1`

### Authentication Endpoints

*   **`POST /auth/register`**
    *   Registers a new user. Sends a verification email.
    *   **Request Body**:
        ```json
        {
          "username": "john_doe",
          "email": "john.doe@example.com",
          "password": "StrongPassword123!"
        }
        ```
    *   **Responses**:
        *   `201 Created`: `{"message": "User registered successfully. Please check your email to verify your account."}`
        *   `400 Bad Request`: `{"message": "Validation error", "errors": {"field": ["Error message"]}}` (e.g., duplicate username/email, invalid password format).

*   **`GET /auth/verify-email/<token>`**
    *   Verifies a user's email address using a token sent to their email.
    *   **Parameters**: `token` (path parameter) - The verification token.
    *   **Responses**:
        *   `200 OK`: Renders a success HTML page or returns `{"message": "Email verified successfully."}`
        *   `400 Bad Request`: `{"message": "Invalid or expired token."}`
        *   `404 Not Found`: `{"message": "Verification token not found or user already verified."}`

*   **`POST /auth/login`**
    *   Authenticates a user and returns JWT access and refresh tokens.
    *   **Request Body**:
        ```json
        {
          "username": "john_doe",
          "password": "StrongPassword123!"
        }
        ```
    *   **Responses**:
        *   `200 OK`: `{"access_token": "...", "refresh_token": "..."}`
        *   `401 Unauthorized`: `{"message": "Invalid username or password"}`
        *   `403 Forbidden`: `{"message": "Account not verified. Please verify your email."}`

*   **`POST /auth/refresh`**
    *   Generates a new access token using a valid refresh token.
    *   **Authorization Header**: `Bearer <refresh_token>`
    *   **Responses**:
        *   `200 OK`: `{"access_token": "..."}`
        *   `401 Unauthorized`: `{"message": "Invalid or expired refresh token"}`

*   **`POST /auth/logout`**
    *   Invalidates the current access token (and optionally refresh token) by blacklisting it.
    *   **Authorization Header**: `Bearer <access_token>`
    *   **Responses**:
        *   `200 OK`: `{"message": "Successfully logged out."}`
        *   `401 Unauthorized`: `{"message": "Missing or invalid token"}`

*   **`POST /auth/forgot-password`**
    *   Sends a password reset link to the user's email.
    *   **Request Body**:
        ```json
        {
          "email": "john.doe@example.com"
        }
        ```
    *   **Responses**:
        *   `200 OK`: `{"message": "Password reset link sent to your email."}`
        *   `404 Not Found`: `{"message": "User with that email not found."}`

*   **`GET /auth/reset-password/<token>`**
    *   Renders an HTML form for setting a new password.
    *   **Parameters**: `token` (path parameter) - The password reset token.
    *   **Responses**:
        *   `200 OK`: Renders `reset_password.html`
        *   `400 Bad Request`: `{"message": "Invalid or expired token."}`

*   **`POST /auth/reset-password/<token>`**
    *   Sets a new password using a valid reset token.
    *   **Parameters**: `token` (path parameter)
    *   **Request Body**:
        ```json
        {
          "new_password": "NewStrongPassword123!"
        }
        ```
    *   **Responses**:
        *   `200 OK`: `{"message": "Password reset successfully."}`
        *   `400 Bad Request`: `{"message": "Invalid or expired token."}`

### User Endpoints (Protected by `@jwt_required`)

*   **`GET /user/profile`**
    *   Retrieves the authenticated user's profile information.
    *   **Authorization Header**: `Bearer <access_token>`
    *   **Responses**:
        *   `200 OK`: `{"id": "...", "username": "...", "email": "...", "is_verified": true, ...}`
        *   `401 Unauthorized`: `{"message": "Missing or invalid token"}`

*   **`PUT /user/profile`**
    *   Updates the authenticated user's profile information.
    *   **Authorization Header**: `Bearer <access_token>`
    *   **Request Body**:
        ```json
        {
          "username": "new_john_doe",
          "email": "new.john.doe@example.com"
        }
        ```
        (Fields are optional, only provide what needs to be updated)
    *   **Responses**:
        *   `200 OK`: `{"message": "User profile updated successfully."}`
        *   `400 Bad Request`: `{"message": "Validation error", "errors": {"field": ["Error message"]}}`
        *   `401 Unauthorized`: `{"message": "Missing or invalid token"}`

### Admin Endpoints (Protected by `@jwt_required` and `@roles_required('admin')`)

*   **`GET /admin/users`**
    *   Retrieves a list of all registered users.
    *   **Authorization Header**: `Bearer <access_token>` (Admin role required)
    *   **Responses**:
        *   `200 OK`: `[{"id": "...", "username": "...", "email": "...", "role": "user", ...}, ...]`
        *   `401 Unauthorized`: `{"message": "Missing or invalid token"}`
        *   `403 Forbidden`: `{"message": "Admin privileges required"}`

*   **`GET /admin/users/<user_id>`**
    *   Retrieves a specific user's profile by ID.
    *   **Authorization Header**: `Bearer <access_token>` (Admin role required)
    *   **Parameters**: `user_id` (path parameter) - The UUID of the user.
    *   **Responses**:
        *   `200 OK`: `{"id": "...", "username": "...", "email": "...", "role": "user", ...}`
        *   `401 Unauthorized`: `{"message": "Missing or invalid token"}`
        *   `403 Forbidden`: `{"message": "Admin privileges required"}`
        *   `404 Not Found`: `{"message": "User not found."}`

*   **`PUT /admin/users/<user_id>`**
    *   Updates a specific user's information (e.g., role, active status).
    *   **Authorization Header**: `Bearer <access_token>` (Admin role required)
    *   **Parameters**: `user_id` (path parameter)
    *   **Request Body**:
        ```json
        {
          "role": "admin",
          "is_active": false,
          "is_verified": true
        }
        ```
        (Fields are optional, only provide what needs to be updated. `username` and `email` can also be updated.)
    *   **Responses**:
        *   `200 OK`: `{"message": "User updated successfully."}`
        *   `400 Bad Request`: `{"message": "Validation error", "errors": {"field": ["Error message"]}}`
        *   `401 Unauthorized`: `{"message": "Missing or invalid token"}`
        *   `403 Forbidden`: `{"message": "Admin privileges required"}`
        *   `404 Not Found`: `{"message": "User not found."}`

*   **`DELETE /admin/users/<user_id>`**
    *   Deletes a specific user by ID.
    *   **Authorization Header**: `Bearer <access_token>` (Admin role required)
    *   **Parameters**: `user_id` (path parameter)
    *   **Responses**:
        *   `200 OK`: `{"message": "User deleted successfully."}`
        *   `401 Unauthorized`: `{"message": "Missing or invalid token"}`
        *   `403 Forbidden`: `{"message": "Admin privileges required"}`
        *   `404 Not Found`: `{"message": "User not found."}`

### Error Responses

All error responses follow a consistent JSON format:

```json
{
  "message": "A descriptive error message",
  "errors": {
    "field_name_1": ["Error detail 1", "Error detail 2"],
    "field_name_2": ["Error detail 3"]
  }
}
```
*   `message`: A general description of the error.
*   `errors`: (Optional) An object containing field-specific validation errors.

Common HTTP Status Codes:
*   `400 Bad Request`: Client-side validation failed, malformed request.
*   `401 Unauthorized`: Authentication required or failed (invalid/missing token).
*   `403 Forbidden`: Authenticated but lacks necessary permissions (e.g., wrong role, unverified account).
*   `404 Not Found`: Resource not found.
*   `405 Method Not Allowed`: HTTP method not supported for the endpoint.
*   `429 Too Many Requests`: Rate limit exceeded.
*   `500 Internal Server Error`: Server-side error.

---

## 5. Testing

The project uses `pytest` for testing.

To run tests:
1.  Ensure your `db_test` and `redis` Docker services are running (`docker-compose up -d db_test redis`).
2.  Set `FLASK_ENV=testing` (it's automatically set in `conftest.py` for `pytest`).
3.  Run pytest from the project root:
    ```bash
    docker exec auth-app pytest --cov=app --cov-report=term-missing tests/
    ```
    (Or, if running Python locally and pointing to Docker DBs):
    ```bash
    pytest --cov=app --cov-report=term-missing tests/
    ```

*   **Unit Tests**: Focus on individual components (models, utility functions) in isolation. (`tests/unit/`)
*   **Integration Tests**: Verify the interaction between multiple components (e.g., full auth flow: register -> login -> protected access -> logout). (`tests/integration/`)
*   **API Tests**: Test specific API endpoints with various valid and invalid inputs, checking status codes and response bodies. (`tests/api/`)

**Test Coverage**: The goal is 80%+ test coverage to ensure critical parts of the application are well-tested.

---

## 6. Deployment

A detailed deployment guide is available in `docs/DEPLOYMENT.md`.

In summary, for production, you would:
1.  **Build the Docker image**: `docker build -t your-repo/auth-system:latest .`
2.  **Push to a registry**: `docker push your-repo/auth-system:latest`
3.  **Provision a server**: (e.g., AWS EC2, Google Cloud Run, DigitalOcean Droplet).
4.  **Configure environment variables**: Set all production-sensitive variables in the `.env` file or directly in your deployment environment (e.g., Kubernetes secrets, EC2 user data).
5.  **Deploy with Docker Compose/Kubernetes**:
    *   For a simple setup, copy `docker-compose.yml` (modified for production, e.g., removing `db_test`) and your `.env` to the server.
    *   Run `docker-compose pull` and `docker-compose up -d`.
6.  **Run migrations**: `docker exec auth-app flask db upgrade`.
7.  **Set up reverse proxy**: Use Nginx or Caddy to proxy requests to the Flask app (Gunicorn) and handle SSL termination.
8.  **Monitoring**: Integrate with monitoring tools (Prometheus, Grafana, ELK stack).

---

## 7. Logging & Monitoring

*   **Logging**: The application uses Python's standard `logging` module.
    *   In development, logs are printed to the console.
    *   In production, logs are formatted as JSON and written to `app.log` (rotating file handler) and stderr, making them suitable for centralized log management systems (e.g., ELK stack, Splunk, Datadog).
    *   Errors are caught by central error handlers and logged.
*   **Monitoring**:
    *   While not fully implemented (due to scope), a production setup would include:
        *   **Application Performance Monitoring (APM)**: Tools like New Relic, Datadog APM, or Prometheus/Grafana for monitoring request latency, error rates, resource utilization.
        *   **Health Checks**: Endpoints for checking application health (`/healthz`, `/readyz`).
        *   **Alerting**: Configure alerts for critical errors, high latency, or service unavailability.

---

## 8. Security Considerations

*   **Password Hashing**: Bcrypt is used with a strong work factor.
*   **JWT Security**:
    *   Secret keys are stored securely via environment variables.
    *   Tokens have short expiry times.
    *   Refresh tokens are used to issue new access tokens.
    *   Token blacklisting prevents reuse of revoked tokens.
    *   Tokens are sent via `Authorization` header, not URL parameters.
*   **Rate Limiting**: Protects against brute-force attacks and DDoS attempts on login, registration, and password reset.
*   **Input Validation**: All API inputs are rigorously validated using `webargs` and `marshmallow`.
*   **CORS**: `Flask-CORS` would be configured in a real-world scenario if a separate frontend is hosted on a different domain. For this project, it's omitted for simplicity or can be added in `app/__init__.py`.
*   **Environment Variables**: All sensitive configuration (secret keys, database credentials) are loaded from environment variables and not hardcoded.
*   **HTTPS**: Critical for production; requests should always be served over HTTPS. This is typically handled by a reverse proxy (e.g., Nginx).
*   **Principle of Least Privilege**: User roles are enforced, limiting access to resources based on permissions.
*   **SQL Injection**: SQLAlchemy ORM inherently protects against most SQL injection attacks.

---

## 9. Future Enhancements

*   **Two-Factor Authentication (2FA)**: Integrate with TOTP (Time-based One-Time Password) or SMS-based 2FA.
*   **Social Logins**: Allow users to register/login using Google, Facebook, GitHub, etc.
*   **User Roles & Permissions Management**: A more granular RBAC system allowing dynamic permission assignments.
*   **Audit Logging**: Track significant user actions (e.g., password changes, role updates).
*   **Microservices Architecture**: Break down the authentication system into smaller, independently deployable services.
*   **GraphQL API**: Provide a GraphQL interface for more flexible data fetching.
*   **Container Orchestration**: Deploy with Kubernetes for advanced scaling, self-healing, and management.
*   **Asynchronous Tasks**: Use Celery/RabbitMQ for background tasks like sending emails or processing large data.
*   **Frontend**: A complete frontend application (React/Angular/Vue) interacting with the API.

---

## 10. License

This project is licensed under the MIT License - see the `LICENSE` file for details. (A `LICENSE` file would be present in a real project).