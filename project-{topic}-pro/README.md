# Task Management System

A comprehensive, production-ready task management system built with a Node.js/Express/TypeScript backend, React/TypeScript frontend, PostgreSQL database, and Redis for caching. This project demonstrates enterprise-grade development practices including full-stack implementation, robust testing, CI/CD, and detailed documentation.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technologies Used](#technologies-used)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
  - [Using Docker Compose (Recommended)](#using-docker-compose-recommended)
  - [Manual Setup](#manual-setup)
- [Running Tests](#running-tests)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features

- **User Management**: Register, Login, User Profiles, Role-based Access Control (Admin/Member).
- **Workspace Management**: Create, view, update, delete workspaces; users own workspaces.
- **Project Management**: Create, view, update, delete projects within a workspace; assign project owners.
- **Task Management**:
    - CRUD operations for tasks.
    - Task status (Open, In Progress, Review, Closed, Archived), priority (Low, Medium, High, Critical).
    - Due dates, assignees, tags.
- **Comment System**: Add comments to tasks.
- **Authentication & Authorization**: JWT-based secure authentication and middleware for access control.
- **Logging & Monitoring**: Structured logging with Winston.
- **Error Handling**: Centralized error handling middleware and custom error classes.
- **Caching**: Redis integration for frequently accessed data to improve performance.
- **Rate Limiting**: Protect API endpoints from abuse.
- **Data Validation**: Request validation using Zod.
- **Database Migrations**: TypeORM for schema evolution.
- **Comprehensive Testing**: Unit, Integration, and API tests.
- **Containerization**: Docker for isolated development and deployment environments.
- **CI/CD**: GitHub Actions pipeline for automated testing and deployment.

## Architecture

Refer to [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed overview of the system design, component interactions, and data flow.

## Technologies Used

### Backend
- **Node.js**: JavaScript runtime.
- **Express.js**: Web application framework.
- **TypeScript**: Superset of JavaScript for type safety.
- **TypeORM**: ORM for database interaction.
- **PostgreSQL**: Relational database.
- **Redis**: In-memory data store for caching and session management.
- **JWT**: JSON Web Tokens for authentication.
- **Bcrypt.js**: For password hashing.
- **Winston**: For logging.
- **Zod**: For data validation.
- **Express-rate-limit**: For API rate limiting.

### Frontend
- **React**: JavaScript library for building user interfaces.
- **TypeScript**: For type safety in the frontend.
- **Chakra UI**: Component library for fast UI development.
- **React Router DOM**: For client-side routing.
- **Axios**: For making HTTP requests to the backend.

### Development & DevOps
- **Docker & Docker Compose**: For containerization and orchestration.
- **Jest & Supertest**: For backend testing.
- **React Testing Library**: For frontend testing.
- **k6**: For performance/load testing (conceptual).
- **GitHub Actions**: For CI/CD.

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org/en/download/) (v18 or higher)
-   [npm](https://www.npmjs.com/get-npm) (comes with Node.js)
-   [Docker Desktop](https://www.docker.com/products/docker-desktop) (if using Docker Compose)
-   [Git](https://git-scm.com/downloads)

## Local Setup

### Using Docker Compose (Recommended)

This method sets up the backend, frontend, PostgreSQL database, and Redis cache in isolated containers.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-system.git
    cd task-management-system
    ```

2.  **Create `.env` files:**
    Copy the example environment files for both backend and frontend.
    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    ```
    You can customize the values in `.env` files, but the defaults should work for local development with Docker Compose.

3.  **Build and start the services:**
    ```bash
    docker compose up --build -d
    ```
    This command will:
    -   Build Docker images for the backend and frontend.
    -   Create and start containers for `db` (PostgreSQL), `redis`, `backend`, and `frontend`.
    -   Run database migrations on the `backend` container startup.
    -   The backend will run on `http://localhost:5000` and the frontend on `http://localhost:3000`.

4.  **Seed the database (Optional):**
    After the containers are up and migrations have run, you can seed the database with initial data:
    ```bash
    docker compose exec backend npm run seed
    ```

5.  **Access the applications:**
    -   Frontend: `http://localhost:3000`
    -   Backend API: `http://localhost:5000/api`
    -   Backend Health Check: `http://localhost:5000/health`

6.  **Stop and remove services:**
    ```bash
    docker compose down
    ```

### Manual Setup (Without Docker Compose for individual components)

#### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd task-management-system/backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create `.env` file:**
    ```bash
    cp .env.example .env
    ```
    Edit `.env` to point to your local PostgreSQL and Redis instances. Make sure `DATABASE_URL` and `REDIS_URL` are correct.

4.  **Setup PostgreSQL Database:**
    -   Ensure PostgreSQL is running locally.
    -   Create a database (e.g., `taskdb`) and a user with access rights.
    -   Example `DATABASE_URL` in `.env`: `postgresql://user:password@localhost:5432/taskdb`

5.  **Setup Redis Cache:**
    -   Ensure Redis is running locally.
    -   Example `REDIS_URL` in `.env`: `redis://localhost:6379`

6.  **Run Migrations:**
    ```bash
    npm run migration:run
    ```

7.  **Seed the database (Optional):**
    ```bash
    npm run seed
    ```

8.  **Start the backend server:**
    ```bash
    npm run dev  # For development with hot-reloads
    # or
    npm run start # For production (after npm run build)
    ```
    The backend API will be available at `http://localhost:5000/api`.

#### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd task-management-system/frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create `.env` file:**
    ```bash
    cp .env.example .env
    ```
    Ensure `REACT_APP_API_BASE_URL` points to your running backend (e.g., `http://localhost:5000/api`).

4.  **Start the frontend development server:**
    ```bash
    npm start
    ```
    The frontend application will open in your browser at `http://localhost:3000`.

## Running Tests

### Backend Tests

Navigate to the `backend` directory and run:
```bash
npm test
# Or for watch mode
npm test:watch
```
This will run unit and integration tests using Jest and Supertest. A coverage report will be generated in the `coverage/` directory.

### Frontend Tests

Navigate to the `frontend` directory and run:
```bash
npm test
```
This will run component tests using React Testing Library.

### Performance Tests (Conceptual)

Refer to the conceptual `performance-tests/api-load-test.js` script.
To run a performance test with `k6` (ensure `k6` is installed):
```bash
k6 run performance-tests/api-load-test.js
```
*Note: This script assumes you have valid user credentials and a project ID to use for task creation. You would typically generate/seed these for testing purposes.*

## API Documentation

The API endpoints are documented using a conceptual OpenAPI/Swagger specification.
Refer to [API_DOCS.md](API_DOCS.md) for detailed information about each endpoint, request/response formats, and authentication requirements.

## Deployment

A detailed guide on how to deploy this system to a production environment (e.g., AWS EC2, DigitalOcean Droplet) using Docker Compose and Nginx as a reverse proxy is available in [DEPLOYMENT.md](DEPLOYMENT.md).

## Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write tests for your changes.
5.  Ensure all tests pass (`npm test` in both backend and frontend).
6.  Commit your changes (`git commit -m 'feat: Add new feature'`).
7.  Push to the branch (`git push origin feature/your-feature-name`).
8.  Open a Pull Request.

## License

This project is licensed under the ISC License. See the `LICENSE` file for more details.