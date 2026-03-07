```markdown
# Data Visualization Tools System

This project is a comprehensive, production-ready data visualization tools system built with a focus on enterprise-grade features, robust architecture, and modern software engineering best practices. It allows users to connect to various data sources, create datasets, design interactive visualizations, and build dynamic dashboards.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Technologies Used](#technologies-used)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Backend Setup](#backend-setup)
    *   [Frontend Setup](#frontend-setup)
    *   [Running with Docker Compose (Recommended)](#running-with-docker-compose-recommended)
5.  [API Endpoints](#api-endpoints)
6.  [Testing](#testing)
    *   [Running Tests](#running-tests)
    *   [Test Coverage](#test-coverage)
7.  [Deployment Guide](#deployment-guide)
8.  [Additional Features](#additional-features)
9.  [Contribution](#contribution)
10. [License](#license)

## 1. Features

*   **User Management:** Secure user registration, login, and profile management with JWT-based authentication and role-based authorization (User, Admin).
*   **Data Source Management:**
    *   Connect to various data sources (PostgreSQL fully implemented, CSV/JSON mock for demonstration).
    *   CRUD operations for data sources.
    *   Test connection functionality.
*   **Dataset Creation:**
    *   Define datasets based on SQL queries or identifiers for connected data sources.
    *   Automatic schema inference from data sources.
    *   CRUD operations for datasets.
    *   Fetch raw data for datasets.
*   **Visualization Builder:**
    *   Create various chart types (Bar, Line, Pie, Scatter, Area, Table, Gauge).
    *   Configure chart properties (x-axis, y-axis, series, colors, titles) using data mapping.
    *   CRUD operations for visualizations.
    *   Fetch transformed data ready for charting.
*   **Dashboard Builder:**
    *   Create interactive dashboards with drag-and-drop layout capabilities.
    *   Add and arrange multiple visualizations on a dashboard.
    *   CRUD operations for dashboards.
*   **Robustness & Observability:**
    *   Centralized error handling middleware.
    *   Request logging with Winston.
    *   Rate limiting to protect against abuse.
    *   In-memory caching (extendable to Redis for production).
*   **Quality:** Extensive unit, integration, and API testing with high coverage goals.

## 2. Architecture

The system follows a microservices-inspired architecture, structured into logical layers:

*   **Client (Frontend):** A React application providing the user interface. It communicates with the Backend API.
*   **API (Backend):** A Node.js (TypeScript) application built with Express.js. It handles business logic, data processing, and interacts with the database and external data sources.
*   **Database:** PostgreSQL is used for persistent storage of application data (users, data sources, datasets, visualizations, dashboards).
*   **Data Services:** A pluggable system to connect to and query various external data sources (e.g., PostgreSQL, CSV, etc.).

```mermaid
graph LR
    A[Frontend: React App] -->|HTTP/REST| B(Backend: Node.js/Express.js API)
    B -->|TypeORM/PG Client| C[Database: PostgreSQL]
    B -->|Dynamic Connectors| D(External Data Source: PostgreSQL, CSV, etc.)
    B -- Auth, Logging, Caching, Rate Limit --> B
    SubGraph Core Backend Modules
        B1(Controllers) --> B2(Services)
        B2 --> B3(Repositories/TypeORM)
        B2 --> B4(Data Processing Utilities)
        B2 --> D
    end
    B --> B1
```

## 3. Technologies Used

**Backend:**
*   **Language:** TypeScript
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **ORM:** TypeORM
*   **Database:** PostgreSQL
*   **Authentication:** JWT (jsonwebtoken), bcryptjs
*   **Validation:** Joi
*   **Logging:** Winston
*   **Caching:** In-memory (extendable to Redis)
*   **Rate Limiting:** express-rate-limit
*   **Security:** Helmet, CORS

**Frontend:**
*   **Framework:** React
*   **UI Library:** Ant Design
*   **Charting Library:** ECharts (via `echarts-for-react`)
*   **Routing:** React Router DOM
*   **State Management:** React Context (for Auth)
*   **API Client:** Axios
*   **Layout:** React Grid Layout

**Development & Operations:**
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions
*   **Testing:** Jest, Supertest
*   **Code Quality:** ESLint

## 4. Setup and Installation

### Prerequisites

*   Node.js (v18+) and npm
*   Docker and Docker Compose
*   Git

### Backend Setup (Manual - if not using Docker Compose)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/data-viz-system.git
    cd data-viz-system
    ```
