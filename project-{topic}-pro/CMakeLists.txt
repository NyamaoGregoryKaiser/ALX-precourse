```cmake
cmake_minimum_required(VERSION 3.10)
project(WebScraper CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# --- Dependencies ---
# Pistache (assuming installed via system package manager or vcpkg/conan)
find_package(Pistache REQUIRED)

# PostgreSQL (pqxx)
find_package(PkgConfig REQUIRED)
pkg_check_modules(PQXX REQUIRED libpqxx)

# nlohmann/json (header-only) - included directly in src/common
# No specific find_package needed, just include path

# spdlog
find_package(spdlog REQUIRED)

# libcurl
find_package(CURL REQUIRED)

# libgumbo
find_package(Gumbo REQUIRED)

# OpenSSL (for JWT, if using a full JWT library)
find_package(OpenSSL REQUIRED) # Even if we simulate, it's good practice to list

# --- Global Include Directories ---
include_directories(
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/src/common
    ${CMAKE_SOURCE_DIR}/src/middleware
    ${CMAKE_SOURCE_DIR}/src/models
    ${CMAKE_SOURCE_DIR}/src/database
    ${CMAKE_SOURCE_DIR}/src/services
    ${CMAKE_SOURCE_DIR}/src/controllers
    ${CMAKE_SOURCE_DIR}/src/scraper
    ${CMAKE_SOURCE_DIR}/src/cache
    ${PQXX_INCLUDE_DIRS}
    ${SPDLOG_INCLUDE_DIR}
    ${CURL_INCLUDE_DIRS}
    ${Gumbo_INCLUDE_DIRS}
    ${OPENSSL_INCLUDE_DIR}
)

# --- Source Files ---
set(APP_SOURCES
    src/main.cpp
    src/app.cpp
    src/common/config.cpp
    src/common/logger.cpp
    src/common/jwt_manager.cpp
    src/middleware/auth_middleware.cpp
    src/middleware/rate_limit_middleware.cpp
    src/database/db_manager.cpp
    src/database/user_repository.cpp
    src/database/job_repository.cpp
    src/services/user_service.cpp
    src/services/job_service.cpp
    src/services/scraper_service.cpp
    src/controllers/auth_controller.cpp
    src/controllers/jobs_controller.cpp
    src/scraper/scraper_core.cpp
    src/scraper/html_parser.cpp
)

# --- Executable ---
add_executable(webscraper ${APP_SOURCES})

# --- Link Libraries ---
target_link_libraries(webscraper
    Pistache::Server
    ${PQXX_LIBRARIES}
    ${SPDLOG_LIBRARIES}
    ${CURL_LIBRARIES}
    ${Gumbo_LIBRARIES}
    ${OPENSSL_LIBRARIES} # Link for potential crypto functions
)

# --- Test Configuration ---
enable_testing()
add_subdirectory(tests)

# Ensure config.json is copied to build directory
add_custom_command(TARGET webscraper POST_BUILD
                   COMMAND ${CMAKE_COMMAND} -E copy_if_different
                   ${CMAKE_SOURCE_DIR}/config/config.json
                   $<TARGET_FILE_DIR:webscraper>/config.json
                   COMMENT "Copying config.json to build directory")
```