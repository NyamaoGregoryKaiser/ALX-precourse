# Task Management System (Enterprise-Grade)

This is a comprehensive, full-stack Task Management System built with modern web technologies, adhering to enterprise-grade standards. It allows users to register, log in, create projects, manage tasks within those projects, assign tasks, and track their progress.

## Features

**Core Functionality:**
*   User Authentication & Authorization (Register, Login, Role-based access: User, Admin)
*   Project Management (CRUD operations for Projects)
*   Task Management (CRUD operations for Tasks, assign to users, update status/priority/due date)
*   Dashboard for an overview of projects and assigned tasks.

**Enterprise-Grade Features:**
*   **Database:** PostgreSQL with TypeORM for robust ORM and migrations.
*   **API:** RESTful API with full CRUD operations.
*   **Security:** JWT-based authentication, password hashing (bcrypt), input validation (Joi), Helmet middleware, Rate Limiting.
*   **Error Handling:** Centralized error handling middleware with custom `ApiError` class.
*   **Logging:** Winston for structured logging (console, file-based).
*   **Caching:** Redis integration with `cache-manager` for API response caching.
*   **Modularity:** Clear separation of concerns (controllers, services, repositories, entities).
*   **Testing:** Unit, Integration, API tests for backend; Unit/Component tests for frontend.
*   **Containerization:** Docker & Docker Compose for easy setup and deployment.
*   **CI/CD:** GitHub Actions for automated testing and Docker image builds.

## Technologies Used

**Backend (Node.js, Express, TypeScript):**
*   **Language:** TypeScript
*   **Framework:** Express.js
*   **ORM:** TypeORM
*   **Database Driver:** `pg` (PostgreSQL)
*   **Authentication:** `jsonwebtoken`, `bcryptjs`
*   **Validation:** `joi`
*   **Logging:** `winston`
*   **Caching:** `cache-manager`, `cache-manager-redis-yet`
*   **Security:** `helmet`, `cors`, `express-rate-limit`
*   **Testing:** `jest`, `supertest`, `ts-jest`

**Frontend (React, TypeScript):**
*   **Language:** TypeScript
*   **Framework:** React
*   **Routing:** `react-router-dom`
*   **API Client:** `axios`
*   **State Management:** React Context API (for Auth)
*   **UI/Styling:** Tailwind CSS, `@heroicons/react`
*   **Notifications:** `react-toastify`
*   **Date Handling:** `date-fns`
*   **Testing:** `@testing-library/react`, `jest`

**DevOps & Tools:**
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions
*   **Linting/Formatting:** ESLint, Prettier

## Project Structure

```
task-management-system/
├── backend/                  # Node.js/Express/TypeScript API
│   ├── src/
│   │   ├── config/             # DB, JWT, Logger, Cache configurations
│   │   ├── controllers/        # Request handlers (API endpoints)
│   │   ├── services/           # Business logic
│   │   ├── repositories/       # TypeORM repositories (DAL)
│   │   ├── entities/           # Database entity definitions
│   │   ├── middleware/         # Auth, error handling, logging, rate limiting, caching
│   │   ├── utils/              # Helper functions (ApiError, JWT utils)
│   │   ├── validation/         # Joi schemas for input validation
│   │   ├── subscribers/        # TypeORM event subscribers (e.g., auditing)
│   │   ├── migrations/         # Database migration scripts
│   │   ├── seeds/              # Initial data seeding scripts
│   │   ├── routes/v1/          # API routes for v1
│   │   ├── app.ts              # Express application setup
│   │   └── server.ts           # Application entry point
│   ├── tests/                  # Backend unit, integration, API tests
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── ormconfig.json
├── frontend/                 # React/TypeScript UI
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/         # Reusable UI components (forms, navbar etc.)
│   │   ├── contexts/           # React Contexts (e.g., AuthContext)
│   │   ├── hooks/
│   │   ├── pages/              # Application views (Login, Dashboard, Projects, Tasks, Admin)
│   │   ├── services/           # API client (Axios)
│   │   ├── tests/              # Frontend unit/component tests
│   │   ├── types.ts            # Shared TypeScript types
│   │   ├── App.tsx             # Main React App component
│   │   └── index.tsx           # React entry point
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── nginx/                  # Nginx configuration for Docker
├── docker-compose.yml        # Orchestrates services (DB, Redis, Backend, Frontend)
├── Dockerfile.backend        # Dockerfile for backend service
├── Dockerfile.frontend       # Dockerfile for frontend service
├── .github/                  # GitHub Actions CI/CD workflows
│   └── workflows/
│       └── ci.yml
├── README.md                 # Project README (this file)
├── ARCHITECTURE.md           # Architecture overview
└── DEPLOYMENT.md             # Deployment guide
```

## Setup and Run

### Prerequisites

