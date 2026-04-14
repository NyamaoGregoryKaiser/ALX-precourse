```markdown
# Web Scraping Tools System - Architecture Documentation

This document provides a detailed overview of the architectural design, components, and interactions within the Web Scraping Tools System.

## 1. High-Level Architecture

The system follows a typical three-tier architecture:

```
+--------------------+        +---------------------+        +--------------------+
|     Frontend       |        |    Backend API      |        |     Database       |
|    (React.js)      |------->| (Node.js/Express.js)|<------>|   (PostgreSQL)     |
| - User Dashboard   |        | - Authentication    |        | - Users Table      |
| - Job Management   |        | - Authorization     |        | - ScrapingJobs     |
| - Data Visualization|        | - Rate Limiting     |        | - ScrapedData      |
+--------------------+        | - Caching (Redis)   |        | - JobLogs          |
                               | - Error Handling    |        | - Schema Migrations|
                               | - Logging (Winston) |        +--------------------+
                               | - Scraping Engine   |<-------------------+
                               |   (Puppeteer/Cheerio)|                     |
                               | - Job Scheduler     |                     |
                               | - Data Transformation|                     |
                               | - CRUD API Endpoints|                     |
                               +---------------------+                     |
                                         ^                                 |
                                         |                                 |
                                         +---------------------------------+
                                           (Data Persistence & Retrieval)
