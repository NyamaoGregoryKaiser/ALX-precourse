# Web Scraping Tools System

This is a comprehensive, production-ready web scraping tools system built with Node.js (Express), React, PostgreSQL, and Redis. It's designed to allow users to configure, schedule, and execute web scraping tasks, store the results, and view them through a user-friendly interface.

## Features

*   **User Management**: Register, login, and manage user accounts with JWT-based authentication.
*   **Scraper Management**: Create, read, update, and delete web scraper configurations. Define target URLs, CSS selectors, and other scraping parameters.
*   **Scheduled Scraping**: Schedule scrapers to run at specified intervals using a job queue.
*   **Dynamic & Static Scraping**: Supports both static HTML parsing (Cheerio) and dynamic content rendering (Puppeteer).
*   **Data Storage**: Persist scraped data in a PostgreSQL database.
*   **Job Queueing**: Uses Redis and BullMQ for reliable, distributed job processing for scraping tasks.
*   **Caching**: API response caching with Redis to improve performance.
*   **Rate Limiting**: Protects API endpoints from abuse.
*   **Robust Error Handling**: Centralized error middleware for graceful error responses.
*   **Logging & Monitoring**: Comprehensive logging with Winston.
*   **Dockerized Deployment**: All services are containerized for easy setup and deployment.
*   **CI/CD**: Basic GitHub Actions workflow for automated testing and deployment.
*   **Comprehensive Testing**: Unit, integration, and API tests.
*   **Detailed Documentation**: Architecture, API, and deployment guides.

## Technologies Used

*   **Backend**: Node.js, Express.js, PostgreSQL, Knex.js, BullMQ, Redis, JWT, Cheerio, Puppeteer, Winston, Express-rate-limit.
*   **Frontend**: React.js, Axios, React Router.
*   **Database**: PostgreSQL
*   **Queue/Cache**: Redis
*   **Containerization**: Docker, Docker Compose
*   **Testing**: Jest, Supertest, React Testing Library
*   **CI/CD**: GitHub Actions

## Setup Instructions

### Prerequisites

*   Docker and Docker Compose installed
*   Node.js (LTS recommended) and npm/yarn (for local development outside Docker)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/web-scraper-system.git
cd web-scraper-system
```

### 2. Configure Environment Variables

Create `.env` files based on the provided examples.

#### `backend/.env` (Create this file)

```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@db:5432/scraper_db
REDIS_URL=redis://redis:6379
JWT_SECRET=supersecretjwtkey
JWT_EXPIRES_IN=1d
CACHE_ENABLED=true
CACHE_TTL=3600 # seconds
```
*Note*: For local development without Docker, `DATABASE_URL` and `REDIS_URL` would point to `localhost` instead of `db` and `redis`.

#### `frontend/.env.development` (Create this file)

```
REACT_APP_API_BASE_URL=http://localhost:5000/api
```

#### `frontend/.env.production` (Create this file)

```
REACT_APP_API_BASE_URL=http://your-domain.com/api # Or proxy through Nginx
```

### 3. Run with Docker Compose (Recommended)

This will build images, start all services (backend, frontend, PostgreSQL, Redis), run database migrations, and seed data.

```bash
docker-compose up --build
```

Wait for all services to start. This might take a few minutes for the initial build and database setup.

*   **Backend API**: `http://localhost:5000/api`
*   **Frontend App**: `http://localhost:3000` (or `http://localhost:80` if accessing via Nginx proxy setup in docker-compose)

### 4. Database Migrations & Seeding (Manual - if not using `docker-compose up`)

If running backend locally or need to re-run migrations:

```bash
cd backend
npx knex migrate:latest
npx knex seed:run
cd ..
```

### 5. Local Development (without Docker Compose)

#### Backend

```bash
cd backend
npm install
npm run migrate
npm run seed
npm start
```
*Note*: Ensure you have a local PostgreSQL and Redis instance running and update your `backend/.env` accordingly (e.g., `DATABASE_URL=postgresql://user:password@localhost:5432/scraper_db`, `REDIS_URL=redis://localhost:6379`).

#### Frontend

```bash
cd frontend
npm install
npm start
```
The frontend will typically open in your browser at `http://localhost:3000`.

## Testing

### Backend Tests

```bash
cd backend
npm test
# For coverage:
npm test -- --coverage
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Documentation

*   **API Documentation**: `docs/api.md`
*   **Architecture Documentation**: `docs/architecture.md`
*   **Deployment Guide**: `docs/deployment.md`

## CI/CD

A basic GitHub Actions workflow (`.github/workflows/ci.yml`) is provided for automated testing on push and pull requests.

## Contribution

Feel free to fork the repository, open issues, and submit pull requests.

## License

This project is licensed under the MIT License. See the LICENSE file for details.