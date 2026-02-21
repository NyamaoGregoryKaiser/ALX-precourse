```markdown
# DataVizPro - Enterprise Data Visualization Platform

DataVizPro is a comprehensive, production-ready data visualization system designed to empower users to connect to various data sources, create interactive dashboards, and build insightful charts. This full-stack application emphasizes scalability, security, and developer experience, following best practices in software engineering.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Technology Stack](#technology-stack)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup](#local-development-setup)
    *   [Docker Setup](#docker-setup)
5.  [Running the Application](#running-the-application)
6.  [Database](#database)
7.  [Testing](#testing)
8.  [API Documentation](#api-documentation)
9.  [Deployment](#deployment)
10. [CI/CD](#ci/cd)
11. [Authentication & Authorization](#authentication--authorization)
12. [Logging & Monitoring](#logging--monitoring)
13. [Caching](#caching)
14. [Rate Limiting](#rate-limiting)
15. [Error Handling](#error-handling)
16. [Future Enhancements](#future-enhancements)
17. [Contributing](#contributing)
18. [License](#license)

## 1. Features

*   **User Management**: Secure user registration, login, and profile management with JWT authentication.
*   **Data Source Management**: Connect to various data sources (currently: internal mock data via CSV upload, extendable to PostgreSQL, MySQL, etc.).
*   **Dashboard Management**: Create, view, edit, and delete interactive dashboards.
*   **Chart Creation**: Design and configure multiple chart types (Bar, Line, Pie, Scatter) with various data mappings.
*   **Data Processing**: Backend logic to transform raw data into chart-ready formats.
*   **Role-Based Access Control**: Basic authorization for dashboard/chart ownership.
*   **Robust API**: RESTful API with CRUD operations for all core resources.
*   **Performance**: Caching mechanisms for frequently accessed data.
*   **Observability**: Comprehensive logging and monitoring setup.
*   **Security**: Rate limiting, input validation, and secure authentication.

## 2. Architecture

The system follows a typical client-server architecture:

*   **Frontend**: A React application built with TypeScript, providing a rich user interface.
*   **Backend**: A Node.js application using Express.js and TypeScript, serving as a RESTful API.
*   **Database**: PostgreSQL for persistent storage of application data.
*   **Cache**: Redis for in-memory data caching.

Data flow:
1.  Frontend sends requests to the Backend API.
2.  Backend processes requests, interacts with PostgreSQL for persistent data, and Redis for caching.
3.  Backend transforms data (e.g., from CSV uploads, or direct DB queries) and sends it back to the Frontend.
4.  Frontend renders interactive visualizations using charting libraries.

[Refer to `docs/architecture.md` for a detailed architecture diagram and explanation.]

## 3. Technology Stack

### Backend
*   **Language**: TypeScript
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **ORM**: TypeORM
*   **Database**: PostgreSQL
*   **Authentication**: JSON Web Tokens (JWT) with `passport.js`
*   **Validation**: `Joi`
*   **Logging**: `Winston`
*   **Caching**: `Redis` (via `ioredis`)
*   **Rate Limiting**: `express-rate-limit`
*   **Testing**: `Jest`, `Supertest`
*   **Linter/Formatter**: ESLint, Prettier

### Frontend
*   **Language**: TypeScript
*   **Framework**: React
*   **State Management**: React Context API (with `useReducer` for complex states)
*   **Styling**: Tailwind CSS (or simple CSS modules for brevity)
*   **Charting Library**: Nivo (built on D3.js)
*   **API Client**: Axios
*   **Routing**: `react-router-dom`
*   **Testing**: `Jest`, `@testing-library/react`
*   **Linter/Formatter**: ESLint, Prettier

### DevOps & Tools
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions
*   **API Documentation**: OpenAPI (Swagger UI)

## 4. Setup and Installation

### Prerequisites

*   Node.js (v18 or higher)
*   npm (v9 or higher) or Yarn (v1.x or v3.x)
*   Docker & Docker Compose (optional, but recommended)
*   Git

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/datavizpro.git
    cd datavizpro
    ```

2.  **Environment Variables:**
    Create a `.env` file in the project root (`./.env`) based on `.env.example`. This file will be used by `docker-compose`. Also, create `.env` files in `backend/.env` and `frontend/.env` based on their respective `.env.example` files.

    Example `backend/.env`:
    ```env
    NODE_ENV=development
    PORT=5000
    DATABASE_URL="postgresql://user:password@localhost:5432/datavizpro_db" # If running postgres locally, otherwise docker-compose will handle
    JWT_SECRET=supersecretjwtkey
    JWT_EXPIRATION_TIME=1h
    REFRESH_TOKEN_SECRET=supersecretrefreshkey
    REFRESH_TOKEN_EXPIRATION_TIME=7d
    REDIS_HOST=localhost
    REDIS_PORT=6379
    RATE_LIMIT_WINDOW_MS=60000 # 1 minute
    RATE_LIMIT_MAX_REQUESTS=100
    LOG_LEVEL=info
    ```
    Example `frontend/.env`:
    ```env
    REACT_APP_API_BASE_URL=http://localhost:5000/api
    ```

