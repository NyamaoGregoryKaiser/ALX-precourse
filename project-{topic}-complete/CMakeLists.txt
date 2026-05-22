```cmake
cmake_minimum_required(VERSION 3.10)
project(TaskAPI CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Enable common build options
option(BUILD_TESTS "Build tests" ON)
option(BUILD_SHARED_LIBS "Build shared libraries" OFF)

# Add subdirectories
add_subdirectory(src)
if(BUILD_TESTS)
    add_subdirectory(tests)
endif()

# Find and include Pistache
find_package(Pistache REQUIRED)
include_directories(${PISTACHE_INCLUDE_DIRS})
link_directories(${PISTACHE_LIB_DIRS})

# Find and include jsoncpp
find_package(jsoncpp CONFIG REQUIRED)

# Find and include pqxx
find_package(PQXX CONFIG REQUIRED)

# Find and include spdlog
find_package(spdlog CONFIG REQUIRED)

# Find and include jwt-cpp
find_package(jwt-cpp CONFIG REQUIRED)

# Find and include argon2_cpp (or provide a way to build it)
# Assuming argon2_cpp is installed or built as a dependency
# For simplicity in this example, we might assume it's available globally or link directly.
# If built from source, it might look like this:
# add_subdirectory(external/argon2_cpp)
# target_link_libraries(${PROJECT_NAME} PRIVATE argon2_cpp::argon2_cpp)
# For this project, we'll assume it's provided by the Docker image or system.
# We'll use a simple approach for password hashing if integration is complex.
# For production, always use a robust library like argon2_cpp.
```