```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '@pages/Auth/LoginPage';
import { AuthContext } from '@contexts/AuthContext';
import * as api from '@api/auth.api'; // Assuming you have an auth.api.ts
import { toast } from 'react-hot-toast';

// Mock the auth API calls
jest.mock('@api/auth.api', () => ({
  loginUser: jest.fn(),
}));

// Mock toast notifications
jest.mock('react-hot-toast');

describe('LoginPage', () => {
  const mockAuthContext = {
    isAuthenticated: false,
    user: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
  };

  const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
    window.history.pushState({}, 'Test page', route);
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          {ui}
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthContext.login.mockResolvedValue(true); // Default success for login
  });

  it('should render login form fields', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
  });

  it('should display validation errors for empty fields', async () => {
    renderWithRouter(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
    });
  });

  it('should call login API and update auth context on successful login', async () => {
    const email = 'test@example.com';
    const password = 'Password123!';
    (api.loginUser as jest.Mock).mockResolvedValue({
      accessToken: 'fake_access_token',
      refreshToken: 'fake_refresh_token',
      user: { id: '1', email, username: 'testuser', role: 'USER' },
    });

    renderWithRouter(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: email } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(api.loginUser).toHaveBeenCalledWith(email, password);
      expect(mockAuthContext.login).toHaveBeenCalledWith(
        'fake_access_token',
        'fake_refresh_token',
        { id: '1', email, username: 'testuser', role: 'USER' }
      );
      expect(toast.success).toHaveBeenCalledWith('Login successful!');
      expect(window.location.href).toBe('/dashboard'); // Should redirect after login
    });
  });

  it('should display error toast on failed login', async () => {
    const email = 'wrong@example.com';
    const password = 'wrongpassword';
    (api.loginUser as jest.Mock).mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } },
    });

    renderWithRouter(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: email } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(api.loginUser).toHaveBeenCalledWith(email, password);
      expect(mockAuthContext.login).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Invalid credentials');
    });
  });

  it('should navigate to register page when "Sign Up" is clicked', () => {
    renderWithRouter(<LoginPage />);
    fireEvent.click(screen.getByText(/Sign Up/i));
    expect(window.location.href).toBe('/register');
  });
});
```

### 5. Documentation

#### Overall README.md

