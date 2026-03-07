```cmake
add_executable(TaskManagementSystem_tests
    unit/AuthService_test.cpp
    unit/TaskService_test.cpp
    integration/ApiIntegration_test.cpp
)

target_link_libraries(TaskManagementSystem_tests PRIVATE
    gtest_main
    gtest
    Drogon::Drogon
)

# Set up include directories for tests to find application headers
target_include_directories(TaskManagementSystem_tests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../src
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/models
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/services
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/controllers
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/filters
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/utils
)

# Add tests to CTest
add_test(NAME AuthService_Unit_Tests COMMAND TaskManagementSystem_tests --gtest_filter=AuthServiceTest.*)
add_test(NAME TaskService_Unit_Tests COMMAND TaskManagementSystem_tests --gtest_filter=TaskServiceTest.*)
add_test(NAME API_Integration_Tests COMMAND TaskManagementSystem_tests --gtest_filter=ApiIntegrationTest.*)
```