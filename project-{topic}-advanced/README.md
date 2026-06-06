# Data Visualization Platform

A comprehensive, production-ready data visualization tools system built with a full-stack TypeScript (Node.js/Express, React) application, PostgreSQL database, and enterprise-grade features.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Environment Variables](#environment-variables)
    *   [Local Development with Docker Compose](#local-development-with-docker-compose)
    *   [Manual Setup (Backend)](#manual-setup-backend)
    *   [Manual Setup (Frontend)](#manual-setup-frontend)
5.  [Running Migrations and Seeding Data](#running-migrations-and-seeding-data)
6.  [Running Tests](#running-tests)
7.  [API Documentation](#api-documentation)
8.  [Architecture](#architecture)
9.  [Deployment](#deployment)
10. [Future Enhancements](#future-enhancements)
11. [Contributing](#contributing)
12. [License](#license)

## 1. Features

*   **User Management**: Register, login, and manage users with role-based access control (Admin, Editor, Viewer).
*   **Data Source Management**: Connect to various data sources (PostgreSQL, MySQL (planned), CSV Upload) securely.
*   **Interactive Chart Editor**: Create and configure different chart types (Bar, Line, Pie, Table) using ECharts.
*   **Dynamic Dashboards**: Build customizable dashboards by arranging and resizing charts using a drag-and-drop interface.
*   **Authentication & Authorization**: JWT-based authentication with protected routes.
*   **Data Processing**: Backend logic for executing queries against data sources and returning results.
*   **Caching**: Redis-based caching for frequently accessed data to improve performance.
*   **Error Handling**: Centralized error handling middleware.
*   **Logging & Monitoring**: Winston-based logging for application activity and errors.
*   **Rate Limiting**: Protects API from abuse.
*   **Comprehensive Testing**: Unit, Integration, and API tests.
*   **Deployment Ready**: Docker setup and CI/CD pipeline configuration.

## 2. Technology Stack

*   **Backend**: Node.js, Express.js, TypeScript
*   **Database**: PostgreSQL
*   **ORM**: TypeORM
*   **Caching**: Redis (via `ioredis`)
*   **Authentication**: JWT (JSON Web Tokens), `bcryptjs` for password hashing
*   **Frontend**: React, TypeScript, Tailwind CSS (for styling)
*   **Charting Library**: ECharts
*   **Layout**: `react-grid-layout`, `react-resizable`
*   **HTTP Client**: Axios
*   **Testing**: Jest, Supertest, React Testing Library
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions
*   **Logging**: Winston
*   **API Documentation**: Swagger/OpenAPI

## 3. Project Structure

(Refer to the detailed project structure at the beginning of the document)

## 4. Setup and Installation

### Prerequisites

*   Node.js (v18 or higher)
*   npm (v8 or higher)
*   Docker and Docker Compose (recommended)
*   PostgreSQL (if not using Docker)
*   Redis (if not using Docker)

### Environment Variables

Create a `.env` file in the project root directory based on `.env.example`.

```dotenv
# .env (example content, replace with your actual values)
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
ENCRYPTION_KEY=THIS_IS_A_VERY_STRONG_32_CHAR_SECRET_KEY # IMPORTANT: Must be exactly 32 random characters
JWT_SECRET=supersecretjwtkeythatshouldbeverylongandrandom
JWT_EXPIRES_IN=1h
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=dataviz_db
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```
**Important Security Note**: The `ENCRYPTION_KEY` and `JWT_SECRET` should be strong, randomly generated strings, and *never* committed to version control. Use a secure method for managing secrets in production environments (e.g., environment variables, secret management services).

### Local Development with Docker Compose (Recommended)

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/data-viz-platform.git
    cd data-viz-platform
    ```
2.  **Create `.env` file**: Copy `.env.example` to `.env` and fill in your values. For Docker Compose, `DB_HOST` will be `db` and `REDIS_URL` will be `redis://redis:6379` within the Docker network, but for client-side API calls, `DB_HOST` and `REDIS_URL` would refer to the exposed ports.
    *   For the server's `.env`, when running *inside* docker-compose, `DB_HOST=db` and `REDIS_URL=redis://redis:6379`.
    *   The `docker-compose.yml` file handles passing these environment variables to the server container.
3.  **Build and run Docker containers**:
    ```bash
    docker-compose up --build
    ```
    This will:
    *   Build the `server` and `client` Docker images.
    *   Start PostgreSQL and Redis containers.
    *   Run database migrations and seed data on the `server` container (check `docker-compose.yml` `command`).
    *   Start the backend on `http://localhost:5000`.
    *   Start the frontend on `http://localhost:3000`.

### Manual Setup (Backend)

1.  **Navigate to the server directory**:
    ```bash
    cd data-viz-platform/server
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Set up PostgreSQL and Redis**:
    *   Ensure PostgreSQL is running on `DB_PORT` (default 5432) and Redis on `6379`.
    *   Create the database specified in `DB_NAME` (e.g., `dataviz_db`).
4.  **Run migrations**:
    ```bash
    npm run migration:run
    ```
5.  **Seed initial data (optional but recommended)**:
    ```bash
    npm run seed
    ```
6.  **Start the server in development mode**:
    ```bash
    npm run dev
    ```
    The backend API will be available at `http://localhost:5000`.

### Manual Setup (Frontend)

1.  **Navigate to the client directory**:
    ```bash
    cd data-viz-platform/client
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Start the React development server**:
    ```bash
    npm start
    ```
    The frontend application will be available at `http://localhost:3000`.

## 5. Running Migrations and Seeding Data

From the `server` directory:

*   **Run migrations**: `npm run migration:run`
*   **Revert last migration**: `npm run migration:revert`
*   **Create a new migration**: `npm run migration:create --name=YourMigrationName`
*   **Seed data**: `npm run seed`

## 6. Running Tests

### Backend Tests

From the `server` directory:

*   **Unit & Integration Tests**: `npm test`
*   **With Coverage Report**: `npm run test:coverage`

**Note**: Backend tests require a separate PostgreSQL database configured via environment variables (`TEST_DB_HOST`, `TEST_DB_PORT`, etc.) to ensure a clean state for each test run. The `server/tests/setup.ts` handles dropping and syncing the schema for this test database. Ensure your local PostgreSQL can accept connections on the configured test port.

### Frontend Tests

From the `client` directory:

*   **Unit Tests (React Components)**: `npm test`

### Performance Tests

Performance tests are typically run using tools like [Artillery](https://www.artillery.io/).

1.  **Install Artillery**: `npm install -g artillery`
2.  **Configure `.env`**: Ensure your server is running (e.g., via Docker Compose) and accessible.
3.  **Run a sample load test**: (Example in `server/docs/artillery_dashboard_load.yml` - conceptual, create this file yourself)
    ```bash
    artillery run server/docs/artillery_dashboard_load.yml
    ```
    *This requires a `dashboard_id_from_seed` and `chart_id_from_seed` that exist in your test environment, populate them in the Artillery config manually after seeding data.*

## 7. API Documentation

The backend API is documented using Swagger (OpenAPI).

1.  **Generate Swagger JSON**:
    Navigate to `server` directory and run:
    ```bash
    npm run swagger-autogen
    ```
    This will generate `server/docs/api.json`.
2.  **Access Swagger UI**:
    Once the backend server is running (either manually or via Docker), navigate to:
    `http://localhost:5000/api-docs`
    You can explore all available endpoints, their request/response schemas, and even test them directly from the UI.

## 8. Architecture

(Refer to `docs/ARCHITECTURE.md` for a detailed architecture overview)

## 9. Deployment

(Refer to `docs/DEPLOYMENT.md` for a detailed deployment guide)

## 10. Future Enhancements

*   **More Data Source Types**: MySQL, SQL Server, MongoDB, Google Sheets, S3 (for CSV/Parquet).
*   **Advanced Charting Options**: More granular control over chart configurations, custom chart types.
*   **Real-time Dashboards**: WebSockets for live data updates.
*   **Data Transformation**: ETL capabilities within the platform.
*   **User Collaboration**: Sharing dashboards with specific users/groups, commenting.
*   **Alerting**: Set up alerts based on data thresholds.
*   **Query Builder UI**: Visual query builder for non-SQL users.
*   **Version Control for Dashboards/Charts**: History and rollback.
*   **Theming**: Customizable dashboard themes.

## 11. Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write tests for your changes.
5.  Ensure all tests pass (`npm test` in both client and server).
6.  Commit your changes (`git commit -m 'feat: Add new feature'`).
7.  Push to the branch (`git push origin feature/your-feature-name`).
8.  Open a Pull Request.

## 12. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.