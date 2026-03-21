```markdown
# Enterprise-Grade Project Management System

This project is a comprehensive, production-ready Project Management System designed with a strong focus on security, scalability, and maintainability. It demonstrates best practices in full-stack development using TypeScript, Node.js (Express), React, PostgreSQL, and Redis, complete with robust testing, Dockerization, and CI/CD configuration.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Technology Stack](#technology-stack)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Environment Variables](#environment-variables)
    *   [Running with Docker Compose (Recommended)](#running-with-docker-compose-recommended)
    *   [Running Backend Locally](#running-backend-locally)
    *   [Running Frontend Locally](#running-frontend-locally)
5.  [Database Management](#database-management)
    *   [Migrations](#migrations)
    *   [Seeding](#seeding)
6.  [Testing](#testing)
    *   [Running Tests](#running-tests)
    *   [Test Coverage](#test-coverage)
    *   [Performance Tests](#performance-tests)
7.  [API Documentation](#api-documentation)
8.  [CI/CD](#ci/cd)
9.  [Security Implementations](#security-implementations)
10. [Future Enhancements](#future-enhancements)
11. [License](#license)

## 1. Features

**Core Application:**
*   User Management (Register, Login, Role-Based Access)
*   Project Management (Create, Read, Update, Delete projects)
*   Task Management (Create, Read, Update, Delete tasks within projects, assign to users)
*   CRUD operations for all major entities.

**Security & Reliability:**
*   **Authentication:** JSON Web Tokens (JWT) for secure session management.
*   **Authorization:** Role-Based Access Control (RBAC) middleware (`user`, `manager`, `admin` roles).
*   **Input Validation:** Joi schema validation for all incoming request bodies.
*   **Password Security:** `bcrypt` for password hashing.
*   **Rate Limiting:** Protects against brute-force and DoS attacks using `express-rate-limit` with Redis store.
*   **Caching:** Redis-based caching for frequently accessed data to improve performance and reduce database load.
*   **Centralized Error Handling:** Custom `AppError` and global error middleware for consistent error responses and logging.
*   **Logging:** `Winston` for structured logging, including error tracking and security events.
*   **Security Headers:** `Helmet` to set various HTTP headers for enhanced security (e.g., XSS protection, CSRF protection, etc.).
*   **CORS:** Properly configured for secure cross-origin requests.
*   **Environment Configuration:** `dotenv` for managing sensitive credentials.
*   **Database Security:** TypeORM's ORM layer inherently protects against SQL injection.

**Developer Experience & Quality:**
*   TypeScript for type safety and code quality.
*   Docker and Docker Compose for easy setup and consistent environments.
*   Comprehensive Unit, Integration, and API Tests (aiming for 80%+ coverage).
*   CI/CD pipeline with GitHub Actions.
*   Detailed documentation.

## 2. Architecture

The system follows a typical microservice-oriented (or layered monolith) architecture with a clear separation of concerns:

*   **Frontend (React):** A single-page application (SPA) providing the user interface.
*   **Backend (Node.js/Express/TypeScript):** A RESTful API server handling business logic, data persistence, authentication, and authorization.
    *   **Controllers:** Handle incoming HTTP requests, parse inputs, and delegate to services.
    *   **Services:** Encapsulate business logic and orchestrate interactions with the database.
    *   **Middleware:** Implement cross-cutting concerns like authentication, authorization, validation, logging, rate limiting, and caching.
    *   **Models (Entities):** TypeORM entities defining the database schema.
    *   **Utils:** Helper functions for JWT, password hashing, and custom error handling.
*   **Database (PostgreSQL):** Relational database for persistent storage, managed by TypeORM.
*   **Cache/Rate Limit Store (Redis):** An in-memory data store used for API response caching and tracking rate limits.

```
+----------------+      +---------------------+       +-------------------+       +-----------------+
|   Frontend     | <--> |   Nginx (Docker)    | <-->  |   Backend API     | <-->  |   PostgreSQL    |
|    (React)     |      |  (Optional/Prod)    |       |  (Node.js/Express)|       |    (Database)   |
+----------------+      +---------------------+       +-------------------+       +--------^--------+
                                                               |                         |
                                                               +-------------------------+
                                                                         Redis
                                                                      (Cache/Rate Limit)
