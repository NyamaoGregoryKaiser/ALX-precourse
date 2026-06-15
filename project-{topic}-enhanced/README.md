# Task Management Mobile App Backend

This is a comprehensive, production-ready backend system for a mobile task management application. It's built with **NestJS** (TypeScript), leveraging **PostgreSQL** as the primary database and **TypeORM** as the ORM. The system emphasizes modularity, scalability, security, and maintainability, aligning with enterprise-grade standards and ALX Software Engineering principles.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Technology Stack](#technology-stack)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Setup (without Docker)](#local-setup-without-docker)
    *   [Docker Setup (Recommended)](#docker-setup-recommended)
    *   [Database Initialization](#database-initialization)
    *   [Running the Application](#running-the-application)
5.  [API Documentation (Swagger)](#api-documentation-swagger)
6.  [Authentication & Authorization](#authentication--authorization)
7.  [Testing](#testing)
    *   [Running Tests](#running-tests)
    *   [Test Coverage](#test-coverage)
8.  [Configuration](#configuration)
9.  [Additional Features](#additional-features)
    *   [Logging & Monitoring](#logging--monitoring)
    *   [Error Handling](#error-handling)
    *   [Caching](#caching)
    *   [Rate Limiting](#rate-limiting)
    *   [Query Optimization](#query-optimization)
10. [CI/CD](#cicd)
11. [Deployment Guide](#deployment-guide)
12. [Project Structure](#project-structure)
13. [Contributing](#contributing)
14. [License](#license)

---

## 1. Features

*   **User Management**: Register, login, manage user profiles.
*   **Authentication**: JWT-based authentication for secure API access.
*   **Authorization**: Role-based (though simple user-based for now) access control using Guards.
*   **Task Management**:
    *   Create, read (single, all, filtered), update, delete tasks.
    *   Assign tasks to categories.
    *   Filter tasks by status, priority, due date.
*   **Category Management**:
    *   Create, read (single, all, filtered), update, delete categories.
    *   Categories are user-specific.
*   **Database Integration**: PostgreSQL with TypeORM for robust data persistence.
*   **Data Validation**: DTOs and `class-validator` for strict input validation.
*   **Global Error Handling**: Centralized exception filtering.
*   **Structured Logging**: Custom Winston logger.
*   **Caching**: Redis integration for frequently accessed data (e.g., categories).
*   **Rate Limiting**: Throttling requests to prevent abuse.
*   **Comprehensive Testing**: Unit, Integration, and End-to-End (E2E) tests.
*   **Dockerization**: Containerized application and database for easy setup and deployment.
*   **CI/CD Pipeline**: GitHub Actions for automated build, lint, and test.
*   **API Documentation**: Auto-generated Swagger UI.

## 2. Architecture

The application follows a **Hexagonal Architecture** (or Ports and Adapters) with a layered structure, commonly seen in enterprise-grade NestJS applications:

*   **Controllers**: Handle incoming HTTP requests, validate input (using DTOs), and delegate to services. They act as the "API Gateway" for each module.
*   **Services**: Encapsulate business logic, data processing, and orchestrate interactions with repositories. This is where core algorithms and domain logic reside. Services are designed to be framework-agnostic and testable.
*   **Entities (TypeORM)**: Represent the data model, mapping directly to database tables. They define the schema and relationships.
*   **Repositories (TypeORM)**: Provide an abstraction layer for database operations (CRUD). Services interact with repositories to persist and retrieve data.
*   **DTOs (Data Transfer Objects)**: Define the shape of data for requests and responses, ensuring strict validation and clear API contracts.
*   **Modules**: Group related controllers, services, and entities into cohesive units (e.g., `AuthModule`, `UsersModule`, `TasksModule`). This promotes maintainability and scalability.
*   **Common Components**: Global filters, interceptors, decorators, and logging utilities for cross-cutting concerns.

![Architecture Diagram](https://mermaid.live/svg/eyJjb2RlIjoiZ3JhcGggVERcbiAgUFVCSlMgW1B1YmxpYyBKU1wgQ2xpZW50c11cbiAgc3ViZ3JhcGggTmVzdEpTIEJhY2tlbmRcbiAgICBDTCAoQ29udHJvbGxlcnMpIC0tPiBTUlYgKFNlcnZpY2VzKVxuICAgIFNSViAtLT4gUlBPIChSZXBvc2l0b3JpZXMpXG4gICAgUlBPIAtLT4gREIgKERhdGFiYXNlKVxuICAgIENVU1QgKEN1c3RvbSBVc2VyIERhdGEpXG4gICAgUkVRICgUmVxdWVzdCBDb250cm9sIHdpdGggRFRPcyApIC0tPiBDTFxuICAgIENhY2hlIChSZWRpcyBDYWNoZSkge3s1Y2FjaGluZ3x9fVxuICAgIENhY2hlIC0tLSBDTlxuICAgIExPRyAoTG9nZ2luZyAmIE1vbml0b3JpbmcpXG4gICAgTE9HIC0tLSBTUlZcbiAgICBFUlIgKEVycm9yIEhhbmRsaW5nKVxuICAgIEVSUiAtLS0gQ0xecmV0dXJuc1xuICAgIFJhdGVMaW1pdCAoUmF0ZSBMaW1pdGluZykKICAgIFJhdGVMaW1pdCAtLS0gQ0xccmVqZWN0c1xuICAgIFNSViAtLT4gQ09ORiAoQ29uZmlndXJhdGlvbiApXG4gZW5kXG4gIFBVQlNKIHItLW8gUkVRXG4gIFRFU1QgKFRlc3RpbmcpIC0tLW8gQ0xcbiAgREVOVihEZXZvcHMgJmBPcHMpIC0tLW8gQ09ORiIsIm1lcm1haWQiOnsidGhlbWUiOiJkZWZhdWx0In19)
_Simplified Architecture Diagram_

## 3. Technology Stack

*   **Backend Framework**: [NestJS](https://nestjs.com/) (TypeScript)
*   **Database**: [PostgreSQL](https://www.postgresql.org/)
*   **ORM**: [TypeORM](https://typeorm.io/)
*   **Authentication**: [Passport.js](http://www.passportjs.org/) (JWT Strategy)
*   **Validation**: [class-validator](https://github.com/typestack/class-validator), [class-transformer](https://github.com/typestack/class-transformer)
*   **Caching**: [Redis](https://redis.io/)
*   **Logging**: [Winston](https://github.com/winstonjs/winston)
*   **Testing**: [Jest](https://jestjs.io/), [Supertest](https://github.com/visionmedia/supertest)
*   **Containerization**: [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/)
*   **CI/CD**: [GitHub Actions](https://docs.github.com/en/actions)
*   **API Documentation**: [Swagger (OpenAPI)](https://swagger.io/)

## 4. Setup and Installation

### Prerequisites

*   Node.js (v18+) and npm
*   Git
*   Docker and Docker Compose (recommended for easy setup)
*   PostgreSQL (if running without Docker)
*   Redis (if running without Docker)

### Local Setup (without Docker)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-backend.git
    cd task-management-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the project root based on `.env.example`:
    ```ini
    # Database Configuration
    DATABASE_HOST=localhost
    DATABASE_PORT=5432
    DATABASE_USERNAME=postgres
    DATABASE_PASSWORD=postgres
    DATABASE_NAME=task_management_db
    DATABASE_SYNCHRONIZE=false # Set to false in production, use migrations
    DATABASE_LOGGING=false # Set to true for debugging SQL queries

    # JWT Authentication
    JWT_SECRET=superSecretKeyForDev
    JWT_EXPIRES_IN=3600s # 1 hour

    # Redis Cache
    REDIS_HOST=localhost
    REDIS_PORT=6379
    REDIS_TTL=3600 # Cache Time-To-Live in seconds (1 hour)

    # Application Port
    PORT=3000

    # Throttler (Rate Limiting)
    THROTTLER_TTL=60 # Seconds
    THROTTLER_LIMIT=10 # Requests per TTL
    ```
    **Important:** For production, replace `superSecretKeyForDev` with a strong, randomly generated secret key.

4.  **Start PostgreSQL & Redis:**
    Ensure you have a PostgreSQL server running on `localhost:5432` with a database named `task_management_db` and user/password `postgres`/`postgres`.
    Ensure you have a Redis server running on `localhost:6379`.

### Docker Setup (Recommended)

This method simplifies setting up the database and Redis without manual installation.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-backend.git
    cd task-management-backend
    ```

2.  **Build and run Docker containers:**
    ```bash
    docker-compose up --build
    ```
    This command will:
    *   Build the `task-management-backend` Docker image.
    *   Start a PostgreSQL container (`task_management_db`).
    *   Start a Redis container (`task_management_redis`).
    *   Start the NestJS backend application container, linked to the database and Redis.

    The application will be accessible at `http://localhost:3000`.

    To stop the containers:
    ```bash
    docker-compose down
    ```

### Database Initialization

After starting the database (either locally or via Docker), you need to run migrations to create the schema.

1.  **Run Migrations:**
    *   **If running locally (without Docker Compose):**
        ```bash
        npm run typeorm migration:run
        ```
    *   **If running with Docker Compose (via `docker exec`):**
        Wait for the containers to fully start. Then, execute the migration command inside the backend container:
        ```bash
        docker exec task-management-backend-app npm run typeorm migration:run
        ```
        (Replace `task-management-backend-app` with your actual service name if different, typically `task-management-backend` or `backend`).

2.  **Seed Data (Optional):**
    To populate the database with some initial users, categories, and tasks:
    ```bash
    npm run seed
    ```
    *   **With Docker Compose:**
        ```bash
        docker exec task-management-backend-app npm run seed
        ```

### Running the Application

*   **Development mode (without Docker):**
    ```bash
    npm run start:dev
    ```
    The application will restart automatically on code changes.

*   **Production mode (without Docker, after building):**
    ```bash
    npm run build
    npm run start:prod
    ```

*   **With Docker Compose:**
    The application automatically starts when you run `docker-compose up`.

## 5. API Documentation (Swagger)

Once the application is running, the API documentation is available via Swagger UI:

*   **Swagger UI**: `http://localhost:3000/api`

This interface allows you to explore all available endpoints, understand their request/response schemas, and even test them directly from your browser.

## 6. Authentication & Authorization

The backend implements JWT (JSON Web Token) based authentication.

*   **Registration (`POST /auth/signup`)**: Create a new user account.
*   **Login (`POST /auth/signin`)**: Authenticate and receive an `accessToken`. This token must be included in the `Authorization` header of subsequent requests as `Bearer <accessToken>`.
*   **Protected Routes**: Many routes (e.g., all task and category endpoints, user profile update) require a valid JWT. These are protected using `@UseGuards(JwtAuthGuard)`.

**Example:**
To access `/tasks`, you first need to `POST` to `/auth/signin` with valid credentials. The response will contain an `access_token`.
Then, for `/tasks` (and other protected endpoints), include the header:
`Authorization: Bearer <your_access_token>`

## 7. Testing

The project includes comprehensive tests:

*   **Unit Tests**: Focus on individual units of code (e.g., services, functions) in isolation, mocking dependencies.
*   **Integration Tests**: Test the interaction between multiple components (e.g., a controller and its service), often mocking external services like databases or using a test database.
*   **E2E (End-to-End) / API Tests**: Simulate real user scenarios by making actual HTTP requests to the running application, ensuring that the entire system works as expected.

### Running Tests

*   **Run all tests (unit, integration, e2e):**
    ```bash
    npm run test
    ```
*   **Run unit and integration tests only:**
    ```bash
    npm run test:unit
    ```
*   **Run E2E tests only:**
    ```bash
    npm run test:e2e
    ```
    For E2E tests, ensure your database is running and potentially clean before each run or use an in-memory database for speed. The current setup will connect to `task_management_db_test`. You might need to adjust your `DATABASE_NAME` in `.env` for testing.

*   **Run tests with coverage report:**
    ```bash
    npm run test:cov
    ```

### Test Coverage

The goal is to achieve **80%+ test coverage** for critical business logic (services). The provided tests demonstrate this approach.

## 8. Configuration

*   **Environment Variables**: All sensitive configuration (database credentials, JWT secret, Redis connection) are managed via environment variables using the `.env` file and `@nestjs/config`.
*   **Validation**: A Joi-based validation schema (`src/config/validation-schema.ts`) is used to ensure all required environment variables are present and correctly typed at application startup.

## 9. Additional Features

### Logging & Monitoring

*   **Custom Logger**: Uses `Winston` for structured, leveled logging (e.g., `info`, `warn`, `error`).
*   **Logging Interceptor**: A global interceptor (`src/common/interceptors/logging.interceptor.ts`) logs details of every incoming request and outgoing response, including duration and status.
*   **Monitorability**: Log outputs can be easily configured to go to `stdout` (for Docker logs), files, or external logging services (e.g., ELK stack, Grafana Loki) for centralized monitoring.

### Error Handling

*   **Global Exception Filter**: A custom `HttpExceptionFilter` (`src/common/filters/http-exception.filter.ts`) catches all unhandled exceptions across the application, formatting them into consistent, developer-friendly error responses.
*   **HTTP Status Codes**: Appropriate HTTP status codes are returned for different error types (e.g., 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error).

### Caching

*   **Redis Integration**: Integrated with Redis using NestJS's `CacheManager`.
*   **Cache Interceptor**: The `@CacheInterceptor` is used on `GET /categories` to cache responses, reducing database load for frequently accessed, less volatile data. This significantly improves response times for these endpoints.
*   **Configuration**: Cache TTL (Time-To-Live) is configurable via environment variables.

### Rate Limiting

*   **Throttler Module**: Implemented using `@nestjs/throttler` to prevent abuse and brute-force attacks.
*   **Global Limit**: A global rate limit is applied to all endpoints (e.g., 10 requests per 60 seconds). This is configurable via environment variables (`THROTTLER_TTL`, `THROTTLER_LIMIT`).
*   **Headers**: When rate limits are hit, the API returns a `429 Too Many Requests` status, and includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.

### Query Optimization

*   **Indexing**: Critical fields in entities (`User.username`, `Task.userId`, `Category.userId`, `Task.categoryId`) are indexed in TypeORM entities to speed up common queries (e.g., user lookup, tasks by user/category).
*   **Select Clauses**: In services, only necessary columns are selected where possible to reduce data transfer size, although for simplicity full entities are often returned in this example. For very large datasets, explicit `select` statements in TypeORM queries would be crucial.
*   **Eager/Lazy Relations**: TypeORM allows defining eager or lazy loading for relations. Eager loading is used judiciously (e.g., `Category` on `Task`) to avoid N+1 problems in common access patterns.
*   **Transactions**: For complex operations involving multiple database writes, transactions are used to ensure data consistency and integrity. (Not explicitly shown for simplicity, but a best practice).

## 10. CI/CD

A basic CI/CD pipeline is configured using GitHub Actions (`.github/workflows/main.yml`). This workflow automatically:

1.  **Triggers**: On `push` to `main` and `pull_request` events.
2.  **Checks out code**: Retrieves the latest code from the repository.
3.  **Sets up Node.js**: Ensures the correct Node.js version is used.
4.  **Installs dependencies**: `npm install`.
5.  **Lints code**: Runs `npm run lint` to enforce code style and catch potential issues.
6.  **Builds application**: `npm run build` to compile TypeScript to JavaScript.
7.  **Runs tests**: Executes `npm run test:cov` to run all tests and generate a coverage report.

This automated process ensures that every code change is validated before it can be merged, maintaining code quality and stability.

## 11. Deployment Guide

This backend is designed for containerized deployment, making it suitable for various cloud platforms.

1.  **Container Registry**: Build your Docker image and push it to a container registry (e.g., Docker Hub, AWS ECR, Google Container Registry).
    ```bash
    docker build -t your-dockerhub-username/task-management-backend:latest .
    docker push your-dockerhub-username/task-management-backend:latest
    ```
2.  **Environment Configuration**:
    *   **Secrets Management**: Never hardcode sensitive information. Use your cloud provider's secret management services (e.g., AWS Secrets Manager, Azure Key Vault, Google Secret Manager) to store `JWT_SECRET`, database credentials, etc.
    *   **Environment Variables**: Pass these secrets as environment variables to your deployed application container.
3.  **Database Provisioning**:
    *   Provision a managed PostgreSQL database service (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL).
    *   Update `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME` in your environment configuration to point to the managed service.
4.  **Redis Provisioning**:
    *   Provision a managed Redis service (e.g., AWS ElastiCache, Azure Cache for Redis, Google Cloud Memorystore).
    *   Update `REDIS_HOST`, `REDIS_PORT` in your environment configuration.
5.  **Application Deployment**:
    *   **Container Orchestration**: Deploy your Docker image using a container orchestration service:
        *   **Kubernetes (EKS, GKE, AKS)**: For highly scalable and complex deployments. Requires `Deployment` and `Service` definitions.
        *   **AWS ECS/Fargate**: Managed container service. Define Task Definitions and Services.
        *   **Google Cloud Run / Azure Container Apps**: Serverless container platforms for simpler, scalable deployments.
    *   **CI/CD Integration**: Extend the GitHub Actions workflow to automatically deploy new versions of the Docker image to your chosen platform upon successful build and test.
6.  **Load Balancing**: Place a load balancer (e.g., AWS ALB, Nginx, Kubernetes Ingress) in front of your application instances for traffic distribution and SSL termination.
7.  **Monitoring & Alerts**: Set up monitoring tools (e.g., Prometheus, Grafana, Datadog) to track application health, performance metrics, and logs. Configure alerts for critical issues.
8.  **Scalability**: Design your application to be stateless (which this backend is, except for Redis cache which is externalized) to allow for horizontal scaling of backend instances based on load.

## 12. Project Structure

```
.
├── .github/                       # GitHub Actions CI/CD workflows
├── .dockerignore                  # Files to ignore during Docker build
├── .env.example                   # Example environment variables file
├── Dockerfile                     # Docker build instructions
├── docker-compose.yml             # Docker Compose configuration for dev environment
├── jest-e2e.json                  # Jest configuration for E2E tests
├── jest.config.ts                 # Jest configuration for unit/integration tests
├── nest-cli.json                  # NestJS CLI configuration
├── package.json                   # Project dependencies and scripts
├── tsconfig.build.json            # TypeScript configuration for build
├── tsconfig.json                  # TypeScript configuration for development
├── src/                           # Source code directory
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module, aggregating all other modules
│   ├── common/                    # Shared utilities, filters, interceptors, decorators
│   │   ├── decorators/            # Custom decorators (e.g., @GetUser)
│   │   ├── filters/               # Global exception filter
│   │   ├── interceptors/          # Global interceptors (e.g., logging)
│   │   └── logger/                # Custom Winston logger setup
│   ├── auth/                      # Authentication & Authorization module
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── constants.ts           # JWT secret placeholder
│   │   ├── dto/                   # DTOs for Auth (login, signup)
│   │   ├── guards/                # JWT Auth Guard
│   │   └── strategy/              # Passport JWT Strategy
│   ├── categories/                # Task Categories module
│   │   ├── categories.controller.ts
│   │   ├── categories.module.ts
│   │   ├── categories.service.ts
│   │   ├── dto/                   # DTOs for Categories
│   │   ├── entities/              # TypeORM Category Entity
│   │   └── tests/                 # Unit/Integration tests for Categories
│   ├── config/                    # Application configuration (env variables, Joi validation)
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   └── validation-schema.ts
│   ├── database/                  # TypeORM data source and migration files
│   │   ├── data-source.ts
│   │   └── migrations/            # Database migration scripts
│   ├── tasks/                     # Core Task Management module
│   │   ├── tasks.controller.ts
│   │   ├── tasks.module.ts
│   │   ├── tasks.service.ts
│   │   ├── dto/                   # DTOs for Tasks
│   │   ├── entities/              # TypeORM Task Entity
│   │   ├── enum/                  # Enums for Task Status/Priority
│   │   └── tests/                 # Unit/Integration tests for Tasks
│   └── users/                     # User Profile Management module
│       ├── users.controller.ts
│       ├── users.module.ts
│       ├── users.service.ts
│       ├── dto/                   # DTOs for Users
│       └── entities/              # TypeORM User Entity
└── test/                          # E2E test files
    └── app.e2e-spec.ts
```

## 13. Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write tests for your changes.
5.  Ensure all tests pass (`npm test`).
6.  Ensure linting passes (`npm run lint`).
7.  Commit your changes (`git commit -am 'feat: Add new feature'`).
8.  Push to the branch (`git push origin feature/your-feature-name`).
9.  Create a new Pull Request.

## 14. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. (Note: A `LICENSE` file is not included here, but would be in a real project).

---
*(End of README.md)*