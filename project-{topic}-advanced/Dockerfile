```dockerfile
# Dockerfile for VisGenius C++ Backend

# Use a base image with C++ development tools
FROM ubuntu:22.04 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libsqlite3-dev \
    git \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy source code
COPY . .

# Build the application
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release
RUN cmake --build build --config Release

# --- Runtime image ---
FROM ubuntu:22.04

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Create data directory
RUN mkdir -p data

# Copy the built executable and the SQLite database file
COPY --from=builder /app/build/VisGenius ./VisGenius
# If your DB is generated during build, copy it. Otherwise, it will be created on first run.
# COPY --from=builder /app/visgenius.db ./visgenius.db

# Copy example CSV data
COPY data/sales_data.csv ./data/sales_data.csv

# Expose the port the application runs on
EXPOSE 8080

# Run the application
CMD ["./VisGenius"]
```