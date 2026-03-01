#!/bin/bash
# A simple script to build the project locally using Conan and CMake

set -e

# Step 1: Initialize Conan and install dependencies
echo "--- Initializing Conan and installing dependencies ---"
conan install . --output-folder=build --build=missing --settings=build_type=Release

# Step 2: Configure CMake
echo "--- Configuring CMake ---"
# -S . : Source directory is current directory
# -B build : Build directory is 'build'
# -DCMAKE_TOOLCHAIN_FILE=./build/conan_toolchain.cmake : Use Conan's toolchain file
# -DCMAKE_BUILD_TYPE=Release : Set build type to Release
cmake -S . -B build -DCMAKE_TOOLCHAIN_FILE=./build/conan_toolchain.cmake -DCMAKE_BUILD_TYPE=Release

# Step 3: Build the project
echo "--- Building the project ---"
cmake --build build -j$(nproc) # Use all available cores

echo "--- Build complete! ---"
echo "Executable is located at: build/auth_system"
echo "To run: ./build/auth_system"
echo "Make sure to set JWT_SECRET environment variable first: export JWT_SECRET='your_secret_key'"
echo "To run migrations/seed, use: ./build/auth_system --skip-orm-sync --no-autocreate-tables --migration-dir db/migrations --run-migration-up --seed-dir db/seed --run-seed"
```