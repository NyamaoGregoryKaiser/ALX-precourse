# Base image for building
FROM debian:bullseye-slim AS build

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libpq-dev \
    libssl-dev \
    uuid-dev \
    pkg-config \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install vcpkg
RUN git clone https://github.com/microsoft/vcpkg.git /vcpkg
RUN /vcpkg/bootstrap-vcpkg.sh

# Set VCPKG_ROOT for the build stage
ENV VCPKG_ROOT /vcpkg

# Copy vcpkg.json and install dependencies
COPY vcpkg.json /app/
WORKDIR /app
RUN /vcpkg/vcpkg install --triplet x64-linux --recurse --x-install-root=/vcpkg_installed

# Copy source code
COPY . /app

# Configure and build the application using CMake
WORKDIR /app
RUN cmake -B build -S . \
    -DCMAKE_TOOLCHAIN_FILE=/vcpkg/scripts/buildsystems/vcpkg.cmake \
    -DVCPKG_TARGET_TRIPLET=x64-linux \
    -DCMAKE_BUILD_TYPE=Release
RUN cmake --build build --target cms_app -j$(nproc)

# --- Runtime Image ---
FROM debian:bullseye-slim AS runtime

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    libssl1.1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the built application and its dependencies from the build stage
COPY --from=build /app/build/cms_app /usr/local/bin/cms_app
COPY --from=build /app/src/frontend /usr/local/share/cms_app/frontend

# Copy vcpkg installed runtime libraries
# Find dynamic libraries required by the app and copy them
# This is a bit simplified; a more robust way would be to use 'ldd'
COPY --from=build /vcpkg_installed/x64-linux/lib/libpistache.so* /usr/local/lib/
COPY --from=build /vcpkg_installed/x64-linux/lib/libpqxx.so* /usr/local/lib/
COPY --from=build /vcpkg_installed/x64-linux/lib/libspdlog.so* /usr/local/lib/
COPY --from=build /vcpkg_installed/x64-linux/lib/libjwt-cpp.so* /usr/local/lib/
COPY --from=build /vcpkg_installed/x64-linux/lib/libcrypto.so* /usr/local/lib/
COPY --from=build /vcpkg_installed/x64-linux/lib/libssl.so* /usr/local/lib/
# Need to update linker cache for new libraries
RUN ldconfig

# Expose the application port
EXPOSE 9080

# Set environment variables (for production, use Docker secrets or proper orchestration)
# For this example, we'll set defaults, but they can be overridden by docker-compose or Kubernetes
ENV APP_PORT=9080 \
    JWT_SECRET=supersecretjwtkey_alx_cms_project_12345 \
    LOG_LEVEL=info \
    DB_HOST=db \
    DB_PORT=5432 \
    DB_USER=cms_user \
    DB_PASSWORD=cms_password \
    DB_NAME=cms_db \
    CACHE_MAX_SIZE=100 \
    RATE_LIMIT_ENABLED=true \
    RATE_LIMIT_WINDOW_SECONDS=60 \
    RATE_LIMIT_MAX_REQUESTS=100

# Command to run the application
CMD ["cms_app"]
```