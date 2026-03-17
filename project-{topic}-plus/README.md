```markdown
# Enterprise-Grade Product Management System

This project provides a comprehensive, production-ready API development system for managing products and users. It features a robust Node.js/Express backend with a PostgreSQL database, a React.js frontend, and includes essential enterprise-grade features like authentication, authorization, caching, logging, and extensive testing, all containerized with Docker and configured for CI/CD.

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Architecture](#architecture)
3.  [Features](#features)
4.  [Technology Stack](#technology-stack)
5.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Environment Variables](#environment-variables)
    *   [Running with Docker Compose (Recommended)](#running-with-docker-compose-recommended)
    *   [Running Backend Locally](#running-backend-locally)
    *   [Running Frontend Locally](#running-frontend-locally)
6.  [Database Management](#database-management)
7.  [API Documentation](#api-documentation)
8.  [Testing](#testing)
    *   [Backend Tests](#backend-tests)
    *   [Frontend Tests](#frontend-tests)
    *   [Performance Tests](#performance-tests)
9.  [CI/CD Pipeline](#ci/cd-pipeline)
10. [Deployment Guide](#deployment-guide)
11. [ALX Software Engineering Principles](#alx-software-engineering-principles)
12. [License](#license)

---

## 1. Project Overview

This system allows users to:
*   **Register** and **Log in** to access protected resources.
*   Manage **products** (create, read, update, delete).
*   **Admins** have additional privileges, such as managing all users and products.

It is built with modularity and scalability in mind, adhering to modern software engineering best practices.

## 2. Architecture

The system follows a typical **Client-Server Architecture** with a **Monorepo-like structure** (though implemented as separate `backend` and `frontend` folders for clarity) and a **Layered Architecture** within the backend.

```
+-----------------+      +-----------------+      +----------------+
|     Frontend    | <--> |      Nginx      | <--> |     Backend    |
| (React.js SPA)  |      |  (Reverse Proxy)|      | (Node.js/Express)|
+-----------------+      +-----------------+      |   +-----------+  |
       ^                                           |   |Controller |  |
       |                                           |   +-----------+  |
       |             HTTP/HTTPS                    |         |        |
       v                                           |   +-----------+  |
+--------------------------------------------------+-->|  Service  |<--+
|                  Internet / Network              |   +-----------+  |
+--------------------------------------------------+         |        |
                                                     |   +-----------+  |
                                                     |   |   ORM     |  |
                                                     |   |(Sequelize)|  |
                                                     |   +-----------+  |
                                                     |         |        |
                                                     |   +-----------+  |
                                                     +-->| PostgreSQL|<-+
                                                         +-----------+
                                                               ^
                                                               |
                                                          +----------+
                                                          |  Redis   |
                                                          |  (Cache) |
                                                          +----------+
