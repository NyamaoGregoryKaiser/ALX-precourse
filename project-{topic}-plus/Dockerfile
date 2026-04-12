# Use a C++ base image (e.g., Ubuntu with build tools)
FROM ubuntu:22.04

LABEL maintainer="ALX Software Engineering Student"

# Set environment variables for non-interactive installation
ENV DEBIAN_FRONTEND=noninteractive

# Update and install necessary packages
# build-essential for C++ compiler, cmake for build system
# libpistache-dev, libsqlite3-dev, libjsoncpp-dev for main dependencies
# libssl-dev for jwt-cpp, gosu for dropping privileges
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libpistache-dev \
    libsqlite3-dev \
    libjsoncpp-dev \
    libssl-dev \
    git \
    wget \
    gosu \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy CMakeLists.txt and source code
# We copy CMakeLists.txt and config first to leverage Docker cache for dependencies
COPY CMakeLists.txt .
COPY src ./src
COPY config ./config
COPY tests ./tests # Copy tests for CI/CD container

# Build jwt-cpp as an external project via CMake
# This will be handled by the main CMakeLists.txt, so no direct clone needed here.

# Build the application
RUN mkdir build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release && \
    make -j$(nproc)

# Create a non-root user for security best practices
ARG UID=1000
ARG GID=1000
RUN groupadd -g $GID appgroup && useradd -u $UID -g $GID -s /bin/bash appuser

# Create directories for data and logs with proper permissions
RUN mkdir -p /app/data /app/logs && \
    chown -R appuser:appgroup /app/data /app/logs && \
    chmod -R 770 /app/data /app/logs

# Expose the port the application listens on
EXPOSE 9080

# Switch to the non-root user
USER appuser

# Define entrypoint script to handle migrations, seeding, and starting the server
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Default command to run the server
CMD ["api_server"]
```