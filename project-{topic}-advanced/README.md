```markdown
# Comprehensive Production-Ready Authentication System

This project is a full-scale, enterprise-grade authentication system built with a TypeScript/Node.js (Express & TypeORM) backend and a React (TypeScript) frontend. It's designed with scalability, security, and maintainability in mind, incorporating various modern development practices and features required for production environments.

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Architecture](#architecture)
3.  [Features](#features)
4.  [Technologies Used](#technologies-used)
5.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Setup with Docker Compose](#local-setup-with-docker-compose)
    *   [Manual Backend Setup (without Docker)](#manual-backend-setup-without-docker)
    *   [Manual Frontend Setup (without Docker)](#manual-frontend-setup-without-docker)
6.  [Database Layer](#database-layer)
7.  [Running the Application](#running-the-application)
8.  [Testing](#testing)
    *   [Backend Tests](#backend-tests)
    *   [Frontend Tests](#frontend-tests)
    *   [API Testing with Postman](#api-testing-with-postman)
    *   [Performance Testing](#performance-testing)
9.  [API Documentation (Swagger/OpenAPI)](#api-documentation-swaggeropenapi)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [Configuration](#configuration)
12. [Logging and Monitoring](#logging-and-monitoring)
13. [Error Handling](#error-handling)
14. [Caching Layer](#caching-layer)
15. [Rate Limiting](#rate-limiting)
16. [Security Considerations](#security-considerations)
17. [Deployment Guide](#deployment-guide)
18. [ALX Software Engineering Focus](#alx-software-engineering-focus)
19. [Contributing](#contributing)
20. [License](#license)

---

## 1. Project Overview

This project delivers a robust authentication and user management system capable of handling core user flows: registration, login, logout, password reset, email verification, and profile management. It includes role-based access control (RBAC) and demonstrates CRUD operations on an example `Post` resource, protected by authentication and authorization. The system is designed for high availability and performance, utilizing Docker for containerization and a comprehensive testing suite.

## 2. Architecture

The system follows a typical **Client-Server architecture** with a **Monorepo** structure, containing separate `backend` and `frontend` applications.

*   **Frontend (React/TypeScript)**: A Single Page Application (SPA) that provides the user interface. It consumes the RESTful API from the backend.
*   **Backend (Node.js/Express/TypeScript)**: A RESTful API server responsible for business logic, data persistence, authentication, authorization, and sending emails.
*   **Database (PostgreSQL)**: The primary data store for users, roles, and application data. Managed by TypeORM.
*   **Cache/Message Broker (Redis)**: Used for session invalidation (JWT blacklisting), rate limiting, and can be extended for caching general data.

**Diagram:**

```
+----------------+      HTTP/HTTPS      +------------------+
|    Frontend    |<-------------------->|      Backend     |
| (React/TS SPA) |                      | (Node.js/Express)|
+----------------+                      |      JWT Auth    |
       ^                                |      RBAC        |
       |                                |      Logging     |
       |                                +--------+---------+
       |                                         |
       |                            +------------+-----------+
       |                            |                        |
       |                   PostgreSQL Database      Redis Cache/Rate Limiter
       |                   (TypeORM, Migrations)    (JWT Blacklist, Rate Limiting)
       |                            |                        |
       |                            +------------------------+
       |                                         |
       +-----------------------------------------+
                                 Email Service (Nodemailer)
