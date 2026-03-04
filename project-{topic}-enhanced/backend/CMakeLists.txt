cmake_minimum_required(VERSION 3.10 FATAL_ERROR)
project(DataVizTool CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# --- Compiler Options ---
if(CMAKE_BUILD_TYPE MATCHES "Debug")
    add_compile_options(-Wall -Wextra -g -O0)
else()
    add_compile_options(-Wall -Wextra -O3 -DNDEBUG)
endif()

# --- Boost Libraries ---
find_package(Boost 1.70 COMPONENTS system thread program_options date_time filesystem REQUIRED)
if(Boost_FOUND)
    include_directories(${Boost_INCLUDE_DIR})
    link_directories(${Boost_LIBRARY_DIRS})
else()
    message(FATAL_ERROR "Boost not found. Please install Boost libraries.")
endif()

# --- nlohmann/json (Header-only, include as submodule or vendored) ---
# Assuming nlohmann_json is in third_party/nlohmann_json
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/third_party/nlohmann_json/include)

# --- libpqxx for PostgreSQL ---
find_package(PkgConfig REQUIRED)
pkg_search_module(LIBPQXX REQUIRED libpqxx)
if(LIBPQXX_FOUND)
    include_directories(${LIBPQXX_INCLUDE_DIRS})
else()
    message(FATAL_ERROR "libpqxx not found. Please install libpqxx development package.")
endif()

# --- Source Files ---
# Define source groups for better IDE organization
file(GLOB_RECURSE CORE_SOURCES src/core/*.cpp)
file(GLOB_RECURSE DB_SOURCES src/database/*.cpp src/database/repositories/*.cpp)
file(GLOB_RECURSE SERVER_SOURCES src/server/*.cpp src/server/controllers/*.cpp src/server/middlewares/*.cpp)
file(GLOB_RECURSE UTILS_SOURCES src/utils/*.cpp)

set(APP_SOURCES
    src/main.cpp
    ${CORE_SOURCES}
    ${DB_SOURCES}
    ${SERVER_SOURCES}
    ${UTILS_SOURCES}
)

# --- Add Executable ---
add_executable(dataviztool ${APP_SOURCES})

# --- Link Libraries ---
target_link_libraries(dataviztool
    ${Boost_LIBRARIES}
    ${LIBPQXX_LIBRARIES}
    pthread # Required for Boost.Beast async operations
)

# --- Testing with Catch2 ---
# Assuming Catch2 is in third_party/Catch2
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/third_party/Catch2/src)
add_subdirectory(tests) # This will include tests/CMakeLists.txt