*   Node.js (v18+) & npm (or yarn)
*   Docker & Docker Compose
*   PostgreSQL client (optional, for direct DB access)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/task-management-system.git
cd task-management-system
```

### 2. Environment Configuration

Create `.env` files based on `.env.example` in both `backend/` and `frontend/` directories.

**`backend/.env`** (create this file)
```dotenv
# Copy content from backend/.env.example and fill in your values
NODE_ENV=development
PORT=5000

# Database Configuration
DB_HOST=db             # Use 'db' if running with Docker Compose, 'localhost' otherwise
DB_PORT=5432
DB_USERNAME=user
DB_PASSWORD=password
DB_DATABASE=task_db

# JWT Configuration
JWT_SECRET=your_strong_jwt_secret_key_here # IMPORTANT: Change this in production!
JWT_EXPIRES_IN=1h

# Redis Configuration (for caching)
REDIS_HOST=redis       # Use 'redis' if running with Docker Compose, 'localhost' otherwise
REDIS_PORT=6379

# Logging
LOG_LEVEL=info

# CORS - Comma-separated list of allowed origins
CORS_ORIGINS=http://localhost:3000
CACHE_STORE=redis
CACHE_TTL=60
```

**`frontend/.env`** (create this file)
```dotenv
# Copy content from frontend/.env.example and fill in your values
REACT_APP_API_BASE_URL=http://localhost:5000/api/v1 # Matches backend port and API prefix
```

### 3. Run with Docker Compose (Recommended for Development)

This will set up PostgreSQL, Redis, Backend, and Frontend services.

```bash
# From the project root directory
docker-compose up --build -d
```

*   `--build`: Rebuilds the images (useful if you made changes to Dockerfiles or dependencies).
*   `-d`: Runs containers in detached mode (in the background).

After the services are up:
*   **Backend API:** `http://localhost:5000/api/v1`
*   **Frontend UI:** `http://localhost:3000` (Nginx is serving it on port 80 inside container, mapped to 3000 on host)

**Initial Setup Steps (after `docker-compose up`):**

1.  **Run Database Migrations:**
    ```bash
    docker exec task_backend npm run migration:run
    ```
2.  **Seed Initial Data:**
    ```bash
    docker exec task_backend npm run seed
    ```
    (This will create an admin user `admin@example.com` / `password123` and some sample data).

**Accessing the application:** Open your browser to `http://localhost:3000`.

### 4. Stop Docker Services

```bash
docker-compose down
```
*   `--volumes`: Add this flag if you want to remove the named volume `pg_data` and delete all database data.

### 5. Local Development (without Docker Compose for Backend/Frontend)

You can run the backend and frontend separately if you prefer. You'll still need Docker for PostgreSQL and Redis.

**a. Start Database & Redis with Docker**

```bash
# In the project root
docker-compose up db redis -d
```
Ensure your `backend/.env` has `DB_HOST=localhost` and `REDIS_HOST=localhost`.

**b. Run Backend**

```bash
cd backend
npm install
npm run build
npm run migration:run  # Run migrations
npm run seed           # Seed data (optional, only once)
npm run dev            # Start backend in development mode (watches for changes)
```
The backend will be available at `http://localhost:5000`.

**c. Run Frontend**

```bash
cd frontend
npm install
npm start              # Start frontend in development mode
```
The frontend will be available at `http://localhost:3000`.

## API Documentation

The backend exposes a RESTful API. Below are the key endpoints. All protected routes require a `Bearer` token in the `Authorization` header.

**Base URL:** `http://localhost:5000/api/v1`

### 1. Authentication (`/auth`)

*   **`POST /auth/register`**
    *   **Description:** Register a new user.
    *   **Body:** `{ "firstName": "string", "lastName": "string", "email": "string", "password": "string", "role": "user" | "admin" (optional, default "user") }`
    *   **Response:** `{ "user": {id, email, firstName, lastName, role}, "token": "string" }`
    *   **Rate Limiting:** Yes (20 requests/15 mins)

*   **`POST /auth/login`**
    *   **Description:** Log in an existing user.
    *   **Body:** `{ "email": "string", "password": "string" }`
    *   **Response:** `{ "user": {id, email, firstName, lastName, role}, "token": "string" }`
    *   **Rate Limiting:** Yes (20 requests/15 mins)

*   **`GET /auth/me`**
    *   **Description:** Get current authenticated user's profile.
    *   **Authentication:** Required
    *   **Response:** `{ "user": {id, email, firstName, lastName, role} }`

### 2. Users (`/users`) - Admin Only

*   **`GET /users`**
    *   **Description:** Get all registered users.
    *   **Authentication:** Required (Admin role)
    *   **Response:** `[{id, email, firstName, lastName, role, createdAt, updatedAt}]`
    *   **Caching:** Yes (300s TTL)

