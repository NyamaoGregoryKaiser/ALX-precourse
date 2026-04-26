# ALX Scraper: Production-Ready Web Scraping System

## Table of Contents
1.  [Introduction](#1-introduction)
2.  [Features](#2-features)
3.  [Architecture](#3-architecture)
4.  [Technology Stack](#4-technology-stack)
5.  [Setup and Installation](#5-setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Setup (without Docker)](#local-setup-without-docker)
    *   [Docker Setup (Recommended)](#docker-setup-recommended)
    *   [Database Migrations](#database-migrations)
    *   [Running the Application](#running-the-application)
6.  [API Endpoints](#6-api-endpoints)
    *   [Authentication](#authentication)
    *   [Scraping Jobs](#scraping-jobs)
    *   [Scraped Data](#scraped-data)
    *   [Swagger UI](#swagger-ui)
7.  [Frontend Usage](#7-frontend-usage)
8.  [Testing](#8-testing)
    *   [Running Tests](#running-tests)
    *   [Test Coverage](#test-coverage)
9.  [CI/CD](#9-cicd)
10. [Logging and Monitoring](#10-logging-and-monitoring)
11. [Error Handling](#11-error-handling)
12. [Caching](#12-caching)
13. [Rate Limiting](#13-rate-limiting)
14. [Deployment Guide](#14-deployment-guide)
15. [Contributing](#15-contributing)
16. [License](#16-license)

---

## 1. Introduction

The **ALX Scraper** is a comprehensive, production-ready web scraping tools system designed to allow users to define, schedule, and execute web scraping jobs. It provides a robust backend API (Java Spring Boot), a PostgreSQL database, and a minimal web-based frontend for managing scraping tasks and viewing extracted data.

This project focuses on building a full-scale, enterprise-grade application, incorporating best practices in software engineering, security, testing, and deployment, aligning with ALX Software Engineering precourse materials.

## 2. Features

*   **User Management:**
    *   User registration and login (JWT-based authentication).
    *   Role-based authorization (e.g., `ROLE_USER`, `ROLE_ADMIN`).
*   **Scraping Job Management (CRUD):**
    *   Define scraping jobs with target URL and CSS selectors.
    *   Schedule jobs using CRON expressions.
    *   Manually trigger jobs.
    *   View job status (Active, Running, Completed, Failed).
*   **Scraped Data Storage & Retrieval:**
    *   Store scraped data in a structured (JSON) format in the database.
    *   Retrieve scraped data with pagination.
*   **Scheduling:** Automatic execution of jobs based on CRON schedules.
*   **Security:** JWT authentication, BCrypt password hashing, Spring Security.
*   **Performance:** Caching layer (Caffeine), API rate limiting.
*   **Robustness:** Global error handling, comprehensive logging.
*   **Scalability:** Designed with Spring Boot and PostgreSQL, suitable for scaling.
*   **Developer Experience:** Dockerized setup, Flyway for database migrations, Swagger UI for API documentation.
*   **Quality:** Extensive unit, integration, and API tests.

## 3. Architecture

The system follows a layered, API-first architecture:

```
+----------------+       +-------------------+       +-------------------+
|    Frontend    | ----> |   API Layer       | ----> |   Service Layer   |
| (Thymeleaf/JS) |       | (Spring MVC REST) |       | (Business Logic)  |
+----------------+       +-------------------+       +-------------------+
                                   ^                        |
                                   |                        |
                   +---------------+------------------+     |
                   |               |                  |     |
                   |   Auth/Auth   |   Rate Limiting  |     |
                   | (Spring Sec)  |   (Interceptor)  |     |
                   +---------------+------------------+     |
                                   |                        |
                                   V                        V
+----------------+       +-------------------+       +-------------------+
|  Scheduler     | <---> |   Scraping Service| <---> | Persistence Layer |
| (Spring @Scheduled)    | (Jsoup/HTTP Client) |       | (Spring Data JPA) |
+----------------+       +-------------------+       +-------------------+
                                                                |
                                                                V
                                                        +-------------------+
                                                        |     Database      |
                                                        |    (PostgreSQL)   |
                                                        +-------------------+
```

*   **Frontend (Thymeleaf/JS):** Minimal UI for user interaction, consuming the backend REST APIs.
*   **API Layer (Spring MVC REST):** Exposes secure REST endpoints for managing users, jobs, and data.
*   **Service Layer:** Encapsulates business logic, orchestrates interactions between components.
*   **Scraping Service:** Core logic for fetching web content and extracting data using Jsoup.
*   **Scheduler:** Manages and triggers recurring scraping jobs based on CRON expressions.
*   **Persistence Layer:** Utilizes Spring Data JPA with Hibernate for seamless interaction with the PostgreSQL database.
*   **Security Layer:** Implements JWT-based authentication and role-based authorization using Spring Security.
*   **Additional Features:** Dedicated layers/components for caching (Caffeine), rate limiting (custom interceptor), logging (Logback), and global error handling.

## 4. Technology Stack

*   **Backend:**
    *   Java 17+
    *   Spring Boot 3.x
    *   Spring Web MVC (REST API)
    *   Spring Data JPA (ORM)
    *   Spring Security (Authentication & Authorization)
    *   Jsoup (HTML parsing & web scraping)
    *   Lombok (Boilerplate reduction)
    *   Caffeine (Local caching)
    *   Springdoc OpenAPI (Swagger UI for API docs)
*   **Database:** PostgreSQL
    *   Flyway (Database migration)
*   **Frontend (minimal):**
    *   Thymeleaf (Server-side rendering for basic UI)
    *   HTML, CSS, JavaScript
*   **Testing:**
    *   JUnit 5
    *   Mockito
    *   Spring Boot Test
    *   RestAssured (API testing)
    *   Testcontainers (Integration testing with real DB)
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions (example workflow)

## 5. Setup and Installation

### Prerequisites

*   Java Development Kit (JDK) 17 or higher
*   Maven 3.6+
*   Docker Desktop (if using Docker setup)
*   Git

### Local Setup (without Docker)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ALX-Software-Engineering/alx-scraper.git
    cd alx-scraper
    ```
2.  **Database Setup (PostgreSQL):**
    *   Install PostgreSQL locally if you don't have it.
    *   Create a new PostgreSQL database and user:
        ```sql
        CREATE USER alx_user WITH PASSWORD 'alx_password';
        CREATE DATABASE alx_scraper WITH OWNER alx_user;
        ```
    *   Update `src/main/resources/application.yml` if your database credentials differ.
3.  **Build the project:**
    ```bash
    mvn clean install
    ```

### Docker Setup (Recommended)

This method simplifies setup by using Docker Compose to run both the PostgreSQL database and the Spring Boot application in containers.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ALX-Software-Engineering/alx-scraper.git
    cd alx-scraper
    ```
2.  **Build the application JAR:**
    ```bash
    mvn clean package -DskipTests # Skip tests during build for Docker image
    ```
3.  **Start Docker Compose services:**
    ```bash
    docker-compose up --build -d
    ```
    This will:
    *   Build the `alx-scraper` Docker image.
    *   Start a PostgreSQL container (`db`).
    *   Start the `alx-scraper` application container (`app`).
    *   The application container will wait for the database to be healthy.
    *   Flyway will automatically run database migrations when the application starts.

4.  **Stop Docker Compose services:**
    ```bash
    docker-compose down
    ```

### Database Migrations (if running locally without Docker Compose)

Flyway is configured to run automatically on application startup. If you are running the application locally without Docker Compose, ensure your PostgreSQL database is running and accessible before starting the Spring Boot application.

To manually trigger Flyway (e.g., during development or for specific operations):
```bash
mvn flyway:migrate
```

### Running the Application

After building (and optionally setting up Docker Compose):

**Using Docker Compose (Recommended):**
```bash
docker-compose up -d
```
The application will be accessible at `http://localhost:8080`.

**Locally (without Docker Compose):**
```bash
java -jar target/alx-scraper-0.0.1-SNAPSHOT.jar
```
The application will be accessible at `http://localhost:8080`.

## 6. API Endpoints

The API is secured with JWT authentication. All protected endpoints require a `Bearer` token in the `Authorization` header.

### Authentication

*   `POST /api/auth/register`
    *   Registers a new user.
    *   **Body:** `{"username": "your_username", "password": "your_password"}`
    *   **Response:** `201 Created`
*   `POST /api/auth/login`
    *   Authenticates a user and returns a JWT token.
    *   **Body:** `{"username": "your_username", "password": "your_password"}`
    *   **Response:** `200 OK`, `{"token": "eyJ...", "type": "Bearer"}`

**Default Seeded Users (from `V2__Add_seed_data.sql`):**
*   **Admin:** `username: admin`, `password: adminpass` (Role: `ROLE_USER`, `ROLE_ADMIN`)
*   **Regular User:** `username: testuser`, `password: userpass` (Role: `ROLE_USER`)

### Scraping Jobs (`/api/jobs`)

All endpoints under `/api/jobs` require `ROLE_USER` or `ROLE_ADMIN`.

*   `POST /api/jobs`
    *   Create a new scraping job.
    *   **Body:** `{"name": "Job Name", "targetUrl": "https://example.com", "cssSelector": "h1", "scheduleCron": "0 0 * * * *"}`
    *   **Response:** `201 Created`, `ScrapingJobResponse`
*   `GET /api/jobs`
    *   Get all scraping jobs for the authenticated user.
    *   **Response:** `200 OK`, `List<ScrapingJobResponse>`
*   `GET /api/jobs/{jobId}`
    *   Get a specific scraping job by ID.
    *   **Response:** `200 OK`, `ScrapingJobResponse`
*   `PUT /api/jobs/{jobId}`
    *   Update an existing scraping job.
    *   **Body:** Same as `POST /api/jobs`.
    *   **Response:** `200 OK`, `ScrapingJobResponse`
*   `DELETE /api/jobs/{jobId}`
    *   Delete a scraping job.
    *   **Response:** `204 No Content`
*   `POST /api/jobs/{jobId}/trigger`
    *   Manually trigger a scraping job for immediate execution.
    *   **Response:** `200 OK`, `ScrapingJobResponse` (with updated status)

### Scraped Data (`/api/jobs/{jobId}/data`)

All endpoints under `/api/jobs/{jobId}/data` require `ROLE_USER` or `ROLE_ADMIN`.

*   `GET /api/jobs/{jobId}/data`
    *   Get paginated scraped data for a specific job.
    *   **Query Params:** `page=0`, `size=10`, `sortBy=scrapedAt`, `sortDir=desc`
    *   **Response:** `200 OK`, `Page<ScrapedDataResponse>`

### Swagger UI

Detailed API documentation is available via Swagger UI after the application starts:
`http://localhost:8080/swagger-ui.html`

You can authenticate directly within Swagger UI using the "Authorize" button and providing your JWT token (e.g., `Bearer eyJ...`).

## 7. Frontend Usage

A basic Thymeleaf-based frontend is provided for demonstration:

*   **Homepage:** `http://localhost:8080/` (redirects to login/dashboard)
*   **Login Page:** `http://localhost:8080/login`
*   **Registration Page:** `http://localhost:8080/register`
*   **Dashboard:** `http://localhost:8080/dashboard` (after login, shows job list and create job form)
*   **Job Detail Page:** `http://localhost:8080/jobs/{jobId}` (shows job details and scraped data)

The UI allows for:
*   Registering new users.
*   Logging in/out.
*   Viewing all jobs.
*   Creating new jobs.
*   Manually triggering a job.
*   Deleting a job.
*   Viewing scraped data for a job.

## 8. Testing

The project emphasizes high-quality testing with various types of tests.

### Running Tests

To run all tests (unit, integration, API):
```bash
mvn clean test
```
This will automatically launch a PostgreSQL container via Testcontainers for integration tests.

### Test Coverage

The project aims for **80%+ unit test coverage**. The provided tests cover key components:
*   `UserRepositoryTest`: Unit/Integration tests for data access logic using `@DataJpaTest` and H2 (or Testcontainers for full integration).
*   `ScrapingServiceTest`: Pure unit tests for the core web scraping logic using Mockito to mock external Jsoup calls.
*   `ScrapingJobServiceTest`: Unit tests for business logic, including job creation, updates, scheduling, and execution flow.
*   `ScrapingJobControllerIntegrationTest`: Full API integration tests using `@SpringBootTest` and Testcontainers with RestAssured for HTTP calls, verifying authentication, authorization, and data persistence end-to-end.

To generate a test coverage report (e.g., with JaCoCo):
```bash
mvn clean verify jacoco:report
```
The report will be available at `target/site/jacoco/index.html`.

## 9. CI/CD

An example GitHub Actions workflow (`.github/workflows/maven.yml`) is provided for continuous integration:

*   **Triggers:** Pushes to `main` branch and pull requests.
*   **Jobs:**
    *   **`build`:** Compiles the project, runs all tests, and builds the Docker image.
    *   **`deploy` (conceptual):** Placeholder for deployment steps (e.g., push Docker image to registry, deploy to cloud provider). This job is currently commented out as a concrete deployment target is not defined.

**`./github/workflows/maven.yml`**
```yaml