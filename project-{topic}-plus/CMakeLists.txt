cmake_minimum_required(VERSION 3.10)
project(project_management_api VERSION 1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Configure build type
if (NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Debug CACHE STRING "Choose the type of build, options are: Debug Release RelWithDebInfo MinSizeRel." FORCE)
endif()

# Set common compiler options
if (CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    add_compile_options(-Wall -Wextra -Wpedantic -Werror -Wno-unused-parameter)
    if (CMAKE_BUILD_TYPE STREQUAL "Release")
        add_compile_options(-O3 -DNDEBUG)
    else()
        add_compile_options(-O0 -g)
    endif()
endif()

# --- External Libraries ---

# Crow (Header-only, include directory)
# Option 1: Assume Crow is installed system-wide or managed by vcpkg
# find_package(Crow CONFIG REQUIRED)
# Option 2: Provide path to Crow (e.g., if cloned into project root)
if (DEFINED ENV{CROW_ROOT})
    set(CROW_ROOT $ENV{CROW_ROOT})
elseif (EXISTS "${CMAKE_SOURCE_DIR}/crow")
    set(CROW_ROOT "${CMAKE_SOURCE_DIR}/crow")
endif()
if (CROW_ROOT)
    include_directories(${CROW_ROOT}/include)
else()
    message(FATAL_ERROR "Crow not found. Please set CROW_ROOT environment variable or clone Crow into project root.")
endif()

# nlohmann/json (Header-only, include directory)
if (DEFINED ENV{NLOHMANN_JSON_ROOT})
    set(NLOHMANN_JSON_ROOT $ENV{NLOHMANN_JSON_ROOT})
elseif (EXISTS "${CMAKE_SOURCE_DIR}/json")
    set(NLOHMANN_JSON_ROOT "${CMAKE_SOURCE_DIR}/json")
endif()
if (NLOHMANN_JSON_ROOT)
    include_directories(${NLOHMANN_JSON_ROOT}/include)
else()
    message(FATAL_ERROR "nlohmann/json not found. Please set NLOHMANN_JSON_ROOT environment variable or clone it into project root.")
endif()

# spdlog (Include directory and link library)
if (DEFINED ENV{SPDLOG_ROOT})
    set(SPDLOG_ROOT $ENV{SPDLOG_ROOT})
elseif (EXISTS "${CMAKE_SOURCE_DIR}/spdlog")
    set(SPDLOG_ROOT "${CMAKE_SOURCE_DIR}/spdlog")
endif()
if (SPDLOG_ROOT)
    include_directories(${SPDLOG_ROOT}/include)
    # spdlog can be header-only or compiled. If compiled, you'd link to it.
    # For simplicity, we'll assume it's header-only, or compiled into a static lib.
    # If compiled as a shared library, you'd add: find_library(SPDLOG_LIBRARY spdlog PATHS "${SPDLOG_ROOT}/build")
    # And then target_link_libraries(${PROJECT_NAME} ${SPDLOG_LIBRARY})
else()
    message(FATAL_ERROR "spdlog not found. Please set SPDLOG_ROOT environment variable or clone it into project root.")
endif()


# jwt-cpp (Include directory and link library)
if (DEFINED ENV{JWT_CPP_ROOT})
    set(JWT_CPP_ROOT $ENV{JWT_CPP_ROOT})
elseif (EXISTS "${CMAKE_SOURCE_DIR}/jwt-cpp")
    set(JWT_CPP_ROOT "${CMAKE_SOURCE_DIR}/jwt-cpp")
endif()
if (JWT_CPP_ROOT)
    include_directories(${JWT_CPP_ROOT}/include)
    add_subdirectory(${JWT_CPP_ROOT} EXCLUDE_FROM_ALL)
    # The jwt-cpp project's CMakeLists.txt typically defines a target like jwt-cpp
    # or jwt-cpp-shared. We link to it.
    set(JWT_CPP_LIB jwt-cpp) # Default target name for static build
    # If you build jwt-cpp as shared, it might be jwt-cpp-shared or jwt
    # You might need to adjust based on how jwt-cpp's CMake works.
    # For now, let's assume `jwt-cpp` target is available.
else()
    message(FATAL_ERROR "jwt-cpp not found. Please set JWT_CPP_ROOT environment variable or clone it into project root.")
endif()


# libpqxx (PostgreSQL C++ client)
find_package(PkgConfig QUIET)
if (PKG_CONFIG_FOUND)
    pkg_check_modules(LIBPQXX libpqxx)
endif()

if (LIBPQXX_FOUND)
    include_directories(${LIBPQXX_INCLUDE_DIRS})
    link_directories(${LIBPQXX_LIBRARY_DIRS})
    set(DB_LIBRARIES ${LIBPQXX_LIBRARIES})
else()
    # Fallback if pkg-config not available or libpqxx not found
    find_path(LIBPQXX_INCLUDE_DIR NAMES pqxx/pqxx NO_DEFAULT_PATH HINTS /usr/local/include /usr/include)
    find_library(LIBPQXX_LIBRARY NAMES pqxx HINTS /usr/local/lib /usr/lib)
    if (LIBPQXX_INCLUDE_DIR AND LIBPQXX_LIBRARY)
        include_directories(${LIBPQXX_INCLUDE_DIR}/..) # pqxx/pqxx needs ..
        set(DB_LIBRARIES ${LIBPQXX_LIBRARY})
    else()
        message(FATAL_ERROR "libpqxx not found. Please install it or specify its path.")
    endif()
endif()

# Additional libraries for jwt-cpp (OpenSSL, crypt)
find_package(OpenSSL REQUIRED)
if (NOT OpenSSL_FOUND)
    message(FATAL_ERROR "OpenSSL not found. Please install libssl-dev or equivalent.")
endif()

find_library(CRYPT_LIBRARY NAMES crypt)
if (NOT CRYPT_LIBRARY)
    message(WARNING "libcrypt not found. This might affect some hashing functions, but basic JWT functionality should work.")
endif()

# Source files
set(HEADERS
    src/config/config.h
    src/database/db_manager.h
    src/middleware/auth_middleware.h
    src/models/user.h
    src/models/project.h
    src/models/task.h
    src/models/team.h
    src/services/user_service.h
    src/services/project_service.h
    src/services/task_service.h
    src/services/team_service.h
    src/utils/jwt_manager.h
    src/utils/logger.h
)

set(SOURCES
    src/database/db_manager.cpp
    src/middleware/auth_middleware.cpp
    src/models/user.cpp
    src/models/project.cpp
    src/models/task.cpp
    src/models/team.cpp
    src/services/user_service.cpp
    src/services/project_service.cpp
    src/services/task_service.cpp
    src/services/team_service.cpp
    src/utils/jwt_manager.cpp
    src/utils/logger.cpp
    src/main.cpp
)

add_executable(${PROJECT_NAME} ${HEADERS} ${SOURCES})

target_link_libraries(${PROJECT_NAME}
    PRIVATE
        ${DB_LIBRARIES}
        ${JWT_CPP_LIB}
        ${OpenSSL_LIBRARIES}
        ${CRYPT_LIBRARY}
)

# Install targets
install(TARGETS ${PROJECT_NAME} DESTINATION bin)
install(DIRECTORY ${CMAKE_SOURCE_DIR}/src/config DESTINATION share/${PROJECT_NAME}) # For config files if any

# Optionally, add a target to build and run tests
option(BUILD_TESTS "Build tests for the project" OFF)
if (BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
```