```dockerfile
# Stage 1: Build the C++ application
FROM ubuntu:22.04 as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libpq-dev \
    libpqxx-dev \
    libssl-dev \
    git \
    pkg-config \
    # Install spdlog and jwt-cpp dependencies if not handled by vcpkg/conan
    # For spdlog (usually installed from source or system):
    # For jwt-cpp (depends on OpenSSL, handled by libssl-dev)
    && rm -rf /var/lib/apt/lists/*

# Install specific versions of spdlog and jwt-cpp if not available via lib
# For example, to install spdlog from source:
RUN git clone https://github.com/gabime/spdlog.git /usr/local/src/spdlog \
    && cd /usr/local/src/spdlog && mkdir build && cd build \
    && cmake .. && make -j$(nproc) && make install

# Create a user to avoid running as root
ARG UID=1000
ARG GID=1000
RUN groupadd -g ${GID} appgroup && useradd -u ${UID} -g appgroup -s /bin/bash -m appuser

WORKDIR /app
COPY --chown=appuser:appgroup . /app

# Build the application
USER appuser
RUN mkdir build
WORKDIR /app/build
# Configure CMake to find installed libraries
# Add any specific paths if libraries are not in standard locations
RUN cmake .. \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_PREFIX_PATH="/usr/local;/usr" \
    -Dspdlog_DIR=/usr/local/lib/cmake/spdlog \
    -Dpqxx_DIR=/usr/lib/cmake/pqxx \
    -Dj siedzki_jwt-cpp_DIR=/usr/lib/cmake/jwt-cpp

RUN cmake --build . --config Release

# Stage 2: Create a smaller runtime image
FROM ubuntu:22.04

# Install runtime dependencies (libpq, libpqxx, libssl)
RUN apt-get update && apt-get install -y \
    libpq5 \
    libpqxx-7 \
    libssl3 \
    # And spdlog runtime if it's a shared library
    && rm -rf /var/lib/apt/lists/*

# Create the same user as in the builder stage
ARG UID=1000
ARG GID=1000
RUN groupadd -g ${GID} appgroup && useradd -u ${UID} -g appgroup -s /bin/bash -m appuser

WORKDIR /app
COPY --from=builder --chown=appuser:appgroup /app/build/performance_monitor /app/performance_monitor
COPY --from=builder --chown=appuser:appgroup /app/src/database/migrations /app/src/database/migrations
COPY --from=builder --chown=appuser:appgroup /app/src/database/seed /app/src/database/seed
COPY --from=builder --chown=appuser:appgroup /app/web /app/web
COPY --from=builder --chown=appuser:appgroup /app/.env.example /app/.env.example # Copy example, actual .env will be mounted

# Create logs directory
RUN mkdir -p /app/logs
RUN chown -R appuser:appgroup /app/logs

# Expose the application port
EXPOSE 8080

# Run the application as the appuser
USER appuser

# Set the entry point
# We'll expect .env to be mounted, or variables to be passed
CMD ["./performance_monitor"]

```