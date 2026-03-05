```markdown
# Real-time Chat Application

This is a comprehensive, production-ready real-time chat application system built with a Java Spring Boot backend and a React frontend (conceptual). It includes features like user authentication, room management, real-time messaging, caching, rate limiting, and robust error handling. The entire system is containerized with Docker and includes CI/CD pipeline configuration using GitHub Actions.

## Table of Contents

1.  [Project Structure](#1-project-structure)
2.  [Features](#2-features)
3.  [Technology Stack](#3-technology-stack)
4.  [Setup Instructions](#4-setup-instructions)
    *   [Prerequisites](#prerequisites)
    *   [Local Development with Docker Compose](#local-development-with-docker-compose)
    *   [Manual Backend Setup (without Docker)](#manual-backend-setup-without-docker)
    *   [Manual Frontend Setup (without Docker)](#manual-frontend-setup-without-docker)
5.  [API Documentation](#5-api-documentation)
6.  [Architecture Overview](#6-architecture-overview)
7.  [Testing](#7-testing)
    *   [Running Backend Tests](#running-backend-tests)
    *   [Running Frontend Tests (Conceptual)](#running-frontend-tests-conceptual)
8.  [Deployment Guide](#8-deployment-guide)
9.  [Additional Features & Enterprise Considerations](#9-additional-features--enterprise-considerations)
10. [Contributing](#10-contributing)
11. [License](#11-license)

---

## 1. Project Structure

```
chat-app-full-stack/
├── chat-app-backend/              # Spring Boot Java Backend
│   ├── src/main/java/com/alx/chat/
│   │   ├── config/                # Spring/Security/WebSocket/Cache/OpenAPI Configurations
│   │   ├── controller/            # REST & WebSocket Endpoints
│   │   ├── dto/                   # Data Transfer Objects
│   │   ├── entity/                # JPA Entities
│   │   ├── exception/             # Custom Exceptions & Global Handler
│   │   ├── filter/                # JWT Auth, Rate Limiting Filters
│   │   ├── handler/               # WebSocket Event Listener
│   │   ├── mapper/                # MapStruct Mappers (Entity <-> DTO)
│   │   ├── repository/            # Spring Data JPA Repositories
│   │   ├── service/               # Business Logic Services
│   │   └── util/                  # JWT Utility
│   ├── src/main/resources/        # Application properties, Flyway migrations, Logback
│   ├── src/test/java/             # Unit, Integration, API Tests
│   ├── pom.xml                    # Maven build file
│   └── Dockerfile                 # Docker image definition for backend
├── chat-app-frontend/             # React.js Frontend (Conceptual structure)
│   ├── public/
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   ├── pages/                 # Page-level components (Login, Chat, Dashboard)
│   │   ├── services/              # API interaction and WebSocket logic
│   │   ├── context/               # React Context for Auth
│   │   └── App.js, index.js       # Main application files
│   ├── package.json               # Node.js dependencies
│   └── Dockerfile                 # Docker image definition for frontend (Nginx)
├── .github/workflows/main.yml     # GitHub Actions CI/CD Pipeline
├── docker-compose.yml             # Orchestration for Docker services (backend, frontend, db, redis)
└── README.md                      # Project documentation
```

## 2. Features

*   **User Authentication & Authorization:**
    *   User Registration and Login (`/api/v1/auth/register`, `/api/v1/auth/authenticate`).
    *   JWT-based security for all API endpoints and WebSocket connections.
    *   Role-based access control (e.g., ADMIN, USER).
    *   User profile management (`/api/v1/users/me`, `/api/v1/users/{userId}`).
*   **Chat Room Management:**
    *   Create, view, join, leave, and delete chat rooms (`/api/v1/rooms`).
    *   Paginated listing of all rooms and rooms a user is a member of.
*   **Real-time Messaging:**
    *   Send and receive messages in real-time using WebSockets (STOMP protocol).
    *   Message history retrieval (`/api/v1/messages/room/{roomId}`).
*   **Data Persistence:**
    *   PostgreSQL database.
    *   Flyway for database migrations.
*   **Caching:**
    *   Redis integration for caching frequently accessed data (e.g., user profiles, room lists).
*   **Rate Limiting:**
    *   Basic in-memory rate limiting filter to prevent abuse (configurable).
*   **Logging & Monitoring:**
    *   SLF4J + Logback for structured logging.
    *   Spring Boot Actuator for application monitoring (health, metrics).
*   **Error Handling:**
    *   Centralized global exception handler for consistent API error responses.
*   **Validation:**
    *   Request body validation using Jakarta Bean Validation.
*   **API Documentation:**
    *   OpenAPI 3.0 (Swagger UI) for interactive API documentation.
*   **Containerization:**
    *   Docker and Docker Compose for easy setup and deployment.
*   **CI/CD:**
    *   GitHub Actions workflow for automated testing, building, and deployment.

## 3. Technology Stack

*   **Backend:** Java 17+, Spring Boot 3 (Spring WebFlux, Spring Data JPA, Spring Security, Spring WebSockets), Lombok, MapStruct, JWT, Redis, PostgreSQL, Flyway, Springdoc-openapi.
*   **Frontend (Conceptual):** React.js, React Router, Axios, SockJS-Client, STOMP.js.
*   **Database:** PostgreSQL.
*   **Caching:** Redis.
*   **Containerization:** Docker, Docker Compose.
*   **CI/CD:** GitHub Actions.
*   **Testing:** JUnit 5, Mockito, Testcontainers, RestAssured.

## 4. Setup Instructions

### Prerequisites

Before you begin, ensure you have the following installed:

*   **Git**
*   **Java Development Kit (JDK) 17 or higher**
*   **Apache Maven 3.6+**
*   **Node.js 20+ and npm 8+** (for frontend development)
*   **Docker Desktop** (includes Docker Engine and Docker Compose)

### Local Development with Docker Compose (Recommended)

This is the easiest way to get all services (backend, frontend, PostgreSQL, Redis) running.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/chat-app-full-stack.git
    cd chat-app-full-stack
    ```

