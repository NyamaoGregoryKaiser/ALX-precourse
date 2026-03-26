# Optional: Add an option to enable/disable tests
option(ENABLE_TESTS "Enable building tests" ON)

if(ENABLE_TESTS)
    # Find Google Test
    find_package(GTest REQUIRED)
    include_directories(${GTEST_INCLUDE_DIRS})

    # Add required project includes for tests to access source files
    target_include_directories(cms_backend_tests PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/../src # Include backend/src
        ${LIBPQXX_INCLUDE_DIRS}
        /opt/pistache/include # Assuming Pistache is installed to /opt/pistache
        /opt/jwt-cpp/include # Assuming jwt-cpp is installed
        /opt/spdlog/include # Assuming spdlog is installed
    )

    # Unit Tests
    add_executable(cms_backend_tests
        unit/user_service_test.cpp
        unit/jwt_manager_test.cpp
        integration/user_repository_test.cpp
        integration/api_integration_test.cpp
    )

    target_link_libraries(cms_backend_tests
        gtest_main
        gmock_main
        cms_backend # Link against your main executable/library targets
        ${LIBPQXX_LIBRARIES}
        jwt-cpp::jwt-cpp
        spdlog::spdlog
        # And any other libraries needed by the tested code
    )
endif()