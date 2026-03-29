```dockerfile
# Stage 1: Build C++ application
FROM gcc:12.2.0 as builder

# Set working directory
WORKDIR /app

# Install dependencies for building
# Crow itself (assuming it's either in /app/crow or installed globally like this)
# For more robustness, crow would be added as a submodule or installed via vcpkg
RUN apt-get update && apt-get install -y \
    libsqlite3-dev \
    cmake \
    git \
    build-essential \
    # Needed for jwt-cpp and nlohmann/json if not fetched via FetchContent
    # No direct apt packages for these, FetchContent handles them.
    # We still need general build tools.
    && rm -rf /var/lib/apt/lists/*

# Clone Crow framework - A common way if not using system-wide installation or vcpkg
# For actual production, consider vcpkg or direct source integration.
# Here we'll just clone it to a known path.
RUN git clone https://github.com/ipkn/crow.git /usr/local/include/crow

# Copy source code and CMakeLists.txt
COPY CMakeLists.txt ./
COPY src ./src
COPY db ./db
COPY tests ./tests
COPY scripts ./scripts
COPY .env.example ./.env # Copy example as default, overwritten by docker-compose

# Configure and build
RUN cmake -B build -DCROW_INCLUDE_DIR=/usr/local/include/crow -DJSON_EXTERNAL_BUILD=ON -DJWT_CPP_EXTERNAL_BUILD=ON
RUN cmake --build build

# Stage 2: Create a minimal runtime image
FROM debian:bookworm-slim

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    # Add any other runtime libs if needed (e.g., specific C++ stdlibs)
    # Most standard C++ libs are usually present in debian-slim.
    && rm -rf /var/lib/apt/lists/*

# Copy the built executable and its dependencies from the builder stage
COPY --from=builder /app/build/ALXProjectManagementAPI ./ALXProjectManagementAPI
COPY --from=builder /app/build/init_db ./init_db
COPY --from=builder /app/.env ./
COPY --from=builder /app/db ./db
COPY --from=builder /app/scripts ./scripts

# Create necessary directories
RUN mkdir -p /app/db /app/logs

# Expose the port (as defined in .env.example)
EXPOSE 18080

# Initialize the database (run migrations and seed data)
# This will be run every time the container starts, which is okay for SQLite
# but for persistent DBs, migrations should be external or run once.
# In production, you'd usually run init_db as a separate step/command.
# Here we put it in entrypoint for simple demonstration.
ENTRYPOINT ["/bin/bash", "-c"]
CMD ["/app/init_db && /app/ALXProjectManagementAPI"]

```