```

## 3. Features

*   **User Management**: Register, Login, Logout, Profile View/Update.
*   **Secure Authentication**:
    *   JSON Web Tokens (JWT) for stateless authentication.
    *   Access and Refresh tokens.
    *   JWT token invalidation (blacklisting).
*   **Authorization**: Role-Based Access Control (RBAC) with `user` and `admin` roles.
    *   Middleware to restrict access based on user roles.
*   **Password Management**:
    *   Secure password hashing (`bcryptjs`).
    *   Forgot Password functionality with email-based reset links.
    *   Change Password for authenticated users.
*   **Email Verification**:
    *   Email verification upon registration with a unique, time-limited token.
    *   Resend verification email option.
*   **API Endpoints**: Full CRUD operations for `Auth`, `Users`, and an example `Posts` resource.
*   **Data Validation**: Joi-based schema validation for all incoming API requests.
*   **Error Handling**: Centralized error handling middleware with custom `ApiError` classes.
*   **Logging**: Structured logging using Winston.
*   **Rate Limiting**: IP-based request rate limiting using `express-rate-limit` and Redis.
*   **Caching**: Redis integration for rate limiting. Can be extended for general purpose caching.
*   **Environment Configuration**: `dotenv` for managing environment variables.
*   **Docker Setup**: Dockerfiles and `docker-compose.yml` for easy setup and containerization.
*   **Database Migrations**: TypeORM migrations for schema management.
*   **Seed Data**: Script to populate initial roles and an admin user.
*   **Comprehensive Testing**: Unit, Integration, and API tests.
*   **Security Best Practices**: HTTPS (implied by deployment setup), Helmet for HTTP headers, secure password storage.

## 4. Technologies Used

**Backend:**
*   **Node.js**: JavaScript runtime.
*   **Express.js**: Web framework for Node.js.
*   **TypeScript**: Statically typed superset of JavaScript.
*   **TypeORM**: ORM for Node.js with TypeScript support.
*   **PostgreSQL**: Relational database.
*   **Redis**: In-memory data store for caching and rate limiting.
*   **bcryptjs**: Library for hashing passwords.
*   **jsonwebtoken**: For generating and verifying JWTs.
*   **Joi**: Schema description and validation library.
*   **Winston**: Universal logging library.
*   **Nodemailer**: Module for sending emails.
*   **express-rate-limit**: Middleware for rate limiting.
*   **helmet**: Security middleware for HTTP headers.
*   **cors**: Middleware for Cross-Origin Resource Sharing.
*   **dotenv**: For loading environment variables.
*   **Jest/Supertest**: Testing frameworks.

**Frontend:**
*   **React**: JavaScript library for building user interfaces.
*   **TypeScript**: For type safety in React components.
*   **Vite**: Fast frontend tooling.
*   **Axios**: Promise-based HTTP client for the browser and Node.js.
*   **react-router-dom**: For declarative routing in React applications.
*   **react-toastify**: For toast notifications.
*   **jest/React Testing Library**: Testing frameworks.

**DevOps/Tooling:**
*   **Docker/Docker Compose**: For containerization and orchestration.
*   **GitHub Actions**: For CI/CD (basic setup provided).
*   **ESLint/Prettier**: For code quality and formatting.

## 5. Setup and Installation

### Prerequisites

*   Node.js (v20 or higher)
*   Yarn (recommended) or npm
*   Docker and Docker Compose (recommended for local setup)
*   Git

### Local Setup with Docker Compose (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/authentication-system.git
    cd authentication-system
    ```

2.  **Create `.env` files:**
    *   Copy `backend/.env.example` to `backend/.env`
    *   Copy `frontend/.env.example` to `frontend/.env`
    *   Copy `/.env.example` (root level) to `/.env` (root level). This `.env` is used by `docker-compose.yml`.

    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    cp .env.example .env
    ```

3.  **Configure Environment Variables:**
    *   Open `backend/.env` and `frontend/.env` and `.env` (root level) and fill in the values.
        *   **`JWT_SECRET`**: **CRITICAL!** Generate a strong, long random string for production.
        *   **`SMTP_USERNAME`, `SMTP_PASSWORD`**: Configure for an email service (e.g., Gmail with app password, SendGrid, Mailgun, or [Ethereal Email](https://ethereal.email/) for development testing).
        *   `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Set your PostgreSQL credentials.
        *   `REDIS_URL`: Defaults to `redis://redis:6379/0` when running in Docker Compose.
        *   `CLIENT_URL`: Should point to your frontend URL, e.g., `http://localhost:3000`.
        *   `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `USER_EMAIL`, `USER_PASSWORD`: These are used to seed initial admin and normal users when the database is empty. **Change them!**

4.  **Make `wait-for-it.sh` executable:**
    ```bash
    chmod +x wait-for-it.sh
    ```

5.  **Build and run the Docker containers:**
    ```bash
    docker compose up --build -d
    ```
    This will:
    *   Build Docker images for backend and frontend.
    *   Start PostgreSQL (db), Redis, backend API, and Nginx (for frontend).
    *   Wait for PostgreSQL and Redis to be healthy.
    *   Run backend migrations and seed initial data.

6.  **Access the application:**
    *   Frontend: `http://localhost:3000`
    *   Backend API (directly, if needed for testing): `http://localhost:5000/api/v1`

