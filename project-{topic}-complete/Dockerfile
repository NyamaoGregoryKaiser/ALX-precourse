```dockerfile
# Stage 1: Build C++ application
FROM gcc:11.4.0 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    cmake \
    libpq-dev \
    libpistache-dev \
    libspdlog-dev \
    libnlohmann-json-dev \
    g++ \
    git \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install jwt-cpp (manual build as it might not be in apt-dev for all GCC versions)
# Alternatively, use vcpkg or vendoring for better dependency management
RUN git clone https://github.com/Thalhammer/jwt-cpp.git /opt/jwt-cpp && \
    cd /opt/jwt-cpp && \
    mkdir build && cd build && \
    cmake .. && make && make install

WORKDIR /app

# Copy source code and CMakeLists
COPY CMakeLists.txt .
COPY src src/
COPY tests tests/
COPY scripts scripts/
COPY config.json .

# Build the application
RUN cmake . && \
    make -j$(nproc)

# Stage 2: Create a smaller runtime image
FROM debian:bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    libssl1.1 \
    libspdlog1 \
    libstdc++6 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Copy the built executable from the builder stage
COPY --from=builder /app/visuflow_server /usr/local/bin/visuflow_server
COPY --from=builder /app/config.json /app/config.json
COPY --from=builder /app/scripts /app/scripts
COPY --from=builder /app/docs /app/docs

# Create a directory for logs
RUN mkdir -p /var/log/visuflow && \
    chmod -R 777 /var/log/visuflow # For simplicity, usually a specific user/group would own this

WORKDIR /app

# Expose the API port
EXPOSE 9080

# Command to run the API server
CMD ["/usr/local/bin/visuflow_server"]
```