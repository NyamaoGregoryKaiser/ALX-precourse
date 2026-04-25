```markdown
# Enterprise Security System

A comprehensive, production-ready security implementation system built with Node.js (Express), PostgreSQL, Redis, Docker, and full CI/CD integration. This project focuses on demonstrating robust security practices, including authentication, authorization (RBAC), logging, error handling, caching, and rate limiting.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
  - [Prerequisites](#prerequisites)
  - [Local Setup (without Docker)](#local-setup-without-docker)
  - [Local Setup (with Docker)](#local-setup-with-docker)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Architecture Documentation](#architecture-documentation)
- [CI/CD Pipeline](#ci-cd-pipeline)
- [Additional Notes](#additional-notes)
- [Contributing](#contributing)
- [License](#license)

## Features

- **User Authentication**: JWT-based authentication (access and refresh tokens).
- **Password Security**: `bcrypt.js` for password hashing.
- **Role-Based Access Control (RBAC)**: Granular authorization middleware to restrict access based on user roles (`user`, `admin`).
- **Input Validation**: `Joi` for validating API request payloads.
- **Centralized Error Handling**: Custom `AppError` and global error handling middleware for consistent error responses.
- **Logging and Monitoring**: `Winston` for structured logging (console, file), `Morgan` for HTTP request logging. Basic health check endpoint.
- **Caching Layer**: `Redis` integration with `ioredis` for API response caching to improve performance.
- **Rate Limiting**: `express-rate-limit` middleware to protect against brute-force attacks and DDoS.
- **Security Headers**: `Helmet` middleware to set various HTTP headers for enhanced security.
- **CORS**: Configured `cors` middleware for controlled cross-origin resource sharing.
- **HTTP Parameter Pollution Protection**: `hpp` middleware.
- **Compression**: `compression` middleware for efficient data transfer.
- **Database Layer**: PostgreSQL with `Sequelize` ORM for schema definition, migrations, and seeding.
- **Dockerization**: `Dockerfile` and `docker-compose.yml` for containerized development and deployment.
- **CI/CD Pipeline**: Configuration for GitHub Actions (build, test, deploy).
- **Comprehensive Testing**: Unit, Integration, and API tests using `Jest` and `Supertest` with `80%+` coverage target.
- **Frontend Demo**: A minimal `index.html` with vanilla JS to interact with the API.
- **Documentation**: Detailed README, API Documentation, and Architecture Documentation.

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Caching/Session**: Redis, ioredis
- **Authentication**: JSON Web Tokens (JWT), bcrypt.js
- **Validation**: Joi
- **Logging**: Winston, Morgan
- **Security**: Helmet, CORS, hpp, express-rate-limit
- **Testing**: Jest, Supertest
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions

## Project Structure

```
├── .github/                       # GitHub Actions CI/CD workflows
├── config/                        # Application configuration files
├── controllers/                   # Request handling logic
├── db/                            # Database setup (models, migrations, seeders)
├── middleware/                    # Express middleware for security, caching, error handling
├── public/                        # Simple HTML/JS frontend demo
├── routes/                        # API route definitions
├── services/                      # Business logic layer
├── utils/                         # Utility functions (JWT, logger, cache)
├── tests/                         # Unit, integration, and API tests
├── .env.example                   # Environment variables template
├── app.js                         # Express application setup
├── server.js                      # Application entry point
├── package.json                   # Project dependencies and scripts
├── Dockerfile                     # Docker build instructions
├── docker-compose.yml             # Docker Compose for multi-service setup
├── README.md                      # This document
├── API_DOCUMENTATION.md           # Detailed API reference
└── ARCHITECTURE_DOCUMENTATION.md  # System architecture overview
```

## Setup Instructions

### Prerequisites

- Node.js (v20 or higher) & npm (comes with Node.js)
- Docker & Docker Compose (for containerized setup)
- Git

### Local Setup (without Docker)

This setup requires you to have PostgreSQL and Redis installed and running directly on your machine.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/enterprise-security-system.git
    cd enterprise-security-system
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory by copying from `.env.example`:
    ```bash
    cp .env.example .env
    ```
    Edit the `.env` file and fill in your PostgreSQL and Redis connection details, and set strong secrets for `APP_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET`.

    **Example `.env` content:**
    ```
    NODE_ENV=development
    PORT=5000
    APP_SECRET=your_super_secret_app_key_for_jwt_signing

    DB_DIALECT=postgres
    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=postgres
    DB_PASS=mysecretpassword
    DB_NAME=enterprise_db
    DB_TEST_NAME=enterprise_test_db # For Jest tests

    REDIS_HOST=localhost
    REDIS_PORT=6379
    REDIS_PASSWORD=

    JWT_SECRET=your_jwt_secret_key_change_me
    JWT_EXPIRES_IN=1d
    JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_change_me
    JWT_REFPIRES_IN=7d

    RATE_LIMIT_WINDOW_MS=60000
    RATE_LIMIT_MAX_REQUESTS=100

    CLIENT_URL=http://localhost:5000 # Adjust if frontend is on different port
    LOG_LEVEL=info
    ```
    **Important:** Ensure your PostgreSQL server is running and accessible with the specified credentials, and Redis server is running on `localhost:6379`.

4.  **Database Setup:**
    Run migrations and seed the database:
    ```bash
    npx sequelize db:migrate
    npx sequelize db:seed:all
    ```
    *If you get an error about `uuid-ossp` extension*, you might need to enable it manually in your PostgreSQL database:
    Connect to your `enterprise_db` (or `enterprise_test_db`) via `psql` or a client like DBeaver/PgAdmin and run:
    ```sql
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    ```
    Then retry the migrations.

### Local Setup (with Docker)

This is the recommended way to set up the project, as it includes PostgreSQL and Redis as services.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/enterprise-security-system.git
    cd enterprise-security-system
    ```

