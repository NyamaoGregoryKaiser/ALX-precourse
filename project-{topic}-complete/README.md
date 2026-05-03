```markdown
# ML-Toolkit: Enterprise ML Utilities System

## Overview
ML-Toolkit is a comprehensive, production-ready Machine Learning Utilities System designed to streamline common ML operations such as data preprocessing, feature engineering, model management, and evaluation. Built with a high-performance C++ backend, it exposes a RESTful API for seamless integration with various client applications, along with robust database management, configuration, testing, and deployment features.

### Key Features
- **High-Performance C++ Backend**: Utilizes C++ with Eigen for efficient numerical operations.
- **RESTful API**: Exposes CRUD operations for datasets, models, and processing pipelines.
- **ML Utility Modules**: Includes data scaling (MinMax, Standard), imputation (Mean), and feature engineering (Polynomial Features).
- **Database Management**: PostgreSQL for metadata storage, with `pqxx` for C++ interaction.
- **Authentication & Authorization**: JWT-based token verification for API security.
- **Robust Error Handling**: Centralized exception handling and consistent API error responses.
- **Logging & Monitoring**: Structured logging using `spdlog`.
- **Caching Layer**: In-memory LRU cache for frequently accessed pipeline results.
- **Rate Limiting**: Token bucket algorithm to protect API endpoints from abuse.
- **Configuration**: Flexible configuration via `.conf` files and environment variables.
- **Containerization**: Docker and Docker Compose setup for easy deployment.
- **CI/CD Integration**: GitHub Actions pipeline for automated testing and deployment.
- **Comprehensive Testing**: Unit tests (Google Test), Integration tests (Python `requests`), Performance tests (Locust).
- **Extensive Documentation**: This README, API docs, Architecture docs, and Deployment guide.

## Architecture
The system employs a multi-layered architecture:
1.  **Client Layer**: A conceptual web frontend (e.g., React/Vue) or a CLI client interacts with the API.
2.  **API Layer (C++)**: Built using the Crow microframework, handling HTTP requests, authentication, authorization, rate limiting, and caching. It orchestrates calls to the business logic layer.
3.  **Business Logic Layer (C++)**: Contains core ML utility modules (preprocessing, feature engineering, evaluation) and model/dataset management logic. Utilizes Eigen for efficient numerical operations.
4.  **Database Layer**: PostgreSQL for persistent storage of metadata (datasets, models, pipelines). `pqxx` library handles C++ interaction.
5.  **Common Services**: Logging (`spdlog`), configuration management, error handling, and utility functions.

For a detailed architectural overview, see [Architecture.md](docs/Architecture.md).

## Setup and Installation

### Prerequisites
-   **Docker** and **Docker Compose**: For easy setup of the database and API server.
-   **C++ Development Environment**:
    -   `g++` (C++17 compliant compiler)
    -   `CMake` (version 3.10+)
    -   `libpq-dev` and `libpqxx-dev` (PostgreSQL C++ client libraries)
    -   `libboost-dev` (Crow might depend on some Boost modules, though it tries to minimize)
    -   `git`
-   **Python (for testing)**:
    -   `pip`
    -   `psycopg2-binary` (for DB cleanup in Python tests)
    -   `requests`, `PyJWT`, `pytest`, `locust` (install via `requirements.txt`)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/ML-Toolkit.git
cd ML-Toolkit
```

### 2. Prepare Vendor Dependencies
The `CMakeLists.txt` uses `FetchContent` for Eigen. For Crow, nlohmann/json, spdlog, and jwt-cpp, you need to clone them into the `vendor/` directory:
```bash
mkdir -p vendor
git clone https://github.com/CrowCpp/Crow.git vendor/Crow
git clone https://github.com/nlohmann/json.git vendor/nlohmann_json
git clone https://github.com/gabime/spdlog.git vendor/spdlog
git clone https://github.com/Thalhammer/jwt-cpp.git vendor/jwt-cpp
```

### 3. Database & Server Setup with Docker Compose
1.  **Environment Configuration**: Create a `.env` file in the project root by copying `config/.env.example` and filling in your desired values (especially for `ML_DB_PASSWORD` and `ML_JWT_SECRET` in production).
    ```bash
    cp config/.env.example .env
    # Edit .env to set your secrets
    ```
