# Payment Processing System

A comprehensive, production-ready payment processing system built with Node.js, Express, PostgreSQL, and Redis. This project demonstrates best practices for architecture, security, scalability, and quality assurance in an enterprise-grade application.

## Table of Contents
1.  [Features](#features)
2.  [Technologies Used](#technologies-used)
3.  [Project Structure](#project-structure)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Setup](#local-setup)
    *   [Docker Setup](#docker-setup)
5.  [Running the Application](#running-the-application)
6.  [Database Management](#database-management)
7.  [API Endpoints](#api-endpoints)
8.  [Testing](#testing)
    *   [Unit Tests](#unit-tests)
    *   [Integration Tests](#integration-tests)
    *   [API Tests](#api-tests)
    *   [Performance Tests (k6)](#performance-tests-k6)
9.  [Code Quality](#code-quality)
10. [Authentication & Authorization](#authentication--authorization)
11. [Error Handling](#error-handling)
12. [Logging & Monitoring](#logging--monitoring)
13. [Caching](#caching)
14. [Rate Limiting](#rate-limiting)
15. [CI/CD](#cicd)
16. [Architecture](#architecture)
17. [Deployment](#deployment)
18. [Frontend (Conceptual)](#frontend-conceptual)
19. [Contribution](#contribution)
20. [License](#license)

## Features
*   **User Management:** Registration, Login, Profile Management.
*   **Account Management:** Create, view, update user accounts (e.g., NGN, USD wallets).
*   **Transaction Processing:**
    *   Initiate debit/credit transactions.
    *   Integration with external payment gateways (mocked).
    *   Refund processing.
    *   Webhook handling for asynchronous payment status updates.
*   **Security:** JWT authentication, password hashing, input validation, Helmet.
*   **Scalability:** Microservice-oriented design (conceptual), Redis for caching/rate limiting, PostgreSQL for robust data.
*   **Observability:** Comprehensive logging with Winston, error handling.
*   **Development Tools:** Docker, Knex.js for migrations, Objection.js for ORM.
*   **Quality Assurance:** Extensive unit, integration, and API tests, performance testing framework.

## Technologies Used
*   **Backend:** Node.js, Express.js
*   **Database:** PostgreSQL
*   **ORM/Query Builder:** Objection.js, Knex.js
*   **Authentication:** JSON Web Tokens (JWT), Bcrypt.js
*   **Caching/Rate Limiting:** Redis (via ioredis)
*   **Logging:** Winston
*   **Validation:** Joi
*   **HTTP Client:** Axios
*   **Testing:** Jest, Supertest, K6
*   **Containerization:** Docker, Docker Compose
*   **Linting/Formatting:** ESLint, Prettier

## Project Structure
```
payment-system/
├─── .github/                            # CI/CD workflows
├─── config/                             # Environment-specific configurations
├─── database/                           # Database schema, migrations, seeds
├─── docs/                               # Documentation (Architecture, API, Deployment)
├─── src/                                # Core application source code
│    ├─── api/                          # External API integrations
│    ├─── controllers/                  # Request handling logic
│    ├─── middleware/                   # Express middleware (auth, error, rate-limit, cache)
│    ├─── models/                       # Database models (Objection.js)
│    ├─── routes/                       # API routes
│    ├─── services/                     # Business logic and data manipulation
│    ├─── utils/                        # Helper functions (logger, db, jwt, redis)
│    └─── tests/                        # Unit, Integration tests
├─── frontend/ (Conceptual)             # Placeholder for a React frontend
├─── .env.example                       # Environment variables example
├─── Dockerfile                          # Backend Dockerfile
├─── docker-compose.yml                  # Docker Compose setup
├─── package.json                        # Backend dependencies
├─── README.md                           # Project README
└─── jest.config.js                      # Jest configuration
```

## Setup and Installation

### Prerequisites
*   Node.js (v18+) & npm
*   PostgreSQL (or Docker)
*   Redis (or Docker)
*   Git
*   Docker & Docker Compose (recommended)

### Local Setup (without Docker)
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/payment-system.git
    cd payment-system
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    *   Create a `.env` file in the root directory based on `.env.example`.
    *   Fill in your PostgreSQL and Redis connection details.
    *   Ensure `JWT_SECRET` is strong and `PAYMENT_GATEWAY_API_KEY`/`SECRET` are set (even for the mock).
    ```bash
    cp .env.example .env
    # Edit .env with your specific values
    ```
4.  **Database Setup:**
    *   Ensure your PostgreSQL server is running.
    *   Create a database (e.g., `payment_system_db`) and a user with access to it.
    *   Run migrations to create tables:
        ```bash
        npm run migrate:latest
        ```
    *   (Optional) Seed initial data:
        ```bash
        npm run seed:run
        ```
5.  **Redis Setup:**
    *   Ensure your Redis server is running.

### Docker Setup (Recommended for Development)
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/payment-system.git
    cd payment-system
    ```
2.  **Set up environment variables:**
    *   Create a `.env` file in the root directory based on `.env.example`.
    *   The `docker-compose.yml` uses default values, but you can override them here.
    *   Ensure `PAYMENT_GATEWAY_API_KEY`/`SECRET` are set for the mock gateway integration.
    ```bash
    cp .env.example .env
    # Edit .env if you need to customize default environment variables
    ```
3.  **Build and run services with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    This will:
    *   Build the backend Docker image.
    *   Start PostgreSQL, Redis, and the backend service.
    *   Run database migrations during the backend container build.
    *   Mount your local code for live-reloading during development (`npm run dev` in container).

    **Note:** The `db` service includes an `init-uuid.sh` script to ensure the `uuid-ossp` extension is enabled for PostgreSQL.

## Running the Application
*   **With Docker Compose (recommended for development):**
    The `backend` service is configured to run `npm run dev` which uses `nodemon` for live reloading.
    The API will be available at `http://localhost:5000/api`.
*   **Locally (without Docker):**
    ```bash
    npm run dev  # For development with live-reloading
    npm start    # For production build
    ```
    The API will be available at `http://localhost:5000/api`.

## Database Management
*   **Create a new migration:**
    ```bash
    npm run migrate:make <migration_name>
    ```
*   **Run pending migrations:**
    ```bash
    npm run migrate:latest
    ```
*   **Rollback last migration:**
    ```bash
    npm run migrate:rollback
    ```
*   **Create a new seed file:**
    ```bash
    npm run seed:make <seed_name>
    ```
*   **Run all seed files:**
    ```bash
    npm run seed:run
    ```

## API Endpoints
Refer to `docs/API_DOCS.md` for detailed API documentation.

**Examples:**
*   `POST /api/auth/register` - User registration
*   `POST /api/auth/login` - User login
*   `GET /api/auth/profile` - Get authenticated user's profile
*   `GET /api/accounts` - Get all accounts for the authenticated user
*   `POST /api/accounts` - Create a new account
*   `GET /api/accounts/:id` - Get a specific account by ID
*   `POST /api/transactions/initiate` - Initiate a new transaction (debit/credit)
*   `POST /api/transactions/:id/refund` - Refund an existing transaction
*   `GET /api/transactions/account/:accountId` - Get transactions for a specific account
*   `POST /api/transactions/webhook` - Endpoint for payment gateway webhooks

## Testing
The project includes a comprehensive testing suite.

### Unit Tests
*   Located in `src/tests/unit/`.
*   Focus on individual functions, services, and models in isolation.
*   **Run unit tests:**
    ```bash
    npm run test:unit
    ```

### Integration Tests
*   Located in `src/tests/integration/`.
*   Test interactions between different components (e.g., controller, service, database).
*   **Run integration tests:**
    ```bash
    npm run test:integration
    ```

### API Tests
*   Part of the integration tests, using `Supertest` to make actual HTTP requests to the Express app.
*   Verify API endpoint behavior, request/response formats, and status codes.

### Performance Tests (k6)
*   Located in `scripts/k6_load_test.js`.
*   Uses `k6` to simulate user load and measure API performance.
*   **Prerequisites:** Install `k6` (`brew install k6` or `sudo apt-get install k6`).
*   **Run performance tests:**
    ```bash
    k6 run scripts/k6_load_test.js
    ```
    *Note*: You may need to replace the dummy JWT token in `k6_load_test.js` with a valid token from a test user for your running application.

### Test Coverage
*   Aims for 80%+ code coverage.
*   **Generate coverage report:**
    ```bash
    npm run test:coverage
    ```
    This will generate a `coverage/` directory with detailed reports.

## Code Quality
*   **ESLint:** For static code analysis and identifying problematic patterns.
*   **Prettier:** For consistent code formatting.
*   **Run linting:**
    ```bash
    npm run lint
    ```
*   **Auto-format code:**
    ```bash
    npm run prettify
    ```

## Authentication & Authorization
*   Uses JSON Web Tokens (JWT) for authentication.
*   `auth` middleware (`src/middleware/auth.js`) verifies tokens and attaches user data to `req.user`.
*   Supports role-based authorization (e.g., `auth(['admin'])`).
*   Password hashing with `bcryptjs`.

## Error Handling
*   Centralized error handling middleware (`src/middleware/errorHandler.js`) catches all API errors.
*   Logs errors using Winston.
*   Handles `unhandledRejection` and `uncaughtException` for robust process management.

## Logging & Monitoring
*   **Winston:** Configured for structured logging (`src/utils/logger.js`).
    *   Logs to console in development.
    *   Logs to files (`error.log`, `combined.log`, `exceptions.log`, `rejections.log`) for production.
*   Can be integrated with external monitoring tools like Prometheus/Grafana or ELK stack.

## Caching
*   Implemented with Redis using `src/middleware/caching.js`.
*   Routes can specify a cache duration (e.g., `router.get('/', cacheMiddleware(60), ...)`).
*   Automatic cache invalidation for operations that modify data (e.g., after `initiateTransaction`).

## Rate Limiting
*   Implemented with `express-rate-limit` and Redis store (`src/middleware/rateLimiter.js`).
*   Global rate limiting applied to all API routes.
*   Specific rate limiting for authentication routes to prevent brute-force attacks.

## CI/CD
*   Conceptual GitHub Actions workflow (`.github/workflows/ci.yml`) is provided.
*   Automates:
    *   Code checkout
    *   Dependency installation
    *   Database migrations
    *   Running all tests (unit, integration, API)
    *   Code linting
    *   Docker image building
    *   (Optional) Docker image pushing to a registry
    *   (Optional) Deployment to a cloud provider (e.g., AWS ECS, Kubernetes).

## Architecture
See `docs/ARCHITECTURE.md` for a detailed overview of the system's architecture, design decisions, and data flows.

## Deployment
Refer to `docs/DEPLOYMENT.md` for detailed instructions on deploying the application to a production environment (e.g., AWS, GCP, Azure, Heroku). This includes:
*   Environment configuration.
*   Database and Redis provisioning.
*   Container orchestration (ECS, Kubernetes).
*   SSL/TLS setup.
*   Load balancing.

## Frontend (Conceptual)
A placeholder `frontend/` directory is included. A full-scale React/Next.js application would typically:
*   Consume the backend API.
*   Provide user dashboards, transaction history, payment forms.
*   Implement secure client-side payment method tokenization using payment gateway SDKs (e.g., Stripe.js).

## Contribution
Contributions are welcome! Please open an issue or submit a pull request.

## License
This project is licensed under the MIT License.