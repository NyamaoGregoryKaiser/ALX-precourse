# TaskFlow: Comprehensive Task Management System

TaskFlow is a full-stack, enterprise-grade task management system designed to help teams organize, track, and manage their projects and tasks efficiently. It features a robust backend (Node.js/Express), a dynamic frontend (React), and a reliable PostgreSQL database with Redis for caching.

This project focuses on demonstrating a comprehensive implementation covering core application logic, database management, configuration, testing, and various advanced features like authentication, logging, caching, and rate limiting, in line with ALX Software Engineering principles.

## Features

### Core Application
*   **User Management**: Register, Login, User Profiles.
*   **Project Management**: Create, Read, Update, Delete projects. Projects have an owner and status.
*   **Task Management**: Create, Read, Update, Delete tasks. Tasks belong to a project, can be assigned to users, have status, priority, and due dates.
*   **API Endpoints**: Full CRUD operations exposed via RESTful API.
*   **Frontend UI**: Responsive React interface for managing users, projects, and tasks.

### Database Layer
*   **PostgreSQL**: Robust relational database.
*   **Prisma ORM**: Type-safe database access, schema definition, migrations.
*   **Schema**: Users, Projects, Tasks with proper relationships.
*   **Migration Scripts**: Managed by Prisma.
*   **Seed Data**: Initial data for quick setup and testing.
*   **Query Optimization**: Handled by Prisma's efficient query engine and careful service layer design.

### Configuration & Setup
*   `package.json` for both client and server with all dependencies.
*   `.env` for environment-specific configurations.
*   **Docker**: Containerization using `Dockerfile` for client and server, `docker-compose.yml` for orchestrating services (PostgreSQL, Redis, Server, Client).

### Additional Features
*   **Authentication & Authorization**: JWT-based authentication. Role-based authorization (Admin/Member) for resource access.
*   **Logging & Monitoring**: Winston for server-side logging. (Basic integration, can be extended with tools like Prometheus/Grafana).
*   **Error Handling**: Centralized middleware for consistent API error responses.
*   **Caching Layer**: Redis integrated with a custom middleware to cache frequently accessed GET requests.
*   **Rate Limiting**: `express-rate-limit` middleware to protect API endpoints from abuse.

### Testing & Quality
*   **Unit Tests**: Jest for isolated testing of service logic and utility functions.
*   **Integration Tests**: Supertest for API endpoint testing, ensuring modules work together.
*   **API Tests**: Covered by Integration tests, ensuring endpoints respond correctly.
*   **Performance Tests**: Mentioned in documentation, a sample `k6` script could be added. (Not fully implemented due to scope, but infrastructure is ready).

### Documentation
*   This comprehensive `README.md`.
*   API Documentation (details below).
*   Architecture Documentation (high-level overview below).
*   Deployment Guide (Docker and CI/CD sections).

## Technologies Used

*   **Backend**: Node.js, Express.js, TypeScript
*   **Frontend**: React.js, TypeScript, Tailwind CSS
*   **Database**: PostgreSQL
*   **ORM**: Prisma
*   **Caching**: Redis
*   **Authentication**: JWT, bcryptjs
*   **Logging**: Winston
*   **Testing**: Jest, Supertest, React Testing Library
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions

## Architecture

The system follows a typical 3-tier architecture:

1.  **Client Layer (Frontend)**: A React application providing the user interface. It communicates with the backend API via HTTP requests.
2.  **Application Layer (Backend)**: A Node.js/Express.js API server responsible for:
    *   Handling HTTP requests and routing.
    *   Implementing business logic (user, project, task management).
    *   Interacting with the database via Prisma.
    *   Applying cross-cutting concerns: Authentication, Authorization, Logging, Error Handling, Caching, Rate Limiting.
3.  **Data Layer**:
    *   **PostgreSQL**: The primary relational database for persistent storage of users, projects, and tasks.
    *   **Redis**: An in-memory data store used for caching API responses and potentially session management.

**Monorepo Structure**: The `server` and `client` applications reside in a single repository, simplifying development and deployment.

```
task-management-system/
├── client/         # React Frontend
├── server/         # Node.js/Express Backend
├── .github/        # CI/CD Workflows
└── docker-compose.yml # Orchestration
```

## Setup and Installation

### Prerequisites

*   Node.js (v20 or higher)
*   npm (v10 or higher)
*   Docker and Docker Compose (v3.8 or higher)
*   Git

### Local Development Setup (Using Docker Compose)

