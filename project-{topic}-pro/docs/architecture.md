# Web Scraping Tools System - Architecture Documentation

This document outlines the architecture of the Web Scraping Tools System, detailing its components, their interactions, and the rationale behind key design decisions.

## 1. High-Level Architecture

The system follows a typical three-tier architecture:
1.  **Frontend**: A client-side application (React.js) that provides a user interface for managing scrapers and viewing data.
2.  **Backend (API & Business Logic)**: A Node.js (Express.js) server that exposes RESTful APIs, handles user authentication, scraper management, and orchestrates the scraping process.
3.  **Data Layer**: Consists of a PostgreSQL database for persistent storage and a Redis instance for caching and job queuing.

Additionally, a **Scraping Worker** component (part of the backend service, but conceptually separate) is responsible for executing the actual web scraping tasks, operating asynchronously through a job queue.

```mermaid
graph TD
    User[User] -->|Browser/Client| Frontend[React Frontend]
    Frontend -->|HTTP/HTTPS| Nginx[Nginx Proxy]
    Nginx -->|HTTP/HTTPS (API Gateway)| BackendAPI[Node.js/Express Backend API]

    subgraph Backend Services
        BackendAPI --1. CRUD Scrapers, Users--> PostgreSQL[PostgreSQL Database]
        BackendAPI --2. Enqueue Scrape Jobs--> Redis[Redis (Cache & Job Queue)]
        BackendAPI --3. Authentication, Authz--> BackendAPI
        BackendAPI --4. Logging, Error Handling--> Logger[Winston Logger]

        Redis --> ScraperWorker[Node.js/BullMQ Scraper Worker]
        ScraperWorker -->|HTTP/Browser Emulation| TargetWebsite[Target Websites]
        ScraperWorker --Persist Scraped Data--> PostgreSQL
        ScraperWorker --Update Job Status--> PostgreSQL
        ScraperWorker --Logging--> Logger
    end

    subgraph Infrastructure
        PostgreSQL <--> PersistentVolume[Persistent Volume]
        Redis <--> PersistentVolume
        Nginx <--> FrontendBuild[Frontend Static Files]
    end

    CI[CI/CD Pipeline] -->|Build & Test| BackendAPI
    CI -->|Build & Test| Frontend
    CI -->|Deploy| Docker[Docker Compose / Kubernetes]
```

## 2. Component Breakdown

### 2.1. Frontend (React.js)

*   **Technology**: React.js, React Router, Axios, `create-react-app`.
*   **Purpose**: Provides the user interface for:
    *   User registration and login.
    *   Dashboard to list, create, edit, and delete scrapers.
    *   Viewing scraper details, associated jobs, and scraped items.
    *   Triggering manual scrape jobs.
*   **Key Modules**:
    *   `AuthContext`: Manages user authentication state and JWT tokens.
    *   `api.js`: Axios instance with JWT interceptors for API requests.
    *   `pages/`: Components for different views (Login, Register, Dashboard, ScraperDetail, JobDetail, ScraperEdit).
    *   `components/common/`: Reusable UI elements (e.g., Navbar).
*   **Deployment**: Built into static files and served by Nginx.

### 2.2. Backend (Node.js/Express.js)