```

## 3. Technology Stack

**Backend:**
*   **Language:** TypeScript
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **ORM:** TypeORM
*   **Database:** PostgreSQL
*   **Caching/Rate Limiting:** Redis
*   **Authentication:** JSON Web Tokens (JWT)
*   **Password Hashing:** `bcryptjs`
*   **Validation:** `Joi`
*   **Logging:** `Winston`
*   **Security Headers:** `Helmet`
*   **Testing:** Jest, Supertest

**Frontend:**
*   **Language:** TypeScript
*   **Framework:** React
*   **Routing:** React Router DOM
*   **HTTP Client:** Axios

**DevOps & Tools:**
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions
*   **Version Control:** Git

## 4. Setup and Installation

### Prerequisites

*   Git
*   Node.js (v18+) & npm (or yarn)
*   Docker & Docker Compose

### Environment Variables

Both `backend` and `frontend` directories contain an `.env.example` file. Copy these files to `.env` and fill in the values.

**`backend/.env`:**
```dotenv
# Application
NODE_ENV=development
PORT=5000
SECRET_KEY=your_very_strong_secret_key_for_jwt_signing # **CRITICAL FOR SECURITY**
REFRESH_SECRET_KEY=another_strong_secret_key_for_refresh_tokens # **CRITICAL FOR SECURITY**
ACCESS_TOKEN_EXPIRATION=1h
REFRESH_TOKEN_EXPIRATION=7d
RATE_LIMIT_WINDOW_MS=60000 # 1 minute
RATE_LIMIT_MAX_REQUESTS=100

# Database
DB_HOST=db # 'localhost' if running backend locally
DB_PORT=5432
DB_USERNAME=user
DB_PASSWORD=password
DB_DATABASE=project_manager_db

# Redis
REDIS_HOST=redis # 'localhost' if running backend locally
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password # Set a strong password in production

# Logging
LOG_LEVEL=info # error, warn, info, http, verbose, debug, silly
```

**`frontend/.env`:**
```dotenv
REACT_APP_API_BASE_URL=http://localhost:5000/api # Or your deployed backend URL
```

### Running with Docker Compose (Recommended for Full Stack)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/project-management-system.git
    cd project-management-system
    ```

2.  **Create `.env` files:**
    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    # Edit the .env files with your desired configurations
    ```
    **Important:** For `DB_HOST` in `backend/.env`, use `db`. For `REDIS_HOST`, use `redis`. These are the service names within the Docker network.

3.  **Build and run containers:**
    ```bash
    docker-compose up --build -d
    ```
    This will:
    *   Build Docker images for backend and frontend.
    *   Start PostgreSQL and Redis containers.
    *   Start the backend application (which will run TypeORM migrations and then start the server).
    *   Start the frontend application.

4.  **Access the application:**
    *   Backend API: `http://localhost:5000`
    *   Frontend UI: `http://localhost:3000`

### Running Backend Locally

1.  **Navigate to the `backend` directory:**
    ```bash
    cd project-management-system/backend
    ```

2.  **Create `.env` file:**
    ```bash
    cp .env.example .env
    ```
    **Important:** For `DB_HOST` and `REDIS_HOST` in `backend/.env`, use `localhost` if your PostgreSQL and Redis instances are running directly on your machine or through `docker run` commands outside of `docker-compose`. If running them via `docker-compose up db redis`, then use `localhost`.

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Start PostgreSQL and Redis:**
    Ensure you have a PostgreSQL server running (e.g., via Docker: `docker run --name my-postgres -e POSTGRES_DB=project_manager_db -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:14-alpine`) and a Redis server (`docker run --name my-redis -e REDIS_PASSWORD=your_redis_password -p 6379:6379 -d redis:7-alpine redis-server --requirepass "your_redis_password"`). Make sure credentials in `.env` match.

5.  **Run migrations:**
    ```bash
    npm run migrate:run
    ```

