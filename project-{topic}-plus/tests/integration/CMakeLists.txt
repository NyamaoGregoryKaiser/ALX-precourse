find_package(GTest REQUIRED)
include_directories(${GTEST_INCLUDE_DIRS})

# Collect all integration test source files
file(GLOB_RECURSE INTEGRATION_TEST_SOURCES "*.cpp")

# Create a test executable for integration tests
add_executable(integration_tests ${INTEGRATION_TEST_SOURCES})

# Link with main app's source files and libraries
target_link_libraries(integration_tests PRIVATE
    ecommerce_cpp_app # Link to the main application's library or object files
    ${GTEST_LIBRARIES}
    ${LIBPQXX_LIBRARIES}
    ${SPDLOG_LIBRARIES}
    ${LibCrypt_LIBRARIES}
)

# Add integration tests to CTest
gtest_discover_tests(integration_tests)