```markdown
# SQLInsight Pro: Database Optimization System

SQLInsight Pro is a full-stack, enterprise-grade web application designed to help developers and DBAs monitor, analyze, and optimize slow SQL queries. It provides insights into query performance, offers intelligent suggestions for improvement, and visualizes query execution plans.

## Table of Contents

1.  [Features](#features)
2.  [Technologies Used](#technologies-used)
3.  [Architecture](#architecture)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Environment Variables](#environment-variables)
    *   [Docker Compose Setup (Recommended)](#docker-compose-setup-recommended)
    *   [Manual Setup (Backend)](#manual-setup-backend)
    *   [Manual Setup (Frontend)](#manual-setup-frontend)
5.  [Running the Application](#running-the-application)
6.  [Database Management](#database-management)
7.  [Testing](#testing)
8.  [API Documentation](#api-documentation)
9.  [Deployment Guide](#deployment-guide)
10. [Contribution](#contribution)
11. [License](#license)

## 1. Features

*   **Query Reporting API:** Dedicated endpoint for client applications to report slow SQL queries with metadata (execution time, application, hostname, database ID).
*   **Intelligent Query Analysis:**
    *   Simulated `EXPLAIN` plan generation for reported queries.
    *   Rule-based analysis to identify common anti-patterns (e.g., `SELECT *`, missing `WHERE` clauses, functions on indexed columns, leading wildcards in `LIKE`).
    *   Suggests actionable optimizations (e.g., index creation, query rewrites).
*   **Interactive Dashboard:** Overview of system health, total slow queries, monitored databases, and average query execution times.
*   **Query Listing & Detail View:** Paginated list of slow queries with detailed views showing the query, execution plan, and all generated suggestions.
*   **Suggestion Management:** Mark suggestions as "Applied" or "Dismissed" with optional feedback.
*   **Database Management:** Register, view, update, and delete databases to monitor.
*   **User Management & Authentication:**
    *   JWT-based authentication (register, login, logout).
    *   Role-based authorization (Admin, User) for accessing different features and data.
*   **Logging & Monitoring:** Centralized logging with Winston, basic health checks.
*   **Error Handling:** Robust middleware for consistent API error responses.
*   **Caching:** Redis integration (conceptual) for improving performance of frequently accessed data or user sessions.
*   **Rate Limiting:** Protects API endpoints from abuse.

## 2. Technologies Used

**Backend:**
*   **Node.js:** JavaScript runtime.
*   **Express.js:** Web framework.
*   **TypeScript:** Type-safe JavaScript.
*   **TypeORM:** ORM for database interaction.
*   **PostgreSQL:** Relational database.
*   **Redis:** In-memory data store for caching/sessions.
*   **bcryptjs:** Password hashing.
*   **jsonwebtoken:** JWT implementation.
*   **dotenv:** Environment variable management.
*   **winston:** Logging library.
*   **yup:** Schema validation.
*   **lodash:** Utility library.

**Frontend:**
*   **React:** JavaScript library for building user interfaces.
*   **TypeScript:** Type-safe JavaScript.
*   **Material-UI (MUI):** React UI framework.
*   **Axios:** HTTP client.
*   **react-router-dom:** For routing.
*   **js-cookie:** For client-side cookie management.
*   **react-toastify:** For notifications.
*   **highlight.js:** For syntax highlighting.

**Infrastructure:**
*   **Docker:** Containerization.
*   **Docker Compose:** For orchestrating multi-container Docker applications.
*   **Nginx:** Web server (for serving frontend).

**Testing:**
*   **Jest:** JavaScript testing framework (unit tests).
*   **Supertest:** HTTP assertion library (integration/API tests).
*   **React Testing Library:** For React component testing.
*   **Artillery (Conceptual):** For performance testing.

**CI/CD:**
*   **GitHub Actions (Configuration provided):** Automated build, test, and deployment workflows.

## 3. Architecture

The system follows a microservice-like architecture (monorepo structure for convenience) with a clear separation of concerns:

*   **Frontend:** A React application responsible for the user interface, interacting with the backend API.
*   **Backend API:** A Node.js/Express application handling all business logic, data persistence, authentication, and query analysis.
*   **Database (PostgreSQL):** Stores all application data (users, databases, slow queries, plans, suggestions).
*   **Cache (Redis):** Used for fast data retrieval and potentially session management.

```mermaid
graph TD
    User -->|Views/Interacts| Frontend(React App)
    Frontend -->|API Calls (HTTP/S)| Backend(Node.js/Express API)

    subgraph Backend Services
        Auth_Module[Auth Module]
        User_Module[User Module]
        DB_Mgmt_Module[Database Management Module]
        Query_Module[Query Module]
        Analysis_Engine[Query Analysis Engine]
        Logging_Service[Logging Service]
        Cache_Service[Caching Service (Redis Client)]
        Error_Handling[Error Handling Middleware]
        Rate_Limiting[Rate Limiting Middleware]
    end

    Backend -->|CRUD| PostgreSQL(Database)
    Backend -->|Read/Write| Redis(Cache)
    Client_Apps(Client Applications) -->|Report Slow Queries (HTTP/S)| Backend

    style Frontend fill:#f9f,stroke:#333,stroke-width:2px
    style Backend fill:#ccf,stroke:#333,stroke-width:2px
    style PostgreSQL fill:#cfc,stroke:#333,stroke-width:2px
    style Redis fill:#ffc,stroke:#333,stroke-width:2px
    style Client_Apps fill:#f9f,stroke:#333,stroke-width:2px
