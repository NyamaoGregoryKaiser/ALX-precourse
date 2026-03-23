```markdown
# Real-time Chat Application

A comprehensive, production-ready real-time chat application built with a full-stack TypeScript environment, including Node.js (Express, Socket.IO) backend, React frontend, PostgreSQL database (with Prisma ORM), and Redis caching.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technologies Used](#technologies-used)
- [Setup & Installation](#setup--installation)
  - [Prerequisites](#prerequisites)
  - [Local Setup with Docker Compose](#local-setup-with-docker-compose)
  - [Manual Local Setup (Optional)](#manual-local-setup-optional)
- [Running the Application](#running-the-application)
- [Database Management](#database-management)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Architecture Documentation](#architecture-documentation)
- [Deployment Guide](#deployment-guide)
- [Additional Features](#additional-features)
- [License](#license)

## Features

*   **User Management:** Registration, Login, User Profiles (view/update).
*   **Real-time Chat:** Instant messaging using WebSockets (Socket.IO).
*   **Chat Room Management:** Create new rooms, join existing rooms.
*   **Message History:** Persisted messages with pagination.
*   **Typing Indicators:** Real-time feedback when other users are typing.
*   **Authentication & Authorization:** JWT-based secure access to API and WebSocket.
*   **Robust Error Handling:** Centralized middleware with custom error classes.
*   **Logging & Monitoring:** Winston logger for structured logging.
*   **Caching:** Redis for session tokens and frequently accessed user data.
*   **Rate Limiting:** Protects API endpoints against abuse.
*   **Scalable Architecture:** Designed for horizontal scaling using Docker.
*   **Comprehensive Testing:** Unit, Integration, API, and Performance tests.
*   **CI/CD:** GitHub Actions workflow for automated builds and tests.

## Architecture

Please refer to the [Architecture Documentation](docs/architecture.md) for a detailed overview of the system design.

## Technologies Used

**Backend (Node.js/TypeScript)**
*   **Framework:** Express.js
*   **Real-time:** Socket.IO
*   **Database ORM:** Prisma
*   **Authentication:** JSON Web Tokens (JWT), bcrypt.js
*   **Caching:** ioredis
*   **Validation:** Zod
*   **Logging:** Winston
*   **Security:** Helmet, CORS, express-rate-limit
*   **Testing:** Jest, Supertest

**Frontend (React/TypeScript)**
*   **Framework:** React.js
*   **State Management:** React Context API
*   **Styling:** Styled Components
*   **API Client:** Axios
*   **Real-time Client:** Socket.IO Client
*   **Routing:** React Router DOM
*   **Testing:** React Testing Library

**Database & Infrastructure**
*   **Database:** PostgreSQL
*   **Cache/Message Broker:** Redis
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions

## Setup & Installation

### Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/en/download/) (v18 or higher)
*   [npm](https://www.npmjs.com/get-npm) (usually comes with Node.js)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop) (for Docker Compose setup)
*   [Git](https://git-scm.com/downloads)

### Local Setup with Docker Compose (Recommended)

This is the easiest way to get the entire application running with all services.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/chat-app.git
    cd chat-app
    ```

2.  **Create `.env` files:**
    Copy the example environment files for both backend and frontend:
    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    ```
    You can customize the variables in these `.env` files (e.g., `JWT_SECRET`, `CORS_ORIGIN`). The default values in `.env.example` should work for local development.

3.  **Run Docker Compose:**
    Build and start all services (Postgres, Redis, Backend, Frontend):
    ```bash
    docker-compose up --build -d
    ```
    The `-d` flag runs the containers in detached mode. To see logs, use `docker-compose logs -f`.

4.  **Initialize Database (Migrations & Seed Data):**
    Once the backend service is up and connected to PostgreSQL, run Prisma migrations and seed the database.
    You might need to wait a few seconds for the `postgres` service to be fully healthy before the `backend` service starts its `npx prisma migrate deploy` command.
    If the backend service fails to start due to DB connection issues (e.g., `FATAL: database "chat_app" does not exist`), try restarting just the backend:
    ```bash
    docker-compose restart backend
    ```
    The `docker-compose.yml` is configured to run `prisma migrate deploy` as part of the backend `CMD`.
    To seed the database with initial users and chat rooms:
    ```bash
    docker-compose exec backend npm run prisma:seed
    ```

5.  **Access the Application:**
    *   **Frontend:** Open your browser to `http://localhost:3000`
    *   **Backend API:** The backend API will be available at `http://localhost:5000/api`
    *   **PostgreSQL:** Accessible on `localhost:5432`
    *   **Redis:** Accessible on `localhost:6379`

