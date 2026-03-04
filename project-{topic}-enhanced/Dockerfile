# Use a C++ development image (e.g., Ubuntu with GCC)
FROM ubuntu:20.04 AS build-env

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libboost-all-dev \
    libpqxx-dev \
    pkg-config \
    git \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Clone nlohmann/json (header-only)
RUN git clone https://github.com/nlohmann/json.git third_party/nlohmann_json

# Clone Catch2 (for tests)
RUN git clone https://github.com/catchorg/Catch2.git third_party/Catch2

# Copy source code
COPY backend/ ./backend/

# Build application
RUN cmake -S backend -B backend/build -DCMAKE_BUILD_TYPE=Release
RUN cmake --build backend/build -j $(nproc)

# --- Runtime Image ---
FROM ubuntu:20.04 AS runtime

# Install runtime dependencies (libpqxx, libssl, etc.)
RUN apt-get update && apt-get install -y \
    libpqxx-7.4 \
    libssl1.1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the built executable from the build-env
COPY --from=build-env /app/backend/build/dataviztool .

# Create data_uploads directory for CSVs
RUN mkdir -p data_uploads

# Copy the migration scripts
COPY database/migrations/ ./database/migrations/

# Expose the application port
EXPOSE 8080

# Run the application
CMD ["./dataviztool"]