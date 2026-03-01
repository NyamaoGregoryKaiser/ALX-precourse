```markdown
# Payment Processing System

This project is a comprehensive, production-ready payment processing system designed to handle various transaction lifecycle events, merchant management, and integrations with external payment gateways. It's built with Node.js, Express, and PostgreSQL, focusing on robust architecture, security, scalability, and maintainability, adhering to best practices in software engineering.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Setup & Installation](#setup--installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup](#local-development-setup)
    *   [Docker Setup](#docker-setup)
5.  [Running the Application](#running-the-application)
6.  [Database Management](#database-management)
7.  [API Documentation](#api-documentation)
8.  [Architecture](#architecture)
9.  [Testing](#testing)
10. [CI/CD (Conceptual)](#cicd-conceptual)
11. [Deployment Guide](#deployment-guide)
12. [Further Enhancements](#further-enhancements)
13. [ALX Principles & Best Practices](#alx-principles--best-practices)
14. [License](#license)

---

### 1. Features

*   **Core Payment Logic:**
    *   Simulated `authorize`, `capture`, `refund` operations.
    *   Transaction status lifecycle management.
    *   Idempotency for reliable transaction processing.
*   **Merchant Management:**
    *   CRUD operations for merchant accounts.
    *   Automatic API key generation for merchants.
*   **Transaction Management:**
    *   Detailed transaction records with various attributes.
    *   Filtering, sorting, and pagination for transaction queries.
*   **Webhooks:**
    *   Configurable outbound webhooks for merchants to receive transaction status updates.
    *   Inbound webhooks for receiving events from external payment gateways.
*   **Security:**
    *   JWT-based authentication for internal admin users.
    *   API Key authentication for merchant-facing APIs.
    *   Password hashing (bcrypt).
    *   Input validation (Joi).
    *   Helmet for HTTP security headers, XSS cleaning, HPP protection.
*   **Observability:**
    *   Structured logging with Winston.
    *   Centralized error handling.
*   **Performance & Resilience:**
    *   Rate limiting.
    *   Compression (gzip).
    *   Asynchronous event handling (e.g., webhook dispatch).
*   **Database:**
    *   PostgreSQL with Sequelize ORM.
    *   Database migrations for schema evolution.
    *   Seed data for initial setup.
*   **Development & Operations:**
    *   Docker and Docker Compose for easy setup and local development.
    *   Comprehensive testing suite (Unit, Integration).
    *   Pre-commit hooks for linting and formatting.

### 2. Technology Stack

*   **Backend:** Node.js, Express.js
*   **Database:** PostgreSQL
*   **ORM:** Sequelize
*   **Authentication:** JWT, Passport.js, API Keys
*   **Validation:** Joi
*   **Logging:** Winston
*   **Testing:** Jest, Supertest
*   **Containerization:** Docker, Docker Compose

### 3. Project Structure

The project follows a modular and layered architecture to ensure separation of concerns and maintainability.

```
payment-processor/
├── src/
│   ├── config/              # Application-wide configurations
│   ├── controllers/         # Handles incoming requests, orchestrates services
│   ├── services/            # Business logic layer
│   ├── models/              # Sequelize model definitions and plugins
│   ├── middlewares/         # Express middleware (auth, error handling, rate limiting, validation)
│   ├── utils/               # Utility functions (logger, jwt, api errors, helpers)
│   ├── routes/              # API route definitions
│   ├── app.js               # Express application setup
│   ├── server.js            # Entry point for the application
│   └── database.js          # Database connection and ORM initialization
├── migrations/              # Database migration files (managed by Sequelize CLI)
├── seeders/                 # Database seed files (managed by Sequelize CLI)
├── tests/
│   ├── unit/                # Unit tests for services and utils
│   ├── integration/         # Integration tests for controllers and routes
│   └── api/                 # E2E API tests (uses integration test setup)
├── public/                  # Static files for a conceptual frontend (e.g., dashboard)
├── .env.example             # Environment variables example
├── package.json             # Project dependencies and scripts
├── Dockerfile               # Docker build instructions for the application
├── docker-compose.yml       # Docker Compose for multi-service setup (app + db)
├── README.md                # Comprehensive project documentation (this file)
├── API.md                   # API documentation (OpenAPI style)
├── ARCHITECTURE.md          # System architecture documentation
├── DEPLOYMENT.md            # Deployment guide
├── CI_CD.yml                # GitHub Actions workflow configuration (conceptual)
└── .gitignore               # Files to ignore in Git
```

### 4. Setup & Installation

#### Prerequisites

*   Node.js (v18 or higher) & npm
*   PostgreSQL (optional, if not using Docker for DB)
*   Docker & Docker Compose (recommended)

#### Local Development Setup (without Docker for DB)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/payment-processor.git
    cd payment-processor
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    *   Create a `.env` file in the root directory.
    *   Copy the contents of `.env.example` into your `.env` file.
    *   Update the `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `JWT_SECRET` variables.
    *   Ensure a PostgreSQL server is running locally and reachable by `DB_HOST` and `DB_PORT`.

    ```bash
    # .env
    NODE_ENV=development
    PORT=3000

    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_NAME=payment_processor_db

    JWT_SECRET=your_super_secret_jwt_key_replace_me_with_a_strong_one
    JWT_ACCESS_EXPIRATION_MINUTES=30
    JWT_REFRESH_EXPIRATION_DAYS=30
    RATE_LIMIT_MAX_REQUESTS=100
    ```
    *Hint:* To generate a strong `JWT_SECRET`, run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` in your terminal.

4.  **Run database migrations:**
    ```bash
    npm run migrate
    ```

5.  **Seed initial data:** (Creates an admin user: `admin@example.com` / `Password123!`)
    ```bash
    npm run seed
    ```

#### Docker Setup (Recommended for consistency)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/payment-processor.git
    cd payment-processor
    ```

