# Use a C++ base image (e.g., Ubuntu with build essentials)
FROM ubuntu:22.04 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libssl-dev \
    libjsoncpp-dev \
    libsqlite3-dev \
    git \
    pkg-config \
    doxygen \
    # For Crow, if not header-only or custom build
    # libboost-context-dev \
    # libboost-system-dev \
    # libboost-thread-dev \
    # libboost-filesystem-dev \
    && rm -rf /var/lib/apt/lists/*

# Clone/Copy CROW (assuming it's a sub-module or manually placed in vendor/)
# Or if installed system-wide, skip this.
# For this example, we assume Crow headers are available via CMake's include_directories
# A robust setup would use FetchContent or install Crow properly.
# RUN git clone --depth 1 https://github.com/crowcpp/crow.git /opt/crow
# ENV CROW_INCLUDE_DIR=/opt/crow/include

# Clone/Copy JWT-CPP
RUN git clone --depth 1 https://github.com/Thalhammer/jwt-cpp.git /opt/jwt-cpp
ENV JWTCPP_INCLUDE_DIR=/opt/jwt-cpp/include

# Clone/Copy spdlog
RUN git clone --depth 1 https://github.com/gabime/spdlog.git /opt/spdlog
ENV SPDLOG_INCLUDE_DIR=/opt/spdlog/include

# Copy source code
WORKDIR /app
COPY . .

# Create vendor directory and link external library headers for CMake
# This is a simplification; ideally, CMake would manage these through FetchContent or find_package.
RUN mkdir -p /app/vendor/jwt-cpp && ln -s /opt/jwt-cpp /app/vendor/jwt-cpp
RUN mkdir -p /app/vendor/spdlog && ln -s /opt/spdlog /app/vendor/spdlog
# For crow, you might need to copy/link its headers too
# RUN mkdir -p /app/vendor/crow && ln -s /opt/crow /app/vendor/crow
# For Crow: If header-only, just copy headers; if needs building, build it.
# As a compromise, assume Crow is included via a local vendor/crow directory
# and the CMakeLists.txt picks it up. Let's create a placeholder.
RUN mkdir -p /app/vendor/crow/include && touch /app/vendor/crow/include/crow.h # Placeholder


# Build the application
RUN cmake -DCMAKE_BUILD_TYPE=Release -B build
RUN cmake --build build --config Release

# Runtime image
FROM ubuntu:22.04

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl3 \
    libjsoncpp25 \
    libsqlite3-0 \
    # For Crow if not header-only
    # libboost-context1.74.0 \
    # libboost-system1.74.0 \
    # libboost-thread1.74.0 \
    # libboost-filesystem1.74.0 \
    && rm -rf /var/lib/apt/lists/*

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/config

# Copy the built executable, config, and data
WORKDIR /app
COPY --from=builder /app/build/task_manager_app ./task_manager_app
COPY config.json ./config/config.json
# Copy seed data if any specific scripts are needed outside of migration manager
# COPY data/seed_data.sql ./data/seed_data.sql

# Set environment variables for configuration (optional, can be passed via docker run)
ENV API_PORT=8080
ENV DB_PATH=/app/data/app.db
ENV JWT_SECRET="your_strong_production_jwt_secret"
ENV LOG_LEVEL="info"

# Expose the API port
EXPOSE 8080

# Run the application
CMD ["./task_manager_app"]