# ALX E-commerce Solution

This project provides a comprehensive, production-ready e-commerce solution built with Java Spring Boot for the backend and a conceptual React frontend. It's designed following ALX Software Engineering principles, emphasizing clean code, robust architecture, and a full suite of modern enterprise features.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Technology Stack](#technology-stack)
4.  [Local Development Setup](#local-development-setup)
    *   [Prerequisites](#prerequisites)
    *   [Database Setup](#database-setup)
    *   [Running with Docker Compose](#running-with-docker-compose)
    *   [Running Backend Locally (IDE)](#running-backend-locally-ide)
    *   [Running Frontend Locally (Development Server)](#running-frontend-locally-development-server)
5.  [API Documentation](#api-documentation)
6.  [Testing](#testing)
7.  [CI/CD](#cicd)
8.  [Deployment](#deployment)
9.  [Contribution](#contribution)
10. [License](#license)

---

## 1. Features

This full-scale e-commerce solution includes:

*   **User Management**: User registration, login, JWT-based authentication and authorization (roles: USER, ADMIN).
*   **Product Catalog**:
    *   CRUD operations for categories.
    *   CRUD operations for products (including pagination, search by keyword).
    *   Product details with category association.
*   **Shopping Cart**:
    *   Add/remove products to/from cart.
    *   Update item quantities in cart.
    *   View cart contents and total.
    *   Clear cart.
*   **Order Management**:
    *   Place orders from the shopping cart.
    *   View user-specific order history.
    *   Admin functionality to update order status.
    *   Stock management integrated with order placement.
*   **Security**: JWT-based authentication, Spring Security, password hashing.
*   **Error Handling**: Centralized exception handling with consistent API responses.
*   **Logging & Monitoring**: Configurable logging with Logback, Actuator endpoints for health and metrics (Prometheus).
*   **Caching**: Redis integration for product and category data to improve performance.
*   **Rate Limiting**: Custom filter to protect API endpoints from abuse based on client IP.
*   **Database Migrations**: Liquibase for schema management.

---

## 2. Architecture

Refer to the [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed overview of the system design, components, and interactions.

---

## 3. Technology Stack

### Backend
*   **Language**: Java 17+
*   **Framework**: Spring Boot 3.x
*   **Web**: Spring Web MVC, RESTful APIs
*   **Database**: PostgreSQL
*   **ORM**: Spring Data JPA, Hibernate
*   **Security**: Spring Security, JWT (jjwt)
*   **Caching**: Spring Cache, Redis (Lettuce)
*   **Database Migrations**: Liquibase
*   **Validation**: Spring Validation (Jakarta Bean Validation)
*   **Logging**: SLF4J, Logback
*   **Documentation**: Springdoc OpenAPI (Swagger UI)
*   **Utilities**: Lombok (for boilerplate reduction), Bucket4j (for rate limiting)
*   **Build Tool**: Maven

### Frontend (Conceptual)
*   **Framework**: React (using Create React App)
*   **Language**: JavaScript/JSX
*   **HTTP Client**: Axios
*   **Build Tool**: npm/yarn

### Infrastructure
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions
*   **Code Quality**: SonarCloud (integrated into CI)

---

## 4. Local Development Setup

### Prerequisites

Before you begin, ensure you have the following installed:

*   **Java 17 Development Kit (JDK)**
*   **Maven 3.x**
*   **Docker Desktop** (includes Docker Engine and Docker Compose)
*   **Node.js & npm** (for frontend development)
*   An **IDE** like IntelliJ IDEA (recommended for Spring Boot)

### Database Setup (Handled by Docker Compose)

The `docker-compose.yml` file sets up a PostgreSQL database and a Redis instance automatically. You don't need to install them separately.

### Running with Docker Compose (Recommended for Full Stack)

This method spins up the PostgreSQL database, Redis, Spring Boot backend, and a placeholder React frontend simultaneously.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/ecommerce-solution.git
    cd ecommerce-solution
    ```

2.  **Create `.env` file for Docker Compose**:
    Create a `.env` file in the root directory (`ecommerce-solution/`) for environment variables.
    ```env
    # .env
    DB_NAME=ecommerce_db
    DB_USERNAME=ecommerce_user
    DB_PASSWORD=ecommerce_password
    JWT_SECRET=superSecretKeyForALXECommerceSolutionThatIsAtLeast32BytesLong
    # IMPORTANT: Replace JWT_SECRET with a strong, random 256-bit key for production.
    # e.g., using `head /dev/urandom | tr -dc A-Za-z0-9_ | head -c 32 ; echo`
    ```

3.  **Build and run services**:
    ```bash
    docker compose up --build -d
    ```
    *   `--build`: Rebuilds images (useful after code changes).
    *   `-d`: Runs services in detached mode.

4.  **Verify services**:
    ```bash
    docker ps
    ```
    You should see `ecommerce_db`, `ecommerce_redis`, `ecommerce_backend`, and `ecommerce_frontend` containers running.

5.  **Access the applications**:
    *   **Backend API**: `http://localhost:8080/api`
    *   **Swagger UI (API Docs)**: `http://localhost:8080/swagger-ui.html`
    *   **Frontend (Placeholder)**: `http://localhost:3000`

6.  **Stop services**:
    ```bash
    docker compose down
    ```

### Running Backend Locally (IDE)

If you prefer to run the Spring Boot backend directly from your IDE for faster development cycles:

1.  **Ensure Dockerized DB/Redis is running**:
    ```bash
    docker compose up db redis -d
    ```
    (You only need the database and Redis if running backend locally).

2.  **Navigate to the backend directory**:
    ```bash
    cd backend
    ```

3.  **Configure `application.yml`**:
    Ensure `src/main/resources/application.yml` has the correct database and Redis connection details. If `DB_HOST` is not `localhost`, you might need to change it to `localhost` when running outside Docker's network, or keep it `db` if your local environment can resolve `db` to the Docker container (less common). For simplicity, keep it as `db` and ensure your Docker `db` service is running. If facing issues, you can explicitly set `DB_HOST: localhost` in `application.yml` for local IDE run.

4.  **Run Maven build**:
    ```bash
    mvn clean install
    ```

5.  **Run the application**:
    *   From your IDE, run `com.alx.ecommerce.EcommerceApplication.java`.
    *   From terminal: `mvn spring-boot:run`

    The backend will start on `http://localhost:8080/api`.

### Running Frontend Locally (Development Server)

To develop the React frontend with hot-reloading:

1.  **Ensure backend is running** (either via Docker Compose or locally in IDE).

2.  **Navigate to the frontend directory**:
    ```bash
    cd frontend
    ```

3.  **Install dependencies**:
    ```bash
    npm install
    # or yarn install
    ```

4.  **Start the development server**:
    ```bash
    npm start
    # or yarn start
    ```
    The frontend will open in your browser, usually at `http://localhost:3000`.

---

## 5. API Documentation

The backend API is self-documented using Springdoc OpenAPI.
Once the backend is running, you can access the Swagger UI at:
**`http://localhost:8080/swagger-ui.html`**

This interface allows you to:
*   View all available API endpoints.
*   See request/response schemas.
*   Try out API calls directly from the browser (requires obtaining a JWT token from `/api/auth/signin` and authorizing with it).

---

## 6. Testing

The project includes various types of tests:

*   **Unit Tests**: Located in `backend/src/test/java/com/alx/ecommerce/*/service/*Test.java`. These test individual components (e.g., services) in isolation using Mockito.
*   **Integration Tests**: Located in `backend/src/test/java/com/alx/ecommerce/*/controller/*IntegrationTest.java`. These test the interaction between multiple components, including the API layer and an in-memory database (H2 for fast tests).

### Running Tests

1.  **Navigate to the backend directory**:
    ```bash
    cd backend
    ```

2.  **Run all tests**:
    ```bash
    mvn test
    ```

3.  **Generate Test Coverage Report (JaCoCo)**:
    After running `mvn test`, a JaCoCo report will be generated.
    ```bash
    # Open the report in your browser
    xdg-open target/site/jacoco/index.html # For Linux
    open target/site/jacoco/index.html     # For macOS
    start target/site/jacoco/index.html    # For Windows
    ```

### Performance Testing

Performance testing is critical for production-ready systems. While specific scripts are not provided in this base project (as they depend on desired load patterns), you would typically use tools like:

*   **JMeter**: For simulating various load types, recording user journeys, and generating reports.
*   **Gatling**: A highly performant load testing tool based on Scala, for scripting complex scenarios.

**Steps for Performance Testing (Conceptual):**
1.  **Deploy the application** to a staging environment that mimics production.
2.  **Define load scenarios**: Identify critical user flows (e.g., register, login, browse products, add to cart, checkout).
3.  **Create test scripts**: Write JMeter/Gatling scripts to simulate these scenarios.
4.  **Execute tests**: Run tests with increasing load to identify bottlenecks.
5.  **Monitor**: Use tools like Prometheus/Grafana (integrated via Spring Boot Actuator) to monitor resource utilization (CPU, memory, database connections) during tests.
6.  **Analyze results**: Identify response time degradation, errors, and resource saturation points.

---

## 7. CI/CD

A basic CI/CD pipeline is configured using GitHub Actions (`.github/workflows/main.yml`):

*   **Build & Test**: On every push and pull request to `main`:
    *   Checks out code.
    *   Sets up Java 17.
    *   Builds the backend project with Maven.
    *   Runs all unit and integration tests.
    *   (Optional) Integrates with SonarCloud for code quality analysis.
*   **Docker Build & Push**: On successful build on the `main` branch:
    *   Builds Docker images for the backend (and potentially frontend).
    *   Pushes these images to Docker Hub (or a private registry).
*   **Deployment (Placeholder)**: On successful Docker image push:
    *   A placeholder step for deployment to a production server. This typically involves SSHing to the server and updating Docker containers.

**To enable the CI/CD pipeline:**
1.  Fork this repository.
2.  Go to your GitHub repository's `Settings` -> `Secrets and variables` -> `Actions`.
3.  Add the following repository secrets:
    *   `DOCKER_USERNAME`: Your Docker Hub username.
    *   `DOCKER_PASSWORD`: Your Docker Hub access token (not your password directly).
    *   `SONAR_TOKEN`: (Optional, for SonarCloud) Your SonarCloud project token.
    *   `SSH_PRIVATE_KEY`: (For deployment, if using SSH) The private key corresponding to a public key authorized on your deployment server.
    *   `DEPLOY_HOST`: (For deployment) The IP address or hostname of your deployment server.
    *   `DEPLOY_USER`: (For deployment) The username for SSH access on your deployment server.

---

## 8. Deployment

Refer to the [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment considerations and strategies.

---

## 9. Contribution

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

---

## 10. License

This project is licensed under the MIT License. See the `LICENSE` file for details.