# Task Management System: Architecture Overview

This document outlines the architectural design of the Task Management System, focusing on its layered structure, components, and interactions.

## 1. High-Level Architecture

The system follows a typical **Client-Server Architecture** with a clear separation between the frontend and backend, communicating via a RESTful API. It leverages containerization for consistency across environments.

```
+----------------+                   +------------------+                   +---------------+
|    Frontend    |  (HTTP/HTTPS)     |      Backend     | (TCP/IP)           |   Database    |
| (React, Nginx) |------------------>| (Node.js/Express)|------------------->|  PostgreSQL   |
+----------------+                   +------------------+                   +---------------+
                                          |                                    ^
                                          | (TCP/IP)                           |
                                          +----------------------------------->+---------------+
                                          |                                    |    Cache      |
                                          |                                    |    (Redis)    |
                                          |                                    +---------------+
```

## 2. Backend Architecture (Node.js/Express/TypeScript)

The backend is structured to promote **separation of concerns**, maintainability, and scalability. It largely follows a **Layered Architecture** or **Onion Architecture** pattern, though simplified.

```
+-------------------+
|      Client       |
+---------+---------+
          |
          | HTTP/HTTPS (REST API)
          v
+-------------------+
|   Express App     |
| (app.ts, server.ts)|
+---------+---------+
          |
          | 1. Middleware Chain
          v (helmet, cors, logging, rate limiting, auth, cache, validation, error handling)
+-------------------+
|     Router (v1)   |
| (routes/v1/*.ts)  |
+---------+---------+
          |
          | 2. Controller Layer (request/response handling, input parsing)
          v
+-------------------+
|    Controllers    |
| (controllers/*.ts)|
+---------+---------+
          |
          | 3. Service Layer (business logic, orchestration)
          v
+-------------------+
|      Services     |
|  (services/*.ts)  |
+---------+---------+
          |
          | 4. Repository Layer (data access logic, TypeORM)
          v
+-------------------+
|    Repositories   |
| (repositories/*.ts)|
+---------+---------+
          |
          | 5. Entity Layer (ORM models, database schema definition)
          v
+-------------------+
|      Entities     |
|   (entities/*.ts) |
+---------+---------+
          |
          | Database interaction (TypeORM)
          v
+-------------------+   +-------------------+
|    PostgreSQL     |   |       Redis       |
|    (Data Source)  |   |    (Cache Store)  |
+-------------------+   +-------------------+
```

### Key Components & Their Responsibilities:

*   **`server.ts`**: The application's entry point. Initializes the database connection, cache, and starts the Express server. Handles graceful shutdown.
*   **`app.ts`**: Configures the Express application, applies global middleware (security, CORS, body parsing, logging, rate limiting), and mounts API routes.
*   **`config/`**: Contains environment-specific configurations (database, JWT, Redis, logging, etc.). Centralized for easy management.
*   **`middleware/`**:
    *   **Authentication (`auth.ts`):** JWT token verification, setting `req.user`.
    *   **Authorization (`auth.ts`):** Role-based access control.
    *   **Error Handling (`errorHandler.ts`):** Catches errors, formats them, and sends appropriate HTTP responses. Integrates `ApiError` for operational errors.
    *   **Logging (`logging.ts`):** Logs incoming requests and their responses.
    *   **Rate Limiting (`rateLimiter.ts`):** Protects routes from brute-force attacks and excessive requests.
    *   **Caching (`cache.ts`):** Middleware to cache API responses and clear cache on data mutations.
    *   **Validation (`validate.ts`):** Joi-based request body validation.
*   **`routes/v1/`**: Defines API routes for different resources (auth, users, projects, tasks). Each route file groups related endpoints.
*   **`controllers/`**: Handle incoming HTTP requests. They parse request bodies/parameters, call the appropriate service methods, and send HTTP responses. They should be thin and focus on HTTP concerns.
*   **`services/`**: Contain the core business logic. They orchestrate interactions between repositories and other services. They are responsible for implementing rules, validations (beyond basic input parsing), and complex operations. They should be agnostic of HTTP context.
*   **`repositories/`**: Abstract database interactions. They provide methods to perform CRUD operations on entities, interacting directly with TypeORM's `EntityManager` or `Repository`. They focus on data persistence.
*   **`entities/`**: Define the database schema using TypeORM decorators. They represent tables in the database and their relationships. Includes base entity for common fields like `id`, `createdAt`, `updatedAt`.
*   **`migrations/`**: Version-controlled scripts to evolve the database schema.
*   **`seeds/`**: Scripts to populate the database with initial or sample data.
*   **`utils/`**: Utility functions like `ApiError` for standardized error handling, `catchAsync` for wrapping async Express handlers, and JWT token generation.
*   **`subscribers/`**: TypeORM event subscribers for reacting to entity lifecycle events (e.g., auditing, logging changes).
*   **Database (PostgreSQL):** Primary data store for relational data. Configured via TypeORM `DataSource`.
*   **Cache (Redis):** Used for storing frequently accessed data or API responses to reduce database load and improve response times.

## 3. Frontend Architecture (React/TypeScript)

The frontend is a Single-Page Application (SPA) built with React, focusing on a **Component-Based Architecture**.

