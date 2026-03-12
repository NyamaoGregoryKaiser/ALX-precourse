# Task Management System - Backend

This is the backend API for the Task Management System, built with Node.js, Express.js, and PostgreSQL. It provides RESTful endpoints for managing users, projects, and tasks, including authentication, authorization, logging, caching, and rate limiting.

## Features

*   **User Management**: Register, login, view, update, and delete users. Role-based access control (user, admin).
*   **Authentication**: JWT-based authentication for secure API access.
*   **Authorization**: Role-based access control for different resources and actions.
*   **Project Management**: Create, view, update, and delete projects. Projects are owned by users.
*   **Task Management**: Create, view, update, and delete tasks. Tasks belong to projects and can be assigned to users.
*   **Database**: PostgreSQL with Sequelize ORM for robust data management, migrations, and seeding.
*   **Error Handling**: Centralized error handling middleware.
*   **Logging**: Winston for structured logging (console, file).
*   **Caching**: In-memory caching with `node-cache` (can be replaced with Redis for distributed caching).
*   **Rate Limiting**: Protects against brute-force and denial-of-service attacks.
*   **Security**: Helmet for common security headers, CORS configuration.
*   **Testing**: Unit, Integration, and API tests with Jest and Supertest.

## Project Structure

```
backend/
├── config/                          # Database configuration
├── src/
│   ├── controllers/                 # Request handlers for routes
│   ├── models/                      # Sequelize model definitions
│   ├── routes/                      # API endpoint definitions
│   ├── services/                    # Business logic and database interactions
│   ├── middleware/                  # Express middleware (auth, error handling, async)
│   ├── migrations/                  # Database migration scripts
│   ├── seeders/                     # Database seed data scripts
│   ├── utils/                       # Utility functions (logger, cache, custom errors)
│   ├── tests/                       # Test files
│   ├── app.js                       # Express application setup
│   └── server.js                    # Server entry point
├── .env.example                     # Example environment variables
├── package.json                     # Project dependencies and scripts
└── Dockerfile                       # Docker configuration for the backend
```

## Setup and Installation

### Prerequisites

*   Node.js (v18 or higher)
*   npm (v8 or higher)
*   PostgreSQL (locally or via Docker)
*   Docker & Docker Compose (for containerized setup)

### Local Setup (without Docker)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-system.git
    cd task-management-system/backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create `.env` file:**
    Copy `.env.example` to `.env` and fill in your database credentials and JWT secret.
    ```bash
    cp .env.example .env
    ```
    Ensure your `.env` file looks something like this (adjust for your PostgreSQL setup):
    ```
    NODE_ENV=development
    PORT=5000
    DB_USER=user
    DB_PASSWORD=password
    DB_NAME=task_management_db
    DB_HOST=localhost
    DB_PORT=5432
    DB_DIALECT=postgres
    JWT_SECRET=your_super_secret_jwt_key_here_at_least_32_chars_long
    JWT_EXPIRES_IN=1h
    FRONTEND_URL=http://localhost:3000
    ```

4.  **Set up PostgreSQL Database:**
    Make sure your PostgreSQL server is running. You might need to create the `task_management_db` database manually if your user doesn't have permissions to create databases.
    ```sql
    -- Example for creating database and user (if not using default 'postgres' user)
    CREATE USER user WITH PASSWORD 'password';
    CREATE DATABASE task_management_db OWNER user;
    ```

5.  **Run Migrations and Seed Data:**
    ```bash
    npm run db:migrate
    npm run db:seed
    ```
    This will create the necessary tables and populate them with initial data.

6.  **Start the server:**
    ```bash
    npm run dev
    ```
    The server will run on `http://localhost:5000`.

### Dockerized Setup (Recommended)

Refer to the main `README.md` at the project root for instructions on how to start the entire application using Docker Compose.

## API Endpoints

Refer to `API_DOCUMENTATION.md` for a complete list of API endpoints, request/response formats, and authentication requirements.

## Testing

To run backend tests:
```bash
npm test
# For watching changes during development
npm run test:watch
```
This will run unit, integration, and API tests and report coverage.

## Linting

To check code style:
```bash
npm run lint
```
To fix linting issues automatically:
```bash
npm run lint:fix
```

---
```