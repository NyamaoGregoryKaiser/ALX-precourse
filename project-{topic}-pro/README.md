# ML-Utilities-Pro: Production-Ready Machine Learning Toolkit

## Overview

ML-Utilities-Pro is a comprehensive, production-ready full-stack application designed to provide a suite of machine learning utility functions. It features a robust backend API built with Node.js (Express.js), a dynamic frontend UI with React.js, and a PostgreSQL database. The system is containerized with Docker, includes CI/CD configurations, extensive testing, and thorough documentation.

This project focuses on demonstrating enterprise-grade software engineering principles, including:
*   Modular architecture
*   Robust authentication and authorization
*   Advanced error handling, logging, caching, and rate limiting
*   Database management with migrations and seeding
*   Comprehensive testing (unit, integration, API, performance)
*   Containerization and CI/CD for streamlined deployment
*   Detailed documentation for setup, architecture, API, and deployment

## Features

### Backend (Node.js/Express.js)
*   **Authentication & Authorization:** JWT-based authentication, password hashing with bcrypt, role-based authorization.
*   **User Management:** CRUD operations for users.
*   **Project Management:** Organize ML tasks into projects.
*   **ML Task Management:** Create, retrieve, update, and delete ML tasks, each representing a specific utility operation with its inputs, parameters, and outputs.
*   **Core ML Utilities:**
    *   **Data Preprocessing:** Min-Max Scaling, Standardization, One-Hot Encoding, Label Encoding, Missing Value Imputation (Mean, Median, Mode).
    *   **Model Evaluation Metrics:** Accuracy, Precision, Recall, F1-Score, MSE, RMSE, MAE (simulated, expecting `y_true` and `y_pred`).
*   **Middleware:** Centralized error handling, request logging, rate limiting, and basic API caching.
*   **Database:** PostgreSQL with Sequelize ORM, including migrations and seeders.
*   **API Documentation:** OpenAPI/Swagger specification.

### Frontend (React.js)
*   User-friendly interface for registration, login, and dashboard.
*   Create and manage ML projects.
*   Execute various ML utility tasks via intuitive forms.
*   Visualize results of ML utility operations.
*   Protected routes requiring authentication.

### Infrastructure & Operations
*   **Docker:** Containerization for both backend and frontend applications.
*   **Docker Compose:** Orchestration for easy local development setup (Node.js app, PostgreSQL, Redis).
*   **CI/CD:** GitHub Actions workflow for automated testing, linting, and building.

### Testing & Quality Assurance
*   **Backend:** Unit tests for services and utilities, integration tests for API routes and database interactions, performance tests using k6.
*   **Frontend:** Unit tests for components and hooks, integration tests for user flows.
*   High test coverage (aiming for 80%+).

## Technologies Used

*   **Backend:** Node.js, Express.js, PostgreSQL, Sequelize, JWT, bcrypt, Winston, Redis
*   **Frontend:** React.js, React Router, Axios, Tailwind CSS (for simplicity)
*   **Testing:** Jest, Supertest, React Testing Library, k6
*   **DevOps:** Docker, Docker Compose, GitHub Actions
*   **Documentation:** Markdown, OpenAPI/Swagger

## Setup Instructions

### Prerequisites

*   Docker Desktop (includes Docker Engine and Docker Compose)
*   Git

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ml-utilities-pro.git
cd ml-utilities-pro
```

### 2. Environment Configuration

Create `.env` files in both the `backend` and `frontend` directories based on their respective `.env.example` files.

#### `backend/.env`

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgres://user:password@db:5432/ml_utilities_db
JWT_SECRET=your_jwt_secret_key_here_for_prod_use_a_strong_one
JWT_EXPIRES_IN=1d
REDIS_HOST=redis
REDIS_PORT=6379
RATE_LIMIT_WINDOW_MS=60000 # 1 minute
RATE_LIMIT_MAX=100 # Max 100 requests per window
CACHE_TTL_SECONDS=3600 # 1 hour
```
**Note:** For `DATABASE_URL`, ensure `db` matches the service name in `docker-compose.yml`. The `user` and `password` should match the `POSTGRES_USER` and `POSTGRES_PASSWORD` in `docker-compose.yml`.

#### `frontend/.env`

```env
NODE_ENV=development
REACT_APP_API_BASE_URL=http://localhost:5000/api
```
**Note:** `REACT_APP_API_BASE_URL` should point to your backend API. If running locally via Docker Compose, `localhost:5000` is correct.

### 3. Build and Run with Docker Compose (Recommended)

This method sets up the entire stack (PostgreSQL, Redis, Backend, Frontend) with a single command.

```bash
docker-compose up --build -d
```

*   `--build`: Builds images if they don't exist or have changed.
*   `-d`: Runs containers in detached mode (in the background).

### 4. Database Migrations and Seeding

Once the backend container is up and the database is accessible, you'll need to run migrations and seed the database.
You can execute commands inside the running backend container:

```bash
docker exec -it ml-utilities-pro_backend_1 npx sequelize-cli db:migrate
docker exec -it ml-utilities-pro_backend_1 npx sequelize-cli db:seed:all
```
(Replace `ml-utilities-pro_backend_1` with the actual name of your backend container if it's different. You can find it with `docker ps`).

### 5. Access the Application

*   **Frontend:** `http://localhost:3000`
*   **Backend API:** `http://localhost:5000/api`
*   **Swagger API Docs:** `http://localhost:5000/api-docs`

### 6. Stop the Application

```bash
docker-compose down
```

This will stop and remove containers, networks, and volumes defined in `docker-compose.yml`.

## Development without Docker (Alternative)

If you prefer to run services individually without Docker Compose (e.g., your own local PostgreSQL instance):

#### Backend

```bash
cd backend
npm install
# Ensure PostgreSQL is running and your .env is configured correctly
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all # Optional
npm start
```
The backend will run on `http://localhost:5000`.

#### Frontend

```bash
cd frontend
npm install
npm start
```
The frontend will run on `http://localhost:3000`.

## Running Tests

### Backend Tests

```bash
cd backend
npm test
# For coverage
npm test -- --coverage
```

### Frontend Tests

```bash
cd frontend
npm test
# For coverage
npm test -- --coverage --watchAll=false
```

### Performance Tests (Backend)

We use `k6` for performance testing. Ensure `k6` is installed globally or available in your environment.

```bash
# Example performance test run (from backend directory)
cd backend
k6 run tests/performance/api.test.js
```
(You might need to adjust the `host` in `api.test.js` if running in a non-Docker setup, e.g., `http://localhost:5000`).

## API Documentation (Swagger/OpenAPI)

Once the backend is running, the API documentation is available at `http://localhost:5000/api-docs`.

---

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License.

---