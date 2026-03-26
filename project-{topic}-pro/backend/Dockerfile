# Use a C++ build image
FROM gcc:11-bullseye AS builder

# Install necessary dependencies for building
RUN apt-get update && apt-get install -y \
    cmake \
    libpq-dev \
    libssl-dev \
    git \
    pkg-config \
    # For jwt-cpp, if it's not header-only or vendored
    # Example for Pistache and libpqxx
    && rm -rf /var/lib/apt/lists/*

# Clone/install Pistache (or use a package manager if available)
# For simplicity, let's assume Pistache, jwt-cpp, spdlog are installed
# in a more robust way (e.g., vcpkg, or pre-installed libs).
# For a quick demo:
RUN git clone https://github.com/oktal/pistache.git /opt/pistache
WORKDIR /opt/pistache
RUN git checkout 919e831 # A specific commit for stability
RUN cmake -DCMAKE_BUILD_TYPE=Release . && make -j$(nproc) && make install

# Install jwt-cpp (header only or via vcpkg/conan)
# For this example, let's assume you'd copy it into your project or install system-wide
RUN git clone https://github.com/Thalhammer/jwt-cpp.git /opt/jwt-cpp
WORKDIR /opt/jwt-cpp
RUN cmake . && make -j$(nproc) && make install

# Install spdlog (header only or via vcpkg/conan)
RUN git clone https://github.com/gabime/spdlog.git /opt/spdlog
WORKDIR /opt/spdlog
RUN cmake . && make -j$(nproc) && make install

# Copy source code
WORKDIR /app
COPY . .

# Build the application
RUN cmake -DCMAKE_BUILD_TYPE=Release .
RUN make -j$(nproc)

# --- Runtime image ---
FROM debian:bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    libssl1.1 \
    # Other runtime libs if necessary for Pistache/jwt-cpp
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled application from the builder stage
COPY --from=builder /app/cms_backend /usr/local/bin/cms_backend
COPY --from=builder /usr/local/lib/libpistache.so* /usr/local/lib/
COPY --from=builder /usr/local/lib/libjwt-cpp.so* /usr/local/lib/ # If jwt-cpp builds a shared lib
COPY --from=builder /usr/local/lib/libspdlog.so* /usr/local/lib/ # If spdlog builds a shared lib

# Ensure runtime linker can find libraries
ENV LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH

# Expose the port
EXPOSE 9080

# Run the application
CMD ["cms_backend"]