```

**Backend Layers:**
*   **`config`**: Manages environment variables and application-wide settings.
*   **`database`**: Contains Sequelize models, migrations, and database connection logic.
*   **`middlewares`**: Express middleware for authentication, authorization, error handling, rate limiting, caching, and request validation.
*   **`utils`**: Helper functions for logging, custom error classes, JWT operations, and asynchronous handler wrapping.
*   **`validators`**: Joi schemas for request input validation.
*   **`services`**: Encapsulates business logic and interacts with the database (via models).
*   **`controllers`**: Handles incoming HTTP requests, calls appropriate services, and sends responses.
*   **`routes`**: Defines API endpoints and maps them to controllers and middlewares.

## 3. Features

**Core Application:**
*   **Backend (Node.js/Express):**
    *   RESTful API endpoints for `Users` and `Products`.
    *   Full CRUD operations (Create, Read, Update, Delete) for both resources.
    *   Modular structure (controllers, services, models, routes).
    *   Data processing for product creation/updates and user registration/login.
*   **Frontend (React.js):**
    *   User-friendly interface for interacting with the API.
    *   Pages for Login, Register, Product Listing, Product Detail, Product Form (add/edit), User Management (Admin).
    *   Client-side routing with `react-router-dom`.
    *   Basic state management using React Context API for authentication.

**Database Layer (PostgreSQL with Sequelize ORM):**
*   **Schema Definitions:** `User` and `Product` models with relationships.
*   **Migration Scripts:** Manages database schema changes (`sequelize-cli`).
*   **Seed Data:** Populates initial users (admin, regular user) and products.
*   **Query Optimization:** Basic indexing on frequently queried columns (e.g., `email`, `username`, `category`, `price`).
*   **Soft Deletes:** `paranoid` mode for `User` and `Product` models to retain data history.

**Configuration & Setup:**
*   `package.json` for both backend and frontend, listing all dependencies.
*   `.env` for environment-specific configurations.
*   **Docker Setup:** `Dockerfile` for backend and frontend, `docker-compose.yml` for orchestrating backend, frontend, PostgreSQL, and Redis.
*   **CI/CD Pipeline:** GitHub Actions workflow (`.github/workflows/ci.yml`) for automated testing and Docker image builds.

**Testing & Quality:**
*   **Unit Tests:** Jest for isolated testing of `services` and `utils`.
*   **Integration Tests:** Jest and Supertest for testing `controllers` and their interaction with `services`/database.
*   **API Tests:** Supertest for testing HTTP endpoints, including authorization and validation.
*   **Performance Tests:** Conceptual example using `k6`.
*   **Code Coverage:** Jest configured to report coverage (aiming for 70%+).

**Additional Features:**
*   **Authentication:** JSON Web Tokens (JWT) for secure user authentication.
*   **Authorization:** Role-Based Access Control (RBAC) - `user` and `admin` roles, enforced via middleware.
*   **Logging and Monitoring:** Winston for structured logging (console, file-based).
*   **Error Handling Middleware:** Centralized error handling with custom `AppError` class for operational errors.
*   **Caching Layer:** Redis integration for caching product list/detail responses, improving read performance.
*   **Rate Limiting:** `express-rate-limit` middleware to protect against brute-force attacks and abuse.

## 4. Technology Stack

*   **Backend:**
    *   Node.js (Runtime)
    *   Express.js (Web Framework)
    *   PostgreSQL (Database)
    *   Sequelize (ORM)
    *   Redis (Caching)
    *   JWT (Authentication)
    *   Bcrypt.js (Password Hashing)
    *   Joi (Validation)
    *   Winston (Logging)
    *   Express-rate-limit (Rate Limiting)
    *   Supertest, Jest (Testing)
    *   Swagger-JSdoc, Swagger-UI-Express (API Documentation)
    *   Cors, Dotenv, Morgan (Utilities)
*   **Frontend:**
    *   React.js (JavaScript Library for UI)
    *   React Router DOM (Routing)
    *   Axios (HTTP Client)
    *   React Testing Library, Jest (Testing)
*   **DevOps/Tooling:**
    *   Docker, Docker Compose (Containerization)
    *   GitHub Actions (CI/CD)
    *   Nginx (Frontend Serving, Reverse Proxy)

## 5. Setup and Installation

### Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/en/download/) (v18 or higher)
*   [npm](https://www.npmjs.com/get-npm) (usually comes with Node.js)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Engine and Docker Compose)
*   (Optional, for local development without Docker) [PostgreSQL](https://www.postgresql.org/download/) and [Redis](https://redis.io/download/)

### Environment Variables

Each part of the application (backend, frontend) requires environment variables. Create `.env` files based on the provided `.env.example` files.

#### `backend/.env`
```dotenv
# Application
NODE_ENV=development
PORT=5000
APP_SECRET=your_app_secret_here

# Database (PostgreSQL)
DB_HOST=localhost # Use 'db' if running via docker-compose
DB_PORT=5432
DB_USER=pguser
DB_PASSWORD=pgpassword
DB_NAME=product_management_db

# JWT Configuration
JWT_SECRET=super_secret_jwt_key
JWT_ACCESS_TOKEN_EXPIRATION=1h
JWT_REFRESH_TOKEN_EXPIRATION=7d

# Redis Configuration
REDIS_HOST=localhost # Use 'redis' if running via docker-compose
REDIS_PORT=6379
REDIS_CACHE_TTL=3600 # Cache time-to-live in seconds (1 hour)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000 # 1 minute
RATE_LIMIT_MAX_REQUESTS=100 # Max 100 requests per minute per IP
```

#### `frontend/.env`
```dotenv
REACT_APP_API_BASE_URL=http://localhost:5000/api/v1
# In a Dockerized environment with Nginx proxy, this might be `/api/v1` (relative path)
# or `http://localhost:5000/api/v1` if accessing backend directly from frontend.
# The provided `nginx.conf` sets up a proxy from `/api/v1/` to `http://backend:5000/api/v1/`
# so in Docker, if served by Nginx, you would use REACT_APP_API_BASE_URL=/api/v1
# but for local dev, `http://localhost:5000/api/v1` is correct.
```

#### `backend/.env.test` (for testing only)
```dotenv
NODE_ENV=test
PORT=5001 # Use a different port for tests

