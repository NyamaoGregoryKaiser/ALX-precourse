```cmake
cmake_minimum_required(VERSION 3.10)
project(DataVizSystem VERSION 1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON) # For LSP tools

# Directories
set(SOURCE_DIR ${CMAKE_SOURCE_DIR}/src)
set(TEST_DIR ${CMAKE_SOURCE_DIR}/tests)

# --- Find and Add External Libraries ---

# nlohmann/json
find_package(nlohmann_json CONFIG REQUIRED)
target_link_libraries(DataVizSystem PRIVATE nlohmann_json::nlohmann_json)

# Crow - Lightweight C++ Web Framework
# Assuming Crow is installed system-wide or available via CMake's find_package
# For local clone, you might add:
# add_subdirectory(path/to/crow)
# For simplicity, we assume it's findable via -DCMAKE_PREFIX_PATH
find_package(Crow REQUIRED)
target_link_libraries(DataVizSystem PRIVATE Crow::Crow)

# spdlog - Logging library
find_package(spdlog CONFIG REQUIRED)
target_link_libraries(DataVizSystem PRIVATE spdlog::spdlog)

# pqxx - PostgreSQL C++ client library
find_package(PkgConfig REQUIRED)
pkg_check_modules(LIBPQXX REQUIRED libpqxx >= 6.4)
if (LIBPQXX_FOUND)
    include_directories(${LIBPQXX_INCLUDE_DIRS})
    link_directories(${LIBPQXX_LIBRARY_DIRS})
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${LIBPQXX_LDFLAGS}")
    add_definitions(${LIBPQXX_CFLAGS_OTHER})
    target_link_libraries(DataVizSystem PRIVATE ${LIBPQXX_LIBRARIES})
else()
    message(FATAL_ERROR "libpqxx not found!")
endif()

# jwt-cpp - JWT library
find_package(jwt-cpp CONFIG REQUIRED)
target_link_libraries(DataVizSystem PRIVATE jwt-cpp::jwt-cpp)

# argon2 - Password hashing library
# find_package(argon2 REQUIRED) # If available via package manager
# For simplicity, we'll assume system libargon2 or link manually
# For this example, we'll use a placeholder for strong hashing and use basic crypto for JWT signing demo
# In a real project, link against `libargon2` or `OpenSSL` for `bcrypt`/`scrypt`.
# Here, for demo, we'll use a basic SHA256 function, but strong hashing is CRITICAL.
find_package(OpenSSL REQUIRED)
target_link_libraries(DataVizSystem PRIVATE OpenSSL::Crypto OpenSSL::SSL)

# --- Source Files ---
# Core application sources
set(APP_SOURCES
    ${SOURCE_DIR}/main.cpp
    ${SOURCE_DIR}/server/HttpServer.cpp
    ${SOURCE_DIR}/server/routes/AuthRoutes.cpp
    ${SOURCE_DIR}/server/routes/DatasetRoutes.cpp
    ${SOURCE_DIR}/server/routes/VisualizationRoutes.cpp
    ${SOURCE_DIR}/server/middleware/AuthMiddleware.cpp
    ${SOURCE_DIR}/server/middleware/LoggingMiddleware.cpp
    ${SOURCE_DIR}/server/middleware/ErrorMiddleware.cpp
    ${SOURCE_DIR}/server/utils/JsonUtils.cpp
    ${SOURCE_DIR}/server/utils/TokenManager.cpp
    ${SOURCE_DIR}/data/DatasetManager.cpp
    ${SOURCE_DIR}/data/DataProcessor.cpp
    ${SOURCE_DIR}/db/Database.cpp
    ${SOURCE_DIR}/db/UserRepository.cpp
    ${SOURCE_DIR}/db/DatasetRepository.cpp
    ${SOURCE_DIR}/db/VisualizationRepository.cpp
    ${SOURCE_DIR}/config/Config.cpp
    ${SOURCE_DIR}/utils/Logger.cpp
    ${SOURCE_DIR}/utils/Crypto.cpp
)

# Headers (for IDEs and clearer project structure, not strictly needed for compilation if properly included)
set(APP_HEADERS
    ${SOURCE_DIR}/server/HttpServer.h
    ${SOURCE_DIR}/server/routes/AuthRoutes.h
    ${SOURCE_DIR}/server/routes/DatasetRoutes.h
    ${SOURCE_DIR}/server/routes/VisualizationRoutes.h
    ${SOURCE_DIR}/server/middleware/AuthMiddleware.h
    ${SOURCE_DIR}/server/middleware/LoggingMiddleware.h
    ${SOURCE_DIR}/server/middleware/ErrorMiddleware.h
    ${SOURCE_DIR}/server/utils/JsonUtils.h
    ${SOURCE_DIR}/server/utils/TokenManager.h
    ${SOURCE_DIR}/data/DatasetManager.h
    ${SOURCE_DIR}/data/DataProcessor.h
    ${SOURCE_DIR}/data/models/Dataset.h
    ${SOURCE_DIR}/data/models/User.h
    ${SOURCE_DIR}/data/models/Visualization.h
    ${SOURCE_DIR}/db/Database.h
    ${SOURCE_DIR}/db/UserRepository.h
    ${SOURCE_DIR}/db/DatasetRepository.h
    ${SOURCE_DIR}/db/VisualizationRepository.h
    ${SOURCE_DIR}/config/Config.h
    ${SOURCE_DIR}/utils/Logger.h
    ${SOURCE_DIR}/utils/Crypto.h
)

add_executable(DataVizSystem ${APP_SOURCES} ${APP_HEADERS})

target_include_directories(DataVizSystem PRIVATE
    ${SOURCE_DIR}
)

# --- Google Test setup ---
enable_testing()
find_package(GTest REQUIRED)

# Test sources
set(TEST_SOURCES
    ${TEST_DIR}/unit/TestDatasetManager.cpp
    ${TEST_DIR}/unit/TestJsonUtils.cpp
    ${TEST_DIR}/unit/TestCrypto.cpp
    ${TEST_DIR}/unit/TestTokenManager.cpp
    ${TEST_DIR}/integration/TestApi.cpp
    # Add more test files as needed
)

add_executable(run_tests ${TEST_SOURCES})
target_link_libraries(run_tests PRIVATE
    GTest::gtest_main
    DataVizSystem # Link against the main application for testing its components
)

# Set common include directories for tests
target_include_directories(run_tests PRIVATE
    ${SOURCE_DIR}
)

# Add GTest definitions for all tests
target_compile_definitions(run_tests PRIVATE
    GTEST_FLAG_FILE="" # Prevent gtest from trying to read from non-existent file in some cases
)
```