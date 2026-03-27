```markdown
# ML Utilities System

A comprehensive, production-ready Machine Learning Utilities System designed to manage, version, and serve machine learning models through a robust API. This full-scale project demonstrates best practices in backend (Java Spring Boot), database management (PostgreSQL), ML inference (Python Flask), frontend (React), and DevOps (Docker, CI/CD).

## Table of Contents

1.  [Features](#features)
2.  [Architecture Overview](#architecture-overview)
3.  [Technology Stack](#technology-stack)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Clone the Repository](#clone-the-repository)
    *   [Environment Variables](#environment-variables)
    *   [Running with Docker Compose (Recommended)](#running-with-docker-compose-recommended)
    *   [Running Locally (Backend & Inference)](#running-locally-backend--inference)
    *   [Running Frontend Locally](#running-frontend-locally)
5.  [API Documentation](#api-documentation)
6.  [Testing](#testing)
7.  [CI/CD](#cicd)
8.  [Logging and Monitoring](#logging-and-monitoring)
9.  [Additional Features](#additional-features)
10. [Deployment Guide](#deployment-guide)
11. [ALX Software Engineering Focus](#alx-software-engineering-focus)
12. [License](#license)

## 1. Features

*   **Model Management:** CRUD operations for ML models (name, description, type).
*   **Model Versioning:** Associate multiple versions with a model, track model paths, metadata, and designate a default version for inference.
*   **User Authentication & Authorization:** JWT-based security with user registration and role-based access control (USER, ADMIN).
*   **ML Inference Serving:** API endpoint to request predictions from specific or default model versions. Delegates actual inference to a separate Python microservice.
*   **Database Management:** PostgreSQL with Flyway for schema migrations and seed data.
*   **Caching:** Ehcache for model metadata and prediction results to improve performance.
*   **Global Error Handling:** Consistent API error responses.
*   **Logging:** Structured logging with Logback.
*   **API Documentation:** Integrated OpenAPI (Swagger UI).
*   **Containerization:** Dockerfiles and `docker-compose.yml` for easy setup and deployment.
*   **CI/CD:** GitHub Actions workflow for automated builds and tests.
*   **Comprehensive Testing:** Unit, Integration, and API tests.
*   **Frontend UI:** A minimal React application to demonstrate API interaction.

## 2. Architecture Overview

The system follows a microservices-inspired architecture, separating concerns into distinct services:

```
+----------------+        +---------------------+        +---------------------+
|    Frontend    | ---->  |      Nginx Proxy    | ---->  |       Backend       |
|    (React)     |        |   (Port 3000 -> 80) |        |    (Java Spring)    |
+----------------+        +---------------------+        +---------------------+
                                   | HTTP/REST              | JWT Auth, Cache,
                                   |                        | Model CRUD,
                                   |                        | Orchestrates Inference
                                   |                        |
                                   V HTTP/REST              V HTTP/REST (internal)
                             +---------------------+   +---------------------+
                             |   Inference Service |<-- |   PostgreSQL DB     |
                             |      (Python)       |    | (Model Metadata)    |
                             |   (Port 5001)       |    +---------------------+
                             |                     |
                             | Loads & serves ML   |
                             | models (.pkl)       |
                             +---------------------+
```

*   **Frontend (React):** A user interface to interact with the backend API, allowing users to log in, view models, and request predictions.
*   **Nginx Proxy:** Serves the static frontend assets and proxies API requests to the backend.
*   **Backend (Java Spring Boot):** The core application. It handles API gateway responsibilities, user authentication, model and model version management (CRUD), and orchestrates prediction requests by calling the Python Inference Service.
*   **PostgreSQL Database:** Stores all persistent data, including user details, model metadata, and model version information.
*   **Inference Service (Python Flask):** A lightweight service responsible for loading trained ML models (e.g., `.pkl` files) and performing actual predictions based on input data. It's designed to be stateless and scalable.

## 3. Technology Stack

**Backend (Java Spring Boot)**
*   **Language:** Java 17+
*   **Framework:** Spring Boot 3+
*   **Data Access:** Spring Data JPA with Hibernate
*   **Database:** PostgreSQL
*   **Migrations:** Flyway
*   **Security:** Spring Security (JWT)
*   **Caching:** Ehcache
*   **API Docs:** OpenAPI (Swagger UI)
*   **Testing:** JUnit 5, Mockito, RestAssured, Testcontainers
*   **Utilities:** Lombok

**Inference Service (Python)**
*   **Language:** Python 3.9+
*   **Web Framework:** Flask
*   **ML Libraries:** scikit-learn (for dummy model), numpy, pandas
*   **WSGI Server:** Gunicorn

**Frontend (React)**
*   **Framework:** React 18+
*   **HTTP Client:** Axios

**Infrastructure & DevOps**
*   **Containerization:** Docker, Docker Compose
*   **Web Server:** Nginx (for frontend)
*   **CI/CD:** GitHub Actions

## 4. Setup and Installation

### Prerequisites

*   **Git:** For cloning the repository.
*   **Java 17+ JDK:** If running backend locally.
*   **Maven:** If building backend locally.
*   **Python 3.9+:** If running inference service locally.
*   **pip:** Python package installer.
*   **Node.js & npm/yarn:** If running frontend locally.
*   **Docker & Docker Compose:** **Highly Recommended** for running the entire system.

### Clone the Repository

```bash
git clone https://github.com/your-username/ml-utilities-system.git
cd ml-utilities-system
```

### Environment Variables

Create a `.env` file in the root directory (where `docker-compose.yml` is located) with the following variables. These will be picked up by Docker Compose.

```dotenv
# .env file