### Manual Backend Setup (without Docker)

If you prefer to run the backend directly on your host:

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    yarn install
    # or npm install
    ```

3.  **Ensure PostgreSQL and Redis are running:**
    *   You need a local PostgreSQL server (port 5432) and Redis server (port 6379) running.
    *   Update `DB_HOST` in `backend/.env` to `localhost`.

4.  **Run Migrations:**
    ```bash
    yarn typeorm migration:run
    ```

5.  **Seed Initial Data (optional, but recommended for first run):**
    ```bash
    yarn seed
    ```

6.  **Start the backend in development mode:**
    ```bash
    yarn dev
    ```
    The API will be available at `http://localhost:5000/api/v1`.

### Manual Frontend Setup (without Docker)

If you prefer to run the frontend directly on your host:

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    yarn install
    # or npm install
    ```

3.  **Start the frontend development server:**
    ```bash
    yarn dev
    ```
    The frontend will be available at `http://localhost:3000`.

## 6. Database Layer

*   **Database**: PostgreSQL.
*   **ORM**: TypeORM, providing entity-relationship mapping.
*   **Schema Definitions**: Defined in `backend/src/entities/`. Includes `User`, `Role`, `BlacklistedToken`, and `Post` (example).
*   **Migration Scripts**: Located in `backend/src/migrations/`.
    *   To create a new migration: `cd backend && yarn typeorm migration:create --name <MigrationName>`
    *   To run migrations: `cd backend && yarn typeorm migration:run`
    *   **Note**: `synchronize: false` is set in `data-source.ts` for production safety. Schema changes should always go through migrations.
*   **Seed Data**: The `backend/src/data-source.ts` contains a `seedDatabase` function that populates initial roles (User, Admin) and an admin/normal user account if the database is empty. This is triggered on `docker compose up` or via `yarn seed` in the backend.
*   **Query Optimization**:
    *   Indices are added to frequently queried columns (e.g., `users.email`, `blacklisted_tokens.token`) in migrations for faster lookups.
    *   `relations` are eagerly loaded where necessary (e.g., `User` with `Role`).
    *   Logging for slow queries is enabled in `AppDataSource` configuration (development mode).

## 7. Running the Application

*   **With Docker Compose**: `docker compose up -d` (from the root directory)
*   **Backend (Manual)**: `cd backend && yarn dev`
*   **Frontend (Manual)**: `cd frontend && yarn dev`

## 8. Testing

The project includes a robust testing suite to ensure quality and reliability.

### Backend Tests

*   **Location**: `backend/__tests__/`
*   **Framework**: Jest with Supertest for integration tests.
*   **Types**:
    *   **Unit Tests**: Isolated testing of business logic (`services`), utilities (`utils`). Mocks external dependencies.
    *   **Integration Tests**: Test API endpoints by sending HTTP requests and interacting with a dedicated test database (PostgreSQL container).
*   **Running Backend Tests**:
    ```bash
    cd backend
    yarn test          # Run all tests with coverage
    yarn test:unit     # Run only unit tests
    yarn test:integration # Run only integration tests
    ```
*   **Coverage**: Aim for 80%+ line coverage for core logic and services.

### Frontend Tests

*   **Location**: `frontend/__tests__/`
*   **Framework**: Jest with React Testing Library.
*   **Types**:
    *   **Component Tests**: Ensure individual React components render correctly and respond to user interactions.
    *   **Page Tests**: Verify page-level interactions and data fetching.