```

## 4. Setup and Installation

### Prerequisites

*   Node.js (v18+) and npm/yarn
*   Docker and Docker Compose
*   PostgreSQL (if not using Docker)
*   Redis (if not using Docker)

### Environment Variables

Both `backend` and `frontend` directories contain an `.env.example` file. Copy this file to `.env` in the respective directories and populate the values.

**`backend/.env`:**
```dotenv
# Application Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000 # Must match frontend's access URL

# JWT Configuration (generate strong keys for production!)
JWT_SECRET=your_super_secret_jwt_key_here_please_change_this_in_production_!!!
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_REFRESH_EXPIRATION_DAYS=7

# Database Configuration (PostgreSQL)
DB_HOST=db # Use 'db' if running inside docker-compose network, 'localhost' otherwise
DB_PORT=5432
DB_USER=sqlinsight
DB_PASSWORD=sqlinsight
DB_NAME=sqlinsight_db
DB_SYNCHRONIZE=false # Set to false in production, true for quick dev setup if no migrations
DB_LOGGING=false

# Redis Configuration
REDIS_HOST=redis # Use 'redis' if running inside docker-compose network, 'localhost' otherwise
REDIS_PORT=6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

**`frontend/.env`:**
```dotenv
REACT_APP_API_URL=http://localhost:5000/api/v1 # Points to your backend API
```
**Important:** When running with Docker Compose, `DB_HOST` should be `db` and `REDIS_HOST` should be `redis` (the service names). If running backend manually and connecting to a local PostgreSQL/Redis, use `localhost`.

### Docker Compose Setup (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/sql-insight-pro.git
    cd sql-insight-pro
    ```
2.  **Create `.env` files:**
    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    ```
    Adjust variables as needed (especially `JWT_SECRET`).
3.  **Build and run the Docker containers:**
    This command will build the images (if not already built), create the necessary volumes, and start all services (PostgreSQL, Redis, Backend, Frontend). The backend will automatically run migrations and seed the database on first startup.
    ```bash
    docker-compose up --build -d
    ```
4.  **Verify services:**
    ```bash
    docker-compose ps
    ```
    You should see `db`, `redis`, `backend`, and `frontend` running.

5.  **Access the application:**
    *   **Frontend:** `http://localhost:3000`
    *   **Backend API:** `http://localhost:5000/api/v1` (for testing with Postman/Insomnia)

### Manual Setup (Backend)

Only perform this if you prefer not to use Docker Compose for the backend. You'll need local PostgreSQL and Redis instances running.

1.  **Navigate to the backend directory:**
    ```bash
    cd sql-insight-pro/backend
    ```
2.  **Install dependencies:**
    ```bash
    yarn install
    # or
    npm install
    ```
3.  **Create `.env` file:**
    ```bash
    cp .env.example .env
    ```
    Update `DB_HOST` and `REDIS_HOST` to `localhost` if running local services.
