```markdown
# Comprehensive DevOps Automation System for a Product Catalog

This project demonstrates a full-scale, production-ready DevOps automation system for a Product Catalog Management application. It encompasses a complete full-stack JavaScript (Node.js/React) application, robust database management, a Dockerized environment, CI/CD with GitHub Actions, extensive testing, and thorough documentation.

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Features](#features)
3.  [Technologies Used](#technologies-used)
4.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup](#local-development-setup)
    *   [Running with Docker Compose](#running-with-docker-compose)
5.  [Application Usage](#application-usage)
    *   [Default Admin Credentials](#default-admin-credentials)
    *   [Frontend Access](#frontend-access)
    *   [Backend API Documentation](#backend-api-documentation)
6.  [Testing](#testing)
    *   [Running Tests](#running-tests)
    *   [Coverage Report](#coverage-report)
7.  [CI/CD Pipeline](#cicd-pipeline)
8.  [Documentation](#documentation)
    *   [API Documentation](#api-documentation)
    *   [Architecture Documentation](#architecture-documentation)
    *   [Deployment Guide](#deployment-guide)
9.  [Code Structure](#code-structure)
10. [Additional Features](#additional-features)
11. [ALX Precourse Alignment](#alx-precourse-alignment)
12. [License](#license)

---

## 1. Project Overview

This system provides a complete solution for managing a product catalog. It allows users to register, log in, browse products, and (for administrators) perform full CRUD operations on product data. The primary focus is on demonstrating a robust and automated development and deployment workflow using modern DevOps practices.

## 2. Features

**Core Application (Full-Stack JavaScript)**
*   **Backend (Node.js/Express)**:
    *   RESTful API endpoints for User and Product management.
    *   Full CRUD operations for Products (admin-only for Create, Update, Delete).
    *   User registration and login.
    *   Role-based access control (User, Admin).
*   **Frontend (React.js)**:
    *   User-friendly interface for browsing products.
    *   User authentication (login, registration, logout).
    *   Admin panel for managing products.
    *   Dynamic routing and state management.

**Database Layer (PostgreSQL with Sequelize ORM)**
*   Schema definitions for `User` and `Product` models.
*   Database migration scripts for schema evolution.
*   Seed data for initial admin user and sample products.
*   Basic query optimization considerations (e.g., indexing implicitly handled by Sequelize for primary keys).

**Configuration & Setup**
*   `package.json` for both backend and frontend, detailing all dependencies.
*   Environment variable management (`.env`).
*   **Docker**: Containerization for backend, frontend, and PostgreSQL database.
*   **CI/CD Pipeline**: Automated build, test, and linting pipeline using GitHub Actions.

**Testing & Quality**
*   **Backend**: Unit tests (Jest), Integration tests (Supertest + Jest) covering API endpoints and business logic. Aim for 80%+ coverage.
*   **Frontend**: Unit tests (React Testing Library + Jest) for components and hooks.
*   Linting (ESLint) for code quality.

**Documentation**
*   Comprehensive `README.md` (this file).
*   API documentation generated using Swagger/OpenAPI.
*   High-level architecture documentation.
*   Detailed deployment guide.

**Additional Features**
*   **Authentication/Authorization**: JWT-based authentication, role-based access control middleware.
*   **Logging and Monitoring**: Centralized logging with Winston for backend operations and HTTP requests.
*   **Error Handling Middleware**: Global error handling for Express.js, providing consistent error responses.
*   **Caching Layer**: In-memory caching with `node-cache` for product listings to improve response times.
*   **Rate Limiting**: Protection against brute-force attacks and abuse using `express-rate-limit`.

## 3. Technologies Used

*   **Backend**: Node.js, Express.js, Sequelize ORM, PostgreSQL, bcryptjs, jsonwebtoken, winston, node-cache, express-rate-limit, swagger-jsdoc, swagger-ui-express.
*   **Frontend**: React.js, create-react-app, React Router DOM, Axios, Tailwind CSS (implied by styling classes).
*   **Database**: PostgreSQL
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions
*   **Testing**: Jest, Supertest, React Testing Library
*   **Code Quality**: ESLint

## 4. Getting Started

### Prerequisites

*   Git
*   Docker & Docker Compose (Docker Desktop recommended for local development)
*   Node.js (v20+) & npm (if not using Docker for everything)

### Local Development Setup (without Docker Compose)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/product-catalog-devops.git
    cd product-catalog-devops
    ```

2.  **Create `.env` file:**
    Copy `.env.example` to `.env` in the project root and fill in your details.
    ```bash
    cp .env.example .env
    ```
    Ensure your `DB_HOST` points to `localhost` if running PostgreSQL locally without Docker, or `db` if you plan to run the DB via Docker without `docker-compose`.

3.  **Install dependencies:**
    Use the root `package.json` to install dependencies for both backend and frontend.
    ```bash
    npm install-all
    ```
    (This runs `npm install` in `src/backend` and `src/frontend`).

4.  **Set up PostgreSQL Database:**
    *   Install PostgreSQL locally (if not using Docker).
    *   Create a database with the name specified in your `.env` (e.g., `product_catalog_db`).
    *   Create a user with the specified username and password in your `.env`.