2.  **Configure Environment Variables:**
    The `docker-compose.yml` file sets environment variables directly for the services. However, for secrets, it's better to use a `.env` file for docker compose.
    Create a `.env` file in the root directory by copying from `.env.example`. Make sure to fill in `DB_USER`, `DB_PASS`, `APP_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET` matching the values in `docker-compose.yml` or override them there.

3.  **Build and Run with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    - Build the Node.js application image.
    - Pull PostgreSQL and Redis images.
    - Create and start the `app`, `db`, and `redis` containers.
    - Map port 5000 of the container to port 5000 on your host machine for the Node.js app.
    - Map port 5432 for PostgreSQL and 6379 for Redis.

4.  **Run Database Migrations and Seeding (inside Docker):**
    Once the containers are up, execute migrations and seeds within the `app` container:
    ```bash
    docker exec -it enterprise-app npm run db:migrate
    docker exec -it enterprise-app npm run db:seed
    ```
    *Note:* If you encounter a UUID extension error, you might need to run `docker exec -it enterprise-db psql -U your_db_user -d enterprise_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"` (replace `your_db_user` and `enterprise_db` with your actual values) before running migrations.

## Running the Application

After setting up (either locally or with Docker):

-   **Start the application (development mode with Nodemon):**
    ```bash
    npm run dev
    ```
    (This requires `nodemon` which is a dev dependency. For Docker, `docker-compose up` runs `npm start` which executes `node server.js`).

The API server will be running on `http://localhost:5000`.

-   **Access the Frontend Demo:**
    Open `http://localhost:5000` in your web browser. This will serve `public/index.html` which contains a simple JavaScript client to interact with the API endpoints.

## Testing

The project includes comprehensive tests: unit, integration, and API tests.

1.  **Ensure Test Database and Redis are Ready:**
    The `tests/setup.test.js` file handles connecting to a *separate test database* (`DB_TEST_NAME` from `.env`) and test Redis.
    You need to manually prepare the test database and Redis before running tests locally (this is handled in the CI/CD pipeline).

    If running locally, first make sure your `DB_TEST_NAME` database exists and your Redis test port (`REDIS_PORT=6380` by default in `docker-compose.test.yml`) is available.

    A `docker-compose.test.yml` is provided for the CI environment but can be used locally for isolated testing:
    ```bash
    docker-compose -f docker-compose.test.yml up -d
    # Wait a few seconds for services to start
    docker exec -it enterprise-db-test psql -U test_user -d enterprise_test_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" # if needed
    npm run db:migrate -- --env test # Apply migrations to test DB
    npm run db:seed -- --env test # Seed test DB
    ```

2.  **Run all tests:**
    ```bash
    npm test
    ```
    This will run Jest, generate a coverage report, and exit.

3.  **Run tests in watch mode:**
    ```bash
    npm run test:watch
    ```

## API Documentation

Refer to `API_DOCUMENTATION.md` for a detailed breakdown of all API endpoints, including methods, URLs, request/response formats, and security requirements.

## Architecture Documentation

Refer to `ARCHITECTURE_DOCUMENTATION.md` for an overview of the system's architecture, component interactions, data flow, and security considerations.

## CI/CD Pipeline

The project includes a GitHub Actions workflow defined in `.github/workflows/ci-cd.yml`.

-   **Build Job**: Installs dependencies, runs ESLint for code quality, and executes all tests. It also uploads a code coverage report to Codecov.
-   **Deploy Job**: (Triggered on pushes to `main` branch, and only if `build` job passes). Logs into Docker Hub, builds and pushes the Docker image to a specified repository, and then deploys to a remote server via SSH (e.g., pulling the new image and restarting containers).

**To enable the CI/CD pipeline:**
1.  **Codecov**: Obtain a Codecov token and add it to your GitHub repository secrets as `CODECOV_TOKEN`.
2.  **Docker Hub**: Add your Docker Hub username and password to GitHub repository secrets as `DOCKER_USERNAME` and `DOCKER_PASSWORD`. Update the Docker image tag in the workflow file to `your-dockerhub-username/enterprise-security-app:latest`.
3.  **Deployment Server**: Configure SSH secrets (`SSH_HOST`, `SSH_USERNAME`, `SSH_KEY`) for your deployment server. Update the `script` in the deploy job to match your server's deployment strategy and application path.

## Additional Notes

-   **Secrets Management**: In a production environment, sensitive information like `APP_SECRET`, `JWT_SECRET`, `DB_PASS`, `REDIS_PASSWORD` should be managed using dedicated secret management services (e.g., AWS Secrets Manager, HashiCorp Vault, Kubernetes Secrets) rather than direct environment variables or `.env` files. Docker Compose values are for local development/testing convenience.
-   **Scalability**: The current setup is a monolithic API. For higher scalability, consider microservices architecture, load balancers, and container orchestration (Kubernetes).
-   **Observability**: Beyond basic logging and health checks, integrate with external monitoring tools (e.g., Prometheus, Grafana, ELK stack) for comprehensive metrics, tracing, and alerting.
-   **Security Audits**: Regularly perform security audits, penetration testing, and vulnerability scanning.
-   **HTTPS**: Always deploy with HTTPS in production. This is handled by a reverse proxy (like Nginx or Caddy) or a cloud load balancer, not directly by the Node.js application.

## Contributing

Feel free to fork this repository, open issues, and submit pull requests. Adhere to code quality standards, write tests for new features, and update documentation.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details (not included in this response, but implied).
```