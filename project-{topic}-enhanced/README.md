```markdown
# ALX Content Management System (CMS)

A comprehensive, production-ready full-stack Content Management System built with TypeScript.

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Features](#features)
3.  [Technology Stack](#technology-stack)
4.  [Project Structure](#project-structure)
5.  [Setup Instructions](#setup-instructions)
    *   [Prerequisites](#prerequisites)
    *   [Local Development with Docker Compose](#local-development-with-docker-compose)
    *   [Manual Setup (Backend)](#manual-setup-backend)
    *   [Manual Setup (Frontend)](#manual-setup-frontend)
6.  [Database Management](#database-management)
    *   [Migrations](#migrations)
    *   [Seeding](#seeding)
7.  [Running Tests](#running-tests)
8.  [API Documentation](#api-documentation)
9.  [Architecture](#architecture)
10. [CI/CD](#cicd)
11. [Additional Features](#additional-features)
12. [Contributing](#contributing)
13. [License](#license)

## 1. Project Overview

This project implements a full-scale Content Management System designed to be robust, scalable, and maintainable. It supports multiple user roles (Admin, Editor, Author, Reader) with appropriate authentication and authorization. The system allows managing users, categories, and articles (posts) with rich CRUD operations.

## 2. Features

*   **User Management:** Create, Read, Update, Delete users with different roles.
*   **Authentication & Authorization:** JWT-based authentication, role-based access control.
*   **Category Management:** Organize posts into categories.
*   **Post Management:** Create, Read, Update, Delete articles/posts. Support for drafts, pending review, and published states.
*   **RESTful API:** Clean and well-defined API endpoints.
*   **Error Handling:** Global exception handling middleware for consistent error responses.
*   **Logging & Monitoring:** Centralized logging with Winston, request logging middleware.
*   **Caching:** Redis-backed caching for frequently accessed data (e.g., public posts, categories).
*   **Rate Limiting:** Protects API endpoints from abuse.
*   **Database Management:** PostgreSQL with TypeORM for robust data persistence, migrations, and seeding.
*   **Containerization:** Docker and Docker Compose for easy setup and deployment.
*   **CI/CD:** Basic GitHub Actions workflow for automated testing and deployment.
*   **API Documentation:** Swagger UI for interactive API exploration.
*   **Frontend UI:** Responsive React application for content consumption and administration.

## 3. Technology Stack

**Backend:**
*   **Framework:** NestJS (Node.js, TypeScript)
*   **Database:** PostgreSQL
*   **ORM:** TypeORM
*   **Authentication:** Passport.js (JWT Strategy)
*   **Validation:** Class-validator
*   **Caching:** Redis (`cache-manager`, `cache-manager-redis-yet`)
*   **Logging:** Winston, Nest-Winston
*   **API Docs:** Swagger (OpenAPI)
*   **Rate Limiting:** `@nestjs/throttler`
*   **Security:** Helmet, CORS

**Frontend:**
*   **Framework:** React (TypeScript)
*   **Routing:** React Router DOM
*   **State Management:** React Context API (for Auth)
*   **Styling:** Tailwind CSS
*   **API Client:** Axios

**Infrastructure & DevOps:**
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions
*   **Reverse Proxy/Web Server:** Nginx (for frontend in production setup)

## 4. Project Structure

```
/cms-project
├── /backend                         # NestJS Backend Application
│   ├── src                          # Source code
│   │   ├── main.ts                  # Entry point
│   │   ├── app.module.ts            # Root module
│   │   ├── auth/                    # Auth module (login, register, JWT)
│   │   ├── users/                   # User management
│   │   ├── categories/              # Category management
│   │   ├── posts/                   # Post/Article management
│   │   ├── config/                  # Environment config
│   │   ├── database/                # TypeORM config, migrations, seeds
│   │   └── shared/                  # Global filters, interceptors, middleware
│   ├── test/                        # E2E & Unit tests
│   ├── .env.example                 # Example environment variables
│   ├── ormconfig.ts                 # TypeORM CLI configuration
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile                   # Backend Dockerfile
├── /frontend                        # React + TypeScript Frontend Application
│   ├── public/
│   ├── src
│   │   ├── App.tsx                  # Main App component
│   │   ├── index.tsx                # Entry point
│   │   ├── components/              # Reusable UI components
│   │   ├── pages/                   # Application pages (Home, Login, Dashboard, etc.)
│   │   ├── services/                # API interaction layer
│   │   ├── context/                 # React Contexts (e.g., AuthContext)
│   │   └── types/                   # TypeScript interfaces/types
│   ├── .env.example                 # Example environment variables
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile                   # Frontend Dockerfile
├── .dockerignore
├── docker-compose.yml               # Docker orchestration file
├── nginx.conf                       # Nginx configuration for frontend
├── .github/workflows/               # CI/CD (GitHub Actions)
│   └── main.yml
├── README.md                        # This file
├── API.md                           # Detailed API documentation
└── ARCHITECTURE.md                  # High-level system architecture
```

## 5. Setup Instructions

### Prerequisites

*   **Node.js (v18 or higher)** and **npm**
*   **Docker** and **Docker Compose** (recommended for local development)
*   **Git**

### Local Development with Docker Compose (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/cms-project.git
    cd cms-project
    ```

