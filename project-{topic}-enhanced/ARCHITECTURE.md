```markdown
# 🏛️ Web Scraping Tools System Architecture

This document outlines the architecture of the Web Scraping Tools System, focusing on its components, interactions, and design principles.

## 1. High-Level Overview

The system follows a typical **N-tier architecture** with a clear separation of concerns, designed for scalability, maintainability, and extensibility.

```
+----------------+       +-------------------+       +-------------------+       +--------------------+
|                |       |  API Gateway /    |       |                   |       |                    |
|  Client (Web/  | <---> |  Load Balancer    | <---> |  Backend Service  | <---> |  Database (PgSQL)  |
|  Mobile App)   |       | (Nginx/Cloud LB)  |       |  (Node.js/Express)|       |                    |
|                |       |                   |       |                   |       |                    |
+----------------+       +-------------------+       +---------+---------+       +---------+----------+
                                                          |                       ^         |
                                                          |                       |         | (Stores Task Config,
                                                          |                       |         | Scraped Results)
                                                          v                       |         v
                                                      +-------------------+   +--------------------+
                                                      |                   |   |                    |
                                                      |  Scraping Engine  | <---|  Browser Runtime |
                                                      | (Puppeteer/Cheerio)|   | (Chromium for Puppeteer) |
                                                      |                   |   |                    |
                                                      +-------------------+   +--------------------+