This is the recommended way to run the entire application locally, including PostgreSQL and Redis.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/task-management-system.git
    cd task-management-system
    ```

2.  **Configure Environment Variables**:
    *   Create `.env` files for both `server` and `client` directories by copying their `.env.example` counterparts.
    *   `server/.env`:
        ```dotenv
        NODE_ENV=development
        PORT=5000
        DATABASE_URL="postgresql://user:password@db:5432/taskdb?schema=public" # 'db' is the service name in docker-compose
        JWT_SECRET="supersecretjwtkey"
        JWT_EXPIRES_IN="1h"
        REDIS_URL="redis://redis:6379" # 'redis' is the service name in docker-compose
        CACHE_TTL_USERS=300
        CACHE_TTL_PROJECTS=60
        CACHE_TTL_TASKS=30
        CLIENT_URL=http://localhost:3000
        ```
    *   `client/.env`:
        ```dotenv
        REACT_APP_API_BASE_URL=http://localhost:5000/api/v1
        ```

3.  **Build and Run with Docker Compose**:
    Navigate to the root of the project directory and run:
    ```bash
    docker-compose up --build
    ```
    This command will:
    *   Build Docker images for `server` and `client`.
    *   Start PostgreSQL (`db`) and Redis (`redis`) services.
    *   Run Prisma migrations and seed the database (only if it's a fresh DB).
    *   Start the Node.js backend (`server`) on port 5000.
    *   Start the React frontend (`client`) on port 3000 (proxied via Nginx).

4.  **Access the Application**:
    *   Frontend: `http://localhost:3000`
    *   Backend API: `http://localhost:5000/api/v1`

    You can log in with the seeded users:
    *   **Admin**: `admin@example.com` / `admin123`
    *   **Member**: `member1@example.com` / `member123`
    *   **Member**: `member2@example.com` / `member123`

### Manual Development Setup (Without Docker for App Services)

You can run the `db` and `redis` services with Docker, and `server`/`client` locally for faster development feedback.

1.  **Start Database and Redis via Docker Compose**:
    ```bash
    docker-compose up db redis
    ```
    Ensure these services are healthy before proceeding.

2.  **Server Setup**:
    ```bash
    cd server
    npm install
    npx prisma migrate dev --name init # Apply migrations
    npm run prisma:seed # Seed database with initial data
    npm run dev # Start server with hot-reloading
    ```
    The server will run on `http://localhost:5000`.

3.  **Client Setup**:
    ```bash
    cd client
    npm install
    npm start # Start React development server
    ```
    The client will run on `http://localhost:3000`.

## API Documentation

The API follows a RESTful design. All endpoints are prefixed with `/api/v1`.

### Authentication

*   `POST /api/v1/auth/register`
    *   **Body**: `{ email, password, firstName, lastName }`
    *   **Response**: `{ message, userId, email }` (201)
*   `POST /api/v1/auth/login`
    *   **Body**: `{ email, password }`
    *   **Response**: `{ message, user: { id, email, role, firstName, lastName }, token }` (200)
*   `GET /api/v1/auth/me`
    *   **Headers**: `Authorization: Bearer <token>`
    *   **Response**: `{ user: { id, email, role, firstName, lastName } }` (200)

### Users (Admin-only for `GET /`, Owner or Admin for `GET /:id`, `PATCH /:id`, `DELETE /:id`)

*   `GET /api/v1/users`
    *   **Headers**: `Authorization: Bearer <admin_token>`
    *   **Response**: `User[]` (200)
*   `GET /api/v1/users/:id`
    *   **Headers**: `Authorization: Bearer <token>`
    *   **Response**: `User` (200)
*   `PATCH /api/v1/users/:id`
    *   **Headers**: `Authorization: Bearer <token>`
    *   **Body**: `{ firstName?, lastName?, email?, role? (Admin only) }`
    *   **Response**: `{ message, user }` (200)
*   `DELETE /api/v1/users/:id`
    *   **Headers**: `Authorization: Bearer <token>`
    *   **Response**: (204)

### Projects (Authenticated users)

*   `POST /api/v1/projects`
    *   **Headers**: `Authorization: Bearer <token>`
    *   **Body**: `{ name, description? }`
    *   **Response**: `{ message, project }` (201)
*   `GET /api/v1/projects`
    *   **Headers**: `Authorization: Bearer <token>`
    *   **Query Params**: `ownerId?`, `status?`
    *   **Response**: `Project[]` (200)
*   `GET /api/v1/projects/:id`
    *   **Headers**: `Authorization: Bearer <token>`
    *   **Response**: `Project` with nested `owner` and `tasks` (200)
