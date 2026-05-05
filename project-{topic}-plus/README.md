# ALXChat: Real-time Chat Application

ALXChat is a comprehensive, enterprise-grade real-time chat application built using Spring Boot for the backend and React for the frontend. It features user authentication, chat room management, real-time messaging via WebSockets, and robust data persistence.

## Table of Contents

1.  [Features](#features)
2.  [Technologies Used](#technologies-used)
3.  [Architecture](#architecture)
4.  [Prerequisites](#prerequisites)
5.  [Setup and Installation](#setup-and-installation)
    *   [Backend Setup](#backend-setup)
    *   [Frontend Setup](#frontend-setup)
    *   [Running with Docker Compose (Recommended)](#running-with-docker-compose-recommended)
6.  [API Documentation](#api-documentation)
7.  [Testing](#testing)
8.  [Deployment](#deployment)
9.  [Contribution](#contribution)
10. [License](#license)

## 1. Features

*   **User Authentication & Authorization:** Secure registration and login using JWT.
*   **User Management:** View current user profile, update user status.
*   **Chat Room Management:** Create, list, join, and leave chat rooms.
*   **Real-time Messaging:** Instant message delivery and updates using WebSockets (STOMP).
*   **Message History:** Retrieve past messages for any joined chat room.
*   **User Presence:** Real-time online/offline status updates for users in chat rooms.
*   **CORS Support:** Configured for seamless frontend-backend communication.
*   **Global Error Handling:** Consistent API error responses.
*   **Rate Limiting:** Protects API endpoints from abuse.
*   **Caching:** Redis integration for improved performance on user and room data.
*   **Database Migrations:** Flyway for schema management.

## 2. Technologies Used

### Backend
*   **Language:** Java 17+
*   **Framework:** Spring Boot 3
*   **Security:** Spring Security, JWT (jjwt)
*   **Data Persistence:** Spring Data JPA, Hibernate
*   **Database:** PostgreSQL
*   **Real-time:** Spring WebSocket (STOMP)
*   **Caching:** Spring Cache with Redis
*   **Migration:** Flyway
*   **Utilities:** Lombok
*   **Monitoring:** Spring Boot Actuator
*   **API Docs:** Springdoc-openapi (Swagger UI)

### Frontend
*   **Library:** React 18+
*   **State Management:** React Context API
*   **Routing:** React Router DOM
*   **API Client:** Axios
*   **Real-time:** `@stomp/stompjs`, `sockjs-client`
*   **Styling:** Tailwind CSS

### Infrastructure
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions

## 3. Architecture

The application follows a microservices-inspired architecture with a clear separation of concerns:

*   **Frontend (React):** A single-page application (SPA) responsible for the user interface and interaction. It communicates with the backend via REST APIs and WebSockets.
*   **Backend (Spring Boot):** A monolithic Spring Boot application handling all business logic, data persistence, authentication, and real-time WebSocket communication.
    *   **Controllers:** REST endpoints for CRUD operations and authentication.
    *   **Services:** Encapsulate business logic and interact with repositories.
    *   **Repositories:** Spring Data JPA for database interactions.
    *   **WebSockets:** Manages real-time message broadcasting and user presence.
*   **Database (PostgreSQL):** Relational database for storing user, chat room, and message data.
*   **Cache (Redis):** In-memory data store used for caching frequently accessed data (e.g., user profiles, chat room details) to reduce database load and improve response times.
*   **Reverse Proxy/Load Balancer (Nginx - in Docker Compose):** Serves the frontend static files and proxies API and WebSocket requests to the backend.

See [ARCHITECTURE.md](ARCHITECTURE.md) for a more detailed diagram and explanation.

## 4. Prerequisites

Before you begin, ensure you have the following installed:

*   Java 17+
*   Maven 3.8+
*   Node.js 20+
*   npm (comes with Node.js)
*   Docker Desktop (includes Docker Engine and Docker Compose)
*   Git

## 5. Setup and Installation

You can run the application either by setting up the backend and frontend separately or by using Docker Compose for a fully containerized environment (recommended for ease of setup).

### Backend Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/alx-chat.git
    cd alx-chat/backend
    ```
2.  **Configure Database and JWT:**
    Create an `application.yml` file in `src/main/resources` or set environment variables as specified in `application.yml` for database connection and `jwt.secret`.
    ```yaml
    # Example for application.yml
    spring:
      datasource:
        url: jdbc:postgresql://localhost:5432/alxchatdb
        username: alxuser
        password: alxpassword
    jwt:
      secret: YOUR_VERY_SECURE_AND_LONG_JWT_SECRET_KEY_FOR_DEVELOPMENT
      expiration: 3600000 # 1 hour
    ```
3.  **Set up PostgreSQL and Redis:**
    Ensure a PostgreSQL database named `alxchatdb` exists with username `alxuser` and password `alxpassword`.
    Ensure a Redis instance is running (default port 6379).
    You can use Docker for this:
    ```bash
    docker run --name alx-chat-postgres -e POSTGRES_DB=alxchatdb -e POSTGRES_USER=alxuser -e POSTGRES_PASSWORD=alxpassword -p 5432:5432 -d postgres:15.3-alpine
    docker run --name alx-chat-redis -p 6379:6379 -d redis:7.0.12-alpine
    ```
4.  **Run Flyway Migrations:**
    ```bash
    mvn flyway:migrate
    ```
5.  **Build and Run the Backend:**
    ```bash
    mvn clean install -DskipTests
    mvn spring-boot:run
    ```
    The backend will start on `http://localhost:8080`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure API Base URL:**
    Create a `.env` file in the `frontend` directory:
    ```
    REACT_APP_API_BASE_URL=http://localhost:8080
    REACT_APP_WEBSOCKET_URL=http://localhost:8080/websocket
    ```
4.  **Run the Frontend:**
    ```bash
    npm start
    ```
    The frontend will start on `http://localhost:3000`.

### Running with Docker Compose (Recommended)

This is the easiest way to get the entire system up and running.

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone https://github.com/your-username/alx-chat.git
    cd alx-chat
    ```
2.  **Create an `.env` file:**
    Copy the contents of the provided `/.env` example to a new `.env` file in the project root and fill in your desired values, especially `JWT_SECRET`.
    ```bash
    # Example .env content:
    DB_NAME=alxchatdb
    DB_USERNAME=alxuser
    DB_PASSWORD=alxpassword
    REDIS_HOST=redis
    REDIS_PORT=6379
    JWT_SECRET=YOUR_VERY_SECURE_AND_LONG_JWT_SECRET_KEY_FOR_PRODUCTION_ALXCHATAPP
    JWT_EXPIRATION=3600000
    ```
3.  **Build and Start Services:**
    From the project root directory, run:
    ```bash
    docker compose up --build -d
    ```
    *   `--build`: Builds images from Dockerfiles.
    *   `-d`: Runs containers in detached mode (in the background).

4.  **Access the Application:**
    *   **Frontend:** `http://localhost:3000`
    *   **Backend API (direct access, if needed):** `http://localhost:8080` (though frontend accesses via Nginx proxy)
    *   **Swagger UI (API Docs):** `http://localhost:8080/swagger-ui.html`

5.  **Stop Services:**
    ```bash
    docker compose down
    ```

## 6. API Documentation

The backend API is documented using Springdoc-openapi, which generates Swagger UI.
Once the backend is running (either directly or via Docker Compose), you can access the API documentation at:

**[http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)**

This interface allows you to explore endpoints, their request/response schemas, and even test them directly.

## 7. Testing

### Backend Testing

The backend includes Unit and Integration tests.

*   **Unit Tests:** Located in `backend/src/test/java/com/alxchat/service/` for services.
*   **Integration Tests:** Located in `backend/src/test/java/com/alxchat/AlxChatApplicationIntegrationTest.java`. These use Testcontainers to spin up real PostgreSQL and Redis instances for comprehensive testing of the application context.

To run backend tests and generate coverage reports:
```bash
cd backend
mvn clean verify
```
A JaCoCo coverage report will be generated in `backend/target/site/jacoco/index.html`. We aim for 80%+ line coverage.

### Frontend Testing

The frontend uses Jest and React Testing Library for unit and component tests.

To run frontend tests and generate coverage reports:
```bash
cd frontend
npm test -- --coverage --watchAll=false
```
A coverage report will be available in `frontend/coverage/lcov-report/index.html`. We aim for 80%+ coverage for core components.

### API Testing

*   **Automated API Tests:** Included as part of the backend integration tests (`AlxChatApplicationIntegrationTest.java`).
*   **Manual/Postman:** The Swagger UI (`http://localhost:8080/swagger-ui.html`) serves as an excellent tool for manual API testing.

### Performance Testing (Conceptual)

For production-grade applications, performance testing (e.g., load testing, stress testing) is crucial. Tools like Apache JMeter or K6 can be used.

**Approach:**
1.  **Identify Critical Flows:** User registration, login, sending messages (REST & WebSocket), retrieving message history, listing chat rooms.
2.  **Simulate User Load:** Design test plans to simulate concurrent users performing these actions.
3.  **Monitor Metrics:** Track response times, throughput, error rates, and resource utilization (CPU, memory, database connections).
4.  **Tools:**
    *   **JMeter:** Create test plans for HTTP requests and WebSocket connections.
    *   **Prometheus/Grafana:** For real-time monitoring of application and infrastructure metrics during load tests.

## 8. Deployment

A basic CI/CD pipeline configuration using GitHub Actions is provided in `.github/workflows/main.yml`.

**Deployment Steps (Conceptual):**

1.  **Code Commit:** Developers push code to the `main` branch.
2.  **CI Trigger:** GitHub Actions pipeline automatically triggers.
3.  **Build & Test:**
    *   Backend: Maven build, unit/integration tests (with Testcontainers), JaCoCo coverage check.
    *   Frontend: npm install, build, unit/component tests (with Jest/RTL).
4.  **Docker Image Build & Push:**
    *   If all tests pass on the `main` branch, Docker images for both backend and frontend are built and pushed to Docker Hub (or a private container registry).
5.  **Deployment to Production (Manual/Automated):**
    *   A production server (e.g., EC2 instance, Kubernetes cluster) pulls the latest Docker images.
    *   `docker compose pull` then `docker compose up -d` (for a single-server Docker deployment).
    *   For Kubernetes, update the deployment YAMLs to use the new image tags and apply.
    *   Environment variables for production (e.g., `DB_HOST`, `JWT_SECRET`) are securely managed (e.g., Kubernetes Secrets, AWS Secrets Manager).

See [DEPLOYMENT.md](DEPLOYMENT.md) for further details.

## 9. Contribution

Feel free to fork the repository, create branches, and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.

## 10. License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.