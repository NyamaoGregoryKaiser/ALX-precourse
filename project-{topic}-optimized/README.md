```markdown
# Real-time Chat Application

This is a comprehensive, production-ready real-time chat application built with Spring Boot (Java) for the backend, PostgreSQL for the database, and a basic HTML/CSS/JavaScript client for the frontend using WebSockets (STOMP). It incorporates advanced features like authentication, authorization, caching, rate limiting, and robust error handling, adhering to enterprise-grade software engineering principles.

## Features

**Core Application (Backend - Spring Boot)**
*   **User Management**: Register, Login, View/Update/Delete Users (with roles).
*   **Chat Room Management**: Create, View, Update, Delete Rooms, Add/Remove Members.
*   **Real-time Messaging**: Send and receive messages instantly via WebSockets (STOMP).
*   **RESTful API**: Full CRUD operations for users, rooms, and messages.

**Database Layer (PostgreSQL)**
*   Schema definitions for Users, Chat Rooms, Messages, and Room Members.
*   Flyway migration scripts for schema management and seed data.
*   Basic query optimization with indexing.

**Configuration & Setup**
*   Maven (`pom.xml`) for dependency management.
*   Externalized environment configuration (`application.yml`).
*   Docker and Docker Compose for containerization and orchestration.
*   CI/CD pipeline configuration (conceptual GitHub Actions).

**Testing & Quality**
*   **Unit Tests**: Mockito, JUnit 5 for isolating and testing individual components (services, controllers).
*   **Integration Tests**: Spring Boot Test, Testcontainers for full-stack testing against a real PostgreSQL instance.
*   **API Tests**: MockMvc for HTTP endpoint validation.
*   **Performance Tests**: Guidance for tools like JMeter/Locust.

**Additional Features**
*   **Authentication & Authorization**: Spring Security with JWT (JSON Web Tokens) for secure API access and role-based permissions (`ROLE_USER`, `ROLE_ADMIN`).
*   **Logging & Monitoring**: SLF4J/Logback (Spring Boot defaults) with structured logging; Spring Boot Actuator for health checks and metrics (Prometheus endpoint exposed).
*   **Error Handling**: Global exception handling with consistent JSON error responses.
*   **Caching Layer**: Spring Cache with Caffeine for improved performance (e.g., caching user profiles, room lists).
*   **Rate Limiting**: Custom interceptor using Bucket4j to prevent abuse and ensure fair resource usage.

## Technologies Used

*   **Backend**: Java 17, Spring Boot 3.x
*   **Database**: PostgreSQL
*   **Build Tool**: Maven
*   **Containerization**: Docker, Docker Compose
*   **Authentication**: Spring Security, JWT
*   **Real-time**: Spring WebSockets (STOMP)
*   **Caching**: Spring Cache, Caffeine
*   **Rate Limiting**: Bucket4j (integrated via a custom interceptor)
*   **Database Migrations**: Flyway
*   **Testing**: JUnit 5, Mockito, Spring Boot Test, Testcontainers
*   **Logging**: SLF4J, Logback
*   **Frontend**: HTML, CSS, JavaScript, SockJS, STOMP.js

## Setup and Running

### Prerequisites

*   Java 17 JDK
*   Maven 3.x
*   Docker and Docker Compose
*   Git

### 1. Clone the repository

```bash
git clone https://github.com/your-username/chat-app.git
cd chat-app
```

### 2. Build the Spring Boot Application

```bash
mvn clean install -DskipTests
```
This will compile the Java code and package it into a JAR file in the `target/` directory.

### 3. Run with Docker Compose (Recommended)

Docker Compose will set up both the PostgreSQL database and the Spring Boot application.

```bash
docker-compose up --build
```

*   `--build`: Rebuilds the Docker images. Use this if you've made changes to the `Dockerfile` or your application code.
*   The application will be accessible at `http://localhost:8080`.
*   The PostgreSQL database will be accessible at `localhost:5432`.

**Environment Variables:**
The `docker-compose.yml` uses environment variables. You can override the defaults by creating a `.env` file in the project root:

```
DB_HOST=db
DB_PORT=5432
DB_NAME=chatdb
DB_USERNAME=chatuser
DB_PASSWORD=chatpass
JWT_SECRET=your_super_secret_jwt_key_that_is_at_least_256_bits_long
```
*(Make sure `JWT_SECRET` is strong and long in production!)*

### 4. Access the Application

Once `docker-compose up` is successful, open your browser:
*   **Frontend Client**: `http://localhost:8080` (for login/register) or `http://localhost:8080/chat.html` (for chat interface after login).
*   **Backend API**: `http://localhost:8080/api/v1/...` (refer to API Documentation).
*   **Actuator Endpoints (Monitoring)**: `http://localhost:8080/actuator`, `http://localhost:8080/actuator/health`, `http://localhost:8080/actuator/prometheus`.

### Initial Seed Data

The `V2__Add_seed_data.sql` migration script automatically populates the database with:
*   **Admin User**:
    *   Username: `adminuser`
    *   Email: `admin@alx.com`
    *   Password: `adminpass`
    *   Roles: `ROLE_ADMIN`, `ROLE_USER`
*   **Test User 1**:
    *   Username: `testuser1`
    *   Email: `test1@alx.com`
    *   Password: `testpass`
    *   Role: `ROLE_USER`
*   **Test User 2**:
    *   Username: `testuser2`
    *   Email: `test2@alx.com`
    *   Password: `testpass`
    *   Role: `ROLE_USER`
*   Some initial public and private chat rooms with members and messages.

## Testing

### Running Tests

```bash
mvn clean test
```

*   **Unit Tests**: Located in `src/test/java/.../controller`, `.../service`, `.../repository`.
*   **Integration Tests**: Located in `src/test/java/.../integration`. These use Testcontainers to spin up a real PostgreSQL database for robust testing.

**Code Coverage**: The `pom.xml` includes the JaCoCo plugin to report code coverage. The build is configured to fail if line coverage drops below 80%.
You can view the coverage report after running `mvn clean install` (or `mvn jacoco:report`) at `target/site/jacoco/index.html`.

### Performance Testing

While specific JMeter/Locust scripts are not included in this README, here's how you would approach performance testing:
1.  **Identify Critical Paths**: User registration, login, sending messages, fetching message history, fetching room lists.
2.  **Tools**:
    *   **JMeter**: Excellent for API and WebSocket load testing. You would create test plans to simulate multiple users concurrently logging in, joining rooms, sending messages, and fetching history.
    *   **Locust**: Python-based, allows writing load test scripts in Python. Good for simulating user behavior.
3.  **Metrics**: Monitor response times, throughput, error rates, CPU/memory usage of the backend and database.
4.  **Scenarios**:
    *   Login storm: Many users attempting to log in simultaneously.
    *   Concurrent messaging: Many users in the same room sending messages.
    *   Room creation/joining: Many users creating/joining rooms.
    *   Long-running connections: Many users maintaining WebSocket connections.

---

#### `API_DOCUMENTATION.md`

Detailed API endpoints and request/response examples. For a true enterprise app, this would be generated using OpenAPI/Swagger.