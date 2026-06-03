```markdown
# Mobile Task Manager Backend

This is a comprehensive, production-ready backend system for a mobile task management application. It's built with Node.js, Express, TypeScript, and Prisma (for PostgreSQL), incorporating enterprise-grade features and best practices for scalability, security, and maintainability.

---

## Table of Contents

1.  [Features](#features)
2.  [Project Structure](#project-structure)
3.  [Technologies Used](#technologies-used)
4.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup](#local-development-setup)
    *   [Running with Docker Compose](#running-with-docker-compose)
    *   [Running Migrations & Seeding](#running-migrations--seeding)
    *   [Running Tests](#running-tests)
5.  [API Endpoints](#api-endpoints)
6.  [Architecture](#architecture)
7.  [Deployment](#deployment)
8.  [CI/CD](#cicd)
9.  [Testing Strategy](#testing-strategy)
10. [Additional Features](#additional-features)
11. [Contributing](#contributing)
12. [License](#license)

---

## 1. Features

*   **User Management:**
    *   User Registration & Login (JWT-based authentication)
    *   User Profile Management (view, update, delete own account)
*   **Task Management:**
    *   Create, Read (single, all, filtered), Update, Delete tasks
    *   Tasks can have a title, description, due date, status, and category.
    *   Filtering, sorting, and pagination for tasks.
*   **Category Management:**
    *   Create, Read (single, all), Update, Delete categories.
    *   Categories are user-specific.
*   **Authentication & Authorization:** JWT-based access tokens with refresh token concept (cookie-based). Role-based authorization (basic "user" role).
*   **Database:** PostgreSQL with Prisma ORM for type-safe database interactions and migrations.
*   **Caching:** Redis integration for frequently accessed data (e.g., user profiles, categories).
*   **Logging:** Structured logging with Winston.
*   **Error Handling:** Centralized, robust error handling with custom error classes.
*   **Validation:** Request payload validation using Zod.
*   **Security:** Helmet for common security headers, `express-rate-limit` for API rate limiting.
*   **Containerization:** Docker support for easy setup and deployment.
*   **Testing:** Comprehensive unit, integration, and end-to-end tests with Jest (aiming for 80%+ coverage).
*   **CI/CD:** GitHub Actions workflow for automated testing and building.
*   **Documentation:** Extensive README, API docs, Architecture docs, Deployment guide.

## 2. Project Structure

```
.
├── src/                      # Source code
│   ├── config/               # Environment variables, constants
│   ├── database/             # Prisma client setup
│   ├── middleware/           # Auth, error handling, logging, rate limiting, validation
│   ├── modules/              # Feature modules (auth, categories, tasks, users)
│   │   ├── auth/             # Authentication logic (register, login)
│   │   ├── categories/       # Task categories management
│   │   ├── tasks/            # Task management
│   │   └── users/            # User management
│   ├── utils/                # Helper functions (e.g., jwt, bcrypt, redis, custom errors, logger)
│   ├── app.ts                # Express app setup, middleware, global error handler
│   └── server.ts             # Server startup, database connection
├── tests/                    # Test files (unit, integration, e2e)
│   ├── unit/                 # Unit tests for services, utils
│   ├── integration/          # Integration tests for repositories
│   └── e2e/                  # End-to-End tests for API endpoints
├── prisma/                   # Prisma schema, migrations, seed script
├── .env.example              # Example environment variables
├── Dockerfile                # Docker image for the backend
├── docker-compose.yml        # Docker setup for backend, PostgreSQL, Redis
├── docker-compose.test.yml   # Separate Docker setup for testing database
├── jest.config.ts            # Jest test configuration
├── tsconfig.json             # TypeScript configuration
├── package.json              # Project dependencies and scripts
├── README.md                 # This file
├── .github/                  # GitHub Actions CI/CD workflows
├── docs/                     # Additional documentation (API, Architecture, Deployment)
└── load-test.js              # Conceptual K6 performance test script
```

## 3. Technologies Used

*   **Backend:** Node.js, Express.js
*   **Language:** TypeScript
*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **Authentication:** JWT (JSON Web Tokens), Bcrypt.js
*   **Caching:** Redis
*   **Logging:** Winston
*   **Validation:** Zod
*   **Testing:** Jest, Supertest
*   **Containerization:** Docker
*   **CI/CD:** GitHub Actions
*   **Other:** ESLint, Prettier, Dotenv, Helmet, CORS, Morgan, Express-rate-limit

## 4. Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js** (v18.x or higher) & **npm** (v8.x or higher)
*   **Docker** & **Docker Compose** (recommended for easy environment setup)
*   **PostgreSQL** (if not using Docker)
*   **Redis** (if not using Docker)

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-manager-backend.git
    cd task-manager-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure environment variables:**
    *   Copy the `.env.example` file to `.env`:
        ```bash
        cp .env.example .env
        ```
    *   Open `.env` and fill in the values.
        *   `DATABASE_URL`: Ensure this points to your PostgreSQL database.
            *   For local (non-Docker) PostgreSQL: `postgresql://user:password@localhost:5432/taskdb?schema=public`
            *   For Docker Compose: `postgresql://user:password@db:5432/taskdb?schema=public`
        *   `JWT_SECRET` and `REFRESH_TOKEN_SECRET`: Generate strong, random strings for these.
        *   `REDIS_URL`: `redis://localhost:6379` (or `redis://redis:6379` for Docker)

