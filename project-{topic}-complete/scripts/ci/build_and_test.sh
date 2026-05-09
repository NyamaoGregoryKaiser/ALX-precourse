```bash
#!/bin/bash
set -e

echo "--- CI/CD Pipeline: Build and Test VisuFlow Analytics ---"

# --- 1. Environment Setup ---
echo "Setting up environment..."
# Assuming Docker and Docker Compose are installed
# Install build dependencies if running outside Docker (e.g., on a bare metal CI agent)
# apt-get update && apt-get install -y cmake g++ libpq-dev ...

# --- 2. Build Docker Image ---
echo "Building Docker image for VisuFlow API..."
docker build -t visuflow-api:latest .
echo "Docker image built successfully."

# --- 3. Start Services with Docker Compose (for integration & API tests) ---
echo "Starting database and API services with Docker Compose..."
docker-compose up -d visuflow_db visuflow_api
sleep 20 # Give services time to fully start and apply migrations/seed data
docker-compose ps

# Check if services are healthy (optional, but good practice)
echo "Checking service health..."
docker-compose exec visuflow_db pg_isready -h localhost -p 5432 -U visuflow_user -d visuflow_db || { echo "DB not healthy!"; exit 1; }
echo "DB is healthy."

# --- 4. Run C++ Unit & Integration Tests ---
echo "Running C++ Unit and Integration Tests..."
# Need to run tests inside the container or on a host with correct dependencies
# For simplicity here, we'll run from the builder stage if needed, or directly if host has GTest/Pqxx
# If running on host, ensure all C++ deps (Pistache, JWT-CPP, SOCI/pqxx, GTest, spdlog, nlohmann/json) are installed.

# Option A: Run tests from the builder image
# docker run --rm visuflow-api:latest /app/tests/run_all_tests # Requires test runner inside app image

# Option B: Run tests on host (if host setup allows)
# Assuming tests are built in a 'build' directory and named 'visuflow_tests'
mkdir -p build && cd build
cmake ..
make visuflow_tests
./tests/visuflow_tests || { echo "C++ tests failed!"; exit 1; }
cd ..
echo "C++ tests passed successfully."

# --- 5. Run Python API Tests ---
echo "Running Python API Tests..."
# Install Python dependencies
pip install -r requirements.txt

# Run pytest against the running API container
pytest tests/api/test_api.py --base-url http://localhost:9080 || { echo "API tests failed!"; exit 1; }
echo "Python API tests passed successfully."

# --- 6. Run Performance Tests (brief sample) ---
echo "Running Performance Tests (Locust - 1 user, 5s duration)..."
locust -f scripts/performance_test.py --host http://localhost:9080 --users 1 --spawn-rate 1 --run-time 5s --headless || { echo "Performance tests showed issues!"; exit 1; }
echo "Performance tests completed."

# --- 7. Clean Up ---
echo "Tearing down Docker Compose services..."
docker-compose down -v
echo "CI/CD pipeline completed successfully!"
```