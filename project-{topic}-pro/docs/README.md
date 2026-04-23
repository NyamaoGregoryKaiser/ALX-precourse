# ALXPay - A Comprehensive Payment Processing System

ALXPay is a full-scale, production-ready payment processing system built using Node.js, TypeScript, Express, React, PostgreSQL, and Redis. It aims to demonstrate enterprise-grade software development practices, including robust backend services, a basic frontend, database management, testing, CI/CD, and extensive documentation.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development with Docker](#local-development-with-docker)
    *   [Manual Setup (Backend)](#manual-setup-backend)
    *   [Manual Setup (Frontend)](#manual-setup-frontend)
5.  [Running the Application](#running-the-application)
6.  [Database Management](#database-management)
    *   [Migrations](#migrations)
    *   [Seeding](#seeding)
7.  [Testing](#testing)
8.  [API Documentation](#api-documentation)
9.  [Architecture](#architecture)
10. [Deployment](#deployment)
11. [Additional Features](#additional-features)
12. [Contributing](#contributing)
13. [License](#license)

## Features

*   **User & Merchant Management:** Secure registration, authentication (JWT), and profiles.
*   **Payment Lifecycle:** Initiate, process (via mock gateway), and manage payment states (successful, failed, refunded).
*   **Transaction Tracking:** Comprehensive ledger for all financial movements.
*   **Refunds:** Support for refunding successful payments.
*   **Webhook Notifications:** Asynchronous event notifications to merchants for payment status changes.
*   **Authentication & Authorization:** Role-based access control for API endpoints.
*   **Error Handling:** Centralized middleware for consistent error responses.
*   **Logging & Monitoring:** Structured logging with Winston.
*   **Caching:** Redis-backed caching for frequently accessed data.
*   **Rate Limiting:** Protects API endpoints from abuse.
*   **Database Management:** PostgreSQL with TypeORM for ORM, migrations, and seeding.
*   **Containerization:** Docker and Docker Compose for easy setup and deployment.
*   **CI/CD:** Basic GitHub Actions workflow for automated testing.
*   **Frontend Application:** A simple React UI for user interaction and merchant dashboard (illustrative).

## Technology Stack

**Backend:**
*   **Language:** TypeScript
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **ORM:** TypeORM
*   **Database:** PostgreSQL
*   **Caching/Rate Limiting:** Redis
*   **Authentication:** JSON Web Tokens (JWT)
*   **Hashing:** bcryptjs
*   **Logging:** Winston
*   **HTTP Client:** Axios

**Frontend:**
*   **Language:** TypeScript
*   **Framework:** React
*   **State Management:** React Context (simple)
*   **HTTP Client:** Axios

**Tools & Infrastructure:**
*   **Containerization:** Docker, Docker Compose
*   **Testing:** Jest, Supertest, k6 (for performance)
*   **CI/CD:** GitHub Actions
*   **Code Quality:** ESLint, Prettier

## Project Structure

```
alxpay-system/
├── backend/                  # Node.js/Express/TypeScript backend
│   ├── src/                  # Source code for the backend
│   │   ├── config/           # Environment variables, database config
│   │   ├── controllers/      # Handles incoming requests, orchestrates services
│   │   ├── entities/         # TypeORM entities (database schemas)
│   │   ├── middlewares/      # Authentication, error handling, rate limiting, caching
│   │   ├── repositories/     # TypeORM custom repositories (data access)
│   │   ├── services/         # Business logic, interacts with repositories
│   │   ├── utils/            # Helpers, token generation, logging
│   │   ├── types/            # TypeScript custom types/interfaces
│   │   ├── routes/           # API route definitions
│   │   ├── subscribers/      # TypeORM event subscribers
│   │   ├── app.ts            # Express application setup
│   │   └── server.ts         # Entry point, starts the server
│   ├── tests/                # Unit, Integration, API tests
│   ├── .env.example
│   ├── jest.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/                 # React/TypeScript frontend
│   ├── public/
│   ├── src/                  # Source code for the frontend
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Top-level page components
│   │   ├── services/         # API interaction logic
│   │   ├── context/          # React context for global state
│   │   ├── hooks/            # Custom React hooks
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── react-app-env.d.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── docs/                     # Project documentation
│   ├── README.md             # This file
│   ├── API.md                # Detailed API endpoints
│   ├── ARCHITECTURE.md       # High-level architecture overview
│   └── DEPLOYMENT.md         # Deployment guide
├── docker-compose.yml        # Docker Compose setup for all services
├── .github/
│   └── workflows/
│       └── main.yml          # GitHub Actions CI/CD pipeline
├── loadtest/
│   └── k6_script.js          # Performance testing script (k6)
└── seed.ts                   # Database seed script
```

## Setup and Installation

### Prerequisites

*   Git
*   Node.js (v18 or higher) & npm
*   Docker & Docker Compose (recommended for easiest setup)
*   PostgreSQL (if not using Docker)
*   Redis (if not using Docker)

### Local Development with Docker (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/alxpay-system.git
    cd alxpay-system
    ```

2.  **Create `.env` file:**
    Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`. Fill in the required values. For local Docker setup, the default values in `.env.example` should work fine.
    **backend/.env**:
    ```
    # ... (defaults are usually fine)
    DB_HOST=postgres # Important: Use service name 'postgres' for Docker internal network
    REDIS_URL=redis://redis:6379 # Important: Use service name 'redis'
    JWT_SECRET=your_super_secret_jwt_key_that_is_at_least_32_characters_long
    WEBHOOK_SECRET=your_webhook_signing_secret
    ```
    **frontend/.env**:
    ```
    REACT_APP_API_BASE_URL=http://localhost:5000/api # Points to your backend
    ```

3.  **Start Docker containers:**
    ```bash
    docker-compose up --build
    ```
    This will:
    *   Build Docker images for backend and frontend.
    *   Start PostgreSQL, Redis, backend, and frontend containers.
    *   The `init.sql` will run to enable `uuid-ossp` extension in PostgreSQL.
    *   Backend migrations (`npm run typeorm migration:run`) will be executed.
    *   Database seeding (`npm run seed`) will run.

    Wait for all services to be healthy and the backend to start. You should see logs indicating successful database connection and server start.

4.  **Access the application:**
    *   **Backend API:** `http://localhost:5000/api`
    *   **Frontend UI:** `http://localhost:3000`

### Manual Setup (Backend)

1.  **Navigate to the backend directory:**
    ```bash
    cd alxpay-system/backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Copy `.env.example` to `.env` and fill in your PostgreSQL and Redis connection details. Ensure `DB_HOST` is `localhost` if running locally and not in Docker.

4.  **Start PostgreSQL and Redis servers:**
    Make sure your local PostgreSQL and Redis instances are running.

5.  **Create database:**
    If your database (`alxpay` by default) doesn't exist, create it manually using `psql` or a GUI client.
    ```sql
    CREATE DATABASE alxpay;
    CREATE EXTENSION "uuid-ossp"; -- Enable UUID extension
    ```

6.  **Run migrations:**
    ```bash
    npm run migration:run
    ```

7.  **Seed initial data:**
    ```bash
    npm run seed
    ```

8.  **Start the backend server:**
    ```bash
    npm run dev
    ```
    The server will run on `http://localhost:5000`.

### Manual Setup (Frontend)

1.  **Navigate to the frontend directory:**
    ```bash
    cd alxpay-system/frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Copy `.env.example` to `.env`. `REACT_APP_API_BASE_URL` should point to your backend API. If backend is running on `http://localhost:5000`, it should be `http://localhost:5000/api`.

4.  **Start the frontend development server:**
    ```bash
    npm start
    ```
    The frontend will run on `http://localhost:3000`.

## Running the Application

Once both backend and frontend are running (either via Docker Compose or manually), you can:

*   **Register a Merchant User:** Use the API endpoint `/api/auth/register` with `role: "merchant"`.
    *   Example: `POST /api/auth/register` with `{ "email": "merchant@example.com", "password": "password123", "role": "merchant" }`
*   **Log in:** Obtain a JWT token.
    *   Example: `POST /api/auth/login` with `{ "email": "merchant@example.com", "password": "password123" }`
*   **Initiate a Payment:** Use the obtained JWT token to call `/api/payments/initiate`.
    *   Example: `POST /api/payments/initiate` with `{ "merchantId": "your-merchant-uuid", "amount": 25.50, "currency": "USD", "method": "card", "customerEmail": "customer@email.com" }`
*   **Simulate Webhook Processing:** Manually call `/api/payments/process-webhook` to simulate a payment gateway callback changing the payment status.
    *   Example: `POST /api/payments/process-webhook` with `{ "paymentId": "payment-uuid", "externalId": "gateway-ref-123", "status": "success" }`

## Database Management

### Migrations

*   **Generate a new migration:**
    ```bash
    cd backend
    npm run migration:generate -- --name=<MigrationName>
    ```
    This will create a new migration file in `src/migrations`.
*   **Run pending migrations:**
    ```bash
    cd backend
    npm run migration:run
    ```
*   **Revert the last migration:**
    ```bash
    cd backend
    npm run migration:revert
    ```

### Seeding

The `seed.ts` script populates the database with initial users, merchants, and accounts for testing and development.
*   **Run seed script:**
    ```bash
    cd backend
    npm run seed
    ```
    *(Note: The `docker-compose up` command already includes running migrations and seeding once.)*

## Testing

Navigate to the `backend` directory.

*   **Run all tests (unit, integration, API) with coverage:**
    ```bash
    npm test
    ```
*   **Run tests in watch mode:**
    ```bash
    npm run test:watch
    ```
*   **Performance Testing (using k6):**
    ```bash
    cd alxpay-system
    docker-compose up --build -d # Ensure backend/db/redis are running
    docker run --network host grafana/k6 run loadtest/k6_script.js
    ```
    *   Adjust `loadtest/k6_script.js` with actual merchant IDs and potentially login details.
    *   Ensure the `BASE_URL` in `k6_script.js` points to your backend.

## API Documentation

See `docs/API.md` for detailed information on all available API endpoints, request/response formats, and authentication requirements.

## Architecture

A detailed overview of the system's architecture, components, and interactions can be found in `docs/ARCHITECTURE.md`.

## Deployment

Refer to `docs/DEPLOYMENT.md` for instructions on deploying ALXPay to a production environment using Docker.

## Additional Features

*   **Authentication/Authorization:** JWT-based authentication for user sessions and role-based authorization middleware.
*   **Logging & Monitoring:** Structured logging with Winston, easily configurable for different environments.
*   **Error Handling:** Centralized `AppError` class and global error middleware for consistent API error responses.
*   **Caching Layer:** Redis-backed `cacheMiddleware` to store and retrieve API responses, reducing database load.
*   **Rate Limiting:** `express-rate-limit` middleware integrated to prevent API abuse and DoS attacks.
*   **Webhooks:** Asynchronous event notification mechanism for merchants.

## Contributing

Contributions are welcome! Please see the guidelines in the `CONTRIBUTING.md` (not provided in this response but would be in a real project).

## License

This project is licensed under the MIT License. See the `LICENSE` file for details (not provided in this response but would be in a real project).
```