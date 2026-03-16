```cmake
cmake_minimum_required(VERSION 3.10)
project(MobileBackend CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON) # Required for shared libraries and often for executables

# --- Dependencies ---

# Find SQLite3 (system-wide or bundled)
find_package(SQLite3 REQUIRED)

# Crow (header-only, included as submodule or manually copied)
# For simplicity in this example, we assume Crow is available directly or through a path.
# In a real project, you might add it as a Git submodule and use add_subdirectory.
# For this example, let's simulate by assuming include path is set or Crow is globally available.
# If Crow is in a specific directory, e.g., 'deps/crow', you would do:
# add_subdirectory(deps/crow)
# Or, if you download it:
# set(CROW_INCLUDE_DIR "${CMAKE_SOURCE_DIR}/deps/Crow")
# include_directories(${CROW_INCLUDE_DIR})
# For this example, we assume it's findable via -I or installed.
# We'll explicitly add an include path assuming it's alongside.
# Or, often, you just include it via `target_include_directories` and ensure the path is correct.

# Add an include directory for Crow if it's not system-wide.
# For demonstration, let's assume it's in a 'libs' folder or similar
# Set to an empty string if Crow is globally installed/accessible via system path
# Or specify like set(CROW_PATH "${CMAKE_SOURCE_DIR}/path/to/crow/headers")
# For simplicity, we'll often just rely on default include paths or add a generic one
# such as "${CMAKE_SOURCE_DIR}/libs" if Crow is manually placed there.
# Let's assume it's in `libs/crow_all.h`
set(CROW_HEADERS_PATH "${CMAKE_SOURCE_DIR}/libs")

# spdlog
find_package(spdlog CONFIG REQUIRED)

# nlohmann/json (often included via Crow, but good to be explicit if used standalone)
# For Crow, it's typically bundled. If using outside Crow, you'd find/include it.
# We'll assume Crow's internal version is sufficient or it's header-only and found.

# jwt-cpp (header-only)
# Assuming jwt-cpp is in a 'libs' folder
set(JWT_CPP_PATH "${CMAKE_SOURCE_DIR}/libs/jwt-cpp")
if(EXISTS "${JWT_CPP_PATH}")
    include_directories(${JWT_CPP_PATH})
else()
    message(WARNING "jwt-cpp not found at ${JWT_CPP_PATH}. Please ensure it's available or adjust path.")
endif()


# Google Test
enable_testing()
find_package(GTest REQUIRED)
include_directories(${GTest_INCLUDE_DIRS})

# --- Source Files ---
set(SOURCE_DIR ${CMAKE_SOURCE_DIR}/src)

set(APP_SOURCES
    ${SOURCE_DIR}/main.cpp
    ${SOURCE_DIR}/utils/database.cpp
    ${SOURCE_DIR}/utils/jwt_manager.cpp
    ${SOURCE_DIR}/utils/logger.cpp
    ${SOURCE_DIR}/services/auth_service.cpp
    ${SOURCE_DIR}/services/user_service.cpp
    ${SOURCE_DIR}/services/task_service.cpp
)

set(APP_HEADERS
    ${SOURCE_DIR}/controllers/auth_controller.h
    ${SOURCE_DIR}/controllers/task_controller.h
    ${SOURCE_DIR}/controllers/user_controller.h
    ${SOURCE_DIR}/models/task.h
    ${SOURCE_DIR}/models/user.h
    ${SOURCE_DIR}/services/auth_service.h
    ${SOURCE_DIR}/services/task_service.h
    ${SOURCE_DIR}/services/user_service.h
    ${SOURCE_DIR}/utils/auth_middleware.h
    ${SOURCE_DIR}/utils/cache.h
    ${SOURCE_DIR}/utils/database.h
    ${SOURCE_DIR}/utils/error_middleware.h
    ${SOURCE_DIR}/utils/jwt_manager.h
    ${SOURCE_DIR}/utils/logger.h
    ${SOURCE_DIR}/utils/rate_limiter.h
)

# --- Executable ---
add_executable(mobile_backend ${APP_SOURCES} ${APP_HEADERS})

target_link_libraries(mobile_backend
    PRIVATE
        SQLite3::SQLite3
        spdlog::spdlog
        # No explicit link for Crow or jwt-cpp as they are header-only,
        # but ensure their include paths are set.
)

target_include_directories(mobile_backend
    PRIVATE
        ${CMAKE_SOURCE_DIR}/src # For accessing headers within src/
        ${CROW_HEADERS_PATH}    # For Crow headers (e.g., if you place crow_all.h there)
        ${JWT_CPP_PATH}         # For jwt-cpp headers
)

# --- Tests ---
set(TEST_SOURCES
    ${CMAKE_SOURCE_DIR}/tests/test_auth_service.cpp
    ${CMAKE_SOURCE_DIR}/tests/test_cache.cpp
    ${CMAKE_SOURCE_DIR}/tests/test_database.cpp
    ${CMAKE_SOURCE_DIR}/tests/test_jwt_manager.cpp
    ${CMAKE_SOURCE_DIR}/tests/test_rate_limiter.cpp
    ${CMAKE_SOURCE_DIR}/tests/test_task_service.cpp
    ${CMAKE_SOURCE_DIR}/tests/test_user_service.cpp
)

add_executable(mobile_backend_tests ${TEST_SOURCES} ${APP_HEADERS} ${APP_SOURCES}) # Include app sources for integration-like tests

target_link_libraries(mobile_backend_tests
    PRIVATE
        gtest_main
        gtest
        SQLite3::SQLite3
        spdlog::spdlog
        # Same as above for Crow and jwt-cpp, relying on includes
)

target_include_directories(mobile_backend_tests
    PRIVATE
        ${CMAKE_SOURCE_DIR}/src # For accessing headers within src/
        ${CROW_HEADERS_PATH}    # For Crow headers
        ${JWT_CPP_PATH}         # For jwt-cpp headers
)

add_test(NAME run_tests COMMAND mobile_backend_tests)

# --- Install (Optional) ---
install(TARGETS mobile_backend DESTINATION bin)
install(FILES ${APP_HEADERS} DESTINATION include/mobile_backend)

# --- How to get dependencies (Manual Steps for this example) ---
# For Crow: Download crow_all.h and place it in `libs/crow_all.h`
# For jwt-cpp: git clone https://github.com/Thalhammer/jwt-cpp.git libs/jwt-cpp
# For spdlog: `sudo apt install libspdlog-dev` on Debian/Ubuntu, or vcpkg/conan
# For sqlite3: `sudo apt install libsqlite3-dev` on Debian/Ubuntu
# For GTest: `sudo apt install libgtest-dev` then `cd /usr/src/gtest && sudo cmake . && sudo make && sudo mv libgtest* /usr/lib/` (or use vcpkg/conan)
```