4.  **Run migrations:**
    ```bash
    npm run migrate:run
    ```
5.  **Seed the database (optional, for initial data):**
    ```bash
    npm run seed:run
    ```
6.  **Build TypeScript:**
    ```bash
    npm run build
    ```
7.  **Start the backend server:**
    ```bash
    npm start
    # For development with hot-reloading:
    # npm run dev
    ```

### Manual Setup (Frontend)

Only perform this if you prefer not to use Docker Compose for the frontend.

1.  **Navigate to the frontend directory:**
    ```bash
    cd sql-insight-pro/frontend
    ```
2.  **Install dependencies:**
    ```bash
    yarn install
    # or
    npm install
    ```
3.  **Create `.env` file:**
    ```bash
    cp .env.example .env
    ```
    Ensure `REACT_APP_API_URL` points to your running backend (e.g., `http://localhost:5000/api/v1`).
4.  **Start the frontend development server:**
    ```bash
    npm start
    ```
    The application should open in your browser at `http://localhost:3000`.

## 5. Running the Application

After successful setup (preferably with Docker Compose):

1.  Open your browser and navigate to `http://localhost:3000`.
2.  You will be redirected to the login page.
3.  Use the seeded credentials:
    *   **Admin User:** `admin@example.com` / `adminpassword`
    *   **Regular User:** `user@example.com` / `userpassword`
4.  Explore the Dashboard, Queries, Databases, and (for admin) User Management sections.
5.  You can manually "report" a slow query by sending a POST request to `/api/v1/queries/slow` using Postman/Insomnia or a custom script, referencing an existing `databaseId`.

## 6. Database Management

*   **Migrations:**
    *   Create a new migration: `npm run migrate:make --name=YourMigrationName` (from `backend/` directory)
    *   Run pending migrations: `npm run migrate:run`
    *   Revert last migration: `npm run migrate:revert`
*   **Seeding:**
    *   Run seed scripts: `npm run seed:run` (from `backend/` directory)
    *   *Note*: The Docker Compose setup runs migrations and seeds on startup. For production, manage seeding carefully.

## 7. Testing

Tests are located in the `backend/tests` and `frontend/src/**/*.test.tsx` directories.

**Backend Tests:**
1.  Navigate to `backend/`
2.  Run all tests: `npm test` (includes unit and integration tests)
3.  Run tests in watch mode: `npm run test:watch`

**Frontend Tests:**
1.  Navigate to `frontend/`
2.  Run all tests: `npm test`

**Performance Tests (Conceptual):**
Using Artillery, refer to the `artillery.yml` and `artillery_processor.js` examples. You would need to:
1.  Ensure your backend is running.
2.  Update `artillery.yml` with valid `databaseId` for reporting queries.
3.  Run: `artillery run artillery.yml`

## 8. API Documentation

The backend exposes a RESTful API. Below are the primary endpoints. For a full, interactive OpenAPI/Swagger documentation, you would typically integrate a library like `swagger-ui-express`.

**Base URL:** `http://localhost:5000/api/v1`

---

### Authentication

*   `POST /auth/register`
    *   **Body:** `{ email, password, role? }`
    *   **Response:** `{ success, data: { user, accessToken, refreshToken } }`
*   `POST /auth/login`
    *   **Body:** `{ email, password }`
    *   **Response:** `{ success, data: { user, accessToken, refreshToken } }`
*   `POST /auth/logout` (Authenticated)
    *   **Response:** `{ success, message }`
*   `GET /auth/me` (Authenticated)
    *   **Response:** `{ success, data: { user } }`

---

### User Management (Admin Only)

*   `GET /users` (Authenticated, Admin)
    *   **Response:** `{ success, data: User[] }`
*   `GET /users/:id` (Authenticated)
    *   **Response:** `{ success, data: User }`
*   `PUT /users/:id` (Authenticated, Admin or User updating self)
    *   **Body:** `{ email?, role? }`
    *   **Response:** `{ success, message, data: User }`
*   `DELETE /users/:id` (Authenticated, Admin)
    *   **Response:** `{ success, message }`

---

### Database Management

*   `POST /databases` (Authenticated)
    *   **Body:** `{ name, type, connectionString, description? }`
    *   **Response:** `{ success, message, data: Database }`