2.  **Navigate to the backend directory:**
    ```bash
    cd src
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
4.  **Create a `.env` file:**
    Copy the `.env.example` file and rename it to `.env`. Update the environment variables as needed, especially `DB_PASSWORD` and `JWT_SECRET`.
    ```bash
    cp .env.example .env
    ```
5.  **Set up PostgreSQL Database:**
    You need a running PostgreSQL instance. You can use Docker:
    ```bash
    docker run --name data-viz-pg -e POSTGRES_DB=datavizdb -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:14-alpine
    ```
    Ensure `DB_HOST` in your `.env` is `localhost` if running Postgres directly on your machine.
6.  **Run Migrations:**
    ```bash
    npm run migration:run
    ```
7.  **Seed Database (Optional, for initial data):**
    ```bash
    npm run seed:run
    ```
8.  **Start the backend server:**
    ```bash
    npm run dev
    # Or for production build
    # npm run build
    # npm start
    ```
    The backend will run on `http://localhost:5000`.

### Frontend Setup (Manual - if not using Docker Compose)

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Create a `.env` file:**
    Copy the `.env.example` file (which should be at `frontend/.env.example`) and rename it to `.env`. Ensure `REACT_APP_API_BASE_URL` points to your backend:
    ```bash
    cp .env.example .env # Or manually create frontend/.env
    # Add to frontend/.env:
    # REACT_APP_API_BASE_URL=http://localhost:5000/api
    ```
4.  **Start the frontend development server:**
    ```bash
    npm start
    ```
    The frontend will run on `http://localhost:3000`.

### Running with Docker Compose (Recommended)

This is the easiest way to get the entire system up and running.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/data-viz-system.git
    cd data-viz-system
    ```
2.  **Create `.env` file:**
    Create a `.env` file in the root directory (same level as `docker-compose.yml`). Copy the contents of `backend/.env.example` and `frontend/.env.example` into it, making sure to define all variables.
    ```bash
    cp .env.example ./.env
    # Ensure all backend/frontend env vars from their respective .env.example files are in the root .env
    ```
    *Make sure to set `DB_HOST=db` for the backend in the `.env` file, as `db` is the service name within the Docker network.*
3.  **Build and run all services:**
    ```bash
    docker-compose up --build
    ```
    This command will:
    *   Build the backend and frontend Docker images.
    *   Start the PostgreSQL database service.
    *   Run TypeORM migrations and seed data on the backend.
    *   Start the backend API server.
    *   Start the frontend development server.

    The application will be available at `http://localhost:3000`. The backend API will be available at `http://localhost:5000/api`.

    To run in detached mode (background):
    ```bash
    docker-compose up -d --build
    ```
    To stop all services:
    ```bash
    docker-compose down
    ```

## 5. API Endpoints

The API is exposed at `http://localhost:5000/api`. All authenticated endpoints require a `Bearer <TOKEN>` in the `Authorization` header.

### Authentication

*   `POST /api/auth/register` - Register a new user.
    *   **Body:** `{ "email": "string", "password": "string", "role"?: "user" | "admin" }`
*   `POST /api/auth/login` - Log in an existing user.
    *   **Body:** `{ "email": "string", "password": "string" }`
*   `GET /api/auth/me` - Get current authenticated user's profile. (Authenticated)

### Data Sources

*   `POST /api/data-sources` - Create a new data source. (Authenticated)
*   `GET /api/data-sources` - Get all data sources for the current user. (Authenticated)
*   `GET /api/data-sources/:id` - Get a data source by ID. (Authenticated)
*   `PUT /api/data-sources/:id` - Update a data source. (Authenticated)
*   `DELETE /api/data-sources/:id` - Delete a data source. (Authenticated)
*   `GET /api/data-sources/:id/test-connection` - Test connection to a data source. (Authenticated)

### Datasets

*   `POST /api/datasets` - Create a new dataset. (Authenticated)
*   `GET /api/datasets` - Get all datasets for the current user's data sources. (Authenticated)
*   `GET /api/datasets/:id` - Get a dataset by ID. (Authenticated)
*   `PUT /api/datasets/:id` - Update a dataset. (Authenticated)
*   `DELETE /api/datasets/:id` - Delete a dataset. (Authenticated)
*   `GET /api/datasets/:id/data` - Get raw data for a dataset. (Authenticated, supports `limit`, `offset`, `sortBy`, `sortOrder`, `filters` query params)

### Visualizations

*   `POST /api/visualizations` - Create a new visualization. (Authenticated)
*   `GET /api/visualizations` - Get all visualizations for the current user. (Authenticated)
*   `GET /api/visualizations/:id` - Get a visualization by ID. (Authenticated)
*   `PUT /api/visualizations/:id` - Update a visualization. (Authenticated)
*   `DELETE /api/visualizations/:id` - Delete a visualization. (Authenticated)
*   `GET /api/visualizations/:id/data` - Get transformed data for a visualization, ready for charting. (Authenticated, supports `limit`, `offset`, `sortBy`, `sortOrder`, `filters` query params)

### Dashboards

