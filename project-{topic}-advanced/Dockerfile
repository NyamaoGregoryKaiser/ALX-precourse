# Use a Conan-provided base image or build toolchain
# For C++ applications, a multi-stage build is highly recommended
# to keep the final image small.

# --- Stage 1: Build environment ---
FROM conanio/gcc12 AS builder

# Set working directory
WORKDIR /app

# Copy conanfile.txt first to leverage Docker cache for dependencies
COPY conanfile.txt .
# Install Conan dependencies
RUN conan install . --output-folder=build --build=missing --settings=build_type=Release

# Copy the rest of the source code
COPY . .

# Create build directory and run CMake
RUN cmake -S . -B build -DCMAKE_TOOLCHAIN_FILE=./build/conan_toolchain.cmake -DCMAKE_BUILD_TYPE=Release
# Build the application
RUN cmake --build build

# --- Stage 2: Runtime environment ---
FROM debian:bookworm-slim

# Install runtime dependencies (e.g., libpq for PostgreSQL client)
# Drogon often links dynamically to libpq and OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy compiled application and necessary runtime files from builder stage
COPY --from=builder /app/build/auth_system ./auth_system
COPY --from=builder /app/config ./config
COPY --from=builder /app/client ./client
COPY --from=builder /app/db/migrations ./db/migrations
COPY --from=builder /app/db/seed ./db/seed

# Expose the port Drogon listens on
EXPOSE 8080

# Set environment variable for JWT secret (for production, use Docker secrets or Kubernetes secrets)
ENV JWT_SECRET="default-secret-for-development-only-CHANGE-ME-IN-PROD"

# Command to run the application
# We need to run migrations and seed data before starting the app.
# This simple setup does it on container startup. For production, migrations
# are usually run as a separate step.
CMD ["/bin/bash", "-c", " \
    # Run migrations \
    /app/auth_system --skip-orm-sync --no-autocreate-tables --migration-dir /app/db/migrations --run-migration-up && \
    # Run seed data \
    /app/auth_system --skip-orm-sync --no-autocreate-tables --seed-dir /app/db/seed --run-seed && \
    # Start the application \
    ./auth_system \
"]

```