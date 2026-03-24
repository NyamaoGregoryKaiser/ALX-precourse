```dockerfile
# Stage 1: Build the C++ application
FROM ubuntu:20.04 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    curl \
    sqlite3 \
    libsqlite3-dev \
    libssl-dev \
    pkg-config \
    # Clean up APT cache to reduce image size
    && rm -rf /var/lib/apt/lists/*

# Clone vcpkg and build it
WORKDIR /usr/local/vcpkg
RUN git clone https://github.com/microsoft/vcpkg.git . && \
    ./bootstrap-vcpkg.sh && \
    ./vcpkg integrate install

# Copy source code
WORKDIR /app
COPY . .

# Configure CMake with vcpkg toolchain
RUN cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=/usr/local/vcpkg/scripts/buildsystems/vcpkg.cmake -DCMAKE_BUILD_TYPE=Release

# Build the application
RUN cmake --build build --target task_management_api

# Stage 2: Create the final lean runtime image
FROM ubuntu:20.04

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    libssl1.1 \
    # Clean up APT cache
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the built executable from the builder stage
COPY --from=builder /app/build/task_management_api .

# Copy database setup scripts and migration files
COPY migrations migrations/
COPY scripts scripts/

# Create a directory for the database
RUN mkdir -p database

# Make the setup script executable and run it to initialize the database
RUN chmod +x scripts/setup_db.sh
RUN scripts/setup_db.sh

# Expose the port the Crow server listens on (default is 18080 from AppConfig.h)
EXPOSE 18080

# Command to run the application
CMD ["./task_management_api"]
```