*   `GET /databases` (Authenticated)
    *   **Response:** `{ success, data: Database[] }` (User gets owned DBs, Admin gets all)
*   `GET /databases/:id` (Authenticated)
    *   **Response:** `{ success, data: Database }`
*   `PUT /databases/:id` (Authenticated)
    *   **Body:** `{ name?, type?, connectionString?, description? }`
    *   **Response:** `{ success, message, data: Database }`
*   `DELETE /databases/:id` (Authenticated)
    *   **Response:** `{ success, message }`

---

### Slow Query & Optimization

*   `POST /queries/slow` (No authentication required, for client apps to report)
    *   **Body:** `{ query, executionTimeMs, clientApplication?, clientHostname?, databaseId, reporterId? }`
    *   **Response:** `{ success, message, data: SlowQuery }` (includes generated plans/suggestions)
*   `GET /queries/slow` (Authenticated)
    *   **Query Params:** `page`, `limit`, `databaseId`, `minExecutionTimeMs`, `sortBy`, `sortOrder`
    *   **Response:** `{ success, data: SlowQuery[], meta: { total, page, limit, totalPages } }`
*   `GET /queries/slow/:id` (Authenticated)
    *   **Response:** `{ success, data: SlowQuery (with queryPlans and querySuggestions populated) }`
*   `PATCH /queries/slow/:queryId/suggestions/:suggestionId` (Authenticated)
    *   **Body:** `{ status: 'pending' | 'applied' | 'dismissed', feedback?: string }`
    *   **Response:** `{ success, message, data: QuerySuggestion }`

---

## 9. Deployment Guide

This section outlines conceptual steps for production deployment.

1.  **Containerize:** Ensure your `Dockerfile`s and `docker-compose.yml` are production-ready (e.g., multi-stage builds for smaller images, specific environment configurations).
2.  **Environment Variables:** Securely manage environment variables (e.g., `JWT_SECRET`, database credentials) using your cloud provider's secrets management tools (AWS Secrets Manager, Azure Key Vault, Kubernetes Secrets). Do NOT commit `.env` files to production.
3.  **Database Provisioning:**
    *   Provision a managed PostgreSQL service (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL).
    *   Ensure proper backups, replication, and monitoring are configured.
    *   Run migrations (`npm run migrate:run`) as part of your deployment pipeline, *before* application startup.
4.  **Redis Provisioning:**
    *   Provision a managed Redis service (e.g., AWS ElastiCache, Azure Cache for Redis, Google Cloud Memorystore).
5.  **CI/CD Pipeline:**
    *   Integrate the provided GitHub Actions workflow (or similar for GitLab CI, Jenkins, etc.).
    *   The pipeline should:
        *   Trigger on `push` to `main` or `release` branch.
        *   Build backend and frontend Docker images.
        *   Run tests.
        *   Push images to a container registry (Docker Hub, AWS ECR, GCR).
        *   Deploy updated containers to your chosen infrastructure (ECS, EKS, Azure Container Apps, Google Cloud Run/GKE).
6.  **Infrastructure:**
    *   **Container Orchestration:** Use Kubernetes (EKS, GKE, AKS) or a container service (AWS ECS, Azure Container Apps, Google Cloud Run) for scalability, high availability, and easier management.
    *   **Load Balancing:** Place a load balancer in front of your frontend (and potentially backend) services for traffic distribution and SSL termination.
    *   **Networking:** Configure VPCs, subnets, security groups, and network ACLs for secure communication.
7.  **Monitoring & Alerting:**
    *   Integrate a robust logging solution (e.g., ELK Stack, Datadog, CloudWatch Logs).
    *   Set up application performance monitoring (APM) with tools like New Relic, Datadog, or Prometheus/Grafana.
    *   Configure alerts for critical errors, high latency, or resource exhaustion.
8.  **Security Best Practices:**
    *   Regularly update dependencies.
    *   Scan Docker images for vulnerabilities.
    *   Enforce HTTPS.
    *   Implement strong password policies.
    *   Regular security audits.

## 10. Contribution

Contributions are welcome! If you find a bug or have an enhancement idea, please open an issue or submit a pull request.

## 11. License

This project is licensed under the ISC License.
```

### `ARCHITECTURE.md`