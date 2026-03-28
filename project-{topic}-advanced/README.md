# ALX E-commerce Solutions System

This repository contains a comprehensive, production-ready e-commerce solution built with a modern TypeScript stack. It features a robust backend API, a dynamic Next.js frontend, a PostgreSQL database, and includes essential enterprise-grade features like authentication, authorization, logging, caching, and a full testing suite.

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Features](#features)
3.  [Technology Stack](#technology-stack)
4.  [Architecture](#architecture)
5.  [Setup & Installation](#setup--installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development (with Docker)](#local-development-with-docker)
    *   [Backend Only (without Docker)](#backend-only-without-docker)
    *   [Frontend Only (without Docker)](#frontend-only-without-docker)
6.  [Running Tests](#running-tests)
    *   [Backend Tests](#backend-tests)
7.  [API Documentation](#api-documentation)
8.  [Deployment](#deployment)
9.  [Contribution](#contribution)
10. [License](#license)

---

## 1. Project Overview

This project is designed to be a full-scale e-commerce platform demonstrating best practices in software engineering. It provides a foundational system for managing products, users, categories, and orders, with a focus on scalability, maintainability, and security.

## 2. Features

**Core E-commerce:**
*   Product catalog management (CRUD)
*   Category management (CRUD)
*   User registration and authentication
*   Shopping cart functionality (frontend state-based, for demo)
*   Order creation (conceptual backend endpoint, not fully implemented in provided code)

**Enterprise-Grade Capabilities:**
*   **Authentication & Authorization:** JWT-based user authentication, role-based access control (Admin/Customer).
*   **Data Validation:** Joi schema validation for API requests.
*   **Error Handling:** Centralized error handling middleware with custom error types.
*   **Logging & Monitoring:** Winston for structured application logging. (Monitoring conceptual)
*   **Caching Layer:** In-memory cache demonstrated, designed for Redis integration for improved performance.
*   **Rate Limiting:** Protects API from abuse and DDoS attacks.
*   **Database Management:** PostgreSQL with Prisma ORM for schema, migrations, and seeding.
*   **Containerization:** Docker for consistent development and deployment environments.
*   **Comprehensive Testing:** Unit, Integration, and API tests to ensure quality and reliability.
*   **Documentation:** Detailed README, API docs, Architecture, and Deployment guides.

## 3. Technology Stack

**Backend:**
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Language:** TypeScript
*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **Authentication:** `jsonwebtoken`, `bcryptjs`
*   **Validation:** `joi`
*   **Logging:** `winston`
*   **Caching:** In-memory demo (`redis` integration ready)
*   **Rate Limiting:** `express-rate-limit`
*   **Testing:** `jest`, `supertest`

**Frontend:**
*   **Framework:** Next.js (React)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (conceptual, minimal styling for demo)
*   **HTTP Client:** `axios`
*   **State Management:** React Context API (Auth, Cart)

**DevOps & Tools:**
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions (conceptual configuration)
*   **API Documentation:** Swagger/OpenAPI (via `swagger-ui-express`)
*   **Code Quality:** ESLint, Prettier (via Husky/lint-staged)

## 4. Architecture

The system follows a typical layered architecture for the backend and a component-based architecture for the frontend.

*   **Monorepo Structure (Conceptual):** The project is structured as a monorepo containing `backend` and `frontend` applications.
*   **Backend (Node.js/Express):**
    *   **Controllers:** Handle incoming HTTP requests, delegate to services, and send responses.
    *   **Services:** Encapsulate business logic and orchestrate data operations.
    *   **Repositories (Prisma Client):** Directly interact with the database.
    *   **Middleware:** For authentication, authorization, error handling, logging, rate limiting, and validation.
    *   **Utilities:** Helper functions for JWT, password hashing, etc.
    *   **Routes:** Define API endpoints.
*   **Frontend (Next.js/React):**
    *   **Pages:** Top-level components for different routes.
    *   **Components:** Reusable UI elements.
    *   **Context:** Global state management (Auth, Cart).
    *   **Lib/API:** Centralized API client for interacting with the backend.

See `ARCHITECTURE.md` for a more detailed diagram and explanation.

## 5. Setup & Installation

### Prerequisites

*   Node.js (v18+) & npm (or yarn)
*   Docker & Docker Compose (recommended for easy setup)
*   PostgreSQL client (optional, if running backend without Docker DB)
*   Redis (optional, if running backend without Docker Redis)

### Local Development (with Docker) - Recommended

The easiest way to get the entire system running is using Docker Compose.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/ecommerce-system.git
    cd ecommerce-system
    ```

2.  **Create `.env` files:**
    *   Create `backend/.env` from `backend/.env.example`
    *   Create `frontend/.env.local` from `frontend/.env.local.example`

    **`backend/.env` content example:**
    ```
    NODE_ENV=development
    PORT=5000
    API_VERSION=/api/v1
    DATABASE_URL="postgresql://user:password@db:5432/ecommerce_db?schema=public" # 'db' is the service name in docker-compose
    JWT_SECRET=your_super_secret_jwt_key_here # **CHANGE THIS IN PRODUCTION**
    JWT_EXPIRES_IN=1h
    ADMIN_EMAIL=admin@example.com
    ADMIN_PASSWORD=adminpassword123
    FRONTEND_URL=http://localhost:3000
    LOG_LEVEL=debug
    REDIS_URL=redis://redis:6379 # 'redis' is the service name in docker-compose
    ```

    **`frontend/.env.local` content example:**
    ```
    NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1 # Use localhost:5000 for frontend to access backend
    ```

3.  **Build and run services with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build Docker images for backend and frontend.
    *   Start PostgreSQL, Redis, backend, and frontend containers.
    *   Apply Prisma database migrations and generate client in the backend container.
    *   Run the backend server on `http://localhost:5000`.
    *   Run the frontend application on `http://localhost:3000`.

4.  **Seed the database (important for initial data):**
    ```bash
    docker-compose exec backend npm run prisma:seed
    ```
    This will create an admin user, categories, and some products.

5.  **Access the applications:**
    *   Frontend: `http://localhost:3000`
    *   Backend API: `http://localhost:5000/api/v1`
    *   API Docs: `http://localhost:5000/api/v1/docs`

6.  **Stop services:**
    ```bash
    docker-compose down
    ```

### Backend Only (without Docker for backend services)

If you prefer to run Node.js/Prisma locally:

1.  **Navigate to the backend directory:**
    ```bash
    cd ecommerce-system/backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up `.env`:**
    Create `backend/.env` from `backend/.env.example`.
    **Important:** Update `DATABASE_URL` to point to a local PostgreSQL instance (e.g., `postgresql://user:password@localhost:5432/ecommerce_db?schema=public`).
    You can use the `db` service from `docker-compose` if you just want to run the DB in Docker: `docker-compose up -d db redis`.

4.  **Run Prisma migrations:**
    ```bash
    npx prisma migrate dev --name init
    ```

5.  **Generate Prisma client:**
    ```bash
    npx prisma generate
    ```

6.  **Seed the database:**
    ```bash
    npm run prisma:seed
    ```

7.  **Start the backend server:**
    ```bash
    npm run dev
    ```
    (Or `npm start` for production build)

### Frontend Only (without Docker for frontend services)

1.  **Navigate to the frontend directory:**
    ```bash
    cd ecommerce-system/frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up `.env.local`:**
    Create `frontend/.env.local` from `frontend/.env.local.example`.
    **Important:** Ensure `NEXT_PUBLIC_API_BASE_URL` points to your running backend (e.g., `http://localhost:5000/api/v1`).

4.  **Start the frontend development server:**
    ```bash
    npm run dev
    ```

## 6. Running Tests

### Backend Tests

Navigate to the `backend` directory.

1.  **Ensure test database is configured:**
    Update `backend/.env` with `TEST_DATABASE_URL` or ensure your `DATABASE_URL` is pointing to a dedicated test database (e.g., `postgresql://testuser:testpassword@localhost:5433/ecommerce_test_db?schema=public`). You may want to spin up a separate PostgreSQL container for tests.

2.  **Run all tests (unit and integration):**
    ```bash
    npm test
    ```

3.  **Run unit tests only:**
    ```bash
    npm run test:unit
    ```

4.  **Run integration tests only:**
    ```bash
    npm run test:integration
    ```

## 7. API Documentation

The backend API includes built-in Swagger UI documentation.
Once the backend is running, access it at: `http://localhost:5000/api/v1/docs`

This interface allows you to explore all available endpoints, their request/response schemas, and even try out requests directly from your browser.

## 8. Deployment

A detailed deployment guide is provided in `DEPLOYMENT.md`. It covers strategies for production deployments, including:
*   Cloud Providers (AWS, GCP, Azure, DigitalOcean)
*   Container Orchestration (Kubernetes, Docker Swarm)
*   Load Balancing & Reverse Proxies (Nginx)
*   Process Management (PM2)
*   Continuous Integration/Continuous Deployment (CI/CD) with GitHub Actions (see `.github/workflows/ci-cd.yml`)

## 9. Contribution

Feel free to fork the repository, open issues, or submit pull requests.
Please ensure your contributions adhere to the following guidelines:
*   Follow the existing code style.
*   Write clear and concise commit messages.
*   Add or update tests for any new features or bug fixes.
*   Update documentation as necessary.

## 10. License

This project is licensed under the ISC License. See the `LICENSE` file for details.
```