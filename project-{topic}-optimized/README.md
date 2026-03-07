```markdown
# Enterprise-Grade Task Management System

This project is a comprehensive, production-ready Task Management System built with a C++ backend (using the Drogon framework) and designed for scalability, robustness, and ease of deployment. It adheres to modern software engineering best practices, including a multi-layered architecture, extensive testing, and CI/CD integration.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Setup & Installation](#setup--installation)
  - [Prerequisites](#prerequisites)
  - [Local Development (Without Docker)](#local-development-without-docker)
  - [Docker Setup (Recommended)](#docker-setup-recommended)
- [Database Management](#database-management)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features

**Core Task Management:**
-   **User Management**: Register, Login, Authentication (JWT).
-   **Task CRUD**: Create, Read (single, all by user, filtered), Update, Delete tasks.
-   **Task Attributes**: Title, Description, Status (TODO, IN_PROGRESS, DONE), Due Date, Category.
-   **Category Management**: Create, Read, Update, Delete categories for tasks.

**Enterprise-Grade Features:**
-   **Authentication & Authorization**: JSON Web Tokens (JWT) for secure API access.
-   **Logging & Monitoring**: Structured logging for application events and errors.
-   **Error Handling**: Consistent API error responses with appropriate HTTP status codes.
-   **Rate Limiting**: Protects API endpoints from abuse and overload.
-   **Caching Layer**: (Conceptual/Basic In-memory) Improves response times for frequently accessed data.
-   **Database Abstraction**: Using Drogon's ORM for database interactions, allowing for easy switching of DB backends (e.g., SQLite, PostgreSQL, MySQL).
-   **Containerization**: Docker support for consistent development and deployment environments.
-   **CI/CD Pipeline**: Automated build, test, and deployment workflows (GitHub Actions).
-   **Comprehensive Testing**: Unit, Integration, and API tests.
-   **Detailed Documentation**: README, API docs, Architecture docs, Deployment guide.

## Architecture

The system follows a layered architecture, promoting separation of concerns and maintainability:

1.  **Client Layer (Conceptual Frontend)**: A typical web application (e.g., React, Vue.js) or mobile app that consumes the RESTful API. The C++ server can serve static assets for a simple client.
2.  **API Layer (C++ Backend - Drogon)**:
    *   **Controllers**: Handle incoming HTTP requests, parse inputs, and orchestrate responses. They delegate business logic to services.
    *   **Filters/Middleware**: Intercept requests for cross-cutting concerns like authentication, authorization, and rate limiting.
    *   **Services**: Contain the core business logic, interact with the database (via ORM), and encapsulate operations on models.
    *   **Models**: Represent the data structures (e.g., `User`, `Task`, `Category`) and their mapping to database tables.
3.  **Database Layer (SQLite)**: Persists application data. Configured with schema, migrations, and seed data. Designed to be swappable for production-grade databases like PostgreSQL.

See `architecture.md` for a more detailed diagram and explanation.

## Technology Stack

*   **Core Application**: C++17/20
*   **Web Framework**: [Drogon](https://drogon.org/) (C++ HTTP application framework)
*   **Database**: SQLite (for development and testing), easily configurable for PostgreSQL/MySQL in production.
*   **Database ORM**: Drogon's built-in ORM.
*   **Hashing**: `bcrypt` (for password security).
*   **JWT**: `jwt-cpp` library.
*   **Build System**: CMake
*   **Containerization**: Docker, Docker Compose
*   **Testing Framework**: [Google Test](https://github.com/google/googletest)
*   **CI/CD**: GitHub Actions

## Setup & Installation

### Prerequisites

*   Git
*   CMake (>= 3.15)
*   A C++17/20 compatible compiler (GCC >= 8 or Clang >= 7)
*   Drogon library (installed globally or via `vcpkg`, or let Docker handle it)
*   `libjsoncpp-dev`, `libsqlite3-dev`, `libssl-dev`, `uuid-dev`, `zlib1g-dev`, `libjwt-dev`, `libbcrypt-dev`
*   SQLite3 command-line tool (for migrations script)
*   Docker and Docker Compose (recommended)

### Local Development (Without Docker)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/task-management-system.git
    cd task-management-system
    ```

2.  **Install Drogon and dependencies:**
    Follow Drogon's official installation guide (e.g., `vcpkg install drogon` or build from source). Ensure `libjsoncpp-dev`, `libsqlite3-dev`, `libssl-dev`, `uuid-dev`, `zlib1g-dev`, `libjwt-dev`, `libbcrypt-dev` are also installed.
    *Example for Debian/Ubuntu:*
    ```bash
    sudo apt update
    sudo apt install build-essential cmake git libjsoncpp-dev libsqlite3-dev libssl-dev uuid-dev zlib1g-dev libjwt-dev libbcrypt-dev sqlite3
    # For Drogon, if not using a package manager:
    # git clone https://github.com/drogonframework/drogon
    # cd drogon
    # git submodule update --init
    # cmake -B build
    # sudo cmake --build build --target install
    # cd ..
    ```