2.  **Create environment variables:**
    *   Create a `.env` file in the project root (`chat-app-full-stack/`) based on `docker-compose.yml` environment variables.
    *   Example `.env` (adjust values as needed, especially `JWT_SECRET_KEY`):
        ```
        DB_NAME=chat_db
        DB_USER=user
        DB_PASSWORD=password
        REDIS_PASSWORD=
        JWT_SECRET_KEY=A_VERY_LONG_AND_SECURE_RANDOM_STRING_AT_LEAST_32_CHARS_BASE64_ENCODED
        ```
        *Note: The `JWT_SECRET_KEY` in `application.yml` has a default. For production, **always** override it with a strong, generated key.*

    *   For the frontend, create `chat-app-frontend/.env` based on `chat-app-frontend/.env.example`:
        ```
        REACT_APP_API_BASE_URL=http://localhost:8080/api/v1
        REACT_APP_WEBSOCKET_URL=ws://localhost:8080/websocket
        ```

3.  **Build and run all services:**
    Navigate to the project root (`chat-app-full-stack/`) and run:
    ```bash
    docker compose up --build -d
    ```
    *   `--build`: Builds images from Dockerfiles. Use this the first time or after code changes.
    *   `-d`: Runs containers in detached mode (in the background).

4.  **Verify services:**
    *   Check container status: `docker compose ps`
    *   Backend API: `http://localhost:8080`
    *   Frontend App: `http://localhost:3000`
    *   Swagger UI: `http://localhost:8080/swagger-ui.html`

5.  **Stop services:**
    ```bash
    docker compose down
    ```
    To remove volumes (database data and Redis data):
    ```bash
    docker compose down --volumes
    ```

### Manual Backend Setup (without Docker)