# Database Configuration
DB_NAME=ml_utilities_db
DB_USERNAME=ml_user
DB_PASSWORD=ml_password

# JWT Configuration
# IMPORTANT: Change this to a strong, randomly generated key in production. Must be at least 32 characters for HS256.
JWT_SECRET=your_super_secret_jwt_key_that_is_long_enough_and_random
JWT_EXPIRATION_MS=3600000 # 1 hour

# Inference Service Configuration (used by Java backend)
INFERENCE_HOST=inference-service # Docker internal hostname
INFERENCE_PORT=5001
```

### Running with Docker Compose (Recommended)

This is the easiest way to get the entire system up and running.

1.  **Build and Start Services:**
    ```bash
    docker compose up --build -d
    ```
    *   `--build`: Builds images from Dockerfiles.
    *   `-d`: Runs services in detached mode (in the background).

2.  **Verify Services:**
    ```bash
    docker ps
    ```
    You should see `ml-utilities-db`, `ml-utilities-backend`, `ml-inference-service`, and `ml-utilities-frontend` running.

3.  **Access the Applications:**
    *   **Frontend UI:** `http://localhost:3000`
    *   **Backend API (Swagger UI):** `http://localhost:8080/swagger-ui/index.html` (if not using frontend Nginx proxy)
    *   **Backend API (via Nginx):** `http://localhost:3000/api/swagger-ui/index.html` (frontend Nginx proxy is configured to forward `/api` requests)
    *   **Inference Service (direct, for debugging):** `http://localhost:5001` (though typically accessed only by the backend)

4.  **Stop Services:**
    ```bash
    docker compose down
    ```
    To also remove volumes (database data):
    ```bash
    docker compose down --volumes
    ```

### Running Locally (Backend & Inference)

You can run the backend and inference services directly on your machine.

1.  **Start PostgreSQL Database (e.g., via Docker):**
    ```bash
    docker run --name ml-utilities-db -e POSTGRES_DB=ml_utilities_db -e POSTGRES_USER=ml_user -e POSTGRES_PASSWORD=ml_password -p 5432:5432 -d postgres:15-alpine
    ```

2.  **Run Inference Service:**
    ```bash
    cd inference-service
    pip install -r requirements.txt
    python app.py
    ```
    The inference service will start on `http://localhost:5001`. It will create a `sample_model.pkl` in the `model/` directory if it doesn't exist.

3.  **Run Backend Application:**
    ```bash
    cd backend
    ./mvnw spring-boot:run
    ```
    Ensure your `application.yml` (or environment variables) point to `localhost:5432` for the DB and `localhost:5001` for the inference service.
    The backend will start on `http://localhost:8080`.

### Running Frontend Locally

1.  **Start Backend and Inference Services (as above).**
2.  **Install Dependencies:**
    ```bash
    cd frontend
    npm install # or yarn install
    ```
3.  **Start Frontend:**
    ```bash
    npm start # or yarn start
    ```
    The frontend will open in your browser, usually at `http://localhost:3000`. It is configured to proxy API requests to `/api` (which then needs to be mapped to the backend via Nginx or a similar setup if not running the full Docker Compose stack). For local dev, you might need to adjust `REACT_APP_API_BASE_URL` in `frontend/.env` or `App.js` directly to point to `http://localhost:8080/api` if you don't run Nginx.

## 5. API Documentation

The backend includes integrated OpenAPI (Swagger UI) documentation.

*   When running via Docker Compose, access at: `http://localhost:3000/api/swagger-ui/index.html` (proxied through Nginx).
*   If running backend locally, access at: `http://localhost:8080/swagger-ui/index.html`.

**Authentication:**
To test authenticated endpoints in Swagger UI:
1.  Click the "Authorize" button.
2.  Enter the JWT token obtained from `/api/auth/login`.
    *   Default admin user: `username=admin`, `password=adminpass`
    *   Default regular user: `username=user`, `password=userpass`
    (These are seeded by the `DataLoader` on first startup if the database is empty).
3.  Click "Authorize" and then "Close". Your token will be applied to subsequent requests.

## 6. Testing

The project includes various types of tests:

*   **Unit Tests:** Located in `backend/src/test/java/com/ml/utilities/service`, `controller`, etc. These test individual components in isolation using Mockito.
    *   Run with: `cd backend && ./mvnw test`
*   **Integration Tests:** Located in `backend/src/test/java/com/ml/utilities/integration`. These use `@SpringBootTest` and Testcontainers to spin up a real PostgreSQL database, testing the interaction between layers and verifying API endpoints.
    *   Run with: `cd backend && ./mvnw verify` (the `install` goal also runs tests by default)
