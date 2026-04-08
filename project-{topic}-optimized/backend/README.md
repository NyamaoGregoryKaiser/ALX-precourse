# Backend API (Node.js/Express)

This directory contains the core backend API for the Enterprise-Grade API Development System. It is built with Node.js and Express.js, using PostgreSQL as the database and Sequelize as the ORM.

## Features

*   RESTful API with full CRUD for `Users` and `Products`.
*   JWT-based Authentication and Role-based Authorization.
*   Centralized Error Handling.
*   Structured Logging with Winston.
*   Redis Caching for performance.
*   Rate Limiting to prevent abuse.
*   Comprehensive Testing (Unit, Integration, API).
*   Database Migrations and Seeders.
*   Environment-based Configuration.
*   Docker support for containerization.

## Setup

Please refer to the [main project README](../../README.md) for detailed setup and installation instructions, including Docker-based and manual setups.

## Available Scripts

In the `backend` directory, you can run:

*   `npm start`: Starts the application in development mode.
*   `npm run dev`: Starts the application in development mode with `nodemon` for auto-restarts.
*   `npm test`: Runs all backend tests (unit, integration, API).
*   `npm test -- --coverage`: Runs tests and displays a coverage report.
*   `npm run migrate`: Runs all pending database migrations.
*   `npm run migrate:create -- <migration-name>`: Creates a new migration file.
*   `npm run migrate:undo`: Undoes the last migration.
*   `npm run seed`: Runs all database seeders.
*   `npm run seed:undo`: Undoes all database seeders.
*   `npm run lint`: Lints the code using ESLint.
*   `npm run lint:fix`: Lints the code and fixes auto-fixable issues.

## API Endpoints

All API endpoints are prefixed with `/api/v1`.
Refer to the [OpenAPI documentation](../../docs/api/openapi.yml) for detailed API specifications.

### Authentication

*   `POST /api/v1/auth/register`: Register a new user.
*   `POST /api/v1/auth/login`: Log in and receive a JWT token.
*   `POST /api/v1/auth/refresh-token`: Refresh an expired access token (using a refresh token, though not fully implemented here for brevity).

### Users (Admin Only)

*   `GET /api/v1/users`: Get all users (paginated).
*   `GET /api/v1/users/:id`: Get a user by ID.
*   `PUT /api/v1/users/:id`: Update a user.
*   `DELETE /api/v1/users/:id`: Delete a user.

### Products

*   `GET /api/v1/products`: Get all products (paginated, cached).
*   `GET /api/v1/products/:id`: Get a product by ID.
*   `POST /api/v1/products`: Create a new product (Admin or Authenticated User).
*   `PUT /api/v1/products/:id`: Update a product (Admin or product owner).
*   `DELETE /api/v1/products/:id`: Delete a product (Admin or product owner).

## Environment Variables

The following environment variables are used. See `.env.example` for details.

*   `PORT`: Port for the Express server.
*   `NODE_ENV`: `development`, `test`, or `production`.
*   `DB_DIALECT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: PostgreSQL connection details.
*   `REDIS_HOST`, `REDIS_PORT`: Redis connection details.
*   `JWT_SECRET`: Secret key for signing JWT tokens.
*   `JWT_EXPIRES_IN`: Expiration time for access tokens (e.g., `1h`).
*   `REFRESH_TOKEN_SECRET`: Secret key for refresh tokens (not fully implemented here but included for completeness).
*   `REFRESH_TOKEN_EXPIRES_IN`: Expiration time for refresh tokens.
*   `LOG_LEVEL`: Winston logging level (e.g., `info`, `debug`).
*   `RATE_LIMIT_WINDOW_MS`: Time window for rate limiting in milliseconds.
*   `RATE_LIMIT_MAX_REQUESTS`: Max requests allowed within the window.
```