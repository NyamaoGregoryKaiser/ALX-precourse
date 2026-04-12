# CMakeLists.txt for the tests directory
cmake_minimum_required(VERSION 3.10)

# Google Test
find_package(GTest REQUIRED)
include_directories(${GTEST_INCLUDE_DIRS})

# Source files for the test runner
set(TEST_SRCS
    main_test.cpp
    unit/test_auth_service.cpp
    unit/test_task_model.cpp
    unit/test_cache.cpp
    integration/test_database.cpp
    integration/test_api_tasks.cpp
)

# Application source files needed for tests
# Link against necessary application components
set(APP_TEST_SRCS
    ${CMAKE_SOURCE_DIR}/src/app.cpp
    ${CMAKE_SOURCE_DIR}/src/auth/auth_service.cpp
    ${CMAKE_SOURCE_DIR}/src/auth/jwt_middleware.cpp
    ${CMAKE_SOURCE_DIR}/src/controllers/auth_controller.cpp
    ${CMAKE_SOURCE_DIR}/src/controllers/task_controller.cpp
    ${CMAKE_SOURCE_DIR}/src/database/database_manager.cpp
    ${CMAKE_SOURCE_DIR}/src/models/task.cpp
    ${CMAKE_SOURCE_DIR}/src/models/user.cpp
    ${CMAKE_SOURCE_DIR}/src/middleware/error_handler.cpp
    ${CMAKE_SOURCE_DIR}/src/middleware/rate_limiter.cpp
    ${CMAKE_SOURCE_DIR}/src/utils/logger.cpp
    ${CMAKE_SOURCE_DIR}/src/utils/cache.cpp
    ${CMAKE_SOURCE_DIR}/src/server.cpp
)

add_executable(run_tests ${TEST_SRCS} ${APP_TEST_SRCS})

target_include_directories(run_tests PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/src/config
    ${GTEST_INCLUDE_DIRS}
    ${Pistache_INCLUDE_DIRS}
    ${JSONCPP_INCLUDE_DIR}
    ${SQLITE3_INCLUDE_DIR}
    ${OPENSSL_INCLUDE_DIR}
    ${jwt-cpp_SOURCE_DIR}/include # For jwt-cpp if fetched
)

target_link_libraries(run_tests
    GTest::gtest_main
    Pistache::Pistache
    jsoncpp::jsoncpp
    jwt-cpp
    ${OPENSSL_LIBRARIES}
    SQLiteCpp # Link against our minimal SQLiteCpp wrapper
)

# Copy the .env.example file to .env in the build directory for tests to use
add_custom_command(TARGET run_tests POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
    ${CMAKE_SOURCE_DIR}/.env.example
    $<TARGET_FILE_DIR:run_tests>/.env
    COMMENT "Copying .env.example for tests"
)

# Create a 'data' directory for the test database
add_custom_command(TARGET run_tests POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory
    $<TARGET_FILE_DIR:run_tests>/data
    COMMENT "Creating data directory for tests"
)

# Add test executable to CTest discovery
add_test(NAME CppApiSystemTests COMMAND run_tests)
```