```
+-----------------------+
|        Browser        |
+-----------+-----------+
            | HTTP/HTTPS (serving static files, API requests)
            v
+-----------------------+
|      Nginx (Docker)   |
|   (Static File Server)|
+-----------+-----------+
            |
            | JavaScript, HTML, CSS (React Application)
            v
+-----------------------+
|      React App        |
|  (index.tsx, App.tsx) |
+-----------+-----------+
            |
            | 1. Routing (React Router DOM)
            v
+-----------------------+
|         Pages         |
|   (pages/*/*.tsx)     |
| (Login, Dashboard, Projects, Tasks, Admin)
+-----------+-----------+
            |
            | 2. Contexts (Global State Management - e.g., Auth)
            v
+-----------------------+
|       Components      |
|  (components/*/*.tsx) |
| (Navbar, Forms, Tables, Modals, Loading spinners)
+-----------+-----------+
            |
            | 3. API Services (Axios)
            v
+-----------------------+
|     Backend API       |
+-----------------------+
```

### Key Components & Their Responsibilities:

*   **`index.tsx`**: Entry point for the React application, renders the root `App` component.
*   **`App.tsx`**: Sets up the main application structure, including routing (`react-router-dom`), global providers (e.g., `AuthProvider`), and global UI elements (e.g., `Navbar`, `ToastContainer`).
*   **`contexts/AuthContext.tsx`**: Manages global authentication state (user info, token, login/logout functions). Uses `localStorage` for persistence.
*   **`components/`**: Reusable UI components (e.g., `Navbar`, `LoadingSpinner`, `ProjectForm`, `TaskForm`). They receive props and emit events.
*   **`pages/`**: Top-level components that represent different views or routes of the application (e.g., `Login`, `Dashboard`, `ProjectList`, `TaskDetail`, `AdminDashboard`). They fetch data, manage local state, and orchestrate component interactions.
*   **`services/api.ts`**: An Axios-based API client for interacting with the backend. It centralizes API calls, adds JWT tokens to requests, and handles global error responses (e.g., redirecting on token expiry).
*   **`types.ts`**: Defines shared TypeScript interfaces for data structures (User, Project, Task, etc.) used throughout the frontend.
*   **`ProtectedRoute.tsx`**: A component that wraps routes requiring authentication or specific roles, redirecting unauthenticated/unauthorized users.
*   **Styling:** Tailwind CSS is used for utility-first styling, making it easy to build responsive and modern UIs.

## 4. DevOps & Infrastructure

*   **Docker & Docker Compose:**
    *   Each service (PostgreSQL, Redis, Backend, Frontend) runs in its own Docker container.
    *   `docker-compose.yml` orchestrates these containers, defines their relationships, environment variables, and volumes.
    *   `Dockerfile.backend` and `Dockerfile.frontend` specify how to build the Docker images for the respective services.
*   **GitHub Actions (CI/CD):**
    *   Automated workflows trigger on `push` and `pull_request` to the `main` branch.
    *   **Test Jobs:** Separate jobs for backend and frontend tests, ensuring code quality. Includes database/cache setup for backend integration tests.
    *   **Build & Push Job:** On successful tests on the `main` branch, Docker images are built and pushed to DockerHub (or another registry). This creates deployable artifacts.
    *   Further steps could extend this to deploy to a cloud provider (e.g., AWS, Azure, GCP).

## 5. Data Flow Example: Creating a Task

1.  **Frontend:**
    *   User navigates to a `ProjectDetail` page.
    *   User clicks "Add New Task" button, which displays `TaskForm`.
    *   User fills in task details in `TaskForm` and submits.
    *   `TaskForm` calls `handleCreateTask` in `ProjectDetail`.
    *   `ProjectDetail` dispatches an action (or directly calls) `taskApi.createTask` with task data and the project ID.
    *   `api.ts` adds the JWT token from `localStorage` to the request header.

2.  **Backend:**
    *   Express receives `POST /api/v1/projects/:projectId/tasks`.
    *   `requestLogger` logs the incoming request.
    *   `apiRateLimiter` checks rate limits.
    *   `auth` middleware verifies the JWT token, populating `req.user`.
    *   `validate` middleware (with `taskValidation.createTask`) validates the request body.
    *   The request is routed to `taskController.createTask`.
    *   `taskController.createTask` calls `taskService.createTask`, passing validated data and `req.user.id`.
    *   `taskService.createTask`:
        *   Retrieves `Project` from `ProjectRepository` and validates user permissions (owner or admin).
        *   Optionally retrieves `User` (assignedTo) from `UserRepository`.
        *   Creates a `Task` entity using `TaskRepository.create()`.
        *   Persists the new task to the database using `TaskRepository.save()`.
        *   Calls `clearCache()` to invalidate relevant cache keys (e.g., `project-tasks:projectId`, `user-assigned-tasks:assignedToId`).
    *   `taskController.createTask` sends a `201 Created` HTTP response with the new task data.
    *   `errorHandler` catches any exceptions along the way.

3.  **Frontend:**
    *   `taskApi.createTask` receives the successful response.
    *   `ProjectDetail` updates its local state (adds the new task to the `tasks` array).
    *   `toast.success` displays a success notification.
    *   The new task is rendered in the `ProjectDetail` UI.

This architecture ensures a clear flow of data and responsibilities, making the system robust, scalable, and easy to debug and extend.
```

#### `DEPLOYMENT.md`
```markdown