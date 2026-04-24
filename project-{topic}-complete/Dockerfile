```dockerfile
# Stage 1: Build the C++ application
FROM mcr.microsoft.com/vcpkg/github/actions/debian-stable AS builder

# Set VCPKG_ROOT for consistency
ENV VCPKG_ROOT=/vcpkg
ENV PATH="${VCPKG_ROOT}:${PATH}"

# Install essential build tools
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    pkg-config \
    libpq-dev \
    libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Clone vcpkg if not already present (might be in actions runner, but safer)
# This part might be skipped if using a vcpkg pre-installed image or multi-stage from specific vcpkg base
# If you run into issues, consider a direct vcpkg install:
# RUN git clone https://github.com/microsoft/vcpkg.git /vcpkg && \
#     /vcpkg/bootstrap-vcpkg.sh -disableMetrics && \
#     /vcpkg/vcpkg integrate install

WORKDIR /app

# Copy vcpkg.json and CMakeLists.txt first to leverage Docker cache
COPY vcpkg.json CMakeLists.txt ./
# Copy C++ source code
COPY src src/
COPY tests tests/
COPY config config/

# Install dependencies specified in vcpkg.json
# Ensure correct triplet is used, e.g., x64-linux
# vcpkg.json should be installed via --recurse if there are transitive deps
# The vcpkg base image typically has vcpkg itself pre-built.
RUN $VCPKG_ROOT/vcpkg install --triplet=x64-linux --recurse

# Configure and build the project
RUN cmake -B build -S . \
    -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake \
    -DVCPKG_TARGET_TRIPLET=x64-linux \
    -DCROW_BUILD_EXAMPLES=OFF \
    -DCROW_BUILD_TESTS=OFF \
    -DCROW_AMALGAMATION=OFF \
    -DCROW_MSVC_USE_LIBCPP=OFF

RUN cmake --build build --config Release

# --- Stage 2: Create a minimal runtime image ---
FROM debian:stable-slim

# Install necessary runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    libcurl4 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the built backend executable from the builder stage
COPY --from=builder /app/build/src/backend/ecommerce_backend ./ecommerce_backend

# Copy environment config (production settings would be injected)
COPY config/.env.example ./config/.env

# Make the startup script executable
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose the application port
EXPOSE 8080

# Run the entrypoint script
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
```