5.  **Run Database Migrations and Seed Data (Backend):**
    ```bash
    npm run migrate --prefix src/backend
    npm run seed --prefix src/backend
    ```
    This will create tables and insert the default admin user and sample products.

6.  **Start Backend:**
    ```bash
    npm run dev --prefix src/backend
    ```
    The backend server will run on `http://localhost:5000` (or your specified `PORT`).

7.  **Start Frontend:**
    ```bash
    npm start --prefix src/frontend
    ```
    The frontend application will run on `http://localhost:3000`.

### Running with Docker Compose (Recommended)

Docker Compose simplifies the setup by orchestrating all services (backend, frontend, database).

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/product-catalog-devops.git
    cd product-catalog-devops
    ```

2.  **Create `.env` file:**
    Copy `.env.example` to `.env` in the project root and fill in your details. The `DB_HOST` should remain `db` as specified in `docker-compose.yml`.
    ```bash
    cp .env.example .env
    ```

3.  **Build and run all services:**
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Builds the Docker images before starting containers (useful for first run or after code changes).
    *   `-d`: Runs containers in detached mode (in the background).

4.  **Verify services:**
    Check the status of your running containers:
    ```bash
    docker-compose ps
    ```
    You should see `db`, `backend`, and `frontend` services running.

5.  **Access the application:**
    *   **Frontend**: `http://localhost:3000`
    *   **Backend API**: `http://localhost:5000/api/v1`
    *   **API Docs (Swagger)**: `http://localhost:5000/api-docs`

6.  **Stopping services:**
    ```bash
    docker-compose down
    ```
    This stops and removes all services defined in `docker-compose.yml`. If you want to remove volumes (database data), use `docker-compose down -v`.

## 5. Application Usage

### Default Admin Credentials

An initial admin user is created on application startup (or migration/seeding) with the following credentials:
*   **Email**: `admin@example.com` (configurable via `ADMIN_EMAIL` in `.env`)
*   **Password**: `adminpassword` (configurable via `ADMIN_PASSWORD` in `.env`)

### Frontend Access

Navigate to `http://localhost:3000`.
*   **Register/Login**: Use the `Register` and `Login` links in the Navbar.
*   **View Products**: After logging in (even as a regular user), you can navigate to `/products`.
*   **Manage Products (Admin)**: If logged in as an admin, a `Manage Products` link will appear in the Navbar, leading to `/admin/products`. Here, you can Add, Edit, and Delete products.

### Backend API Documentation

The API documentation is available via Swagger UI at `http://localhost:5000/api-docs`. You can explore all available endpoints, their request/response schemas, and even test them directly from the browser.

To test authenticated endpoints:
1.  Click the "Authorize" button.
2.  In the dialog, enter your JWT token in the format `Bearer <your-jwt-token>`. You get this token upon successful login.
3.  Click "Authorize" and then "Close". Your requests will now include the authorization header.

## 6. Testing

The project includes comprehensive unit and integration tests for both frontend and backend.

### Running Tests

*   **Run all tests (backend and frontend):**
    ```bash
    npm test-backend
    npm test-frontend
    ```
    (These use the root `package.json` scripts that delegate to the respective sub-project scripts).

*   **Run backend tests only:**
    ```bash
    npm test --prefix src/backend
    ```

*   **Run frontend tests only:**
    ```bash
    npm test --prefix src/frontend
    ```

### Coverage Report

Backend tests are configured to generate coverage reports. After running backend tests, you can find the report in `src/backend/coverage/lcov-report/index.html`. Open this file in your browser to view detailed coverage information. The target is 80%+ coverage for branches, functions, lines, and statements, as configured in `src/backend/package.json`.

## 7. CI/CD Pipeline

The project utilizes **GitHub Actions** for Continuous Integration and Continuous Deployment.

*   **Workflow File**: `.github/workflows/main.yml`
*   **Triggers**: Pushes to `main` or `develop` branches, and pull requests to these branches.
*   **Jobs**:
    *   **`build-and-test`**:
        *   Checks out code.
        *   Sets up Node.js environment.
        *   Installs backend and frontend dependencies.
        *   Runs ESLint for both backend and frontend.
        *   Executes Jest tests for both backend and frontend.
        *   Builds the React frontend for production.
        *   Builds Docker images for backend and frontend.
    *   **(Optional) `deploy`**: A placeholder job demonstrating how deployment to a cloud provider (e.g., using SSH to a remote server to pull and restart Docker containers) could be integrated. This job is commented out and requires specific secrets and configuration for a real-world deployment.

## 8. Documentation

### API Documentation

Interactive API documentation is generated using `swagger-jsdoc` and `swagger-ui-express`.
*   **Swagger UI**: Accessible at `http://localhost:5000/api-docs` when the backend is running.
*   **API Specification**: The `src/backend/config/swagger.js` file defines the OpenAPI specification.

### Architecture Documentation

#### `ARCHITECTURE.md`
This file provides a high-level overview of the system's architecture, including its components, their interactions, and the data flow.