```markdown
# Collaborative Task Management System

A full-stack, enterprise-grade application for managing projects and tasks, supporting user authentication, role-based access, and real-time collaboration features (conceptual).

## Table of Contents

1.  [Introduction](#1-introduction)
2.  [Features](#2-features)
3.  [Technology Stack](#3-technology-stack)
4.  [Architecture](#4-architecture)
5.  [Setup and Installation](#5-setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development with Docker Compose](#local-development-with-docker-compose)
    *   [Manual Setup (Backend)](#manual-setup-backend)
    *   [Manual Setup (Frontend)](#manual-setup-frontend)
6.  [Running the Application](#6-running-the-application)
7.  [Database Operations](#7-database-operations)
8.  [Testing](#8-testing)
9.  [API Documentation](#9-api-documentation)
10. [CI/CD](#10-cicd)
11. [Deployment Guide](#11-deployment-guide)
12. [Additional Features](#12-additional-features)
13. [Contributing](#13-contributing)
14. [License](#14-license)

---

### 1. Introduction

This project demonstrates a comprehensive, production-ready API development system. It's built with a strong focus on clean architecture, testability, scalability, and maintainability, adhering to best practices for modern software engineering.

### 2. Features

*   **User Management**: Register, Login, Logout, Profile Management (CRUD for users).
*   **Authentication & Authorization**: JWT-based authentication, Role-Based Access Control (RBAC) (Admin/User roles).
*   **Project Management**: Create, Read, Update, Delete projects.
*   **Task Management**: Create, Read, Update, Delete tasks, assign tasks to users, set priorities and due dates.
*   **Data Validation**: Robust input validation using Joi.
*   **Error Handling**: Centralized error handling middleware.
*   **Logging**: Structured logging with Winston.
*   **Caching**: Redis integration for performance optimization (e.g., refresh tokens, potential data caching).
*   **Rate Limiting**: Protects against brute-force attacks and abuse.
*   **Database Management**: PostgreSQL with TypeORM, including migrations and seeding.
*   **Containerization**: Docker for isolated development and deployment environments.
*   **Comprehensive Testing**: Unit, Integration, and API tests with coverage reporting.
*   **Interactive API Documentation**: OpenAPI/Swagger Specification.
*   **CI/CD Pipeline**: Automated build, test, and deployment (conceptual using GitHub Actions).
*   **Frontend UI**: A basic React application to demonstrate API consumption and user interaction.

### 3. Technology Stack

*   **Backend**: Node.js, Express.js, TypeScript
*   **Database**: PostgreSQL
*   **ORM**: TypeORM
*   **Authentication**: JSON Web Tokens (JWT), bcryptjs for password hashing
*   **Caching/Rate Limiting**: Redis, ioredis, express-rate-limit-redis
*   **Validation**: Joi
*   **Logging**: Winston, winston-daily-rotate-file
*   **Testing**: Jest, Supertest
*   **Development Tools**: Nodemon, ts-node
*   **Frontend**: React, TypeScript, Vite, Axios
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions (configuration provided)

### 4. Architecture

The system follows a modular, layered architecture:

*   **Client Layer (Frontend)**: React.js application for user interaction.
*   **API Layer (Backend)**: Node.js/Express.js, exposing RESTful endpoints.
    *   **Controllers**: Handle HTTP requests, validate input, delegate to services.
    *   **Services**: Encapsulate business logic, orchestrate data operations.
    *   **Repositories**: Interface with the database (TypeORM), abstracting data access.
    *   **Middleware**: Handles cross-cutting concerns (authentication, authorization, logging, error handling, rate limiting).
    *   **Configuration**: Manages environment variables, database, and Redis connections.
*   **Database Layer**: PostgreSQL, managed by TypeORM for schema, migrations, and data manipulation.
*   **Caching Layer**: Redis, used for session management (refresh tokens) and potential data caching.

```mermaid
graph TD
    User["User/Browser"] --> |HTTP/HTTPS| Frontend[("Frontend (React.js)")]
    Frontend -- HTTP/HTTPS --> Nginx[("Nginx (Frontend Server/Reverse Proxy)")]
    Nginx -- Proxy API requests --> Backend[("Backend (Node.js/Express.js)")]

    subgraph Backend Services
        Backend --> Caching(Redis)
        Backend --> Database(PostgreSQL)
    end

    subgraph Backend Component Flow
        API_Request(API Request) --> Middleware(Authentication/Authorization/Logging/Rate Limit)
        Middleware --> Controller(Controller)
        Controller --> Service(Service/Business Logic)
        Service --> Repository(Repository/Data Access)
        Repository --> Database
        Database --> Repository
        Repository --> Service
        Service --> Controller
        Controller --> API_Response(API Response)
    end
```

### 5. Setup and Installation

#### Prerequisites

*   Node.js (v18+) and npm (or yarn)
*   Docker and Docker Compose (recommended for ease of setup)
*   PostgreSQL (if running backend manually)
*   Redis (if running backend manually)

#### Local Development with Docker Compose (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/task-management-system.git
    cd task-management-system
    ```

2.  **Create `.env` file:**
    Copy `.env.example` from the root of the project to a new file named `.env` in the project root.
    ```bash
    cp .env.example .env
    ```
    Review and update the environment variables in `.env` if necessary. Especially `JWT_SECRET` and `REDIS_PASSWORD` for production.

3.  **Build and run services with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build Docker images for the backend and frontend.
    *   Start PostgreSQL database, Redis, backend API, and frontend Nginx servers.
    *   The `--build` flag ensures images are rebuilt with the latest code.
    *   The `-d` flag runs containers in detached mode.