2.  **Create `.env` files:**
    Copy the example environment files for both backend and frontend.

    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    ```
    Review and adjust variables in both `.env` files, especially `DB_PASSWORD`, `JWT_SECRET`, and `CORS_ORIGIN`.

3.  **Build and run services with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build Docker images for backend and frontend.
    *   Start PostgreSQL database (`db`).
    *   Start Redis cache (`redis`).
    *   Start the backend application (`backend`).
    *   Start Nginx to serve the frontend (`frontend`).

4.  **Wait for services to start:**
    It might take a minute for the database and backend to be ready. You can check logs:
    ```bash
    docker-compose logs -f
    ```

5.  **Run database migrations:**
    Once the `backend` service is up and connected to `db`:
    ```bash
    docker-compose exec backend npm run migrate:run
    ```

6.  **Seed initial data:**
    ```bash
    docker-compose exec backend npm run seed:run
    ```
    This will create an `admin@example.com` (password: `password123`) user, an `editor@example.com` (password: `password123`) user, and a few `author` users along with categories and posts.

7.  **Access the applications:**
    *   **Frontend:** `http://localhost:80` (or just `http://localhost`)
    *   **Backend API:** `http://localhost:3000` (for direct access, proxied through `/api/v1` by Nginx)
    *   **Swagger API Docs:** `http://localhost:3000/api-docs` (direct)

### Manual Setup (Backend)

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create `.env` file:**
    ```bash
    cp .env.example .env
    ```
    Adjust `DB_HOST` to your local PostgreSQL instance (e.g., `localhost`), and ensure `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` are set correctly.

4.  **Start PostgreSQL and Redis:**
    Ensure you have a local PostgreSQL database and Redis instance running and configured as per your `.env` file.

5.  **Run migrations and seeds:**
    ```bash
    npm run migrate:run
    npm run seed:run
    ```

6.  **Start the backend application:**
    ```bash
    npm run start:dev
    ```
    The backend will run on `http://localhost:3000`.

