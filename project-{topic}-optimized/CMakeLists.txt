cmake_minimum_required(VERSION 3.16)
project(CMSSystem CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON) # Required for shared libraries on some platforms

# Use vcpkg for dependency management
# Add vcpkg toolchain file if not already set globally
if(NOT DEFINED CMAKE_TOOLCHAIN_FILE AND EXISTS "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake")
    set(CMAKE_TOOLCHAIN_FILE "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake" CACHE STRING "Vcpkg toolchain file")
endif()

# Find packages using vcpkg
find_package(Pistache CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(spdlog CONFIG REQUIRED)
find_package(jwt-cpp CONFIG REQUIRED)
find_package(libpqxx CONFIG REQUIRED)
find_package(OpenSSL CONFIG REQUIRED) # jwt-cpp often needs OpenSSL for cryptography

# Define source files for the main application
set(APP_SRCS
    src/main.cpp
    src/common/uuid.hpp
    src/common/json_utils.hpp
    src/common/logger.hpp
    src/common/config.hpp
    src/common/error.hpp
    src/auth/jwt_manager.hpp
    src/auth/auth_service.hpp
    src/auth/auth_middleware.hpp
    src/models/user.hpp
    src/models/content.hpp
    src/models/media.hpp
    src/database/db_connection.hpp
    src/database/user_repository.hpp
    src/database/content_repository.hpp
    src/database/media_repository.hpp
    src/services/content_service.hpp
    src/services/user_service.hpp
    src/services/media_service.hpp
    src/api/router.hpp
    src/api/auth_routes.hpp
    src/api/user_routes.hpp
    src/api/content_routes.hpp
    src/api/media_routes.hpp
    src/api/middleware.hpp
    src/cache/lru_cache.hpp
)

# Add source directories to include path
include_directories(src)

# Create the executable
add_executable(cms_app src/main.cpp)

# Link libraries
target_link_libraries(cms_app PRIVATE
    Pistache::Pistache
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    jwt-cpp::jwt-cpp
    pqxx::pqxx
    OpenSSL::SSL
    OpenSSL::Crypto
)

# --- Test Configuration ---
enable_testing()
find_package(GTest CONFIG REQUIRED)

# Define test source files
set(TEST_SRCS
    tests/unit/test_uuid.cpp
    tests/unit/test_lru_cache.cpp
    tests/unit/test_jwt_manager.cpp
    tests/integration/test_db_connection.cpp
    tests/integration/test_user_repository.cpp
    # tests/api/test_api_content.cpp # API tests might require a running server or mocking
)

add_executable(cms_tests ${TEST_SRCS})
target_link_libraries(cms_tests PRIVATE
    GTest::gtest_main
    Pistache::Pistache # Needed for some common types or HTTP client if used
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    jwt-cpp::jwt-cpp
    pqxx::pqxx
    OpenSSL::SSL
    OpenSSL::Crypto
)
# Link cms_tests against the main application's sources/headers for testing internal components
target_include_directories(cms_tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)

add_test(NAME CMSSystemUnitAndIntegrationTests COMMAND cms_tests)

# --- Optional: Install target ---
install(TARGETS cms_app DESTINATION bin)
install(DIRECTORY src/frontend/ DESTINATION share/cms_app/frontend)
```