```cmake
add_executable(test_runner
    unit/test_models.cpp
    unit/test_services.cpp
    unit/test_utils.cpp
    integration/test_database.cpp
    integration/test_api.cpp
)

# Link test_runner against Catch2
find_package(Catch2 REQUIRED)
target_link_libraries(test_runner Catch2::Catch2)

# Link test_runner against the main application libraries
target_link_libraries(test_runner
    performance_monitor # Link against the main app's libraries
    pqxx::pqxx
    jwt-cpp::jwt-cpp
    bcrypt
)

# Include directories needed for tests
target_include_directories(test_runner
    PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${NLOHMANN_JSON_INCLUDE_DIR}
    ${CROW_INCLUDE_DIR}
    ${JWT_CPP_INCLUDE_DIR}
)

# Add test discovery for Catch2 (makes CTest find your tests)
include(CTest)
catch_discover_tests(test_runner)

```