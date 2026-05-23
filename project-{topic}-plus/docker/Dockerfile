# Use a C++ base image
# Debian Buster is a good choice for stability
FROM debian:buster-slim

# Install necessary build tools and libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libpq-dev \
    libpqxx-dev \
    libssl-dev \
    libcrypt-dev \
    git \
    wget \
    pkg-config \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install CrowCpp (header-only, clone directly)
# For production, consider using a specific release tag or submodule
RUN git clone https://github.com/crowcpp/crow.git /usr/local/include/crow \
    && cd /usr/local/include/crow && git checkout v1.0+5 # Use a specific stable version

# Install nlohmann/json (header-only)
RUN mkdir -p /usr/local/include/nlohmann \
    && wget -O /usr/local/include/nlohmann/json.hpp https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp

# Install spdlog (header-only)
RUN git clone https://github.com/gabime/spdlog.git /usr/local/include/spdlog_src \
    && cd /usr/local/include/spdlog_src && git checkout v1.11.0 \
    && cmake -B build -DCMAKE_INSTALL_PREFIX=/usr/local \
    && cmake --build build --target install \
    && rm -rf /usr/local/include/spdlog_src

# Set working directory
WORKDIR /app

# Copy source code
COPY . /app

# Build application
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --target ecommerce_cpp_app

# Expose the application port
EXPOSE 8080

# Command to run the application
CMD ["/app/build/ecommerce_cpp_app"]