*   **Technology**: Node.js, Express.js, Knex.js (SQL query builder), JWT, Bcrypt.js, BullMQ, Cheerio, Puppeteer, Winston, Express-rate-limit, Helmet, CORS.
*   **Purpose**: The central hub for API exposure, business logic, and job orchestration.
*   **Key Modules**:
    *   **API Layer (`src/api`)**:
        *   `routes/`: Defines API endpoints (e.g., `/api/auth`, `/api/scrapers`).
        *   `controllers/`: Handles incoming requests, calls services, and sends responses.
        *   `validators/`: Uses Joi for input validation to ensure data integrity and security.
    *   **Services Layer (`src/services`)**: Contains the core business logic, e.g., `authService`, `scraperService`, `scrapingEngine`. This layer interacts with the database models and external resources (like the job queue).
    *   **Database Layer (`src/database`)**:
        *   `connection.js`: Initializes Knex.js for PostgreSQL connection.
        *   `models/`: Simple classes (or objects) wrapping Knex queries to interact with specific database tables (e.g., `User`, `Scraper`, `ScrapeJob`, `ScrapedItem`).
        *   `migrations/`: Defines database schema changes using Knex migrations.
        *   `seeds/`: Populates the database with initial data for development/testing.
    *   **Jobs Layer (`src/jobs`)**:
        *   `queue.js`: Configures BullMQ queue and Redis connection for asynchronous job processing.
        *   `scraperConsumer.js`: The worker that processes `scrape-task` jobs from the queue, executes scraping logic, and updates job/item status in the DB. Also responsible for setting up scheduled scrapers.
    *   **Middlewares (`src/middlewares`)**:
        *   `authMiddleware.js`: Verifies JWT tokens for authenticated routes.
        *   `errorMiddleware.js`: Centralized error handling, converting errors to `ApiError` for consistent responses.
        *   `rateLimitMiddleware.js`: Protects API endpoints from abuse.
        *   `cacheMiddleware.js`: Caches API GET responses using Redis.
    *   **Utilities (`src/utils`)**:
        *   `logger.js`: Configures Winston for structured logging.
        *   `redisClient.js`: Manages the Redis client connection.
        *   `catchAsync.js`: Wrapper for async Express route handlers to catch errors.
    *   **Configuration (`src/config`)**: Centralized management of environment variables and application settings.

### 2.3. Data Layer

*   **PostgreSQL**:
    *   **Purpose**: Primary data storage for users, scraper configurations, scrape job metadata, and the raw scraped data.
    *   **Schema**:
        *   `users`: Stores user credentials and profile information.
        *   `scrapers`: Stores configurations for each web scraper (URL, selectors, schedule, method).
        *   `scrape_jobs`: Records metadata for each execution of a scraper (start/end time, status, errors, items scraped).
        *   `scraped_items`: Stores the actual data extracted by a scrape job, including the URL and a JSONB column for flexible data structure.
    *   **Optimization**: Indexes are applied to frequently queried columns (`user_id`, `scraper_id`, `status`, `scraped_at`, etc.) to improve query performance. JSONB type is used for `data` in `scraped_items` for flexible schema and efficient querying of JSON data.
*   **Redis**:
    *   **Purpose**:
        *   **Job Queue (BullMQ backend)**: Provides a robust and distributed queue for processing web scraping tasks asynchronously. This decouples the API request from the long-running scraping process.
        *   **Caching**: Stores API responses to reduce database load and improve response times for frequently accessed, non-volatile data.

## 3. Workflow & Data Flow

1.  **User Authentication**:
    *   User registers/logs in via Frontend.
    *   Frontend sends credentials to Backend's `/api/auth` endpoint.
    *   Backend validates, creates/verifies user in PostgreSQL, generates a JWT, and sends it back.
    *   Frontend stores JWT in `localStorage` and includes it in subsequent API requests.
2.  **Scraper Management**:
    *   Authenticated user interacts with Frontend to create/read/update/delete scraper configurations.
    *   Frontend sends requests to Backend's `/api/scrapers` endpoints, including JWT for authorization.
    *   Backend validates input, performs CRUD operations on the `scrapers` table in PostgreSQL.
    *   Updating or creating a scraper may trigger a cache invalidation if configured.
3.  **Triggering a Scrape Job**:
    *   User clicks "Trigger Scrape" on Frontend or a scheduled cron job fires (managed by `scraperConsumer.js` at startup).
    *   Frontend/scheduler calls Backend's `/api/scrapers/:id/trigger` endpoint.
    *   Backend creates a `scrape_job` record in PostgreSQL with `status: pending`.
    *   Backend then adds a `scrape-task` job to the BullMQ queue in Redis, passing `scraperId` and `startUrl`.
