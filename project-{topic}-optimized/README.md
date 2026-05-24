# Mobile Task Management Backend System

This is a comprehensive, production-ready backend system for a mobile task management and collaboration application. It is built using Node.js with Express.js, PostgreSQL, and Prisma ORM, designed to be scalable, secure, and maintainable. This project demonstrates enterprise-grade architecture, including authentication, authorization, caching, logging, error handling, testing, and CI/CD.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup](#local-development-setup)
    *   [Docker Setup](#docker-setup)
4.  [Database](#database)
    *   [Schema](#schema)
    *   [Migrations](#migrations)
    *   [Seeding](#seeding)
5.  [API Endpoints](#api-endpoints)
    *   [API Documentation](#api-documentation)
    *   [Authentication](#authentication)
    *   [Users](#users)
    *   [Teams](#teams)
    *   [Projects](#projects)
    *   [Tasks](#tasks)
    *   [Comments](#comments)
6.  [Testing](#testing)
    *   [Unit Tests](#unit-tests)
    *   [Integration/API Tests](#integrationapi-tests)
    *   [Performance Considerations](#performance-considerations)
7.  [Configuration](#configuration)
8.  [Logging & Monitoring](#logging--monitoring)
9.  [Error Handling](#error-handling)
10. [Caching](#caching)
11. [Rate Limiting](#rate-limiting)
12. [CI/CD](#cicd)
13. [Architecture Documentation](#architecture-documentation)
14. [Deployment Guide](#deployment-guide)
15. [Contributing](#contributing)
16. [License](#license)

## Features

*   **User Management:** Register, login, manage user profiles.
*   **Authentication & Authorization:** JWT-based authentication, role-based access control (User, Manager, Admin).
*   **Team Management:** Create teams, add/remove members, assign team roles.
*   **Project Management:** Create projects, assign owners and teams, track status.
*   **Task Management:** Create, assign, update, and delete tasks within projects. Track task status and priority.
*   **Comments:** Add comments to tasks for collaboration.
*   **Attachments (Conceptual):** Placeholder for file uploads.
*   **Data Filtering, Sorting, Pagination:** Flexible querying for lists of resources.
*   **Caching:** Redis-based caching for frequently accessed data.
*   **Rate Limiting:** Protects API endpoints from abuse.
*   **Robust Error Handling:** Centralized middleware for graceful error responses.
*   **Structured Logging:** Winston for consistent logging across the application.
*   **Comprehensive Testing:** Unit, integration, and API tests with coverage reporting.
*   **Containerization:** Docker for easy setup and deployment.
*   **CI/CD Pipeline:** GitHub Actions for automated testing and deployment.
*   **API Documentation:** OpenAPI/Swagger for interactive API exploration.

## Technology Stack

*   **Backend:** Node.js, Express.js
*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **Authentication:** JSON Web Tokens (JWT), bcryptjs
*   **Validation:** Joi
*   **Caching:** Redis
*   **Logging:** Winston
*   **Testing:** Jest, Supertest
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions
*   **API Documentation:** Swagger UI Express, YAML.js
*   **Security:** Helmet, CORS, Express Rate Limit
*   **Utilities:** Dotenv, Compression, Morgan

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   Node.js (v18 or higher)
*   npm (or yarn)
*   Docker and Docker Compose (recommended for easy setup)
*   PostgreSQL database (if not using Docker)
*   Redis server (if not using Docker)

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/mobile-backend-system.git
    cd mobile-backend-system
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the project root based on the `.env.example` (or the provided `.env` content).
    Make sure your `DATABASE_URL` and `REDIS_URL` point to your local PostgreSQL and Redis instances.
    Example `.env` content (adjust ports/credentials as needed):
    ```ini
    NODE_ENV=development
    PORT=3000

    DATABASE_URL="postgresql://user:password@localhost:5432/taskdb?schema=public"
    # For Docker:
    # DATABASE_URL="postgresql://user:password@db:5432/taskdb?schema=public"

    JWT_SECRET=supersecretjwtkeythatshouldbemorecomplexinproduction
    JWT_ACCESS_EXPIRATION_MINUTES=30
    JWT_REFRESH_EXPIRATION_DAYS=7

    REDIS_URL="redis://localhost:6379"
    # For Docker:
    # REDIS_URL="redis://redis:6379"

    # Test Database
    TEST_DATABASE_URL="postgresql://user:password@localhost:5433/taskdb_test?schema=public"
    ```
    **Note:** For `TEST_DATABASE_URL`, ensure your local PostgreSQL is running and you have a separate database/port configured for tests to prevent data loss in your main dev DB.

4.  **Database Setup (without Docker):**
    *   Ensure your PostgreSQL server is running.
    *   Create a database named `taskdb` (or whatever you configure in `DATABASE_URL`).
    *   Apply Prisma migrations:
        ```bash
        npx prisma migrate dev --name initial # Creates initial schema, you can skip --name
        ```
    *   Seed the database with initial data:
        ```bash
        npm run prisma:seed
        ```

5.  **Run the application:**
    ```bash
    npm run dev # Starts with nodemon for auto-reloading
    ```
    The server should start on `http://localhost:3000`.

### Docker Setup (Recommended)

Docker Compose provides a simple way to run the application, PostgreSQL, and Redis in isolated containers.

1.  **Ensure Docker is running** on your machine.

2.  **Set up environment variables:**
    Create a `.env` file in the project root. For `DATABASE_URL` and `REDIS_URL`, use the service names defined in `docker-compose.yml`:
    ```ini
    # ... other environment variables ...
    DATABASE_URL="postgresql://user:password@db:5432/taskdb?schema=public"
    REDIS_URL="redis://redis:6379"
    ```
    Ensure `JWT_SECRET` is set in your `.env` file.

3.  **Build and run the Docker containers:**
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Builds the Docker images (if not already built or if changes were made to Dockerfile).
    *   `-d`: Runs the containers in detached mode (in the background).

4.  **Apply database migrations and seed data within the running container:**
    ```bash
    docker-compose exec app npx prisma migrate deploy
    docker-compose exec app npm run prisma:seed
    ```

5.  **Access the application:**
    The application will be available at `http://localhost:3000`.
    PostgreSQL will be on `localhost:5432` and Redis on `localhost:6379`.

6.  **Stop Docker containers:**
    ```bash
    docker-compose down
    ```

## Database

The database layer uses PostgreSQL with Prisma as the ORM.

### Schema (`prisma/schema.prisma`)

Defines the data models (User, Team, Project, Task, Comment, Attachment, TeamMember) and their relationships, including enums for roles and task statuses. This provides a clear, type-safe definition of the application's data structure.

### Migration Scripts (`prisma/migrations/`)

Prisma handles database migrations automatically. When you modify `prisma/schema.prisma`, you generate a new migration:
```bash
npx prisma migrate dev --name add_new_feature_tables
```
To apply migrations in production:
```bash
npx prisma migrate deploy
```

### Seed Data (`prisma/seed.ts`)

The `prisma/seed.ts` script populates the database with initial users (including an admin, manager, and regular user), teams, projects, tasks, comments, and attachments. This is useful for development and testing environments.
Run with:
```bash
npm run prisma:seed
```

### Query Optimization

Prisma generally produces efficient queries. Key optimization practices include:
*   **Eager Loading:** Using `include` in Prisma queries to fetch related data in a single query, preventing N+1 problems (e.g., fetching a project and all its tasks in one go). This is demonstrated in the service layers.
*   **Filtering, Sorting, Pagination:** The `APIFeatures` utility (in `src/utils/apiFeatures.js`) dynamically constructs Prisma queries based on request parameters for efficient data retrieval.
*   **Indexes:** Prisma implicitly adds indexes for `@id`, `@unique`, and `@relation` fields. For frequently queried non-unique fields, consider adding explicit `@index` to the schema.

## API Endpoints

The API is structured using versioning (`/api/v1`) and RESTful principles.

### API Documentation (`/api-docs`)

An interactive API documentation is available at `http://localhost:3000/api-docs` (after the server starts). It is generated using Swagger UI Express from `docs/swagger.yaml`. This allows developers to easily explore available endpoints, request/response schemas, and even try out API calls directly.

### Authentication

*   `POST /api/v1/auth/register`: Register a new user.
*   `POST /api/v1/auth/login`: Log in and receive JWT access and refresh tokens.
*   `POST /api/v1/auth/refresh-tokens`: Use a refresh token to get new access and refresh tokens.
*   `POST /api/v1/auth/logout`: Invalidate a refresh token to log out a user.

### Users

*   `GET /api/v1/users`: Get all users (Admin/Manager only). Supports filtering, sorting, pagination.
*   `GET /api/v1/users/:id`: Get user by ID (User can get own, Admin/Manager can get any).
*   `PATCH /api/v1/users/:id`: Update user profile (User can update own, Admin/Manager can update any).
*   `DELETE /api/v1/users/:id`: Delete user (Admin only).
*   `PATCH /api/v1/users/:id/assign-role`: Assign a role to a user (Admin only).

### Teams

*   `POST /api/v1/teams`: Create a new team (Admin/Manager).
*   `GET /api/v1/teams`: Get all teams.
*   `GET /api/v1/teams/:id`: Get team by ID (Team members or Admin).
*   `PATCH /api/v1/teams/:id`: Update team (Team Managers or Admin).
*   `DELETE /api/v1/teams/:id`: Delete team (Admin only).
*   `POST /api/v1/teams/:id/members`: Add member to team (Team Managers or Admin).
*   `DELETE /api/v1/teams/:id/members`: Remove member from team (Team Managers or Admin).
*   `PATCH /api/v1/teams/:id/members/role`: Update team member role (Team Managers or Admin).

### Projects

*   `POST /api/v1/projects`: Create a new project (Authenticated users).
*   `GET /api/v1/projects`: Get all projects. Supports filtering, sorting, pagination.
*   `GET /api/v1/projects/:id`: Get project by ID (Project owner, team members, or Admin).
*   `PATCH /api/v1/projects/:id`: Update project (Project owner, team managers, or Admin).
*   `DELETE /api/v1/projects/:id`: Delete project (Project owner, team managers, or Admin).

### Tasks

*   `POST /api/v1/projects/:projectId/tasks`: Create a new task within a project.
*   `GET /api/v1/projects/:projectId/tasks`: Get all tasks for a specific project.
*   `GET /api/v1/tasks`: Get all tasks across projects. Supports filtering, sorting, pagination.
*   `GET /api/v1/tasks/:id`: Get task by ID (Project owner, assignee, team members, or Admin).
*   `PATCH /api/v1/tasks/:id`: Update task (Project owner, team managers, assignee, or Admin).
*   `DELETE /api/v1/tasks/:id`: Delete task (Project owner, team managers, or Admin).

### Comments

*   `POST /api/v1/tasks/:taskId/comments`: Add a new comment to a task.
*   `GET /api/v1/tasks/:taskId/comments`: Get all comments for a task.
*   `GET /api/v1/tasks/:taskId/comments/:id`: Get a specific comment by ID.
*   `PATCH /api/v1/tasks/:taskId/comments/:id`: Update a comment (Author only).
*   `DELETE /api/v1/tasks/:taskId/comments/:id`: Delete a comment (Author, Project Owner, Team Manager, or Admin).

## Testing

The project emphasizes high-quality testing with Jest.

### Unit Tests (`tests/unit/`)

*   **Coverage:** Aim for 80%+ coverage for core business logic.
*   **Focus:** Individual functions/services (e.g., `auth.service.js`).
*   **Mocks:** Prisma client, Redis client, bcrypt, and JWT are mocked to isolate the service logic.
*   **Example:** `tests/unit/auth.service.test.js`

### Integration/API Tests (`tests/integration/`)

*   **Focus:** End-to-end testing of API endpoints using `supertest`.
*   **Database Interaction:** These tests hit a *separate test database* to ensure real database interactions are correct without affecting development data.
*   **Environment:** The CI/CD pipeline and local setup use `TEST_DATABASE_URL` for this purpose.
*   **Setup/Teardown:** `beforeAll`/`afterAll` hooks handle database cleaning and seeding for each test suite.
*   **Example:** `tests/integration/auth.integration.test.js`

### Performance Considerations

*   **Caching:** Redis is integrated to cache frequently accessed data, reducing database load.
*   **Query Optimization:** As discussed in the [Database](#database) section, Prisma's `include` and `APIFeatures` minimize database round trips.
*   **Compression:** `compression` middleware reduces response payload size.
*   **Rate Limiting:** `express-rate-limit` prevents abuse and potential DoS attacks.
*   **Monitoring:** Logging (Winston) helps identify slow queries or bottlenecks.
*   **Future Enhancements:** For production, consider dedicated performance testing tools like [k6](https://k6.io/) or [Artillery](https://www.artillery.io/) to simulate high load and identify bottlenecks under stress.

**To run all tests:**
```bash
npm test
```
**To run tests with coverage report:**
```bash
npm run test:coverage
```

## Configuration (`config/config.js`)

All application configurations are managed through environment variables loaded via `dotenv`. The `config.js` module provides a centralized place to define, validate (using Joi), and access these configurations, ensuring type safety and preventing runtime errors due to missing or invalid environment variables.

Sensitive information like `JWT_SECRET` and database credentials should always be stored securely in environment variables and never committed to version control.

## Logging & Monitoring

*   **Winston (`src/utils/logger.js`):** A robust logging library configured for different environments.
    *   **Development:** Logs to console with colorization.
    *   **Production:** Logs to files (`logs/error.log` for errors, `logs/combined.log` for all levels) and console (uncolored).
    *   **Structured Logging:** Uses a custom format that can be easily parsed by log aggregators (e.g., ELK Stack, Splunk, CloudWatch Logs).
*   **Morgan (`src/app.js`):** HTTP request logger middleware. In development, it uses a concise format; in production, it logs more details to Winston, providing insight into API traffic.

## Error Handling (`src/middleware/errorHandler.js`)

A centralized error handling middleware (`errorHandler.js`) catches all errors, processes them, and sends appropriate, user-friendly responses.
*   **`AppError` (`src/utils/appError.js`):** A custom error class used for operational errors (expected errors, e.g., "User not found," "Invalid input"). This allows for precise control over HTTP status codes and messages.
*   **Async Wrapper (`src/utils/catchAsync.js`):** A higher-order function that wraps async Express route handlers, ensuring any unhandled promise rejections are caught and passed to the error handling middleware.
*   **Database Error Handling:** Catches specific Prisma errors (e.g., unique constraint violations) and converts them into meaningful `AppError` instances.
*   **Production vs. Development:** Provides verbose error details (stack trace) in development for debugging, but sends generic messages in production to prevent leaking sensitive information.

## Caching (`src/middleware/cache.js`)

*   **Redis Integration:** Uses `redis` client to connect to a Redis instance.
*   **`cacheMiddleware`:** An Express middleware that caches GET request responses. If data is found in Redis, it's served directly; otherwise, the request proceeds, and the response is cached before being sent.
*   **`invalidateCache`:** A middleware to clear relevant cache entries after CUD (Create, Update, Delete) operations, ensuring data freshness. This prevents serving stale data from the cache.
*   **Cache Keys:** Keys are generated based on the request URL and user ID (for user-specific caching).

## Rate Limiting (`src/middleware/rateLimiter.js`)

*   **`express-rate-limit`:** Middleware to limit repeated requests to public APIs.
*   **`authLimiter`:** Specifically configured for authentication routes (`/auth/login`) to prevent brute-force attacks (e.g., 100 requests per 15 minutes per IP).
*   **`apiLimiter`:** Applied to general API routes (`/api`) to protect against excessive requests (e.g., 1000 requests per hour per IP).

## CI/CD (`.github/workflows/main.yml`)

A GitHub Actions workflow is configured for Continuous Integration and Continuous Deployment:
*   **Triggers:** Runs on pushes and pull requests to `main` and `develop` branches.
*   **Build & Test Job:**
    *   **Environment Setup:** Sets up Node.js and spins up isolated PostgreSQL and Redis service containers for testing.
    *   **Dependencies:** Installs Node.js dependencies.
    *   **Database Migrations:** Applies Prisma migrations to the test database.
    *   **Linting:** Runs ESLint to enforce code style and catch potential issues.
    *   **Testing:** Executes unit and integration tests with coverage reporting.
    *   **Docker Build:** Builds the Docker image of the application.
*   **Deploy Job:**
    *   **Conditional Deployment:** Only runs on pushes to the `main` branch.
    *   **AWS Integration (Example):** Shows steps for authenticating with AWS, building and pushing the Docker image to Amazon ECR, and deploying to Amazon ECS. This can be adapted for other cloud providers (Azure, Google Cloud) or Kubernetes.
    *   **Secrets:** Emphasizes using GitHub Secrets for sensitive credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `JWT_SECRET`).

## Architecture Documentation (`docs/ARCHITECTURE.md`)

(Content provided as a separate file)

## Deployment Guide

### Using Docker Compose (Local/Development Server)

As covered in [Docker Setup](#docker-setup), you can run `docker-compose up -d --build` to start the application, database, and Redis.

### To a Production Environment (e.g., AWS ECS, Kubernetes)

1.  **Container Registry:** Push your Docker image to a container registry (e.g., Docker Hub, Amazon ECR, Google Container Registry). The CI/CD pipeline demonstrates pushing to ECR.
    *   `docker build -t your-image-name:tag .`
    *   `docker tag your-image-name:tag your-registry/your-repo:tag`
    *   `docker push your-registry/your-repo:tag`

2.  **Database:** Provision a managed PostgreSQL database service (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL). Ensure it's highly available and properly secured.

3.  **Caching:** Provision a managed Redis service (e.g., AWS ElastiCache, Azure Cache for Redis, Google Cloud Memorystore for Redis).

4.  **Application Hosting:** Deploy your Docker container to a container orchestration service:
    *   **AWS ECS/Fargate:** Define an ECS Task Definition with your container image, environment variables (pointing to your managed DB/Redis), CPU/memory limits, and port mappings. Create an ECS Service to run and maintain desired count of tasks. Use an Application Load Balancer (ALB) to expose the service to the internet.
    *   **Kubernetes:** Create Deployment and Service YAMLs. Ensure proper resource requests/limits, environment variable injection, and Horizontal Pod Autoscaling (HPA) for scalability. Use an Ingress controller for external access.
    *   **Other Platforms:** Cloud Run, App Platform, Heroku, etc., also support container deployments.

5.  **Environment Variables:** Crucially, configure your production environment variables (e.g., `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `NODE_ENV=production`) securely in your deployment platform (e.g., ECS Task Definition, Kubernetes Secrets, environment variables in PaaS).

6.  **Monitoring & Logging:** Integrate your application logs (from Winston) with your cloud provider's logging service (e.g., AWS CloudWatch Logs, Google Cloud Logging, Azure Monitor) for centralized monitoring and alerting.

7.  **Security:**
    *   Ensure all communication is over HTTPS. Use load balancers or API gateways for SSL termination.
    *   Implement proper network security (VPC, security groups, network ACLs) to restrict access to your database and Redis instances.
    *   Regularly update dependencies and apply security patches.

## Contributing

Feel free to fork this repository, submit pull requests, or open issues. Follow standard Git practices.

## License

This project is licensed under the MIT License.

---
```

```markdown