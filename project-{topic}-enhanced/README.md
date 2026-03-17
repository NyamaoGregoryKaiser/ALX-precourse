```markdown
# 🚀 Web Scraping Tools System

This is a comprehensive, production-ready web scraping tools system built with TypeScript, Node.js (Express.js), and PostgreSQL. It focuses on providing a robust backend for managing scraping projects, tasks, and results, complete with enterprise-grade features like authentication, authorization, logging, caching, and rate limiting.

## ✨ Features

*   **User Authentication & Authorization**: JWT-based authentication for secure API access with role-based authorization (user/admin).
*   **Project Management**: CRUD operations for creating, reading, updating, and deleting scraping projects.
*   **Scraping Task Management**: Define, configure, and manage individual scraping tasks, including target URLs, CSS/XPath selectors, and scheduling options.
*   **Flexible Scraping Engine**: Utilizes Puppeteer for dynamic, JavaScript-rendered content and Cheerio for static HTML parsing.
*   **Scraping Result Storage**: Stores extracted data, along with status and error messages, for each task run.
*   **Database Layer**: PostgreSQL with TypeORM for efficient and robust data management, including migrations and seeding.
*   **Middleware**: Custom middleware for error handling, request logging, and API rate limiting.
*   **Caching**: In-memory caching (`node-cache`) to improve performance for frequently accessed data.
*   **Logging**: Structured logging with Winston for better observability and debugging.
*   **Validation**: Input validation using Zod for API requests.
*   **Testing**: Unit, Integration, and API tests using Jest and Supertest.
*   **Dockerization**: Docker Compose setup for easy local development and deployment.
*   **Comprehensive Documentation**: README, Architecture Guide, API documentation, and Deployment Guide.

## 🏗️ Architecture

Refer to [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed overview of the system's architecture.

## 🛠️ Technologies Used

*   **Backend**: Node.js, Express.js, TypeScript
*   **Database**: PostgreSQL
*   **ORM**: TypeORM
*   **Scraping**: Puppeteer, Cheerio
*   **Authentication**: JSON Web Tokens (JWT), Bcrypt
*   **Validation**: Zod
*   **Logging**: Winston
*   **Caching**: Node-Cache
*   **Testing**: Jest, Supertest
*   **Containerization**: Docker, Docker Compose

## 🚀 Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   Node.js (v18 or higher) & npm
*   Docker & Docker Compose (recommended for easy setup)
*   Git

### 1. Clone the repository

```bash
git clone https://github.com/your-username/web-scraping-tools-system.git
cd web-scraping-tools-system
```

### 2. Environment Variables

Create a `.env` file in the root directory by copying from `.env.example` and filling in the necessary values.

```bash
cp .env.example .env
```

Edit the `.env` file:
```env
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=db # Use 'localhost' if running without Docker Compose
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=scraping_db
DB_SSL=false 

# JWT Configuration
JWT_SECRET=supersecretjwtkey # **CHANGE THIS IN PRODUCTION**
JWT_ACCESS_TOKEN_EXPIRATION=1h
JWT_REFRESH_TOKEN_EXPIRATION=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Caching
CACHE_TTL_SECONDS=3600
```
**Important**: In a production environment, ensure `JWT_SECRET` is a strong, randomly generated string and keep your `.env` file out of version control. Environment variables should be managed by your deployment platform.

### 3. Install Dependencies

```bash
npm install
```

### 4. Database Setup (using Docker Compose - Recommended)

This sets up a PostgreSQL database and runs the backend application.

```bash
docker-compose up --build -d
```

Wait a few moments for the database to become healthy. You can check the logs:
```bash
docker-compose logs -f db
```
Once `db` service is healthy, apply migrations and seed data:

```bash
# Run migrations to create tables
docker exec scraping_backend npm run migration:run

# Seed initial data (admin user, test user, sample projects/tasks)
docker exec scraping_backend npm run seed:run
```

**Alternatively: Manual Database Setup (if not using Docker Compose for DB)**

1.  Ensure PostgreSQL is running locally.
2.  Create a database named `scraping_db` (or whatever you configured in `.env`).
3.  Update `DB_HOST` in your `.env` to `localhost`.
4.  Run migrations and seed data:
    ```bash
    npm run migration:run
    npm run seed:run
    ```

### 5. Run the Application

Once the database is set up and migrations/seeds are applied:

**Development Mode (with auto-reload):**

```bash
npm run dev
```

**Production Mode (build and run):**

```bash
npm run build
npm start
```

The API server will start on `http://localhost:3000` (or your configured `PORT`).

## 🧪 Testing

The project includes unit, integration, and API tests using Jest and Supertest.

```bash
# Run all tests with coverage report
npm test

# Run tests in watch mode
npm run test:watch
```

**Note**: Integration and API tests interact with the database. Ensure your database is running and cleared before running these tests for consistent results. The `beforeEach` hooks in the test files attempt to clear relevant data.

## 📄 API Documentation

The API endpoints are documented directly in the controllers and routes using JSDoc comments. For a structured API documentation, you would typically integrate tools like Swagger/OpenAPI.

Here's a summary of the main API endpoints:

**Authentication (`/api/auth`)**
*   `POST /register`: Register a new user.
*   `POST /login`: Log in a user and get JWT tokens.

**Users (`/api/users` - Requires authentication, some require admin role)**
*   `GET /`: Get all users (Admin only).
*   `GET /:id`: Get user by ID (User can view own, Admin can view all).
*   `PUT /:id`: Update user by ID (User can update own, Admin can update all).
*   `DELETE /:id`: Delete user by ID (User can delete own, Admin can delete all).

**Projects (`/api/projects` - Requires authentication)**
*   `POST /`: Create a new scraping project.
*   `GET /`: Get all projects for the authenticated user (Admin gets all projects).
*   `GET /:id`: Get project by ID.
*   `PUT /:id`: Update project by ID.
*   `DELETE /:id`: Delete project by ID.

**Scraping Tasks (`/api/tasks` - Requires authentication)**
*   `POST /`: Create a new scraping task within a project.
*   `GET /project/:projectId`: Get all tasks for a specific project.
*   `GET /:id`: Get a specific scraping task by ID.
*   `PUT /:id`: Update a scraping task by ID.
*   `DELETE /:id`: Delete a scraping task by ID.
*   `POST /:id/scrape`: Manually initiate a scraping task.

**Scraping Results (`/api/results` - Requires authentication)**
*   `GET /task/:taskId`: Get all results for a specific scraping task.
*   `GET /:id`: Get a specific scraping result by ID.
*   `DELETE /:id`: Delete a specific scraping result by ID.

## 📚 Further Documentation

*   **[ARCHITECTURE.md](ARCHITECTURE.md)**: Detailed explanation of the system's design and components.
*   **[DEPLOYMENT.md](DEPLOYMENT.md)**: Guide for deploying the application.
*   **Inline Code Comments**: Extensive JSDoc comments within the TypeScript files.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'feat: Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

Please ensure your code adheres to the project's coding style and includes appropriate tests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
```