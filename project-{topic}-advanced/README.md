# Task Management System

A comprehensive, production-ready Task Management System built with a full JavaScript stack (React frontend, Node.js/Express backend, PostgreSQL database). This project demonstrates enterprise-grade features including robust CRUD operations, authentication/authorization, logging, caching, rate limiting, Dockerization, and a CI/CD pipeline.

## Table of Contents

1.  [Features](#features)
2.  [Technology Stack](#technology-stack)
3.  [Project Structure](#project-structure)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Setup (using Docker Compose)](#local-setup-using-docker-compose)
    *   [Local Setup (without Docker)](#local-setup-without-docker)
5.  [Running the Application](#running-the-application)
6.  [Testing](#testing)
7.  [API Documentation](#api-documentation)
8.  [Architecture](#architecture)
9.  [Deployment](#deployment)
10. [CI/CD](#cicd)
11. [Additional Features](#additional-features)
12. [Contributing](#contributing)
13. [License](#license)

## 1. Features

*   **User Management**: Register, login, manage user profiles. Role-based access control (Admin/User).
*   **Authentication & Authorization**: Secure JWT-based authentication. Middleware for protecting routes and enforcing roles.
*   **Project Management**: Create, view, update, and delete projects. Projects are owned by users.
*   **Task Management**: Create, view, update, and delete tasks. Tasks belong to projects and can be assigned to users, with status and priority tracking.
*   **Data Persistence**: PostgreSQL database with Sequelize ORM, migrations, and seed data.
*   **API Endpoints**: Full CRUD operations exposed via a RESTful API.
*   **Configuration**: Environment-specific settings, `.env` for sensitive data.
*   **Containerization**: Docker and Docker Compose for easy setup and consistent environments.
*   **Testing Suite**: Unit, Integration, and API tests with Jest, Supertest, and React Testing Library for high code quality.
*   **Comprehensive Logging**: Winston for structured server-side logging.
*   **Robust Error Handling**: Centralized middleware to catch and process errors gracefully.
*   **Caching Layer**: In-memory caching with `node-cache` to improve API response times (extensible to Redis).
*   **Rate Limiting**: Protects API endpoints from abuse and brute-force attacks.
*   **Security Headers**: `helmet` middleware for common web vulnerabilities.
*   **CORS Configuration**: Secure cross-origin resource sharing.
*   **Documentation**: Detailed `README`, API docs, architecture overview, and deployment guide.
*   **CI/CD**: Basic GitHub Actions workflow for linting and testing.

## 2. Technology Stack

*   **Backend**: Node.js, Express.js
*   **Frontend**: React.js
*   **Database**: PostgreSQL
*   **ORM**: Sequelize
*   **Authentication**: JSON Web Tokens (JWT), Bcrypt.js
*   **Testing**: Jest, Supertest, React Testing Library
*   **Logging**: Winston
*   **Caching**: `node-cache` (in-memory)
*   **Rate Limiting**: `express-rate-limit`
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions
*   **Utilities**: `dotenv`, `cors`, `helmet`, `dayjs` (frontend for date formatting)

## 3. Project Structure

```
task-management-system/
├── .github/                             # CI/CD workflows (GitHub Actions)
├── backend/                             # Node.js/Express.js API
│   ├── config/                          # Configuration files
│   ├── src/
│   │   ├── controllers/                 # Request handlers
│   │   ├── models/                      # Sequelize model definitions
│   │   ├── routes/                      # API routes
│   │   ├── services/                    # Business logic
│   │   ├── middleware/                  # Express middleware
│   │   ├── migrations/                  # Database migration scripts
│   │   ├── seeders/                     # Database seed data scripts
│   │   ├── utils/                       # Utility functions (logger, cache)
│   │   ├── tests/                       # Backend tests
│   │   ├── app.js                       # Express app setup
│   │   └── server.js                    # Server entry point
│   ├── .env.example                     # Environment variables example
│   ├── package.json                     # Backend dependencies
│   └── Dockerfile                       # Dockerfile for backend service
├── frontend/                            # React.js SPA
│   ├── public/
│   ├── src/
│   │   ├── api/                         # API client functions
│   │   ├── components/                  # Reusable UI components
│   │   ├── contexts/                    # React Context for global state
│   │   ├── pages/                       # Page-level components
│   │   ├── utils/                       # Frontend utilities
│   │   ├── tests/                       # Frontend tests
│   │   ├── App.js                       # Main application component
│   │   └── index.js                     # React entry point
│   ├── .env.example                     # Environment variables example
│   ├── package.json                     # Frontend dependencies
│   └── Dockerfile                       # Dockerfile for frontend service
├── .dockerignore                        # Files/dirs to ignore for Docker builds
├── docker-compose.yml                   # Docker Compose setup for all services
├── README.md                            # Main project README
├── ARCHITECTURE.md                      # Architecture documentation
├── API_DOCUMENTATION.md                 # API documentation
└── DEPLOYMENT.md                        # Deployment guide
```

## 4. Setup and Installation

### Prerequisites

Before you begin, ensure you have the following installed:

*   [Git](https://git-scm.com/)
*   [Node.js](https://nodejs.org/en/) (v18 or higher) & [npm](https://www.npmjs.com/) (comes with Node.js)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop) (includes Docker Engine and Docker Compose)

### Local Setup (using Docker Compose) - Recommended

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-system.git
    cd task-management-system
    ```

2.  **Create `.env` files:**
    Copy the example environment variables for both backend and frontend.

    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    ```

    **Update `backend/.env`**:
    *   `JWT_SECRET`: Generate a strong, long secret key.
    *   `DB_USER`, `DB_PASSWORD`, `DB_NAME`: These defaults are set in `docker-compose.yml` and `backend/config/config.json`. You can keep them or change them consistently.
    *   `FRONTEND_URL`: `http://localhost:3000`

    **Update `frontend/.env`**:
    *   `REACT_APP_API_BASE_URL`: `http://localhost:5000/api`

3.  **Start the services with Docker Compose:**
    ```bash
    docker-compose up --build
    ```
    This command will:
    *   Build Docker images for the backend and frontend.
    *   Create a PostgreSQL database container.
    *   Wait for the database to be healthy.
    *   Run database migrations and seed data in the backend container.
    *   Start the backend (Node.js) server.
    *   Start the frontend (React) development server (served by Nginx in production build).

    It may take a few minutes for all services to start, especially for the first build.

### Local Setup (without Docker)

If you prefer to run the backend and frontend directly on your machine without Docker:

1.  **Backend Setup**:
    Refer to `backend/README.md` for detailed instructions.
    Essentially: `cd backend`, `npm install`, set up local PostgreSQL, `npm run db:migrate`, `npm run db:seed`, `npm run dev`.

2.  **Frontend Setup**:
    Refer to `frontend/README.md` for detailed instructions.
    Essentially: `cd frontend`, `npm install`, `npm start`.

## 5. Running the Application

Once Docker Compose is up (`docker-compose up`), or if you've set up locally:

*   **Backend API**: Accessible at `http://localhost:5000/api`
*   **Frontend UI**: Accessible at `http://localhost:3000`

You can now navigate to `http://localhost:3000` in your web browser to use the Task Management System.

**Default Credentials for Seeded Data:**
*   **Admin User:**
    *   Email: `admin@example.com`
    *   Password: `password123`
*   **Regular User:**
    *   Email: `user@example.com`
    *   Password: `password123`
*   **Other User:**
    *   Email: `john@example.com`
    *   Password: `password123`

## 6. Testing

The project includes comprehensive tests for both backend and frontend.

### Backend Tests

Navigate to the `backend` directory:
```bash
cd backend
npm test               # Run all tests with coverage
npm run test:watch     # Run tests in watch mode
```
This includes:
*   **Unit Tests**: For services and utility functions.
*   **Integration Tests**: For API routes (using Supertest).
*   **API Tests**: Further integration with `supertest` to cover full CRUD flows.
*   **Performance Tests**: A conceptual outline and explanation in `backend/src/tests/api/task.performance.test.js`. Actual performance tests would use tools like `k6`.

### Frontend Tests

Navigate to the `frontend` directory:
```bash
cd frontend
npm test               # Run all tests with coverage
```
This includes:
*   **Unit/Component Tests**: For React components and utility functions using React Testing Library and Jest.

## 7. API Documentation

Detailed API endpoints, request/response formats, and authentication requirements are documented in [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## 8. Architecture

An overview of the system's architecture, design decisions, and component interactions can be found in [ARCHITECTURE.md](ARCHITECTURE.md).

## 9. Deployment

A guide for deploying this application to a production environment is available in [DEPLOYMENT.md](DEPLOYMENT.md).

## 10. CI/CD

A basic CI/CD pipeline is configured using GitHub Actions.
See `.github/workflows/ci.yml` for the configuration.
It performs:
*   Linting checks for both backend and frontend.
*   Runs tests for both backend and frontend.

## 11. Additional Features

*   **Authentication/Authorization**: JWT-based authentication with role-based access control.
*   **Logging and Monitoring**: Structured logging with Winston. Can be integrated with external monitoring tools (e.g., ELK stack, Prometheus/Grafana).
*   **Error Handling Middleware**: Centralized error handling to provide consistent error responses.
*   **Caching Layer**: In-memory caching (`node-cache`) for faster data retrieval. Can be extended to a distributed cache like Redis for multi-instance deployments.
*   **Rate Limiting**: `express-rate-limit` to prevent API abuse.

## 12. Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature`).
6.  Open a Pull Request.

## 13. License

This project is licensed under the [ISC License](LICENSE).
```