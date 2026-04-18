# Use a C++ build image
FROM gcc:12-bullseye AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    cmake \
    libpq-dev \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    curl \
    doxygen \
    # Needed for Crow's curl dependency for some features, though we might not use them directly.
    # It's good practice to ensure all potential transitive deps are met.
    libcurl4-openssl-dev

# Set working directory
WORKDIR /app

# Clone header-only libraries (or add them as submodules if preferred)
# Crow
RUN git clone https://github.com/ipkn/crow.git /app/crow \
    && cd /app/crow && git checkout a752697 # Use a specific commit for stability

# Nlohmann JSON
RUN git clone https://github.com/nlohmann/json.git /app/json \
    && cd /app/json && git checkout v3.11.2 # Use a specific version

# spdlog
RUN git clone https://github.com/gabime/spdlog.git /app/spdlog \
    && cd /app/spdlog && git checkout v1.11.0 # Use a specific version

# jwt-cpp
RUN git clone https://github.com/Thalhammer/jwt-cpp.git /app/jwt-cpp \
    && cd /app/jwt-cpp && git checkout v0.7.0 # Use a specific version

# Copy project source code
COPY . .

# Build the application
# We use a build directory inside /app/build
# -D CMAKE_BUILD_TYPE=Release for optimized build
# -D CMAKE_INSTALL_PREFIX=/usr/local to install to system paths for the final image
RUN mkdir -p build && cd build && \
    cmake .. \
        -DCROW_ROOT=/app/crow \
        -DNLOHMANN_JSON_ROOT=/app/json \
        -DSPDLOG_ROOT=/app/spdlog \
        -DJWT_CPP_ROOT=/app/jwt-cpp \
        -DBUILD_TESTS=OFF \
        -DCMAKE_BUILD_TYPE=Release && \
    make -j$(nproc) && \
    make install

# --- Final image ---
FROM debian:bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    libssl-dev \
    libcurl4-openssl-dev \
    # Clean up to reduce image size
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled application from the builder stage
COPY --from=builder /usr/local/bin/project_management_api /usr/local/bin/project_management_api
COPY --from=builder /usr/local/lib/libjwt-cpp.so* /usr/local/lib/
COPY --from=builder /usr/local/lib/libspdlog.so* /usr/local/lib/
# Add any other required shared libraries if they are not part of the base image.
# For libpqxx, it's typically linked against libpq which is installed here.

# Set environment variables for runtime
ENV LD_LIBRARY_PATH=/usr/local/lib:${LD_LIBRARY_PATH}

# Set the entrypoint for the application
ENTRYPOINT ["/usr/local/bin/project_management_api"]

# Expose the application port (as defined in .env.example)
EXPOSE 18080
```