2.  **Set up environment variables:**
    *   Create a `.env` file in the root directory.
    *   Copy the contents of `.env.example` into your `.env` file.
    *   Update `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `JWT_SECRET`.
    *   For `DB_HOST`, ensure it's set to `database` as defined in `docker-compose.yml` if running both app and DB in Docker.

    ```bash
    # .env
    NODE_ENV=development
    PORT=3000

    DB_HOST=database # Important: 'database' is the service name in docker-compose.yml
    DB_PORT=5432
    DB_USER=myuser
    DB_PASSWORD=mypassword
    DB_NAME=payment_processor_db

    JWT_SECRET=your_super_secret_jwt_key_replace_me_with_a_strong_one
    JWT_ACCESS_EXPIRATION_MINUTES=30
    JWT_REFRESH_EXPIRATION_DAYS=30
    RATE_LIMIT_MAX_REQUESTS=100
    ```

3.  **Build and run Docker containers:**
    ```bash
    docker-compose up --build -d
    ```
    This command builds the Docker image for the Node.js application, creates a PostgreSQL container, sets up networking, runs database migrations (as part of the Dockerfile build step), and starts both services in detached mode.

    *   `--build`: Builds the images before starting containers.
    *   `-d`: Runs containers in detached mode (in the background).

4.  **Access the application:**
    The application will be accessible at `http://localhost:3000`.

### 5. Running the Application

*   **Development Mode (without Docker for app):**
    ```bash
    npm run dev
    ```
    This uses `nodemon` to restart the server automatically on code changes.

*   **Production Mode (without Docker for app):**
    ```bash
    npm start
    ```

*   **With Docker Compose:**
    ```bash
    docker-compose up
    # or to run in background:
    docker-compose up -d
    ```
    The `Dockerfile` handles `npm install` and `npm start`. Migrations are run during the Docker build process.

### 6. Database Management

This project uses `sequelize-cli` for database migrations and seeding.

*   **Apply all pending migrations:**
    ```bash
    npm run migrate
    ```
*   **Undo the last migration:**
    ```bash
    npm run migrate:undo
    ```
*   **Undo all migrations:** (Use with caution, will drop all tables)
    ```bash
    npm run migrate:undo:all
    ```
*   **Run all seeders:** (Populates initial data like an admin user)
    ```bash
    npm run seed
    ```
*   **Undo all seeders:**
    ```bash
    npm run seed:undo
    ```

### 7. API Documentation

Comprehensive API documentation is available in [API.md](API.md) and can be generated with Swagger/OpenAPI.

### 8. Architecture

A detailed overview of the system's architecture, including components, data flow, and design patterns, is provided in [ARCHITECTURE.md](ARCHITECTURE.md).

### 9. Testing

The project emphasizes test-driven development and quality assurance.

*   **Run all tests (unit and integration):**
    ```bash
    npm test
    ```
    This command runs tests in watch mode, automatically rerunning on file changes.

*   **Run tests with coverage report:**
    ```bash
    npm run test:coverage
    ```
    A `coverage` directory will be generated with detailed reports (aim for 80%+ coverage).