*   `PATCH /api/v1/projects/:id` (Owner or Admin only)
    *   **Headers**: `Authorization: Bearer <token>`
    *   **Body**: `{ name?, description?, status?, ownerId? (Admin only) }`
    *   **Response**: `{ message, project }` (200)
*   `DELETE /api/v1/projects/:id` (Owner or Admin only)
    *   **Headers**: `Authorization: Bearer <token>`
    *   **Response**: (204)

### Tasks (Authenticated users)

*   `POST /api/v1/tasks`
    *   **Headers**: `Authorization: Bearer <token>`
    *   **Body**: `{ title, description?, projectId, assigneeId?, dueDate?, priority?, status? }`
    *   **Response**: `{ message, task }` (201)
*   `GET /api/v1/tasks`
    *   **Headers**: `Authorization: Bearer <token>`
    *   **Query Params**: `projectId?`, `assigneeId?`, `status?`, `priority?`
    *   **Response**: `Task[]` (200)
*   `GET /api/v1/tasks/:id`
    *   **Headers**: `Authorization: Bearer <token>`
    *   **Response**: `Task` with nested `project`, `assignee`, `reporter` (200)
*   `PATCH /api/v1/tasks/:id` (Reporter, Assignee, Project Owner or Admin only)
    *   **Headers**: `Authorization: Bearer <token>`
    *   **Body**: `{ title?, description?, status?, priority?, assigneeId?, dueDate? }`
    *   **Response**: `{ message, task }` (200)
*   `DELETE /api/v1/tasks/:id` (Reporter, Project Owner or Admin only)
    *   **Headers**: `Authorization: Bearer <token>`
    *   **Response**: (204)

## Testing

### Running Server Tests

From the `server` directory:

```bash
cd server
npm test
```
This will run unit and integration tests using Jest. Coverage reports will be generated.
**Note**: The `server/src/tests/setup.ts` script ensures a clean test database and seeds it before tests run. Make sure your `server/.env` `DATABASE_URL` points to a separate database for testing (e.g., `taskdb_test`) to avoid data loss.

### Running Client Tests

From the `client` directory:

```bash
cd client
npm test
```
This will run React component tests using Jest and React Testing Library.

### Performance Testing (Example)

For performance testing, tools like `k6` can be used. A basic `k6` script for testing API endpoint load:

```javascript
// k6_load_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Simulate 20 users for 30 seconds
    { duration: '1m', target: 50 },  // Ramp up to 50 users for 1 minute
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
};

const BASE_URL = 'http://localhost:5000/api/v1'; // Or your deployed API URL

export default function () {
  // Simulate user login to get a token
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'member1@example.com',
    password: 'member123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(loginRes, { 'login status is 200': (r) => r.status === 200 });
  const token = loginRes.json('token');

  if (token) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // Simulate fetching projects
    const projectsRes = http.get(`${BASE_URL}/projects`, { headers });
    check(projectsRes, { 'get projects status is 200': (r) => r.status === 200 });

    // Simulate fetching tasks (e.g., assigned to the logged-in user)
    const tasksRes = http.get(`${BASE_URL}/tasks?assigneeId=member1Id`, { headers }); // Replace with actual member1Id
    check(tasksRes, { 'get tasks status is 200': (r) => r.status === 200 });

    sleep(1); // Think time
  } else {
    console.error('Failed to get token, skipping authenticated requests.');
    sleep(1);
  }
}
```
To run this script:
1.  Install k6: `brew install k6` (macOS) or refer to k6 documentation.
2.  Save the script as `k6_load_test.js` in the root directory.
3.  Replace `member1Id` with an actual ID from your seeded data.
4.  Run: `k6 run k6_load_test.js`

## Deployment Guide (CI/CD with GitHub Actions)

The `.github/workflows/ci-cd.yml` file defines a basic CI/CD pipeline using GitHub Actions.

### CI (Continuous Integration)

1.  **`build-and-test-server` job**:
    *   Triggers on `push` and `pull_request` to `main`.
    *   Sets up a PostgreSQL and Redis service within the GitHub Actions runner.
    *   Installs Node.js dependencies for the `server`.
    *   Runs Prisma migrations and seeds the **test database**.
    *   Builds the TypeScript server code.
    *   Executes all server unit and integration tests (`npm test`).

2.  **`build-and-test-client` job**:
    *   Triggers on `push` and `pull_request` to `main`.
    *   Installs Node.js dependencies for the `client`.
    *   Builds the React application.
    *   Executes all client tests (`npm test`).

### CD (Continuous Deployment - Example)

The `deploy` job in `ci-cd.yml` is commented out but provides a blueprint for a continuous deployment flow:

