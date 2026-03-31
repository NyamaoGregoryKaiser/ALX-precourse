# Find Catch2 (already done in parent CMakeLists.txt)

# Add unit tests
add_executable(UnitTests
    unit/test_AppConfig.cc
    unit/test_CryptoUtils.cc
    unit/test_JwtManager.cc
    # Add more unit test files here
)
target_link_libraries(UnitTests PRIVATE Catch2::Catch2WithMain jwt-cpp::jwt-cpp)

# Add integration tests
add_executable(IntegrationTests
    integration/test_UserRepository.cc
    # Add more integration test files here
)
target_link_libraries(IntegrationTests PRIVATE Catch2::Catch2WithMain Drogon::Drogon jwt-cpp::jwt-cpp spdlog::spdlog)

# Add tests to CTest (for `ctest` command)
add_test(NAME UnitTests COMMAND UnitTests)
add_test(NAME IntegrationTests COMMAND IntegrationTests)
# Set a property for integration tests to be run after DB setup (e.g., in CI)
set_tests_properties(IntegrationTests PROPERTIES LABELS "integration")
set_tests_properties(UnitTests PROPERTIES LABELS "unit")

# Example for 80%+ coverage (requires GCOV/LLVM-COV)
# In parent CMakeLists.txt, if CMAKE_BUILD_TYPE is Debug or Coverage:
# set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} --coverage -fprofile-arcs -ftest-coverage")
# set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} --coverage")
# Then use lcov/genhtml in your CI/CD script:
# lcov --directory . --capture --output-file coverage.info
# genhtml coverage.info --output-directory coverage_report
# For this example, we enable `CMAKE_CXX_FLAGS_DEBUG` for address/undefined sanitizers and O0 -g.
# For coverage, a separate build type (e.g., `Coverage`) with the `--coverage` flags would be used.
```

**`tests/unit/test_AppConfig.cc`**
```cpp