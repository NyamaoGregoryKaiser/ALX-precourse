# Use a C++ build environment base image
FROM debian:bookworm-slim AS builder

LABEL maintainer="Your Name <your.email@example.com>"

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libboost-dev \
    libboost-system-dev \
    libboost-program-options-dev \
    libboost-asio-dev \
    libpq-dev \
    libpqxx-dev \
    libssl-dev \
    pkg-config \
    git \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install nlohmann/json (via vcpkg for robust dependency management or manually)
# For simplicity, let's assume direct download and include if not using vcpkg/conan
# A better approach would be vcpkg or Conan, but that adds more Docker complexity
RUN mkdir -p /opt/nlohmann_json
WORKDIR /opt/nlohmann_json
RUN wget https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp
# For spdlog
RUN mkdir -p /opt/spdlog
WORKDIR /opt/spdlog
RUN git clone --depth 1 https://github.com/gabime/spdlog.git .
RUN mkdir build && cd build && cmake .. && make && make install

# For cryptopp (password hashing)
RUN mkdir -p /opt/cryptopp
WORKDIR /opt/cryptopp
RUN wget https://www.cryptopp.com/cryptopp890.zip && unzip cryptopp890.zip
RUN make -j$(nproc) && make install

# Copy source code
WORKDIR /app
COPY . /app

# Configure and build
RUN cmake -S . -B build \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DSPDLOG_BUILD_SHARED=ON # Link spdlog shared
RUN cmake --build build --target all -j$(nproc)
RUN cmake --install build

# --- Runtime Stage ---
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libboost-system1.74.0 \
    libboost-program-options1.74.0 \
    libboost-asio1.74.0 \
    libpq5 \
    libpqxx-7.7 \
    libssl3 \
    libcryptopp8 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# Copy the built executable and static files
COPY --from=builder /usr/local/bin/DatabaseOptimizer /usr/local/bin/
COPY --from=builder /usr/local/web /usr/local/web
COPY --from=builder /usr/local/etc/.env.example /usr/local/etc/.env.example
COPY --from=builder /usr/local/database /usr/local/database

# Create log directory
RUN mkdir -p /app/logs

WORKDIR /app

# Expose the port
EXPOSE 8080

# Environment variables (to be set via docker-compose or Kubernetes)
ENV SERVER_PORT=8080 \
    SERVER_HOST=0.0.0.0 \
    STATIC_FILES_PATH=/usr/local/web \
    DB_HOST=db \
    DB_PORT=5432 \
    DB_USER=dbo_user \
    DB_PASSWORD=dbo_password_secure \
    DB_NAME=database_optimizer_db \
    JWT_SECRET="a_very_long_and_secure_random_string_for_jwt_signing_which_is_at_least_32_characters_long" \
    LOG_LEVEL=info \
    LOG_FILE=/app/logs/app.log \
    SLOW_QUERY_THRESHOLD_MS=50.0 \
    MIN_INDEX_SUGGESTION_USAGE=5

# Command to run the application
CMD ["/usr/local/bin/DatabaseOptimizer"]
```