```

This separation allows for independent development, scaling, and deployment of each component.

## 2. Component Breakdown

### 2.1. Frontend (React.js)

*   **Purpose**: Provides a user-friendly interface for interacting with the scraping system.
*   **Key Responsibilities**:
    *   User authentication (Login, Register).
    *   Dashboard for managing scraping jobs (Create, View, Edit, Delete).
    *   Triggering immediate job runs.
    *   Displaying scraped data and job execution logs.
*   **Technologies**: React.js, React Router, Axios for API calls, Tailwind CSS for styling.
*   **Interaction**: Communicates with the Backend API via RESTful HTTP requests. JWT tokens are stored locally (`localStorage`) and sent with each authenticated request.

### 2.2. Backend API (Node.js/Express.js)

The core of the application, handling all business logic and orchestrating tasks.

*   **Framework**: Express.js for building robust RESTful APIs.
*   **Structure**:
    *   `src/server.js`: Application entry point, initializes Express app, connects to DB, starts scheduler.
    *   `src/app.js`: Configures Express middleware (security, parsing, CORS, rate limiting) and defines main API routes.
    *   `src/config/`: Manages environment variables, database configuration, and logging setup.
    *   `src/db/`: Contains Knex.js configuration, migration scripts, and seed data for PostgreSQL.
    *   `src/middleware/`: Houses custom Express middleware for authentication, authorization, error handling, caching, and rate limiting.
    *   `src/models/`: Encapsulates database interactions for `User`, `ScrapingJob`, `ScrapedData`, providing an ORM-like interface using Knex.js.
    *   `src/controllers/`: Contains the request handlers, orchestrating business logic, interacting with models and services, and formatting API responses.
    *   `src/routes/`: Defines the API endpoints and maps them to respective controller functions.
    *   `src/services/`: Core business logic services, including the `ScraperService` and `SchedulerService`.
    *   `src/utils/`: Helper utilities like `AppError`, `ApiResponse`, and `asyncHandler`.

*   **Key Sub-Components**:

    *   **Authentication & Authorization**:
        *   Uses `jsonwebtoken` for JWT generation and verification.
        *   `bcryptjs` for password hashing.
        *   `auth.middleware.js` verifies tokens and extracts user information.
        *   `authorize` middleware implements role-based access control.

    *   **Logging & Error Handling**:
        *   `Winston` for structured and comprehensive logging (console, file transports).
        *   `error.middleware.js` provides a centralized error handling mechanism, converting various errors into a consistent `AppError` format.

    *   **Caching Layer (Redis)**:
        *   `redis` client for connecting to Redis.
        *   `cache.middleware.js` intercepts GET requests, serving cached responses when available and storing new responses. Configurable cache duration.

    *   **Rate Limiting**:
        *   `express-rate-limit` middleware protects API endpoints (especially authentication routes) from brute-force attacks and abuse.

    *   **Scraping Engine (`ScraperService`)**:
        *   **Static Scraping**: Utilizes `cheerio` to parse HTML fetched via `node-fetch` (or built-in `fetch` in Node.js 18+). Ideal for simple, static content.
        *   **Dynamic Scraping**: Employs `puppeteer` (a headless Chrome browser API) to render JavaScript-heavy pages before extracting content with `cheerio`. This handles SPAs, AJAX-loaded content, etc.
        *   **Concurrency**: Manages a queue of scraping jobs and limits the number of concurrent scrapes to prevent overwhelming target websites or the server.
        *   **Job Status Updates**: Communicates with `ScrapingJob` model to update job status (`running`, `completed`, `failed`) and log events.

    *   **Job Scheduler (`SchedulerService`)**:
        *   Uses `node-cron` to schedule recurring scraping jobs based on cron expressions defined by users.
        *   Loads active scheduled jobs from the database on startup and periodically re-evaluates them.
        *   Adds, updates, and removes cron tasks dynamically.
        *   Enqueues jobs to the `ScraperService` when their scheduled time arrives.

### 2.3. Database (PostgreSQL)

*   **Purpose**: Persistent storage for all application data.
*   **Schema**:
    *   `users`: Stores user credentials and roles.
    *   `scraping_jobs`: Stores configurations for each scraping task (URL, selectors, type, schedule, status).
    *   `scraped_data`: Stores the actual data extracted by scraping jobs. Uses `JSONB` for flexible schema-less storage of scraped content.
    *   `job_logs`: Records events and errors related to scraping job executions.
*   **Query Optimization**:
    *   Indexes on foreign keys and frequently queried columns (`job_id`, `url` in `scraped_data`) to improve read performance.
    *   Use of `JSONB` for efficient storage and querying of semi-structured data.

### 2.4. Caching (Redis)

*   **Purpose**: In-memory data store used for caching API responses to reduce database load and improve response times for frequently accessed, read-heavy endpoints.
*   **Integration**: Integrated as an Express middleware that sits before route handlers.

## 3. Data Flow

1.  **User Interaction**: Frontend sends an API request (e.g., create job) to the Backend API.
2.  **API Gateway**: Express app receives the request.
3.  **Middleware Chain**:
    *   Security middleware (Helmet, XSS, Mongo Sanitize).
    *   Rate limiting.
    *   Authentication middleware (`verifyToken`) authenticates the user.
    *   Authorization middleware (`authorize`) checks user's role/permissions.
    *   Caching middleware checks Redis; if hit, returns cached response; if miss, proceeds.
4.  **Controller**: Executes business logic specific to the request.
    *   Interacts with `Models` (e.g., `ScrapingJob.create()`).
    *   Invokes `Services` (e.g., `schedulerService.addJob()` or `scraperService.enqueueScrape()`).
5.  **Models**: Interact with the PostgreSQL database using Knex.js to persist or retrieve data.
6.  **Services**:
    *   `SchedulerService`: Manages cron jobs. When a scheduled time arrives, it pushes a job to `ScraperService`.
    *   `ScraperService`: Fetches web pages (using `fetch` for static, `Puppeteer` for dynamic), parses content with `Cheerio`, processes extracted data.
    *   Logs job events to `job_logs` table via `ScrapingJob.logJob()`.
    *   Stores scraped data into `scraped_data` table via `ScrapedData.create()`.
    *   Updates `scraping_jobs` status.
7.  **Response**:
    *   Controller formats the response using `ApiResponse`.
    *   If caching middleware was active, the response is stored in Redis before being sent back.
    *   Express sends the response back to the Frontend.

## 4. Scalability Considerations

*   **Stateless Backend**: The Express.js backend is largely stateless, allowing for easy horizontal scaling by running multiple instances behind a load balancer.
*   **Separated Concerns**: Database, Redis, and application logic are in separate services, allowing them to be scaled independently.
*   **Scraping Concurrency**: `ScraperService` manages internal concurrency to avoid overwhelming target sites or local resources. This can be adjusted via configuration.
*   **Database**: PostgreSQL is highly scalable, especially with proper indexing and query optimization.
*   **Redis**: Provides a fast, scalable caching layer.

## 5. Security Measures

*   **JWT Authentication**: Secure, token-based authentication.
*   **Bcrypt Hashing**: Strong password hashing.
*   **Role-Based Access Control**: Granular control over who can access what.
*   **HTTPS (Deployment)**: Essential for securing communication in production (handled at load balancer/proxy level).
*   **Security Headers**: `helmet` middleware for various HTTP header protections.
*   **Input Sanitization**: `xss-clean` and `express-mongo-sanitize` (even for SQL, good practice).
*   **Rate Limiting**: Protects against brute-force attacks and DDoS.
*   **Environment Variables**: Sensitive information is stored in environment variables, not hardcoded.

## 6. Future Enhancements

*   **Distributed Scraping**: Integrate with a message queue (e.g., RabbitMQ, Kafka) and a distributed task queue (e.g., BullMQ) for more robust and scalable job processing across multiple scraping worker instances.
*   **Proxy Rotators**: Integrate with proxy services to avoid IP blocking from target websites.
*   **CAPTCHA Solving**: Integration with CAPTCHA solving services.
*   **Advanced Data Processing**: More complex data transformation, validation, and export options (CSV, Excel).
*   **Webhook Notifications**: Notify external systems upon job completion or failure.
*   **Monitoring Dashboards**: Integrate with Prometheus/Grafana for detailed metrics and alerts.
*   **User Management UI**: A dedicated admin interface for managing users and their roles.
```