```

## 2. Core Components

### 2.1. Client Application (Frontend) - *Out of Scope for this Implementation*

*   A web-based (e.g., React, Angular, Vue.js) or mobile application.
*   Interacts with the Backend Service through RESTful APIs.
*   Provides user interface for:
    *   User registration and login.
    *   Creating and managing scraping projects.
    *   Defining scraping tasks (target URLs, selectors, schedules).
    *   Viewing scraping results.
    *   Triggering manual scraping runs.

### 2.2. Backend Service (Node.js/Express.js with TypeScript)

This is the core of the system and the primary focus of this implementation.

*   **API Layer**:
    *   Handles incoming HTTP requests (RESTful API).
    *   Routes requests to appropriate controllers.
    *   Includes middleware for:
        *   **Authentication (`auth.middleware.ts`)**: Verifies JWT tokens and attaches user identity (`req.user`).
        *   **Authorization (`auth.middleware.ts`)**: Restricts access based on user roles (`admin`, `user`).
        *   **Error Handling (`errorHandler.middleware.ts`)**: Catches and processes all application errors, providing consistent error responses.
        *   **Logging (`logging.middleware.ts`)**: Logs request details, response status, and duration.
        *   **Rate Limiting (`rateLimit.middleware.ts`)**: Protects against abuse by limiting API request frequency per IP.
        *   **Security (`helmet`, `cors`)**: Standard security headers and CORS configuration.
    *   **Controllers (`src/controllers`)**:
        *   Contain the logic to handle incoming requests from routes.
        *   Validate input using **Zod**.
        *   Orchestrate calls to one or more services.
        *   Format responses for the client.
    *   **Services (`src/services`)**:
        *   Encapsulate the business logic of the application.
        *   **`AuthService`**: Manages user registration, login, and JWT token generation.
        *   **`UserService`**: Handles user CRUD operations.
        *   **`ProjectService`**: Manages scraping projects, including access control.
        *   **`ScrapingTaskService`**: Manages the lifecycle of scraping tasks (CRUD, initiation, basic scheduling).
        *   **`ScraperService`**: The core scraping engine, abstracting Puppeteer/Cheerio.
        *   **`ScrapingResultService`**: Stores and retrieves scraped data.
        *   **`CacheService`**: Provides an interface for in-memory caching.
    *   **Entities (`src/entities`)**:
        *   Define the structure of data objects (ORM models) using TypeORM decorators.
        *   `User`, `Project`, `ScrapingTask`, `ScrapingResult`.
        *   Represent tables in the PostgreSQL database.
    *   **Utilities (`src/utils`)**:
        *   **`logger.ts`**: Winston-based structured logging utility.
        *   **`AppError.ts`**: Custom error class for operational errors.
        *   `validation.ts`: Placeholder for common validation functions.
    *   **Configuration (`src/config`)**:
        *   **`environment.ts`**: Loads and validates environment variables.
        *   **`database.ts`**: Configures and initializes TypeORM with PostgreSQL.
        *   **`cache.ts`**: Configures and initializes `node-cache`.

### 2.3. Database (PostgreSQL)

*   **Primary Data Store**: Stores all application data.
*   **TypeORM**: Used as the Object-Relational Mapper (ORM) for interacting with the database.
*   **Schema**: Defined by `src/entities` and managed through database migrations (`src/database/migrations`).
    *   `users`: Stores user credentials and roles.
    *   `projects`: Stores scraping project definitions.
    *   `scraping_tasks`: Stores individual scraping task configurations (target URL, selectors, schedule).
    *   `scraping_results`: Stores the actual data extracted from scraping runs.
*   **Query Optimization**: TypeORM handles basic query generation. Manual query optimization (indexing, careful relations) can be applied for performance-critical scenarios.

### 2.4. Scraping Engine (Puppeteer & Cheerio)

*   **`ScraperService`**: Acts as an abstraction layer for scraping technologies.
*   **Puppeteer**: A Node library that provides a high-level API to control headless Chrome or Chromium.
    *   Used for scraping dynamic content (websites heavily reliant on JavaScript).
    *   Manages browser instances, navigation, and DOM interaction.
    *   Includes optimizations like request interception to block unnecessary resources.
*   **Cheerio**: A fast, flexible, and lean implementation of core jQuery specifically designed for the server.
    *   Used for parsing static HTML content.
    *   More efficient for simple pages as it doesn't require launching a full browser.

### 2.5. Cache Layer (Node-Cache)

*   **`CacheService`**: Provides an in-memory caching mechanism using `node-cache`.
*   Used to store frequently accessed data (e.g., user profiles, project details) to reduce database load and improve response times.
*   Cache invalidation strategies are implemented within services after data modifications.
*   For larger-scale production systems, an external distributed cache like Redis would be preferred.

## 3. Data Flow

1.  **Client Request**: A client (e.g., frontend application) sends an HTTP request to the Backend Service API.
2.  **API Gateway/Load Balancer**: (Optional, in a production setup) Routes the request to an available Backend Service instance.
3.  **Backend Middleware**: The request passes through security, logging, and rate-limiting middleware.
4.  **Routing**: Express routes the request to the appropriate controller method.
5.  **Controller Logic**: The controller validates input, calls relevant service(s), and prepares the response.
6.  **Service Logic**: Services execute business logic, performing:
    *   **Database Interactions**: Use TypeORM repositories to query or modify data in PostgreSQL.
    *   **Cache Interactions**: Check cache before querying DB, update/invalidate cache after DB writes.
    *   **Scraping Initiation**: `ScrapingTaskService` delegates to `ScraperService` to perform a scrape.
7.  **Scraping Process**:
    *   `ScraperService` decides whether to use Puppeteer or Cheerio based on task configuration.
    *   **Puppeteer**: Launches a browser, navigates to the URL, interacts with the page (if needed), extracts data via `page.evaluate()`.
    *   **Cheerio**: Fetches HTML via `fetch`, then parses and extracts data using DOM manipulation.
8.  **Result Storage**: Scraped data is passed back to `ScrapingResultService` and stored in the PostgreSQL database.
9.  **Response**: The controller sends a structured JSON response back to the client.
10. **Error Handling**: Any errors during this flow are caught by `errorHandler.middleware.ts`, logged, and a standardized error response is returned.

## 4. Design Principles

*   **Separation of Concerns**: Clear distinction between API, business logic, data access, and scraping logic.
*   **Modularity**: Code organized into logical modules (controllers, services, entities, middleware) for easier understanding and maintenance.
*   **Dependency Injection**: Services and controllers receive their dependencies (e.g., repositories, other services) through their constructors, enhancing testability and flexibility.
*   **Layered Architecture**: Enforces boundaries between layers, allowing changes in one layer with minimal impact on others.
*   **Robust Error Handling**: Centralized error management to provide consistent, informative error messages.
*   **Observability**: Integrated logging (`Winston`) for monitoring and debugging.
*   **Security**: JWT authentication, role-based authorization, rate limiting, and `Helmet` for HTTP header security.
*   **Scalability**: Stateless backend design (sessions managed by JWTs) facilitates horizontal scaling of the backend services. The scraping engine can also be scaled independently or run as separate worker processes in more advanced setups.

## 5. Future Enhancements

*   **Dedicated Scraping Workers**: For high-volume scraping, offload scraping tasks to separate worker services (e.g., using a message queue like RabbitMQ or Redis BullMQ) to decouple from the main API.
*   **Scheduling Service**: Implement a more robust scheduling system (e.g., using a cron library or a dedicated scheduler service) for recurrent scraping tasks.
*   **Advanced Caching**: Replace in-memory `node-cache` with a distributed cache like Redis for better scalability and persistence.
*   **Load Balancing**: Introduce a proper load balancer (e.g., Nginx, cloud load balancers) in front of multiple backend instances.
*   **Monitoring & Alerting**: Integrate with APM tools (e.g., Prometheus, Grafana, Datadog) for comprehensive monitoring.
*   **Frontend Application**: Develop a rich user interface to consume these APIs.
*   **Proxy Management**: Integrate with proxy services to handle IP rotation and avoid being blocked by target websites.
*   **Captcha Solving**: Integrate with CAPTCHA-solving services for complex scraping scenarios.
*   **Deployment Automation**: Full CI/CD pipelines to automate testing, building, and deployment.
```