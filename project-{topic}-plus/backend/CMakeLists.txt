```cmake
cmake_minimum_required(VERSION 3.15)
project(TaskManagementSystemBackend LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON) # Required for shared libraries on some systems

# Find Drogon
find_package(Drogon REQUIRED)

# Find PostgreSQL (libpq)
find_package(PkgConfig REQUIRED)
pkg_check_modules(LIBPQ REQUIRED libpq)
if (LIBPQ_FOUND)
    message(STATUS "Found libpq: ${LIBPQ_LIBRARIES}")
    include_directories(${LIBPQ_INCLUDE_DIRS})
    link_directories(${LIBPQ_LIBRARY_DIRS})
    set(DB_LIBRARIES ${LIBPQ_LIBRARIES})
else()
    message(FATAL_ERROR "libpq (PostgreSQL client library) not found. Please install it.")
endif()

# Find OpenSSL (for JWT)
find_package(OpenSSL REQUIRED)
if (OPENSSL_FOUND)
    message(STATUS "Found OpenSSL: ${OPENSSL_LIBRARIES}")
    include_directories(${OPENSSL_INCLUDE_DIR})
    set(JWT_LIBRARIES ${OPENSSL_LIBRARIES})
else()
    message(FATAL_ERROR "OpenSSL not found. Please install libssl-dev or equivalent.")
endif()

# Fetch jwt-cpp (modern C++ library for JWT)
# This will download and configure jwt-cpp as part of the build
include(FetchContent)
FetchContent_Declare(
  jwt_cpp
  GIT_REPOSITORY https://github.com/Thalhammer/jwt-cpp.git
  GIT_TAG        v0.6.0 # Use a specific tag for stability
)
FetchContent_MakeAvailable(jwt_cpp)
message(STATUS "jwt-cpp fetched and available.")
# No additional target_link_libraries needed as jwt-cpp links to OpenSSL internally.

# Find JsonCpp
find_package(JsonCpp REQUIRED)
if (JSONCPP_FOUND)
    message(STATUS "Found JsonCpp: ${JSONCPP_LIBRARIES}")
    include_directories(${JSONCPP_INCLUDE_DIR})
    set(JSON_LIBRARIES ${JSONCPP_LIBRARIES})
else()
    message(FATAL_ERROR "JsonCpp not found. Please install libjsoncpp-dev or equivalent.")
endif()

# Define common source directories
set(APP_SOURCE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src)
set(CONTROLLER_SOURCE_DIR ${APP_SOURCE_DIR}/controllers)
set(FILTER_SOURCE_DIR ${APP_SOURCE_DIR}/filters)
set(MODEL_SOURCE_DIR ${APP_SOURCE_DIR}/models)
set(SERVICE_SOURCE_DIR ${APP_SOURCE_DIR}/services)
set(UTILITY_SOURCE_DIR ${APP_SOURCE_DIR}/utils)
set(CONFIG_SOURCE_DIR ${APP_SOURCE_DIR}/config)
set(PLUGIN_SOURCE_DIR ${APP_SOURCE_DIR}/plugins)

# Add include directories for the project
include_directories(
    ${APP_SOURCE_DIR}
    ${CONTROLLER_SOURCE_DIR}
    ${FILTER_SOURCE_DIR}
    ${MODEL_SOURCE_DIR}
    ${SERVICE_SOURCE_DIR}
    ${UTILITY_SOURCE_DIR}
    ${CONFIG_SOURCE_DIR}
    ${PLUGIN_SOURCE_DIR}
)

# Collect all source files
file(GLOB_RECURSE BACKEND_SOURCES
    "${APP_SOURCE_DIR}/*.cc"
    "${CONTROLLER_SOURCE_DIR}/*.cc"
    "${FILTER_SOURCE_DIR}/*.cc"
    "${MODEL_SOURCE_DIR}/*.cc"
    "${SERVICE_SOURCE_DIR}/*.cc"
    "${UTILITY_SOURCE_DIR}/*.cc"
    "${CONFIG_SOURCE_DIR}/*.cc"
    "${PLUGIN_SOURCE_DIR}/*.cc"
)

# Add the executable target
add_executable(TaskManagementSystemBackend ${BACKEND_SOURCES})

# Link libraries
target_link_libraries(TaskManagementSystemBackend
    PRIVATE
        Drogon::drogon
        ${DB_LIBRARIES}
        ${JWT_LIBRARIES} # Link against OpenSSL required by jwt-cpp directly
        jwt-cpp_static   # The target provided by FetchContent
        ${JSON_LIBRARIES}
)

# --- Test Configuration ---
enable_testing()
add_subdirectory(tests)

# Copy config.json to build directory
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/config.json ${CMAKE_CURRENT_BINARY_DIR}/config.json COPYONLY)
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/.env.example ${CMAKE_CURRENT_BINARY_DIR}/.env.example COPYONLY)

# Generate Drogon models
# This command needs to be run manually or integrated into a custom build step
# For now, assume models are generated.
# Example: drogon_ctl generate model -o src/models -s <schema_name> <table_name> ...
# Or, if using an existing DB: drogon_ctl create model <DB_TYPE> <CONNECTION_STRING> -o src/models
```