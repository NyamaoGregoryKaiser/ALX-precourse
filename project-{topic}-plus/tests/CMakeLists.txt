```cmake
# Fetch Google Test if not already fetched by parent CMakeLists
# This is usually handled by the parent CMakeLists.txt
# If not, uncomment the following:
# include(FetchContent)
# FetchContent_Declare(
#     googletest
#     GIT_REPOSITORY https://github.com/google/googletest.git
#     GIT_TAG        release-1.12.1
# )
# FetchContent_MakeAvailable(googletest)


# Unit Tests
file(GLOB_RECURSE UNIT_TEST_SOURCES "unit/*.cpp")
add_executable(unit_tests ${UNIT_TEST_SOURCES})
target_link_libraries(unit_tests
    GTest::gtest_main
    TaskManagementSystem # Link against the main app executable to access its classes
)
target_include_directories(unit_tests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../src # Include main app's headers
)

# Integration Tests
file(GLOB_RECURSE INTEGRATION_TEST_SOURCES "integration/*.cpp")
add_executable(integration_tests ${INTEGRATION_TEST_SOURCES})
target_link_libraries(integration_tests
    GTest::gtest_main
    TaskManagementSystem
)
target_include_directories(integration_tests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../src
)

# Add tests to CTest
include(CTest)
add_test(NAME unit_tests COMMAND unit_tests)
add_test(NAME integration_tests COMMAND integration_tests)
```