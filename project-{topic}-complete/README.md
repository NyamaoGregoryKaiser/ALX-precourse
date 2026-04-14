```markdown
# Web Scraping Tools System

This is a comprehensive, production-ready web scraping tools system built with a Node.js/Express backend, PostgreSQL database, React frontend, and Docker for containerization. It's designed to be robust, scalable, and includes features essential for enterprise-grade applications like authentication, authorization, logging, caching, and scheduling.

## Table of Contents

-   [Project Overview](#project-overview)
-   [Features](#features)
-   [Technology Stack](#technology-stack)
-   [Getting Started](#getting-started)
    -   [Prerequisites](#prerequisites)
    -   [Local Development Setup](#local-development-setup)
    -   [Running with Docker Compose](#running-with-docker-compose)
-   [API Documentation](#api-documentation)
-   [Architecture Documentation](#architecture-documentation)
-   [Testing](#testing)
-   [Deployment Guide](#deployment-guide)
-   [Contributing](#contributing)
-   [License](#license)

## Project Overview

The system provides a platform for users to create, manage, and monitor web scraping jobs. It supports both static (Cheerio) and dynamic (Puppeteer) scraping, allowing it to handle a wide range of websites. Scraped data is stored, and jobs can be scheduled to run at regular intervals.

## Features

*   **User Authentication & Authorization**: Secure JWT-based login, registration, and role-based access control (User/Admin).
*   **Scraping Job Management**: CRUD operations for scraping jobs.
    *   Define `start_url`, `scrape_type` (static/dynamic), and CSS `selectors` for data extraction.
    *   Set `schedule_cron` for recurring jobs.
    *   Manually trigger jobs immediately.
*   **Data Storage**: Scraped data and job logs are stored in PostgreSQL.
*   **Scraping Engine**:
    *   Utilizes `Cheerio` for efficient static HTML parsing.
    *   Utilizes `Puppeteer` for dynamic content rendering (JavaScript-heavy sites).
    *   Configurable concurrency for scraping tasks.
*   **Job Scheduling**: `node-cron` integration for scheduling jobs based on cron expressions.
*   **API Endpoints**: RESTful API for all system functionalities.
*   **Caching Layer**: Redis integration to cache API responses for improved performance.
*   **Rate Limiting**: Protects API endpoints from abuse.
*   **Logging & Monitoring**: Comprehensive logging using Winston to track application events and errors.
*   **Centralized Error Handling**: Robust middleware for consistent error responses.
*   **Database Migrations & Seeding**: Managed with Knex.js for structured schema evolution and initial data population.
*   **Containerization**: Docker and Docker Compose for easy setup and deployment across environments.
*   **Testing**: Unit, Integration, and API tests to ensure code quality and functionality.
*   **Frontend Dashboard**: A React.js SPA for user interaction, job creation, data visualization, and log viewing.

## Technology Stack

### Backend
*   **Runtime**: Node.js (v18+)
*   **Framework**: Express.js
*   **Database**: PostgreSQL
*   **ORM/Query Builder**: Knex.js
*   **Scraping**: Puppeteer, Cheerio
*   **Caching**: Redis
*   **Authentication**: JWT (jsonwebtoken), bcryptjs
*   **Logging**: Winston
*   **Scheduling**: node-cron
*   **Security**: helmet, xss-clean, express-mongo-sanitize, express-rate-limit

### Frontend
*   **Framework**: React.js
*   **State Management**: React Hooks (built-in)
*   **Routing**: React Router DOM
*   **API Client**: Axios
*   **Styling**: Tailwind CSS
*   **Modals**: react-modal

### Infrastructure
*   **Containerization**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

*   Git
*   Node.js (v18+)
*   npm (or yarn)
*   Docker & Docker Compose (recommended for easy setup)

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/web-scraping-tools.git
    cd web-scraping-tools
    ```

2.  **Backend Setup:**
    ```bash
    cd backend
    npm install
    cp .env.example .env # Edit .env as needed, particularly database and JWT_SECRET
    # Make sure PostgreSQL is running locally or configured in .env
    # Example for local PostgreSQL (if not using Docker Compose):
    # psql -U postgres
    # CREATE USER scraper_user WITH PASSWORD 'scraper_password';
    # CREATE DATABASE scraper_db OWNER scraper_user;
    knex --knexfile src/db/knexfile.js migrate:latest
    knex --knexfile src/db/knexfile.js seed:run
    npm run dev # Starts the backend server with nodemon
    ```

3.  **Frontend Setup:**
    ```bash
    cd ../frontend
    npm install
    cp .env.example .env # Ensure REACT_APP_API_URL points to your backend (default: http://localhost:8000/api)
    npm start # Starts the React development server
    ```

4.  **Access the application:**
    *   Frontend: `http://localhost:3000`
    *   Backend API: `http://localhost:8000/api`

### Running with Docker Compose (Recommended)

This is the easiest way to get all services (PostgreSQL, Redis, Backend, Frontend) running.

1.  **Create `.env` file:**
    ```bash
    cp .env.example .env
    ```
    Edit the `.env` file to customize database credentials, JWT secret, etc. The Docker Compose file will pick these up.

2.  **Build and run the services:**
    ```bash
    docker-compose up --build
    ```
    This command will:
    *   Build the `backend` image (which also builds the React frontend inside it).
    *   Pull `postgres` and `redis` images.
    *   Start all services.
    *   Run database migrations and seeds on the backend service start.

3.  **Access the application:**
    *   The frontend (served by the backend Express app) will be available at `http://localhost:8000`.
    *   The backend API will also be at `http://localhost:8000/api`.

    **Default Admin Credentials (from `backend/.env.example` or `.env`):**
    *   Email: `admin@example.com`
    *   Password: `adminpassword`

## API Documentation

Refer to [API_DOCS.md](API_DOCS.md) for detailed information on all available API endpoints, request/response formats, and authentication requirements.

## Architecture Documentation

Refer to [ARCHITECTURE.md](ARCHITECTURE.md) for a deeper dive into the system's design, component interactions, and technical decisions.

## Testing

The project includes a comprehensive test suite:

**Backend Tests (from `backend/` directory):**

*   **Unit Tests**:
    ```bash
    npm run test:unit
    ```
*   **Integration Tests**:
    ```bash
    npm run test:integration
    ```
*   **API Tests**:
    ```bash
    npm run test:api
    ```
*   **All Backend Tests with Coverage (aims for 80%+):**
    ```bash
    npm test
    ```

**Frontend Tests (from `frontend/` directory):**

*   **Unit Tests (React Testing Library):**
    ```bash
    npm test
    ```

## Deployment Guide

Refer to [DEPLOYMENT.md](DEPLOYMENT.md) for instructions on deploying this system to a production environment.

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes.
4.  Write tests for your changes.
5.  Ensure all tests pass (`npm test` in `backend/` and `npm test` in `frontend/`).
6.  Commit your changes (`git commit -am 'feat: Add new feature'`).
7.  Push to the branch (`git push origin feature/your-feature`).
8.  Create a new Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
```