*   **`GET /users/:userId`**
    *   **Description:** Get a user by ID.
    *   **Authentication:** Required (Admin role)
    *   **Response:** `{id, email, firstName, lastName, role, createdAt, updatedAt}`

*   **`PATCH /users/:userId`**
    *   **Description:** Update a user's role.
    *   **Authentication:** Required (Admin role)
    *   **Body:** `{ "role": "user" | "admin" }`
    *   **Response:** `{id, email, firstName, lastName, role}`

### 3. Projects (`/projects`)

*   **`POST /projects`**
    *   **Description:** Create a new project.
    *   **Authentication:** Required
    *   **Body:** `{ "name": "string", "description": "string" (optional) }`
    *   **Response:** `{id, name, description, ownerId, createdAt, updatedAt}`

*   **`GET /projects`**
    *   **Description:** Get all projects (or projects owned by the user, if not admin).
    *   **Authentication:** Required
    *   **Response:** `[{id, name, description, ownerId, owner: {id, email, firstName, lastName, role}, createdAt, updatedAt}]`
    *   **Caching:** Yes (60s TTL)

*   **`GET /projects/:projectId`**
    *   **Description:** Get a project by ID.
    *   **Authentication:** Required (Owner or Admin access)
    *   **Response:** `{id, name, description, ownerId, owner: {id, email, firstName, lastName, role}, createdAt, updatedAt}`
    *   **Caching:** Yes (60s TTL)

*   **`PATCH /projects/:projectId`**
    *   **Description:** Update a project.
    *   **Authentication:** Required (Owner or Admin access)
    *   **Body:** `{ "name": "string" (optional), "description": "string" (optional) }`
    *   **Response:** `{id, name, description, ownerId, createdAt, updatedAt}`

*   **`DELETE /projects/:projectId`**
    *   **Description:** Delete a project.
    *   **Authentication:** Required (Owner or Admin access)
    *   **Response:** `204 No Content`

### 4. Tasks (`/tasks` and `/projects/:projectId/tasks`)

*   **`POST /projects/:projectId/tasks`**
    *   **Description:** Create a new task within a specific project.
    *   **Authentication:** Required (Project Owner or Admin)
    *   **Body:** `{ "title": "string", "description": "string" (optional), "assignedToId": "string" (UUID, optional), "status": "open" | "in_progress" | "completed" | "archived" (optional, default "open"), "priority": "low" | "medium" | "high" (optional, default "medium"), "dueDate": "YYYY-MM-DD" (ISO string, optional) }`
    *   **Response:** `{id, title, description, projectId, assignedToId, status, priority, dueDate, createdAt, updatedAt}`

*   **`GET /projects/:projectId/tasks`**
    *   **Description:** Get all tasks for a specific project.
    *   **Authentication:** Required (Project Owner or Admin)
    *   **Response:** `[{id, title, description, projectId, assignedToId, assignedTo: {id, email, firstName, lastName}, status, priority, dueDate, createdAt, updatedAt}]`
    *   **Caching:** Yes (30s TTL)

*   **`GET /tasks/assigned`**
    *   **Description:** Get all tasks assigned to the current authenticated user.
    *   **Authentication:** Required
    *   **Query Params:** `?status=open|in_progress|completed|archived` (optional, to filter by status)
    *   **Response:** `[{id, title, description, projectId, assignedToId, assignedTo: {id, email, firstName, lastName}, status, priority, dueDate, createdAt, updatedAt}]`
    *   **Caching:** Yes (30s TTL)

*   **`GET /tasks/:taskId`**
    *   **Description:** Get a single task by ID.
    *   **Authentication:** Required (Project Owner, Assigned User, or Admin access)
    *   **Response:** `{id, title, description, projectId, assignedToId, assignedTo: {id, email, firstName, lastName}, status, priority, dueDate, createdAt, updatedAt}`
    *   **Caching:** Yes (30s TTL)

*   **`PATCH /tasks/:taskId`**
    *   **Description:** Update a task.
    *   **Authentication:** Required (Project Owner, Assigned User, or Admin access). Reassigning requires Project Owner or Admin role.
    *   **Body:** `{ "title": "string" (optional), "description": "string" (optional), "assignedToId": "string" (UUID, null to unassign, optional), "status": "open" | "in_progress" | "completed" | "archived" (optional), "priority": "low" | "medium" | "high" (optional), "dueDate": "YYYY-MM-DD" (ISO string, optional) }`
    *   **Response:** Updated task object.

*   **`DELETE /tasks/:taskId`**
    *   **Description:** Delete a task.
    *   **Authentication:** Required (Project Owner or Admin access)
    *   **Response:** `204 No Content`

## Deployment

Refer to the `DEPLOYMENT.md` for a detailed guide on deploying this application to a production environment.
```

#### `ARCHITECTURE.md`
```markdown