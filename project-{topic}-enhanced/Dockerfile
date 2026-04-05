```dockerfile
# Stage 1: Build the C++ application
FROM gcc:12-bullseye AS builder

WORKDIR /app

# Install dependencies (CMake, SQLite3 dev, spdlog dev, etc.)
# Crow is typically header-only, so no specific `dev` package for it
RUN apt-get update && apt-get install -y \
    cmake \
    libsqlite3-dev \
    libssl-dev \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Clone Crow framework (header-only, so we just need its files)
# A more robust solution for production would be to use vcpkg or similar C++ package manager
# For this example, we'll place it in a common include path.
RUN git clone https://github.com/ipkn/crow.git /usr/local/include/crow

# Clone spdlog (can be installed via apt, but compiling from source ensures latest or specific version)
# Or, if `libspdlog-dev` package is stable enough: RUN apt-get install -y libspdlog-dev
# For simplicity here, we assume system-installed `libspdlog-dev` is sufficient,
# as `find_package(spdlog)` in CMake will try to find it.

COPY . .

# Create a build directory
RUN mkdir -p build

# Configure and build the application
WORKDIR /app/build
# Use -DCMAKE_BUILD_TYPE=Release for optimized build
RUN cmake .. -DCMAKE_BUILD_TYPE=Release
RUN make -j$(nproc)

# Stage 2: Create a minimal runtime image
FROM debian:bullseye-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    libspdlog1.9 \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create data and logs directories
RUN mkdir -p /app/data /app/logs

# Copy the built executable from the builder stage
COPY --from=builder /app/build/TaskManagementSystem /app/TaskManagementSystem

# Copy the database scripts and seed data
COPY db /app/db

# Copy the .env.example file as a template
COPY .env.example /app/.env.example

# Set entrypoint to run the migrations and then start the application
# This is for initial setup; in production, migrations are often run separately.
ENTRYPOINT ["/bin/bash", "-c", "/app/db/migrations.sh && exec /app/TaskManagementSystem"]

# Expose the application port
EXPOSE 18080

# Default command if entrypoint is not overridden (handled by ENTRYPOINT above)
CMD []
```