4.  **Run database migrations and seed data:**
    Once the `backend` container is running (it might take a moment for the DB to be healthy):
    ```bash
    docker-compose exec backend npm run db:migrate
    docker-compose exec backend npm run db:seed
    ```
    This will set up your database schema and populate it with initial data, including an admin user.

    *   **Admin User Credentials (from `.env`):**
        *   Username: `admin`
        *   Email: `admin@example.com`
        *   Password: `adminpassword`

5.  **Access the application:**
    *   **Backend API**: `http://localhost:5000/api/v1`
    *   **Frontend UI**: `http://localhost` (Nginx proxies API calls to `http://backend:5000/api/v1`)

#### Manual Setup (Backend)

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create `.env` file:**
    Copy `.env.example` from `backend/` to a new file named `.env` in the `backend/` directory.
    ```bash
    cp .env.example .env
    ```
    Ensure your `DB_HOST`, `DB_PORT`, `REDIS_HOST`, `REDIS_PORT` point to your locally running PostgreSQL and Redis instances.

4.  **Start PostgreSQL and Redis manually.**

5.  **Run database migrations and seed data:**
    ```bash
    npm run db:migrate
    npm run db:seed
    ```

#### Manual Setup (Frontend)

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create `.env` file:**
    Copy `.env.example` from `frontend/` to a new file named `.env` in the `frontend/` directory.
    ```bash
    cp .env.example .env
    ```
    Ensure `VITE_API_BASE_URL` points to your running backend API (e.g., `http://localhost:5000/api/v1`).

### 6. Running the Application

*   **With Docker Compose:** `docker-compose up -d` (if already set up)
*   **Backend (Manual):**
    ```bash
    cd backend
    npm run dev # For development with hot-reloading
    # or
    npm start # For production (runs compiled JS)
    ```
*   **Frontend (Manual):**
    ```bash
    cd frontend
    npm run dev # For development with hot-reloading
    ```

### 7. Database Operations (Backend)

*   **Run Migrations:**
    ```bash
    cd backend
    npm run db:migrate
    ```
*   **Create a new Migration:**
    ```bash
    cd backend
    npm run db:migrate:create -- NAME=YourMigrationName
    ```
    (Replace `YourMigrationName` with a descriptive name)
*   **Undo Last Migration:**
    ```bash
    cd backend
    npm run db:migrate:undo
    ```
*   **Run Seeders:**
    ```bash
    cd backend
    npm run db:seed
    ```
*   **Reset Database (Drop Schema, Migrate, Seed):**
    ```bash
    cd backend
    npm run db:reset
    ```
    **WARNING**: This will delete all data and reset your database. Use with caution.

### 8. Testing

The project includes Unit, Integration, and API tests.

*   **Backend Tests:**
    ```bash
    cd backend
    npm test          # Run all tests with coverage
    npm run test:watch # Run tests in watch mode
    ```
    *(Note: Integration tests require a running PostgreSQL and Redis instance, ideally a dedicated test database.)*

*   **Frontend Tests:**
    ```bash
    cd frontend
    npm test          # Run all tests
    npm run test:watch # Run tests in watch mode
    ```

**Coverage Goals:**
The `backend/package.json` is configured to enforce 80% coverage for branches, functions, lines, and statements for most source files (excluding configs, dtos, etc.).

### 9. API Documentation

An OpenAPI (Swagger) specification for the API is provided, detailing available endpoints, request/response formats, authentication requirements, and error codes.

*   **View OpenAPI Spec:** `backend/openapi.yaml` (You can view this using tools like Swagger UI or editor extensions)

**(Self-correction: I will provide a sample `openapi.yaml` file to fulfill this requirement.)**

### 10. CI/CD

A conceptual CI/CD pipeline configuration using GitHub Actions is provided in `.github/workflows/ci.yml`. This pipeline automates:

