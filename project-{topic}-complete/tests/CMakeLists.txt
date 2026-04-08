```cmake
# CMakeLists.txt for tests

project(db_optimizer_tests LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find Catch2
find_package(Catch2 REQUIRED)

# Include directories from parent project
include_directories(${PROJECT_SOURCE_DIR}/app
                    ${PROJECT_SOURCE_DIR}/app/config
                    ${PROJECT_SOURCE_DIR}/app/core
                    ${PROJECT_SOURCE_DIR}/app/db
                    ${PROJECT_SOURCE_DIR}/app/http
                    ${PROJECT_SOURCE_DIR}/app/http/middleware
                    ${PROJECT_SOURCE_DIR}/app/http/responses
                    ${PROJECT_SOURCE_DIR}/app/models
                    ${PROJECT_SOURCE_DIR}/app/services
                    ${PROJECT_SOURCE_DIR}/app/utils
                    ${PROJECT_SOURCE_DIR}/app/controllers)

# Shared sources (models, utils that don't have main logic)
set(TEST_COMMON_SOURCES
    ${PROJECT_SOURCE_DIR}/app/config/ConfigManager.cpp
    ${PROJECT_SOURCE_DIR}/app/db/DBConnectionPool.cpp
    ${PROJECT_SOURCE_DIR}/app/db/PostgreSQLAdapter.cpp
    ${PROJECT_SOURCE_DIR}/app/services/AuthService.cpp
    ${PROJECT_SOURCE_DIR}/app/services/DBMonitorService.cpp
    ${PROJECT_SOURCE_DIR}/app/services/QueryAnalyzer.cpp
    ${PROJECT_SOURCE_DIR}/app/services/IndexRecommender.cpp
    ${PROJECT_SOURCE_DIR}/app/utils/Logger.cpp
    ${PROJECT_SOURCE_DIR}/app/utils/JSONUtils.cpp
    ${PROJECT_SOURCE_DIR}/app/utils/JWTUtils.cpp
    ${PROJECT_SOURCE_DIR}/app/http/middleware/AuthMiddleware.cpp
    ${PROJECT_SOURCE_DIR}/app/http/middleware/ErrorMiddleware.cpp
    # Add other common source files needed for tests
)

# Unit Tests
set(UNIT_TEST_SOURCES
    unit/TestConfigManager.cpp
    unit/TestQueryAnalyzer.cpp
    unit/TestIndexRecommender.cpp
    unit/TestAuthService.cpp
    # Add other unit test files
)

add_executable(unit_tests ${UNIT_TEST_SOURCES} ${TEST_COMMON_SOURCES})
target_link_libraries(unit_tests
    Catch2::Catch2WithMain
    Poco::Foundation
    Poco::Net
    Poco::Util
    Poco::Data
    Poco::DataPostgreSQL
    spdlog
    jwt-cpp
)
# Make sure test executables are added to CTest
add_test(NAME UnitTests COMMAND unit_tests --success)
set_target_properties(unit_tests PROPERTIES CXX_STANDARD 17 CXX_STANDARD_REQUIRED ON)


# Integration Tests (requires a running DB, setup in docker-compose for real integration)
set(INTEGRATION_TEST_SOURCES
    integration/TestDBMonitorService.cpp
    integration/TestAPI.cpp
    # Add other integration test files
)

add_executable(integration_tests ${INTEGRATION_TEST_SOURCES} ${TEST_COMMON_SOURCES})
target_link_libraries(integration_tests
    Catch2::Catch2WithMain
    Poco::Foundation
    Poco::Net
    Poco::Util
    Poco::Data
    Poco::DataPostgreSQL
    spdlog
    jwt-cpp
)
add_test(NAME IntegrationTests COMMAND integration_tests --success)
set_target_properties(integration_tests PROPERTIES CXX_STANDARD 17 CXX_STANDARD_REQUIRED ON)

```