```dockerfile
# Stage 1: Build environment
FROM ubuntu:22.04 AS builder

LABEL maintainer="ALX Software Engineer"

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libpistache-dev \
    libspdlog-dev \
    libnlohmann-json-dev \
    libpqxx-dev \
    libpq-dev \
    libssl-dev \
    googletest \
    uuid-dev \
    git \
    pkg-config \
    # For JWT-CPP library (optional, if using it directly)
    # libjwt-dev \
    # Install jwt-cpp dependency
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install jwt-cpp (if not available via system package manager or vendored)
# This assumes jwt-cpp is either vendored or installed manually.
# For simplicity, we'll assume it's available via a simple git clone and build/install.
# In a real project, consider vcpkg or Conan for managing C++ dependencies.
WORKDIR /usr/local/src
RUN git clone https://github.com/Thalhammer/jwt-cpp.git && \
    cd jwt-cpp && \
    mkdir build && cd build && \
    cmake .. -DBUILD_SHARED_LIBS=ON && \
    make -j$(nproc) && \
    make install

# Copy project source code
WORKDIR /app
COPY . .

# Build the application
RUN mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc)

# Stage 2: Runtime environment
FROM ubuntu:22.04 AS runner

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpistache1.0 \
    libspdlog1.9 \
    libnlohmann-json3.10 \
    libpqxx-7.7 \
    libpq5 \
    libssl3 \
    libuuid1 \
    libstdc++6 \
    # jwt-cpp runtime libs (if installed as shared libs)
    libjwt-cpp-dev \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy the built executable from the builder stage
WORKDIR /app
COPY --from=builder /app/build/PaymentProcessor .
COPY --from=builder /app/build/PaymentProcessorTests . # For running tests in container
COPY config/ config/
COPY migrations/ migrations/
COPY seeds/ seeds/
COPY README.md .
# If log directory exists and is needed
RUN mkdir -p logs && chmod 777 logs # Or appropriate permissions/user

# Expose the port the application listens on
EXPOSE 9080

# Command to run the application
CMD ["./PaymentProcessor", "config/default.json"]
```