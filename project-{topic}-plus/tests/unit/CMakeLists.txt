find_package(GTest REQUIRED)
include_directories(${GTEST_INCLUDE_DIRS})

# Collect all unit test source files
file(GLOB_RECURSE UNIT_TEST_SOURCES "*.cpp")

# Create a test executable for unit tests
add_executable(unit_tests ${UNIT_TEST_SOURCES})

# Link with main app's source files and libraries
target_link_libraries(unit_tests PRIVATE
    ecommerce_cpp_app # Link to the main application's library or object files
    ${GTEST_LIBRARIES}
    ${LIBPQXX_LIBRARIES} # Required if any unit tests touch DBManager
    ${SPDLOG_LIBRARIES}
    ${LibCrypt_LIBRARIES}
)

# Add unit tests to CTest
gtest_discover_tests(unit_tests)