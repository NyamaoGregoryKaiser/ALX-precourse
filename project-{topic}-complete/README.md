# ALX E-commerce System Backend

This is a comprehensive, production-ready E-commerce solutions system built with Java (Spring Boot), PostgreSQL, and Docker. It provides a robust backend API for managing products, categories, users, orders, and more.

## Table of Contents

1.  [Features](#features)
2.  [Technologies Used](#technologies-used)
3.  [Prerequisites](#prerequisites)
4.  [Getting Started](#getting-started)
    *   [Local Development Setup](#local-development-setup)
    *   [Running with Docker Compose](#running-with-docker-compose)
5.  [Database](#database)
    *   [Migrations](#migrations)
    *   [Seed Data](#seed-data)
6.  [API Endpoints](#api-endpoints)
7.  [Authentication & Authorization](#authentication--authorization)
8.  [Testing](#testing)
    *   [Running Tests](#running-tests)
    *   [Test Coverage](#test-coverage)
9.  [Logging & Monitoring](#logging--monitoring)
10. [Caching](#caching)
11. [CI/CD](#cicd)
12. [Deployment](#deployment)
13. [Frontend (Conceptual)](#frontend-conceptual)
14. [Contributing](#contributing)
15. [License](#license)

## 1. Features

*   **User Management:** Registration, login, user profiles (Admin/User roles).
*   **Authentication & Authorization:** JWT-based security with Spring Security. Role-based access control.
*   **Product Management:** CRUD operations for products, search, pagination.
*   **Category Management:** CRUD operations for product categories.
*   **Order Management:** Create orders, view user-specific orders, update order status (Admin).
*   **Reviews:** Product reviews and ratings.
*   **Database:** PostgreSQL for persistent data storage.
*   **API Documentation:** OpenAPI (Swagger UI) for interactive API exploration.
*   **Caching:** In-memory caching with Caffeine to improve performance.
*   **Error Handling:** Global exception handling for consistent API responses.
*   **Logging:** Structured logging with Logback.
*   **Containerization:** Docker for easy deployment and local development.
*   **Database Migrations:** Flyway for schema evolution.
*   **Testing:** Comprehensive unit, integration, and API tests.
*   **CI/CD:** GitHub Actions workflow for automated build, test, and deployment.

## 2. Technologies Used

*   **Java:** 17+
*   **Spring Boot:** 3.x
*   **Maven:** Build automation tool
*   **PostgreSQL:** Relational database
*   **Spring Data JPA:** ORM for database interaction
*   **Spring Security:** Authentication and authorization
*   **JJWT:** JSON Web Token implementation
*   **Flyway:** Database migration tool
*   **Lombok:** Boilerplate code reduction
*   **SpringDoc OpenAPI:** API documentation (Swagger UI)
*   **Caffeine:** High-performance in-memory caching library
*   **Docker & Docker Compose:** Containerization
*   **JUnit 5, Mockito, Testcontainers:** Testing frameworks
*   **JaCoCo:** Code coverage reports
*   **GitHub Actions:** CI/CD

## 3. Prerequisites

Before you begin, ensure you have the following installed:

*   **Java Development Kit (JDK) 17 or higher**
*   **Maven 3.6.x or higher**
*   **Docker Desktop** (includes Docker Engine and Docker Compose)
*   **Git**

## 4. Getting Started

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/ecommerce-system.git
    cd ecommerce-system
    ```

2.  **Start PostgreSQL database locally (without Docker Compose):**
    You can manually run a PostgreSQL instance or use a tool like `pgAdmin`.
    Ensure you create a database named `ecommerce_db` with user `admin` and password `password`.

3.  **Update `application.properties` (if not using default Docker Compose values):**
    Edit `src/main/resources/application.properties` to point to your local PostgreSQL instance if it differs from the defaults (`localhost:5432`, `ecommerce_db`, `admin`, `password`).

4.  **Run Flyway Migrations (optional, if not using Spring Boot's auto-migration or Docker Compose):**
    ```bash
    mvn flyway:migrate
    ```
    Spring Boot will run migrations automatically on startup if `spring.flyway.enabled=true`.

5.  **Build and run the Spring Boot application:**
    ```bash
    mvn clean install
    mvn spring-boot:run
    ```
    The application will start on `http://localhost:8080`.

### Running with Docker Compose

This is the recommended way to run the application and its database for local development.

1.  **Build the Docker image (if not already built by CI/CD or `docker-compose up`):**
    ```bash
    docker build -t ecommerce-backend:latest .
    ```

2.  **Start the application and PostgreSQL database:**
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Rebuilds the Docker image for the `app` service.
    *   `-d`: Runs containers in detached mode (in the background).

3.  **Verify containers are running:**
    ```bash
    docker-compose ps
    ```
    You should see `ecommerce-postgres` and `ecommerce-app` listed as `Up`.

4.  **Access the application:**
    *   The backend API will be available at `http://localhost:8080`.
    *   Swagger UI (API documentation) will be at `http://localhost:8080/swagger-ui.html`.

5.  **Stop the containers:**
    ```bash
    docker-compose down
    ```

## 5. Database

The system uses **PostgreSQL** as its relational database.

### Migrations

**Flyway** is used for database schema migrations.
*   Migration scripts are located in `src/main/resources/db/migration/`.
*   Spring Boot automatically runs Flyway migrations on startup if `spring.flyway.enabled=true`.

### Seed Data

*   `V2__Seed_Data.sql` contains initial data for roles, admin/user accounts, categories, products, and some sample reviews/orders.
*   The admin user credentials are:
    *   **Username:** `admin`
    *   **Password:** `adminpass`
*   The regular user credentials are:
    *   **Username:** `john.doe`
    *   **Password:** `userpass`

## 6. API Endpoints

The API documentation is available via **Swagger UI** once the application is running:
`http://localhost:8080/swagger-ui.html`

A brief overview of key endpoints:

*   **Authentication:**
    *   `POST /api/v1/auth/register`: Register a new user.
    *   `POST /api/v1/auth/login`: Authenticate and get a JWT token.
*   **Products:**
    *   `POST /api/v1/products` (ADMIN): Create product.
    *   `GET /api/v1/products`: Get all products (paginated).
    *   `GET /api/v1/products/{id}`: Get product by ID.
    *   `PUT /api/v1/products/{id}` (ADMIN): Update product.
    *   `DELETE /api/v1/products/{id}` (ADMIN): Delete product.
    *   `GET /api/v1/products/search?q={query}`: Search products.
*   **Categories:**
    *   `POST /api/v1/categories` (ADMIN): Create category.
    *   `GET /api/v1/categories`: Get all categories (paginated).
    *   `GET /api/v1/categories/{id}`: Get category by ID.
    *   `PUT /api/v1/categories/{id}` (ADMIN): Update category.
    *   `DELETE /api/v1/categories/{id}` (ADMIN): Delete category.
*   **Users:**
    *   `GET /api/v1/users` (ADMIN): Get all users (paginated).
    *   `GET /api/v1/users/{id}` (ADMIN or Owner): Get user by ID.
    *   `PUT /api/v1/users/{id}` (ADMIN or Owner): Update user.
    *   `DELETE /api/v1/users/{id}` (ADMIN): Delete user.
*   **Orders:**
    *   `POST /api/v1/orders` (USER/ADMIN): Create a new order.
    *   `GET /api/v1/orders/{id}` (ADMIN or Owner): Get order by ID.
    *   `GET /api/v1/orders/my-orders` (USER/ADMIN): Get orders for the authenticated user.
    *   `GET /api/v1/orders` (ADMIN): Get all orders (paginated).
    *   `PATCH /api/v1/orders/{id}/status` (ADMIN): Update order status.
    *   `DELETE /api/v1/orders/{id}` (ADMIN): Delete order.

## 7. Authentication & Authorization

The system uses **JWT (JSON Web Tokens)** for securing API endpoints.

*   **Registration:** New users register with `ROLE_USER` by default.
*   **Login:** Upon successful login, a JWT `accessToken` is returned.
*   **Accessing Protected Resources:** The JWT token must be included in the `Authorization` header of subsequent requests, prefixed with `Bearer `.
    Example: `Authorization: Bearer <your_jwt_token>`
*   **Role-Based Access Control (RBAC):**
    *   `ROLE_ADMIN`: Has full access to all CRUD operations on products, categories, users, and orders.
    *   `ROLE_USER`: Can register, login, view products/categories, create orders, view their own orders and profile.
    *   Spring Security's `@PreAuthorize` is used to enforce these rules.

## 8. Testing

The project emphasizes quality through comprehensive testing.

### Running Tests

To run all unit and integration tests:
```bash
mvn test
```

### Test Coverage

**JaCoCo** is integrated to generate code coverage reports.
After running `mvn clean install`, you can find the report at:
`target/site/jacoco/index.html`

The `pom.xml` is configured to fail the build if line coverage drops below 80% or branch coverage below 70%.

## 9. Logging & Monitoring

*   **Logging:** `SLF4J` with `Logback` is used for structured logging.
    *   Configuration is in `src/main/resources/logback-spring.xml`.
    *   Logs are written to `console` and a `rolling file` (`logs/ecommerce-system.log`).
    *   Log levels can be configured in `application.properties` and `logback-spring.xml`.
*   **Monitoring (Conceptual):** For production, integrate with tools like:
    *   **Prometheus:** For metrics collection (e.g., JVM, HTTP requests, custom business metrics via Micrometer).
    *   **Grafana:** For dashboarding and visualizing metrics.
    *   **Loki:** For centralizing logs from multiple services.

## 10. Caching

*   **Spring Cache Abstraction** with **Caffeine** is used for in-memory caching.
*   The `CacheConfig.java` defines cache managers and expiration policies for different data types (products, categories, users).
*   `@Cacheable`, `@CachePut`, and `@CacheEvict` annotations are used in service methods to manage caching behavior.

## 11. CI/CD

A **GitHub Actions** workflow (`.github/workflows/ci-cd.yml`) is configured for continuous integration and continuous deployment:

*   **Build & Test:** On every push or pull request to `main` or `develop` branches:
    *   Checks out code.
    *   Sets up JDK.
    *   Builds the project with Maven.
    *   Runs all tests (unit and integration).
    *   Generates and uploads JaCoCo coverage reports.
    *   Builds and pushes a Docker image to Docker Hub (only on `main` branch).
*   **Deploy:** On successful build/test on the `main` branch:
    *   Triggers a placeholder deployment script. This should be customized to your specific deployment environment (e.g., SSH to a server, Kubernetes deployment, cloud services).

## 12. Deployment

The application is containerized with Docker, making deployment straightforward.

**Production Deployment Options:**

1.  **Docker Host:**
    *   Provision a Linux server.
    *   Install Docker and Docker Compose.
    *   Copy `docker-compose.yml` to the server.
    *   Ensure environment variables for PostgreSQL and JWT secret are set securely (e.g., via `.env` file or directly in `docker-compose.yml` but avoid committing secrets).
    *   `docker-compose up -d`
    *   Consider a reverse proxy like Nginx for SSL termination, rate limiting, and domain routing.

2.  **Kubernetes:**
    *   Create Kubernetes deployment and service manifests (e.g., `deployment.yaml`, `service.yaml`) for the backend and PostgreSQL.
    *   Use a managed PostgreSQL service (e.g., AWS RDS, Azure Database for PostgreSQL) instead of running PostgreSQL in Kubernetes for production.
    *   Deploy using `kubectl apply -f <manifests>`.

3.  **Cloud Platforms (PaaS):**
    *   **AWS Elastic Beanstalk / ECS Fargate:** Deploy the Docker image directly.
    *   **Azure App Service / Container Instances:** Deploy the Docker image.
    *   **Google Cloud Run / App Engine:** Deploy the Docker image.

**Important Security Considerations for Production:**

*   **Environment Variables:** Never hardcode sensitive information (JWT secret, database credentials). Use environment variables, Docker secrets, or Kubernetes secrets.
*   **HTTPS:** Always use HTTPS in production. Configure a load balancer or reverse proxy for SSL termination.
*   **Firewall:** Restrict database access to only the application server.
*   **Rate Limiting:** Implement robust rate limiting at the API Gateway or application level to prevent abuse. (Conceptual in this project, but can be added via Spring Cloud Gateway or Bucket4j).
*   **Monitoring & Alerts:** Set up continuous monitoring and alerts for application health, performance, and security events.

## 13. Frontend (Conceptual)

This repository focuses on the backend implementation. A separate frontend application (e.g., built with React, Angular, or Vue.js) would consume these REST APIs.

**Example Frontend Interaction:**

```javascript
// Example: React component for login
import React, { useState } from 'react';
import axios from 'axios';

function LoginComponent() {
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:8080/api/v1/auth/login', {
                usernameOrEmail,
                password,
            });
            localStorage.setItem('jwtToken', response.data.accessToken);
            setMessage('Login successful!');
            // Redirect to dashboard or home page
        } catch (error) {
            setMessage(error.response?.data?.message || 'Login failed.');
        }
    };

    return (
        <form onSubmit={handleLogin}>
            <h2>Login</h2>
            <input
                type="text"
                placeholder="Username or Email"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">Login</button>
            {message && <p>{message}</p>}
        </form>
    );
}

// Example: Fetching products with JWT
const fetchProducts = async () => {
    const token = localStorage.getItem('jwtToken');
    try {
        const response = await axios.get('http://localhost:8080/api/v1/products', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        console.log('Products:', response.data.content);
    } catch (error) {
        console.error('Failed to fetch products:', error);
    }
};
```

## 14. Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes and ensure tests pass.
4.  Commit your changes (`git commit -m 'feat: Add new feature'`).
5.  Push to your fork (`git push origin feature/your-feature-name`).
6.  Open a Pull Request to the `develop` branch of the main repository.

## 15. License

This project is licensed under the [MIT License](LICENSE).
```

**ARCHITECTURE.md**

```markdown