### Manual Setup (Frontend)

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create `.env` file:**
    ```bash
    cp .env.example .env
    ```
    Ensure `REACT_APP_API_BASE_URL` points to your backend API. If running backend with `npm run start:dev`, it would be `http://localhost:3000`. If using Docker Compose with Nginx, it might be `/api/v1` (if Nginx proxies it) or `http://localhost:3000` (if Nginx isn't proxying it).

4.  **Start the frontend application:**
    ```bash
    npm start
    ```
    The frontend will typically run on `http://localhost:3001`.

## 6. Database Management

### Migrations

Migrations manage database schema changes.

*   **Generate a new migration:**
    ```bash
    docker-compose exec backend npm run migrate:make --name=YourMigrationName
    # OR (for manual setup):
    npm run typeorm migration:create ./src/database/migrations/YourMigrationName
    ```
    Then, edit the generated TypeScript file in `backend/src/database/migrations/`.

*   **Run pending migrations:**
    ```bash
    docker-compose exec backend npm run migrate:run
    # OR:
    npm run migrate:run
    ```

*   **Revert the last migration:**
    ```bash
    docker-compose exec backend npm run migrate:revert
    # OR:
    npm run migrate:revert
    ```

### Seeding

Seed data populates the database with initial records (e.g., admin user, default categories).

*   **Run seeders:**
    ```bash
    docker-compose exec backend npm run seed:run
    # OR:
    npm run seed:run
    ```

## 7. Running Tests

### Backend Tests

From the `backend` directory:

*   **Unit tests:**
    ```bash
    npm test
    ```
*   **Unit tests with coverage:**
    ```bash
    npm run test:cov
    ```
*   **End-to-End (E2E) tests:**
    ```bash
    npm run test:e2e
    ```
    (Ensure the database is running and potentially clean before running E2E tests).

### Frontend Tests

From the `frontend` directory:

*   **Unit tests (React Testing Library):**
    ```bash
    npm test
    ```
    (Currently, no specific test files are provided, but this is the command for future tests.)

## 8. API Documentation

The backend API documentation is generated using Swagger (OpenAPI) and is accessible when the backend server is running.

*   **Swagger UI:** `http://localhost:3000/api-docs` (if backend is running directly or exposed via Docker)

For a more structured overview, refer to the `API.md` file.

## 9. Architecture

Refer to the `ARCHITECTURE.md` file for a high-level overview of the system design, key components, and their interactions.

## 10. CI/CD

The project includes a basic GitHub Actions workflow (`.github/workflows/main.yml`) that performs the following steps on `main` and `develop` branches, and on pull requests:

*   **Backend CI:**
    *   Checks out code.
    *   Sets up Node.js.
    *   Installs dependencies.
    *   Runs linting.
    *   Runs unit tests with coverage.
    *   (Optional: uploads coverage to Codecov)
*   **Frontend CI:**
    *   Checks out code.
    *   Sets up Node.js.
    *   Installs dependencies.
    *   Runs linting.
    *   Runs unit tests.
    *   Builds the React application.
*   **Deployment (on `main` branch pushes):**
    *   Logs in to Docker Hub.
    *   Builds and pushes Docker images for both backend and frontend.
    *   Deploys to a remote server via SSH (requires `SSH_HOST`, `SSH_USERNAME`, `SSH_KEY` secrets, and `DOCKER_USERNAME`, `DOCKER_PASSWORD` for Docker Hub). This typically involves pulling new images and restarting Docker Compose services.

**To enable the deployment step:**
1.  Set up Docker Hub account.
2.  Add repository secrets in GitHub:
    *   `DOCKER_USERNAME`
    *   `DOCKER_PASSWORD`
    *   `SSH_HOST` (e.g., your server's IP address)
    *   `SSH_USERNAME`
    *   `SSH_KEY` (private SSH key for connecting to your server)

## 11. Additional Features

*   **Authentication/Authorization:** Implemented using JWT and Passport.js with role-based access control.
*   **Logging and Monitoring:** Winston for structured logging, integrated with NestJS. Request logging middleware captures basic request info.
*   **Error Handling Middleware:** Global exception filter ensures consistent JSON error responses and proper logging for all unhandled exceptions.
*   **Caching Layer:** Redis integrated with NestJS `CacheModule` and `CacheInterceptor` for improved performance on read-heavy endpoints.
*   **Rate Limiting:** `ThrottlerModule` implemented to prevent brute-force attacks and abuse of API endpoints.

## 12. Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write tests for your changes.
5.  Ensure all tests pass and linting checks are green.
6.  Commit your changes (`git commit -m 'feat: Add new feature'`).
7.  Push to the branch (`git push origin feature/your-feature-name`).
8.  Create a Pull Request.

## 13. License

This project is licensed under the MIT License - see the LICENSE file for details.
```