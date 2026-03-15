# Dockerfile for the C++ DevOps System Application

# Stage 1: Build the application
# Using a C++ development image with Conan pre-installed
FROM conanio/gcc11 AS builder

WORKDIR /app

# Copy Conan configuration (if any specific profiles are needed)
# COPY profile/conanfile.txt .

# Copy project files
COPY app/CMakeLists.txt app/
COPY app/package.json app/
COPY app/src/ app/src/
COPY app/tests/ app/tests/ # Copy tests for build and run in CI, but not in final image

# Install dependencies using Conan
# This step should be run after copying CMakeLists.txt and conanfile.txt (if used)
# This will create conanbuildinfo.cmake (or similar)
# --build=missing will download and build any missing dependencies
RUN conan install app --output-folder=build --build=missing -s build_type=Release

# Configure CMake and build the application
# -DCMAKE_BUILD_TYPE=Release for optimized build
# -DCMAKE_TOOLCHAIN_FILE to link with Conan's toolchain
RUN cmake app -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake
RUN cmake --build build --config Release

# Stage 2: Create the final lightweight runtime image
FROM ubuntu:22.04

# Set environment variables for the application
ENV APP_PORT=8080 \
    APP_ENV=production \
    DATABASE_PATH="/app/data/app.db" \
    LOG_FILE_PATH="/app/logs/app.log" \
    LOG_LEVEL=info \
    JWT_SECRET_KEY="default_super_secret_key_prod_change_me!" \
    CACHE_TTL_SECONDS=300 \
    RATE_LIMIT_ENABLED=true \
    RATE_LIMIT_MAX_REQUESTS=100 \
    RATE_LIMIT_WINDOW_SECONDS=60

# Install necessary runtime dependencies (e.g., libsqlite3)
# libssl-dev for OpenSSL used by jwt-cpp, curl for health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsqlite3-0 \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create necessary directories and set permissions
RUN mkdir -p /app/data /app/logs
RUN chmod 777 /app/data /app/logs # Ensure app can write to these

# Copy the built executable from the builder stage
COPY --from=builder /app/build/bin/cpp_devops_system_app ./bin/cpp_devops_system_app

# Copy the database schema and seed data
COPY db/schema.sql /app/db/schema.sql
COPY db/seed.sql /app/db/seed.sql

# Expose the application port
EXPOSE ${APP_PORT}

# Entrypoint script to initialize DB and run the app
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]

# Default command to run the application
CMD ["./bin/cpp_devops_system_app"]

# Health check (requires curl in runtime image)
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl --fail http://localhost:${APP_PORT}/health || exit 1