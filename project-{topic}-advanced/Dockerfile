```dockerfile
# Dockerfile for Mobile Backend

# --- Build Stage ---
FROM gcc:10-buster AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libsqlite3-dev \
    libspdlog-dev \
    git \
    libssl-dev \
    # Google Test dependencies (if building from source)
    # For simplicity, we assume GTest is available or installed via dev package
    # For a robust setup, consider vcpkg or Conan within the build stage
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy CMakeLists.txt and source code
COPY CMakeLists.txt ./
COPY src/ ./src/
COPY tests/ ./tests/

# Copy external header-only libraries if not managed by package manager
# Example: Crow and jwt-cpp
# Assuming 'libs' directory contains crow_all.h and jwt-cpp
COPY libs/ ./libs/

# Create build directory and compile
RUN cmake -B build \
    -DCMAKE_BUILD_TYPE=Release \
    -DJWT_CPP_PATH=/app/libs/jwt-cpp \
    -DCROW_HEADERS_PATH=/app/libs
RUN cmake --build build

# --- Runtime Stage ---
FROM debian:buster-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    libspdlog0 \
    # For JWT if it has runtime dependencies (e.g., OpenSSL)
    libssl1.1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the built executable from the builder stage
COPY --from=builder /app/build/mobile_backend ./mobile_backend

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Expose the port (default 18080 as per .env.example)
EXPOSE 18080

# Command to run the application
# Use a default database path, can be overridden by mounting a volume
CMD ["./mobile_backend"]
```