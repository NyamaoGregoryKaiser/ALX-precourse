# ALX Enterprise-Grade Task Management System

This project is a comprehensive, production-ready API development system for a Task Management application, built with a strong focus on best practices, scalability, and maintainability. It demonstrates a full-stack approach using modern web technologies and covers all requirements for an enterprise-grade application, including a robust backend, database layer, configuration, testing, documentation, and advanced features.

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Features](#features)
3.  [Technology Stack](#technology-stack)
4.  [Prerequisites](#prerequisites)
5.  [Setup Instructions](#setup-instructions)
    *   [Local Development Setup](#local-development-setup)
    *   [Database Setup](#database-setup)
    *   [Running Migrations and Seeding Data](#running-migrations-and-seeding-data)
    *   [Running the Backend](#running-the-backend)
    *   [Running the Frontend](#running-the-frontend)
    *   [Running with Docker Compose](#running-with-docker-compose)
6.  [Testing](#testing)
    *   [Unit Tests](#unit-tests)
    *   [Integration Tests](#integration-tests)
    *   [API Tests (E2E)](#api-tests-e2e)
    *   [Performance Tests](#performance-tests)
7.  [API Documentation](#api-documentation)
8.  [Architecture](#architecture)
9.  [Deployment](#deployment)
10. [CI/CD](#ci/cd)
11. [Additional Features](#additional-features)
12. [Contributing](#contributing)
13. [License](#license)

## 1. Project Overview

The Task Management System allows users to:
*   Register and log in securely.
*   Create, view, update, and delete projects.
*   Create, view, update, delete, and assign tasks within projects.
*   Manage user profiles.

It's designed with an emphasis on:
*   **Modularity:** Clear separation of concerns (controllers, services, entities, routes, middleware).
*   **Robustness:** Comprehensive error handling, logging, validation.
*   **Security:** Authentication (JWT), authorization (roles), rate limiting, helmet.
*   **Performance:** Caching (Redis), database indexing, query optimization.
*   **Maintainability:** TypeScript, clear code structure, extensive documentation, testing.

## 2. Features

*   **User Management:**
    *   User Registration
    *   User Login (JWT based)
    *   User Profile Management (view, update)
    *   Role-based Authorization (`user`, `admin`)
*   **Project Management:**
    *   Create, Read (all, single), Update, Delete Projects
    *   Project ownership enforcement
*   **Task Management:**
    *   Create, Read (all, single, by project), Update, Delete Tasks
    *   Assign tasks to users
    *   Task status and priority management
*   **Advanced Features:**
    *   Authentication (JWT)
    *   Authorization (Role-based & Ownership-based)
    *   Centralized Error Handling
    *   Structured Logging and Monitoring (Winston)
    *   Caching Layer (Redis)
    *   Rate Limiting (Express Rate Limit)
    *   Input Validation (Joi)
*   **Infrastructure & DevOps:**
    *   PostgreSQL Database
    *   TypeORM for ORM with Migrations and Seeders
    *   Docker for containerization (Backend, Frontend, DB, Redis)
    *   CI/CD pipeline configuration (GitHub Actions)
    *   Comprehensive Testing (Unit, Integration, API, Performance)
    *   Detailed Documentation

## 3. Technology Stack

### Backend
*   **Language:** TypeScript
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **ORM:** TypeORM
*   **Database:** PostgreSQL
*   **Caching/Message Broker:** Redis
*   **Authentication:** JSON Web Tokens (JWT)
*   **Validation:** Joi
*   **Logging:** Winston
*   **Testing:** Jest, Supertest, Loadtest

### Frontend
*   **Language:** TypeScript
*   **Framework:** React.js
*   **Build Tool:** Create React App
*   **HTTP Client:** Axios

### DevOps
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions

## 4. Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js** (v18.x or higher) and **npm** (v8.x or higher) or **Yarn**
*   **Docker** and **Docker Compose**
*   **PostgreSQL** (optional, if not using Docker for DB)
*   **Redis** (optional, if not using Docker for Redis)
*   **Git**

## 5. Setup Instructions

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-system.git
    cd task-management-system
    ```

2.  **Create `.env` file:**
    Copy the `.env.example` file to `.env` in the root directory and configure your environment variables.
    ```bash
    cp .env.example .env
    ```
    **Important:** Update `JWT_SECRET` with a strong, unique key. Adjust database credentials if not using default Docker values.

3.  **Install Backend Dependencies:**
    ```bash
    cd task-management-system
    npm install
    # or yarn install
    ```

4.  **Install Frontend Dependencies:**
    ```bash
    cd src/frontend
    npm install
    # or yarn install
    cd ../.. # Go back to root
    ```

### Database Setup

You have two options for the database:

**Option A: Using Docker Compose (Recommended for consistency)**

This is the simplest way to get PostgreSQL and Redis running.

```bash
docker-compose up -d db redis
```
Wait for the services to be healthy before starting the backend (check with `docker-compose ps`).

**Option B: Local PostgreSQL and Redis Installation**

If you prefer to install PostgreSQL and Redis directly on your machine:
*   Install PostgreSQL and create a database (e.g., `task_db`).
*   Create a user with appropriate permissions (e.g., `user` with password `password`).
*   Ensure Redis server is running.
*   Update your `.env` file with the correct database and Redis connection details.

### Running Migrations and Seeding Data

After setting up your database (either via Docker or locally), you need to create the schema and seed initial data.

```bash
# Ensure you are in the root directory (task-management-system)
npm run migrate:run
# This will run both schema creation and seed data migrations.
```
To revert migrations: `npm run migrate:revert` (use with caution).

### Running the Backend

```bash
# In the root directory
npm run start:dev # For development with hot-reloading
# or
npm run build # Build for production
npm start       # Run the compiled JavaScript
```
The backend will run on `http://localhost:5000` (or your configured PORT).

### Running the Frontend

```bash
# In the src/frontend directory
npm start
```
The frontend will run on `http://localhost:3000`. Ensure the `REACT_APP_API_BASE_URL` in `src/frontend/.env` (if you create one) or `src/frontend/src/api.ts` points to your backend (e.g., `http://localhost:5000/api`).

### Running with Docker Compose (Full Stack)

To run the entire application (DB, Redis, Backend, Frontend) using Docker Compose:

```bash
# Ensure you are in the root directory
docker-compose up --build
```
This will build the Docker images and start all services.
*   Backend API: `http://localhost:5000`
*   Frontend App: `http://localhost:3000`

## 6. Testing

The project includes comprehensive tests: unit, integration, API (E2E), and performance tests.

### Running Tests

```bash
# From the root directory
npm test # Runs all unit, integration, and API tests with coverage
npm run test:watch # Runs tests in watch mode
```

### Coverage Goal
The aim is for 80%+ code coverage for the backend logic (services, controllers, utilities). Middleware, routes, and config files are often excluded from coverage reports as their primary function is orchestration and configuration, which is implicitly covered by API tests.

### Performance Tests

Performance tests use `loadtest`.
```bash
# Ensure backend is running (e.g., with 'npm run start')
npm run test:performance
```
*Note: For authenticated endpoints, you would need to manually add a valid JWT token to the `loadtest` command (e.g., `-H "Authorization: Bearer <YOUR_TOKEN>"`).*

## 7. API Documentation

Comprehensive API documentation can be found in [API.md](API.md). It details all available endpoints, request/response formats, authentication requirements, and error codes.

## 8. Architecture

Detailed architecture documentation, including diagrams and design decisions, is available in [ARCHITECTURE.md](ARCHITECTURE.md).

## 9. Deployment

A step-by-step guide to deploying this system to a production environment is provided in [DEPLOYMENT.md](DEPLOYMENT.md).

## 10. CI/CD

The project includes a GitHub Actions workflow configuration (`.github/workflows/ci.yml`) that automates testing and potentially building Docker images on every push or pull request.

## 11. Additional Features

*   **Authentication/Authorization:** JWT-based authentication for secure API access and role-based (user/admin) and ownership-based authorization.
*   **Logging:** Centralized Winston-based logger for structured logging of application events and request details.
*   **Error Handling:** Custom `HttpException` class and global error handling middleware for consistent API error responses.
*   **Caching:** Redis-based caching service to improve performance of frequently accessed data (e.g., project lists).
*   **Rate Limiting:** `express-rate-limit` middleware to protect against brute-force attacks and abuse.
*   **Input Validation:** Joi schemas ensure incoming request data adheres to expected formats.

## 12. Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes and write tests.
4.  Ensure all tests pass (`npm test`).
5.  Commit your changes (`git commit -m 'feat: Add new feature'`).
6.  Push to the branch (`git push origin feature/your-feature-name`).
7.  Open a Pull Request.

## 13. License

This project is licensed under the ISC License. See the `LICENSE` file for details (not included in this response for brevity, but would be a standard license file).