*   `POST /api/dashboards` - Create a new dashboard. (Authenticated)
*   `GET /api/dashboards` - Get all dashboards for the current user. (Authenticated)
*   `GET /api/dashboards/:id` - Get a dashboard by ID, including its visualizations. (Authenticated)
*   `PUT /api/dashboards/:id` - Update a dashboard. (Authenticated)
*   `DELETE /api/dashboards/:id` - Delete a dashboard. (Authenticated)
*   `POST /api/dashboards/:id/visualizations` - Add a visualization to a dashboard.
    *   **Body:** `{ "visualizationId": "string" }` (Authenticated)
*   `DELETE /api/dashboards/:id/visualizations/:visualizationId` - Remove a visualization from a dashboard. (Authenticated)

## 6. Testing

The project includes a comprehensive testing suite.

### Running Tests

1.  **Backend Tests:**
    Navigate to the `src` directory and run:
    ```bash
    npm test
    ```
    This runs unit, integration, and API tests.
    For watching tests during development:
    ```bash
    npm run test:watch
    ```
2.  **Frontend Tests:**
    Navigate to the `frontend` directory and run:
    ```bash
    npm test
    ```
    (Note: Frontend tests are typically for components and utilities, not full E2E interactions for this scope).

### Test Coverage

The backend tests aim for 80%+ code coverage for branches, functions, lines, and statements, as configured in `jest.config.ts`. After running tests, a `coverage/` directory will be generated with detailed reports.

## 7. Deployment Guide

The recommended deployment strategy involves Docker and Docker Compose.

1.  **Prepare your Server:**
    *   Ensure Docker and Docker Compose are installed.
    *   Create a dedicated user and directory for your application.
    *   Install Nginx (or another reverse proxy) for SSL termination and request forwarding to your Docker containers.

2.  **Environment Variables:**
    *   On your production server, create a `.env` file in the root of your project directory (same level as `docker-compose.yml`).
    *   **Crucially**, set `NODE_ENV=production`.
    *   **Generate strong, unique secrets:** `JWT_SECRET`.
    *   Configure `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` appropriately.
    *   Set `DB_SYNCHRONIZE=false` in production. Migrations should be run manually or via a CI/CD step.
    *   Set `FRONTEND_URL` to your production frontend URL.
    *   **Important:** `DB_LOGGING=false` for performance.

3.  **CI/CD Deployment (GitHub Actions):**
    The `.github/workflows/ci-cd.yml` file is configured for automated deployment:
    *   `develop` branch pushes trigger deployment to a `Staging` environment.
    *   `main` branch pushes trigger deployment to a `Production` environment.
    *   You'll need to configure GitHub Secrets for `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `STAGING_HOST`, `STAGING_USERNAME`, `STAGING_SSH_KEY`, `PRODUCTION_HOST`, `PRODUCTION_USERNAME`, `PRODUCTION_SSH_KEY`.
    *   The workflow builds Docker images, pushes them to Docker Hub (or a private registry), and then uses SSH to connect to your server, pull the latest images, and restart the services using `docker-compose`.

4.  **Manual Deployment (without CI/CD):**
    *   SSH into your server.
    *   Navigate to your project directory.
    *   Pull the latest code: `git pull origin main`.
    *   Make sure your `.env` file is correctly configured for production.
    *   Run `docker-compose up -d --build`. This will rebuild images (if `--build` is used), pull if necessary, and restart services.
    *   After deployment, it's good practice to clear old Docker images: `docker system prune -f`.

5.  **Reverse Proxy (Nginx Example):**
    Configure Nginx to proxy requests to your frontend (port 3000) and API (port 5000) containers. This handles SSL/TLS termination, static file serving, and load balancing.

    ```nginx
    # /etc/nginx/sites-available/yourdomain.com
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL Configuration (using Certbot for example)
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
        ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;

        location /api/ {
            proxy_pass http://localhost:5000/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location / {
            proxy_pass http://localhost:3000; # Frontend container
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```

## 8. Additional Features

*   **Authentication/Authorization:** JWT-based authentication for securing API endpoints. Role-based authorization (`UserRole.USER`, `UserRole.ADMIN`) restricts access to certain actions.
*   **Logging and Monitoring:** `Winston` is used for structured logging, allowing easy integration with log aggregation services. `requestLogger` middleware tracks incoming requests.
*   **Error Handling Middleware:** A global error handler (`errorHandler`) catches all application errors, distinguishes between operational and programming errors, and sends appropriate responses. A `notFoundHandler` catches 404 routes.
*   **Caching Layer:** An in-memory cache (`cacheMiddleware`) is implemented for GET requests to improve performance by reducing database hits for frequently accessed immutable data. This can be easily replaced with Redis for a distributed cache in production. `clearCache` is used on POST/PUT/DELETE to invalidate relevant cache entries.
*   **Rate Limiting:** `express-rate-limit` middleware prevents abuse and protects the API from brute-force attacks by limiting the number of requests a user can make within a specified time window.

## 9. Contribution

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes and ensure tests pass.
4.  Commit your changes (`git commit -m 'feat: Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Create a Pull Request.

## 10. License

This project is licensed under the MIT License.
```