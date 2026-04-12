# Base image for building C++ application
FROM gcc:12.2.0 as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    cmake \
    libcurl4-openssl-dev \
    libpq-dev \
    libhiredis-dev \
    libgumbo-dev \
    libcryptopp-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Crow (header-only, often just included or built from source)
# For simplicity, we'll assume Crow is made available, e.g., via git submodule
# or copied directly into the project structure.
# If using a specific Crow release:
# RUN git clone --depth 1 -b <tag_or_branch> https://github.com/ipkn/crow.git /usr/local/include/crow
# Or copy it to src/lib/Crow

# Install soci (requires building from source with PostgreSQL backend)
# This is a simplified install. A proper setup would download a specific version.
RUN git clone https://github.com/SOCI/soci.git /tmp/soci
WORKDIR /tmp/soci
RUN mkdir build && cd build && \
    cmake .. -DSOCI_POSTGRESQL=ON -DSOCI_TESTS=OFF -DSOCI_STATIC=OFF -DCMAKE_INSTALL_PREFIX=/usr/local && \
    make -j$(nproc) && make install
WORKDIR /

# Install jwt-cpp (header-only)
RUN git clone https://github.com/Thalhammer/jwt-cpp.git /tmp/jwt-cpp
WORKDIR /tmp/jwt-cpp
RUN mkdir build && cd build && \
    cmake .. -DCMAKE_INSTALL_PREFIX=/usr/local && \
    make install
WORKDIR /

# Install spdlog (header-only, often just included or built from source)
RUN git clone https://github.com/gabime/spdlog.git /tmp/spdlog
WORKDIR /tmp/spdlog
RUN mkdir build && cd build && \
    cmake .. -DCMAKE_INSTALL_PREFIX=/usr/local && \
    make install
WORKDIR /

# Install curlpp
RUN git clone https://github.com/jpbarrette/curlpp.git /tmp/curlpp
WORKDIR /tmp/curlpp
RUN mkdir build && cd build && \
    cmake .. -DCMAKE_INSTALL_PREFIX=/usr/local && \
    make -j$(nproc) && make install
WORKDIR /

# Copy source code
COPY . /app
WORKDIR /app

# Build the application
RUN cmake -B build -S .
RUN cmake --build build -j$(nproc)

# --- Final image for running the application ---
FROM debian:bookworm-slim

# Install runtime dependencies (libpq, libcurl, hiredis, libgumbo, libsoci, libcryptopp etc.)
RUN apt-get update && apt-get install -y \
    libcurl4 \
    libpq5 \
    libhiredis0.15 \
    libgumbo1 \
    libsoci-postgresql4.0 \
    libsoci-core4.0 \
    libcryptopp8 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# Copy the built application from the builder stage
COPY --from=builder /usr/local /usr/local
COPY --from=builder /app/build/webscraper /usr/local/bin/webscraper
COPY --from=builder /app/frontend /usr/local/bin/frontend
# Copy Gumbo and soci shared libraries if not in standard paths.
# For soci, shared libraries like libsoci_postgresql.so, libsoci_core.so need to be available.
# /usr/local/lib is usually in LD_LIBRARY_PATH by default in Docker.

WORKDIR /app
COPY frontend /app/frontend

# Expose the port (replace with APP_PORT env var)
EXPOSE 8080

# Environment variables for configuration
ENV APP_PORT=8080
ENV DATABASE_URL=postgresql://user:password@host:port/database
ENV JWT_SECRET=super_secret_jwt_key_that_is_at_least_32_chars_long
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV RATE_LIMIT_REQUESTS=100
ENV RATE_LIMIT_WINDOW_SECONDS=60
ENV SCHEDULER_INTERVAL_SECONDS=300

# Command to run the application
CMD ["/usr/local/bin/webscraper"]