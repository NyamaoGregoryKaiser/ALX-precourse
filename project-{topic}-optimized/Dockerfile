```dockerfile
# Stage 1: Build the application
FROM debian:bookworm-slim AS build-env

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libjsoncpp-dev \
    libsqlite3-dev \
    libssl-dev \
    uuid-dev \
    zlib1g-dev \
    drogon \
    libjwt-dev \
    libbcrypt-dev \
    sqlite3 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy source code
COPY . /app

# Configure and build
RUN cmake -B build -S . \
    -DDROGON_PATH=/usr/local/include/drogon \
    -DBUILD_SHARED_LIBS=ON \
    -DOpenSSL_ROOT_DIR=/usr/local/ssl \
    -DOpenSSL_LIBRARIES=/usr/local/ssl/lib \
    -DOpenSSL_INCLUDE_DIR=/usr/local/ssl/include

RUN cmake --build build --target all

# Stage 2: Create the final runtime image
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libjsoncpp25 \
    libsqlite3-0 \
    libssl3 \
    libuuid1 \
    zlib1g \
    sqlite3 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy the built executable, libraries, configs, and static files from the build stage
COPY --from=build-env /app/build/TaskManagementSystem /app/
COPY --from=build-env /app/build/config.json /app/
COPY --from=build-env /app/web /app/web
COPY --from=build-env /app/db /app/db # Copy initial db structure

# Copy necessary Drogon shared libraries (if not part of base image)
# This step might be tricky depending on how Drogon is installed in the build stage.
# Assuming Drogon installs its libs to standard paths or they are already present.
# If `ldd TaskManagementSystem` shows missing libs, add them here.
# For example: COPY --from=build-env /usr/local/lib/libdrogon.so* /usr/local/lib/

# Expose the port Drogon listens on
EXPOSE 8080

# Run migrations and start the application
CMD ["/bin/bash", "-c", "chmod +x scripts/run_migrations.sh && ./scripts/run_migrations.sh && ./TaskManagementSystem"]
```