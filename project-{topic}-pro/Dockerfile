```dockerfile
# Stage 1: Build the C++ application
FROM gcc:11.4.0 AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    cmake \
    libpq-dev \
    # Add any other C++ library development packages if not using vcpkg/conan
    # For Crow, spdlog, jwt-cpp, nlohmann-json, if not using a package manager,
    # you'd either install system versions or copy source/pre-built libs.
    # For this example, assuming system libs or simple direct includes.
    # A more robust setup would use vcpkg/conan.
    # Example for jwt-cpp and nlohmann-json if installing from source:
    # git clone https://github.com/Thalhammer/jwt-cpp.git && \
    # git clone https://github.com/nlohmann/json.git
    # and then configure CMake to use them.

# Copy CMakeLists.txt and source code
COPY CMakeLists.txt .
COPY src ./src
COPY tests ./tests
COPY config ./config # Copy .env.example

# Configure and build
RUN cmake -B build -DCROW_BUILD_EXAMPLES=OFF -DCROW_BUILD_TESTS=OFF -DCMAKE_BUILD_TYPE=Release
RUN cmake --build build --config Release

# Stage 2: Create the runtime image
FROM debian:bullseye-slim

WORKDIR /app

# Install runtime dependencies for libpqxx (PostgreSQL client)
RUN apt-get update && apt-get install -y \
    libpq5 \
    # Clean up apt cache
    && rm -rf /var/lib/apt/lists/*

# Copy the built executable from the builder stage
COPY --from=builder /app/build/AuroraMetrics ./AuroraMetrics

# Copy the web frontend assets
COPY --from=builder /app/build/web/public ./web/public

# Copy the .env.example (or generate .env from it)
COPY config/.env.example ./.env.example

# Set environment variables (for production, these would be managed by orchestrator)
ENV SERVER_PORT=8080
ENV DATABASE_URL="postgresql://aurora_user:aurora_password@pgdb:5432/aurora_metrics_db"
ENV JWT_SECRET="YOUR_SUPER_SECRET_JWT_KEY_HERE_MIN_32_CHARS"
ENV AGENT_INTERVAL_SECONDS=10

EXPOSE 8080

CMD ["./AuroraMetrics"]
```