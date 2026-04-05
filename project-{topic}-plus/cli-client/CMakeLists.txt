```cmake
cmake_minimum_required(VERSION 3.15)
project(TaskManagementSystemClient LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find libcurl for HTTP requests
find_package(CURL REQUIRED)
if (CURL_FOUND)
    message(STATUS "Found CURL: ${CURL_LIBRARIES}")
    include_directories(${CURL_INCLUDE_DIRS})
    set(HTTP_CLIENT_LIBRARIES ${CURL_LIBRARIES})
else()
    message(FATAL_ERROR "libcurl not found. Please install libcurl4-openssl-dev or equivalent.")
endif()

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
set(CLI_SOURCE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src)

# Add include directories for the project
include_directories(
    ${CLI_SOURCE_DIR}
)

# Collect all source files
file(GLOB_RECURSE CLIENT_SOURCES
    "${CLI_SOURCE_DIR}/*.cc"
)

# Add the executable target
add_executable(TaskManagementSystemClient ${CLIENT_SOURCES})

# Link libraries
target_link_libraries(TaskManagementSystemClient
    PRIVATE
        ${HTTP_CLIENT_LIBRARIES}
        ${JSON_LIBRARIES}
)

# Copy .env.example to build directory
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/.env.example ${CMAKE_CURRENT_BINARY_DIR}/.env.example COPYONLY)
```