1.  **Navigate to the backend directory:**
    ```bash
    cd chat-app-full-stack/chat-app-backend
    ```

2.  **Configure `application.yml`:**
    *   Edit `src/main/resources/application.yml`.
    *   Update `spring.datasource.url`, `username`, `password` to point to a running PostgreSQL instance.
    *   Update `spring.redis.host`, `port`, `password` to point to a running Redis instance.
    *   **Crucially**, set `application.security.jwt.secret-key` to a strong, Base64-encoded 32+ character string.

3.  **Run Flyway migrations:**
    Ensure your PostgreSQL database is running and accessible. Spring Boot will automatically run Flyway migrations on startup.

4.  **Build the project:**
    ```bash
    mvn clean install
    ```

5.  **Run the application:**
    ```bash
    mvn spring-boot:run
    ```
    or from the JAR:
    ```bash
    java -jar target/chat-application-0.0.1-SNAPSHOT.jar
    ```

### Manual Frontend Setup (without Docker)

*(Note: The frontend implementation provided is conceptual. You'd typically add more components and styling.)*

1.  **Navigate to the frontend directory:**
    ```bash
    cd chat-app-full-stack/chat-app-frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure environment variables:**
    *   Create a `.env` file based on `.env.example`. Ensure `REACT_APP_API_BASE_URL` and `REACT_APP_WEBSOCKET_URL` point to your running backend (e.g., `http://localhost:8080/api/v1` and `ws://localhost:8080/websocket`).

4.  **Run the development server:**
    ```bash
    npm start
    ```
    The application will typically open in your browser at `http://localhost:3000`.

## 5. API Documentation

The backend provides interactive API documentation using OpenAPI (Swagger UI).

*   **Swagger UI URL:** `http://localhost:8080/swagger-ui.html` (when backend is running)
*   **OpenAPI JSON:** `http://localhost:8080/v3/api-docs`

This interface allows you to explore all REST endpoints, their request/response schemas, and even test them directly from your browser. Remember to click the "Authorize" button and provide a valid JWT token (obtained from `/api/v1/auth/authenticate`) to access protected endpoints.

## 6. Architecture Overview

### High-Level Architecture
```mermaid
graph TD
    User(Client Application: Web Browser/Mobile) --> |HTTP/S, WebSocket| Frontend(React App)
    Frontend --> |HTTP/S (REST), WebSocket (STOMP)| Backend(Spring Boot App)
    Backend --> |JPA (Hibernate)| Database(PostgreSQL)
    Backend --> |Lettuce (Jedis)| Cache(Redis)
    Backend --(Logs)--> Monitoring(ELK Stack / Prometheus-Grafana - conceptual)
    CI/CD(GitHub Actions) --> |Build & Push Images| DockerRegistry(Docker Hub / ECR)
    DockerRegistry --> |Pull Images| DeploymentServer(VM/Kubernetes)

```

### Backend Architecture (Spring Boot)

*   **Layered Architecture:** Follows a standard N-tier architecture:
    *   **Controllers:** Handle incoming HTTP requests and WebSocket messages, validate inputs, and delegate to services.
    *   **Services:** Contain the core business logic, orchestrate data operations, and apply domain rules.
    *   **Repositories:** Interact with the database using Spring Data JPA.
    *   **Entities:** Represent the domain model and are mapped to database tables.
    *   **DTOs:** Data Transfer Objects used for API input/output to decouple entities from the API contract.
    *   **Mappers:** (MapStruct) Convert between Entities and DTOs.
*   **Security:** Spring Security with JWT for stateless authentication. Custom filters handle token validation for both REST and WebSocket connections.
*   **Real-time Communication:** Spring WebSockets with STOMP for pub-sub messaging. A `SimpMessagingTemplate` is used to broadcast messages.
*   **Caching:** Spring Cache with Redis as the cache store to improve performance for frequently accessed data (e.g., user details, room lists).
*   **Rate Limiting:** A custom `OncePerRequestFilter` implements a basic in-memory rate limiting mechanism. For production, consider external services or libraries like Bucket4j with Redis.
*   **Error Handling:** Global `@ControllerAdvice` provides consistent error responses for various exception types.
*   **Observability:** Logback for logging, Spring Boot Actuator for health checks and metrics.

## 7. Testing

The project includes Unit, Integration, and API tests for the backend.

### Running Backend Tests

1.  **Navigate to the backend directory:**
    ```bash
    cd chat-app-full-stack/chat-app-backend
    ```
2.  **Run all tests:**
    ```bash
    mvn test
    ```
    This will execute:
    *   **Unit Tests:** Using JUnit and Mockito to test individual components (e.g., services).
    *   **Integration Tests:** Using Spring Boot Test and Testcontainers to test service-database interactions with a real PostgreSQL instance in a Docker container.
    *   **API Tests:** Using RestAssured to test controller endpoints.

3.  **Generate Test Coverage Report (JaCoCo):**
    ```bash
    mvn jacoco:report
    ```
    The report will be generated at `target/site/jacoco/index.html`. Open this file in your browser to view coverage details.

### Running Frontend Tests (Conceptual)

*(Note: The frontend implementation is conceptual, so its tests are only outlined here.)*

1.  **Navigate to the frontend directory:**
    ```bash
    cd chat-app-full-stack/chat-app-frontend
    ```
2.  **Run tests (e.g., Jest/React Testing Library):**
    ```bash
    npm test
    ```
    This will run tests defined in the `src` directory, typically using `jest` and `@testing-library/react`.

## 8. Deployment Guide

This project is designed for containerized deployment using Docker.

### Docker Hub Setup

1.  **Create a Docker Hub account** (if you don't have one).
2.  **Create environment variables** in your GitHub repository secrets (Settings -> Secrets -> Actions):
    *   `DOCKER_USERNAME`: Your Docker Hub username.
    *   `DOCKER_PASSWORD`: Your Docker Hub access token (recommended over password).
    *   `PROD_HOST`: IP address or domain of your production server.
    *   `PROD_USERNAME`: SSH username for your production server.
    *   `PROD_SSH_KEY`: Private SSH key for accessing your production server (ensure it's base64 encoded if necessary, or stored directly as a multi-line secret).

### GitHub Actions CI/CD (Conceptual)

The `.github/workflows/main.yml` defines the CI/CD pipeline:

1.  **`backend-ci` & `frontend-ci` jobs:**
    *   Triggered on `push` and `pull_request` to `main`.
    *   Checkout code, set up Java/Node.js.
    *   Install dependencies (Maven/npm caching).
    *   Run backend (unit, integration, API) and frontend tests.
    *   Generate test coverage reports.
    *   These jobs must pass before proceeding to Docker build and push.

2.  **`docker-build-and-push` job:**
    *   Runs only if `backend-ci` and `frontend-ci` pass.
    *   Logs into Docker Hub using secrets.
    *   Builds Docker images for both backend and frontend.
    *   Pushes tagged images to your Docker Hub repository (e.g., `yourdockerhubusername/chat-app-backend:latest`).

3.  **`deploy` job (Conceptual):**
    *   Runs only if `docker-build-and-push` succeeds and on `push` to `main`.
    *   Connects to a remote production server via SSH.
    *   Pulls the latest Docker images.
    *   Uses `docker compose up -d` to stop old containers, start new ones, and ensure zero-downtime (requires a proper deployment strategy like blue/green or rolling updates for true zero-downtime, this is a basic example).
    *   **Important:** The `docker-compose.yml` on your production server needs to be configured with the correct environment variables for `DB_HOST`, `REDIS_HOST`, `JWT_SECRET_KEY`, etc., pointing to your production database and Redis instances, and the correct `REACT_APP_API_BASE_URL` and `REACT_APP_WEBSOCKET_URL` in the frontend build arguments.

### Manual Deployment (using Docker Compose)

1.  **SSH into your production server.**
2.  **Install Docker and Docker Compose** on the server.
3.  **Clone the repository** or transfer the `docker-compose.yml`, `.env`, `chat-app-backend/Dockerfile`, `chat-app-frontend/Dockerfile`, `chat-app-frontend/nginx.conf` files.
4.  **Create `.env` file** on the server with production-specific environment variables (database credentials, Redis details, production JWT secret, etc.).
5.  **Build and run the services:**
    ```bash
    docker compose pull # Pull latest images from Docker Hub if already built and pushed
    # OR if building locally on the server:
    # docker compose build
    docker compose up -d
    ```
6.  **Ensure firewall rules** are configured to allow access to ports 80 (for frontend) and 8080 (for backend API, if exposed directly or via proxy). For production, it's recommended to put the frontend behind a reverse proxy (e.g., Nginx, Caddy) that handles SSL/TLS termination and routes traffic to the backend.

## 9. Additional Features & Enterprise Considerations

*   **Horizontal Scaling:**
    *   The Spring Boot WebFlux reactive stack is designed for non-blocking I/O, improving concurrency.
    *   Docker allows easy scaling of backend instances.
    *   Redis serves as an external, shared cache, preventing individual backend instances from holding stale data.
    *   For WebSockets, a distributed message broker (e.g., RabbitMQ, Kafka) would be needed if scaling to multiple backend instances that need to share WebSocket session state or broadcast messages across nodes. Spring provides STOMP over RabbitMQ/Kafka support.
*   **Security Enhancements:**
    *   **HTTPS/WSS:** Always use TLS/SSL in production for all HTTP and WebSocket connections. A reverse proxy (Nginx, Caddy) or a cloud load balancer can handle this.
    *   **Input Sanitization:** Beyond validation, ensure all user-generated content is sanitized to prevent XSS attacks (e.g., for chat messages).
    *   **CORS:** Configured but should be fine-tuned to only trusted origins in production.
    *   **Security Headers:** Configure appropriate HTTP security headers (HSTS, CSP, X-Frame-Options, etc.).
    *   **Vulnerability Scanning:** Integrate tools like SonarQube, Snyk, or OWASP ZAP into CI/CD.
*   **Observability:**
    *   **Centralized Logging:** Ship logs to an ELK stack (Elasticsearch, Logstash, Kibana) or Splunk.
    *   **Metrics:** Integrate Prometheus and Grafana with Spring Boot Actuator for comprehensive monitoring.
    *   **Distributed Tracing:** Implement distributed tracing (e.g., OpenTelemetry, Zipkin) for microservices architectures.
*   **Error Handling:**
    *   More granular error codes and messages for specific business logic failures.
    *   Alerting for critical errors.
*   **Database Considerations:**
    *   **Connection Pooling:** Already handled by Spring Boot's HikariCP.
    *   **Backup & Restore Strategy.**
    *   **Replication & High Availability.**
*   **Frontend Enhancements:**
    *   **UI/UX:** A more polished user interface with styling frameworks (Tailwind CSS, Bootstrap, Material UI).
    *   **Real-time Presence:** Show who is online in a room.
    *   **Typing Indicators.**
    *   **Read Receipts.**
    *   **Private Messaging.**
    *   **File Uploads.**
    *   **Push Notifications.**
    *   **Pagination/Infinite Scroll:** For message history and room lists.
*   **Performance Testing:** Use tools like JMeter, Locust, or Gatling to simulate load and identify bottlenecks.
*   **Infrastructure as Code (IaC):** Use Terraform or CloudFormation to provision cloud resources.
*   **Kubernetes Deployment:** For larger-scale deployments, orchestrate services with Kubernetes.

## 10. Contributing

Contributions are welcome! If you find a bug or want to add a feature, please:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'feat: Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

Please ensure your code adheres to the project's coding standards and includes appropriate tests.

## 11. License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
```