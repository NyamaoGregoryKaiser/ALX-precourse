```cmake
cmake_minimum_required(VERSION 3.10)
project(AuroraMetrics VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler flags for better performance and warnings
if (CMAKE_BUILD_TYPE MATCHES "Release")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -DNDEBUG")
else()
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O0 -g -Wall -Wextra -Wpedantic")
endif()

# Find Crow (assuming installed or path specified)
# For vcpkg or Conan users, this would be different.
# For simplicity, we assume Crow is available via system install or custom path.
# A more robust setup would use FetchContent or package manager.
find_package(Crow CONFIG REQUIRED)

# Find spdlog
find_package(spdlog CONFIG REQUIRED)

# Find libpqxx
find_package(libpqxx CONFIG REQUIRED)

# Find nlohmann/json (Crow usually brings this, but good to be explicit)
find_package(nlohmann_json CONFIG REQUIRED)

# Find jwt-cpp (assuming installed or path specified)
# Example: If installed via vcpkg: find_package(jwt-cpp CONFIG REQUIRED)
# For this example, let's assume it's available.
# Manual include for simplicity if not using a package manager:
# target_include_directories(AuroraMetrics PRIVATE /path/to/jwt-cpp/include)
# target_link_libraries(AuroraMetrics PRIVATE jwt-cpp)
# For now, we'll mock its finding for the blueprint.
# In a real project, use vcpkg or Conan.
# Assume jwt-cpp is found and linked if present.
# For demonstration purposes, we'll add a dummy link if not using package manager
# set(JWT_CPP_FOUND TRUE) # Mocking for blueprint
# if(JWT_CPP_FOUND)
#    message(STATUS "jwt-cpp found (mocked)")
# else()
#    message(FATAL_ERROR "jwt-cpp not found. Please install or specify path.")
# endif()


# Define source directories
set(APP_SRCS
    src/main.cpp
    src/config/AppConfig.cpp
    src/controllers/AuthController.cpp
    src/controllers/MetricsController.cpp
    src/controllers/UsersController.cpp
    src/services/AuthService.cpp
    src/services/MetricService.cpp
    src/services/UserService.cpp
    src/repositories/UserRepository.cpp
    src/repositories/MetricRepository.cpp
    src/repositories/DatabaseManager.cpp
    src/middleware/AuthMiddleware.cpp
    src/middleware/ErrorMiddleware.cpp
    src/middleware/RateLimitMiddleware.cpp
    src/utils/Logger.cpp
    src/utils/JWTManager.cpp
    src/utils/Cache.cpp # Mocking Cache implementation for now
    src/utils/StringUtil.cpp
    src/utils/TimeUtil.cpp
    src/agents/SystemMonitorAgent.cpp
)

set(APP_HEADERS
    src/config/AppConfig.h
    src/controllers/AuthController.h
    src/controllers/MetricsController.h
    src/controllers/UsersController.h
    src/services/AuthService.h
    src/services/MetricService.h
    src/services/UserService.h
    src/repositories/UserRepository.h
    src/repositories/MetricRepository.h
    src/repositories/DatabaseManager.h
    src/models/User.h
    src/models/Metric.h
    src/models/MetricData.h
    src/models/JWTClaims.h
    src/middleware/AuthMiddleware.h
    src/middleware/ErrorMiddleware.h
    src/middleware/RateLimitMiddleware.h
    src/utils/Logger.h
    src/utils/JWTManager.h
    src/utils/Cache.h
    src/utils/StringUtil.h
    src/utils/TimeUtil.h
    src/agents/SystemMonitorAgent.h
)

add_executable(AuroraMetrics ${APP_SRCS} ${APP_HEADERS})

target_include_directories(AuroraMetrics PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${Crow_INCLUDE_DIRS}
    ${spdlog_INCLUDE_DIR}
    ${LIBPQXX_INCLUDE_DIRS}
    ${nlohmann_json_INCLUDE_DIR}
    # Add jwt-cpp include dir here if not found by find_package
)

target_link_libraries(AuroraMetrics PRIVATE
    Crow::Crow
    spdlog::spdlog
    pqxx::pqxx
    nlohmann_json::nlohmann_json
    # Link jwt-cpp here
    # For now, if jwt-cpp is not properly found, we proceed, but a real setup needs it.
)

# Copy static web files
file(GLOB_RECURSE WEB_FILES "src/web/public/*")
foreach(FILE_PATH ${WEB_FILES})
    file(RELATIVE_PATH REL_PATH ${CMAKE_SOURCE_DIR}/src/web/public ${FILE_PATH})
    configure_file(${FILE_PATH} ${CMAKE_BINARY_DIR}/web/public/${REL_PATH} COPYONLY)
endforeach()

# --- Testing Setup (Google Test) ---
enable_testing()
find_package(GTest CONFIG REQUIRED)

add_subdirectory(tests) # Assuming tests/CMakeLists.txt handles test compilation

# Optionally install the executable
install(TARGETS AuroraMetrics DESTINATION bin)
install(DIRECTORY ${CMAKE_BINARY_DIR}/web/public DESTINATION share/aurora-metrics/web)
```