### Manual Local Setup (Optional)

If you prefer to run services individually without Docker Compose:

#### 1. Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create `.env` file (if you haven't already with Docker Compose setup):
    ```bash
    cp .env.example .env
    ```
    Ensure `DATABASE_URL` points to a running PostgreSQL instance (e.g., `postgresql://user:password@localhost:5432/chat_app?schema=public`) and `REDIS_URL` to a running Redis instance (e.g., `redis://localhost:6379`). You'll need to manually run these services or use Docker for them.
4.  Generate Prisma client and run migrations:
    ```bash
    npx prisma generate
    npx prisma migrate dev --name init # Follow prompts, this creates a new DB schema
    ```
5.  Seed the database (optional):
    ```bash
    npm run prisma:seed
    ```
6.  Build and start the backend:
    ```bash
    npm run build
    npm start
    # For development with live reload:
    # npm run dev
    ```
    The backend will run on `http://localhost:5000`.

#### 2. Frontend Setup

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create `.env` file:
    ```bash
    cp .env.example .env
    ```
    Ensure `REACT_APP_API_BASE_URL` and `REACT_APP_WS_URL` point to your backend (e.g., `http://localhost:5000/api` and `http://localhost:5000`).
4.  Start the frontend development server:
    ```bash
    npm start
    ```
    The frontend will run on `http://localhost:3000`.

## Running the Application

After following the Docker Compose setup:
1.  **Frontend:** `http://localhost:3000`
2.  **Backend API:** `http://localhost:5000/api`

You can register new users or use the seeded users:
*   **Alice:** `alice@example.com` / `password123`
*   **Bob:** `bob@example.com` / `password456`

## Database Management

*   **Prisma Studio:** To inspect your database visually:
    ```bash
    docker-compose exec backend npx prisma studio
    ```
    Then open `http://localhost:5555` in your browser.
*   **Migrations:** When you change `backend/prisma/schema.prisma`:
    ```bash
    docker-compose exec backend npx prisma migrate dev --name your_migration_name
    ```
*   **Seed Data:** To re-run the seed script:
    ```bash
    docker-compose exec backend npm run prisma:seed
    ```

## Testing

The project includes various types of tests to ensure quality and reliability.

### Running Tests

*   **Backend Tests:**
    ```bash
    cd backend
    npm test # Runs Jest for unit/integration/API tests
    ```
    To run with coverage:
    ```bash
    npm test -- --coverage
    ```
    *(Note: Ensure `DATABASE_TEST_URL` is configured in `backend/.env` for integration tests to use a separate database.)*

*   **Frontend Tests:**
    ```bash
    cd frontend
    npm test # Runs React Testing Library tests
    ```

*   **Performance Tests (Artillery):**
    1.  Install Artillery globally or locally: `npm install -g artillery` (or `npm install --save-dev artillery` in backend)
    2.  Ensure your backend is running.
    3.  From the project root:
        ```bash
        npx artillery run artillery-performance-test.yml
        ```
        This will simulate high load on registration, login, chat room creation, and message sending.

## API Documentation

Detailed API endpoints, request/response formats, and authentication requirements can be found in:
[docs/api.md](docs/api.md)

## Architecture Documentation

An in-depth explanation of the system's architecture, component interactions, and design decisions is available in:
[docs/architecture.md](docs/architecture.md)

## Deployment Guide

A guide on deploying the application to a production environment (e.g., cloud platforms) is provided in:
[docs/deployment.md](docs/deployment.md)

## Additional Features

*   **Authentication/Authorization:** JWTs for secure access.
*   **Logging & Monitoring:** Winston for structured logging, integrated with Morgan for HTTP access logs.
*   **Error Handling:** Centralized middleware for consistent error responses and graceful degradation.
*   **Caching Layer:** Redis used for JWT session management and potential future data caching.
*   **Rate Limiting:** `express-rate-limit` middleware protects API from excessive requests.

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.
```