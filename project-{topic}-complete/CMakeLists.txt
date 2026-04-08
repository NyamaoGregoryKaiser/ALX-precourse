```cmake
cmake_minimum_required(VERSION 3.10)
project(db_optimizer LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON) # Required for shared libraries

# Find Poco libraries
find_package(Poco REQUIRED COMPONENTS Foundation Net Util Data Data/PostgreSQL)
find_package(spdlog REQUIRED)
find_package(jwt-cpp REQUIRED)

# Define common include directories
include_directories(app app/config app/core app/db app/http app/http/middleware app/http/responses app/models app/services app/utils app/controllers)

# Source files for the main application
set(APP_SOURCES
    app/main.cpp
    app/config/ConfigManager.cpp
    app/core/Application.cpp
    app/db/DBConnectionPool.cpp
    app/db/PostgreSQLAdapter.cpp
    app/http/HTTPServer.cpp
    app/http/Router.cpp
    app/http/RequestHandler.cpp
    app/http/middleware/AuthMiddleware.cpp
    app/http/middleware/ErrorMiddleware.cpp
    app/services/AuthService.cpp
    app/services/DBMonitorService.cpp
    app/services/QueryAnalyzer.cpp
    app/services/IndexRecommender.cpp
    app/utils/Logger.cpp
    app/utils/JSONUtils.cpp
    app/utils/JWTUtils.cpp
    app/controllers/AuthController.cpp
    app/controllers/UserController.cpp
    app/controllers/MonitoredDBController.cpp
    app/controllers/OptimizationController.cpp
)

# Add executable
add_executable(db_optimizer ${APP_SOURCES})

# Link libraries
target_link_libraries(db_optimizer
    Poco::Foundation
    Poco::Net
    Poco::Util
    Poco::Data
    Poco::DataPostgreSQL
    spdlog
    jwt-cpp
)

# Add compiler options for better warnings and security
if (CMAKE_BUILD_TYPE MATCHES "Debug")
    target_compile_options(db_optimizer PRIVATE -Wall -Wextra -Wpedantic -g)
else()
    target_compile_options(db_optimizer PRIVATE -Wall -Wextra -Wpedantic -O2 -DNDEBUG)
    target_link_options(db_optimizer PRIVATE -Wl,-z,relro -Wl,-z,now -Wl,-z,noexecstack)
endif()

# Install target
install(TARGETS db_optimizer DESTINATION bin)

# Add tests
add_subdirectory(tests)
```