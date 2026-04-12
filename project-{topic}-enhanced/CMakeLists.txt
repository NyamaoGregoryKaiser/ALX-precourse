cmake_minimum_required(VERSION 3.10)
project(WebScraper CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Enable sanitizers for better development quality
# set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fsanitize=address,undefined -fno-omit-frame-pointer")
# set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -fsanitize=address,undefined")

# Add subdirectories for source and tests
add_subdirectory(src)
add_subdirectory(tests)

# Find and include common dependencies (system-wide or vcpkg)
# For production, consider vcpkg or similar package manager for dependencies.
# Example: find_package(CURL REQUIRED)

# This assumes libraries are installed globally or in standard paths.
# For Crow, you'd typically clone it and add as subdirectory or use find_package
# For simplicity, we'll assume libraries are findable or linked directly in src/CMakeLists.txt
# A full enterprise setup would use vcpkg or Conan for dependency management.