4.  **Asynchronous Scraping (Scraper Worker)**:
    *   The `scraperWorker` constantly monitors the BullMQ queue in Redis.
    *   When a `scrape-task` job is available, a worker picks it up.
    *   Worker fetches the scraper configuration from PostgreSQL using `scraperId`.
    *   Worker updates the `scrape_job` status to `running`.
    *   Based on `scraping_method` (`cheerio` or `puppeteer`), it uses `scrapingEngine` to navigate to the `start_url` and extract data using the provided `selectors_json`.
    *   Scraped data is stored in the `scraped_items` table (as JSONB) in PostgreSQL, linking to the `job_id` and `scraper_id`.
    *   Worker updates the `scrape_job` status to `completed` or `failed` (with `error_message`) and the `scraper`'s `last_run` timestamp.
5.  **Viewing Scraped Data**:
    *   User navigates to a scraper's detail page or a specific job's detail page on the Frontend.
    *   Frontend makes API calls to Backend (e.g., `/api/scrapers/:id/items`, `/api/jobs/:id/items`).
    *   Backend retrieves data from `scraped_items` and `scrape_jobs` tables in PostgreSQL.
    *   If caching is enabled and data is in Redis, it serves from cache.
    *   Backend sends data back to Frontend for display.
6.  **Error Handling & Logging**:
    *   All errors are caught by `catchAsync` wrappers or `errorMiddleware` in the Backend, ensuring consistent error responses.
    *   Winston logger records application events, warnings, and errors to console and log files.

## 4. Scalability Considerations

*   **Stateless Backend API**: The Express API is stateless, relying on JWT for authentication, making it horizontally scalable. Multiple instances can be run behind a load balancer.
*   **Distributed Job Queue (BullMQ/Redis)**: Scraping tasks are offloaded to a queue, decoupling them from the main API process. Multiple `scraperWorker` instances can be run across different machines or containers to handle increased load, processing jobs concurrently.
*   **Database Scalability**: PostgreSQL can be scaled vertically or horizontally (e.g., read replicas, sharding) as needed. Efficient indexing and query optimization are crucial.
*   **Caching (Redis)**: Reduces load on the database for read-heavy operations, improving API response times.
*   **Containerization (Docker)**: Enables easy deployment, scaling, and isolation of services.

## 5. Security Considerations

*   **Authentication/Authorization**: JWT-based authentication ensures only authenticated users can access protected resources. Each request is authorized based on the user's ID.
*   **Input Validation**: Joi schemas are used on the backend to validate all incoming data, preventing common injection attacks and data corruption.
*   **Security Headers (Helmet)**: Sets various HTTP headers to protect against common web vulnerabilities like XSS, clickjacking, etc.
*   **CORS**: Configured to allow requests only from trusted origins.
*   **Rate Limiting**: Protects against brute-force attacks and denial-of-service by limiting the number of requests per IP.
*   **Environment Variables**: Sensitive information (database credentials, JWT secret) is stored in environment variables, not hardcoded.
*   **XSS Protection**: `xss-clean` middleware sanitizes inputs against XSS attacks.
*   **Password Hashing**: Bcryptjs is used to securely hash user passwords.

## 6. Observability

*   **Logging**: Winston provides structured logging, allowing for easy aggregation and analysis of logs in a production environment. Logs capture errors, warnings, and informational messages.
*   **Monitoring**: While not fully implemented (e.g., Prometheus/Grafana setup), the logging framework provides the foundation for integrating monitoring tools. BullMQ also offers a UI for monitoring queue status and job progress.

## 7. Development & Deployment

*   **Docker Compose**: Facilitates easy local development and single-host deployment by orchestrating all services.
*   **CI/CD (GitHub Actions)**: Automates testing and building, ensuring code quality and a smooth deployment process.
*   **Modular Design**: Clear separation of concerns into services, controllers, models, etc., improves maintainability and testability.
*   **Testing**: Comprehensive unit, integration, and API tests ensure code correctness and prevent regressions.