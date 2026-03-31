# Stage 1: Build the application
FROM debian:bullseye-slim AS builder

LABEL maintainer="ALX Software Engineer"

WORKDIR /app

# Install build dependencies
# Drogon dependencies: libjson-c-dev, libuuid-dev, libssl-dev, zlib1g-dev, libbrotli-dev, libhiredis-dev, libpq-dev
# Other dependencies: cmake, build-essential, git, libboost-dev (for jwt-cpp, though it mostly relies on c++17), libspdlog-dev
RUN apt-get update && apt-get install -y \
    cmake \
    build-essential \
    git \
    libjsoncpp-dev \
    libuuid-dev \
    libssl-dev \
    zlib1g-dev \
    libbrotli-dev \
    libhiredis-dev \
    libpq-dev \
    libspdlog-dev \
    wget \
    pkg-config \
    doxygen \
    graphviz \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Drogon
# Build Drogon from source for control over version and to avoid potential packaging issues
ARG DROGON_VERSION=1.8.0
RUN git clone --depth 1 -b v${DROGON_VERSION} https://github.com/drogonframework/drogon.git /usr/local/src/drogon \
    && cd /usr/local/src/drogon \
    && git submodule update --init \
    && cmake -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --target install \
    && ldconfig

# Install jwt-cpp
# For simplicity, we'll clone and install it from source.
# Ensure boost is not strictly required if only basic algorithms like HS256 are used.
# Recent jwt-cpp versions can work without Boost depending on features.
# If Boost is truly needed for jwt-cpp, add libboost-dev here.
RUN git clone --depth 1 https://github.com/Thalhammer/jwt-cpp.git /usr/local/src/jwt-cpp \
    && cd /usr/local/src/jwt-cpp \
    && cmake -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --target install \
    && ldconfig

# Copy source code and CMakeLists
COPY CMakeLists.txt ./
COPY src ./src
COPY tests ./tests
COPY config ./config

# Create a dummy app_config.json for build stage if it's missing (it will be copied again by docker-compose)
RUN mkdir -p config && echo "{}" > config/app_config.json

# Configure and build the application
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release
RUN cmake --build build --target MobileBackend

# Stage 2: Create a minimal runtime image
FROM debian:bullseye-slim

WORKDIR /app

# Install runtime dependencies
# libjsoncpp, libuuid, libssl, zlib, libbrotli, hiredis, libpq, spdlog, libpq-dev
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjsoncpp25 \
    libuuid1 \
    libssl1.1 \
    zlib1g \
    libbrotli1 \
    libhiredis0.15 \
    libpq5 \
    libspdlog1 \
    && rm -rf /var/lib/apt/lists/*

# Copy the built executable from the builder stage
COPY --from=builder /app/build/MobileBackend ./MobileBackend
COPY --from=builder /app/build/app_config.json ./app_config.json
COPY --from=builder /usr/local/lib/libdrogon.so* /usr/local/lib/
COPY --from=builder /usr/local/lib/libjwt-cpp.so* /usr/local/lib/

# Create logs directory
RUN mkdir -p logs

# Set environment variable for dynamic linker to find shared libraries
ENV LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH

EXPOSE 8080

CMD ["./MobileBackend"]