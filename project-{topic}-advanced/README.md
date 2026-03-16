# Data Visualization Tools System

This is a comprehensive, production-ready data visualization system built with a TypeScript-first approach for both backend (Node.js/Express) and frontend (React). It enables users to connect to data sources, create interactive dashboards, and design various visualizations.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Setup (Manual)](#local-setup-manual)
    *   [Docker Setup (Recommended)](#docker-setup-recommended)
5.  [Running the Application](#running-the-application)
    *   [Running with Docker Compose](#running-with-docker-compose)
    *   [Running Backend Manually](#running-backend-manually)
    *   [Running Frontend Manually](#running-frontend-manually)
6.  [Database Operations](#database-operations)
    *   [Migrations](#migrations)
    *   [Seeding Data](#seeding-data)
7.  [Testing](#testing)
    *   [Backend Tests](#backend-tests)
    *   [Frontend Tests](#frontend-tests)
    *   [Performance Tests](#performance-tests)
8.  [API Endpoints](#api-endpoints)
9.  [Additional Features](#additional-features)
10. [Architecture](#architecture)
11. [Deployment](#deployment)
12. [Contributing](#contributing)
13. [License](#license)

## 1. Features

*   **User Management**: Registration, login, profile management with JWT-based authentication.
*   **Role-Based Authorization**: `user` and `admin` roles.
*   **Data Source Management**: Define and manage connections to various data sources (currently mock CSV files).
*   **Dashboard Creation**: Build and organize multiple dashboards.
*   **Interactive Visualizations**: Add bar, line, and pie charts to dashboards.
*   **Dynamic Data Processing**: Backend-driven data aggregation and transformation for visualizations.
*   **Robust Error Handling**: Centralized error middleware for graceful error responses.
*   **Logging & Monitoring**: Winston-based logging for backend operations.
*   **Rate Limiting**: Protects API from excessive requests.
*   **Caching (Conceptual)**: Redis integration for improved performance.
*   **Containerization**: Full Docker support for easy deployment.
*   **CI/CD Integration**: GitHub Actions for automated testing and deployment previews.

## 2. Technology Stack

*   **Backend**:
    *   Node.js
    *   Express.js
    *   TypeScript
    *   TypeORM (ORM for PostgreSQL)
    *   PostgreSQL (Database)
    *   bcryptjs (Password hashing)
    *   jsonwebtoken (JWT authentication)
    *   Winston (Logging)
    *   Express-rate-limit (Rate limiting)
    *   Cors, Helmet (Security)
    *   Redis (Caching - conceptual)
*   **Frontend**:
    *   React.js
    *   TypeScript
    *   React Router DOM (Routing)
    *   Axios (HTTP client)
    *   Chart.js / React-chartjs-2 (Data visualization library)
    *   Styled Components (CSS-in-JS)
*   **Tools**:
    *   Docker, Docker Compose
    *   Jest, Supertest (Testing)
    *   K6 (Performance Testing - conceptual)
    *   GitHub Actions (CI/CD)

## 3. Project Structure

```
.
├── backend/                  # Node.js/Express TypeScript backend
│   ├── src/
│   │   ├── config/           # Environment variables, DB config
│   │   ├── db/               # Database entities, migrations, seeds, data source
│   │   ├── middleware/       # Auth, error handling, rate limiting
│   │   ├── routes/           # API route definitions
│   │   ├── services/         # Business logic, DB interactions
│   │   ├── controllers/      # Request handlers, call services
│   │   ├── utils/            # Logger, helper functions (e.g., CSV parser)
│   │   ├── tests/            # Unit and integration tests
│   │   ├── types/            # Custom TypeScript types
│   │   ├── app.ts            # Express app configuration
│   │   └── server.ts         # Entry point to start the server
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/                 # React TypeScript frontend
│   ├── public/
│   ├── src/
│   │   ├── api/              # Axios instances and API client functions
│   │   ├── components/       # Reusable UI components (charts, forms)
│   │   ├── contexts/         # React contexts (AuthContext)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Top-level views (Login, Dashboards)
│   │   ├── utils/            # Helper functions, constants
│   │   ├── tests/            # React component tests
│   │   ├── App.tsx           # Main application layout and routing
│   │   └── index.tsx         # React app entry point
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── .github/                  # GitHub Actions CI/CD workflows
│   └── workflows/
│       └── ci-cd.yml
├── docker-compose.yml        # Orchestrates backend, frontend, db, redis
├── README.md                 # Project README
├── ARCHITECTURE.md           # System architecture documentation
├── DEPLOYMENT.md             # Deployment guide
└── PERFORMANCE_TESTING.md    # Performance testing guide
```

## 4. Setup and Installation

### Prerequisites

*   Node.js (v18 or higher) & npm
*   PostgreSQL (if running locally without Docker)
*   Docker & Docker Compose (recommended)
*   Git

### Local Setup (Manual)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/data-viz-system.git
    cd data-viz-system
    ```

2.  **Database Setup:**
    *   Create a PostgreSQL database (e.g., `data_viz_db`).
    *   Ensure your PostgreSQL user has appropriate permissions.

3.  **Backend Setup:**
    ```bash
    cd backend
    cp .env.example .env
    # Edit .env to match your PostgreSQL credentials and JWT_SECRET
    npm install
    npm run build # Compile TypeScript
    ```
    *   Make sure `MOCK_CSV_DATA_PATH` in `.env` points to `src/db/mock_data/sample_data.csv`.

4.  **Run Backend Migrations & Seed Data:**
    ```bash
    npm run migrate:run
    npm run seed # Populate with initial users, data sources, dashboards
    ```

5.  **Frontend Setup:**
    ```bash
    cd ../frontend
    cp .env.example .env
    # Edit .env to point to your backend API (e.g., REACT_APP_API_BASE_URL=http://localhost:5000/api)
    npm install
    ```

### Docker Setup (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/data-viz-system.git
    cd data-viz-system
    ```

2.  **Create `.env` files:**
    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    ```
    *   **Important**: Update `backend/.env` with your desired `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `REDIS_PASSWORD`, and `JWT_SECRET`. The `DB_HOST` for Docker Compose should be `db`, and `REDIS_HOST` should be `redis`.
    *   Update `frontend/.env` with `REACT_APP_API_BASE_URL=http://backend:5000/api` if you are using Docker Compose, or `http://localhost:5000/api` if the backend is running locally and only the frontend is in Docker (less common with compose).

## 5. Running the Application

### Running with Docker Compose

This is the recommended way to run the entire stack.
From the project root directory:

```bash
docker-compose up --build -d
```

*   `-d` runs the services in detached mode.
*   `--build` rebuilds images (useful after code changes).

Once running:
*   **Backend API**: `http://localhost:5000`
*   **Frontend UI**: `http://localhost:3000`
*   **PostgreSQL**: `localhost:5432`
*   **Redis**: `localhost:6379`

You can view logs with `docker-compose logs -f`.

### Running Backend Manually

From the `backend` directory:
```bash
npm run dev # For development with hot-reloading
# or
npm start # For production (after npm run build)
```

### Running Frontend Manually

From the `frontend` directory:
```bash
npm start
```

## 6. Database Operations

### Migrations

*   **Create a new migration**:
    ```bash
    cd backend
    npm run migrate:make --name=YourMigrationName
    ```
*   **Run pending migrations**:
    ```bash
    cd backend
    npm run migrate:run
    ```
*   **Revert the last migration**:
    ```bash
    cd backend
    npm run migrate:revert
    ```

### Seeding Data

To populate your database with initial users, data sources, and dashboards (useful for fresh development environments):
```bash
cd backend
npm run seed
```
This will clear existing data and insert the seed data defined in `src/db/seeds/seed.ts`.

## 7. Testing

### Backend Tests

From the `backend` directory:
```bash
npm test          # Run all tests with coverage
npm run test:watch # Run tests in watch mode
```
*   Tests are configured with Jest and Supertest.
*   Coverage target is 80%+.

### Frontend Tests

From the `frontend` directory:
```bash
npm test          # Run all tests with coverage
```
*   Tests are configured with React Testing Library and Jest.

### Performance Tests

Refer to `PERFORMANCE_TESTING.md` for instructions on how to set up and run performance tests using K6.

## 8. API Endpoints

The backend provides a RESTful API. All protected endpoints require a JWT in the `Authorization: Bearer <token>` header.

**Authentication**
*   `POST /api/auth/register`: Register a new user.
*   `POST /api/auth/login`: Authenticate a user and receive a JWT.
*   `POST /api/auth/register-admin`: Register an admin user (Admin role required).

**Users** (All protected. `admin` role required for `/:id` operations)
*   `GET /api/users/me`: Get current user's profile.
*   `PUT /api/users/me`: Update current user's profile.
*   `DELETE /api/users/me`: Delete current user's profile.
*   `GET /api/users`: Get all users. (Admin only)
*   `GET /api/users/:id`: Get user by ID. (Admin only)
*   `PUT /api/users/:id`: Update user by ID. (Admin only)
*   `DELETE /api/users/:id`: Delete user by ID. (Admin only)

**Data Sources** (Protected)
*   `POST /api/data-sources`: Create a new data source.
    *   Body: `{ name: string, type: "CSV_MOCK", config: { filePath: string } }`
*   `GET /api/data-sources`: Get all data sources owned by the user.
*   `GET /api/data-sources/:id`: Get a specific data source.
*   `PUT /api/data-sources/:id`: Update a data source.
*   `DELETE /api/data-sources/:id`: Delete a data source.
*   `POST /api/data-sources/:id/data`: Fetch and process data from a data source.
    *   Body: `{ query: { aggregate: "sum" | "avg" | "count", valueColumn: string, groupByColumn: string, orderBy?: string } }`

**Dashboards** (Protected)
*   `POST /api/dashboards`: Create a new dashboard.
    *   Body: `{ name: string, description?: string, layout?: any }`
*   `GET /api/dashboards`: Get all dashboards owned by the user.
*   `GET /api/dashboards/:id`: Get a specific dashboard with its visualizations.
*   `PUT /api/dashboards/:id`: Update a dashboard.
*   `DELETE /api/dashboards/:id`: Delete a dashboard.

**Visualizations** (Protected)
*   `POST /api/visualizations`: Create a new visualization.
    *   Body: `{ title: string, type: "BAR_CHART" | "LINE_CHART" | "PIE_CHART", dashboardId: string, dataSourceId: string | null, query: any, config: any, description?: string }`
*   `GET /api/visualizations/:id`: Get a specific visualization.
*   `GET /api/visualizations/dashboard/:dashboardId`: Get all visualizations for a specific dashboard.
*   `PUT /api/visualizations/:id`: Update a visualization.
*   `DELETE /api/visualizations/:id`: Delete a visualization.

## 9. Additional Features

*   **Authentication/Authorization**: Implemented using JWTs, `bcrypt` for password hashing, and middleware for role-based access control.
*   **Logging**: `Winston` is used for structured logging on the backend, with console and file transports.
*   **Error Handling**: A centralized error handling middleware ensures consistent and informative error responses. `CustomError` class for controlled error types.
*   **Caching (Conceptual)**: Redis is included in `docker-compose.yml` and its integration is mentioned in `backend/src/services/dataSourceService.ts` as a potential area for caching fetched data. Actual implementation would involve `node-cache` or `ioredis`.
*   **Rate Limiting**: `express-rate-limit` middleware protects API endpoints from brute-force attacks and abuse.

## 10. Architecture

Refer to `ARCHITECTURE.md` for a detailed overview of the system's architecture.

## 11. Deployment

Refer to `DEPLOYMENT.md` for detailed deployment instructions.

## 12. Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes and write tests.
4.  Commit your changes (`git commit -m 'feat: Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Create a Pull Request.

## 13. License

This project is licensed under the MIT License.