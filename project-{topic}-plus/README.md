```markdown
# ScrapeMaster: Enterprise Web Scraping Tools System

ScrapeMaster is a robust, full-scale web scraping system designed for defining, executing, and managing web scraping jobs. It provides a powerful API and an intuitive frontend for users to interact with their scraping tasks and results.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Prerequisites](#prerequisites)
4.  [Setup & Installation](#setup--installation)
    *   [Backend Setup](#backend-setup)
    *   [Frontend Setup](#frontend-setup)
    *   [Database & Migrations](#database--migrations)
    *   [Running with Docker Compose](#running-with-docker-compose)
5.  [Configuration](#configuration)
6.  [API Documentation](#api-documentation)
7.  [Testing](#testing)
    *   [Backend Tests](#backend-tests)
    *   [Frontend Tests](#frontend-tests)
    *   [Performance Tests](#performance-tests)
8.  [CI/CD](#cicd)
9.  [Deployment Guide](#deployment-guide)
10. [Error Handling](#error-handling)
11. [Logging & Monitoring](#logging--monitoring)
12. [Caching](#caching)
13. [Rate Limiting](#rate-limiting)
14. [Authentication & Authorization](#authentication--authorization)
15. [Project Structure](#project-structure)
16. [Contributing](#contributing)
17. [License](#license)

## 1. Features

*   **User Authentication & Authorization:** Secure user login and role-based access control using JWT.
*   **User Management:** CRUD operations for user accounts.
*   **Scraping Job Management:**
    *   Create, view, update, delete scraping job configurations.
    *   Define target URLs, CSS selectors, data extraction rules.
    *   Schedule immediate or recurring jobs.
    *   Monitor job status (pending, running, completed, failed).
*   **Asynchronous Job Processing:** Utilizes a Redis-backed queue (BullMQ) for reliable, non-blocking execution of scraping tasks.
*   **Scraping Engine:** Powered by Puppeteer for robust headless browser automation, capable of handling dynamic, JavaScript-rendered content.
*   **Scraping Results Storage:** Persistent storage of extracted data in PostgreSQL.
*   **API:** Full RESTful API with CRUD operations for all core resources.
*   **Frontend:** Intuitive React application for managing jobs and viewing results.
*   **Caching:** Redis-based caching for faster API responses.
*   **Rate Limiting:** Protects the API from excessive requests.
*   **Comprehensive Logging:** Structured logging using Winston for traceability and debugging.
*   **Global Error Handling:** Consistent error responses across the API.
*   **Database Migrations:** TypeORM migrations for schema evolution.
*   **Unit & Integration Testing:** High test coverage for backend logic.
*   **Containerization:** Docker support for easy environment setup.

## 2. Architecture

ScrapeMaster follows a modular, layered architecture:

*   **Client Layer:** The React frontend (ScrapeMaster-UI) interacts with the backend API.
*   **API Layer (NestJS):**
    *   **Controllers:** Handle incoming HTTP requests, validate input, and delegate to services.
    *   **Services:** Contain the core business logic, orchestrating data manipulation and external interactions (e.g., triggering scraping jobs).
    *   **Modules:** Encapsulate related functionality (e.g., `AuthModule`, `UsersModule`, `ScrapingModule`).
    *   **Middleware/Interceptors/Pipes/Filters:** Global request/response processing, validation, error handling, logging, caching, rate limiting.
    *   **Jobs/Queue Module:** Manages interaction with the BullMQ queue (adding jobs, monitoring).
    *   **Scraping Processor:** A dedicated worker service (or separate process) that consumes jobs from the BullMQ queue and executes the actual web scraping using Puppeteer.
*   **Data Layer (PostgreSQL & TypeORM):**
    *   **Entities:** TypeScript classes mapping to database tables.
    *   **Repositories:** TypeORM provides a robust way to interact with the database.
    *   **Migrations:** Manage database schema changes.
*   **Cache Layer (Redis):** Used for caching API responses and potentially intermediate scraping data.
*   **Queue Layer (Redis & BullMQ):** Redis serves as the message broker for BullMQ, which manages the job queue.

```
+-------------------+       +--------------------+       +---------------------+
|   ScrapeMaster-UI | <---> | NestJS Backend API | <---> |  BullMQ Job Queue   |
|     (React App)   |       |                    |       |    (Redis-backed)   |
+-------------------+       +--------------------+       +---------------------+
                                 ^         ^                       ^
                                 |         |                       |
                                 |         |                 +-----------+
                                 |         +---------------> | Scraping  |
                                 |                           | Processor |
                                 |                           | (Puppeteer)|
                                 |         +---------------+ +-----------+
                                 |         |
                                 v         v
                         +-------------+   +-----------+
                         | PostgreSQL  |   |   Redis   |
                         |  (Data, Jobs)|   | (Cache, Queue)|
                         +-------------+   +-----------+
