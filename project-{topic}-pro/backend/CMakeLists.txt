cmake_minimum_required(VERSION 3.10)
project(CMS_Backend CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find Pistache
find_package(Pistache REQUIRED)

# Find PostgreSQL C++ client (libpqxx)
find_package(PkgConfig)
pkg_check_modules(LIBPQXX REQUIRED libpqxx)
if(LIBPQXX_FOUND)
    include_directories(${LIBPQXX_INCLUDE_DIRS})
    link_directories(${LIBPQXX_LIBRARY_DIRS})
    set(LIBPQXX_LIBRARIES ${LIBPQXX_LIBRARIES})
else()
    message(FATAL_ERROR "libpqxx not found. Please install it.")
endif()

# Find JWT library (e.g., jwt-cpp)
# We'll include it directly for simplicity or expect system-wide installation.
# For a real project, consider Hunter, Conan, or vcpkg.
# For this example, let's assume `jwt-cpp` is available or provide source.
# A simplified approach using pre-installed or a header-only JWT library.
# If using a specific library like jwt-cpp, you might need:
# add_subdirectory(path/to/jwt-cpp)
# Or manually specify includes/libs if installed system-wide:
# find_package(jwt-cpp CONFIG REQUIRED) # If jwt-cpp provides a CMake config
# Or for a simplified header-only approach (e.g., nlohmann/json for JWT payload)
# For JWT-cpp, if installed via system or vcpkg:
find_package(jwt-cpp CONFIG REQUIRED) # Assuming jwt-cpp is installed and discoverable via find_package

# Find Spdlog
find_package(spdlog CONFIG REQUIRED)

# Source files
set(CORE_SOURCES
    src/main.cpp
    src/config/config.cpp
    src/core/server.cpp
    src/core/middleware.cpp
    src/repositories/user_repository.cpp
    src/repositories/content_repository.cpp
    src/services/user_service.cpp
    src/services/content_service.cpp
    src/controllers/auth_controller.cpp
    src/controllers/user_controller.cpp
    src/controllers/content_controller.cpp
    src/utils/jwt_manager.cpp
)

set(CORE_HEADERS
    src/config/config.h
    src/core/server.h
    src/core/middleware.h
    src/models/user.h
    src/models/content.h
    src/models/category.h
    src/models/comment.h
    src/repositories/base_repository.h
    src/repositories/user_repository.h
    src/repositories/content_repository.h
    src/services/user_service.h
    src/services/content_service.h
    src/controllers/base_controller.h
    src/controllers/auth_controller.h
    src/controllers/user_controller.h
    src/controllers/content_controller.h
    src/utils/jwt_manager.h
)

add_executable(cms_backend ${CORE_SOURCES} ${CORE_HEADERS})

target_link_libraries(cms_backend
    Pistache::Pistache
    ${LIBPQXX_LIBRARIES}
    jwt-cpp::jwt-cpp # Link to jwt-cpp
    spdlog::spdlog # Link to spdlog
)

# Add Google Test for testing (will be in tests/CMakeLists.txt)
add_subdirectory(tests)