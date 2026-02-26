# Mobile App Backend System

A comprehensive, production-ready backend system for mobile applications, built with TypeScript, Node.js, Express, and PostgreSQL. This project adheres to enterprise-grade standards, focusing on scalability, security, and maintainability.

## Table of Contents

1.  [Features](#features)
2.  [Technologies Used](#technologies-used)
3.  [Project Structure](#project-structure)
4.  [Setup and Installation](#setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Local Development](#local-development)
    *   [Docker Setup](#docker-setup)
5.  [Running the Application](#running-the-application)
6.  [Database Operations](#database-operations)
7.  [Testing](#testing)
8.  [API Documentation](#api-documentation)
9.  [Architecture Overview](#architecture-overview)
10. [Deployment Guide](#deployment-guide)
11. [Frontend Example](#frontend-example)
12. [Contributing](#contributing)
13. [License](#license)

## 1. Features

This backend system provides a robust set of features essential for modern mobile applications:

*   **User Management**: Registration, Login, Profile Management (CRUD).
*   **Authentication & Authorization**: JWT-based authentication, Role-Based Access Control (RBAC) for `user` and `admin` roles.
*   **Product Catalog**: CRUD operations for products, including categorization, image URLs, stock management.
*   **Order Management**: Creation, retrieval, and status updates for user orders with multiple items.
*   **Reviews & Ratings**: Users can leave reviews and ratings for products.
*   **Data Validation**: Joi schemas for robust input validation.
*   **Error Handling**: Centralized, consistent error responses with custom `AppError` class.
*   **Logging**: Structured logging with Winston for monitoring and debugging.
*   **Caching**: Redis integration for faster data retrieval (e.g., product lists, single products).
*   **Rate Limiting**: Protects API endpoints from abuse and brute-force attacks.
*   **Database**: PostgreSQL as the primary data store with TypeORM for ORM capabilities.
*   **Migrations**: Database schema evolution managed via TypeORM migrations.
*   **Testing**: Comprehensive suite of Unit, Integration, and API tests.
*   **Dockerization**: Docker and Docker Compose setup for isolated development and deployment environments.
*   **CI/CD**: GitHub Actions workflow for automated build, test, and deployment.
*   **API Documentation**: Interactive API documentation using Swagger UI (OpenAPI 3.0).

## 2. Technologies Used

*   **Backend**: Node.js, Express.js
*   **Language**: TypeScript
*   **Database**: PostgreSQL
*   **ORM**: TypeORM
*   **Authentication**: JSON Web Tokens (JWT), Bcrypt.js
*   **Validation**: Joi
*   **Caching**: Redis (via `ioredis`)
*   **Logging**: Winston
*   **Security**: Helmet, Express-Rate-Limit
*   **Testing**: Jest, Supertest
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions
*   **API Docs**: Swagger-jsdoc, Swagger-ui-express

## 3. Project Structure

The project is organized into a modular and layered architecture for clarity and maintainability:

```
.
├── src/                      # Source code
│   ├── app.ts                # Express app setup
│   ├── server.ts             # Application entry point
│   ├── config/               # Environment variables, Swagger config
│   ├── database/             # TypeORM entities, migrations, data-source, seeders
│   ├── middleware/           # Auth, error handling, rate limiting
│   ├── api/                  # API routes, controllers, services, repositories, validators
│   │   └── v1/               # API Version 1
│   │       ├── controllers/  # Handles incoming requests, interacts with services
│   │       ├── services/     # Contains business logic
│   │       ├── repositories/ # Data Access Layer (TypeORM interaction)
│   │       ├── routes/       # API endpoint definitions
│   │       └── validators/   # Input validation schemas (Joi)
│   ├── utils/                # Helper utilities (JWT, logger, Redis client, custom errors)
│   └── types/                # Custom TypeScript type definitions
├── tests/                    # Unit, Integration, API tests
│   ├── unit/
│   ├── integration/
│   └── api/
├── frontend-example/         # Minimal HTML/JS client to demonstrate API interaction
├── docs/                     # Documentation files (API, Architecture)
├── .env.example              # Example environment variables file
├── Dockerfile                # Docker image definition for the backend
├── docker-compose.yml        # Docker orchestration for backend, DB, Redis
├── .github/                  # GitHub Actions CI/CD workflows
├── package.json              # Project dependencies and scripts
├── tsconfig.json             # TypeScript compiler configuration
├── jest.config.ts            # Jest test configuration
├── README.md                 # Project documentation (this file)
```

## 4. Setup and Installation

### Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js**: v20 or higher (LTS recommended)
*   **npm**: (comes with Node.js) v9 or higher
*   **TypeScript**: v5 or higher (`npm install -g typescript`)
*   **Docker & Docker Compose**: (Optional, but recommended for local development and deployment)

### Local Development (without Docker)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/mobile-backend-system.git
    cd mobile-backend-system
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the project root by copying `.env.example`:
    ```bash
    cp .env.example .env
    ```
    Edit the `.env` file and fill in the values, especially for `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `JWT_SECRET`, and `REDIS_URL`. For local development, `DB_HOST` can be `localhost` if PostgreSQL is running directly, and `REDIS_URL` can be `redis://localhost:6379`.

4.  **Start PostgreSQL and Redis:**
    Ensure you have a PostgreSQL database and a Redis instance running locally, configured according to your `.env` file. You can use Docker for this even if running the backend outside Docker:
    ```bash
    docker-compose up postgres-db redis-cache -d
    ```

5.  **Run database migrations:**
    ```bash
    npm run migration:run
    ```

6.  **Seed the database (optional):**
    ```bash
    npm run seed:run
    ```

7.  **Start the development server:**
    ```bash
    npm run dev
    ```
    The server will start on `http://localhost:3000` (or your configured PORT). API documentation will be available at `http://localhost:3000/api-docs`.

### Docker Setup (Recommended)

1.  **Clone the repository** (if you haven't already).
2.  **Set up environment variables:**
    Create a `.env` file as described above. When using `docker-compose`, `DB_HOST` should be `postgres-db` (the service name in `docker-compose.yml`) and `REDIS_URL` should be `redis://redis-cache:6379`.
    ```bash
    cp .env.example .env
    # Edit .env for Docker-Compose:
    # DB_HOST=postgres-db
    # REDIS_URL=redis://redis-cache:6379
    ```

3.  **Build and run all services with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    This will:
    *   Build the backend Docker image.
    *   Start PostgreSQL, Redis, and the backend service in isolated containers.
    *   Expose backend on port 3000, PostgreSQL on 5432, Redis on 6379 on your host machine.

4.  **Run database migrations inside the backend container:**
    ```bash
    docker-compose exec backend npm run migration:run
    ```

5.  **Seed the database (optional) inside the backend container:**
    ```bash
    docker-compose exec backend npm run seed:run
    ```

The backend API will now be accessible at `http://localhost:3000/api/v1` and the Swagger UI at `http://localhost:3000/api-docs`.

## 5. Running the Application

*   **Development Mode (Local)**: `npm run dev` (watches for file changes and restarts)
*   **Production Mode (Local)**: First `npm run build`, then `npm start`
*   **Production Mode (Docker)**: `docker-compose up -d` (after initial setup)

## 6. Database Operations

*   **Generate a new migration:**
    ```bash
    npm run migration:generate -- --name=<MigrationName>
    # Example: npm run migration:generate -- --name=AddProductDescription
    ```
    This will create a new migration file in `src/database/migrations`.

*   **Run pending migrations:**
    ```bash
    npm run migration:run
    # If using Docker: docker-compose exec backend npm run migration:run
    ```

*   **Revert the last migration:**
    ```bash
    npm run migration:revert
    # If using Docker: docker-compose exec backend npm run migration:revert
    ```

*   **Run seed data:**
    ```bash
    npm run seed:run
    # If using Docker: docker-compose exec backend npm run seed:run
    ```
    *Note*: Seeding truncates existing data in the tables it affects. Use with caution in non-development environments.

## 7. Testing

The project includes a comprehensive suite of tests using Jest.

*   **Run all tests (unit, integration, api):**
    ```bash
    npm test
    ```

*   **Run unit tests only:**
    ```bash
    npm run test:unit
    ```

*   **Run integration tests only:**
    ```bash
    npm run test:integration
    ```

*   **Run API (end-to-end) tests only:**
    ```bash
    npm run test:api
    ```

*   **Run tests with coverage report:**
    ```bash
    npm run test:coverage
    ```
    An HTML coverage report will be generated in the `coverage/` directory. Aim for 80%+ coverage.

*   **Performance Tests**:
    Conceptual performance tests are outlined in `tests/performance/products.get.k6.js` using `k6`. To run this:
    1.  Install `k6`.
    2.  Ensure your backend is running.
    3.  Execute: `k6 run tests/performance/products.get.k6.js`
    You can customize `API_BASE_URL` if your server is not on `localhost:3000`.

## 8. API Documentation

Interactive API documentation is generated using Swagger UI and is available at:
`http://localhost:3000/api-docs` (when the server is running).

The OpenAPI specification is generated from JSDoc comments and explicit schema definitions in `src/config/swagger.ts` and `src/database/entities/*.ts`. You can also find the generated `openapi.json` at `docs/api/openapi.json`.

## 9. Architecture Overview

### Layered Architecture

The backend follows a clear layered architecture to ensure separation of concerns, scalability, and maintainability:

1.  **Routes Layer (`src/api/v1/routes/`)**: Defines API endpoints and maps them to controller methods. Handles authentication and authorization middleware application.
2.  **Controllers Layer (`src/api/v1/controllers/`)**: Receives requests from routes, validates input using Joi, calls appropriate service methods, and sends back responses. It should contain minimal business logic.
3.  **Services Layer (`src/api/v1/services/`)**: Contains the core business logic of the application. It orchestrates interactions between repositories, performs data transformations, and applies business rules.
4.  **Repositories/Data Access Layer (`src/api/v1/repositories/`)**: Abstracts database interactions. It uses TypeORM to perform CRUD operations, query data, and manage entities.
5.  **Database Layer (`src/database/`)**: Defines TypeORM entities (schemas), manages migrations, and provides the data source configuration.

### Data Flow

1.  **Client Request**: A mobile client sends an HTTP request to an API endpoint (e.g., `POST /api/v1/products`).
2.  **Middleware**: The request passes through global middleware (Helmet, CORS, Rate Limiting) and then route-specific middleware (Authentication, Authorization).
3.  **Router**: The request is matched to a route in `src/api/v1/routes/` and forwarded to the corresponding controller method.
4.  **Controller**: The controller receives the request, validates the input (e.g., `product.validator.ts`), and calls a method in the appropriate service (e.g., `product.service.ts`).
5.  **Service**: The service executes the business logic. It might fetch data from cache (`redis.ts`), interact with repositories (`product.repository.ts`) to query or modify the database, or perform other complex operations.
6.  **Repository**: The repository uses TypeORM to interact with the PostgreSQL database, mapping data to/from entities.
7.  **Response**: The service returns data to the controller, which formats the response and sends it back to the client. Errors encountered at any layer are caught by the `error.middleware.ts` and sent back as consistent JSON error objects.

### Additional Components

*   **`src/config/`**: Manages all application configurations, ensuring separation of sensitive data via `.env`.
*   **`src/utils/`**: Houses shared utilities like JWT token generation/verification, a custom error class (`AppError`), structured logger (`winston`), and Redis client for caching.
*   **`src/types/`**: Contains custom TypeScript type definitions to enhance type safety and developer experience.

## 10. Deployment Guide

This project is containerized using Docker, which simplifies deployment to various environments.

### 1. **Environment Variables**:
Ensure your `.env` file is correctly configured for your target environment (staging, production). Critical variables include:
*   `NODE_ENV=production`
*   `DB_HOST`: The hostname or IP of your PostgreSQL database.
*   `DB_PORT`: PostgreSQL port.
*   `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`: Database credentials.
*   `JWT_SECRET`: **A strong, randomly generated secret key for JWTs.**
*   `REDIS_URL`: The URL for your Redis caching instance.
*   `CORS_ORIGINS`: Comma-separated list of allowed frontend origins.

**NEVER commit your `.env` file to version control.** Use environment management tools provided by your cloud provider (e.g., AWS Secrets Manager, Kubernetes Secrets, Heroku Config Vars) to manage these in production.

### 2. **Docker Image Build**:
The `Dockerfile` is optimized for production. To build the production image:
```bash
docker build -t your-dockerhub-username/mobile-backend:latest .
```
Replace `your-dockerhub-username` with your actual Docker Hub username or your private registry prefix.

### 3. **Push to Container Registry**:
Push your built image to a container registry (e.g., Docker Hub, AWS ECR, Google Container Registry) so your deployment platform can pull it:
```bash
docker push your-dockerhub-username/mobile-backend:latest
```

### 4. **Database & Redis Setup**:
In a production environment, you'll typically use managed services for your database (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL) and Redis (e.g., AWS ElastiCache, Azure Cache for Redis, Google Cloud Memorystore).
*   Provision these services.
*   Ensure network connectivity between your backend application and these services.
*   Configure the `DB_*` and `REDIS_URL` environment variables in your deployment platform to point to these managed services.

### 5. **Running Migrations**:
Before deploying new code that might change the database schema, run your TypeORM migrations. This can be done:
*   **Manually**: By connecting to your production DB and running `npm run migration:run` (or `docker-compose exec backend npm run migration:run`) from your local machine (ensure you have correct DB credentials).
*   **Via CI/CD**: Integrate migration execution into your CI/CD pipeline (e.g., as a pre-deployment step).
*   **As an init container/startup script**: Some platforms allow running a one-off command before the main application starts.

### 6. **Deployment Platforms**:

*   **Docker Compose (for small deployments/self-hosting)**:
    If deploying to a single server, `docker-compose up -d` can be used. Ensure you have proper monitoring and backup strategies in place. Use `restart: always` for all services in `docker-compose.yml`.

*   **Kubernetes (for scalable, robust deployments)**:
    *   Create Kubernetes `Deployment` definitions for your backend, and potentially for `postgres` and `redis` if not using managed services.
    *   Define `Service` objects to expose your backend internally and via `Ingress` for external access.
    *   Use `PersistentVolumeClaims` for database and Redis data.
    *   Manage environment variables with Kubernetes `Secrets` and `ConfigMaps`.
    *   Integrate `Horizontal Pod Autoscalers` for automatic scaling.

*   **AWS ECS / Fargate**:
    *   Push your Docker image to AWS ECR.
    *   Create an ECS Cluster.
    *   Define a Task Definition (specifying CPU, memory, container image, environment variables).
    *   Create an ECS Service to run and maintain the desired number of tasks, often with an Application Load Balancer (ALB) for traffic distribution.
    *   Use AWS RDS for PostgreSQL and ElastiCache for Redis.

*   **Google Cloud Run / App Engine**:
    *   Push your Docker image to Google Container Registry (GCR).
    *   Deploy to Cloud Run or App Engine. These platforms automatically handle scaling and provide URLs.
    *   Connect to Google Cloud SQL for PostgreSQL and Memorystore for Redis.

*   **Heroku**:
    *   Connect your GitHub repository.
    *   Heroku can automatically build and deploy your Dockerfile or a Node.js slug.
    *   Use Heroku Postgres and Redis add-ons.

### 7. **Monitoring & Logging**:
*   Integrate with a monitoring solution (e.g., Prometheus, Datadog, New Relic) to track application health, performance metrics, and errors.
*   Ensure your logs (generated by Winston) are collected and centralized (e.g., ELK Stack, Splunk, CloudWatch Logs) for easier debugging and auditing.

### 8. **Security Best Practices**:
*   **Keep dependencies updated**: Regularly run `npm audit` and update packages.
*   **Strong secrets**: Use strong, randomly generated `JWT_SECRET` and database passwords. Rotate them regularly.
*   **Network security**: Configure firewalls and security groups to restrict access to your database and Redis instances only from your backend servers.
*   **HTTPS**: Always serve your API over HTTPS in production. Use a load balancer or API Gateway to handle SSL termination.
*   **Regular backups**: Implement a robust backup strategy for your database.
*   **Input validation**: Continue using Joi (or similar) on the backend to validate all incoming data, even if a frontend also validates.

## 11. Frontend Example

A very basic HTML/JavaScript frontend is provided in the `frontend-example/` directory to demonstrate how to interact with the backend API.

To run this example:

1.  Ensure your backend is running (either locally or with Docker Compose) on `http://localhost:3000`.
2.  Open `frontend-example/index.html` in your web browser. You might need to serve it via a simple web server if your browser restricts `file://` AJAX requests (e.g., `npx http-server frontend-example`).
3.  Open your browser's developer console to see network requests and responses.

This example allows you to:
*   Register a new user.
*   Log in an existing user.
*   Fetch user profile using the obtained JWT.
*   Fetch all products.

**`frontend-example/index.html`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mobile Backend Demo Frontend</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }
        .container { max-width: 800px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1, h2 { color: #0056b3; }
        form { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input[type="text"], input[type="email"], input[type="password"] {
            width: calc(100% - 22px);
            padding: 10px;
            margin-bottom: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        button {
            background-color: #007bff;
            color: white;
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background-color: #0056b3;
        }
        pre { background-color: #eee; padding: 10px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
        .token-display { margin-top: 15px; font-size: 0.9em; }
        .products-list { margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px; }
        .product-item { background-color: #f0f8ff; margin-bottom: 10px; padding: 10px; border-radius: 5px; border: 1px solid #e0e0f0; }
        .product-item h3 { margin: 0 0 5px 0; color: #333; }
        .product-item p { margin: 0; font-size: 0.9em; }
        .error { color: red; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Mobile Backend Demo Frontend</h1>
        <p>This is a minimal client-side example to interact with the backend API.</p>

        <h2 id="backendStatus">Backend Status: Checking...</h2>

        <div class="token-display">
            <h3>Current Token: <span id="jwtToken">No token</span></h3>
            <button onclick="clearToken()">Clear Token</button>
        </div>

        <hr>

        <h2>Register User</h2>
        <form id="registerForm">
            <label for="regFirstName">First Name:</label>
            <input type="text" id="regFirstName" value="Test" required>
            <label for="regLastName">Last Name:</label>
            <input type="text" id="regLastName" value="User" required>
            <label for="regEmail">Email:</label>
            <input type="email" id="regEmail" value="testuser@example.com" required>
            <label for="regPassword">Password:</label>
            <input type="password" id="regPassword" value="password123" required>
            <button type="submit">Register</button>
            <pre id="registerResponse"></pre>
        </form>

        <hr>

        <h2>Login User</h2>
        <form id="loginForm">
            <label for="loginEmail">Email:</label>
            <input type="email" id="loginEmail" value="testuser@example.com" required>
            <label for="loginPassword">Password:</label>
            <input type="password" id="loginPassword" value="password123" required>
            <button type="submit">Login</button>
            <pre id="loginResponse"></pre>
        </form>

        <hr>

        <h2>Fetch My Profile (requires login)</h2>
        <button onclick="fetchMyProfile()">Fetch Profile</button>
        <pre id="profileResponse"></pre>

        <hr>

        <h2>Fetch All Products</h2>
        <button onclick="fetchAllProducts()">Fetch Products</button>
        <div id="productsList" class="products-list"></div>
        <pre id="productsResponse"></pre>
    </div>

    <script src="script.js"></script>
</body>
</html>
```

**`frontend-example/script.js`**
```javascript
const API_BASE_URL = 'http://localhost:3000/api/v1'; // Ensure this matches your backend's URL

let jwtToken = localStorage.getItem('jwtToken') || null;

const updateTokenDisplay = () => {
    document.getElementById('jwtToken').textContent = jwtToken ? jwtToken : 'No token';
};

const clearToken = () => {
    jwtToken = null;
    localStorage.removeItem('jwtToken');
    updateTokenDisplay();
    alert('JWT Token cleared from browser storage.');
};

const displayResponse = (elementId, data, error = false) => {
    const element = document.getElementById(elementId);
    if (error) {
        element.innerHTML = `<p class="error">Error: ${data.message || 'Unknown error'}</p>`;
        if (data.stack) {
             element.innerHTML += `<details><summary>Details</summary><pre>${data.stack}</pre></details>`;
        }
    } else {
        element.textContent = JSON.stringify(data, null, 2);
    }
};

const checkBackendStatus = async () => {
    const statusElement = document.getElementById('backendStatus');
    try {
        const response = await fetch('http://localhost:3000/health');
        if (response.ok) {
            const data = await response.json();
            statusElement.textContent = `Backend Status: ${data.status} - ${data.message}`;
            statusElement.style.color = 'green';
        } else {
            statusElement.textContent = `Backend Status: Down (HTTP ${response.status})`;
            statusElement.style.color = 'red';
        }
    } catch (error) {
        statusElement.textContent = `Backend Status: Down (Connection Error)`;
        statusElement.style.color = 'red';
        console.error('Error checking backend status:', error);
    }
};

// Register Form Submission
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('regFirstName').value;
    const lastName = document.getElementById('regLastName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email, password })
        });
        const data = await response.json();
        if (response.ok) {
            jwtToken = data.token;
            localStorage.setItem('jwtToken', jwtToken);
            updateTokenDisplay();
            displayResponse('registerResponse', data);
            alert('Registration successful! Token saved.');
        } else {
            displayResponse('registerResponse', data, true);
        }
    } catch (error) {
        console.error('Registration error:', error);
        displayResponse('registerResponse', { message: error.message }, true);
    }
});

// Login Form Submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            jwtToken = data.token;
            localStorage.setItem('jwtToken', jwtToken);
            updateTokenDisplay();
            displayResponse('loginResponse', data);
            alert('Login successful! Token saved.');
        } else {
            displayResponse('loginResponse', data, true);
        }
    } catch (error) {
        console.error('Login error:', error);
        displayResponse('loginResponse', { message: error.message }, true);
    }
});

// Fetch My Profile
const fetchMyProfile = async () => {
    if (!jwtToken) {
        alert('Please log in first to get a token.');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwtToken}`
            }
        });
        const data = await response.json();
        if (response.ok) {
            displayResponse('profileResponse', data);
        } else {
            displayResponse('profileResponse', data, true);
        }
    } catch (error) {
        console.error('Fetch profile error:', error);
        displayResponse('profileResponse', { message: error.message }, true);
    }
};

// Fetch All Products
const fetchAllProducts = async () => {
    const productsListDiv = document.getElementById('productsList');
    productsListDiv.innerHTML = 'Fetching products...';
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const data = await response.json();
        if (response.ok) {
            displayResponse('productsResponse', data); // Raw JSON response
            productsListDiv.innerHTML = '';
            if (data.length > 0) {
                data.forEach(product => {
                    const productItem = document.createElement('div');
                    productItem.className = 'product-item';
                    productItem.innerHTML = `
                        <h3>${product.name}</h3>
                        <p><strong>ID:</strong> ${product.id}</p>
                        <p><strong>Price:</strong> $${product.price}</p>
                        <p><strong>Stock:</strong> ${product.stock}</p>
                        <p><strong>Category:</strong> ${product.category ? product.category.name : 'N/A'}</p>
                        <p>${product.description}</p>
                    `;
                    productsListDiv.appendChild(productItem);
                });
            } else {
                productsListDiv.innerHTML = '<p>No products found.</p>';
            }
        } else {
            productsListDiv.innerHTML = `<p class="error">Error fetching products: ${data.message || 'Unknown error'}</p>`;
            displayResponse('productsResponse', data, true);
        }
    } catch (error) {
        console.error('Fetch products error:', error);
        productsListDiv.innerHTML = `<p class="error">Network error: ${error.message}</p>`;
        displayResponse('productsResponse', { message: error.message }, true);
    }
};

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    updateTokenDisplay();
    checkBackendStatus();
    fetchAllProducts(); // Automatically fetch products on page load
});
```
```markdown
## 12. Contributing

Contributions are welcome! If you find a bug, have a feature request, or want to improve the codebase, please:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes and ensure tests pass (`npm test`).
4.  Commit your changes (`git commit -m 'feat: Add new feature X'`).
5.  Push to your branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request to the `develop` branch.

Please ensure your code adheres to the project's coding style and includes relevant tests and documentation.

## 13. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
```