### Running with Docker Compose (Recommended)

This sets up PostgreSQL, Redis, and the Node.js application in isolated containers.

1.  **Build and run the services:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build the Docker image for the backend.
    *   Start PostgreSQL and Redis containers.
    *   Start the backend application container.
    *   The `-d` flag runs them in detached mode.

2.  **Run migrations and seed data (inside the app container):**
    ```bash
    docker-compose exec app npm run prisma:migrate-dev
    docker-compose exec app npm run prisma:seed
    ```
    (Note: `npm run dev` in `docker-compose.yml` automatically rebuilds on code changes if `volumes` are configured, but migrations/seeding needs to be run explicitly).

3.  **Access the application:**
    The API will be running on `http://localhost:5000`.

4.  **Stop services:**
    ```bash
    docker-compose down
    ```

### Running Migrations & Seeding (outside Docker, if applicable)

After setting up your `.env` and ensuring your PostgreSQL database is running:

1.  **Generate Prisma Client and apply migrations:**
    ```bash
    npx prisma migrate dev --name init
    # If you get errors about database not existing, create it manually first:
    # `createdb taskdb` for default local postgres
    ```
    This command creates the database schema based on `prisma/schema.prisma`.

2.  **Seed the database with initial data:**
    ```bash
    npm run prisma:seed
    ```

### Running the Application

1.  **Build the TypeScript code:**
    ```bash
    npm run build
    ```

2.  **Start the server:**
    ```bash
    npm start
    ```
    The API will be running on `http://localhost:5000`.

3.  **For development with hot-reloading:**
    ```bash
    npm run dev
    ```

### Running Tests

Ensure you have a test database configured in `.env` (or `docker-compose.test.yml` for CI/CD).
The `tests/setup.ts` script handles database resets and seeding for tests.

1.  **Run all tests (unit, integration, e2e) with coverage:**
    ```bash
    npm test
    ```

2.  **Run specific test types:**
    *   **Unit tests:** `jest tests/unit`
    *   **Integration tests:** `jest tests/integration`
    *   **End-to-end (API) tests:** `npm run test:e2e`

3.  **Watch mode:**
    ```bash
    npm run test:watch
    ```

## 5. API Endpoints

The API base URL is `/api/v1`.

### Authentication (`/api/v1/auth`)

*   `POST /register`: Register a new user.
    *   **Body:** `{ name, email, password }`
    *   **Response:** `201 CREATED` with user data and access token.
*   `POST /login`: Log in an existing user.
    *   **Body:** `{ email, password }`
    *   **Response:** `200 OK` with user data and access token (refresh token in HttpOnly cookie).
*   `POST /logout`: Log out the current user.
    *   **Response:** `200 OK` (clears refresh token cookie).

### User Profile (`/api/v1/users`)

*   `GET /me`: Get current authenticated user's profile.
    *   **Auth:** Required (Bearer Token)
    *   **Response:** `200 OK` with user data.
*   `PATCH /me`: Update current authenticated user's profile.
    *   **Auth:** Required
    *   **Body:** `{ name?, email?, password? }` (partial update)
    *   **Response:** `200 OK` with updated user data.
*   `DELETE /me`: Delete current authenticated user's account.
    *   **Auth:** Required
    *   **Response:** `204 NO CONTENT`.

### Categories (`/api/v1/categories`)

*   `POST /`: Create a new category for the authenticated user.
    *   **Auth:** Required
    *   **Body:** `{ name }`
    *   **Response:** `201 CREATED` with new category data.
*   `GET /`: Get all categories for the authenticated user.
    *   **Auth:** Required
    *   **Response:** `200 OK` with a list of categories.
