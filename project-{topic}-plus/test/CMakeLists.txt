add_executable(test_runner
    unit/TestHasher.cpp
    unit/TestCache.cpp
    unit/TestJWTManager.cpp
    unit/TestRateLimiter.cpp
    integration/TestUserRepository.cpp
    integration/TestTaskRepository.cpp
    integration/TestAuthService.cpp
    api/TestApiAuth.cpp # Needs a running server
    api/TestApiUsers.cpp # Needs a running server
)

# Find Google Test (assume installed or available)
find_package(GTest REQUIRED)
target_link_libraries(test_runner GTest::gtest_main)

# Link application sources and dependencies for tests
target_link_libraries(test_runner
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/utils/Hasher.cpp # Link individual cpp files or common library
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/utils/Cache.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/utils/RateLimiter.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/auth/JWTManager.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/database/SQLiteManager.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/users/UserRepository.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/tasks/TaskRepository.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/users/UserService.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/auth/AuthService.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/config/config.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/utils/Logger.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/utils/ErrorHandler.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/database/MigrationManager.cpp # For integration tests
    ${SQLITE3_LIBRARY}
    ${OpenSSL_LIBRARIES}
    # Link Crow, jsoncpp, etc. if API tests involve full Crow app lifecycle.
    # For basic unit/integration, we might mock HTTP interactions.
    # If API tests need a running server, it's better to run tests against a deployed instance
    # or use a separate test harness that spins up the Crow app.
)

# Include test directories
target_include_directories(test_runner PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/../src
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/config
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/auth
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/users
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/tasks
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/models
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/database
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/utils
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/middleware
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/dto
    ${CROW_INCLUDE_DIR}
    ${JSONCPP_INCLUDE_DIR}
    ${SQLITE3_INCLUDE_DIR}
    ${JWTCPP_INCLUDE_DIR}
    ${SPDLOG_INCLUDE_DIR}
)

# Enable testing
enable_testing()
add_test(NAME run_tests COMMAND test_runner)