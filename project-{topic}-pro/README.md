# Task Management System

A comprehensive, production-ready Task Management System built using Spring Boot (Java) for the backend and conceptually with React for the frontend, backed by PostgreSQL. This project demonstrates enterprise-grade features, including authentication, authorization, logging, caching, rate limiting, and a robust CI/CD pipeline.

## Table of Contents
1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Backend Setup (Local)](#backend-setup-local)
    *   [Frontend Setup (Conceptual Local)](#frontend-setup-conceptual-local)
    *   [Docker Compose Setup](#docker-compose-setup)
5.  [Running the Application](#running-the-application)
6.  [API Endpoints and Documentation](#api-endpoints-and-documentation)
7.  [Testing](#testing)
8.  [CI/CD](#ci/cd)
9.  [Architecture](#architecture)
10. [Deployment Guide](#deployment-guide)
11. [Contributing](#contributing)
12. [License](#license)

## 1. Features

**Core Functionality:**
*   **User Management:** Register, login, manage user profiles.
*   **Project Management:** Create, view, update, and delete projects. Assign project owners and collaborators.
*   **Task Management:** Create, view, update, delete tasks within projects. Assign tasks to users, track status (Open, In Progress, Completed, etc.), set due dates.

**Enterprise-Grade Features:**
*   **Authentication & Authorization (JWT):** Secure user login with JSON Web Tokens. Role-based access control (USER, ADMIN) and granular authorization checks at API and service layers.
*   **Database Layer:** PostgreSQL with Flyway for robust schema migrations and seed data management.
*   **Configuration Management:** Externalized configuration using `application.yml` and environment variables for sensitive data (e.g., database credentials, JWT secret).
*   **Dockerization:** Dockerfiles for backend and frontend, and `docker-compose` for easy local development setup.
*   **Logging & Monitoring:** SLF4J/Logback for structured logging. Spring Boot Actuator for health checks and metrics.
*   **Error Handling:** Global exception handling middleware for consistent API error responses.
*   **Caching Layer:** Spring Cache with Caffeine for improved performance on frequently accessed data.
*   **Rate Limiting:** Custom HandlerInterceptor using Bucket4j to prevent abuse and protect API endpoints.
*   **Comprehensive Testing:** Unit, Integration, and API tests to ensure code quality and correctness, aiming for 80%+ coverage.
*   **API Documentation:** OpenAPI (Swagger UI) for interactive API exploration.
*   **CI/CD Pipeline:** GitHub Actions workflow for automated build, test, and Docker image pushing.

## 2. Technology Stack

**Backend:**
*   **Language:** Java 17+
*   **Framework:** Spring Boot 3.x
*   **Web:** Spring Web (RESTful APIs)
*   **Data:** Spring Data JPA, Hibernate
*   **Database:** PostgreSQL
*   **Migrations:** Flyway
*   **Security:** Spring Security, JJWT (JSON Web Tokens)
*   **Caching:** Spring Cache, Caffeine
*   **Validation:** Spring Validation
*   **Build Tool:** Maven
*   **Logging:** SLF4J + Logback
*   **Monitoring:** Spring Boot Actuator
*   **Rate Limiting:** Bucket4j (integrated via custom interceptor)
*   **Testing:** JUnit 5, Mockito, Spring Boot Test, Testcontainers, JaCoCo (for coverage)
*   **Documentation:** SpringDoc OpenAPI (Swagger UI)

**Frontend (Conceptual - React):**
*   **Framework:** React 18+
*   **Language:** JavaScript (ES6+), JSX
*   **Styling:** CSS Modules / TailwindCSS (or similar)
*   **State Management:** React Context API (or Redux/Zustand)
*   **Routing:** React Router DOM
*   **HTTP Client:** Axios
*   **Build Tool:** Create React App / Vite
*   **Testing:** Jest, React Testing Library

**DevOps & Tools:**
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions
*   **API Testing:** Postman / REST Assured (backend integration tests)
*   **Performance Testing:** JMeter (conceptual)

## 3. Project Structure

```
task-management-system/
├── backend/                  # Spring Boot backend application
│   ├── pom.xml               # Maven project file
│   └── src/                  # Source code
│       ├── main/java/...     # Java source files (entities, DTOs, services, controllers, config, etc.)
│       └── main/resources/   # Application configuration, Flyway migration scripts
│       └── test/java/...     # Unit, integration, and repository tests
├── frontend/                 # Conceptual React frontend application
│   ├── public/               # Static assets
│   └── src/                  # React components, services, etc.
│   ├── package.json          # Node.js dependencies
│   └── Dockerfile            # Dockerfile for frontend
├── .github/                  # GitHub Actions CI/CD workflows
│   └── workflows/
│       └── main.yml
├── docker-compose.yml        # Orchestrates backend, frontend, and database services
├── Dockerfile                # Dockerfile for Spring Boot backend
├── README.md                 # Project documentation (this file)
├── ARCHITECTURE.md           # High-level architecture overview
└── DEPLOYMENT.md             # Deployment guide
```

## 4. Setup and Installation

### Prerequisites
Before you begin, ensure you have the following installed:
*   **Java 17 JDK** or higher (e.g., OpenJDK)
*   **Maven 3.8+**
*   **Docker Desktop** (includes Docker Engine and Docker Compose)
*   **Node.js 18+ and npm** (if running frontend locally)
*   **PostgreSQL** (if running database locally without Docker Compose)

### Backend Setup (Local)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-system.git
    cd task-management-system/backend
    ```

2.  **Configure `application.yml`:**
    You can use the `application.yml` provided in `src/main/resources/`, but for sensitive credentials, it's highly recommended to use environment variables.
    For local development, you might set up a local PostgreSQL instance or use the one provided by Docker Compose.
    If running PostgreSQL locally:
    *   Create a database: `taskmgrdb`
    *   Create a user: `taskmgruser` with password: `password`
    *   Update `application.yml` or set environment variables:
        ```bash
        # Example for Bash/Zsh
        export DB_HOST=localhost
        export DB_PORT=5432
        export DB_NAME=taskmgrdb
        export DB_USERNAME=taskmgruser
        export DB_PASSWORD=password
        export JWT_SECRET=YOUR_SUPER_STRONG_SECRET_KEY_MINIMUM_32_BYTES_BASE64_ENCODED # Generate a long random string
        export SERVER_PORT=8080
        ```
        (Make sure to replace `YOUR_SUPER_STRONG_SECRET_KEY...` with a generated secure key.)

3.  **Build the project:**
    ```bash
    mvn clean install -DskipTests
    ```
    This will compile the code and package it into a JAR file.

4.  **Run Flyway migrations (if not using Docker Compose):**
    Flyway migrations will run automatically when the Spring Boot application starts if `spring.flyway.enabled=true`.

### Frontend Setup (Conceptual Local)

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure environment variables:**
    Create a `.env` file in `frontend/` and add the backend API URL:
    ```
    # frontend/.env
    REACT_APP_API_BASE_URL=http://localhost:8080/api
    ```

4.  **Run the frontend application:**
    ```bash
    npm start
    ```
    The frontend should be accessible at `http://localhost:3000`.

### Docker Compose Setup

This is the recommended way to run the entire system locally.

1.  **Ensure Docker Desktop is running.**

2.  **Navigate to the project root directory:**
    ```bash
    cd task-management-system
    ```

3.  **Set environment variables:**
    Create a `.env` file in the project root (`task-management-system/.env`) with your database credentials and JWT secret.
    ```env
    # .env
    DB_NAME=taskmgrdb
    DB_USERNAME=taskmgruser
    DB_PASSWORD=password
    JWT_SECRET=YOUR_VERY_LONG_AND_SECURE_JWT_SECRET_KEY_HERE_MIN_32_BYTES
    SERVER_PORT=8080
    ```
    **Important:** Replace `YOUR_VERY_LONG_AND_SECURE_JWT_SECRET_KEY_HERE_MIN_32_BYTES` with a strong, random 32+ byte Base64 encoded string.

4.  **Build and run all services:**
    ```bash
    docker-compose up --build
    ```
    This command will:
    *   Build Docker images for the backend (Java app) and frontend (React).
    *   Pull the PostgreSQL image.
    *   Create and start all services (`db`, `backend`, `frontend`).
    *   Flyway migrations and seed data will run automatically when the `backend` service starts.

## 5. Running the Application

*   **Local Backend Only:**
    From `backend/`, after `mvn clean install -DskipTests`:
    ```bash
    java -jar target/task-management-backend-0.0.1-SNAPSHOT.jar
    ```
    (Ensure environment variables are set or `application.yml` is configured for DB access).
    The backend will be available at `http://localhost:8080`.

*   **Local Frontend Only:**
    From `frontend/`:
    ```bash
    npm start
    ```
    The frontend will be available at `http://localhost:3000`.

*   **Using Docker Compose (Recommended):**
    From project root:
    ```bash
    docker-compose up
    ```
    *   Backend: `http://localhost:8080`
    *   Frontend: `http://localhost:3000`
    *   PostgreSQL: `localhost:5432`

## 6. API Endpoints and Documentation

Once the backend is running, the API documentation (Swagger UI) is available at:
`http://localhost:8080/swagger-ui/index.html`

You can use this interface to explore available endpoints, view request/response schemas, and send requests directly.

**Key API Endpoints:**

*   **Authentication:**
    *   `POST /api/auth/signup`: Register a new user.
    *   `POST /api/auth/signin`: Authenticate and get a JWT token.
*   **Users:**
    *   `GET /api/users` (Admin only): Get all users.
    *   `GET /api/users/{id}` (Admin or self): Get user by ID.
    *   `DELETE /api/users/{id}` (Admin only): Delete user by ID.
*   **Projects:**
    *   `POST /api/projects`: Create a new project.
    *   `GET /api/projects`: Get projects owned by or collaborating with the current user.
    *   `GET /api/projects/{id}`: Get a project by ID.
    *   `PUT /api/projects/{id}`: Update a project (owner only).
    *   `POST /api/projects/{projectId}/collaborators/{userId}`: Add a collaborator to a project (owner only).
    *   `DELETE /api/projects/{projectId}/collaborators/{userId}`: Remove a collaborator (owner only).
    *   `DELETE /api/projects/{id}`: Delete a project (owner only).
*   **Tasks:**
    *   `POST /api/tasks`: Create a new task.
    *   `GET /api/tasks/{id}`: Get a task by ID.
    *   `GET /api/tasks/project/{projectId}`: Get tasks for a specific project.
    *   `GET /api/tasks/assigned-to-me`: Get tasks assigned to the current user.
    *   `PUT /api/tasks/{id}`: Update a task.
    *   `DELETE /api/tasks/{id}`: Delete a task (project owner only).

## 7. Testing

The project includes various types of tests to ensure quality:

*   **Unit Tests:** Located in `backend/src/test/java/.../service/` and `backend/src/test/java/.../repository/`. These tests focus on individual components (e.g., services, repositories) in isolation using Mockito.
*   **Integration Tests:** Located in `backend/src/test/java/.../controller/`. These tests verify the interaction between multiple components (e.g., controllers, services, repositories) and use Testcontainers to spin up a real PostgreSQL database for a more realistic testing environment.
*   **API Tests:** While not explicitly coded as a separate suite, the integration tests implicitly cover API behavior. For a full API test suite, Postman collections or a dedicated API testing framework (like REST Assured or Karate DSL) would be used.
*   **Performance Tests:** Conceptualized using JMeter. A `.jmx` file would simulate load on the API endpoints to measure response times, throughput, and error rates.

**Running Tests:**
From the `backend/` directory:
```bash
mvn test
```
To generate JaCoCo code coverage reports:
```bash
mvn clean verify
```
The report will be available at `backend/target/site/jacoco/index.html`. The CI/CD pipeline aims for 80%+ line coverage.

## 8. CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/main.yml`) that automates the following steps on every push to the `main` branch and pull requests:

1.  **Build & Test Backend:**
    *   Checks out the code.
    *   Sets up Java 17.
    *   Builds the backend application using Maven and runs all unit and integration tests.
    *   Uploads JaCoCo coverage reports as artifacts.
2.  **Build & Push Docker Images:** (Only on `main` branch pushes after successful tests)
    *   Logs into Docker Hub (requires `DOCKER_USERNAME` and `DOCKER_TOKEN` GitHub secrets).
    *   Builds Docker images for both backend and frontend applications.
    *   Pushes `latest` and `commit_sha` tagged images to Docker Hub.
3.  **Deploy:** (Conceptual step)
    *   This step demonstrates where deployment commands (e.g., to Kubernetes, AWS ECS, etc.) would be placed. It currently only echoes a message.

## 9. Architecture

The system follows a classic **Client-Server Architecture** with a **Monolithic Backend** (Spring Boot) and a **Single-Page Application (SPA)** Frontend (React).

### High-Level Diagram (Conceptual)

```mermaid
graph TD
    A[User] -- "Interacts with" --> B{Frontend (React SPA)}
    B -- "HTTP/REST API Calls" --> C{Backend (Spring Boot)}
    C -- "JDBC/JPA" --> D[PostgreSQL Database]

    subgraph Infrastructure
        D
        E[Redis/Memcached for Caching - Optional]
        F[Load Balancer / API Gateway - Optional]
        G[Prometheus/Grafana for Monitoring - Optional]
    end

    subgraph Backend Services (Spring Boot)
        C1[Controller Layer: REST APIs, DTOs]
        C2[Service Layer: Business Logic, Transactions, Caching]
        C3[Repository Layer: JPA, Database Interactions]
        C4[Security Layer: JWT Auth/Authz, Filters]
        C5[Configuration & Utilities: Rate Limiting, Error Handling, Logging]
        C --- C1 & C2 & C3 & C4 & C5
    end

    subgraph Deployment (Docker/Kubernetes)
        D1[Backend Container]
        D2[Frontend Container]
        D3[Database Container]
        D4[CI/CD Pipeline]
        C1 --- D1
        B --- D2
        D --- D3
        D4 -- "Automates build, test, deploy" --> D1 & D2 & D3
    end
```

### Key Architectural Decisions:
*   **Layered Architecture (Backend):** Separates concerns into Controller, Service, and Repository layers for maintainability and scalability.
*   **RESTful API:** Standard HTTP methods and conventions for clear and consistent communication between frontend and backend.
*   **JWT Authentication:** Stateless, scalable authentication suitable for microservices and mobile applications.
*   **Role-Based Access Control (RBAC):** Granular control over resource access based on user roles (e.g., `ROLE_USER`, `ROLE_ADMIN`).
*   **Database-First Design (with Migrations):** Using Flyway ensures database schema evolution is controlled and reproducible.
*   **Caching:** Implemented at the service layer to reduce database load and improve response times for frequently accessed data.
*   **Rate Limiting:** Protects the API from abusive clients and denial-of-service attacks.
*   **Observability:** Integrated logging and basic monitoring (Actuator) to understand application health and behavior.
*   **Containerization:** Facilitates consistent development, testing, and deployment environments.

For more detailed architectural information, refer to [ARCHITECTURE.md](ARCHITECTURE.md).

## 10. Deployment Guide

The `docker-compose.yml` provides a local deployment mechanism. For production deployment, considerations for scalability, high availability, and security are paramount.

**Production Deployment Steps (High-Level):**

1.  **Container Registry:** Push Docker images to a production-grade container registry (e.g., Docker Hub, AWS ECR, Google Container Registry).
2.  **Cloud Provider:** Choose a cloud provider (AWS, Azure, GCP, DigitalOcean, Heroku).
3.  **Database Service:** Provision a managed PostgreSQL database service (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL). This handles backups, scaling, and high availability.
4.  **Compute Service:** Deploy containers to a compute service:
    *   **Kubernetes (EKS, AKS, GKE):** For highly scalable, resilient deployments. Requires defining Kubernetes manifests (Deployments, Services, Ingress).
    *   **Container Instances (AWS ECS, Azure Container Instances, Google Cloud Run):** Simpler for individual container deployments.
    *   **PaaS (Heroku, Google App Engine):** Even simpler, manages infrastructure for you.
5.  **Environment Variables:** Securely inject environment variables (DB credentials, JWT secret) into your deployed containers using secrets management tools provided by your cloud.
6.  **CI/CD Integration:** Extend the GitHub Actions workflow to deploy to your chosen cloud environment.
7.  **Monitoring & Logging:** Set up robust monitoring (Prometheus/Grafana, Datadog) and centralized logging (ELK stack, Splunk) for production environments.
8.  **Domain & SSL:** Configure a custom domain and SSL/TLS certificates for secure HTTPS access.
9.  **Load Balancing:** Use a load balancer (e.g., NGINX, AWS ALB) to distribute traffic and provide high availability.

For a more detailed guide, refer to [DEPLOYMENT.md](DEPLOYMENT.md).

## 11. Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write comprehensive tests for your changes.
5.  Ensure all tests pass and code coverage remains high.
6.  Commit your changes (`git commit -m 'feat: Add new feature'`).
7.  Push to the branch (`git push origin feature/your-feature-name`).
8.  Open a Pull Request.

## 12. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
```