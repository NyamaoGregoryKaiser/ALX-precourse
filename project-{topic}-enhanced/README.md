# Web Scraping Tools System

This is a comprehensive, production-ready web scraping tools system built with a C++ backend, PostgreSQL database, Redis cache, and a minimal web frontend. It allows users to define, schedule, and execute web scraping jobs, storing the extracted data in a structured format.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
    - [Using Docker Compose (Recommended)](#using-docker-compose-recommended)
    - [Manual Setup](#manual-setup)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features

*   **C++ Backend**: High-performance RESTful API using the Crow microframework.
*   **Web Scraping Core**: Custom HTML parser using `gumbo-parser` and `cURLpp` for fetching content.
*   **Database**: PostgreSQL for persistent storage of users, scrape jobs, and scraped data, managed with `soci`.
*   **Authentication & Authorization**: JWT-based authentication for secure API access, with user roles (USER, ADMIN).
*   **Job Scheduling**: Background scheduler (simple cron-like) to run scrape jobs automatically.
*   **Caching**: Redis integration (`hiredis`) for caching scraped results and improving performance.
*   **Rate Limiting**: IP-based rate limiting using Redis to prevent abuse.
*   **Logging & Monitoring**: Structured logging with `spdlog` for application insights.
*   **Error Handling**: Robust error handling middleware for consistent API responses.
*   **Containerization**: Docker and Docker Compose for easy setup and deployment.
*   **CI/CD**: GitHub Actions workflow for automated testing and deployment.
*   **Testing**: Comprehensive unit and integration tests using Google Test.
*   **Documentation**: Detailed `README`, `API.md`, `ARCHITECTURE.md`, and `DEPLOYMENT.md`.
*   **Frontend**: A basic HTML/JavaScript frontend to interact with the API.

## Project Structure

```
.
├── .github/                       # CI/CD workflows
│   └── workflows/
│       └── main.yml               # GitHub Actions CI/CD
├── db/                            # Database setup
│   ├── init.sql                   # Initial schema
│   ├── migrations/                # Migration scripts
│   │   └── V1__create_tables.sql
│   └── seed.sql                   # Seed data
├── docs/                          # Documentation files
├── frontend/                      # Minimal JavaScript/HTML frontend
├── src/                           # C++ Backend Source Code
│   ├── cache/                     # Caching layer (Redis)
│   ├── config/                    # Application configuration
│   ├── controllers/               # API endpoint handlers
│   ├── database/                  # Database management and repositories
│   ├── middleware/                # API middleware
│   ├── models/                    # Data models
│   ├── scraper/                   # Web scraping core logic
│   ├── services/                  # Business logic services
│   ├── utils/                     # Utility functions
│   ├── CMakeLists.txt             # CMake build script for src
│   └── main.cpp                   # Main application entry point
├── tests/                         # Unit, Integration, API tests
│   ├── integration/
│   ├── unit/
│   ├── CMakeLists.txt             # CMake build script for tests
│   └── main.cpp                   # Test runner
├── Dockerfile                     # Dockerfile for C++ app
├── docker-compose.yml             # Docker Compose for services
└── CMakeLists.txt                 # Top-level CMake
```

## Prerequisites

*   Docker & Docker Compose (Recommended)
*   C++ Compiler (GCC 12+ or Clang)
*   CMake 3.10+
*   PostgreSQL
*   Redis
*   Development Libraries: `libcurl-dev`, `libpq-dev`, `libhiredis-dev`, `libgumbo-dev`, `libsoci-dev` (with PostgreSQL backend), `libjwt-cpp-dev`, `libspdlog-dev`, `libcryptopp-dev`.

## Setup & Installation

### Using Docker Compose (Recommended)

This is the easiest way to get the entire system running.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/webscraper-cpp.git
    cd webscraper-cpp
    ```

2.  **Build and run the services:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    *   Build the C++ application Docker image.
    *   Start a PostgreSQL database container and initialize it with schema and seed data.
    *   Start a Redis container.
    *   Start the C++ webscraper application container, connected to the database and Redis.

3.  **Verify services:**
    ```bash
    docker-compose ps
    ```
    You should see `db`, `redis`, and `app` services running and healthy.

4.  **Access the application:**
    The C++ backend will be available at `http://localhost:8080`.
    The minimal frontend can be accessed directly at `http://localhost:8080`.

### Manual Setup (Linux/macOS)

1.  **Install System Dependencies:**

    *   **Ubuntu/Debian:**
        ```bash
        sudo apt update
        sudo apt install -y build-essential cmake libcurl4-openssl-dev libpq-dev libhiredis-dev libgumbo-dev libcryptopp-dev git
        # For Google Test:
        sudo apt install -y libgtest-dev
        sudo /usr/src/gtest/googletest-distribution.deb
        ```
    *   **macOS (with Homebrew):**
        ```bash
        brew install cmake libcurl postgresql hiredis gumbo-parser cryptopp spdlog jwt-cpp soci
        # For Google Test:
        brew install googletest
        ```
    *   **Install C++ libraries manually (if not available via package manager):**
        *   **Crow**: Header-only, usually copied to `src/lib/Crow` or included directly.
        *   **soci**: Requires building with PostgreSQL backend. See `Dockerfile` for steps.
        *   **jwt-cpp**: Header-only, usually copied or installed globally.
        *   **spdlog**: Header-only, usually copied or installed globally.
        *   **cURLpp**: Build and install from source.

2.  **Setup PostgreSQL:**
    *   Install PostgreSQL server.
    *   Create a user and database:
        ```sql
        CREATE USER user WITH PASSWORD 'password';
        CREATE DATABASE webscraper_db OWNER user;
        ```
    *   Run initial schema and seed data:
        ```bash
        psql -U user -d webscraper_db -f db/init.sql
        psql -U user -d webscraper_db -f db/seed.sql
        ```

3.  **Setup Redis:**
    *   Install and start a Redis server.

4.  **Configure Environment Variables:**
    The C++ application relies on environment variables. Set them in your shell or a `.env` file before running the application.

    ```bash
    export APP_PORT=8080
    export DATABASE_URL="postgresql://user:password@localhost:5432/webscraper_db"
    export JWT_SECRET="your_very_secret_jwt_key_that_is_at_least_32_chars_long" # IMPORTANT: CHANGE THIS!
    export REDIS_HOST="localhost"
    export REDIS_PORT="6379"
    export RATE_LIMIT_REQUESTS="100"
    export RATE_LIMIT_WINDOW_SECONDS="60"
    export SCHEDULER_INTERVAL_SECONDS="300" # 5 minutes
    ```

5.  **Build the C++ Application:**
    ```bash
    mkdir build
    cd build
    cmake ..
    make -j$(nproc)
    ```

6.  **Run the Application:**
    ```bash
    ./webscraper
    ```

## Usage

Once the application is running:

1.  **Register a user**: Use the `/api/auth/register` endpoint.
2.  **Login**: Use `/api/auth/login` to get a JWT token.
3.  **Create Scrape Jobs**: Use the token to access `/api/jobs` (POST) and define scraping tasks.
4.  **Monitor Jobs**: View job status and trigger manual scrapes via `/api/jobs` (GET) and `/api/jobs/<id>/scrape` (POST).
5.  **View Scraped Data**: Retrieve extracted items for a job from `/api/items/<job_id>`.

The minimal frontend at `http://localhost:8080` provides a basic interface for these actions.

## API Documentation

Refer to [docs/API.md](./docs/API.md) for detailed information on all available API endpoints, request/response formats, and authentication requirements.

## Architecture

A high-level overview of the system's design and component interactions can be found in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Testing

The project includes comprehensive tests:

*   **Unit Tests**: Located in `tests/unit/`, focusing on individual components and functions.
*   **Integration Tests**: Located in `tests/integration/`, verifying interactions between components (e.g., application with database).
*   **API Tests**: Automated tests to validate API endpoint functionality and responses.
*   **Performance Tests**: Conceptual outlines provided, can be implemented using tools like ApacheBench or custom benchmarks.

To run tests after building:
```bash
cd build
./tests/webscraper_tests
```

Code coverage reports can be generated using `gcov`/`lcov` after running tests compiled with coverage flags.

## Deployment

For deploying to a production environment, refer to the [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) guide. This includes considerations for environment variables, scaling, monitoring, and security.

## Contributing

Contributions are welcome! Please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) (not provided in this response, but would be in a real project) for guidelines.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.