6.  **Start the backend in development mode:**
    ```bash
    npm run dev
    ```
    The backend will be available at `http://localhost:5000`.

### Running Frontend Locally

1.  **Navigate to the `frontend` directory:**
    ```bash
    cd project-management-system/frontend
    ```

2.  **Create `.env` file:**
    ```bash
    cp .env.example .env
    ```
    Ensure `REACT_APP_API_BASE_URL` points to your backend (e.g., `http://localhost:5000/api`).

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Start the frontend development server:**
    ```bash
    npm start
    ```
    The frontend will be available at `http://localhost:3000`.

## 5. Database Management

### Migrations

Migrations are used to evolve the database schema.
*   **Create a new migration:**
    ```bash
    cd backend
    npm run migrate:create --name=YourMigrationName
    ```
    This will create a new migration file in `src/migrations`. Edit it to define your schema changes.
*   **Run pending migrations:**
    ```bash
    cd backend
    npm run migrate:run
    ```
*   **Revert the last migration:**
    ```bash
    cd backend
    npm run migrate:revert
    ```

### Seeding

Seed data can be used to populate the database with initial or test data.
*   **Run the seed script:**
    ```bash
    cd backend
    npm run seed:run
    ```
    **Warning:** The current seed script clears existing user, project, and task data. Use with caution in non-development environments.

## 6. Testing

The project emphasizes quality through a comprehensive testing suite.

### Running Tests

1.  **Ensure Docker containers for test DB/Redis are running or have local instances configured for tests.**
    The `backend/src/tests/setup.ts` expects a PostgreSQL on port `5433` and Redis on `6380` with specific credentials for isolated testing. You can run them manually:
    ```bash
    docker run --name test-db -e POSTGRES_DB=test_db -e POSTGRES_USER=test_user -e POSTGRES_PASSWORD=test_password -p 5433:5432 -d postgres:14-alpine
    docker run --name test-redis -e REDIS_PASSWORD=test_redis_password -p 6380:6379 -d redis:7-alpine redis-server --requirepass "test_redis_password"
    # Wait a few seconds for them to start
    ```
    After tests, stop and remove them:
    ```bash
    docker stop test-db test-redis
    docker rm test-db test-redis
    ```

2.  **Run all backend tests:**
    ```bash
    cd backend
    npm test
    ```
    This will run unit, integration, and API tests, and generate a coverage report.

3.  **Run specific test types:**
    ```bash
    npm run test:unit       # Only unit tests
    npm run test:integration # Only integration tests
    npm run test:api        # Only API tests
    ```

4.  **Run frontend tests:**
    ```bash
    cd frontend
    npm test -- --coverage
    ```

### Test Coverage

The `jest.config.ts` in the `backend` directory is configured to target 80% code coverage for branches, functions, lines, and statements globally. Coverage reports are generated in the `coverage/` directory.

### Performance Tests

