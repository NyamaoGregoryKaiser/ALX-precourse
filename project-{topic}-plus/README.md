```markdown
# Task Management System (C++ Backend)

This is a comprehensive, production-ready Task Management System built using C++ for the backend, focusing on robust architecture, API design, and enterprise-grade features. It includes a RESTful API, SQLite database, authentication (JWT), logging, caching, rate limiting, and full CI/CD support.

## Features

*   **User Management**: Register, login, manage user profiles.
*   **Project Management**: Create, view, update, and delete projects. Projects are owned by users.
*   **Task Management**: Create, view, update, and delete tasks within projects. Tasks can be assigned to users.
*   **RESTful API**: Full CRUD operations via well-defined API endpoints.
*   **Authentication & Authorization**: JWT-based authentication, role-based access control (User/Admin), resource ownership checks.
*   **Database Layer**: SQLite3 for data persistence, with schema definitions and seed data.
*   **Configuration**: Environment variable-based configuration for flexibility.
*   **Logging**: Structured logging using `spdlog`.
*   **Error Handling**: Centralized exception handling and consistent API error responses.
*   **Caching**: In-memory caching for frequently accessed data to improve performance.
*   **Rate Limiting**: IP-based rate limiting to protect against abuse.
*   **Testing**: Unit tests (Google Test) and Integration tests.
*   **Docker Support**: Containerized application for easy deployment.
*   **CI/CD**: GitHub Actions workflow for automated build, test, and deployment (conceptual).
*   **Comprehensive Documentation**: README, API docs, Architecture docs, Deployment Guide.

## Technologies

*   **Backend**: C++17
*   **Web Framework**: [Crow C++ Microframework](https://github.com/ipkn/crow)
*   **JSON Parsing**: [nlohmann/json](https://github.com/nlohmann/json)
*   **Database**: [SQLite3](https://www.sqlite.org/index.html)
*   **Logging**: [spdlog](https://github.com/gabime/spdlog)
*   **Build System**: CMake
*   **Testing**: [Google Test](https://github.com/google/googletest)
*   **Containerization**: Docker
*   **CI/CD**: GitHub Actions

## Setup and Installation

### Prerequisites

*   CMake (>= 3.10)
*   C++ Compiler (GCC >= 7 or Clang >= 5, MSVC >= 19)
*   Git
*   Docker (Optional, for containerized setup)
*   SQLite3 development libraries (usually `libsqlite3-dev` on Debian/Ubuntu, `sqlite` on macOS/Homebrew)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/task-management-system.git
cd task-management-system
```

### 2. Build from Source

This project uses CMake to manage dependencies (Crow, nlohmann/json, spdlog, Google Test are fetched automatically).

```bash
# Create a build directory
mkdir -p build
cd build

# Configure CMake
# For Debug build (default)
cmake .. -DCMAKE_BUILD_TYPE=Debug

# For Release build (optimized)
# cmake .. -DCMAKE_BUILD_TYPE=Release

# Build the project
make -j$(nproc) # Use -j for parallel compilation
```

### 3. Configure Environment Variables

The application uses a `.env` file for configuration. A `.env.example` is provided.

```bash
cp .env.example .env
```

Edit the `.env` file to set your desired configurations:

```ini
PORT=18080
DATABASE_PATH=./db/task_manager.db
JWT_SECRET=super_secret_jwt_key_that_should_be_long_and_complex # CHANGE THIS IN PRODUCTION!
JWT_EXPIRATION_SECONDS=3600 # 1 hour
LOG_LEVEL=info # trace, debug, info, warn, error, critical, off
CACHE_TTL_SECONDS=300 # 5 minutes
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_SECONDS=60
```

**Important**: Change `JWT_SECRET` to a strong, unique, and long random string for production environments.

### 4. Run the Application

#### (a) From Build Directory

```bash
cd build
./TaskManagementSystem
```

The server will start and listen on the configured `PORT` (default: 18080).
You should see log messages indicating successful startup and route registration.

#### (b) Using Docker

Build the Docker image:

```bash
docker build -t task-management-system .
```

Run the container:

```bash
docker run -p 18080:18080 --name task_manager_app task-management-system
```

Alternatively, use `docker-compose` for easier management:

