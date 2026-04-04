cmake_minimum_required(VERSION 3.10)
project(TaskManagerSystem LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON) # Required for shared libraries and some deployments

# Build type setup
if (NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
    set(CMAKE_BUILD_TYPE Debug CACHE STRING "Choose the type of build." ON)
    set_property(CACHE CMAKE_BUILD_TYPE PROPERTY STRINGS "Debug" "Release" "MinSizeRel" "RelWithDebInfo")
endif()

# Find and configure external dependencies
# We'll use Find modules or FetchContent for these
# For this example, we assume system-wide installation or manually configure paths

# Crow (Requires Boost context for older versions, or a newer standalone build)
# For simplicity, we'll assume Crow is header-only or pre-built and its include path is added.
# In a real project, you'd use FetchContent or find_package.
# Example: FetchContent for crow
# include(FetchContent)
# FetchContent_Declare(
#   crow_lib
#   GIT_REPOSITORY https://github.com/crowcpp/crow.git
#   GIT_TAG master # Or a specific tag/commit
#   FIND_PACKAGE_ARGS NAMES Crow
# )
# FetchContent_MakeAvailable(crow_lib)
# find_package(Crow REQUIRED) # If you have Crow installed system-wide

# For demo purposes, we'll assume Crow and other libraries are available via include paths
# Or manually include them. For this example, let's simplify and just include directories
# Assuming crow headers are in a 'vendor/crow' directory relative to project root
# Or installed system-wide.
set(CROW_INCLUDE_DIR ${CMAKE_SOURCE_DIR}/vendor/crow/include) # Placeholder
set(JSONCPP_INCLUDE_DIR ${CMAKE_SOURCE_DIR}/vendor/jsoncpp/include) # Placeholder
set(SQLITE3_INCLUDE_DIR ${CMAKE_SOURCE_DIR}/vendor/sqlite3/include) # Placeholder
set(JWTCPP_INCLUDE_DIR ${CMAKE_SOURCE_DIR}/vendor/jwt-cpp/include) # Placeholder
set(SPDLOG_INCLUDE_DIR ${CMAKE_SOURCE_DIR}/vendor/spdlog/include) # Placeholder
set(ARGON2_INCLUDE_DIR ${CMAKE_SOURCE_DIR}/vendor/argon2/include) # Placeholder - if using real Argon2
# For Argon2, you might need to compile it or find a pre-built lib
# For this example, our Hasher will be simplified unless Argon2 is readily available.

include_directories(
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/src/config
    ${CMAKE_SOURCE_DIR}/src/auth
    ${CMAKE_SOURCE_DIR}/src/users
    ${CMAKE_SOURCE_DIR}/src/tasks
    ${CMAKE_SOURCE_DIR}/src/models
    ${CMAKE_SOURCE_DIR}/src/database
    ${CMAKE_SOURCE_DIR}/src/utils
    ${CMAKE_SOURCE_DIR}/src/middleware
    ${CMAKE_SOURCE_DIR}/src/dto
    ${CROW_INCLUDE_DIR}
    ${JSONCPP_INCLUDE_DIR}
    ${SQLITE3_INCLUDE_DIR}
    ${JWTCPP_INCLUDE_DIR}
    ${SPDLOG_INCLUDE_DIR}
    ${ARGON2_INCLUDE_DIR} # Include if Argon2 library is used
)

# SQLite library linking
# For embedded SQLite, link directly to the source or a precompiled library
# We'll assume a `libsqlite3.so` or `sqlite3.lib` is available
find_library(SQLITE3_LIBRARY NAMES sqlite3 REQUIRED)

# jwt-cpp might require OpenSSL or other crypto libs
find_package(OpenSSL REQUIRED)

# List all source files
file(GLOB_RECURSE SOURCES "src/*.cpp")

add_executable(task_manager_app ${SOURCES})

target_link_libraries(task_manager_app
    ${SQLITE3_LIBRARY}
    ${OpenSSL_LIBRARIES}
    # Link other compiled libraries if they are not header-only
    # e.g., jsoncpp_static, jwt-cpp, spdlog
)

# Add a build target for tests
add_subdirectory(test)

# Install rules (optional, for deployment)
install(TARGETS task_manager_app DESTINATION bin)
install(FILES ${CMAKE_SOURCE_DIR}/config.json DESTINATION etc)
install(DIRECTORY ${CMAKE_SOURCE_DIR}/data DESTINATION share)

# Set common compiler options
target_compile_features(task_manager_app PUBLIC cxx_std_17)
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(task_manager_app PUBLIC
        -Wall -Wextra -Wpedantic
        $<$<CONFIG:Debug>:-g -O0 -D_GLIBCXX_DEBUG -D_LIBCPP_DEBUG>
        $<$<CONFIG:Release>:-O3 -DNDEBUG>
    )
endif()

# For Crow, enable C++17 filesystem if available (or use experimental if needed)
# target_compile_definitions(task_manager_app PUBLIC CROW_ENABLE_CPP17_FILESYSTEM)

message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "Project configured successfully.")