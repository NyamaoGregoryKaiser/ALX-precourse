```dockerfile
# Dockerfile for ML-Toolkit C++ API Server

# 1. Build Stage
FROM ubuntu:22.04 AS builder

# Set environment variables for non-interactive installation
ENV DEBIAN_FRONTEND=noninteractive

# Update and install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libpq-dev \
    libpqxx-dev \
    libboost-dev \
    curl \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
ARG UID=1000
ARG GID=1000
RUN groupadd -g $GID mltoolkituser && useradd -m -u $UID -g $GID mltoolkituser
USER mltoolkituser

# Set working directory
WORKDIR /home/mltoolkituser/app

# Copy source code and CMake files
COPY --chown=mltoolkituser:mltoolkituser . .

# Ensure vendor directories are present (assuming they are cloned locally before docker build)
RUN if [ ! -d "vendor/Crow" ]; then git clone https://github.com/CrowCpp/Crow.git vendor/Crow; fi
RUN if [ ! -d "vendor/nlohmann_json" ]; then git clone https://github.com/nlohmann/json.git vendor/nlohmann_json; fi
RUN if [ ! -d "vendor/spdlog" ]; then git clone https://github.com/gabime/spdlog.git vendor/spdlog; fi
RUN if [ ! -d "vendor/jwt-cpp" ]; then git clone https://github.com/Thalhammer/jwt-cpp.git vendor/jwt-cpp; fi

# Build the application
# Create a build directory
RUN cmake -B build -S . \
    -DCMAKE_BUILD_TYPE=Release \
    -DCROW_BUILD_EXAMPLES=OFF \
    -DCROW_BUILD_TESTS=OFF \
    -DSPDLOG_BUILD_EXAMPLES=OFF \
    -DSPDLOG_BUILD_TESTS=OFF \
    -DNLOHMANN_JSON_BUILD_TESTS=OFF \
    -DNLOHMANN_JSON_BUILD_BENCHMARKS=OFF \
    -DJWT_CPP_BUILD_EXAMPLES=OFF \
    -DJWT_CPP_BUILD_TESTS=OFF \
    -DBUILD_SHARED_LIBS=ON \
    && cmake --build build

# 2. Runtime Stage
FROM ubuntu:22.04 AS runtime

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    libpqxx-7 \
    libstdc++6 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
ARG UID=1000
ARG GID=1000
RUN groupadd -g $GID mltoolkituser && useradd -m -u $UID -g $GID mltoolkituser
USER mltoolkituser

# Set working directory
WORKDIR /home/mltoolkituser/app

# Copy the built executable and configuration from the builder stage
COPY --from=builder /home/mltoolkituser/app/build/MLToolkit_Server .
COPY --from=builder /home/mltoolkituser/app/config ./config
COPY --from=builder /home/mltoolkituser/app/database ./database
COPY --from=builder /home/mltoolkituser/app/ml_toolkit.log ./ml_toolkit.log # Pre-create log file

# Expose the port the API server runs on
EXPOSE 8080

# Entrypoint script
COPY docker/entrypoint.sh .
RUN chmod +x entrypoint.sh

# Run the application
ENTRYPOINT ["./entrypoint.sh"]
```