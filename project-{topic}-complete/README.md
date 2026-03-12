# Data Visualization Platform

This is a comprehensive, production-ready Data Visualization Tools system built with a Node.js (Express) backend, PostgreSQL database, and React.js frontend. It allows users to manage data sources, create visualizations, and build interactive dashboards.

## Features

**Backend (Node.js/Express.js)**
*   **User Management:** Register, Login, User Profiles (JWT Authentication).
*   **Data Sources:** CRUD operations for defining and storing various data sources (JSON, CSV uploads, simulated DB connections).
*   **Visualizations:** CRUD operations for creating different chart types (Bar, Line, Pie, Table) with configurable options, filters, and aggregations.
*   **Dashboards:** CRUD operations for building dashboards, arranging visualizations, and managing layouts.
*   **Data Processing:** Robust service for normalizing, filtering, and aggregating raw data based on visualization configurations.
*   **Security:** JWT-based authentication, Role-based authorization, Helmet for HTTP headers, `express-rate-limit`.
*   **Robustness:** Centralized Error Handling, Structured Logging (Winston), Basic Caching.
*   **Database:** PostgreSQL with Sequelize ORM for schema management, migrations, and seeding.
*   **API:** RESTful API with clear endpoints and CRUD operations.

**Frontend (React.js)**
*   **User Interface:** Intuitive and responsive UI for interacting with the platform.
*   **Authentication:** Login and Registration forms.
*   **Dashboard Management:** View, create, edit, and delete dashboards.
*   **Data Source Management:** Add, configure, and preview data sources.
*   **Visualization Creator:** Interactive tool to select data, define axes, apply filters/aggregations, and preview charts.
*   **Chart Rendering:** Utilizes Recharts for dynamic and interactive visualizations.
*   **Routing:** React Router DOM for client-side navigation.
*   **State Management:** React Context API for authentication, component-level state for data and forms.

**DevOps & Quality**
*   **Containerization:** Docker and Docker Compose for easy setup and deployment.
*   **CI/CD:** GitHub Actions workflow for automated testing and deployment.
*   **Testing:** Unit, Integration, and API tests (Jest, Supertest, React Testing Library) aiming for high coverage.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed overview.

## API Documentation

See [API.md](API.md) for a detailed list of API endpoints.

## Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/en/) (v18 or higher)
*   [npm](https://www.npmjs.com/) (comes with Node.js)
*   [Docker](https://www.docker.com/products/docker-desktop) and [Docker Compose](https://docs.docker.com/compose/install/)
*   [PostgreSQL](https://www.postgresql.org/download/) client (optional, if you want to connect directly)

## Getting Started

Follow these steps to get the project up and running on your local machine.

### 1. Clone the repository

```bash
git clone https://github.com/your-username/data-visualization-platform.git
cd data-visualization-platform
```

### 2. Environment Variables

Create `.env` files for both `backend` and `frontend` directories.

#### `backend/.env`
Copy the content from `backend/.env.example` and fill in your values. For local Docker setup, `DB_HOST` should be `db`.

```
# backend/.env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

DB_NAME=dataviz_db
DB_USER=dataviz_user
DB_PASSWORD=dataviz_pass
DB_HOST=db
DB_PORT=5432

JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_EXPIRES_IN=1h

LOG_LEVEL=info
LOG_FILE_PATH=logs/app.log

CACHE_TTL=3600
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

#### `frontend/.env`
Copy the content from `frontend/.env.example`. For local development, `REACT_APP_BACKEND_URL` will be proxied by `npm start`.

```
# frontend/.env
REACT_APP_BACKEND_URL=http://localhost:5000/api
```

### 3. Build and Run with Docker Compose (Recommended)

This is the easiest way to get everything running, including the database.

```bash
# From the project root directory
docker-compose up --build
```

This command will:
*   Build the `db`, `backend`, and `frontend` Docker images.
*   Start the PostgreSQL database.
*   Run database migrations and seed initial data (specified in `docker-compose.yml` for the backend service).
*   Start the backend server on `http://localhost:5000`.
*   Start the Nginx server for the frontend on `http://localhost:3000`.

You can access the application in your browser at `http://localhost:3000`.

### 4. Manual Setup (Alternative for Development)

If you prefer to run services individually without Docker Compose for faster iteration on specific parts:

#### 4.1. Start PostgreSQL Database

Ensure you have PostgreSQL running. You can use Docker for just the database:

```bash
docker run --name dataviz-postgres -e POSTGRES_DB=dataviz_db -e POSTGRES_USER=dataviz_user -e POSTGRES_PASSWORD=dataviz_pass -p 5432:5432 -d postgres:13-alpine
```
Make sure `DB_HOST` in `backend/.env` is set to `localhost` if running locally, or `host.docker.internal` if your backend is in Docker and DB is local.

#### 4.2. Backend Setup

```bash
cd backend
npm install
npx sequelize-cli db:migrate # Run migrations
npx sequelize-cli db:seed:all # Seed initial data
npm run dev # Starts the backend server with nodemon
```
The backend will be running on `http://localhost:5000`.

#### 4.3. Frontend Setup

```bash
cd frontend
npm install
npm start # Starts the React development server
```
The frontend will be running on `http://localhost:3000`.

## Testing

### Backend Tests

Run all backend tests (unit and integration):
```bash
cd backend
npm test
```

### Frontend Tests

Run all frontend tests:
```bash
cd frontend
npm test
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment steps.

## Contributing

Contributions are welcome! Please follow the standard GitHub flow:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Create a Pull Request.

## License

This project is licensed under the ISC License.
```