*   **Code Checkout**
*   **Dependency Installation**
*   **Linting**
*   **Database Setup (for backend tests)**
*   **Running Tests (backend & frontend)**
*   **Coverage Reporting**
*   **Building the application (backend & frontend)**
*   **Artifact Upload** (for deployment)

### 11. Deployment Guide

This section outlines a general strategy for deploying the application to a cloud provider like AWS (e.g., EC2/ECS, RDS, ElastiCache).

1.  **Cloud Provider Setup**:
    *   **VPC**: Create a Virtual Private Cloud (VPC) with public and private subnets.
    *   **Database (RDS)**: Provision a PostgreSQL instance in a private subnet. Configure security groups to allow access only from the backend application.
    *   **Cache (ElastiCache/Redis)**: Provision a Redis instance in a private subnet.
    *   **Container Registry (ECR)**: Create repositories for your backend and frontend Docker images.

2.  **Build and Push Docker Images**:
    *   The CI pipeline (`.github/workflows/ci.yml`) is designed to build the Docker images.
    *   Modify the CI/CD pipeline to include steps to log in to ECR and push the built `backend` and `frontend` images to your ECR repositories.

3.  **Application Deployment (Example: AWS ECS/Fargate)**:
    *   **ECS Cluster**: Create an ECS cluster.
    *   **Task Definitions**: Create Task Definitions for both your backend and frontend services.
        *   Backend Task Definition:
            *   Specify the ECR image for the backend.
            *   Configure environment variables (DB credentials, JWT_SECRET, Redis details, etc. from AWS Secrets Manager or Parameter Store).
            *   Define port mappings (e.g., 5000).
            *   Set resource limits.
        *   Frontend Task Definition:
            *   Specify the ECR image for the frontend (Nginx).
            *   Define port mappings (e.g., 80).
            *   Set resource limits.
    *   **ECS Services**: Create ECS Services for each Task Definition.
        *   Associate the services with your cluster and appropriate subnets.
        *   Configure desired count (number of instances).
        *   **Load Balancer (ALB)**: Create an Application Load Balancer (ALB).
            *   Frontend Listener: Route traffic from port 80/443 to the frontend ECS service.
            *   Backend Listener: (Optional) If you want to expose backend directly, but typically frontend proxies to it.
            *   Configure health checks.
        *   Configure autoscaling policies for services based on CPU/memory usage.

4.  **DNS Configuration**:
    *   Update your DNS records (e.g., Route 53) to point your domain name to the ALB's DNS name.
    *   Configure HTTPS with AWS Certificate Manager (ACM) for your domain and attach the certificate to the ALB listener.

5.  **Monitoring & Logging**:
    *   Configure CloudWatch Logs for containers.
    *   Set up CloudWatch Alarms for CPU, memory, error rates, etc.
    *   Consider dedicated monitoring tools like Prometheus/Grafana or Datadog.

### 12. Additional Features

*   **Authentication/Authorization**: Implemented JWT-based authentication and Role-Based Access Control (Admin/User). Refresh tokens are managed with Redis.
*   **Logging and Monitoring**: Structured logging with Winston. Logs are rotated daily and separated for application and errors. Integrates with HTTP requests.
*   **Error Handling Middleware**: Centralized Express error handler for consistent API error responses. Catches validation errors, database errors, and custom application errors.
*   **Caching Layer**: Redis is used for storing refresh tokens and can be extended for caching frequently accessed data (e.g., user profiles, project lists).
*   **Rate Limiting**: Implemented using `express-rate-limit` with a Redis store to prevent abuse and protect against brute-force attacks.

### 13. Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write tests for your changes.
5.  Ensure all tests pass (`npm test`).
6.  Ensure code is linted (`npm run lint:fix`).
7.  Commit your changes (`git commit -m 'feat: Add new feature'`).
8.  Push to the branch (`git push origin feature/your-feature-name`).
9.  Create a Pull Request.

### 14. License

This project is licensed under the [MIT License](LICENSE).
```

#### API Documentation (OpenAPI YAML)