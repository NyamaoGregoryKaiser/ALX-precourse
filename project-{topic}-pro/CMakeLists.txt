```cmake
cmake_minimum_required(VERSION 3.10)
project(PaymentProcessor CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON) # Required for shared libraries and some deployments

# --------------------------------------------------------------------------------
# Find and include external dependencies
# --------------------------------------------------------------------------------

# Pistache
find_package(Pistache REQUIRED)

# nlohmann/json (often header-only, just need to include path or fetch)
# For simplicity, assume it's available via a system-wide include or vcpkg/conan
# If using FetchContent:
# include(FetchContent)
# FetchContent_Declare(
#   json_lib
#   GIT_REPOSITORY https://github.com/nlohmann/json.git
#   GIT_TAG v3.11.2 # Use a specific version
# )
# FetchContent_MakeAvailable(json_lib)
# target_include_directories(PaymentProcessor PUBLIC ${json_lib_SOURCE_DIR}/include)
# If installed via system package manager (e.g., apt, brew):
find_package(nlohmann_json CONFIG REQUIRED)

# spdlog
find_package(spdlog CONFIG REQUIRED)

# libpqxx (PostgreSQL C++ client)
find_package(PkgConfig REQUIRED)
pkg_check_modules(LIBPQXX REQUIRED libpqxx)
if (LIBPQXX_FOUND)
    include_directories(${LIBPQXX_INCLUDE_DIRS})
    link_directories(${LIBPQXX_LIBRARY_DIRS})
    set(LIBS_EXTERNAL ${LIBS_EXTERNAL} ${LIBPQXX_LDFLAGS})
else()
    message(FATAL_ERROR "libpqxx not found!")
endif()

# OpenSSL (for CryptoUtils - hashing, JWT signatures)
find_package(OpenSSL REQUIRED)
include_directories(${OPENSSL_INCLUDE_DIR})
set(LIBS_EXTERNAL ${LIBS_EXTERNAL} ${OPENSSL_LIBRARIES})

# Google Test/Mock for testing
find_package(GTest CONFIG REQUIRED) # Assumes GTest is installed/available

# --------------------------------------------------------------------------------
# Source files
# --------------------------------------------------------------------------------

# Collect all .cpp files recursively
file(GLOB_RECURSE SOURCES "src/*.cpp")

# Exclude test files from the main executable
list(FILTER SOURCES EXCLUDE REGEX "src/tests/.*")

# --------------------------------------------------------------------------------
# Main Executable
# --------------------------------------------------------------------------------

add_executable(PaymentProcessor ${SOURCES})

target_link_libraries(PaymentProcessor
    PRIVATE
        Pistache::Pistache
        nlohmann_json::nlohmann_json # if using find_package(nlohmann_json CONFIG)
        spdlog::spdlog
        ${LIBPQXX_LIBRARIES}
        ${OPENSSL_LIBRARIES}
    PUBLIC
        ${CMAKE_THREAD_LIBS_INIT} # For multi-threading support
)

target_include_directories(PaymentProcessor PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# Set compile definitions for spdlog (if not automatically handled by find_package)
target_compile_definitions(PaymentProcessor PUBLIC SPDLOG_ACTIVE_LEVEL=SPDLOG_LEVEL_DEBUG)

# --------------------------------------------------------------------------------
# Testing Target
# --------------------------------------------------------------------------------

# Collect all test .cpp files
file(GLOB_RECURSE TEST_SOURCES "tests/**/*.cpp")

add_executable(PaymentProcessorTests ${TEST_SOURCES})

target_link_libraries(PaymentProcessorTests
    PRIVATE
        gtest_main
        gmock_main
        Pistache::Pistache
        nlohmann_json::nlohmann_json
        spdlog::spdlog
        ${LIBPQXX_LIBRARIES}
        ${OPENSSL_LIBRARIES}
    PUBLIC
        ${CMAKE_THREAD_LIBS_INIT}
        PaymentProcessor # Link against main project to test its components
)

target_include_directories(PaymentProcessorTests PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/tests
)

# Add a custom target to run tests
add_test(NAME RunPaymentProcessorTests COMMAND PaymentProcessorTests)

# --------------------------------------------------------------------------------
# Install Rules (optional but good practice)
# --------------------------------------------------------------------------------

install(TARGETS PaymentProcessor DESTINATION bin)
install(DIRECTORY config DESTINATION share/payment-processor)
```