*   **Running Frontend Tests**:
    ```bash
    cd frontend
    yarn test          # Run all tests with coverage
    yarn test:watch    # Run tests in watch mode
    ```

### API Testing with Postman

A Postman collection is highly recommended for manual API testing and understanding. While a full executable collection isn't provided directly in the code, here's a structure you would typically use:

**Placeholder: `postman_collection.json`**
```json
{
	"info": {
		"_postman_id": "YOUR_COLLECTION_ID",
		"name": "Auth System API",
		"schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
	},
	"item": [
		{
			"name": "Authentication",
			"item": [
				{
					"name": "Register User",
					"request": {
						"method": "POST",
						"header": [],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"firstName\": \"John\",\n    \"lastName\": \"Doe\",\n    \"email\": \"john.doe@example.com\",\n    \"password\": \"Password123!\"\n}",
							"options": { "raw": { "language": "json" } }
						},
						"url": { "raw": "{{API_BASE_URL}}/auth/register" }
					},
					"response": []
				},
				{
					"name": "Login User",
					"request": {
						"method": "POST",
						"header": [],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"email\": \"john.doe@example.com\",\n    \"password\": \"Password123!\"\n}",
							"options": { "raw": { "language": "json" } }
						},
						"url": { "raw": "{{API_BASE_URL}}/auth/login" }
					},
					"response": []
				},
				{
					"name": "Refresh Tokens",
					"request": {
						"method": "POST",
						"header": [],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"refreshToken\": \"{{refreshToken}}\"\n}",
							"options": { "raw": { "language": "json" } }
						},
						"url": { "raw": "{{API_BASE_URL}}/auth/refresh-tokens" }
					},
					"response": []
				},
				{
					"name": "Logout User",
					"request": {
						"method": "POST",
						"header": [ { "key": "Authorization", "value": "Bearer {{accessToken}}" } ],
						"url": { "raw": "{{API_BASE_URL}}/auth/logout" }
					},
					"response": []
				},
				{
					"name": "Forgot Password",
					"request": {
						"method": "POST",
						"header": [],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"email\": \"john.doe@example.com\"\n}",
							"options": { "raw": { "language": "json" } }
						},
						"url": { "raw": "{{API_BASE_URL}}/auth/forgot-password" }
					},
					"response": []
				},
				{
					"name": "Reset Password",
					"request": {
						"method": "POST",
						"header": [],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"newPassword\": \"NewPassword123!\"\n}",
							"options": { "raw": { "language": "json" } }
						},
						"url": { "raw": "{{API_BASE_URL}}/auth/reset-password?token={{resetToken}}" }
					},
					"response": []
				},
				{
					"name": "Verify Email",
					"request": {
						"method": "GET",
						"header": [],
						"url": { "raw": "{{API_BASE_URL}}/auth/verify-email?token={{emailVerificationToken}}" }
					},
					"response": []
				},
				{
					"name": "Resend Verification Email",
					"request": {
						"method": "POST",
						"header": [],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"email\": \"john.doe@example.com\"\n}",
							"options": { "raw": { "language": "json" } }
						},
						"url": { "raw": "{{API_BASE_URL}}/auth/resend-verification" }
					},
					"response": []
				}
			]
		},
		{
			"name": "User Management",
			"item": [
				{
					"name": "Get All Users (Admin)",
					"request": {
						"method": "GET",
						"header": [ { "key": "Authorization", "value": "Bearer {{adminAccessToken}}" } ],
						"url": { "raw": "{{API_BASE_URL}}/users" }
					},
					"response": []
				},
				{
					"name": "Get User By ID",
					"request": {
						"method": "GET",
						"header": [ { "key": "Authorization", "value": "Bearer {{accessToken}}" } ],
						"url": { "raw": "{{API_BASE_URL}}/users/{{userId}}" }
					},
					"response": []
				},
				{
					"name": "Update User",
					"request": {
						"method": "PATCH",
						"header": [ { "key": "Authorization", "value": "Bearer {{accessToken}}" } ],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"firstName\": \"Jane\",\n    \"lastName\": \"Smith\"\n}",
							"options": { "raw": { "language": "json" } }
						},
						"url": { "raw": "{{API_BASE_URL}}/users/{{userId}}" }
					},
					"response": []
				},
				{
					"name": "Change Password",
					"request": {
						"method": "PATCH",
						"header": [ { "key": "Authorization", "value": "Bearer {{accessToken}}" } ],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"currentPassword\": \"OldPassword123!\",\n    \"newPassword\": \"NewPassword456!\"\n}",
							"options": { "raw": { "language": "json" } }
						},
						"url": { "raw": "{{API_BASE_URL}}/users/{{userId}}/change-password" }
					},
					"response": []
				},
				{
					"name": "Delete User (Admin)",
					"request": {
						"method": "DELETE",
						"header": [ { "key": "Authorization", "value": "Bearer {{adminAccessToken}}" } ],
						"url": { "raw": "{{API_BASE_URL}}/users/{{userIdToDelete}}" }
					},
					"response": []
				}
			]
		},
		{
			"name": "Posts (Example CRUD)",
			"item": [
				{
					"name": "Create Post",
					"request": {
						"method": "POST",
						"header": [ { "key": "Authorization", "value": "Bearer {{accessToken}}" } ],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"title\": \"My First Post\",\n    \"content\": \"This is the content of my first post.\"\n}",
							"options": { "raw": { "language": "json" } }
						},
						"url": { "raw": "{{API_BASE_URL}}/posts" }
					},
					"response": []
				},
				{
					"name": "Get All Posts",
					"request": {
						"method": "GET",
						"header": [ { "key": "Authorization", "value": "Bearer {{accessToken}}" } ],
						"url": { "raw": "{{API_BASE_URL}}/posts" }
					},
					"response": []
				},
				{
					"name": "Get Post By ID",
					"request": {
						"method": "GET",
						"header": [ { "key": "Authorization", "value": "Bearer {{accessToken}}" } ],
						"url": { "raw": "{{API_BASE_URL}}/posts/{{postId}}" }
					},
					"response": []
				},
				{
					"name": "Update Post",
					"request": {
						"method": "PATCH",
						"header": [ { "key": "Authorization", "value": "Bearer {{accessToken}}" } ],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"title\": \"Updated Title\",\n    \"content\": \"Updated content for my post.\"\n}",
							"options": { "raw": { "language": "json" } }
						},
						"url": { "raw": "{{API_BASE_URL}}/posts/{{postId}}" }
					},
					"response": []
				},
				{
					"name": "Delete Post",
					"request": {
						"method": "DELETE",
						"header": [ { "key": "Authorization", "value": "Bearer {{accessToken}}" } ],
						"url": { "raw": "{{API_BASE_URL}}/posts/{{postId}}" }
					},
					"response": []
				}
			]
		}
	],
	"event": [
		{
			"listen": "prerequest",
			"script": {
				"type": "text/javascript",
				"exec": [
					""
				]
			}
		},
		{
			"listen": "test",
			"script": {
				"type": "text/javascript",
				"exec": [
					"var jsonData = pm.response.json();",
					"",
					"if (pm.request.url.includes('/auth/login') && jsonData.tokens) {",
					"    pm.environment.set(\"accessToken\", jsonData.tokens.accessToken);",
					"    pm.environment.set(\"refreshToken\", jsonData.tokens.refreshToken);",
					"    pm.environment.set(\"userId\", jsonData.user.id);",
					"    if (jsonData.user.role === 'admin') {",
					"        pm.environment.set(\"adminAccessToken\", jsonData.tokens.accessToken);",
					"        pm.environment.set(\"adminUserId\", jsonData.user.id);",
					"    } else {",
					"        pm.environment.set(\"normalAccessToken\", jsonData.tokens.accessToken);",
					"        pm.environment.set(\"normalUserId\", jsonData.user.id);",
					"    }",
					"}",
					"if (pm.request.url.includes('/auth/refresh-tokens') &&