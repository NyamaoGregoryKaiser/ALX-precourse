cmake_minimum_required(VERSION 3.10)
project(CppApiSystem LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON) # Required for shared libraries and some deployments

# Define build type if not already set (e.g., from command line -DCMAKE_BUILD_TYPE=Release)
if (NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Debug CACHE STRING "Choose the type of build."
        OPTIONS Debug Release RelWithDebInfo MinSizeRel)
endif()

# Set output directories for executables and libraries
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}")

# --- External Dependencies ---

# Pistache
# Option 1: Find system-installed Pistache
find_package(Pistache REQUIRED)
if (NOT Pistache_FOUND)
    message(FATAL_ERROR "Pistache library not found. Please install libpistache-dev or similar.")
endif()

# SQLiteCpp (Vendored or as a submodule for simplicity in this example)
# For this example, we'll assume SQLiteCpp is a vendored library or submodule
# Add SQLiteCpp as a subdirectory if it's a separate project.
# For simplicity, we will just include its source directly.
# A more robust solution would be `add_subdirectory(path/to/SQLiteCpp)`
# and then `target_link_libraries(target SQLiteCpp)`.
# For this example, we'll manually add its source and link sqlite3.
add_library(SQLiteCpp STATIC
    src/database/sqlite_cpp_wrapper.cpp # Assuming a minimal wrapper or direct integration if not using full SQLiteCpp
)
# We need to link against the system sqlite3 library
find_package(SQLite3 REQUIRED)
if (NOT SQLITE3_FOUND)
    message(FATAL_ERROR "SQLite3 library not found. Please install libsqlite3-dev or similar.")
endif()
target_link_libraries(SQLiteCpp PUBLIC ${SQLITE3_LIBRARIES})
target_include_directories(SQLiteCpp PUBLIC src/database ${SQLITE3_INCLUDE_DIR})


# jsoncpp
find_package(jsoncpp REQUIRED)
if (NOT jsoncpp_FOUND)
    message(FATAL_ERROR "jsoncpp library not found. Please install libjsoncpp-dev or similar.")
endif()

# jwt-cpp (Requires OpenSSL)
# We will fetch jwt-cpp as an external project for this example,
# as it's less commonly a system package.
include(FetchContent)

FetchContent_Declare(
  jwt-cpp
  GIT_REPOSITORY https://github.com/Thalhammer/jwt-cpp.git
  GIT_TAG        v0.6.0 # Use a specific tag for stability
)
FetchContent_MakeAvailable(jwt-cpp)

# OpenSSL (dependency for jwt-cpp)
find_package(OpenSSL REQUIRED)
if (NOT OPENSSL_FOUND)
    message(FATAL_ERROR "OpenSSL library not found. Please install libssl-dev or similar.")
endif()

# --- Source Files ---
# Core application source files
set(APP_SRCS
    src/main.cpp
    src/app.cpp
    src/auth/auth_service.cpp
    src/controllers/auth_controller.cpp
    src/controllers/task_controller.cpp
    src/database/database_manager.cpp
    src/database/migrations.cpp # Migration executable source
    src/database/seed.cpp       # Seed executable source
    src/models/task.cpp
    src/models/user.cpp
    src/middleware/error_handler.cpp
    src/middleware/rate_limiter.cpp
    src/utils/logger.cpp
    src/utils/cache.cpp
    src/server.cpp
)

# Core application header files (for include directories)
set(APP_HEADERS
    src/app.h
    src/auth/auth_service.h
    src/auth/jwt_middleware.h
    src/controllers/auth_controller.h
    src/controllers/task_controller.h
    src/database/database_manager.h
    src/models/task.h
    src/models/user.h
    src/middleware/error_handler.h
    src/middleware/rate_limiter.h
    src/utils/logger.h
    src/utils/json_util.h
    src/utils/exceptions.h
    src/utils/cache.h
    src/config/config.h
    src/server.h
)

# --- Include Directories ---
include_directories(
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/src/config
    ${Pistache_INCLUDE_DIRS}
    ${JSONCPP_INCLUDE_DIR}
    ${SQLITE3_INCLUDE_DIR}
    ${OPENSSL_INCLUDE_DIR}
    ${jwt-cpp_SOURCE_DIR}/include # For jwt-cpp if fetched
)

# --- Executables ---

# Main API Server executable
add_executable(api_server ${APP_SRCS})
target_link_libraries(api_server
    Pistache::Pistache
    jsoncpp::jsoncpp
    jwt-cpp
    ${OPENSSL_LIBRARIES}
    SQLiteCpp # Link against our minimal SQLiteCpp wrapper
)

# Migrations executable
add_executable(migrations src/database/migrations.cpp src/database/database_manager.cpp src/models/user.cpp src/models/task.cpp src/utils/logger.cpp src/utils/exceptions.h src/config/config.h)
target_link_libraries(migrations SQLiteCpp)
target_include_directories(migrations PRIVATE ${CMAKE_SOURCE_DIR}/src ${CMAKE_SOURCE_DIR}/src/config)

# Seed executable
add_executable(seed src/database/seed.cpp src/database/database_manager.cpp src/models/user.cpp src/models/task.cpp src/utils/logger.cpp src/utils/exceptions.h src/config/config.h src/auth/auth_service.cpp)
target_link_libraries(seed SQLiteCpp)
target_include_directories(seed PRIVATE ${CMAKE_SOURCE_DIR}/src ${CMAKE_SOURCE_DIR}/src/config)


# --- Testing Setup ---
enable_testing()
add_subdirectory(tests)

# --- Build-time Copy Operations ---
# Ensure 'data' and 'logs' directories exist at runtime
# This is typically handled by Docker or a deployment script,
# but for local dev, we can create them.
add_custom_target(create_dirs ALL
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/data
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/logs
    COMMENT "Creating data and logs directories"
)
add_dependencies(api_server create_dirs)
add_dependencies(migrations create_dirs)
add_dependencies(seed create_dirs)
```