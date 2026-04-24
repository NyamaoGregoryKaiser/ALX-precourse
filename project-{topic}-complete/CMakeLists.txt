```cmake
cmake_minimum_required(VERSION 3.15)
project(ecommerce-cpp CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON) # For better IDE integration

# Find vcpkg and integrate it
if(EXISTS "${VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake")
    include("${VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake")
else()
    message(FATAL_ERROR "VCPKG_ROOT is not set or vcpkg.cmake not found. Please set VCPKG_ROOT environment variable.")
endif()

# Find necessary packages
find_package(Crow CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(Pqxx CONFIG REQUIRED)
find_package(spdlog CONFIG REQUIRED)
find_package(CURL CONFIG REQUIRED) # For client
find_package(GTest CONFIG REQUIRED) # For tests

# --- Backend Application ---
add_executable(ecommerce_backend
    src/backend/main.cpp
    src/backend/db/db_manager.cpp
    src/backend/middleware/auth_middleware.cpp
    src/backend/middleware/error_middleware.cpp
    src/backend/middleware/logging_middleware.cpp
    src/backend/middleware/rate_limit_middleware.cpp
    src/backend/services/auth_service.cpp
    src/backend/services/product_service.cpp
    src/backend/services/order_service.cpp
    src/backend/utils/json_util.cpp
    src/backend/utils/jwt_util.cpp
)

target_include_directories(ecommerce_backend PUBLIC
    src/backend
    src/backend/models
    src/backend/services
    src/backend/db
    src/backend/middleware
    src/backend/utils
)

target_link_libraries(ecommerce_backend PRIVATE
    Crow::Crow
    nlohmann_json::nlohmann_json
    Pqxx::pqxx
    spdlog::spdlog
)

# --- Client Application ---
add_executable(ecommerce_client
    src/client/client_main.cpp
)

target_include_directories(ecommerce_client PUBLIC
    src/client
    src/backend/models # Client also needs product/user models to parse responses
    src/backend/utils # Client also needs json_util
)

target_link_libraries(ecommerce_client PRIVATE
    CURL::libcurl
    nlohmann_json::nlohmann_json
)

# --- Test Executables ---
# Unit Tests
add_executable(ecommerce_unit_tests
    tests/unit/test_auth_service.cpp
    tests/unit/test_product_service.cpp
)
target_include_directories(ecommerce_unit_tests PUBLIC
    src/backend
    src/backend/models
    src/backend/services
    src/backend/db
    src/backend/middleware
    src/backend/utils
    ${GTest_INCLUDE_DIRS}
)
target_link_libraries(ecommerce_unit_tests PRIVATE
    GTest::gtest GTest::gtest_main
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    Pqxx::pqxx # Link for mock DB manager or actual
)

# Integration Tests
add_executable(ecommerce_integration_tests
    tests/integration/test_db_integration.cpp
)
target_include_directories(ecommerce_integration_tests PUBLIC
    src/backend
    src/backend/models
    src/backend/services
    src/backend/db
    src/backend/middleware
    src/backend/utils
    ${GTest_INCLUDE_DIRS}
)
target_link_libraries(ecommerce_integration_tests PRIVATE
    GTest::gtest GTest::gtest_main
    Pqxx::pqxx
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    # Link other backend components if they are part of the integration test scope
    # For now, db_manager is sufficient
)

# Add custom commands for running tests
add_test(NAME RunUnitTests COMMAND ecommerce_unit_tests)
add_test(NAME RunIntegrationTests COMMAND ecommerce_integration_tests)

```