**Types of Tests Implemented:**

*   **Unit Tests:** Located in `tests/unit/`. Focus on individual functions, services, and utilities, mocking external dependencies.
*   **Integration Tests:** Located in `tests/integration/`. Test the interaction between multiple modules (e.g., routes, controllers, services, database models). They typically hit actual API endpoints and interact with the database (a test database, not production).
*   **API Tests (E2E):** Covered by the integration tests using `supertest` to simulate HTTP requests.

### 10. CI/CD (Conceptual)

A conceptual GitHub Actions workflow is provided in [CI_CD.yml](CI_CD.yml). This workflow typically includes:

*   **Linting:** Checks code style and potential errors.
*   **Testing:** Runs unit and integration tests.
*   **Build:** Creates a Docker image of the application.
*   **Deployment:** (Staging/Production) Pushes the Docker image to a registry and deploys to a cloud provider (e.g., AWS, GCP, Azure, DigitalOcean).

### 11. Deployment Guide

A detailed guide on deploying this application to a production environment is available in [DEPLOYMENT.md](DEPLOYMENT.md).

### 12. Further Enhancements

*   **Real Payment Gateway Integrations:** Replace `simulatePaymentGateway` with actual SDKs (Stripe, PayPal, Paystack, Flutterwave).
*   **Asynchronous Job Queue:** Implement a message queue (RabbitMQ, Kafka) and workers (BullMQ, Celery) for background tasks like webhook dispatch, reporting, and long-running payment processing.
*   **Advanced Webhook Management:** Add retry logic with exponential backoff, dead-letter queues, and a UI for merchants to manage webhook configurations and view logs.
*   **PCI DSS Compliance:** Crucial for handling actual card data. This example is *not* PCI compliant. Requires tokenization, secure storage, strict network controls, regular audits, etc.
*   **API Key Rotation:** Implement a mechanism for merchants to securely rotate their API keys.
*   **Dashboard UI:** A full-fledged frontend application (React, Angular, Vue) for merchants to view transactions, manage webhooks, and for internal administrators to manage merchants.
*   **Caching Layer:** Integrate Redis for caching frequently accessed data (e.g., merchant configurations).
*   **Monitoring & Alerting:** Integrate with Prometheus/Grafana, ELK stack, or cloud-native monitoring services.
*   **Dispute Management:** Implement a workflow for handling payment disputes (chargebacks).
*   **Refund/Void Policies:** Enforce business rules around partial refunds, max refund amount, and voiding authorized vs. captured transactions.
*   **Multi-currency & Exchange Rates:** Support for more complex currency handling if processing in multiple currencies.

### 13. ALX Principles & Best Practices

Throughout this project, several ALX Software Engineering principles and best practices have been applied:

*   **Modularity:** Breaking down the system into distinct, manageable components (controllers, services, models, middlewares).
*   **Separation of Concerns:** Each module/layer has a single responsibility.
*   **Input Validation:** Using Joi middleware to validate all incoming API requests.
*   **Error Handling:** Centralized error handling middleware and custom `ApiError` class for consistent responses.
*   **Authentication & Authorization:** Secure JWT for internal users and API keys for merchants, with role-based access control.
*   **Database Migrations:** Managing schema changes in a controlled and versioned manner.
*   **Data Integrity:** Enforcing unique constraints, foreign keys, and validation rules at the database and application level.
*   **Password Hashing:** Using `bcrypt` for secure password storage.
*   **Cryptographic Security:** Generating secure API keys and JWTs, with an emphasis on signature verification for webhooks.
*   **Testing:** Comprehensive unit and integration tests to ensure correctness and prevent regressions.
*   **Structured Logging:** Using Winston to provide detailed and organized logs.
*   **Configuration Management:** Centralizing environment-specific settings in `src/config/`.
*   **Asynchronous Programming:** Utilizing async/await for non-blocking I/O operations and `setImmediate` for decoupled event dispatch.
*   **Idempotency:** Implementing a mechanism to ensure API calls can be safely retried without unintended side effects.
*   **State Machine Management:** Explicitly handling transaction status transitions to maintain business logic correctness.
*   **Pagination & Filtering:** Efficient data retrieval for large datasets.
*   **Containerization:** Using Docker for consistent development and deployment environments.
*   **Scalability Considerations:** Designing services to be stateless (where possible) and considering asynchronous patterns.

### 14. License

This project is licensed under the MIT License. See the `LICENSE` file for details.
```