DB_HOST=localhost
DB_PORT=5432
DB_USER=pguser_test
DB_PASSWORD=pgpassword_test
DB_NAME=product_management_test_db

JWT_SECRET=test_jwt_secret
JWT_ACCESS_TOKEN_EXPIRATION=10m
JWT_REFRESH_TOKEN_EXPIRATION=30m

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_CACHE_TTL=10
```

### Running with Docker Compose (Recommended)

This is the easiest way to get the entire application stack running.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your_username/product-management.git
    cd product-management
    ```
2.  **Create `.env` files:**
    Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`. Fill in the values.
    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    # Edit these .env files with your desired configurations
    ```
    For `DB_HOST` in `backend/.env`, set it to `db`. For `REDIS_HOST`, set it to `redis`.
    For `REACT_APP_API_BASE_URL` in `frontend/.env`, set it to `/api/v1` if you want Nginx to proxy, or `http://localhost:5000/api/v1` if you want frontend to directly hit exposed backend port. The provided `nginx.conf` proxies `/api/v1` to the backend service. So `/api/v1` would be ideal in the dockerized setup for frontend.

3.  **Build and run the services:**
    ```bash
    docker-compose up --build
    ```
    This command will:
    *   Build Docker images for the backend and frontend.
    *   Start PostgreSQL and Redis containers.
    *   Run database migrations and seeders for the backend (configured in `docker-compose.yml`).
    *   Start the backend API server.
    *   Start the frontend application (served by Nginx).

4.  **Access the application:**
    *   **Frontend:** `http://localhost:3000` (or whichever port you exposed for frontend in `docker-compose.yml`)
    *   **Backend API:** `http://localhost:5000/api/v1` (or your chosen `PORT` for backend)
    *   **API Documentation (Swagger):** `http://localhost:5000/api-docs`

### Running Backend Locally (without Docker for backend)

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Ensure PostgreSQL and Redis are running locally.**
    Make sure your `backend/.env` points `DB_HOST` to `localhost` and `REDIS_HOST` to `localhost`.
4.  **Create database, run migrations and seeders:**
    ```bash
    npm run db:create
    npm run db:migrate
    npm run db:seed
    ```
    (Note: If running against a clean DB for the first time or after `db:drop`, use `npm run db:reset`).
5.  **Start the backend server:**
    ```bash
    npm run dev # for development with nodemon
    # or
    npm start   # for production mode
    ```
    The API will be available at `http://localhost:5000/api/v1` (or your configured port).

### Running Frontend Locally (without Docker for frontend)

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Ensure your backend API is running.**
    Make sure your `frontend/.env` points `REACT_APP_API_BASE_URL` to the correct backend URL (e.g., `http://localhost:5000/api/v1`).
4.  **Start the frontend development server:**
    ```bash
    npm start
    ```
    The frontend application will typically open in your browser at `http://localhost:3000`.

## 6. Database Management

The backend uses `sequelize-cli` for database migrations and seeding.

*   **Create a new migration:**
    ```bash
    npx sequelize-cli migration:generate --name your-migration-name
    ```
*   **Run migrations:**
    ```bash
    npm run db:migrate
    ```
*   **Undo last migration:**
    ```bash
    npm run db:migrate:undo
    ```
*   **Generate a new seeder:**
    ```bash
    npx sequelize-cli seed:generate --name your-seeder-name
    ```
*   **Run all seeders:**
    ```bash
    npm run db:seed
    ```
*   **Drop database (DANGER: Deletes all data):**
    ```bash
    npm run db:drop
    ```
*   **Create database:**
    ```bash
    npm run db:create
    ```
*   **Reset database (Drop, Create, Migrate, Seed):**
    ```bash
    npm run db:reset
    ```

## 7. API Documentation

The backend API is documented using Swagger/OpenAPI.

*   Once the backend server is running (either locally or via Docker Compose), navigate to:
    `http://localhost:5000/api-docs` (replace `5000` if you changed the `PORT`).