```

## 3. Prerequisites

Before you begin, ensure you have the following installed:

*   Node.js (LTS version, e.g., v18.x or v20.x)
*   npm or Yarn
*   Docker & Docker Compose (for local development and deployment)
*   Git

## 4. Setup & Installation

You can run the application either directly on your machine or using Docker Compose. Docker Compose is highly recommended for consistency.

First, clone the repository:

```bash
git clone https://github.com/yourusername/scrape-master.git
cd scrape-master
```

### Environment Variables

Both `backend` and `frontend` directories have an `.env.example` file. Copy them to `.env` and fill in the values.

**`backend/.env`:**

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=supersecretjwtkey
JWT_EXPIRES_IN=1d

# Database
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=scrapemaster_db

# Redis for Caching and BullMQ
REDIS_HOST=localhost
REDIS_PORT=6379

# Rate Limiting
THROTTLE_TTL=60 # seconds
THROTTLE_LIMIT=100 # requests per TTL

# Puppeteer (Docker specific)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable # This is for the Docker image
```

**`frontend/.env`:**

```env
REACT_APP_API_BASE_URL=http://localhost:3000/api
```

---

### Running with Docker Compose (Recommended)

This is the easiest way to get the entire system up and running.

1.  **Build and Run:**
    Navigate to the root directory of the project (`scrape-master/`) and run:
    ```bash
    docker-compose up --build
    ```
    This command will:
    *   Build Docker images for the backend and frontend.
    *   Start PostgreSQL, Redis, backend, and frontend containers.
    *   Execute database migrations and seed data on the backend startup.

2.  **Access the applications:**
    *   **Backend API:** `http://localhost:3000/api` (Swagger docs at `http://localhost:3000/api-docs`)
    *   **Frontend UI:** `http://localhost:80` (or `http://localhost:3001` if frontend is not running on port 80 via Nginx/proxy)

3.  **Stop the applications:**
    ```bash
    docker-compose down
    ```

---

### Backend Setup (Manual)

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Install dependencies:**
    ```bash
    npm install # or yarn install
    ```
3.  **Ensure PostgreSQL and Redis are running:**
    You'll need a running PostgreSQL instance (e.g., on port 5432) and a Redis instance (e.g., on port 6379) accessible from your `backend` application. Update your `backend/.env` file accordingly.
4.  **Database Migrations:**
    Create a database named `scrapemaster_db` (or whatever you configured in `DATABASE_NAME`).
    Run the migrations to set up the schema:
    ```bash
    npm run typeorm migration:run
    ```
5.  **Seed Data (Optional):**
    ```bash
    npm run seed
    ```
6.  **Start the backend:**
    ```bash
    npm run start:dev
    ```
    The API will be available at `http://localhost:3000/api`.

---

### Frontend Setup (Manual)

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install # or yarn install
    ```
3.  **Start the frontend:**
    ```bash
    npm run start
    ```
    The frontend will be available at `http://localhost:3001`.

---

## 5. Configuration

Configuration is managed using environment variables, loaded through the `@nestjs/config` module. A validation schema ensures all required variables are present and correctly formatted.

