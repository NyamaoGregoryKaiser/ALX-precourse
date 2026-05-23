cmake_minimum_required(VERSION 3.10)
project(ecommerce_cpp VERSION 1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON) # Required for shared libraries and good practice

# Enable all warnings and treat them as errors in debug builds
if (CMAKE_BUILD_TYPE MATCHES "Debug")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -Wpedantic -Werror")
else()
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -Wpedantic -O3 -DNDEBUG")
endif()

# --- External Dependencies ---
# You'd typically use FetchContent or find_package for these.
# For simplicity, we assume they are available or you set them up.

# Find CrowCpp
# Example if using FetchContent:
# FetchContent_Declare(
#   crow_cpp
#   GIT_REPOSITORY https://github.com/crowcpp/crow.git
#   GIT_TAG        v1.0+5
# )
# FetchContent_MakeAvailable(crow_cpp)
# find_package(crow CONFIG REQUIRED) # If installed system-wide

# For demonstration, we just assume libraries are found/linked
# In a real project, you'd properly manage these.
# For CrowCpp, it's often header-only or built as a library.
# We'll include its headers.

# Find nlohmann/json (header-only)
# Add include directory for nlohmann/json if not system-wide
# target_include_directories(ecommerce_cpp_app PUBLIC /path/to/nlohmann_json_headers)

# Find libpqxx
find_package(PkgConfig REQUIRED)
pkg_check_modules(LIBPQXX REQUIRED libpqxx)

# Find spdlog
# Assume spdlog is either header-only or linked
# target_include_directories(ecommerce_cpp_app PUBLIC /path/to/spdlog_headers)
pkg_check_modules(SPDLOG REQUIRED spdlog)

# Find libcrypt (for bcrypt)
find_package(LibCrypt REQUIRED)

# --- Source Files ---
# Collect all source files
file(GLOB_RECURSE APP_SOURCES "src/*.cpp")
file(GLOB_RECURSE APP_HEADERS "src/*.h")

# Create the executable
add_executable(ecommerce_cpp_app ${APP_SOURCES} ${APP_HEADERS})

# Link libraries
target_link_libraries(ecommerce_cpp_app
    PUBLIC
    ${LIBPQXX_LIBRARIES}
    ${SPDLOG_LIBRARIES}
    ${LibCrypt_LIBRARIES}
)

# Set include directories for our own headers and external ones if not handled by find_package
target_include_directories(ecommerce_cpp_app PUBLIC
    "${CMAKE_SOURCE_DIR}/src"
    ${LIBPQXX_INCLUDE_DIRS}
    ${SPDLOG_INCLUDE_DIRS}
    # Add paths for crow and nlohmann/json if not installed system-wide
    # For example, if placed in a `vendor` directory:
    # "${CMAKE_SOURCE_DIR}/vendor/crow"
    # "${CMAKE_SOURCE_DIR}/vendor/nlohmann/json/include"
)

# --- Testing ---
enable_testing()
add_subdirectory(tests)

# --- Install rules (optional but good for production builds) ---
install(TARGETS ecommerce_cpp_app DESTINATION bin)
install(DIRECTORY docs DESTINATION share/doc/${PROJECT_NAME})
install(FILES database/schema.sql database/seed.sql DESTINATION share/${PROJECT_NAME}/database)

message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "Project compiled successfully.")