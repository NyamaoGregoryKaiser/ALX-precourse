# ALX Content Management System (CMS) Project

This is a comprehensive, full-scale Content Management System (CMS) built primarily with C++ for the backend and a simple HTML/CSS/JS frontend. It's designed to be production-ready, focusing on modularity, robust error handling, security, and scalability, adhering to ALX Software Engineering principles.

## Features

**Core Application (C++ Backend)**
*   **RESTful API:** Full CRUD operations for Users, Content, Categories, and Comments.
*   **Modules:** User Management, Content Management, Category Management, Comment Management.
*   **Architecture:** Layered design (Controllers -> Services -> Repositories -> Database).
*   **Models:** Strong type-safe C++ structures for data.

**Database Layer (PostgreSQL)**
*   **Schema:** Defined for all core entities.
*   **Migrations:** Scripted for version control of database schema.
*   **Seed Data:** Initial data for development and testing.
*   **Query Optimization:** Basic indexing applied; further optimization discussed.

**Configuration & Setup**
*   **Dependency Management:** `CMake` for C++ packages. `npm` for frontend.
*   **Environment Variables:** `.env` based configuration.
*   **Dockerization:** `Dockerfile` for backend and frontend, `docker-compose.yml` for orchestrating the entire stack (App, DB, Frontend Nginx).
*   **CI/CD:** Example `.gitlab-ci.yml` demonstrating build, test, and deploy stages.

**Testing & Quality**
*   **Unit Tests:** Using Google Test for business logic and utility functions (e.g., `UserService`, `JWTManager`).
*   **Integration Tests:** Using Google Test for repository-database interactions and API endpoint validation.
*   **API Tests:** Covered conceptually by integration tests, or could use external tools like Postman/Newman.
*   **Performance Tests:** Strategy outlined using tools like JMeter/k6.
*   **Code Coverage:** Aim for 80%+ (requires integrating coverage tools like `gcovr` with CMake/CI).

**Additional Features**
*   **Authentication & Authorization:** JWT (JSON Web Token) based authentication, role-based authorization middleware.
*   **Logging & Monitoring:** `spdlog` for structured logging.
*   **Error Handling:** Centralized API exception handling middleware.
*   **Caching:** Simple in-memory caching middleware (can be extended with Redis).
*   **Rate Limiting:** IP-based rate limiting middleware.

## Technologies Used

*   **Backend:** C++17
    *   **Web Framework:** [Pistache](https://github.com/oktal/pistache) (REST API)
    *   **Database Driver:** [libpqxx](https://github.com/libpqxx/libpqxx) (PostgreSQL C++ client)
    *   **JSON Library:** [nlohmann/json](https://github.com/nlohmann/json)
    *   **JWT Library:** [jwt-cpp](https://github.com/Thalhammer/jwt-cpp)
    *   **Logging:** [spdlog](https://github.com/gabime/spdlog)
    *   **Testing:** [Google Test](https://github.com/google/googletest)
    *   **Build System:** [CMake](https://cmake.org/)
    *   **Password Hashing:** `bcrypt-cpp` (conceptual, requires linking `-lbcrypt`)
*   **Frontend:** HTML, CSS, JavaScript (Vanilla JS for simplicity, could be React/Vue/Angular)
*   **Database:** PostgreSQL
*   **Deployment:** Docker, Docker Compose
*   **CI/CD:** GitLab CI (example)

## Setup and Installation

### Prerequisites

*   **Docker & Docker Compose:** Required to run the application easily.
*   **C++ Development Environment (for local development/testing):**
    *   GCC/Clang (C++17 compatible)
    *   CMake 3.10+
    *   Pistache, libpqxx, jwt-cpp, spdlog (development headers and libraries)
    *   Google Test (for running local tests)
    *   `libssl-dev`, `libpq-dev`, `pkg-config` (system dependencies)

### Running with Docker Compose (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/cms-project.git
    cd cms-project
    ```
2.  **Configure Environment Variables:**
    *   Copy `backend/.env.example` to `backend/.env`:
        ```bash
        cp backend/.env.example backend/.env
        ```
    *   Edit `backend/.env` with your desired configuration (especially `JWT_SECRET`).
3.  **Build and Run:**
    ```bash
    docker-compose up --build -d
    ```
    This will:
    *   Build the `db`, `backend`, and `frontend` Docker images.
    *   Start a PostgreSQL container, apply schema, and seed initial data.
    *   Start the C++ backend API server.
    *   Start an Nginx container serving the frontend and proxying API requests.
4.  **Access the Application:**
    *   Frontend: `http://localhost`
    *   Backend API (direct access, not usually needed if using frontend proxy): `http://localhost:9080`

### Local C++ Backend Development (without Docker)

1.  **Install System Dependencies:**
    ```bash
    sudo apt-get update
    sudo apt-get install -y build-essential cmake libpq-dev libssl-dev libpistache-dev libjwt-cpp-dev libspdlog-dev google-test
    # Note: `libpistache-dev`, `libjwt-cpp-dev`, `libspdlog-dev` package names might vary or may need manual installation/building.
    # For jwt-cpp and spdlog, they are often header-only or built from source/vcpkg.
    # The Dockerfile provides hints on installing them if building from source.
    ```
2.  **Setup PostgreSQL:**
    *   Install PostgreSQL locally or ensure a running instance is accessible.
    *   Create the database and user as specified in `backend/.env`.
    ```bash
    # Example commands (replace with your user/password)
    sudo -u postgres psql -c "CREATE USER user WITH PASSWORD 'password';"
    sudo -u postgres psql -c "CREATE DATABASE cms_db OWNER user;"
    ```
3.  **Apply Schema and Seed Data:**
    ```bash
    psql -U user -d cms_db -f database/schema/001_initial_schema.sql
    psql -U user -d cms_db -f database/seed/seed_data.sql
    ```
4.  **Build and Run Backend:**
    ```bash
    cd backend
    mkdir build && cd build
    cmake ..
    make
    ./cms_backend
    ```

## Running Tests

### Backend Unit & Integration Tests

1.  **Ensure prerequisites (including Google Test) are installed (see local development setup).**
2.  **Build tests:**
    ```bash
    cd backend/build
    cmake .. -DENABLE_TESTS=ON # Re-run cmake to enable tests if you didn't initially
    make
    ```
3.  **Run tests:**
    ```bash
    ./tests/cms_backend_tests
    ```
    *Note: Integration tests will attempt to connect to a PostgreSQL database named `cms_api_test_db` and `cms_test_db` on `localhost:5432` with user `user` and password `password`. Ensure your local PostgreSQL is running and accessible with these credentials.*

### Code Coverage

To generate code coverage reports (e.g., with `gcovr` or `lcov`):
1.  Build the backend with coverage flags (e.g., `-fprofile-arcs -ftest-coverage`).
2.  Run the tests.
3.  Use `gcovr -r ../src --html --html-details -o coverage.html` in your build directory.

## API Documentation

See [api_docs.md](api_docs.md) for detailed information on all API endpoints, request/response formats, and authentication.

## Architecture Documentation

See [architecture.md](architecture.md) for a high-level overview of the system design, components, and data flow.

## Deployment Guide

See [deployment_guide.md](deployment_guide.md) for detailed instructions on deploying the application to a production environment.

## Contributing

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes.
4.  Write and run tests.
5.  Commit your changes (`git commit -m 'Add new feature'`).
6.  Push to the branch (`git push origin feature/your-feature`).
7.  Create a Pull Request.

---
```

#### `api_docs.md`
```markdown