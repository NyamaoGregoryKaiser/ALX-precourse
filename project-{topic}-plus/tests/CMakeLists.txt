# tests/CMakeLists.txt
add_executable(run_tests tests/unit/test_models.cpp tests/unit/test_jwt_manager.cpp tests/integration/test_db_manager.cpp
    src/config/config.h
    src/database/db_manager.h src/database/db_manager.cpp
    src/models/user.h src/models/user.cpp
    src/models/project.h src/models/project.cpp
    src/models/task.h src/models/task.cpp
    src/models/team.h src/models/team.cpp
    src/services/user_service.h src/services/user_service.cpp
    src/services/project_service.h src/services/project_service.cpp
    src/services/task_service.h src/services/task_service.cpp
    src/services/team_service.h src/services/team_service.cpp
    src/utils/jwt_manager.h src/utils/jwt_manager.cpp
    src/utils/logger.h src/utils/logger.cpp
)

target_link_libraries(run_tests
    PRIVATE
        gtest_main gmock_main
        ${DB_LIBRARIES}
        ${JWT_CPP_LIB}
        ${OpenSSL_LIBRARIES}
        ${CRYPT_LIBRARY}
)

# Set necessary include directories for tests
target_include_directories(run_tests PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${CROW_ROOT}/include
    ${NLOHMANN_JSON_ROOT}/include
    ${SPDLOG_ROOT}/include
    ${JWT_CPP_ROOT}/include
    ${LIBPQXX_INCLUDE_DIRS}
    ${GTEST_INCLUDE_DIRS}
    ${GMOCK_INCLUDE_DIRS}
)

# Ensure tests are built as part of 'make all' if BUILD_TESTS is ON
add_test(NAME AllTests COMMAND run_tests)
```