```cmake
cmake_minimum_required(VERSION 3.10)
project(VisGenius CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON) # For shared libraries/executables

# --- Configuration for C++ Compiler Flags ---
# Debugging and development flags
if (CMAKE_BUILD_TYPE MATCHES "Debug")
    add_compile_options(-Wall -Wextra -Werror -g -O0)
    # Add -fsanitize=address,undefined if needed, but they can be noisy in complex projects
elseif (CMAKE_BUILD_TYPE MATCHES "Release")
    add_compile_options(-Wall -Wextra -Werror -O3 -DNDEBUG)
    # LTO (Link Time Optimization) can be enabled for release builds
    # if (CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    #     add_link_options(-flto)
    #     add_compile_options(-flto)
    # endif()
endif()

# --- External Dependencies ---
# 1. SQLite3
# Most systems have SQLite3 dev package. For Linux: sudo apt-get install libsqlite3-dev
# For macOS: brew install sqlite3
# Or you can add it as a source file and compile it. For this example, we link directly.
find_package(SQLite3 REQUIRED)
# If SQLite3 is not found, you might need to specify its path or bundle it.
# Example for bundling (if needed, uncomment and provide source path):
# add_library(sqlite_lib STATIC sqlite3.c)
# target_include_directories(sqlite_lib PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/path/to/sqlite/header)

# 2. nlohmann/json (for robust JSON parsing - optional in this demo, assumed for Controller JSON helpers)
# This would typically be added via FetchContent or a package manager like Conan/vcpkg.
# For simplicity in this comprehensive demo, we assume its functions exist
# or that a minimal parsing is handled by the Controller.
# If you want to include it, add something like:
# FetchContent_Declare(
#   json_lib
#   GIT_REPOSITORY https://github.com/nlohmann/json.git
#   GIT_TAG v3.11.2
# )
# FetchContent_MakeAvailable(json_lib)
# target_link_libraries(VisGenius PUBLIC nlohmann_json)


# --- Source Files ---
# Group source files
set(CORE_SOURCES
    src/main.cpp
    src/Server.cpp
    src/Router.cpp
    src/Controller.cpp
    src/Database.cpp
    src/DataProcessor.cpp
    src/VisualizationEngine.cpp
    src/AuthManager.cpp
    src/Logger.cpp
    src/HttpUtils.cpp
    src/RateLimiting.cpp
)

set(CORE_HEADERS
    src/Models.h
    src/Server.h
    src/Router.h
    src/Controller.h
    src/Database.h
    src/DataProcessor.h
    src/VisualizationEngine.h
    src/AuthManager.h
    src/Logger.h
    src/HttpUtils.h
    src/ErrorHandling.h
    src/Cache.h
    src/RateLimiting.h
)

add_executable(VisGenius ${CORE_SOURCES} ${CORE_HEADERS})

# --- Include Directories ---
target_include_directories(VisGenius PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/src)
# Add include directory for SQLite3 if bundling or custom path
# For example: target_include_directories(VisGenius PUBLIC /usr/local/include)

# --- Link Libraries ---
target_link_libraries(VisGenius
    PUBLIC SQLite::SQLite3 # Links against the found SQLite3 library
    PUBLIC pthread        # For std::thread
)

# --- Create data directory if it doesn't exist ---
file(MAKE_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/data")
```