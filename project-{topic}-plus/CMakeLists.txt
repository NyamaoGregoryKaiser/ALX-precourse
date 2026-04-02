```cmake
cmake_minimum_required(VERSION 3.10)
project(TaskManagementSystem CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Configure build type
if (NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Debug CACHE STRING "Choose build type: Debug Release" FORCE)
endif()

# Fetch Crow HTTP framework
include(FetchContent)
FetchContent_Declare(
    Crow
    GIT_REPOSITORY https://github.com/ipkn/crow.git
    GIT_TAG        v1.0+6 # Using a specific stable tag
)
FetchContent_MakeAvailable(Crow)

# Fetch nlohmann/json
FetchContent_Declare(
    nlohmann_json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG        v3.11.2 # Using a specific stable tag
)
FetchContent_MakeAvailable(nlohmann_json)

# Fetch spdlog
FetchContent_Declare(
    spdlog
    GIT_REPOSITORY https://github.com/gabime/spdlog.git
    GIT_TAG        v1.12.0 # Using a specific stable tag
)
FetchContent_MakeAvailable(spdlog)

# Fetch Google Test for testing
FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        release-1.12.1 # Specific stable tag
)
FetchContent_MakeAvailable(googletest)

# Source files
file(GLOB_RECURSE APP_SOURCES "src/*.cpp")
file(GLOB_RECURSE APP_HEADERS "src/*.h")

add_executable(TaskManagementSystem ${APP_SOURCES})

target_include_directories(TaskManagementSystem PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${Crow_SOURCE_DIR}/include
    ${nlohmann_json_SOURCE_DIR}/include
    ${spdlog_SOURCE_DIR}/include
)

# Link necessary libraries
# Crow has no explicit static library, it's mostly header-only + uses Boost.Asio/System which Crow adds.
# For SQLite3, we need to link it. On Linux, it's typically `-lsqlite3`.
# For Windows/macOS, it might need to be built or obtained differently.
# Here, we assume sqlite3 is available via the system or linked directly.
find_package(SQLite3 REQUIRED)
target_link_libraries(TaskManagementSystem PRIVATE
    nlohmann_json::json
    spdlog::spdlog
    Threads::Threads
    SQLite3::SQLite3 # Link SQLite3 library
)

# For Crow, since it's largely header-only and pulls in Boost.Asio,
# we need to ensure Boost is handled correctly. FetchContent for Crow should manage this.
# If issues arise, an explicit `find_package(Boost REQUIRED components system thread date_time filesystem chrono atomic)` might be needed.
# However, `Crow`'s CMake generally handles its Boost dependencies.

# Add the tests subdirectory
add_subdirectory(tests)

# Copy .env.example to .env if it doesn't exist
add_custom_command(
    TARGET TaskManagementSystem POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different ${CMAKE_CURRENT_SOURCE_DIR}/.env.example ${CMAKE_CURRENT_SOURCE_DIR}/.env
    COMMENT "Copying .env.example to .env if not exists"
)
```