2.  **Build and Run**: Use Docker Compose to start the PostgreSQL database and the ML-Toolkit API server.
    ```bash
    docker-compose build
    docker-compose up -d
    ```
    This will:
    -   Build the `mltoolkit_server` Docker image.
    -   Start a PostgreSQL container (`mltoolkit_db`).
    -   Run database migrations and seed data using scripts in `database/migrations` and `database/seed_data.sql`.
    -   Start the `mltoolkit_server` container, which will wait for the database to be healthy, then run the C++ API server.

    The API server will be accessible at `http://localhost:8080`.

### 4. Local C++ Build (Alternative to Docker)
If you prefer to build and run the C++ application directly on your host machine:
1.  **Install C++ Dependencies**:
    ```bash
    sudo apt-get update
    sudo apt-get install -y build-essential cmake git libpq-dev libpqxx-dev libboost-dev
    ```
2.  **Configure and Build**:
    ```bash
    mkdir build
    cd build
    cmake .. -DCMAKE_BUILD_TYPE=Release
    make
    ```
3.  **Run**:
    ```bash
    ./MLToolkit_Server
    ```
    Ensure your PostgreSQL database is running and accessible from `localhost` with the credentials specified in `config/default.conf` or your environment variables.

### 5. Python Test Dependencies
```bash
pip install -r requirements.txt
```

## Usage

### API Endpoints
The API is served at `http://localhost:8080/api/v1`.

**Authentication**:
-   `POST /api/v1/auth/login`: Authenticate and get a JWT token.
    ```json
    { "username": "admin", "password": "adminpass" }
    ```
    Use the returned `token` in the `Authorization: Bearer <token>` header for all protected endpoints.

**Datasets**:
-   `POST /api/v1/datasets`: Create a new dataset.
-   `GET /api/v1/datasets`: Get all datasets.
-   `GET /api/v1/datasets/{id}`: Get a dataset by ID.
-   `PUT /api/v1/datasets/{id}`: Update a dataset.
-   `DELETE /api/v1/datasets/{id}`: Delete a dataset.

**Models**:
-   `POST /api/v1/models`: Create a new ML model entry.
-   `GET /api/v1/models`: Get all models.
-   `GET /api/v1/models/{id}`: Get a model by ID.
-   `PUT /api/v1/models/{id}`: Update a model.
-   `DELETE /api/v1/models/{id}`: Delete a model.

**Pipelines**:
-   `POST /api/v1/pipelines`: Create a new processing pipeline.
-   `GET /api/v1/pipelines`: Get all pipelines.
-   `GET /api/v1/pipelines/{id}`: Get a pipeline by ID.
-   `PUT /api/v1/pipelines/{id}`: Update a pipeline.
-   `DELETE /api/v1/pipelines/{id}`: Delete a pipeline.
-   `POST /api/v1/pipelines/{id}/execute`: Execute a pipeline with input data.
-   `POST /api/v1/models/{model_id}/evaluate`: Evaluate a model using a pipeline and true labels.

For detailed API specifications, refer to [API.md](docs/API.md).

## Testing

### Running Unit Tests (C++)
```bash
cd build
make MLToolkit_Server_Tests # Ensure test executable is built
./MLToolkit_Server_Tests
```
Or, if using CTest:
```bash
cd build
ctest
```

### Running Integration Tests (Python)
Ensure the Docker Compose services are running (`docker-compose up -d`).
```bash
pytest tests/integration/test_api_integration.py
```

### Running Performance Tests (Locust)
Ensure the Docker Compose services are running (`docker-compose up -d`).
1.  Start Locust UI:
    ```bash
    locust -f tests/performance/locustfile.py
    ```
2.  Open your browser to `http://localhost:8089` (or the address Locust indicates).
3.  Enter the number of users, spawn rate, and host (`http://localhost:8080`), then start swarming.

## Documentation
-   **README.md**: Current file, project overview, setup, usage.
-   **API.md**: Detailed API endpoint descriptions, request/response examples.
-   **Architecture.md**: In-depth explanation of the system's design and components.
-   **Deployment.md**: Guide for deploying the application to various environments (Docker, Kubernetes, etc.).

## Contributing
Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write comprehensive tests.
5.  Ensure all tests pass (`pytest` and `ctest`).
6.  Commit your changes (`git commit -am 'Add new feature'`).
7.  Push to the branch (`git push origin feature/your-feature-name`).
8.  Create a new Pull Request.

## License
This project is licensed under the MIT License. See the LICENSE file for details.
```