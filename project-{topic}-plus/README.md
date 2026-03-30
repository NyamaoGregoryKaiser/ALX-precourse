# ScrapeFlow: A Production-Ready Web Scraping Tools System

ScrapeFlow is a full-stack, enterprise-grade web application designed for managing, scheduling, executing, and monitoring web scraping tasks. Built with a robust Node.js/TypeScript backend, a modern React/TypeScript frontend, and backed by PostgreSQL and Redis, it offers a comprehensive solution for data extraction needs.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development with Docker Compose](#local-development-with-docker-compose)
    *   [Manual Setup (Backend)](#manual-setup-backend)
    *   [Manual Setup (Frontend)](#manual-setup-frontend)
5.  [Running the Application](#running-the-application)
6.  [Database Operations](#database-operations)
    *   [Migrations](#migrations)
    *   [Seeding](#seeding)
7.  [Testing](#testing)
    *   [Backend Tests](#backend-tests)
    *   [Frontend Tests](#frontend-tests)
    *   [Performance Tests (Artillery)](#performance-tests-artillery)
8.  [API Documentation](#api-documentation)
9.  [Architecture](#architecture)
10. [Deployment](#deployment)
11. [Contributing](#contributing)
12. [License](#license)

## 1. Features

*   **Scraper Definition**: Create and manage scraper configurations, specifying target URLs, CSS selectors for data extraction, and pagination rules.
*   **Scrape Job Management**: Manually trigger or schedule scraping jobs. Monitor job status (pending, running, completed, failed).
*   **Data Storage**: Extracted data is stored in PostgreSQL as JSONB, allowing flexible querying.
*   **User Management**: Secure user registration, login, and role-based access control (RBAC) with JWT.
*   **Authentication & Authorization**: JWT-based authentication for API security, with middleware for role-based authorization.
*   **Logging & Monitoring**: Comprehensive logging with Winston for application events, errors, and job execution.
*   **Error Handling**: Centralized error handling middleware for consistent API responses.
*   **Caching**: Redis-backed caching for improved API response times.
*   **Rate Limiting**: Protect the API from abuse with rate limiting using `express-rate-limit` and Redis.
*   **Background Jobs**: Utilize BullMQ (Redis-backed) for robust, scalable background processing of scraping tasks.
*   **Frontend Dashboard**: Intuitive React interface for managing scrapers, viewing jobs, and analyzing results.
*   **Dockerized**: Easily deployable with Docker and Docker Compose.
*   **CI/CD Ready**: Example GitHub Actions workflow for automated testing and builds.

## 2. Technology Stack

**Backend:**
*   **Runtime**: Node.js (v20+)
*   **Language**: TypeScript
*   **Framework**: Express.js
*   **ORM**: TypeORM
*   **Database**: PostgreSQL
*   **Queue/Cache**: Redis, BullMQ
*   **Scraping**: Cheerio.js (for static HTML parsing), Puppeteer (for dynamic JS-rendered pages - *optional, not fully implemented in initial code due to complexity, but architected for inclusion*)
*   **Validation**: Joi
*   **Authentication**: bcryptjs, jsonwebtoken
*   **Logging**: Winston
*   **Utilities**: dotenv, cors, helmet, express-rate-limit

**Frontend:**
*   **Framework**: React (v18+)
*   **Language**: TypeScript
*   **Styling**: TailwindCSS
*   **Routing**: React Router DOM
*   **API Client**: Axios
*   **Charting**: Chart.js (or similar for data visualization)

**DevOps & Tools:**
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions
*   **Testing**: Jest, Supertest (backend API), React Testing Library (frontend - *not explicitly shown here for brevity but standard practice*)
*   **Performance Testing**: Artillery.io

## 3. Project Structure

```
.
├── .github/                       # CI/CD workflows
├── backend/                       # Node.js/TypeScript Express API
│   ├── src/                       # Source code
│   │   ├── config/                # Environment, DB, Redis configurations
│   │   ├── db/                    # TypeORM data source, migrations, seeders
│   │   ├── entities/              # TypeORM entities (models)
│   │   ├── middlewares/           # Express middleware (auth, error, logging, rate limit)
│   │   ├── modules/               # Feature-specific modules (auth, users, scrapers, jobs, data)
│   │   ├── services/              # Core application services (scraping engine, queue, cache)
│   │   ├── utils/                 # Utility functions (logger, JWT, helpers)
│   │   ├── types/                 # Custom type definitions
│   │   ├── app.ts                 # Express application setup
│   │   └── server.ts              # Application entry point
│   ├── tests/                     # Unit, Integration, API tests
│   ├── package.json               # Backend dependencies and scripts
│   └── tsconfig.json              # TypeScript configuration
├── database/                      # PostgreSQL setup scripts
├── docker/                        # Docker configurations for services
├── frontend/                      # React/TypeScript application
│   ├── public/                    # Public assets
│   ├── src/                       # Source code
│   │   ├── api/                   # API service calls
│   │   ├── auth/                  # Authentication context and hooks
│   │   ├── components/            # Reusable UI components
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── pages/                 # Application pages
│   │   ├── routes/                # React Router setup
│   │   ├── styles/                # Tailwind CSS, global styles
│   │   ├── utils/                 # Utility functions
│   │   ├── App.tsx                # Main application component
│   │   └── index.tsx              # Application entry point
│   ├── package.json               # Frontend dependencies and scripts
│   └── tsconfig.json              # TypeScript configuration
├── .env.example                   # Example environment variables
├── README.md                      # Project setup, usage, and overview
├── ARCHITECTURE.md                # Detailed architecture description
└── DEPLOYMENT.md                  # Deployment guide
```

## 4. Setup and Installation

### Prerequisites

*   Node.js (v20 or higher) & npm (v10 or higher)
*   Docker & Docker Compose (recommended for local development)
*   Git

### Local Development with Docker Compose (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/scrapeflow.git
    cd scrapeflow
    ```

2.  **Create `.env` file:**
    Copy the `.env.example` file to `.env` in the root directory.
    ```bash
    cp .env.example .env
    ```
    You can keep the default values for local development.

3.  **Build and start services:**
    This command will build the Docker images, create the containers for PostgreSQL, Redis, Backend, and Frontend, and start them. It will also run backend database migrations automatically.
    ```bash
    docker-compose -f docker/docker-compose.yml up --build -d
    ```
    *   `--build`: Rebuilds images (useful after code changes in Dockerfiles).
    *   `-d`: Runs containers in detached mode (background).

4.  **Verify services:**
    Check if all containers are running:
    ```bash
    docker-compose -f docker/docker-compose.yml ps
    ```
    You should see `db`, `redis`, `backend`, and `frontend` containers in a healthy state.

5.  **Run database seeders (optional but recommended for initial data):**
    After the backend service is up and migrations have run, you can seed the database with initial users and scrapers.
    ```bash
    docker-compose -f docker/docker-compose.yml exec backend npm run typeorm:seed
    ```

### Manual Setup (Backend)

If you prefer to run the backend directly on your machine without Docker:

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up PostgreSQL and Redis:**
    Ensure you have a PostgreSQL database and a Redis instance running locally, and update your `.env` file in the project root with the correct connection details.

4.  **Run migrations:**
    ```bash
    npm run typeorm:migration:run
    ```

5.  **Run seeders (optional):**
    ```bash
    npm run typeorm:seed
    ```

6.  **Build and start the backend:**
    ```bash
    npm run build
    npm start
    ```
    Or for development with hot-reloading:
    ```bash
    npm run dev
    ```

    The backend API will be available at `http://localhost:5000` (or your configured `PORT`).

### Manual Setup (Frontend)

If you prefer to run the frontend directly on your machine without Docker:

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Update backend URL:**
    Ensure `REACT_APP_BACKEND_URL` in your project's `.env` file (or frontend/.env if separated) points to your running backend (e.g., `http://localhost:5000`).

4.  **Start the frontend:**
    ```bash
    npm start
    ```

    The frontend application will be available at `http://localhost:3000` (or your configured `FRONTEND_URL`).

## 5. Running the Application

Once you've completed the setup (preferably with Docker Compose), the application will be accessible:

*   **Frontend**: `http://localhost:3000`
*   **Backend API**: `http://localhost:5000`

You can log in with the seeded credentials (if you ran the seeder):
*   **Admin**: `admin@example.com` / `adminpassword`
*   **User**: `user@example.com` / `userpassword`

## 6. Database Operations

### Migrations

TypeORM migrations are used to manage database schema changes.

*   **Create a new migration:**
    ```bash
    cd backend
    npm run typeorm:migration:create --name=YourMigrationName
    ```
    This will create a new TypeScript file in `backend/src/db/migrations/`. Edit this file to define your schema changes in `up` and `down` methods.

*   **Run pending migrations:**
    ```bash
    cd backend
    npm run typeorm:migration:run
    # Or via Docker:
    # docker-compose -f docker/docker-compose.yml exec backend npm run typeorm:migration:run
    ```

*   **Revert the last migration:**
    ```bash
    cd backend
    npm run typeorm:migration:revert
    # Or via Docker:
    # docker-compose -f docker/docker-compose.yml exec backend npm run typeorm:migration:revert
    ```

### Seeding

The seeder populates the database with initial data (e.g., admin user, example scrapers).

*   **Run seeders:**
    ```bash
    cd backend
    npm run typeorm:seed
    # Or via Docker (recommended for first run):
    # docker-compose -f docker/docker-compose.yml exec backend npm run typeorm:seed
    ```
    The seeder checks if users already exist to prevent duplicate entries on subsequent runs.

## 7. Testing

### Backend Tests

Backend tests are written with Jest and Supertest.

*   **Run all backend tests:**
    ```bash
    cd backend
    npm test
    ```
    This will run unit, integration, and API tests and generate a coverage report. Aim for 80%+ coverage.

*   **Run tests in watch mode:**
    ```bash
    cd backend
    npm run test:watch
    ```

### Frontend Tests

Frontend tests are typically written with Jest and React Testing Library. (Example `jest.config.js` is provided, but no full test files for brevity).

*   **Run all frontend tests:**
    ```bash
    cd frontend
    npm test
    ```

### Performance Tests (Artillery)

Performance tests use Artillery.io to simulate load on the backend.

1.  **Install Artillery (if not already installed):**
    ```bash
    npm install -g artillery
    ```

2.  **Ensure your backend is running.**

3.  **Run the performance tests:**
    ```bash
    artillery run backend/tests/performance/artillery.yml
    ```
    *Note: The `backend/tests/performance/artillery.yml` file contains example scenarios. You might need to adjust authentication tokens or specific routes based on your environment.*

## 8. API Documentation

The API endpoints are documented below. Authentication is via a JWT token passed in the `Authorization` header (`Bearer <token>`).

**Base URL**: `/api` (e.g., `http://localhost:5000/api`)

### Authentication (`/api/auth`)

*   **`POST /register`**: Register a new user.
    *   **Body**: `{ username: string, email: string, password: string }`
    *   **Response**: `{ token: string, user: { id: string, username: string, email: string, role: string } }` (201 Created)
*   **`POST /login`**: Authenticate a user.
    *   **Body**: `{ email: string, password: string }`
    *   **Response**: `{ token: string, user: { id: string, username: string, email: string, role: string } }` (200 OK)
*   **`GET /me`**: Get current user's profile (requires authentication).
    *   **Response**: `{ id: string, username: string, email: string, role: string }` (200 OK)

### Users (`/api/users`) - Admin Only (except self-read/update)

*   **`GET /`**: Get all users.
    *   **Permissions**: ADMIN
    *   **Response**: `User[]` (200 OK)
*   **`GET /:id`**: Get user by ID.
    *   **Permissions**: ADMIN or user's own ID
    *   **Response**: `User` (200 OK)
*   **`PUT /:id`**: Update user by ID.
    *   **Permissions**: ADMIN or user's own ID
    *   **Body**: `{ username?: string, email?: string, password?: string, role?: 'admin' | 'user' }` (role update requires ADMIN)
    *   **Response**: `User` (200 OK)
*   **`DELETE /:id`**: Delete user by ID.
    *   **Permissions**: ADMIN
    *   **Response**: (204 No Content)

### Scrapers (`/api/scrapers`)

*   **`GET /`**: Get all scrapers (or user's scrapers).
    *   **Permissions**: Authenticated (users see their own, admin sees all)
    *   **Query Params**: `userId` (optional, for admin to filter)
    *   **Response**: `Scraper[]` (200 OK)
*   **`GET /:id`**: Get scraper by ID.
    *   **Permissions**: Authenticated (owner or admin)
    *   **Response**: `Scraper` (200 OK)
*   **`POST /`**: Create a new scraper.
    *   **Permissions**: Authenticated (user creates their own)
    *   **Body**: `{ name: string, description?: string, start_url: string, selectors_config: SelectorConfig, pagination_config?: PaginationConfig }`
    *   **Response**: `Scraper` (201 Created)
*   **`PUT /:id`**: Update scraper by ID.
    *   **Permissions**: Authenticated (owner or admin)
    *   **Body**: `{ name?: string, description?: string, start_url?: string, selectors_config?: SelectorConfig, pagination_config?: PaginationConfig }`
    *   **Response**: `Scraper` (200 OK)
*   **`DELETE /:id`**: Delete scraper by ID.
    *   **Permissions**: Authenticated (owner or admin)
    *   **Response**: (204 No Content)

### Scrape Jobs (`/api/scrape-jobs`)

*   **`GET /`**: Get all scrape jobs.
    *   **Permissions**: Authenticated (users see their own, admin sees all)
    *   **Query Params**: `scraperId`, `status`, `userId`
    *   **Response**: `ScrapeJob[]` (200 OK)
*   **`GET /:id`**: Get scrape job by ID.
    *   **Permissions**: Authenticated (owner or admin)
    *   **Response**: `ScrapeJob` (200 OK)
*   **`POST /trigger/:scraperId`**: Trigger a new scrape job for a specific scraper.
    *   **Permissions**: Authenticated (owner or admin)
    *   **Response**: `{ message: string, jobId: string }` (202 Accepted)
*   **`POST /schedule/:scraperId`**: Schedule a recurring scrape job (e.g., daily, weekly).
    *   **Permissions**: Authenticated (owner or admin)
    *   **Body**: `{ cronExpression: string, name?: string }` (e.g., "0 0 * * *" for daily)
    *   **Response**: `{ message: string, jobId: string }` (202 Accepted)
*   **`DELETE /schedule/:scraperId`**: Unschedule a recurring scrape job.
    *   **Permissions**: Authenticated (owner or admin)
    *   **Response**: `{ message: string }` (200 OK)

### Scraped Data (`/api/scraped-data`)

*   **`GET /`**: Get all scraped data entries.
    *   **Permissions**: Authenticated (users see data from their jobs, admin sees all)
    *   **Query Params**: `scraperId`, `jobId`, `limit`, `offset`
    *   **Response**: `ScrapedData[]` (200 OK)
*   **`GET /:id`**: Get a single scraped data entry by ID.
    *   **Permissions**: Authenticated (owner or admin)
    *   **Response**: `ScrapedData` (200 OK)
*   **`GET /scraper/:scraperId`**: Get all scraped data for a specific scraper.
    *   **Permissions**: Authenticated (owner or admin)
    *   **Response**: `ScrapedData[]` (200 OK)

---

## 9. Architecture

For a detailed architecture overview, including component diagrams, data flow, and technology choices, please refer to the [ARCHITECTURE.md](ARCHITECTURE.md) file.

---

## 10. Deployment

For guidelines on deploying ScrapeFlow to a production environment (e.g., cloud platforms like AWS, Azure, GCP), including considerations for scalability, security, and monitoring, please refer to the [DEPLOYMENT.md](DEPLOYMENT.md) file.

---

## 11. Contributing

We welcome contributions! Please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) (not provided in this response but would be a standard part of an enterprise project) for guidelines on how to contribute to ScrapeFlow.

---

## 12. License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
```