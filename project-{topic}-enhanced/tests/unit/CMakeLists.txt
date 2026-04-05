```cmake
# Add Google Test
find_package(GTest CONFIG REQUIRED)
include(GoogleTest)

# Define a test executable
add_executable(TaskManagementSystem_unit_tests
    test_auth.cpp
    test_crypto.cpp
    test_user.cpp
)

# Link the test executable with GTest and your application's source files/libraries
target_link_libraries(TaskManagementSystem_unit_tests PRIVATE
    GTest::gtest_main
    ${PROJECT_NAME} # Link against your main application target
    SQLite3::SQLite3 # Link SQLite3 if tests directly access DB
)

# Additional include directories for test files to find application headers
target_include_directories(TaskManagementSystem_unit_tests PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/src/auth
    ${CMAKE_SOURCE_DIR}/src/config
    ${CMAKE_SOURCE_DIR}/src/controllers
    ${CMAKE_SOURCE_DIR}/src/database
    ${CMAKE_SOURCE_DIR}/src/logger
    ${CMAKE_SOURCE_DIR}/src/middleware
    ${CMAKE_SOURCE_DIR}/src/models
    ${CMAKE_SOURCE_DIR}/src/services
    ${CMAKE_SOURCE_DIR}/src/utils
)

# Enable testing in CMake
enable_testing()

# Add a test discovery command for GTest
gtest_discover_tests(TaskManagementSystem_unit_tests)
```