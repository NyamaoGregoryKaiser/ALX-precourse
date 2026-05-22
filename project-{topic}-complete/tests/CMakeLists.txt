```cmake
enable_testing()

# Find Google Test
find_package(GTest CONFIG REQUIRED)

# Link C++ libraries needed for tests
# We need to link the same libraries as the main application, plus gtest and gmock.
set(TEST_LIBS
    Pistache::Pistache
    jsoncpp::jsoncpp
    PQXX::pqxx
    spdlog::spdlog
    jwt-cpp::jwt-cpp
    argon2 # Assuming this is correctly linked globally or by find_package
    GTest::gtest_main
    GTest::gmock_main
)

# Set common include directories for tests
target_include_directories(TaskAPI_tests PUBLIC
    ${CMAKE_SOURCE_DIR}/src
    ${GTest_INCLUDE_DIRS}
    ${CMAKE_CURRENT_SOURCE_DIR}/../src # Allow tests to include src/ headers
)

# Unit Tests
add_executable(TaskAPI_unit_tests
    unit/test_config.cpp
    unit/test_jwt_manager.cpp
    unit/test_password_hasher.cpp
    unit/test_json_utils.cpp
    # Add more unit test files as needed
)
target_link_libraries(TaskAPI_unit_tests PRIVATE ${TEST_LIBS})
add_test(NAME UnitTests COMMAND TaskAPI_unit_tests)


# Integration Tests
add_executable(TaskAPI_integration_tests
    integration/test_task_service_integration.cpp
    # Add more integration test files as needed
)
target_link_libraries(TaskAPI_integration_tests PRIVATE ${TEST_LIBS})
add_test(NAME IntegrationTests COMMAND TaskAPI_integration_tests)


# Overall test target for convenience
add_custom_target(TaskAPI_tests ALL DEPENDS
    TaskAPI_unit_tests
    TaskAPI_integration_tests
)
```