See `backend/src/config/configuration.ts` and `backend/src/config/validation.ts` for details.

## 6. API Documentation

The backend API is documented using Swagger (OpenAPI). Once the backend is running, you can access the interactive API documentation at:

**`http://localhost:3000/api-docs`**

This documentation provides details on all available endpoints, request/response schemas, and allows you to test the API directly from your browser.

## 7. Testing

### Backend Tests

The backend uses Jest for unit, integration, and E2E (API) tests.

*   **Unit Tests:** Focus on individual services, controllers, or utilities in isolation.
*   **Integration Tests:** Test the interaction between multiple components (e.g., service and database).
*   **E2E (API) Tests:** Use Supertest to simulate HTTP requests and test the full API flow.

To run all backend tests:

```bash
cd backend
npm run test
```

To run tests with coverage reporting:

```bash
cd backend
npm run test:cov
```
We aim for 80%+ test coverage.

### Frontend Tests

The frontend uses Jest and React Testing Library for unit and integration tests of components and Redux slices.

To run frontend tests:

```bash
cd frontend
npm run test
```

### Performance Tests

For performance testing, tools like **k6** or **JMeter** are recommended. While not fully implemented in the codebase, a basic setup would involve:

1.  **Install k6:** Follow instructions on [k6.io](https://k6.io/docs/getting-started/installation/).
2.  **Create a test script (e.g., `performance-test.js` in a `test/performance` directory):**

    ```javascript
    // test/performance/k6_test.js
    import http from 'k6/http';
    import { check, sleep } from 'k6';

    export const options = {
      vus: 10, // Virtual Users
      duration: '30s', // Test duration
    };

    export default function () {
      const BASE_URL = 'http://localhost:3000/api';

      // Example: Test user login
      const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        username: 'testuser',
        password: 'password'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
      check(loginRes, {
        'login status is 201': (r) => r.status === 201,
        'login token exists': (r) => r.json() && r.json().accessToken,
      });

      const authToken = loginRes.json('accessToken');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      };

      // Example: Test fetching scraping jobs
      const jobsRes = http.get(`${BASE_URL}/scraping-jobs`, { headers });
      check(jobsRes, {
        'jobs status is 200': (r) => r.status === 200,
      });

      sleep(1);
    }
    ```
3.  **Run the test:**
    ```bash
    k6 run test/performance/k6_test.js
    ```

## 8. CI/CD

A basic GitHub Actions workflow (`.github/workflows/main.yml`) is provided for Continuous Integration and Deployment. This workflow typically includes:

*   **Trigger:** On push to `main` branch or pull requests.
*   **Backend:**
    *   Install Node.js dependencies.
    *   Run lint checks.
    *   Run backend tests (unit, integration, E2E).
    *   Build Docker image.
*   **Frontend:**
    *   Install Node.js dependencies.
    *   Run lint checks.
    *   Run frontend tests.
    *   Build Docker image.
*   **Deployment (Example):** Push Docker images to a registry (e.g., Docker Hub, AWS ECR) and trigger deployment to a staging/production environment.

See `.github/workflows/main.yml` for the example configuration.

## 9. Deployment Guide

This section outlines a basic deployment strategy using Docker. For production, consider using container orchestration platforms like Kubernetes or managed services like AWS ECS, Google Cloud Run, or Azure Container Apps.

1.  **Build Production Docker Images:**
    Ensure you have `backend/Dockerfile` and `frontend/Dockerfile` configured for production (multi-stage builds are used to create lean images).
    ```bash
    # From the root directory
    docker build -t scrape-master-backend ./backend
    docker build -t scrape-master-frontend ./frontend
    ```
    For a CI/CD pipeline, these steps would be automated.

2.  **Environment Variables:**
    Prepare your production `.env` files for both backend and frontend. Ensure `DATABASE_HOST`, `REDIS_HOST`, and `REACT_APP_API_BASE_URL` point to your production services.

3.  **Database & Redis:**
    Provision a managed PostgreSQL instance (e.g., AWS RDS, Azure Database for PostgreSQL) and a managed Redis instance (e.g., AWS ElastiCache, Azure Cache for Redis). This offloads database management and ensures high availability.

4.  **Running Containers:**
    You can use `docker-compose` for a single-server deployment (less common for true production without additional tooling):
    ```bash
    # On your production server
    # Place your production .env files in backend/ and frontend/
    docker-compose -f docker-compose.prod.yml up -d # assuming you create a production compose file
    ```
    Or, individually run containers:
    ```bash
    docker run -d --name scrape-master-db -p 5432:5432 -e POSTGRES_PASSWORD=your_secure_password postgres:13
    docker run -d --name scrape-master-redis -p 6379:6379 redis:6

    # Wait for DB/Redis to start... then run migrations
    # (In a real scenario, migrations are part of a deployment script or job)
    # docker run --rm -v $(pwd)/backend:/app -w /app scrape-master-backend npm run typeorm migration:run

    docker run -d --name scrape-master-backend \
      -p 3000:3000 \
      --env-file ./backend/.env \
      scrape-master-backend

    docker run -d --name scrape-master-frontend \
      -p 80:80 \ # Or 443:80 for HTTPS with a reverse proxy
      --env-file ./frontend/.env \
      scrape-master-frontend
    ```

5.  **Reverse Proxy (Nginx/Caddy):**
    For a production setup, it's highly recommended to place a reverse proxy (like Nginx) in front of your frontend and backend applications for:
    *   SSL termination (HTTPS).
    *   Load balancing (if you have multiple instances).
    *   Serving static files.
    *   URL rewriting.

    Example Nginx configuration (simplified):
    ```nginx
    server {
        listen 80;
        server_name yourdomain.com;

        location / {
            proxy_pass http://frontend:80; # Assuming frontend container name 'frontend'
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location /api/ {
            proxy_pass http://backend:3000/api/; # Assuming backend container name 'backend'
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location /api-docs/ {
            proxy_pass http://backend:3000/api-docs/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
    ```

## 10. Error Handling

A global `HttpExceptionFilter` intercepts all `HttpException` instances (and extends to catch all uncaught exceptions) to provide consistent, structured error responses across the API.

## 11. Logging & Monitoring

The system integrates `Winston` for structured, configurable logging.
*   **Backend:** Logs important events, API requests, errors, and job processing status.
*   **Monitoring:** While not fully implemented with a dedicated monitoring tool, the structured logs can be easily shipped to logging aggregators (e.g., ELK Stack, Splunk, DataDog) for centralized monitoring and alerting.

## 12. Caching

Redis is used as a caching layer.
*   An `HttpCacheInterceptor` can be applied to specific API endpoints to cache successful `GET` responses, reducing database load and improving response times.
*   A `CachingService` provides direct access to Redis for custom caching needs.

## 13. Rate Limiting

The `@nestjs/throttler` package is integrated to provide configurable rate limiting on API endpoints, preventing abuse and ensuring fair usage. Configuration is done via environment variables (`THROTTLE_TTL`, `THROTTLE_LIMIT`).

## 14. Authentication & Authorization

*   **Authentication:** JWT (JSON Web Tokens) are used. Users log in with username/password, receive an access token, and include this token in the `Authorization` header (`Bearer <token>`) for subsequent requests.
*   **Authorization:** `AuthGuard` protects routes, ensuring only authenticated users can access them. Role-based access control can be extended using `RolesGuard` and `RolesDecorator`.

## 15. Project Structure

Refer to the "Project Structure" section at the beginning of this `README.md` for a detailed breakdown of the codebase organization.

## 16. Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write tests for your changes.
5.  Ensure all tests pass (`npm run test` in respective directories).
6.  Commit your changes (`git commit -m 'feat: Add new feature X'`).
7.  Push to the branch (`git push origin feature/your-feature-name`).
8.  Create a Pull Request.

## 17. License

This project is licensed under the MIT License. See the LICENSE file for details.
```