1.  **Conditions**: Runs only on `push` to the `main` branch, and only after `build-and-test-server` and `build-and-test-client` jobs succeed.
2.  **Docker Hub Login**: Logs into Docker Hub using secrets for `DOCKER_USERNAME` and `DOCKER_PASSWORD`.
3.  **Build & Push Docker Images**: Builds the production-ready Docker images for both `server` and `client` and pushes them to Docker Hub. The client build uses a `PROD_API_BASE_URL` secret for the production API endpoint.
4.  **Deploy to Server (SSH)**: Connects to a remote server via SSH (using `SSH_HOST`, `SSH_USERNAME`, `SSH_KEY` secrets). On the remote server, it pulls the latest Docker images and restarts the Docker Compose services, effectively deploying the new versions.

**To enable the CD pipeline**:
1.  Uncomment the `deploy` job in `.github/workflows/ci-cd.yml`.
2.  Configure GitHub Secrets in your repository settings:
    *   `DOCKER_USERNAME`
    *   `DOCKER_PASSWORD`
    *   `PROD_API_BASE_URL` (e.g., `http://your-production-server-ip:5000/api/v1`)
    *   `SSH_HOST`
    *   `SSH_USERNAME`
    *   `SSH_KEY` (Your private SSH key for accessing the deployment server)
3.  Ensure your deployment server has Docker and Docker Compose installed and a `docker-compose.yml` file similar to the one in this repository, adjusted for production environments (e.g., using official Docker images for client/server, persistent volumes).

## Development Guidelines and ALX Focus

### Programming Logic & Modularity
*   **Clear Separation of Concerns**: The backend is organized into modules (auth, user, project, task), each with its own routes, controllers, and services. Middleware handles cross-cutting concerns.
*   **Service Layer**: Business logic is encapsulated in service files, keeping controllers lean.
*   **DRY (Don't Repeat Yourself)**: Utility functions (e.g., `jwt.ts`, `logger.ts`) and common middleware are used across the application.

### Algorithm Design
*   **Efficient Data Access**: Prisma provides optimized queries. The service layer focuses on composing these queries efficiently (e.g., `findMany` with `where` clauses for filtering, `include` for eager loading related data).
*   **Search and Filter**: API endpoints support filtering projects and tasks by various criteria (owner, assignee, status, priority).

### Technical Problem Solving
*   **Authentication & Authorization**: Solved using JWTs and role-based access control, protecting sensitive routes and actions.
*   **Error Handling**: A custom `CustomError` class and a centralized `errorHandler` middleware provide consistent and informative error responses.
*   **Performance Optimization**:
    *   **Caching**: Redis is used to cache GET requests for `users`, `projects`, and `tasks` lists, reducing database load for frequently accessed data. Cache invalidation is triggered on data modifications.
    *   **Rate Limiting**: Protects against brute-force attacks and API abuse, ensuring service availability.
*   **Concurrency**: Although not explicitly solved with complex concurrent algorithms, the stateless nature of JWTs and Express handles concurrent requests efficiently. Rate limiting indirectly manages load.
*   **Scalability**: Dockerization makes it easy to scale different services independently (e.g., run multiple server instances behind a load balancer). Redis caching reduces database bottlenecks.
*   **Maintainability**: TypeScript enhances code quality with static typing. Consistent code style, clear naming conventions, and modular structure contribute to long-term maintainability.

## Future Enhancements

*   **Real-time Updates**: Integrate WebSockets (e.g., Socket.IO) for real-time task and project updates.
*   **User Roles & Permissions**: More granular role management (e.g., Project Manager, Viewer).
*   **Notifications**: Email/in-app notifications for task assignments, due dates.
*   **Search Functionality**: Advanced full-text search across projects and tasks.
*   **File Uploads**: Attachments to tasks or projects.
*   **Advanced UI/UX**: Drag-and-drop for task reordering, Gantt charts for project visualization.
*   **Pagination & Sorting**: Implement comprehensive pagination and sorting for lists.
*   **Input Validation**: Implement Joi/Zod for robust API input validation on the server.
*   **More comprehensive performance testing**: Integrate with a dedicated performance testing tool like `k6` more deeply.
*   **Monitoring & Alerting**: Integrate with tools like Prometheus/Grafana for server metrics and Sentry for error tracking.

---
**Disclaimer**: This is a comprehensive blueprint. Some sections like "Performance Tests" are described conceptually or with basic examples rather than full-blown, exhaustive implementations, due to the sheer size of such a request. The code aims to demonstrate the structure and integration of all requested features in a production-ready manner.