3.  **Configure Environment Variables:**
    Copy the example environment file and fill in your JWT secret.
    ```bash
    cp .env.example .env
    # Generate a strong JWT_SECRET:
    ./scripts/generate_jwt_secret.sh
    # Paste the generated key into the .env file.
    ```

4.  **Build the application:**
    ```bash
    mkdir build
    cd build
    cmake ..
    cmake --build .
    ```

5.  **Setup Database:**
    ```bash
    cd .. # Go back to root directory
    ./scripts/run_migrations.sh
    ```

6.  **Run the application:**
    ```bash
    ./build/TaskManagementSystem
    ```
    The server will start on `http://0.0.0.0:8080`.

### Docker Setup (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/task-management-system.git
    cd task-management-system
    ```

2.  **Configure Environment Variables:**
    ```bash
    cp .env.example .env
    # Generate a strong JWT_SECRET:
    ./scripts/generate_jwt_secret.sh
    # Paste the generated key into the .env file.
    ```

3.  **Build and run the Docker containers:**
    ```bash
    docker compose up --build -d
    ```
    This will build the Docker image, run the database migrations, and start the Drogon application in the background.

4.  **Verify:**
    The application should be accessible at `http://localhost:8080`.
    You can check logs: `docker compose logs -f app`

## Database Management

The `db/` directory contains:
*   `schema.sql`: Defines the tables (`users`, `categories`, `tasks`).
*   `seed.sql`: Populates the tables with initial data.
*   `app.db`: The SQLite database file (created on first run).

The `scripts/run_migrations.sh` script applies these SQL files. It's executed automatically by the Docker setup.

## Running the Application

Once built (locally or via Docker):

*   **Local**: `./build/TaskManagementSystem`
*   **Docker**: `docker compose up -d`

The server listens on `http://0.0.0.0:8080` (or `http://localhost:8080` if accessed from host).

## API Endpoints

All API endpoints are prefixed with `/api/v1`.
Authentication is handled via JWT Bearer tokens in the `Authorization` header.

**Authentication**
| Method | Endpoint                    | Description                          | Authentication |
| :----- | :-------------------------- | :----------------------------------- | :------------- |
| `POST` | `/api/v1/auth/register`     | Register a new user                  | None           |
| `POST` | `/api/v1/auth/login`        | Authenticate user and get JWT token  | None           |

**Task Management**
| Method | Endpoint                    | Description                                  | Authentication |
| :----- | :-------------------------- | :------------------------------------------- | :------------- |
| `GET`  | `/api/v1/tasks`             | Get all tasks for the authenticated user     | Required       |
| `POST` | `/api/v1/tasks`             | Create a new task                            | Required       |
| `GET`  | `/api/v1/tasks/{id}`        | Get a specific task by ID                    | Required       |
| `PUT`  | `/api/v1/tasks/{id}`        | Update a specific task by ID                 | Required       |
| `DELETE`| `/api/v1/tasks/{id}`       | Delete a specific task by ID                 | Required       |

**Category Management**
| Method | Endpoint                    | Description                                  | Authentication |
| :----- | :-------------------------- | :------------------------------------------- | :------------- |
| `GET`  | `/api/v1/categories`        | Get all categories for the authenticated user| Required       |
| `POST` | `/api/v1/categories`        | Create a new category                        | Required       |
| `GET`  | `/api/v1/categories/{id}`   | Get a specific category by ID                | Required       |
| `PUT`  | `/api/v1/categories/{id}`   | Update a specific category by ID             | Required       |
| `DELETE`| `/api/v1/categories/{id}`  | Delete a specific category by ID             | Required       |

For detailed request/response schemas, refer to `openapi.yaml`.

## Testing

The project includes a comprehensive test suite using Google Test.

**To run tests (after building):**
```bash
cd build
cmake --build . --target TaskManagementSystem_tests # This will build the test executable
ctest --verbose # Run all tests
```

### Test Categories:

*   **Unit Tests**: Located in `tests/unit/`. Focus on individual classes and functions (e.g., `AuthService`, `TaskService` business logic). Aim for high code coverage (80%+).
*   **Integration Tests**: Located in `tests/integration/`. Test the interaction between multiple components, often by making HTTP requests to the running (or mocked) API server.
*   **API Tests**: Covered by `ApiIntegration_test.cpp`. In a real-world scenario, you might also use external tools like Postman, Insomnia, or custom scripts (`curl`) for end-to-end API validation.
*   **Performance Tests**: (Conceptual) Tools like `ApacheBench`, `JMeter`, `k6` can be used to simulate load and measure system performance.

## Deployment

The system is designed for containerized deployment using Docker.

1.  Ensure your `JWT_SECRET` is set as an environment variable in your production environment (e.g., in your Docker Compose file, Kubernetes secret, or cloud provider configuration). **Never hardcode production secrets.**
2.  Build the Docker image: `docker compose build`
3.  Deploy the Docker container to your chosen environment (e.g., a VPS, Kubernetes, AWS ECS, Google Cloud Run).

See `deployment.md` for a more detailed guide.

## Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write comprehensive tests for your changes.
5.  Ensure all tests pass (`ctest`).
6.  Commit your changes (`git commit -m 'Add new feature'`).
7.  Push to the branch (`git push origin feature/your-feature-name`).
8.  Open a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
```