```bash
docker-compose up --build
```

This will build the image (if not already built) and run the container, exposing port 18080.

## Usage (API Endpoints)

Once the server is running, you can interact with it using `curl` or any API client (e.g., Postman, Insomnia).

**Base URL**: `http://localhost:18080` (or `http://your-docker-ip:18080`)

### Authentication

*   **Register User**
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"username": "myuser", "password": "mypassword", "email": "myuser@example.com"}' http://localhost:18080/auth/register
    ```
*   **Login User**
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"username": "myuser", "password": "mypassword"}' http://localhost:18080/auth/login
    # Response will include a JWT token: {"token": "eyJ..."}
    ```
*   **Get Current User Info (`/auth/me`)**
    ```bash
    # Replace [YOUR_JWT_TOKEN] with the token obtained from login
    curl -X GET -H "Authorization: Bearer [YOUR_JWT_TOKEN]" http://localhost:18080/auth/me
    ```

### Projects (Requires Authentication)

*   **Create Project**
    ```bash
    curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer [YOUR_JWT_TOKEN]" -d '{"name": "My First Project", "description": "A new project."}' http://localhost:18080/projects
    ```
*   **Get All Projects (owned by user or all if admin)**
    ```bash
    curl -X GET -H "Authorization: Bearer [YOUR_JWT_TOKEN]" http://localhost:18080/projects
    # Optional query parameters: ?limit=10&offset=0
    ```
*   **Get Project by ID**
    ```bash
    curl -X GET -H "Authorization: Bearer [YOUR_JWT_TOKEN]" http://localhost:18080/projects/1
    ```
*   **Update Project**
    ```bash
    curl -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer [YOUR_JWT_TOKEN]" -d '{"name": "Updated Project Name"}' http://localhost:18080/projects/1
    ```
*   **Delete Project**
    ```bash
    curl -X DELETE -H "Authorization: Bearer [YOUR_JWT_TOKEN]" http://localhost:18080/projects/1
    ```

### Tasks (Requires Authentication)

*   **Create Task**
    ```bash
    # project_id must exist and be owned by the authenticated user (or user is admin)
    curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer [YOUR_JWT_TOKEN]" -d '{"title": "Implement API", "description": "Finish backend API.", "project_id": 1, "status": "IN_PROGRESS", "priority": "HIGH", "due_date": "2024-08-31 23:59:59"}' http://localhost:18080/tasks
    ```
*   **Get All Tasks (relevant to user or all if admin)**
    ```bash
    curl -X GET -H "Authorization: Bearer [YOUR_JWT_TOKEN]" http://localhost:18080/tasks
    # Optional query parameters: ?limit=10&offset=0
    ```
*   **Get Task by ID**
    ```bash
    curl -X GET -H "Authorization: Bearer [YOUR_JWT_TOKEN]" http://localhost:18080/tasks/1
    ```
*   **Update Task**
    ```bash
    curl -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer [YOUR_JWT_TOKEN]" -d '{"status": "DONE"}' http://localhost:18080/tasks/1
    ```
*   **Delete Task**
    ```bash
    curl -X DELETE -H "Authorization: Bearer [YOUR_JWT_TOKEN]" http://localhost:18080/tasks/1
    ```

### Users (Admin-only for most operations)

*   **Get All Users** (Admin only)
    ```bash
    # You need to log in as an 'admin' user (see db/seed.sql for default admin credentials)
    curl -X GET -H "Authorization: Bearer [ADMIN_JWT_TOKEN]" http://localhost:18080/users
    ```
*   **Change User Password** (Admin or self)
    ```bash
    curl -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer [YOUR_JWT_TOKEN]" -d '{"new_password": "new_secure_password"}' http://localhost:18080/users/1/change-password
    ```

## Testing

Run tests from the `build` directory:

```bash
cd build
ctest # Runs all tests defined in CMakeLists.txt (unit_tests, integration_tests)
```

To run a specific test executable:

```bash
./unit_tests
./integration_tests
```

## Contributing

For contributions, please fork the repository and submit a pull request.
Ensure your code adheres to the project's coding standards and includes appropriate tests.

## License

This project is licensed under the MIT License.
```