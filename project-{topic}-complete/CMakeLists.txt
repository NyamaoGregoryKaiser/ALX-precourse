```cmake
cmake_minimum_required(VERSION 3.16)
project(task_management_api CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find vcpkg and install dependencies automatically
find_package(VCPKG REQUIRED)
vcpkg_install_dependencies(
    task_management_api # Your project name
    ${CMAKE_SOURCE_DIR}/vcpkg.json
)

# Link against vcpkg installed libraries
find_package(crow CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(sqlite3 CONFIG REQUIRED)
find_package(jwt-cpp CONFIG REQUIRED)
find_package(spdlog CONFIG REQUIRED)
find_package(cryptopp CONFIG REQUIRED) # For AES-256 in CryptoUtils, though bcrypt would be better for passwords
find_package(GTest CONFIG REQUIRED) # For Google Test

# Source files for the main application
file(GLOB_RECURSE APP_SOURCES "src/*.cpp" "src/*.h")

add_executable(task_management_api ${APP_SOURCES})

target_include_directories(task_management_api PUBLIC
    "${CMAKE_SOURCE_DIR}/src"
)

target_link_libraries(task_management_api
    PRIVATE
    crow
    nlohmann_json::nlohmann_json
    sqlite3
    jwt-cpp
    spdlog::spdlog
    cryptopp
)

# --- Testing Setup ---
file(GLOB_RECURSE TEST_SOURCES "tests/*.cpp" "tests/*.h")

add_executable(task_management_api_tests ${TEST_SOURCES})

target_include_directories(task_management_api_tests PUBLIC
    "${CMAKE_SOURCE_DIR}/src" # To include app headers in tests
    "${GTest_INCLUDE_DIRS}"
)

target_link_libraries(task_management_api_tests
    PRIVATE
    crow # Some tests might indirectly link against crow or its dependencies
    nlohmann_json::nlohmann_json
    sqlite3
    jwt-cpp
    spdlog::spdlog
    cryptopp
    GTest::gtest_main # For main() function and utilities
    GTest::gtest
)

# Optional: Add build type specific flags
if (CMAKE_BUILD_TYPE MATCHES "Debug")
    add_compile_definitions(DEBUG)
    target_compile_options(task_management_api PRIVATE -g)
    target_compile_options(task_management_api_tests PRIVATE -g)
elseif (CMAKE_BUILD_TYPE MATCHES "Release")
    add_compile_definitions(NDEBUG)
    target_compile_options(task_management_api PRIVATE -O3)
    target_compile_options(task_management_api_tests PRIVATE -O3)
endif()

# Install target (optional, for system-wide installation)
install(TARGETS task_management_api DESTINATION bin)
```