*   **API Tests:** The integration tests (e.g., `ApiIntegrationTest.java`) use RestAssured to make actual HTTP requests to the running Spring Boot application and assert on responses, covering the full request-response cycle.
*   **Coverage:** JaCoCo is configured in `pom.xml` to aim for 80%+ line and branch coverage for the backend. After running tests, a report can be found at `backend/target/site/jacoco/index.html`.

## 7. CI/CD

A basic GitHub Actions workflow (`.github/workflows/main.yml`) is configured for:
*   **Backend Build & Test:** Compiles the Java backend, runs unit and integration tests (using Testcontainers).
*   **Docker Image Build & Push:** On `main` branch pushes, it builds Docker images for the backend, inference service, and frontend, and pushes them to Docker Hub. (Requires `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets configured in GitHub).

To trigger the CI pipeline, commit and push changes to the `main` branch or open a Pull Request.

## 8. Logging and Monitoring

*   **Logging:** The Java backend uses SLF4J with Logback (`logback-spring.xml`). Logs are written to console and `logs/ml-utilities-system.log` (with daily rolling).
*   **Monitoring:** Spring Boot Actuator is enabled (`/actuator/**`).
    *   Health checks: `/actuator/health`
    *   Metrics: `/actuator/metrics`, `/actuator/prometheus` (can be scraped by Prometheus)
    *   Info: `/actuator/info`
    In a production environment, these metrics would be collected by tools like Prometheus and visualized in Grafana. Centralized logging solutions (e.g., ELK stack, Splunk) would aggregate logs from all services.

## 9. Additional Features

*   **Authentication/Authorization:** Implemented using JWT tokens with Spring Security. Role-based access (`ROLE_USER`, `ROLE_ADMIN`) is enforced using `@PreAuthorize` annotations.
*   **Logging:** Configured with `logback-spring.xml` for file and console output.
*   **Error Handling Middleware:** A `@ControllerAdvice` (`GlobalExceptionHandler`) provides consistent, structured error responses for various exceptions (e.g., `ResourceNotFoundException`, `IllegalArgumentException`, validation errors).
*   **Caching Layer:** Ehcache is integrated (`CacheConfig.java`) with `@Cacheable`, `@CachePut`, and `@CacheEvict` annotations to cache model metadata and prediction results, reducing database load and improving response times.
*   **Rate Limiting:** Not explicitly implemented as a separate component in this scope, but can be added using Spring Cloud Gateway for API Gateway level rate limiting, or a simple custom filter.

## 10. Deployment Guide

The `docker-compose.yml` provides a blueprint for deploying the entire system. For production deployments:

1.  **Cloud Provider:** Choose a cloud provider (AWS, Azure, GCP).
2.  **Container Orchestration:** Use Kubernetes (EKS, AKS, GKE) or Docker Swarm for managing containers at scale.
    *   Convert `docker-compose.yml` to Kubernetes manifests (`deployment.yaml`, `service.yaml`, `ingress.yaml`) or use `kompose`.
3.  **Database:** Use a managed database service (AWS RDS, Azure Database for PostgreSQL) instead of a Docker container for persistence, backups, and scalability.
4.  **Secrets Management:** Store `JWT_SECRET` and database credentials in a secure secrets manager (AWS Secrets Manager, Kubernetes Secrets) instead of environment variables directly.
5.  **Domain & TLS:** Configure a custom domain and HTTPS/TLS certificates (e.g., via Nginx Ingress Controller with Cert-Manager on Kubernetes).
6.  **Monitoring & Logging:** Integrate with cloud-native monitoring (CloudWatch, Stackdriver) and logging (CloudWatch Logs, Fluentd/Fluent Bit for log aggregation).
7.  **Scalability:** Configure auto-scaling for backend and inference services based on load.

## 11. ALX Software Engineering Focus

This project explicitly addresses ALX Software Engineering precourse materials:

*   **Programming Logic:** Demonstrates clear, modular Java and Python code with well-defined functions and classes, adhering to object-oriented principles. Logical flows are designed for robustness and maintainability.
*   **Algorithm Design:** While the core backend logic focuses on system orchestration rather than complex new algorithms, the selection of data structures (e.g., `Set` for roles), efficient database queries (implicitly via JPA, explicitly with indexing), and caching mechanisms (Ehcache) reflects considerations for performance and algorithmic efficiency in data handling. The inference service's dummy prediction logic can be replaced with any complex ML algorithm.
*   **Technical Problem Solving:** Tackles common enterprise challenges:
    *   **Authentication & Authorization:** JWT implementation.
    *   **Database Management:** Flyway for schema evolution, JPA for data mapping.
    *   **Inter-service Communication:** HTTP/REST calls between Java and Python.
    *   **Error Handling:** Centralized, structured error responses.
    *   **Scalability & Reliability:** Containerization with Docker Compose, caching, and an architecture suitable for microservices deployment.
    *   **Maintainability:** Clear project structure, comprehensive testing, and documentation.

## 12. License

This project is open-source and available under the [MIT License](LICENSE).
```