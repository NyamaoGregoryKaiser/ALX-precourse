```cmake
# tests/CMakeLists.txt
add_executable(VisGenius_Tests
    tests/TestModels.cpp
    tests/TestLogger.cpp
    tests/TestHttpUtils.cpp
    tests/TestDatabase.cpp
    tests/TestDataProcessor.cpp
    tests/TestAuthManager.cpp
    tests/TestVisualizationEngine.cpp
    tests/TestController.cpp
    tests/TestRouter.cpp
    tests/TestRateLimiting.cpp
    # tests/TestServer.cpp # Server tests are more like integration tests
)

target_link_libraries(VisGenius_Tests
    PUBLIC VisGenius # Link to the main library/executable targets its components
    PUBLIC GTest::gtest_main # Links Google Test
)

# Set include directories for the tests to find the main project headers
target_include_directories(VisGenius_Tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/../src)
```