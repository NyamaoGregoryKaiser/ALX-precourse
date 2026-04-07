```dockerfile
# Stage 1: Build the C++ application
FROM gcc:11.4.0 AS builder

WORKDIR /app

# Install dependencies for building
RUN apt-get update && apt-get install -y \
    cmake \
    libpqxx-dev \
    libcurl4-openssl-dev \
    libgumbo-dev \
    libssl-dev \
    uuid-dev \
    pkg-config \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Pistache (can be done from source or system package if available and recent enough)
# For latest Pistache, building from source is often preferred.
# This assumes Pistache is NOT a system package of gcc:11.4.0, so we build it.
# You might need to adjust Pistache version or installation method.
# For simplicity, we assume system-wide installation if it exists, otherwise manual build.
# A more robust solution for C++ dependencies would be vcpkg or Conan.
# For this example, let's assume system package `libpistache-dev` or a pre-compiled version,
# or for a more complete build, include the Pistache source build steps.
# As `Pistache::Server` is used in CMake, we'll assume a system-wide or pre-installed Pistache.
# If `find_package(Pistache REQUIRED)` fails, it means Pistache isn't found.
# Let's add manual build steps for Pistache if it's not present:

# Install Pistache (manual build for robust dependency management)
RUN git clone https://github.com/pistacheio/pistache.git /usr/src/pistache \
    && cd /usr/src/pistache \
    && git checkout 0.0.5 # Or a specific stable tag/commit \
    && mkdir build \
    && cd build \
    && cmake -DCMAKE_BUILD_TYPE=Release .. \
    && make -j$(nproc) \
    && make install \
    && ldconfig

# Install spdlog
RUN git clone https://github.com/gabime/spdlog.git /usr/src/spdlog \
    && cd /usr/src/spdlog \
    && git checkout v1.11.0 # Or a specific stable tag/commit \
    && mkdir build \
    && cd build \
    && cmake -DCMAKE_BUILD_TYPE=Release .. \
    && make -j$(nproc) \
    && make install \
    && ldconfig

# Copy source code and CMakeLists
COPY CMakeLists.txt ./
COPY src/ ./src/
COPY config/ ./config/
COPY frontend/ ./frontend/
# nlohmann/json is header-only, copy it where included
COPY src/common/nlohmann_json.hpp /usr/local/include/nlohmann/json.hpp

# Build the application
RUN mkdir build
WORKDIR /app/build
RUN cmake ..
RUN make -j$(nproc)

# Stage 2: Create a minimal runtime image
FROM debian:bullseye-slim

WORKDIR /app

# Install runtime dependencies
# libpqxx, libcurl, libgumbo, libssl, uuid, spdlog (if not static linked)
# Need libpq-dev for libpqxx runtime (libpq.so)
RUN apt-get update && apt-get install -y \
    libpq5 \
    libcurl4 \
    libgumbo1 \
    libssl1.1 \
    uuid-runtime \
    # Spdlog might require specific runtime libs if not statically linked.
    # On Debian, it's usually `libspdlog-dev` for build, `libspdlog1.x` for runtime.
    # If built from source, ensure dynamic libs are copied or static link.
    # For now, assume it links dynamically and is found.
    && rm -rf /var/lib/apt/lists/*

# Copy the built application from the builder stage
COPY --from=builder /app/build/webscraper ./webscraper
COPY --from=builder /app/build/config.json ./config.json
COPY frontend/ ./frontend/
# Create logs directory
RUN mkdir -p logs

EXPOSE 9080

CMD ["./webscraper"]
```