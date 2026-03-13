add_executable(cms_tests
    unit/test_uuid.cpp
    unit/test_lru_cache.cpp
    unit/test_jwt_manager.cpp
    integration/test_db_connection.cpp
    integration/test_user_repository.cpp
    # api/test_api_content.cpp # Uncomment if you implement API tests
)

target_link_libraries(cms_tests PRIVATE
    GTest::gtest_main
    Pistache::Pistache
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    jwt-cpp::jwt-cpp
    pqxx::pqxx
    OpenSSL::SSL
    OpenSSL::Crypto
)

# Link cms_tests against the main application's sources/headers for testing internal components
target_include_directories(cms_tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/../src)

add_test(NAME CMSSystemUnitAndIntegrationTests COMMAND cms_tests)
```