*   This interactive documentation allows you to explore endpoints, their request/response schemas, and even test them directly from the browser.

## 8. Testing

The project includes comprehensive tests for both backend and frontend.

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
*   **Coverage Reports:** After running `npm test`, a `coverage/` directory will be generated with detailed HTML reports. Open `coverage/lcov-report/index.html` in your browser.

### Frontend Tests

Navigate to the `frontend` directory.

*   **Run all tests with coverage:**
    ```bash
    npm test -- --coverage
    ```
*   **Run tests in watch mode (interactive):**
    ```bash
    npm test
    ```

### Performance Tests

A conceptual `k6` performance test script is provided (`performance_test.js`) in the root directory. To run it:

1.  **Install k6:** Follow instructions on [k6.io](https://k6.io/docs/getting-started/installation/).
2.  **Run the script:**
    ```bash
    k6 run performance_test.js
    ```
    (You might need to adjust the API endpoint in `performance_test.js` to match your running backend.)

## 9. CI/CD Pipeline

The project is configured with a basic CI/CD pipeline using GitHub Actions (`.github/workflows/ci.yml`).

The pipeline typically includes steps for:
1.  **Trigger:** On push to `main` branch or pull requests.
2.  **Checkout Code:** Retrieves the repository code.
3.  **Setup Node.js:** Installs the required Node.js version.
4.  **Install Dependencies:** `npm install` for both backend and frontend.
5.  **Run Tests:** Executes backend and frontend tests.
6.  **Build Docker Images:** Builds the backend and frontend Docker images.
7.  **Push Docker Images:** Pushes the images to a container registry (e.g., Docker Hub, GitHub Container Registry - *this part is commented out in the example and would need configuration for production*).

This ensures that all code changes are automatically tested and buildable before potential deployment.

## 10. Deployment Guide

The Docker Compose setup provides a good foundation for deployment.

1.  **Prepare Production `.env` files:**
    Create `backend/.env.production` and `frontend/.env.production`. These should contain production-ready values (e.g., secure JWT secrets, production database credentials, public API URLs, etc.).
    When running `docker-compose up` with `NODE_ENV=production`, it will pick up these specific env files.
2.  **Build Production Images:**
    Ensure `NODE_ENV=production` is set when building images (the `Dockerfile` already has `ENV NODE_ENV=production`).
    ```bash
    docker-compose -f docker-compose.yml build
    ```
3.  **Deployment to a Cloud VM:**
    *   Provision a Linux VM (e.g., AWS EC2, DigitalOcean Droplet).
    *   Install Docker and Docker Compose on the VM.
    *   Copy your project folder (including `.env` files) to the VM.
    *   Navigate to the project root on the VM.
    *   Run `docker-compose up -d` (the `-d` runs in detached mode).
    *   Ensure firewall rules allow traffic to ports 80 (for frontend) and 5000 (for backend API, though usually only Nginx port 80/443 is exposed externally).
4.  **HTTPS:**
    For production, you **must** use HTTPS. This usually involves:
    *   Setting up a domain name.
    *   Using a reverse proxy like Nginx (already in `frontend/Dockerfile`) or Caddy.
    *   Obtaining SSL certificates (e.g., via Let's Encrypt with Certbot).
    *   Configuring Nginx to handle SSL termination and proxy requests to your Docker containers.

## 11. ALX Software Engineering Principles

This project has been developed with a strong emphasis on ALX Software Engineering precourse materials, focusing on:

*   **Programming Logic:** Clear, readable, and maintainable code with well-defined functions and methods.
*   **Algorithm Design:** Efficient data retrieval and processing, particularly in database queries and business logic services.
*   **Technical Problem Solving:** Addressing common API challenges like authentication, authorization, error handling, performance (caching, rate limiting), and data validation.
*   **Modularity:** Breaking down the application into logical components (config, utils, middleware, services, controllers, routes, models) to promote reusability and maintainability.
*   **Test-Driven Development (TDD) principles:** While not strictly TDD, comprehensive testing is prioritized to ensure correctness and prevent regressions.
*   **Clean Code:** Adherence to consistent naming conventions, formatting, and commenting to improve code understanding.
*   **Error Handling:** Robust error management using custom error classes and centralized middleware for predictable behavior.

## 12. License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
```