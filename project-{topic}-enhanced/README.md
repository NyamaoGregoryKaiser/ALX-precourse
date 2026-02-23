```markdown
# SecureTask: Enterprise-Grade Secure Task Management Platform

## Overview
SecureTask is a comprehensive, production-ready task management platform designed to help teams organize, track, and complete their work efficiently and securely. This project demonstrates a full-stack JavaScript application with robust security implementations, comprehensive testing, and scalable infrastructure.

## Key Features
*   **User Authentication & Authorization (RBAC):** Secure registration, login, JWT-based authentication, and role-based access control (Admin, Manager, Member).
*   **Project Management:** CRUD operations for projects, assigning managers and members, status tracking.
*   **Task Management:** CRUD operations for tasks within projects, task assignment, status, priority, due dates.
*   **Comment System:** Add and manage comments on tasks.
*   **API Security:** Rate limiting, CORS, Helmet for security headers, XSS sanitization, Joi validation.
*   **Robust Error Handling:** Centralized error handling to prevent sensitive information leakage.
*   **Logging & Monitoring:** Structured logging with Winston.
*   **Caching Layer:** Redis integration for improved performance (e.g., project data caching).
*   **Database:** PostgreSQL with Prisma ORM for type-safe database interactions and migrations.
*   **Containerization:** Docker and Docker Compose for easy setup, development, and deployment.
*   **Testing:** Unit, Integration, and API tests to ensure code quality and reliability.
*   **Comprehensive Documentation:** Detailed setup, API, architecture, and deployment guides.

## Technologies Used

### Backend (Node.js/Express)
*   **Runtime:** Node.js 20+
*   **Framework:** Express.js
*   **ORM:** Prisma ORM
*   **Database:** PostgreSQL
*   **Authentication:** JSON Web Tokens (JWT), Bcrypt.js
*   **Validation:** Joi
*   **Security:** Helmet, Express Rate Limit, CORS, XSS-Clean
*   **Logging:** Winston
*   **Caching:** Redis

### Frontend (React)
*   **Library:** React 18+
*   **Routing:** React Router DOM
*   **HTTP Client:** Axios
*   **Styling:** Pure CSS (modular)

### Infrastructure
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions (conceptual configuration)

## Setup Instructions

### Prerequisites
*   Git
*   Docker & Docker Compose
*   Node.js (for local development/testing outside Docker)
*   npm (Node Package Manager)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/securetask.git
cd securetask
```

### 2. Environment Configuration
Create a `.env` file in the root `securetask/` directory and `backend/` directory based on the `.env.example` files.

#### `securetask/.env` (for Docker Compose)
```dotenv
# No need for this if environment variables are set directly in docker-compose.yml
# But good practice for sensitive data
```
*(In this setup, environment variables for Docker are mostly defined within `docker-compose.yml` directly for simplicity. For production, these would be moved to secrets management.)*

#### `backend/.env`
```dotenv
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://user:password@db:5432/securetask_db?schema=public"
JWT_SECRET="YOUR_SUPER_SECRET_JWT_KEY_HERE" # CHANGE THIS TO A STRONG, UNIQUE SECRET IN PRODUCTION!
JWT_EXPIRATION="1h"
ADMIN_EMAIL="admin@securetask.com"
ADMIN_PASSWORD="adminpassword" # CHANGE THIS TO A STRONG, UNIQUE PASSWORD IN PRODUCTION!
FRONTEND_URL="http://localhost:3000"
CACHE_REDIS_URL="redis://redis:6379"
```

#### `frontend/.env`
```dotenv
REACT_APP_API_BASE_URL=http://localhost:5000/api/v1
```

### 3. Build and Run with Docker Compose
This is the recommended way to get the entire application running.

```bash
# From the project root (securetask/)
docker-compose build
docker-compose up -d

# Verify services are running
docker-compose ps
```
The application will be accessible at:
*   **Frontend:** `http://localhost:3000` (or `http://localhost` if Nginx is configured to serve frontend from its root)
*   **Backend API:** `http://localhost:5000/api/v1`

**Important:** The `docker-compose.yml` includes an Nginx service that acts as a reverse proxy for both frontend and backend.
*   Frontend (React) build will be served from `http://localhost`.
*   Backend API requests to `/api/v1/*` will be proxied to the Node.js backend running on port `5000`.
*   Make sure `nginx.conf` is in the root directory alongside `docker-compose.yml`.

### 4. Initial Database Setup (for fresh deployments)
The `docker-compose.yml` is configured to run `npx prisma migrate deploy` on backend startup. This will apply all pending migrations. The `backend/src/server.js` also includes logic to seed the database with an admin user if running in `development` or `test` environments and no admin exists.

**To manually trigger migrations/seeding (outside Docker):**
```bash
# In backend/ directory
npm install
npx prisma migrate dev --name init # Applies migrations and creates database if not exists
node prisma/seed.js # Manually run seed script (if not handled by server.js)
```

## Running Tests

### Backend Tests
```bash
# From securetask/backend directory
npm test
```
This will run unit and integration tests using Jest and Supertest. Coverage reports will be generated.

### Frontend Tests
```bash
# From securetask/frontend directory
npm test
```
This will run React component tests using React Testing Library.

## API Documentation
See `API_DOCS.md` for detailed endpoint specifications.

## Architecture Documentation
See `ARCHITECTURE.md` for an overview of the system design.

## Deployment Guide
See `DEPLOYMENT.md` for detailed instructions on deploying to a production environment.

## Code Structure & Philosophy
The project follows a modular and layered architecture, separating concerns into controllers, services, middlewares, and utilities. This enhances maintainability, testability, and scalability. Security is integrated throughout the development lifecycle, from input validation and sanitization to secure authentication mechanisms and environment configuration.
```