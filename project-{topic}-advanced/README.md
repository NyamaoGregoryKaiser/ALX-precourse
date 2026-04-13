# Web Scraping Tools System (Enterprise-Grade)

This project provides a comprehensive, production-ready web scraping tools system. It's built with a Node.js/Express backend, a React frontend, PostgreSQL database, and includes advanced features like authentication, job queuing, caching, logging, rate limiting, and Dockerization.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup (without Docker)](#local-development-setup-without-docker)
    *   [Docker Setup (Recommended)](#docker-setup-recommended)
4.  [API Documentation](#api-documentation)
5.  [Testing](#testing)
6.  [Deployment Guide](#deployment-guide)
7.  [CI/CD](#cicd)
8.  [Code Structure](#code-structure)
9.  [Future Enhancements](#future-enhancements)
10. [License](#license)

---

## 1. Features

*   **User Management:** Register, Login, User Roles (User, Admin) with JWT authentication.
*   **Scraping Job Management:**
    *   Create new scraping jobs by providing a URL and CSS selectors for target elements.
    *   View job status (PENDING, RUNNING, COMPLETED, FAILED, CANCELLED).
    *   Cancel running or pending jobs.
*   **Scraped Data Storage & Retrieval:**
    *   Scraped data is stored in PostgreSQL.
    *   View all scraped results.
    *   Delete scraped results.
*   **Robust Scraping Engine:** Leverages `Playwright` for headless browser automation, capable of handling dynamic, JavaScript-rendered content.
*   **Asynchronous Job Processing:** Jobs are added to an in-memory queue (extendable to Redis/RabbitMQ for production) and processed asynchronously.
*   **Database:** PostgreSQL with `Prisma` ORM for type-safe database interactions and migrations.
*   **Security:**
    *   JWT-based authentication.
    *   Role-based authorization (User, Admin).
    *   Rate limiting to prevent abuse.
    *   Basic `helmet` middleware for common web vulnerabilities.
*   **Observability:**
    *   Structured logging with `Winston` for application events and errors.
    *   HTTP request logging with `Morgan`.
*   **Performance:**
    *   In-memory caching (`node-cache`) for API responses to reduce database load.
*   **Scalability:** Designed with modular components, ready for scaling individual services.
*   **Containerization:** `Docker` and `docker-compose` setup for easy environment replication.
*   **CI/CD:** GitHub Actions workflow for automated testing and Docker image building.
*   **Comprehensive Testing:** Unit, integration, and API tests for backend; unit tests for frontend.

---

## 2. Architecture

The system follows a typical client-server architecture with a database.

```mermaid
graph TD
    User[Client (Browser/Frontend)] -->|HTTP/S Requests| CDN(CDN / Load Balancer)
    CDN --> Nginx(Nginx / API Gateway)
    Nginx -->|API Calls| Backend[Backend Service (Node.js/Express)]
    Backend -->|Database Queries| PostgreSQL[Database (PostgreSQL)]
    Backend -->|Async Task| JobQueueService[Job Queue (In-memory / Redis)]
    JobQueueService -->|Pulls Jobs| Backend
    Backend -- Playwright --> ScrapeTarget[Target Website]

    subgraph Backend Services
        Backend
        JobQueueService
    end

    subgraph Infrastructure
        PostgreSQL
        Nginx
        CDN
    end

    subgraph Core Components
        Frontend[React Application]
        Backend[Node.js / Express API]
        PostgreSQL
        Playwright[Headless Browser (via Playwright)]
        JobQueue[Asynchronous Job Queue]
        Auth[Authentication/Authorization]
        Cache[Caching Layer]
        Logger[Logging/Monitoring]
    end

    User -- Interacts with --> Frontend
    Frontend -- Requests Data --> Backend
    Backend -- Stores/Retrieves --> PostgreSQL
    Backend -- Initiates --> JobQueue
    JobQueue -- Processes --> Playwright
    Playwright -- Scrapes --> ScrapeTarget
```

**Key Architectural Decisions:**

*   **Separation of Concerns:** Frontend and backend are distinct services, communicating via RESTful API.
*   **Asynchronous Scraping:** Scraping is a time-consuming task. Jobs are queued and processed in the background to avoid blocking the main API thread, ensuring a responsive user experience.
*   **Headless Browser (Playwright):** Chosen for its ability to handle modern JavaScript-heavy websites, allowing for robust data extraction from dynamic content.
*   **Prisma ORM:** Provides an excellent developer experience with type safety and powerful migrations.
*   **Containerization:** Docker allows for consistent environments from development to production, simplifying deployment.

---

## 3. Getting Started

### Prerequisites

*   Node.js (v18+)
*   npm (v8+)
*   Docker & Docker Compose (for Docker setup)
*   Git

### Local Development Setup (without Docker)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ALX-Software-Engineering/web-scraping-system.git
    cd web-scraping-system
    ```

2.  **Setup PostgreSQL Database:**
    *   Ensure you have a PostgreSQL server running (e.g., using `brew install postgres` on macOS, or a Docker container for just the DB).
    *   Create a new database named `web_scraper_db` with a user `user` and password `password` (or adjust `backend/.env` accordingly).
    *   Example using Docker for just the DB:
        ```bash
        docker run --name web-scraper-postgres -e POSTGRES_DB=web_scraper_db -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:16-alpine
        ```

3.  **Backend Setup:**
    ```bash
    cd backend
    cp .env.example .env
    # Edit .env file if your PostgreSQL connection string differs
    # DATABASE_URL="postgresql://user:password@localhost:5432/web_scraper_db?schema=public"
    # JWT_SECRET="your_strong_secret"
    # ADMIN_PASSWORD="Admin@123" # for seeding
    # USER_PASSWORD="User@123"   # for seeding

    npm install
    npx prisma migrate dev --name init # Apply migrations
    npm run seed # Seed initial admin and user accounts
    npm run dev # Start backend in development mode (with nodemon)
    ```
    The backend will run on `http://localhost:5000`.

4.  **Frontend Setup:**
    ```bash
    cd ../frontend
    cp .env.example .env
    # Ensure REACT_APP_API_BASE_URL points to your backend:
    # REACT_APP_API_BASE_URL=http://localhost:5000/api

    npm install
    npm start # Start frontend in development mode
    ```
    The frontend will run on `http://localhost:3000`.

You should now be able to access the application at `http://localhost:3000`.
You can log in with:
*   **Admin:** `admin@example.com` / `Admin@123`
*   **User:** `user@example.com` / `User@123`

### Docker Setup (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ALX-Software-Engineering/web-scraping-system.git
    cd web-scraping-system
    ```

2.  **Create `.env` files:**
    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    ```
    **Important:** Update the `JWT_SECRET` in `backend/.env` with a strong, random string. You can also adjust `ADMIN_PASSWORD` and `USER_PASSWORD` for initial seed data.

3.  **Build and run with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build Docker images for the backend and frontend.
    *   Start a PostgreSQL container.
    *   Start the backend container, applying Prisma migrations and seeding the database.
    *   Start the frontend container.

4.  **Access the application:**
    Once all services are up (this might take a few minutes for the first build), you can access the frontend at `http://localhost:3000`.

5.  **Stop services:**
    ```bash
    docker-compose down
    ```

---

## 4. API Documentation

The backend API provides the following endpoints:

### Authentication

*   `POST /api/auth/register`
    *   **Description:** Register a new user.
    *   **Request Body:** `{"username": "...", "email": "...", "password": "..."}`
    *   **Response:** User data and JWT token.
*   `POST /api/auth/login`
    *   **Description:** Authenticate a user and get a JWT token.
    *   **Request Body:** `{"email": "...", "password": "..."}`
    *   **Response:** User data and JWT token.
*   `GET /api/auth/profile`
    *   **Description:** Get current authenticated user's profile.
    *   **Authorization:** Bearer Token (Required)
    *   **Response:** User data.

### Scraping Jobs

*   `POST /api/scrape`
    *   **Description:** Create a new web scraping job.
    *   **Authorization:** Bearer Token (Required)
    *   **Request Body:**
        ```json
        {
          "url": "https://example.com",
          "targetElements": [
            { "name": "pageTitle", "selector": "h1", "type": "text" },
            { "name": "mainParagraph", "selector": "p", "type": "html" },
            { "name": "linkHref", "selector": "a", "type": "attribute", "attribute": "href" }
          ]
        }
        ```
    *   **Response:** `{"message": "Scraping job initiated...", "jobId": "...", "status": "PENDING"}`
*   `GET /api/jobs`
    *   **Description:** Get all scraping jobs for the authenticated user (or all for Admin).
    *   **Authorization:** Bearer Token (Required)
    *   **Query Params:** `status` (PENDING, RUNNING, COMPLETED, FAILED, CANCELLED), `limit`, `offset`.
    *   **Response:** Array of job objects.
*   `GET /api/jobs/:id`
    *   **Description:** Get details of a specific scraping job.
    *   **Authorization:** Bearer Token (Required, User must own job or be Admin)
    *   **Response:** Single job object, including latest `scrapeResults` (if any).
*   `PUT /api/jobs/:id/cancel`
    *   **Description:** Cancel a pending or running scraping job.
    *   **Authorization:** Bearer Token (Required, User must own job or be Admin)
    *   **Response:** `{"message": "Scraping job cancelled successfully.", "job": {...}}`

### Scraped Results

*   `GET /api/results`
    *   **Description:** Get all scraped results for the authenticated user (or all for Admin).
    *   **Authorization:** Bearer Token (Required)
    *   **Query Params:** `jobId`, `userId` (Admin only), `limit`, `offset`.
    *   **Response:** Array of result objects.
*   `GET /api/results/:id`
    *   **Description:** Get details of a specific scraped result.
    *   **Authorization:** Bearer Token (Required, User must own job associated with result or be Admin)
    *   **Response:** Single result object.
*   `DELETE /api/results/:id`
    *   **Description:** Delete a scraped result.
    *   **Authorization:** Bearer Token (Required, User must own job associated with result or be Admin)
    *   **Response:** `{"message": "Scraped result deleted successfully."}`

---

## 5. Testing

The project includes comprehensive tests for both backend and frontend.

### Backend Tests

*   **Unit Tests:** Jest for isolated functions (e.g., `scrapingService` logic).
*   **Integration Tests:** Supertest for API endpoints, testing interactions between controllers, services, and mocked database/external services.
*   **API Tests:** Cover full API flows (e.g., user registration -> login -> create job -> get job).
*   **Coverage:** Aiming for 80%+ coverage on critical business logic.

To run backend tests:
```bash
cd backend
npm test
# For coverage report:
npm run test:coverage
```

### Frontend Tests

*   **Unit Tests:** React Testing Library for components and hooks.

To run frontend tests:
```bash
cd frontend
npm test -- --watchAll=false --coverage # --watchAll=false to run once and exit
```

---

## 6. Deployment Guide

This system is designed for containerized deployment using Docker.

1.  **Build Docker Images:**
    Ensure you have `docker` and `docker-compose` installed. From the root of the project:
    ```bash
    docker-compose build
    ```
    This command uses the `Dockerfile` in `backend/` and `frontend/` to create optimized images.

2.  **Environment Configuration:**
    Ensure your `backend/.env` and `frontend/.env` files are correctly configured for your production environment.
    *   **`backend/.env`:**
        *   `DATABASE_URL`: Point to your production PostgreSQL instance.
        *   `JWT_SECRET`: **CRITICAL** - Use a strong, unique secret key.
        *   `NODE_ENV=production`
        *   `FRONTEND_URL`: Set to your production frontend URL (e.g., `https://your-app.com`).
    *   **`frontend/.env`:**
        *   `REACT_APP_API_BASE_URL`: Point to your production backend API URL (e.g., `https://api.your-app.com/api`).

3.  **Run with Docker Compose:**
    ```bash
    docker-compose up -d
    ```
    This command starts all services in detached mode.

4.  **Scaling (Optional):**
    For higher availability and performance, you would typically deploy these Docker containers to a container orchestration platform like Kubernetes, Amazon ECS, Google Kubernetes Engine, or Azure Kubernetes Service. This allows for:
    *   **Load Balancing:** Distribute traffic across multiple instances of backend/frontend.
    *   **Auto-scaling:** Automatically adjust the number of instances based on demand.
    *   **Service Discovery:** Services can find each other easily.
    *   **Persistent Storage:** Mount persistent volumes for PostgreSQL data.
    *   **External Job Queue:** Replace the in-memory `jobQueueService` with a robust solution like Redis Queue, RabbitMQ, or AWS SQS/Azure Service Bus.

5.  **Monitoring:**
    Integrate with external monitoring tools (e.g., Prometheus, Grafana, ELK Stack) to collect logs (`logs/` directory in backend), metrics (CPU, memory, request rates), and application traces for production environments.

---

## 7. CI/CD

A basic GitHub Actions workflow is provided in `.github/workflows/ci.yml`.

**Workflow Steps:**

1.  **`backend-test`:**
    *   Sets up a PostgreSQL service for testing.
    *   Installs backend dependencies.
    *   Applies Prisma migrations to the test database.
    *   Runs Jest tests with coverage.
    *   Uploads coverage report as an artifact.
2.  **`frontend-test`:**
    *   Installs frontend dependencies.
    *   Runs React Testing Library tests with coverage.
    *   Uploads coverage report as an artifact.
3.  **`build-and-push-docker-images`:**
    *   **Depends on successful completion of `backend-test` and `frontend-test`.**
    *   Logs into Docker Hub (requires `DOCKER_USERNAME` and `DOCKER_PASSWORD` GitHub Secrets).
    *   Builds and pushes Docker images for both backend and frontend to Docker Hub, tagged with the commit SHA.

**To Set Up CI/CD:**

1.  Fork this repository to your GitHub account.
2.  Go to your repository settings -> Secrets and variables -> Actions.
3.  Add the following repository secrets:
    *   `DOCKER_USERNAME`: Your Docker Hub username.
    *   `DOCKER_PASSWORD`: Your Docker Hub access token (not your main password).
4.  Push changes to `main` or `develop` branch, or open a Pull Request, to trigger the workflow.

---

## 8. Code Structure

*   `backend/`: Node.js/Express application.
    *   `prisma/`: Database schema, migrations, and seed scripts.
    *   `src/`:
        *   `config/`: Environment-specific configurations (DB, Auth, Logger, Cache).
        *   `controllers/`: Handle incoming API requests, validate input, and delegate to services.
        *   `middleware/`: Express middleware for authentication, error handling, rate limiting, caching.
        *   `services/`: Encapsulate business logic, interact with database/external APIs (e.g., scraping logic, job queue).
        *   `routes/`: Define API endpoints and link to controllers.
        *   `tests/`: Unit and integration tests for backend.
        *   `utils/`: Helper functions (e.g., validation).
        *   `app.js`: Main Express application setup.
        *   `server.js`: Entry point, starts server and job processor.
*   `frontend/`: React application.
    *   `public/`: Static assets.
    *   `src/`:
        *   `api/`: Axios instance for API calls.
        *   `components/`: Reusable UI components (Auth forms, Scrape forms, Job/Result cards).
        *   `context/`: React Context for global state (e.g., authentication).
        *   `hooks/`: Custom React hooks for data fetching and state management.
        *   `pages/`: Top-level page components (Home, Dashboard).
        *   `tests/`: Unit tests for frontend components.
        *   `App.js`: Main application component, handles routing.
        *   `index.js`: Entry point for React app.
*   `.github/workflows/`: GitHub Actions CI/CD pipeline configuration.
*   `docker-compose.yml`: Defines multi-container Docker application.

---

## 9. Future Enhancements

*   **Advanced Job Queue:** Replace in-memory `jobQueueService` with a robust solution like [BullMQ](https://github.com/taskforcesh/bullmq) (backed by Redis) or a cloud-managed queue like AWS SQS.
*   **Proxy Rotation:** Implement proxy management to avoid IP bans when scraping frequently.
*   **Captcha Solving:** Integrate with CAPTCHA solving services if target websites use them.
*   **Scheduled Jobs:** Allow users to schedule scraping jobs at recurring intervals.
*   **Webhooks/Notifications:** Notify users upon job completion or failure.
*   **Data Export:** Provide options to export scraped data (CSV, JSON).
*   **Dashboard Improvements:** More interactive charts, real-time updates using WebSockets for job status.
*   **Admin Panel:** A dedicated admin interface to manage all users, jobs, and system settings.
*   **Playwright Browser as a Service:** Run Playwright in a separate, dedicated container or service for better isolation and scalability of scraping operations.
*   **Persistent Caching:** Replace `node-cache` with Redis for distributed, persistent caching.
*   **Observability:** Integrate with Prometheus/Grafana for metric collection and visualization, and centralized logging (ELK Stack, LogDNA).
*   **Enhanced Input Validation:** Use a schema validation library like `Joi` or `Zod` for more robust request body validation.

---

## 10. License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
```