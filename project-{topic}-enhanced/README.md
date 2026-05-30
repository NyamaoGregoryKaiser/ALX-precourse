# Enterprise Task Management System

This project is a full-scale, production-ready Task Management system built with Node.js (Express), React.js, PostgreSQL, and Redis. It focuses heavily on security best practices, comprehensive testing, and enterprise-grade features.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Setup Instructions](#setup-instructions)
    *   [Prerequisites](#prerequisites)
    *   [Environment Variables](#environment-variables)
    *   [Running with Docker Compose (Recommended)](#running-with-docker-compose-recommended)
    *   [Running Backend Locally](#running-backend-locally)
    *   [Running Frontend Locally](#running-frontend-locally)
5.  [Database Management](#database-management)
6.  [Testing](#testing)
7.  [API Documentation](#api-documentation)
8.  [Architecture](#architecture)
9.  [Deployment](#deployment)
10. [Security Considerations](#security-considerations)
11. [Contributing](#contributing)
12. [License](#license)

## 1. Features

*   **User Management**: Register, Login, Logout, Profile management.
*   **Authentication**: JWT-based (Access & Refresh Tokens), secure password hashing.
*   **Authorization**: Role-Based Access Control (RBAC) with `Admin`, `ProjectOwner`, `Member` roles.
*   **Project Management**: Create, view, update, delete projects.
*   **Task Management**: Create, view, update, delete tasks within projects. Assign tasks to users.
*   **Comment System**: Add comments to tasks.
*   **Robust Error Handling**: Centralized error middleware.
*   **Logging & Monitoring**: Structured logging with Winston.
*   **Input Validation**: Joi schemas for all API inputs.
*   **Rate Limiting**: Protection against brute-force attacks and DDoS.
*   **HTTP Security Headers**: Implemented with Helmet.js.
*   **CORS Configuration**: Secure Cross-Origin Resource Sharing.
*   **Caching**: Redis for refresh token invalidation (blacklisting).
*   **Comprehensive Testing**: Unit, Integration, and API tests.
*   **Dockerization**: Containerized applications for consistent environments.
*   **CI/CD Ready**: Example GitLab CI/CD pipeline.

## 2. Technology Stack

**Backend (Node.js)**:
*   **Framework**: Express.js
*   **Database ORM**: Sequelize
*   **Authentication**: JSON Web Tokens (JWT)
*   **Password Hashing**: bcrypt.js
*   **Input Validation**: Joi
*   **Logging**: Winston
*   **Caching**: Redis
*   **Security**: Helmet.js, express-rate-limit, xss-clean
*   **Testing**: Jest, Supertest

**Database**:
*   PostgreSQL

**Cache/Message Broker**:
*   Redis

**Frontend (React.js)**:
*   **Framework**: React (Create React App)
*   **Routing**: React Router DOM
*   **HTTP Client**: Axios
*   **Styling**: Tailwind CSS (implicitly used in provided examples)

**Deployment & Infrastructure**:
*   Docker, Docker Compose
*   GitLab CI/CD (example configuration)

## 3. Project Structure

```
task-management-system/
├── client/                     # React Frontend Application
│   ├── src/                    # React source code
│   └── package.json            # Frontend dependencies
├── server/                     # Node.js Backend Application
│   ├── src/                    # Backend source code
│   │   ├── config/             # Environment, DB, security settings
│   │   ├── middleware/         # Custom Express middleware
│   │   ├── models/             # Sequelize models
│   │   ├── migrations/         # Sequelize migration scripts
│   │   ├── seeders/            # Sequelize seed data scripts
│   │   ├── services/           # Business logic
│   │   ├── controllers/        # Request handlers
│   │   ├── routes/             # API route definitions
│   │   ├── utils/              # Helper utilities
│   │   ├── app.js              # Express app setup
│   │   └── server.js           # Server entry point
│   ├── tests/                  # Backend tests (unit, integration, API)
│   ├── Dockerfile              # Dockerfile for backend
│   └── package.json            # Backend dependencies
├── docker-compose.yml          # Docker Compose for services (backend, DB, Redis, frontend)
├── .env.example                # Example environment variables
├── README.md                   # Project setup and usage instructions
├── .gitlab-ci.yml              # Example CI/CD pipeline configuration
└── docs/                       # Project documentation
    ├── api.md                  # API documentation
    ├── architecture.md         # Architecture documentation
    └── deployment.md           # Deployment guide
```

## 4. Setup Instructions

### Prerequisites

*   Docker & Docker Compose (Recommended for easy setup)
*   Node.js (v18 or higher) and npm (if running locally without Docker)
*   PostgreSQL client (optional, for direct DB access)
*   Git

### Environment Variables

Create a `.env` file in the root of the `task-management-system/` directory based on `.env.example`.

**`.env` example:**

```dotenv
NODE_ENV=development
PORT=5000

# Database Configuration
DB_HOST=db # Use 'localhost' if running backend locally, 'db' for Docker Compose
DB_PORT=5432
DB_USER=user
DB_PASSWORD=password
DB_NAME=task_management_db

# JWT Secret and Expiration Times
JWT_SECRET=super_secret_jwt_key_please_change_this_in_production
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_REFRESH_EXPIRATION_DAYS=7

# Redis Configuration
REDIS_HOST=redis # Use 'localhost' if running backend locally, 'redis' for Docker Compose
REDIS_PORT=6379
REDIS_PASSWORD=

# CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Running with Docker Compose (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-system.git
    cd task-management-system
    ```
2.  **Create `.env` file:** Copy `.env.example` to `.env` in the root directory and fill in the values.
3.  **Build and run containers:**
    ```bash
    docker-compose up --build -d
    ```
    This will:
    *   Build Docker images for the backend (`server/`) and frontend (`client/`).
    *   Start PostgreSQL, Redis, backend, and frontend containers.
    *   The backend will be accessible on `http://localhost:5000`.
    *   The frontend will be accessible on `http://localhost:3000`.
4.  **Run Database Migrations and Seeders:**
    Once the `db` service is healthy, you need to run migrations and seed initial data.
    ```bash
    docker-compose exec backend npm run migrate
    docker-compose exec backend npm run seed
    ```
    (Note: The `db:reset` command in `package.json` can be used for development, but `migrate` and `seed` are safer for CI/CD or production.)

    **Default Admin User (seeded):**
    *   **Email**: `admin@example.com`
    *   **Password**: `Admin@123`
    (Change this immediately in a production environment!)

5.  **Stop containers:**
    ```bash
    docker-compose down
    ```

### Running Backend Locally (without Docker Compose for Backend)

1.  **Navigate to the backend directory:**
    ```bash
    cd task-management-system/server
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Ensure PostgreSQL and Redis are running:**
    You can use Docker Compose to just run the `db` and `redis` services:
    ```bash
    docker-compose up db redis -d
    ```
    *Make sure to update `DB_HOST` to `localhost` and `REDIS_HOST` to `localhost` in your `server/.env` file if not using the full docker-compose.*
4.  **Run migrations and seeders:**
    ```bash
    npm run migrate
    npm run seed
    ```
5.  **Start the backend server:**
    ```bash
    npm run dev  # For development with nodemon
    # or
    npm start    # For production mode
    ```
    The backend will run on `http://localhost:5000`.

### Running Frontend Locally (without Docker Compose for Frontend)

1.  **Navigate to the frontend directory:**
    ```bash
    cd task-management-system/client
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Start the React development server:**
    ```bash
    npm start
    ```
    The frontend will run on `http://localhost:3000`. It is configured to proxy API requests to `http://localhost:5000`.

## 5. Database Management

The backend uses `sequelize-cli` for database migrations and seeding.

*   **Run migrations:** `npm run migrate` (from `server/` directory)
*   **Undo last migration:** `npm run migrate:undo`
*   **Seed data:** `npm run seed`
*   **Reset database (development only):** `npm run db:reset` (Drops all tables, recreates them via migrations, then seeds data). **Use with extreme caution in non-development environments.**

## 6. Testing

Tests are written using Jest and Supertest.

1.  **Ensure test database setup:** The `server/tests/setup.js` file handles dropping and recreating a dedicated test database (`task_management_db_test`) before tests run, and connects to Redis.
2.  **Run all tests (from `server/` directory):**
    ```bash
    npm test
    ```
    This command will run unit, integration, and API tests, and generate a coverage report. Aiming for 80%+ coverage.

**Test Types:**
*   **Unit Tests**: Located in `server/tests/unit/`, these test individual functions/modules (e.g., `user.service.js` functions) in isolation.
*   **Integration Tests**: Located in `server/tests/integration/`, these test the interaction between different layers (e.g., controllers interacting with services and models).
*   **API Tests**: Located in `server/tests/integration/` (often combined with integration tests), these use `Supertest` to make actual HTTP requests to the Express app and assert on responses.
*   **Performance Tests**: A conceptual K6 script (`k6/login_performance.js`) is provided for demonstrating performance testing. These are typically run in a separate environment against a deployed application, not as part of the standard `npm test`.

## 7. API Documentation

Comprehensive API documentation is crucial for enterprise applications. This project is structured to be compatible with OpenAPI/Swagger.

A conceptual API documentation example can be found in `docs/api.md`. In a real-world scenario, you would integrate a tool like `swagger-jsdoc` and `swagger-ui-express` to generate interactive documentation directly from your route definitions and Joi schemas.

**Example Endpoint Documented:**

```markdown