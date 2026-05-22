```dockerfile
# Use a C++ base image with build tools
FROM ubuntu:22.04 AS builder

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libpistache-dev \
    libpqxx-dev \
    libjsoncpp-dev \
    libspdlog-dev \
    libjwt-dev \
    libargon2-dev \
    curl \
    git \
    pkg-config \
    libssl-dev \
    g++

# Set working directory
WORKDIR /app

# Copy source code
COPY . .

# Build the application
RUN cmake -B build -S .
RUN cmake --build build

# --- Runtime Image ---
FROM ubuntu:22.04

# Install only runtime dependencies
RUN apt-get update && apt-get install -y \
    libpistache10 \
    libpqxx9 \
    libjsoncpp25 \
    libspdlog1.9 \
    libjwt0 \
    libargon2-1 \
    libssl3 \
    # Clean up APT cache to reduce image size
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the built executable and its dependencies from the builder stage
COPY --from=builder /app/build/TaskAPI .
COPY --from=builder /app/src/db/migrations ./src/db/migrations
COPY --from=builder /app/.env.example ./.env.example # Provide example .env
COPY --from=builder /app/public ./public

# Expose the port (e.g., 9080, adjust if needed)
EXPOSE 9080

# Run the application
# For production, you'd manage .env externally (e.g., Kubernetes secrets, Docker secrets)
# Here, we'll demonstrate using a copied .env.example that the user replaces.
CMD ["./TaskAPI"]
```