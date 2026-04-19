# Enterprise-Grade Task Management System

This is a comprehensive, full-stack task management system built with modern web technologies, designed for scalability, security, and maintainability. It includes a robust Node.js/Express backend, a dynamic React frontend, a PostgreSQL database, and is containerized with Docker, complete with CI/CD configurations.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Technologies Used](#technologies-used)
4.  [Setup Instructions](#setup-instructions)
    *   [Prerequisites](#prerequisites)
    *   [Local Setup with Docker Compose](#local-setup-with-docker-compose)
    *   [Manual Backend Setup (without Docker)](#manual-backend-setup-without-docker)
    *   [Manual Frontend Setup (without Docker)](#manual-frontend-setup-without-docker)
5.  [API Documentation](#api-documentation)
6.  [Testing](#testing)
7.  [CI/CD](#ci/cd)
8.  [Deployment Guide](#deployment-guide)
9.  [Future Enhancements](#future-enhancements)
10. [License](#license)

## 1. Features

**Core Functionality:**

*   **User Management:** Register, Login, User Profiles.
*   **Project Management:** Create, Read, Update, Delete projects. Users can own multiple projects.
*   **Task Management:** Create, Read, Update, Delete tasks within projects. Assign tasks to users, set status, priority, and due dates.
*   **Relationships:** Tasks belong to Projects, Projects are owned by Users, Tasks can be assigned to Users and created by Users.

**Enterprise-Grade Features:**

*   **Authentication & Authorization:** JWT-based secure authentication, role-based access control (basic: `user`, `admin`), ownership checks for projects/tasks.
*   **Data Validation:** Robust input validation on both frontend and backend.
*   **Error Handling:** Centralized, structured error handling middleware.
*   **Logging & Monitoring:** Winston-powered logging for request and error tracking.
*   **Caching:** Redis integration for frequently accessed data (e.g., project lists).
*   **Rate Limiting:** Protects API from abuse and brute-force attacks.
*   **Database Migrations & Seeding:** Managed schema evolution and initial data population with Sequelize CLI.
*   **Containerization:** Docker for consistent development and deployment environments.
*   **CI/CD:** GitHub Actions workflow for automated testing and deployment.
*   **Comprehensive Testing:** Unit, Integration, and API tests to ensure code quality and functionality.
*   **Query Optimization:** Database indexing and efficient ORM queries for performance.

## 2. Architecture

The system follows a classic **Client-Server architecture** with a **RESTful API**.

```
+----------------+      +---------------------+      +---------------+
|    Frontend    |<---->|   Backend (Node.js) |<---->|   PostgreSQL  |
|   (React.js)   |      |      (Express)      |      |   (Database)  |
+----------------+      +---------------------+      +---------------+
       ^                        |
       |                        |
       |                  +------------+
       |                  |   Redis    |
       |                  | (Caching)  |
       |                  +------------+
       |
+---------------------+
|      Client         |
| (Browser/Mobile App)|
+---------------------+
```

*   **Frontend (React.js):** A single-page application (SPA) providing the user interface. It communicates with the backend via RESTful API calls.
*   **Backend (Node.js/Express):** Handles business logic, data processing, authentication, authorization, and interacts with the database and caching layer. Exposes a RESTful API.
*   **PostgreSQL:** The primary relational database for persistent storage of users, projects, and tasks.
*   **Redis:** An in-memory data store used for caching API responses, reducing database load, and improving response times for common queries.

**Backend Structure:**

*   `config/`: Environment-specific configurations (database, JWT, logger, Redis).
*   `models/`: Sequelize ORM definitions for database tables (User, Project, Task) and their relationships.
*   `services/`: Encapsulates business logic, interacting with models. This layer is responsible for data manipulation and validation beyond basic model constraints.
*   `controllers/`: Handle incoming HTTP requests, delegate to services, and send HTTP responses.
*   `routes/`: Defines API endpoints and maps them to controller functions.
*   `middleware/`: Global or route-specific functions for authentication, authorization, error handling, logging, caching, and rate limiting.
*   `utils/`: Helper functions like JWT token generation/verification and password hashing.

## 3. Technologies Used

**Backend:**

*   **Node.js**: JavaScript runtime.
*   **Express.js**: Web application framework for Node.js.
*   **PostgreSQL**: Relational database.
*   **Sequelize**: ORM (Object-Relational Mapper) for Node.js and PostgreSQL.
*   **JWT (jsonwebtoken)**: For stateless authentication.
*   **Bcrypt.js**: For password hashing.
*   **Winston**: For robust logging.
*   **Redis**: For caching.
*   **express-rate-limit**: For API rate limiting.
*   **Cors, Helmet, Compression**: Security and performance middleware.
*   **Dotenv**: For environment variable management.
*   **Joi (or built-in Sequelize validation)**: For input validation.
*   **Jest & Supertest**: For unit, integration, and API testing.

**Frontend:**

*   **React.js**: JavaScript library for building user interfaces.
*   **React Router DOM**: For client-side routing.
*   **Axios**: For making HTTP requests to the backend API.
*   **React Context API**: For global state management (e.g., authentication).
*   **Tailwind CSS (or similar)**: For styling (not explicitly implemented here, but good practice).
*   **Jest & React Testing Library**: For component and integration testing.

**DevOps & Tools:**

*   **Docker**: For containerization of all services.
*   **Docker Compose**: For orchestrating multi-container Docker applications.
*   **GitHub Actions**: For CI/CD.
*   **k6**: For performance testing.
*   **ESLint**: For code linting.
*   **Nodemon**: For development server auto-restarts.

## 4. Setup Instructions

### Prerequisites

Before you begin, ensure you have the following installed:

*   **Git**: For cloning the repository.
*   **Node.js** (v18 or higher) and **npm** (v8 or higher): For running the backend and frontend.
*   **Docker** and **Docker Compose**: For containerized setup.

### Local Setup with Docker Compose (Recommended)

This is the easiest way to get the entire system running locally.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-system.git
    cd task-management-system
    ```

2.  **Create environment files:**
    *   Copy `backend/.env.example` to `backend/.env`
    *   Copy `frontend/.env.example` to `frontend/.env.local`

    **`backend/.env` example:**
    ```
    NODE_ENV=development
    PORT=5000
    DB_HOST=db
    DB_PORT=5432
    DB_USER=admin
    DB_PASSWORD=adminpassword
    DB_NAME=task_manager_db
    JWT_SECRET=supersecurejwtsecretkey
    JWT_EXPIRES_IN=1d
    REDIS_HOST=redis
    REDIS_PORT=6379
    RATE_LIMIT_WINDOW_MS=60000
    RATE_LIMIT_MAX_REQUESTS=100
    FRONTEND_URL=http://localhost:3000
    ```
    **`frontend/.env.local` example:**
    ```
    REACT_APP_API_BASE_URL=http://localhost:5000/api
    ```
    *Note: For `DB_HOST` and `REDIS_HOST` in `backend/.env`, use the service names defined in `docker-compose.yml` (e.g., `db`, `redis`).*

3.  **Build and run the services:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build Docker images for the backend and frontend.
    *   Start PostgreSQL, Redis, Backend, and Frontend services in detached mode.
    *   Wait for PostgreSQL and Redis to be healthy before starting the backend.
    *   The `server.js` script in the backend will automatically run `sequelize.sync({ alter: true })` to apply migrations and create tables if they don't exist.

4.  **Run Database Migrations and Seeders (if not handled by `sequelize.sync` or for clean setup):**
    You can run these manually inside the backend container if needed:
    ```bash
    docker-compose exec backend npx sequelize-cli db:migrate
    docker-compose exec backend npx sequelize-cli db:seed:all
    ```
    *Note: The `server.js` setup attempts to handle migrations automatically on startup for development convenience. Seeding must be run explicitly.*

5.  **Access the application:**
    *   Frontend: `http://localhost:3000`
    *   Backend API: `http://localhost:5000/api`

### Manual Backend Setup (without Docker)

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create `.env` file:**
    Copy `.env.example` to `.env` and configure your PostgreSQL and Redis connections (e.g., `DB_HOST=localhost`, `REDIS_HOST=localhost` if they are running locally).

4.  **Start PostgreSQL and Redis manually:**
    Ensure you have a PostgreSQL server running (e.g., via `brew services start postgresql` on macOS, or a Docker container `docker run -p 5432:5432 --name task-db -e POSTGRES_DB=task_manager_db -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=adminpassword -d postgres:13-alpine`).
    Similarly, start a Redis server (`docker run -p 6379:6379 --name task-redis -d redis:6-alpine`).

5.  **Run database migrations and seeders:**
    ```bash
    npx sequelize-cli db:migrate
    npx sequelize-cli db:seed:all
    ```

6.  **Start the backend server:**
    ```bash
    npm run dev # for development with nodemon
    # or
    npm start # for production
    ```
    The backend API will be available at `http://localhost:5000/api`.

### Manual Frontend Setup (without Docker)

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create `.env.local` file:**
    Copy `.env.example` to `.env.local` and ensure `REACT_APP_API_BASE_URL` points to your backend (e.g., `http://localhost:5000/api`).

4.  **Start the frontend development server:**
    ```bash
    npm start
    ```
    The frontend application will be available at `http://localhost:3000`.

## 5. API Documentation

The backend API is designed as a RESTful service. Authentication is handled via JWT.

**Base URL:** `/api`

### Authentication

*   `POST /api/auth/register`
    *   **Body:** `{ username, email, password }`
    *   **Response:** `{ message: "User registered successfully", user: { id, username, email, role } }` (201 Created)
*   `POST /api/auth/login`
    *   **Body:** `{ email, password }`
    *   **Response:** `{ message: "Logged in successfully", token: "jwt_token", user: { id, username, email, role } }` (200 OK)
*   `GET /api/auth/me` (Protected)
    *   **Headers:** `Authorization: Bearer <jwt_token>`
    *   **Response:** `{ user: { id, username, email, role } }` (200 OK)

### User Management (Admin or Self-Management)

*   `GET /api/users` (Protected, Admin-only initially, could be extended)
    *   **Headers:** `Authorization: Bearer <jwt_token>`
    *   **Response:** `[{ id, username, email, role, ... }]` (200 OK)
*   `GET /api/users/:id` (Protected, Admin or self-access)
    *   **Headers:** `Authorization: Bearer <jwt_token>`
    *   **Response:** `{ id, username, email, role, ... }` (200 OK)
*   `PUT /api/users/:id` (Protected, Admin or self-update)
    *   **Headers:** `Authorization: Bearer <jwt_token>`
    *   **Body:** `{ username?, email?, password?, role?, profilePicture?, bio? }`
    *   **Response:** `{ message: "User updated successfully", user: { ... } }` (200 OK)
*   `DELETE /api/users/:id` (Protected, Admin or self-delete)
    *   **Headers:** `Authorization: Bearer <jwt_token>`
    *   **Response:** `{ message: "User deleted successfully" }` (200 OK)

### Project Management

*   `GET /api/projects` (Protected)
    *   **Headers:** `Authorization: Bearer <jwt_token>`
    *   **Query Params:** `status`, `ownerId` (optional filters)
    *   **Response:** `[{ id, name, description, ownerId, ... }]` (200 OK)
    *   *Caching*: Responses for this endpoint might be cached by Redis based on `userId` and query params.
*   `GET /api/projects/:id` (Protected, Owner or Admin access)
    *   **Headers:** `Authorization: Bearer <jwt_token>`
    *   **Response:** `{ id, name, description, ownerId, ... }` (200 OK)
    *   *Caching*: Individual project details might be cached.
*   `POST /api/projects` (Protected)
    *   **Headers:** `Authorization: Bearer <jwt_token>`
    *   **Body:** `{ name, description?, status?, startDate?, endDate? }` (ownerId is taken from token)
    *   **Response:** `{ message: "Project created successfully", project: { ... } }` (201 Created)
*   `PUT /api/projects/:id` (Protected, Owner or Admin access)
    *   **Headers:** `Authorization: Bearer <jwt_token>`
    *   **Body:** `{ name?, description?, status?, startDate?, endDate? }`
    *   **Response:** `{ message: "Project updated successfully", project: { ... } }` (200 OK)
*   `DELETE /api/projects/:id` (Protected, Owner or Admin access)
    *   **Headers:** `Authorization: Bearer <jwt_token>`
    *   **Response:** `{ message: "Project deleted successfully" }` (200 OK)

### Task Management

*   `GET /api/tasks` (Protected)
    *   **Headers:** `Authorization: Bearer <jwt_token>`
    *   **Query Params:** `projectId`, `assignedToId`, `status`, `priority`, `dueDate` (optional filters)
    *   **Response:** `[{ id, title, description, projectId, assignedToId, ... }]` (200 OK)
    *   *Caching*: Responses for this endpoint might be cached.
*   `GET /api/tasks/:id` (Protected, User involved in project or assigned to task, or Admin)
    *   **Headers:** `Authorization: Bearer <jwt_token>`
    *   **Response:** `{ id, title, description, projectId, assignedToId, ... }` (200 OK)
    *   *Caching*: Individual task details might be cached.
*   `POST /api/projects/:projectId/tasks` (Protected)
    *   **Headers:** `Authorization: Bearer <jwt_token>`
    *   **Body:** `{ title, description?, status?, priority?, dueDate?, assignedToId? }` (createdBy is taken from token)
    *   **Response:** `{ message: "Task created successfully", task: { ... } }` (201 Created)
*   `PUT /api/tasks/:id` (Protected, User involved in project or assigned to task, or Admin)
    *   **Headers:** `Authorization: Bearer <jwt_token>`
    *   **Body:** `{ title?, description?, status?, priority?, dueDate?, assignedToId? }`
    *   **Response:** `{ message: "Task updated successfully", task: { ... } }` (200 OK)
*   `DELETE /api/tasks/:id` (Protected, User involved in project or assigned to task, or Admin)
    *   **Headers:** `Authorization: Bearer <jwt_token>`
    *   **Response:** `{ message: "Task deleted successfully" }` (200 OK)

## 6. Testing

The project emphasizes quality through a comprehensive testing suite.

*   **Unit Tests:** Verify individual functions and components in isolation (e.g., `src/utils/jwt.js`, `src/utils/bcrypt.js`).
*   **Integration Tests:** Test the interaction between different modules (e.g., services interacting with models, database operations).
*   **API Tests:** Use `supertest` to simulate HTTP requests to API endpoints, covering authentication, CRUD operations, and error handling.
*   **Frontend Tests:** Use Jest and React Testing Library to test React components and their interactions.
*   **Performance Tests:** A basic `k6` script is provided to simulate user load and measure API response times and throughput.

**To run tests:**

*   **Backend Tests:**
    ```bash
    cd backend
    npm test
    ```
    This will spin up a separate test database (`test_db`) and Redis instance using `docker-compose.test.yml`, run migrations and seeders for the test environment, then execute all backend tests.
*   **Frontend Tests:**
    ```bash
    cd frontend
    npm test -- --coverage
    ```
*   **Performance Tests (requires k6 installed):**
    First, ensure your Docker Compose setup is running (`docker-compose up -d`).
    ```bash
    k6 run k6-performance-test.js
    ```

## 7. CI/CD

A GitHub Actions workflow (`.github/workflows/main.yml`) is configured to automate the build, test, and deployment process:

*   **On Push/Pull Request to `main` branch:**
    *   **Build & Test Job:**
        *   Checks out code.
        *   Sets up Node.js for both backend and frontend.
        *   Installs dependencies.
        *   Sets up a temporary PostgreSQL and Redis for backend testing.
        *   Runs database migrations and seeders for the test environment.
        *   Executes all backend unit, integration, and API tests.
        *   Executes all frontend tests.
        *   Uploads coverage reports as artifacts.
    *   **Deploy Job (only on `main` branch push, after tests pass):**
        *   Logs into Docker Hub.
        *   Builds and pushes Docker images for backend and frontend to Docker Hub.
        *   (Example) Connects via SSH to a deployment server and pulls the latest images, then restarts containers using `docker-compose`.
        *   **Note**: You'll need to set `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `SSH_HOST`, `SSH_USERNAME`, `SSH_KEY` as GitHub Secrets for the deploy step to work.

## 8. Deployment Guide

The application is designed for containerized deployment.

1.  **Container Registry:**
    Ensure you have a Docker Hub account (or another container registry like AWS ECR, GCP Container Registry) and are logged in. The CI/CD pipeline pushes images to `your_docker_username/task-manager-backend:latest` and `your_docker_username/task-manager-frontend:latest`. Update these paths in `.github/workflows/main.yml`.

2.  **Server Preparation:**
    *   Provision a Linux server (e.g., a DigitalOcean Droplet, AWS EC2 instance, or a VPS).
    *   Install Docker and Docker Compose on the server.
    *   Ensure necessary ports (e.g., 80/443 for frontend, 5000 for backend if directly exposed, 5432 for DB if local) are open in your firewall configuration.
    *   Clone the repository onto your server.

3.  **Environment Variables:**
    *   On your production server, create `backend/.env` and `frontend/.env.local` files.
    *   **Crucially**, configure `DB_HOST`, `REDIS_HOST`, and `FRONTEND_URL` correctly. If running `docker-compose` on a single server, `DB_HOST` will be `db` and `REDIS_HOST` will be `redis` (matching service names). If your database is external (e.g., AWS RDS), `DB_HOST` will be its public endpoint.
    *   Set `NODE_ENV=production`.
    *   Use strong, unique values for `JWT_SECRET` and database credentials.

4.  **Database Setup:**
    *   If using an external PostgreSQL database (recommended for production), connect to it and run migrations:
        ```bash
        docker-compose run backend npx sequelize-cli db:migrate
        # Or, if you have a Node.js environment on your server:
        # cd backend && npm install && npx sequelize-cli db:migrate
        ```
    *   If using the `db` service from `docker-compose.yml` locally on the server, the `sequelize.sync({ alter: true })` in `server.js` will handle initial schema creation, but dedicated migration runs are safer for controlled updates.

5.  **Deployment:**
    *   On your server, navigate to the project root:
        ```bash
        cd /path/to/your/app
        # Pull the latest images
        docker-compose pull
        # Start the services (with -d for detached mode)
        docker-compose up -d --remove-orphans
        # Clean up old images (optional)
        docker system prune -f
        ```
    *   Alternatively, the CI/CD pipeline can automate this step using SSH.

6.  **HTTPS (Highly Recommended):**
    For production, always use HTTPS. You can achieve this by:
    *   Setting up an Nginx reverse proxy in front of your frontend (and optionally backend) containers.
    *   Using Certbot to obtain and manage Let's Encrypt SSL certificates for Nginx.
    *   Cloud providers often offer managed load balancers (e.g., AWS ALB) with SSL termination.

## 9. Future Enhancements

*   **Advanced UI/UX:** More polished design, drag-and-drop for tasks, rich text editor for descriptions.
*   **Real-time Updates:** WebSocket integration (Socket.io) for live task/project updates across users.
*   **Notifications:** Email/in-app notifications for task assignments, due dates.
*   **Search & Filtering:** More advanced search capabilities and complex filters for tasks/projects.
*   **File Uploads:** Attachments to tasks or projects.
*   **Comments:** Commenting system for tasks.
*   **Teams/Organizations:** Group users into teams or organizations.
*   **Time Tracking:** Ability to log time spent on tasks.
*   **Integration with Third-Party Services:** Calendar integration (Google Calendar), version control (GitHub).
*   **Admin Dashboard:** Dedicated interface for managing users and system settings.
*   **Observability:** Integrate Prometheus/Grafana for comprehensive monitoring and alerting.
*   **Internationalization (i18n):** Support for multiple languages.
*   **GraphQL API:** Consider a GraphQL API for more flexible data fetching.

## 10. License

This project is open-sourced under the MIT License. See the `LICENSE` file for more details.