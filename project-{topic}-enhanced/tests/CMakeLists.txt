add_executable(DatabaseOptimizerTests
    unit/TestAuthService.cpp
    unit/TestQueryAnalyzerService.cpp
    unit/TestDbConnection.cpp
    integration/TestApiEndpoints.cpp
)

# Find and include Google Test
find_package(GTest CONFIG REQUIRED)
target_link_libraries(DatabaseOptimizerTests PRIVATE
    GTest::gtest_main
    DatabaseOptimizer # Link against the main application's library if it were a lib, or specific objects
)

target_include_directories(DatabaseOptimizerTests PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/../src # Include main source directory for headers
)

# Define a test for CTest
add_test(NAME RunDatabaseOptimizerTests COMMAND DatabaseOptimizerTests)
```