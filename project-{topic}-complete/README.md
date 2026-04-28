# ML Utilities System (MLU-Sys)

## Table of Contents
1.  [Project Overview](#project-overview)
2.  [Features](#features)
3.  [Technology Stack](#technology-stack)
4.  [Prerequisites](#prerequisites)
5.  [Setup Instructions](#setup-instructions)
    *   [Local Development (without Docker)](#local-development-without-docker)
    *   [Docker Setup (Recommended)](#docker-setup-recommended)
6.  [Database Management](#database-management)
7.  [API Documentation](#api-documentation)
8.  [Frontend Usage](#frontend-usage)
9.  [Testing](#testing)
10. [CI/CD](#cicd)
11. [Architecture](#architecture)
12. [Deployment Guide](#deployment-guide)
13. [Additional Notes](#additional-notes)
14. [License](#license)

---

## 1. Project Overview
The ML Utilities System (MLU-Sys) is a comprehensive, production-ready platform designed to facilitate the management of Machine Learning datasets and models. It provides a robust backend API for CRUD operations on these resources, secure user authentication, and a simplified prediction service to demonstrate model serving capabilities. The frontend offers an intuitive interface for users to interact with the system.

This project aims to demonstrate best practices in full-stack software engineering, including modular design, comprehensive testing, containerization, and detailed documentation.

## 2. Features

### Core ML Functionality
*   **Dataset Management**: Upload, list, view, update, and delete dataset files (e.g., CSV).
*   **Model Management**: Upload, list, view, version, update, and delete ML model files (e.g., .pkl, .h5).
*   **Model Deployment**: Mark models as 'deployed' and associate a `deploymentUrl` (simulated for external serving).
*   **Prediction Service**: An API endpoint to make predictions using deployed models, with input/output logging. (Note: Prediction logic is simulated, not actual ML inference).

### System Features
*   **Authentication & Authorization**: JWT-based authentication, role-based access control (User, Admin).
*   **User Management**: Admin users can manage all users; regular users can manage their own profiles.
*   **File Storage**: Secure storage and retrieval of dataset and model files.
*   **Configuration**: Environment-specific configurations for development, testing, and production.
*   **Logging**: Structured logging for application events and errors using Winston.
*   **Error Handling**: Global exception filtering for consistent API error responses.
*   **Caching**: Redis integration for improving API response times on read-heavy operations.
*   **Rate Limiting**: Protects API endpoints from abuse.
*   **Database Migrations**: Managed database schema evolution with TypeORM migrations.
*   **API Documentation**: Auto-generated Swagger/OpenAPI documentation.
*   **Containerization**: Docker and Docker Compose for easy setup and consistent environments.
*   **CI/CD**: Basic GitHub Actions workflow for automated testing and building.
*   **Comprehensive Testing**: Unit, Integration, and E2E API tests.

## 3. Technology Stack

### Backend
*   **Framework**: NestJS (TypeScript)
*   **Database**: PostgreSQL
*   **ORM**: TypeORM
*   **Authentication**: Passport.js (JWT Strategy)
*   **Caching**: Redis (via `cache-manager-redis-store`)
*   **Logging**: Winston
*   **File Uploads**: Multer
*   **Validation**: Class-validator, Class-transformer
*   **API Docs**: Swagger (OpenAPI)

### Frontend
*   **Framework**: React (TypeScript)
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS
*   **HTTP Client**: Axios
*   **State Management**: React Context API
*   **Routing**: React Router DOM

### Infrastructure
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions

## 4. Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js**: v18.x or higher
*   **npm**: v9.x or higher
*   **Docker & Docker Compose**: Latest stable version
*   **Git**: Latest stable version

## 5. Setup Instructions

The recommended way to run this project is using Docker Compose.

### Docker Setup (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/mlu-sys.git
    cd mlu-sys
    ```

2.  **Create environment files:**
    *   Create `backend/.env.development` by copying `backend/.env.example`.
    *   Create `frontend/.env.development` by copying `frontend/.env.example`.
    *   **Edit these `.env` files** to set your desired database credentials, JWT secret, and other configurations. For development, the example values are usually fine.
        *   **Backend example (`backend/.env.development`):**
            ```dotenv
            NODE_ENV=development
            PORT=3000
            API_GLOBAL_PREFIX=api/v1

            DATABASE_TYPE=postgres
            DATABASE_HOST=db
            DATABASE_PORT=5432
            DATABASE_USERNAME=user
            DATABASE_PASSWORD=password
            DATABASE_NAME=ml_utilities_db

            JWT_SECRET=yourStrongJwtSecretHere
            JWT_EXPIRES_IN=1d

            REDIS_HOST=redis
            REDIS_PORT=6379

            UPLOAD_PATH=./uploads

            ADMIN_EMAIL=admin@example.com
            ADMIN_PASSWORD=adminpassword123
            ```
        *   **Frontend example (`frontend/.env.development`):**
            ```dotenv
            VITE_API_BASE_URL=http://localhost:3000/api/v1
            ```

3.  **Build and run the Docker containers:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build Docker images for the backend and frontend.
    *   Start PostgreSQL and Redis services.
    *   Run database migrations and seed initial data (including an admin user based on `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `backend/.env.development`).
    *   Start the NestJS backend and React frontend.

4.  **Verify services are running:**
    ```bash
    docker-compose ps
    ```
    You should see `mlu-sys-backend`, `mlu-sys-frontend`, `mlu-sys-postgres`, and `mlu-sys-redis` in a healthy state.

5.  **Access the application:**
    *   **Frontend**: `http://localhost:3001`
    *   **Backend API**: `http://localhost:3000/api/v1`
    *   **Swagger API Docs**: `http://localhost:3000/api/v1/docs`

### Local Development (without Docker for services)

If you prefer to run services locally (e.g., your own PostgreSQL and Redis), you can do so.

1.  **Setup Database (PostgreSQL):**
    *   Install PostgreSQL and create a database (e.g., `ml_utilities_db`).
    *   Ensure your `backend/.env.development` points to your local PostgreSQL instance (e.g., `DATABASE_HOST=localhost`).
    *   Ensure Redis is running on `localhost:6379`.

2.  **Backend Setup:**
    ```bash
    cd backend
    npm install
    npm run migration:run # Run database migrations
    npm run seed:run     # Seed initial data (e.g., admin user)
    npm run start:dev    # Start in development mode
    ```

3.  **Frontend Setup:**
    ```bash
    cd frontend
    npm install
    npm run dev          # Start the frontend development server
    ```

4.  **Access:**
    *   Frontend: `http://localhost:5173` (Vite's default)
    *   Backend API: `http://localhost:3000/api/v1`

## 6. Database Management

*   **Migrations (Backend `backend/` directory):**
    *   Generate a new migration: `npm run migration:generate -- ./src/database/migrations/NewFeatureMigration`
    *   Run migrations: `npm run migration:run`
    *   Revert last migration: `npm run migration:revert`
*   **Seed Data (Backend `backend/` directory):**
    *   Run seed script: `npm run seed:run` (This creates an initial admin user if not exists).

## 7. API Documentation

The backend API is documented using Swagger (OpenAPI). Once the backend is running, you can access the interactive documentation at:

`http://localhost:3000/api/v1/docs` (or adjust port if changed)

This documentation allows you to explore all endpoints, their parameters, expected responses, and even make live API calls.

## 8. Frontend Usage

1.  **Register/Login**: Start by registering a new user or logging in with the seeded admin user (`admin@example.com`/`adminpassword123` if you used the seed script with default `.env`).
2.  **Dashboard**: Overview of your datasets and models.
3.  **Datasets**: Upload new datasets (e.g., CSV files), view details, update, and delete them.
4.  **Models**: Upload ML model files (e.g., `.pkl`, `.h5`), view details, version, update, mark as deployed, and delete.
5.  **Predictions**: For a deployed model, you can provide sample input data via the API (or integrate a form in the UI) to get a simulated prediction.
6.  **Users (Admin Only)**: Admin users can view, create, update, and delete other user accounts.

## 9. Testing

The project includes comprehensive tests to ensure quality and reliability.

*   **Backend Tests (`backend/` directory):**
    *   **Unit Tests**: `npm run test` (for services, DTOs, utilities)
    *   **Coverage**: `npm run test:cov` (aims for 80%+ coverage)
    *   **E2E (API) Tests**: `npm run test:e2e` (for controllers, API endpoints, authentication, authorization)
*   **Frontend Tests**: (Conceptual) For a full-scale project, Jest/React Testing Library would be used for unit/integration tests of components and pages. (Not fully implemented in this example due to extensive scope).
*   **Performance Tests**: (Conceptual) Tools like `Artillery` or `Loadtest` can be used to simulate high traffic. See `performance/` directory for example configurations.

## 10. CI/CD

A basic GitHub Actions workflow (`.github/workflows/ci.yml`) is provided for Continuous Integration:

*   **Build**: Builds both backend and frontend applications.
*   **Test**: Runs backend unit and E2E tests.
*   **Docker Build**: Builds Docker images for both services.

For Continuous Deployment, this workflow can be extended to push Docker images to a registry (e.g., Docker Hub, AWS ECR) and then deploy to a cloud provider (e.g., Kubernetes, AWS ECS).

## 11. Architecture

Refer to the [ARCHITECTURE.md](ARCHITECTURE.md) file for a detailed overview of the system's architecture, component breakdown, and data flow.

## 12. Deployment Guide

Refer to the [DEPLOYMENT.md](DEPLOYMENT.md) file for comprehensive instructions on deploying the MLU-Sys to various environments, including cloud providers.

## 13. Additional Notes

*   **ML Inference**: The prediction logic is *simulated*. In a real-world application, this would involve integrating with actual ML model serving frameworks (e.g., TensorFlow Serving, PyTorch Serve, BentoML, or a custom Python Flask/FastAPI service). The current design allows for `deploymentUrl` to point to such external services.
*   **File Storage**: Currently, files are stored locally on the server. For production, consider integrating with cloud storage solutions like AWS S3, Google Cloud Storage, or MinIO. The `FilesService` is designed to be abstract enough to swap out the underlying storage mechanism.
*   **Scalability**: The modular NestJS architecture, use of PostgreSQL for data, and Redis for caching provide a solid foundation for horizontal scalability.
*   **Security**: Implement HTTPS in production. Review and harden Docker images and server configurations.

## 14. License

This project is licensed under the [UNLICENSED](LICENSE) license.
```