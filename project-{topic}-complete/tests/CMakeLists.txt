```cmake
# Add Google Test
find_package(GTest REQUIRED)
include_directories(${GTEST_INCLUDE_DIRS})

# Add the test executable
add_executable(visuflow_tests
    unit/TestDataProcessor.cpp
    unit/TestJWTManager.cpp
    unit/TestCacheManager.cpp
    integration/TestDatabase.cpp
    integration/TestApiServer.cpp
)

# Link tests with the main application's sources and libraries
target_link_libraries(visuflow_tests
    gtest_main
    gmock_main
    visuflow_server # Link the main executable to access its components
    Pistache::Pistache
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    # jwt-cpp
    # soci_core soci_postgresql
    pqxx::pqxx # Link libpqxx for database tests
)

# Set common definitions for tests to correctly find paths/config
target_compile_definitions(visuflow_tests PUBLIC
    TEST_RESOURCE_PATH="${CMAKE_SOURCE_DIR}/tests/resources"
    CONFIG_PATH="${CMAKE_SOURCE_DIR}/config.json"
)

# Ensure tests are run after building
add_test(NAME run_visuflow_tests COMMAND visuflow_tests)
```