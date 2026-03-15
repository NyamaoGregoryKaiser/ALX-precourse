# app/CMakeLists.txt
# CMakeLists.txt for the C++ DevOps System Application

cmake_minimum_required(VERSION 3.10)
project(cpp_devops_system_app VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Add Conan support
# Use conan_cmake_run for integrating with existing build systems
include(${CMAKE_BINARY_DIR}/conan_toolchain.cmake)
conan_auto_install(DIRECTORY ${CMAKE_SOURCE_DIR} BUILD_ALL MISSING_CONAN_PACKAGES)

# Add Conan package information (if not using conan_auto_install)
# find_package(Crow REQUIRED)
# find_package(SQLiteCpp REQUIRED)
# find_package(spdlog REQUIRED)
# find_package(jwt-cpp REQUIRED)
# find_package(OpenSSL REQUIRED) # jwt-cpp requires OpenSSL

# Define application source files
set(APP_SOURCES
    src/main.cpp
    src/models/User.cpp
    src/models/Product.cpp
    src/models/Order.cpp
    src/services/UserService.cpp
    src/services/ProductService.cpp
    src/services/AuthService.cpp
    src/controllers/UserController.cpp
    src/controllers/ProductController.cpp
    src/controllers/AuthController.cpp
    src/utils/Database.cpp
    src/utils/JWT.cpp
    src/utils/Logger.h # Headers are usually not explicitly listed but compiled if included
    src/utils/ErrorHandler.h
    src/utils/Caching.h
    src/utils/RateLimiter.h
    src/utils/Middleware.h
    src/app_config.h
)

# Add executable for the main application
add_executable(${PROJECT_NAME} ${APP_SOURCES})

# Link libraries for the main application
target_link_libraries(${PROJECT_NAME}
    CONAN_PKG::Crow
    CONAN_PKG::SQLiteCpp
    CONAN_PKG::spdlog
    CONAN_PKG::jwt-cpp
    CONAN_PKG::OpenSSL # Explicitly link OpenSSL if jwt-cpp needs it
)

# Set include directories
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/src/models
    ${CMAKE_SOURCE_DIR}/src/services
    ${CMAKE_SOURCE_DIR}/src/controllers
    ${CMAKE_SOURCE_DIR}/src/utils
)

# Add compiler options
target_compile_options(${PROJECT_NAME} PRIVATE
    -Wall
    -Wextra
    -Wpedantic
    -Wshadow
    -Werror # Treat warnings as errors for production-readiness
    $<$<CONFIG:Release>:-O3 -DNDEBUG> # Optimization for Release builds
    $<$<CONFIG:Debug>:-O0 -g -DDEBUG> # Debugging for Debug builds
)

# --- Testing Setup ---
enable_testing() # Enable CTest

# Find Google Test (if not already found by Conan or global system)
find_package(GTest REQUIRED)

# Define test source files
set(TEST_SOURCES
    tests/unit/UserService_test.cpp
    tests/unit/JWT_test.cpp
    tests/integration/ProductController_integration_test.cpp
)

# Add executable for tests
add_executable(${PROJECT_NAME}_tests ${TEST_SOURCES})

# Link libraries for tests
target_link_libraries(${PROJECT_NAME}_tests PRIVATE
    ${PROJECT_NAME} # Link against the main application for integration tests
    GTest::gtest_main # For main function provided by GTest
    GTest::gtest
    CONAN_PKG::Crow
    CONAN_PKG::SQLiteCpp
    CONAN_PKG::spdlog
    CONAN_PKG::jwt-cpp
    CONAN_PKG::OpenSSL
)

# Set include directories for tests
target_include_directories(${PROJECT_NAME}_tests PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/src/models
    ${CMAKE_SOURCE_DIR}/src/services
    ${CMAKE_SOURCE_DIR}/src/controllers
    ${CMAKE_SOURCE_DIR}/src/utils
    ${CMAKE_SOURCE_DIR}/tests/unit
    ${CMAKE_SOURCE_DIR}/tests/integration
)

# Add compiler options for tests (can be less strict than main app)
target_compile_options(${PROJECT_NAME}_tests PRIVATE
    -Wall
    -Wextra
    -Wpedantic
    $<$<CONFIG:Debug>:-O0 -g -DDEBUG>
)

# Add tests to CTest
add_test(NAME ${PROJECT_NAME}_unit_integration_tests COMMAND ${PROJECT_NAME}_tests)

# Custom target to run tests
add_custom_target(run_tests COMMAND ${PROJECT_NAME}_tests WORKING_DIRECTORY $<TARGET_FILE_DIR:${PROJECT_NAME}_tests>)