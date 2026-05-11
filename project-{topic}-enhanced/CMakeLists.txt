cmake_minimum_required(VERSION 3.10)
project(DatabaseOptimizer CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON) # For clangd/IDE support

# Find and include Boost
find_package(Boost 1.70.0 COMPONENTS system program_options asio json REQUIRED)
if (Boost_FOUND)
    include_directories(${Boost_INCLUDE_DIRS})
    link_directories(${Boost_LIBRARY_DIRS})
    message(STATUS "Found Boost: ${Boost_LIBRARIES}")
else()
    message(FATAL_ERROR "Boost not found. Please install Boost 1.70.0 or higher.")
endif()

# Find and include nlohmann/json (vendored or via Hunter/Conan)
# For simplicity, assuming it's in a `libs` directory or system-wide
# If vendored, you'd add_subdirectory(libs/json) and target_link_libraries
find_package(nlohmann_json CONFIG REQUIRED)

# Find and include libpqxx
find_package(PkgConfig REQUIRED)
pkg_search_module(LIBPQXX REQUIRED libpqxx)
if (LIBPQXX_FOUND)
    include_directories(${LIBPQXX_INCLUDE_DIRS})
    message(STATUS "Found libpqxx: ${LIBPQXX_LIBRARIES}")
else()
    message(FATAL_ERROR "libpqxx not found. Please install libpqxx development files.")
endif()

# Find and include spdlog
find_package(spdlog CONFIG REQUIRED)

# Define source directories
set(APP_SRCS
    src/main.cpp
    src/server/HttpServer.cpp
    src/server/RequestHandler.cpp
    src/server/AuthMiddleware.cpp
    src/server/ErrorHandler.cpp
    src/server/RateLimiter.cpp
    src/server/StaticFileHandler.cpp
    src/server/ViewRenderer.cpp
    src/db/DbConnection.cpp
    src/db/migrations/MigrationManager.cpp
    src/db/repositories/UserRepository.cpp
    src/db/repositories/QueryLogRepository.cpp
    src/db/repositories/IndexRecommendationRepository.cpp
    src/db/repositories/SchemaIssueRepository.cpp
    src/models/User.h
    src/models/QueryLog.h
    src/models/IndexRecommendation.h
    src/models/SchemaIssue.h
    src/services/AuthService.cpp
    src/services/QueryAnalyzerService.cpp
    src/services/SchemaAnalyzerService.cpp
    src/services/CacheService.cpp
    src/utils/JsonUtils.cpp
    src/utils/Logger.cpp
    src/utils/Config.cpp
    src/common/Constants.h
    src/common/Exceptions.h
)

# Add headers to the project, so IDEs can find them
target_include_directories(DatabaseOptimizer PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${LIBPQXX_INCLUDE_DIRS}
    ${Boost_INCLUDE_DIRS}
)

add_executable(DatabaseOptimizer ${APP_SRCS} src/server/HttpServer.h src/server/RequestHandler.h src/server/AuthMiddleware.h src/server/ErrorHandler.h src/server/RateLimiter.h src/server/StaticFileHandler.h src/server/ViewRenderer.h src/db/DbConnection.h src/db/migrations/MigrationManager.h src/db/repositories/UserRepository.h src/db/repositories/QueryLogRepository.h src/db/repositories/IndexRecommendationRepository.h src/db/repositories/SchemaIssueRepository.h src/models/User.h src/models/QueryLog.h src/models/IndexRecommendation.h src/models/SchemaIssue.h src/services/AuthService.h src/services/QueryAnalyzerService.h src/services/SchemaAnalyzerService.h src/services/CacheService.h src/utils/JsonUtils.h src/utils/Logger.h src/utils/Config.h src/common/Constants.h src/common/Exceptions.h
)

target_link_libraries(DatabaseOptimizer PUBLIC
    Boost::system
    Boost::program_options
    Boost::asio
    Boost::json
    nlohmann_json::nlohmann_json
    ${LIBPQXX_LIBRARIES}
    spdlog::spdlog
)

# --- Testing ---
enable_testing()
add_subdirectory(tests)

# Install rules (optional, for deployment)
install(TARGETS DatabaseOptimizer DESTINATION bin)
install(FILES ${CMAKE_CURRENT_SOURCE_DIR}/web/index.html ${CMAKE_CURRENT_SOURCE_DIR}/web/style.css DESTINATION web)
install(FILES ${CMAKE_CURRENT_SOURCE_DIR}/.env.example DESTINATION etc)
install(DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/database DESTINATION database)

```