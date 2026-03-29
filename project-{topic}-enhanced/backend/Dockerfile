```dockerfile
# Stage 1: Build the C++ application
FROM gcc:11.3 AS builder

WORKDIR /app

# Install dependencies (Crow, nlohmann/json, spdlog, pqxx, jwt-cpp, openssl, argon2)
# These are common package names, actual names might vary slightly by distribution.
# We're using a base image that already has g++ and build tools.
RUN apt-get update && apt-get install -y \
    cmake \
    libboost-all-dev \
    libpq-dev \
    libpqxx-dev \
    libssl-dev \
    libargon2-dev \
    pkg-config \
    # Assuming crow, nlohmann-json, spdlog, jwt-cpp are installed manually or via vcpkg/conan
    # For a production setup, consider vcpkg or Conan for C++ dependency management
    # For this example, we'll mock their installation by ensuring required headers/libs are present
    # Manual install for demonstration purposes:
    # Example for nlohmann/json (usually header-only)
    # mkdir -p /usr/local/include/nlohmann && \
    # wget -O /usr/local/include/nlohmann/json.hpp https://raw.githubusercontent.com/nlohmann/json/develop/single_include/nlohmann/json.hpp
    # For Crow, spdlog, jwt-cpp, you'd typically clone and build or use system packages
    # For this Dockerfile, we'll assume they are available or discoverable by CMake's find_package
    # For a real project, use a dependency manager or carefully manage system libs.
    # We will ensure `libpq-dev`, `libpqxx-dev`, `libssl-dev` (for OpenSSL) and `libargon2-dev` are present
    && rm -rf /var/lib/apt/lists/*

# Copy source code and CMakeLists.txt
COPY backend/CMakeLists.txt ./CMakeLists.txt
COPY backend/src src/
COPY backend/tests tests/

# Configure and build
RUN cmake -DCMAKE_BUILD_TYPE=Release .
RUN cmake --build . -j$(nproc)

# Stage 2: Create a minimal runtime image
FROM debian:bullseye-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    libssl-dev \
    libargon2-1 \
    # Add any other runtime dependencies for Crow, spdlog if they have shared libs not in debian-slim
    && rm -rf /var/lib/apt/lists/*

# Copy the built executable from the builder stage
COPY --from=builder /app/DataVizSystem ./DataVizSystem
COPY --from=builder /app/assets ./assets # If assets are needed at runtime

# Expose the port the server listens on (e.g., 18080 for Crow)
EXPOSE 18080

# Environment variables (DB_HOST, DB_PORT, etc. will be passed via docker-compose or Kubernetes)
ENV DATA_VIZ_DB_HOST=localhost
ENV DATA_VIZ_DB_PORT=5432
ENV DATA_VIZ_DB_USER=dataviz_user
ENV DATA_VIZ_DB_PASSWORD=dataviz_password
ENV DATA_VIZ_DB_NAME=dataviz_db
ENV DATA_VIZ_JWT_SECRET="your_super_secret_jwt_key_please_change"
ENV DATA_VIZ_APP_PORT=18080
ENV DATA_VIZ_LOG_LEVEL=info

# Run the application
CMD ["./DataVizSystem"]
```