3.  **Backend Setup:**
    ```bash
    cd backend
    npm install # or yarn
    npm run typeorm migration:run # Apply database migrations
    npm run seed # (Optional) Seed initial data
    cd ..
    ```

4.  **Frontend Setup:**
    ```bash
    cd frontend
    npm install # or yarn
    cd ..
    ```

### Docker Setup (Recommended for production-like environment)

1.  **Ensure Docker Desktop is running.**

2.  **Build and run the containers:**
    ```bash
    docker-compose up --build
    ```
    This will:
    *   Build Docker images for the backend and frontend.
    *   Start a PostgreSQL container.
    *   Start a Redis container.
    *   Run database migrations automatically (via `command` in `docker-compose.yml`).
    *   Start the backend server (on `http://localhost:5000`).
    *   Start the frontend development server (on `http://localhost:3000`).

## 5. Running the Application

### Locally (without Docker)

1.  **Start Backend:**
    ```bash
    cd backend
    npm start # Or npm run dev for watch mode
    ```
    The backend API will be available at `http://localhost:5000/api`.

2.  **Start Frontend:**
    ```bash
    cd frontend
    npm start
    ```
    The frontend application will be available at `http://localhost:3000`.

### With Docker

Follow the Docker Setup instructions above. The applications will be available at:
*   Frontend: `http://localhost:3000`
*   Backend API: `http://localhost:5000/api`

## 6. Database

*   **Type**: PostgreSQL
*   **ORM**: TypeORM
*   **Migrations**: Managed via TypeORM CLI. New migrations can be generated using `npm run typeorm migration:generate src/migrations/YourMigrationName` (from `backend` directory).
*   **Seed Data**: Located in `backend/seeds`. Run with `npm run seed`.

## 7. Testing

The project includes comprehensive tests:

*   **Unit Tests**: For individual functions, services, and utilities. (`backend/tests/unit`, `frontend/src/**/*.test.tsx`)
*   **Integration Tests**: For backend controllers and database interactions. (`backend/tests/integration`)
*   **API Tests**: End-to-end tests for API endpoints using `Supertest`. (`backend/tests/api`)
*   **Performance Tests**: (Conceptual) Outline for using `k6`.

To run tests:
*   **Backend:**
    ```bash
    cd backend
    npm test
    npm run test:coverage # For coverage report
    ```
*   **Frontend:**
    ```bash
    cd frontend
    npm test
    npm run test:coverage # For coverage report
    ```

## 8. API Documentation

The backend API is documented using OpenAPI Specification (Swagger).
*   The specification file is located at `docs/api.yaml`.
*   When the backend is running, you can access the Swagger UI at `http://localhost:5000/api-docs`.

## 9. Deployment

A detailed deployment guide can be found in `docs/deployment.md`. This guide covers deploying to a cloud provider like AWS, GCP, or Azure using Docker.

## 10. CI/CD

The project includes GitHub Actions workflows for continuous integration and continuous deployment.
*   Configuration: `.github/workflows/ci-cd.yml`
*   On push/PR to `main`: Runs tests, linters, and builds.
*   On merge to `main`: (Configurable) Triggers deployment to a staging/production environment.

## 11. Authentication & Authorization

*   **Authentication**: Leverages JWT (JSON Web Tokens). Users register with email/password. On successful login, an access token (short-lived) and a refresh token (long-lived) are issued. Access token is used for subsequent authenticated requests.
*   **Authorization**: Role-Based Access Control (RBAC). A `User` entity has a `role` field (e.g., `ADMIN`, `USER`). Middleware protects routes based on required roles. For dashboards/charts, ownership is checked.

## 12. Logging & Monitoring

*   **Logging**: `Winston` is used for structured logging in the backend. Logs are outputted to console and can be configured to write to files or external log aggregators.
*   **Monitoring**: Integration with tools like Prometheus/Grafana (conceptual, not implemented directly, but logs are in a format suitable for ingestion).

## 13. Caching

*   **Redis**: Used as an in-memory cache.
*   **Strategy**: Cache-aside pattern. Frequently accessed data (e.g., dashboard configurations, processed chart data) can be stored in Redis to reduce database load and improve response times.
*   Implemented via `backend/src/services/cache.service.ts` and utilized in relevant services.

## 14. Rate Limiting

*   `express-rate-limit` middleware is used to protect against brute-force attacks and abuse.
*   Configured to allow a maximum number of requests within a specified time window per IP address.

## 15. Error Handling

*   A centralized error handling middleware (`backend/src/middleware/errorHandler.middleware.ts`) catches all errors, logs them, and sends appropriate HTTP responses.
*   Custom error classes (`backend/src/utils/appError.ts`) provide more specific error types.

## 16. Future Enhancements

*   Support for more data source types (MySQL, SQL Server, MongoDB, S3).
*   Advanced chart types (e.g., geographical maps, custom D3 charts).
*   Real-time dashboard updates (WebSockets).
*   Data blending from multiple sources.
*   More granular RBAC and sharing options.
*   Drag-and-drop dashboard builder.
*   Advanced query builder for data sources.
*   Internationalization (i18n).

## 17. Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 18. License

[MIT](https://choosealicense.com/licenses/mit/)
```