Performance tests are not integrated into the standard `npm test` workflow. They require separate tools like [k6](https://k6.io/) or [Artillery](https://artillery.io/).

1.  **Install k6 (if not already):**
    Follow instructions on [k6.io](https://k6.io/docs/getting-started/installation/).
2.  **Run the example k6 script:**
    ```bash
    k6 run performance-tests/k6-script.js
    ```
    **Note:** The example `k6-script.js` is a placeholder. For real performance testing, you would need to:
    *   Dynamically generate/retrieve authentication tokens.
    *   Simulate various user flows (login, create project, get tasks, update task).
    *   Increase virtual users (`target` in `options.stages`) to stress the system.
    *   Run tests against a deployed environment, not your local machine for accurate results.

## 7. API Documentation

API documentation is provided in an OpenAPI (Swagger) style.
See [API_DOCS.md](API_DOCS.md) for detailed endpoint descriptions, request/response schemas, and authentication requirements.

## 8. CI/CD

A GitHub Actions workflow (`.github/workflows/ci-cd.yml`) is configured to:
*   Run on `push` and `pull_request` to `main` and `develop` branches.
*   **Build & Test Backend:** Installs dependencies, lints, builds TypeScript, and runs unit, integration, and API tests in a containerized environment (PostgreSQL and Redis services).
*   **Build & Test Frontend:** Installs dependencies, lints, runs tests, and builds the React application.
*   **Deploy:** (Simulated) A `deploy` job triggers only on `push` to `main` branch, indicating a production deployment. In a real scenario, this would involve pushing Docker images to a registry and deploying to a cloud provider.

## 9. Security Implementations

This project prioritizes security at every layer:

*   **Authentication (JWT):** Utilizes industry-standard JSON Web Tokens for stateless authentication. Access tokens have short lifespans, and refresh tokens (though simplified in this demo by being returned directly) would typically be managed more securely (e.g., HTTP-only cookies, database invalidation).
*   **Authorization (RBAC):** Role-Based Access Control is enforced via middleware (`authorize.middleware.ts`) and further refined in service layers for object-level permissions (e.g., a user can only update their own project, unless they are an admin).
*   **Input Validation (Joi):** All incoming request bodies are validated against predefined schemas (`validationSchemas.ts`) to prevent common vulnerabilities like injection attacks and malformed data.
*   **Password Hashing (Bcrypt):** User passwords are securely hashed using `bcryptjs` with a sufficient number of salt rounds, making them resistant to brute-force attacks and rainbow table lookups.
*   **Rate Limiting (Redis-backed):** The `express-rate-limit` middleware, backed by Redis, prevents abuse, brute-force attacks, and denial-of-service attempts by limiting the number of requests a user can make within a time window.
*   **Caching (Redis):** While primarily for performance, caching frequently accessed data can also reduce the attack surface on the database by limiting direct queries.
*   **Structured Logging (Winston):** Detailed logs (`winston` configured in `config/logger.ts`) provide visibility into application behavior, including security-relevant events (e.g., failed login attempts, authorization failures, errors), crucial for monitoring and incident response.
*   **Centralized Error Handling:** Custom error classes (`AppError.ts`) and a global error middleware (`error.middleware.ts`) ensure that sensitive internal error details are not exposed to clients in production, providing user-friendly messages while logging full details for developers.
*   **Security Headers (Helmet):** `helmet` sets various HTTP response headers to mitigate common web vulnerabilities such as XSS, clickjacking, and insecure connections.
*   **CORS Configuration:** Explicit CORS configuration prevents unauthorized cross-origin requests.
*   **Environment Variables:** Sensitive information (API keys, database credentials, JWT secrets) are stored in environment variables and never hardcoded, following the 12-factor app principles.
*   **SQL Injection Prevention:** TypeORM, as an ORM, automatically sanitizes inputs and uses parameterized queries, effectively preventing SQL injection attacks.
*   **Session Management:** JWTs are used for session management. In a production scenario, additional measures like JWT revocation lists (for refresh tokens), token rotation, and strict token expiry management would be implemented.

## 10. Future Enhancements

*   **Frontend UI:** Build out a richer and more interactive React frontend.
*   **Refresh Token Revocation:** Implement a mechanism to revoke refresh tokens (e.g., storing them in Redis/DB and invalidating on logout/compromise).
*   **Email Verification:** Add email verification flow for user registration.
*   **Password Reset:** Implement a secure "forgot password" flow with token-based reset.
*   **Input Sanitization:** Beyond validation, consider libraries for sanitizing inputs (e.g., `xss-clean`).
*   **File Uploads:** Secure handling of file uploads (if applicable).
*   **Audit Logging:** More granular audit trails for critical actions.
*   **Notifications:** Real-time notifications for task assignments, project updates.
*   **Search and Filtering:** Advanced search and filtering capabilities for projects and tasks.
*   **WebSockets:** For real-time updates and collaboration features.
*   **Container Security Scanning:** Integrate tools like Trivy or Clair into CI/CD.
*   **Infrastructure as Code (IaC):** Use Terraform or CloudFormation for cloud deployment.
*   **Monitoring & Alerting:** Integrate with Prometheus/Grafana or cloud-native monitoring services.

## 11. License

This project is open-sourced under the ISC License. See the [LICENSE](LICENSE) file for more details.
```