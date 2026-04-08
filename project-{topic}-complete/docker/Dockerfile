```dockerfile
# Use a C++ base image with build tools
FROM ubuntu:22.04 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libpoco-dev \
    libspdlog-dev \
    libjwt-dev \
    libpq-dev \
    git \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Clone jwt-cpp (if not available via package manager or for latest)
# Note: For production, prefer package manager or vendoring.
# RUN git clone https://github.com/Thalhammer/jwt-cpp.git /usr/src/jwt-cpp && \
#     cd /usr/src/jwt-cpp && \
#     mkdir build && cd build && \
#     cmake .. && make install

WORKDIR /app

# Copy source code
COPY . .

# Build application
RUN mkdir build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release && \
    make -j$(nproc)

# --- Runtime Image ---
FROM ubuntu:22.04

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpoco-foundation-dev \
    libpoco-net-dev \
    libpoco-util-dev \
    libpoco-data-dev \
    libpoco-data-postgresql-dev \
    libspdlog-dev \
    libjwt-dev \
    libpq5 \
    postgresql-client-common \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the built executable and configuration from the builder stage
COPY --from=builder /app/build/db_optimizer ./db_optimizer
COPY app/db/migrations ./app/db/migrations
COPY config.json.example ./config.json

# Copy scripts for migrations/seeding
COPY scripts/*.sh ./scripts/

# Ensure scripts are executable
RUN chmod +x ./scripts/*.sh

EXPOSE 8080

# Environment variables for default database settings for the optimizer itself
ENV DB_OPTIMIZER_DB_HOST=db_optimizer_postgres \
    DB_OPTIMIZER_DB_PORT=5432 \
    DB_OPTIMIZER_DB_NAME=db_optimizer_db \
    DB_OPTIMIZER_DB_USER=db_optimizer_user \
    DB_OPTIMIZER_DB_PASSWORD=db_optimizer_password \
    DB_OPTIMIZER_SERVER_PORT=8080 \
    DB_OPTIMIZER_JWT_SECRET=superSecretKey123!@# \
    DB_OPTIMIZER_LOG_LEVEL=info \
    DB_OPTIMIZER_MONITOR_INTERVAL_SECONDS=300

# Command to run migrations and then start the application
CMD ["/bin/bash", "-c", "./scripts/migrate.sh && ./scripts/seed.sh && ./db_optimizer"]

```