*   `GET /:id`: Get a specific category by ID for the authenticated user.
    *   **Auth:** Required
    *   **Response:** `200 OK` with category data.
*   `PATCH /:id`: Update a specific category by ID for the authenticated user.
    *   **Auth:** Required
    *   **Body:** `{ name }`
    *   **Response:** `200 OK` with updated category data.
*   `DELETE /:id`: Delete a specific category by ID for the authenticated user.
    *   **Auth:** Required
    *   **Response:** `204 NO CONTENT`.

### Tasks (`/api/v1/tasks`)

*   `POST /`: Create a new task for the authenticated user.
    *   **Auth:** Required
    *   **Body:** `{ title, description?, dueDate?, categoryId?, status? }`
    *   **Response:** `201 CREATED` with new task data.
*   `GET /`: Get all tasks for the authenticated user.
    *   **Auth:** Required
    *   **Query Params:** `status`, `categoryId`, `search`, `sortBy`, `sortOrder`, `page`, `limit`
    *   **Response:** `200 OK` with a list of tasks.
*   `GET /:id`: Get a specific task by ID for the authenticated user.
    *   **Auth:** Required
    *   **Response:** `200 OK` with task data.
*   `PATCH /:id`: Update a specific task by ID for the authenticated user.
    *   **Auth:** Required
    *   **Body:** `{ title?, description?, dueDate?, categoryId?, status? }` (partial update)
    *   **Response:** `200 OK` with updated task data.
*   `DELETE /:id`: Delete a specific task by ID for the authenticated user.
    *   **Auth:** Required
    *   **Response:** `204 NO CONTENT`.

For detailed API documentation, including request/response examples and error codes, refer to the [API Documentation](#api-documentation) section.

## 6. Architecture

Refer to the [Architecture Documentation](#architecture-documentation) for a detailed overview.

## 7. Deployment

Refer to the [Deployment Guide](#deployment-guide) for instructions on deploying to various cloud providers.

## 8. CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that automatically:

1.  **Lints** the TypeScript code.
2.  **Builds** the TypeScript project.
3.  **Runs all tests** (unit, integration, E2E) against a dedicated test database (PostgreSQL and Redis services spun up by GitHub Actions).
4.  Reports **code coverage**.

Upon successful completion on the `main` branch, it can be extended to include deployment steps to your chosen cloud provider.

## 9. Testing Strategy

*   **Unit Tests:** Focus on individual functions or methods (e.g., utility functions, service methods mocking repository calls). Mocks are heavily used to isolate the unit under test.
*   **Integration Tests:** Verify the interaction between different components (e.g., service interacting with a real repository, or repository interacting with the actual database). A dedicated test database (`docker-compose.test.yml`) is used to ensure isolation and a clean state for each test run.
*   **End-to-End (E2E) / API Tests:** Use `supertest` to make HTTP requests to the running Express application, testing full request-response cycles, including middleware, routing, controllers, services, and database interactions. These tests validate the API contract.
*   **Performance Tests:** Conceptual load testing with `k6` to identify performance bottlenecks and ensure the API can handle anticipated traffic.

**Coverage:** The goal is to achieve 80%+ code coverage for critical business logic.

## 10. Additional Features

*   **Authentication/Authorization:** Implemented with JWT for stateless authentication. Refresh tokens are used for prolonged sessions. Middleware for role-based access control is provided.
*   **Logging and Monitoring:** Structured logging with Winston. HTTP request logging via Morgan, and custom detailed request logging for all incoming requests, including user ID and response time.
*   **Error Handling Middleware:** A global error handling middleware catches all `AppError` instances and other unexpected errors, providing consistent and informative error responses without leaking sensitive details in production.
*   **Caching Layer:** Redis integration for caching frequently accessed data (e.g., category lists, user profiles, specific tasks) to reduce database load and improve response times. Cache invalidation strategies are implemented on create/update/delete operations.
*   **Rate Limiting:** `express-rate-limit` middleware is used to protect against brute-force attacks and resource exhaustion by limiting the number of requests from a single IP address within a specified time window. Separate rate limits for general API and authentication endpoints.

## 11. Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes.
4.  Write tests for your changes.
5.  Ensure all tests pass (`npm test`).
6.  Ensure code style is consistent (`npm run lint:fix`).
7.  Commit your changes (`git commit -m 'feat: Add new feature'`).
8.  Push to the branch (`git push origin feature/your-feature`).
9.  Open a Pull Request.

## 12. License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

```

**API Documentation (OpenAPI/Swagger Style - Markdown)**