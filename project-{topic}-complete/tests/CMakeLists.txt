```cmake
cmake_minimum_required(VERSION 3.15)

# Find Google Test
find_package(googletest CONFIG REQUIRED)
enable_testing()

# Include common source directories for models/services for testing
target_include_directories(cms_tests PUBLIC
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/src/models
    ${CMAKE_SOURCE_DIR}/src/services
    ${CMAKE_SOURCE_DIR}/src/utils
    ${CMAKE_SOURCE_DIR}/src/filters # If testing filter logic directly
)

# Link Drogon's DB client as it's used by mappers/services
target_link_libraries(cms_tests PRIVATE
    drogon::drogon
    json-cpp::json-cpp
    jwt-cpp::jwt-cpp
    libpq::libpq
)

# Unit Tests
add_executable(unit_tests
    unit/UserService_test.cc
    unit/Cache_test.cc
)
target_link_libraries(unit_tests PRIVATE gtest::gtest_main)
add_test(NAME UnitTests COMMAND unit_tests)

# Integration Tests
add_executable(integration_tests
    integration/AuthAPI_test.cc
)
target_link_libraries(integration_tests PRIVATE gtest::gtest_main)
add_test(NAME IntegrationTests COMMAND integration_tests)

# Link Drogon for test dependencies
target_link_libraries(unit_tests PRIVATE drogon::drogon json-cpp::json-cpp jwt-cpp::jwt-cpp libpq::libpq)
target_link_libraries(integration_tests PRIVATE drogon::drogon json-cpp::json-cpp jwt-cpp::jwt-cpp libpq::libpq)
```