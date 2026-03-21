```dockerfile
# Use a base image with C++ toolchain
FROM debian:bookworm-slim AS build

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libsqlite3-dev \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy CMakeLists.txt and source code
COPY CMakeLists.txt .
COPY src ./src
COPY config ./config
# COPY tests ./tests # If running tests in build stage

# Configure and build the application
# For Crow, you might need to enable CROW_STD_REGEX_COMPAT if issues arise.
# Add -DCROW_STD_REGEX_COMPAT=ON if needed.
# Ensure FetchContent dependencies are handled properly by CMake.
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release
RUN cmake --build build --target payment_processor

# --- Multi-stage build for smaller final image ---
FROM debian:bookworm-slim AS runtime

# Install runtime dependencies (e.g., SQLite3 library)
RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the built executable and config from the build stage
COPY --from=build /app/build/payment_processor ./payment_processor
COPY config/app.config.json ./config/app.config.json
COPY migrations ./migrations # Copy migrations for potential runtime use
COPY seed_data ./seed_data   # Copy seed data for potential runtime use

# Create a directory for logs and database file
RUN mkdir -p logs

# Expose the port the server runs on
EXPOSE 8080

# Command to run the application
# Note: For SQLite, the DB file will be created in /app if not existing.
# Consider using a volume for /app/payment_processor.db to persist data outside the container.
CMD ["./payment_processor"]
```