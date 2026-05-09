```cmake
cmake_minimum_required(VERSION 3.10)
project(VisuFlowAnalytics CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Compiler flags for development and warnings
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -Werror -pedantic -g")

# --- Find external dependencies ---
# For Pistache (HTTP Server)
find_package(Pistache REQUIRED)
# For nlohmann/json
find_package(nlohmann_json REQUIRED)
# For spdlog
find_package(spdlog REQUIRED)
# For jwt-cpp (assuming installed via system package manager or vendored)
# If using vcpkg: find_package(jwt-cpp CONFIG REQUIRED)
# Otherwise, manually add include/lib paths:
# set(JWT_CPP_INCLUDE_DIR /path/to/jwt-cpp/include)
# set(JWT_CPP_LIBRARY /path/to/jwt-cpp/lib/libjwt-cpp.a)

# For SOCI (Database Abstraction)
# find_package(SOCI REQUIRED)
# For PostgreSQL specific driver (e.g., soci_postgresql)
# find_package(soci_postgresql REQUIRED)
# For simplicity, we'll use a direct mock or a simpler C++ DB wrapper for example.
# In a real project, this would be crucial.

# Define source directories
set(SRC_DIR src)
set(API_DIR ${SRC_DIR}/api)
set(CORE_DIR ${SRC_DIR}/core)
set(DATA_DIR ${SRC_DIR}/data)
set(GUI_DIR ${SRC_DIR}/gui) # Conceptual GUI for desktop app
set(UTIL_DIR ${SRC_DIR}/util)

# Define include directories
include_directories(
    ${SRC_DIR}
    ${API_DIR}
    ${CORE_DIR}
    ${DATA_DIR}
    ${GUI_DIR}
    ${UTIL_DIR}
    ${PISTACHE_INCLUDE_DIR}
    ${NLOHMANN_JSON_INCLUDE_DIR}
    ${SPDLOG_INCLUDE_DIR}
    # ${JWT_CPP_INCLUDE_DIR}
    # ${SOCI_INCLUDE_DIR}
)

# --- Collect source files ---
# API Server and Handlers
file(GLOB API_SOURCES
    ${API_DIR}/*.cpp
    ${API_DIR}/handlers/*.cpp
    ${API_DIR}/middleware/*.cpp
    ${API_DIR}/dto/*.cpp
)

# Core components
file(GLOB CORE_SOURCES
    ${CORE_DIR}/security/*.cpp
    ${CORE_DIR}/cache/*.cpp
    ${CORE_DIR}/common/*.cpp
    ${CORE_DIR}/config/*.cpp
)

# Data layer
file(GLOB DATA_SOURCES
    ${DATA_DIR}/datasource/*.cpp
    ${DATA_DIR}/datasource/connectors/*.cpp
    ${DATA_DIR}/processor/*.cpp
    ${DATA_DIR}/model/*.cpp
    ${DATA_DIR}/db/*.cpp
    ${DATA_DIR}/db/migrations/*.cpp
    ${DATA_DIR}/db/repositories/*.cpp
)

# Utility components
file(GLOB UTIL_SOURCES
    ${UTIL_DIR}/*.cpp
)

# GUI components (conceptual - would link Qt in a real project)
file(GLOB GUI_SOURCES
    ${GUI_DIR}/*.cpp
    ${GUI_DIR}/widgets/*.cpp
    ${GUI_DIR}/controllers/*.cpp
)

# Main executable
add_executable(visuflow_server
    ${SRC_DIR}/main.cpp
    ${API_SOURCES}
    ${CORE_SOURCES}
    ${DATA_SOURCES}
    ${UTIL_SOURCES}
)

target_link_libraries(visuflow_server
    Pistache::Pistache
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    # jwt-cpp # Link JWT library if found/configured
    # soci_core soci_postgresql # Link SOCI and its driver
)

# --- Add Tests ---
add_subdirectory(tests)

# --- Install targets (optional) ---
install(TARGETS visuflow_server DESTINATION bin)
install(DIRECTORY docs DESTINATION share/visuflow)
```