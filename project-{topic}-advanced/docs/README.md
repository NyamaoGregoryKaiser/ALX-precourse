# Project Management API (PMApi)

A comprehensive, production-ready API development system for managing projects and tasks. This system is built using Node.js (Express.js), PostgreSQL, and integrates various enterprise-grade features. A minimal React frontend is included to demonstrate API consumption.

## Table of Contents

1.  [Features](#features)
2.  [Technologies Used](#technologies-used)
3.  [Project Structure](#project-structure)
4.  [Setup Instructions](#setup-instructions)
    *   [Prerequisites](#prerequisites)
    *   [Local Development with Docker Compose](#local-development-with-docker-compose)
    *   [Backend Setup (Manual)](#backend-setup-manual)
    *   [Frontend Setup (Manual)](#frontend-setup-manual)
5.  [Running the Application](#running-the-application)
6.  [Database Management](#database-management)
7.  [Testing](#testing)
    *   [Backend Tests](#backend-tests)
    *   [Performance Tests](#performance-tests)
8.  [API Documentation](#api-documentation)
9.  [Architecture Documentation](#architecture-documentation)
10. [Deployment Guide](#deployment-guide)
11. [License](#license)

---

## 1. Features

*   **User Management:** Register, Login, User CRUD (Admin only).
*   **Authentication:** JWT-based (Access & Refresh tokens) with Redis for refresh token management.
*   **Authorization:** Role-Based Access Control (RBAC) - `user` and `admin` roles.
*   **Project Management:** CRUD operations for projects, associated with users.
*   **Task Management:** CRUD operations for tasks, associated with projects and assigned to users.
*   **Data Validation:** Joi for robust input validation.
*   **Error Handling:** Centralized, intelligent error handling middleware.
*   **Logging:** Winston for structured logging (console, file).
*   **Caching:** Redis for frequently accessed data (e.g., individual project/task details).
*   **Rate Limiting:** Protects API endpoints from abuse.
*   **Database:** PostgreSQL with Sequelize ORM for migrations and data management.
*   **Containerization:** Docker and Docker Compose for easy setup and consistent environments.
*   **CI/CD:** GitHub Actions pipeline for automated testing, building, and deployment.
*   **Testing:** Unit, Integration, API, and Performance tests.
*   **Comprehensive Documentation:** README, API Docs, Architecture, Deployment.

## 2. Technologies Used

*   **Backend:**
    *   Node.js
    *   Express.js
    *   Sequelize ORM
    *   PostgreSQL
    *   Redis
    *   JWT (jsonwebtoken)
    *   Bcrypt (bcryptjs)
    *   Joi (for validation)
    *   Winston (for logging)
    *   Express-rate-limit
    *   Helmet, XSS-clean, Compression, CORS
*   **Frontend:**
    *   React.js
    *   Axios (for API calls)
    *   React Router (for navigation)
*   **Development & Operations:**
    *   Docker, Docker Compose
    *   GitHub Actions
    *   Jest (for testing)
    *   Supertest (for API testing)
    *   K6 (for performance testing)
    *   ESLint (for code quality)
    *   Nodemon (for dev hot-reloads)

## 3. Project Structure

```
project-management-api/
├── backend/                  # Node.js Express API
│   ├── src/
│   │   ├── app.js            # Express app setup
│   │   ├── server.js         # Entry point, DB/Redis connection
│   │   ├── config/           # Environment, DB, Logger, Redis configurations
│   │   ├── db/               # Sequelize models, migrations, seeders
│   │   ├── middleware/       # Auth, error, logger, rate limiting middleware
│   │   ├── routes/           # API routes definitions
│   │   ├── controllers/      # Request handlers, orchestrate service calls
│   │   ├── services/         # Business logic, interact with models/DB
│   │   ├── utils/            # Helper functions (JWT, error classes, pick)
│   │   ├── tests/            # Unit, Integration, API tests
│   │   └── validators/       # Joi validation schemas for requests
│   ├── .env.example          # Environment variables template
│   ├── package.json          # Backend dependencies and scripts
│   ├── Dockerfile            # Dockerfile for backend service
│   └── .sequelizerc          # Sequelize CLI configuration
├── frontend/                 # React.js client application
│   ├── public/               # Static assets, index.html
│   ├── src/
│   │   ├── api/              # Axios client with interceptors
│   │   ├── components/       # Reusable React components
│   │   ├── pages/            # Page-level React components
│   │   └── App.js            # Main React app component
│   ├── package.json          # Frontend dependencies and scripts
│   ├── Dockerfile            # Dockerfile for frontend (Nginx serves build)
│   └── nginx.conf            # Nginx configuration for serving frontend and proxying API
├── docker-compose.yml        # Orchestrates all services (backend, db, redis, frontend)
├── .github/                  # GitHub Actions CI/CD workflows
│   └── workflows/
│       └── ci-cd.yml
├── k6/                       # Performance testing scripts
│   ├── performance-test.js
│   └── users.json            # Test user data for K6
└── docs/                     # Project documentation
    ├── README.md             # This file
    ├── API_DOCUMENTATION.md
    ├── ARCHITECTURE_DOCUMENTATION.md
    └── DEPLOYMENT_GUIDE.md
```

## 4. Setup Instructions

### Prerequisites

*   **Node.js**: v20.x or higher
*   **npm**: v10.x or higher
*   **Docker & Docker Compose**: Latest versions recommended
*   **Git**

### Local Development with Docker Compose (Recommended)

This is the easiest way to get the entire system running.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/project-management-api.git
    cd project-management-api
    ```

2.  **Create `.env` file:**
    Copy the example environment file for the backend:
    ```bash
    cp backend/.env.example backend/.env
    ```
    You can customize the values in `backend/.env`, but the defaults are suitable for local Docker Compose development. Ensure `DB_HOST` is `db` and `REDIS_HOST` is `redis` as defined in `docker-compose.yml`.

3.  **Start the services:**
    From the root `project-management-api` directory:
    ```bash
    docker-compose up -d --build
    ```
    This command will:
    *   Build Docker images for the `backend` and `frontend` services.
    *   Pull official images for `db` (PostgreSQL) and `redis`.
    *   Create and start all four containers (`db`, `redis`, `backend`, `frontend`).
    *   The `backend` container will automatically run `npm install`, `sequelize db:migrate`, and `sequelize db:seed` before starting the Express server.

4.  **Access the application:**
    *   **Frontend:** Open your browser to `http://localhost:80`
    *   **Backend API:** The API is accessible internally by the frontend via `/api/v1` (proxied by Nginx). For direct access (e.g., with Postman/cURL), it runs on `http://localhost:3000`.

5.  **Stop the services:**
    ```bash
    docker-compose down
    ```
    This will stop and remove the containers, networks, and volumes (unless specified otherwise).

### Backend Setup (Manual - if not using Docker Compose)

1.  **Navigate to the backend directory:**
    ```bash
    cd project-management-api/backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    ```bash
    cp .env.example .env
    ```
    Edit `.env` to point to your local PostgreSQL and Redis instances (e.g., `DB_HOST=localhost`).

4.  **Start PostgreSQL and Redis:**
    Ensure you have local instances of PostgreSQL (v15+) and Redis (v7+) running and accessible.

5.  **Run database migrations and seeders:**
    ```bash
    npx sequelize db:migrate
    npx sequelize db:seed:all
    ```

6.  **Start the backend server:**
    ```bash
    npm run dev  # For development with hot-reloads
    # OR
    npm start    # For production mode
    ```
    The API will be available at `http://localhost:3000`.

### Frontend Setup (Manual - if not using Docker Compose)

1.  **Navigate to the frontend directory:**
    ```bash
    cd project-management-api/frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the React development server:**
    ```bash
    npm start
    ```
    The frontend will be available at `http://localhost:3000` (default for Create React App).
    *Note: When running frontend manually, ensure your backend is also running manually on `http://localhost:3000`. The frontend's `axios` client is configured with `/api/v1` which will proxy to the backend if running in dev mode via `create-react-app`'s proxy settings (which would need to be configured in `package.json` for manual setup: `"proxy": "http://localhost:3000"`). For simplicity, the provided Nginx setup in Docker Compose handles this. If running manually without Nginx, adjust `api.baseURL` in `frontend/src/api/client.js` to `http://localhost:3000/api/v1`.*

## 5. Running the Application

After following the Docker Compose setup, the entire application stack will be running.

*   **Frontend UI:** Navigate to `http://localhost`.
    *   **Admin User:** `admin@example.com` / `password123`
    *   **Regular User:** `user@example.com` / `password123`
    *   You can register new users through the UI.
*   **Backend API:**
    *   Swagger/OpenAPI documentation is not dynamically generated for this example, but API endpoints are listed in `API_DOCUMENTATION.md`.
    *   You can use tools like Postman or cURL to interact with `http://localhost:3000/api/v1`.

## 6. Database Management

When running the backend manually or using Docker Compose, Sequelize CLI commands can be used:

*   **Migrate database:**
    ```bash
    cd backend
    npx sequelize db:migrate
    ```
*   **Undo last migration:**
    ```bash
    cd backend
    npx sequelize db:migrate:undo
    ```
*   **Seed initial data:**
    ```bash
    cd backend
    npx sequelize db:seed:all
    ```
*   **Reset (undo all migrations, then migrate and seed):**
    ```bash
    cd backend
    npm run db:reset
    ```
    *Note: For `test` environment, use `npm run db:test:reset` or append `--env test` to sequelize commands.*

## 7. Testing

The project includes comprehensive tests for the backend.

### Backend Tests

Navigate to the `backend` directory.

*   **Run all tests (unit, integration, API) with coverage:**
    ```bash
    npm test
    ```
*   **Run tests in watch mode:**
    ```bash
    npm run test:watch
    ```
*   **Run unit tests only:**
    ```bash
    npm run test:unit
    ```
*   **Run integration tests only:**
    ```bash
    npm run test:integration
    ```
*   **Run API tests only:**
    ```bash
    npm run test:api
    ```
Coverage reports will be generated in `backend/coverage/lcov-report/index.html`. Aim is 80%+ coverage, which the provided tests strive for.

### Performance Tests

Performance tests are written using `k6`.

1.  **Install k6:** Follow instructions on [k6.io](https://k6.io/docs/getting-started/installation/).
2.  **Ensure application is running:** Make sure your `backend` service (via Docker Compose or manually) is running at `http://localhost:3000`.
3.  **Run the performance test:**
    From the root `project-management-api` directory:
    ```bash
    k6 run k6/performance-test.js
    ```
    The test will simulate multiple virtual users performing login, fetching projects, and creating tasks. Results will be displayed in the console, including metrics like request duration, failure rates, and checks pass rates.

## 8. API Documentation

Comprehensive API documentation outlining all endpoints, methods, request bodies, response formats, and authentication requirements.

```