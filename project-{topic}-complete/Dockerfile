```dockerfile
# Stage 1: Build the C++ application
FROM conanio/gcc11 AS builder

WORKDIR /app

# Install Drogon dependencies if not handled by Conan (though Conan should handle most)
# This example relies heavily on Conan for C++ dependencies.
# For runtime, usually just libpq (PostgreSQL client) is needed.

# Copy Conan configuration and install dependencies
COPY conanfile.txt .
# --build=missing will build all missing packages from sources
# If you encounter issues with Conan building dependencies, you might need a more specific Conan base image or pre-built binaries.
RUN conan install . --output-folder=. --build=missing

# Copy source code and CMake files
COPY CMakeLists.txt .
COPY src src/
COPY views views/
COPY config.json .
COPY tests tests/

# Configure and build the application
RUN cmake -DCMAKE_TOOLCHAIN_FILE=conan_toolchain.cmake -DCMAKE_BUILD_TYPE=Release .
RUN cmake --build . --config Release

# Stage 2: Create the final runtime image
FROM debian:bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libjsoncpp-dev \
    libfmt-dev \
    # Other runtime libs that might be linked by Drogon or jwt-cpp
    # Check `ldd cms_server` output from build stage to be sure
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the built executable and its runtime dependencies
COPY --from=builder /app/build/Release/cms_server .
COPY --from=builder /app/build/Release/config.json .
COPY --from=builder /app/build/Release/views views/

# Copy necessary shared libraries from Conan's installation path
# This step might need adjustment based on Conan's exact installation path and required shared libs.
# A common pattern is to copy all .so files from the Conan build output's lib directory.
COPY --from=builder /app/build/Release/lib /app/lib

# Ensure libraries are found at runtime
ENV LD_LIBRARY_PATH=/app/lib:${LD_LIBRARY_PATH}

# Create logs directory
RUN mkdir -p logs

EXPOSE 8080

CMD ["./cms_server"]
```