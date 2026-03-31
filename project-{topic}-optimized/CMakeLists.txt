cmake_minimum_required(VERSION 3.10)
project(MobileBackend CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON) # For LSP tools

# Find Drogon
find_package(Drogon REQUIRED)

# Find JWT-CPP
find_package(jwt-cpp REQUIRED)

# Find Catch2 for testing
find_package(Catch2 CONFIG REQUIRED)

# Find Hiredis (for Redis integration)
find_package(PkgConfig REQUIRED)
pkg_check_modules(HIREDIS REQUIRED hiredis)

# Find spdlog for advanced logging
find_package(spdlog CONFIG REQUIRED)

# Include directories
include_directories(src src/controllers src/middleware src/models src/repositories src/services src/utils)

# Source files
set(CORE_SOURCES
    src/main.cc
    src/utils/AppConfig.cc
    src/utils/CryptoUtils.cc
    src/utils/JwtManager.cc
    src/utils/RedisManager.cc
    src/middleware/AuthMiddleware.cc
    src/middleware/ErrorHandler.cc
    src/repositories/UserRepository.cc
    src/repositories/ProductRepository.cc
    src/repositories/OrderRepository.cc
    src/services/AuthService.cc
    src/services/UserService.cc
    src/services/ProductService.cc
    src/services/OrderService.cc
    src/controllers/AuthController.cc
    src/controllers/UserController.cc
    src/controllers/ProductController.cc
    src/controllers/OrderController.cc
)

# Add Drogon web app
add_drogon_webapp(MobileBackend ${CORE_SOURCES})

# Link libraries
target_link_libraries(MobileBackend PRIVATE
    Drogon::Drogon
    jwt-cpp::jwt-cpp
    ${HIREDIS_LIBRARIES}
    spdlog::spdlog
)

# Configuration and deployment settings
set(SERVER_PORT "8080")
set(CONFIG_FILE "${CMAKE_CURRENT_SOURCE_DIR}/config/app_config.json")

# Copy config file to build directory
add_custom_command(TARGET MobileBackend POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy
            ${CONFIG_FILE}
            $<TARGET_FILE_DIR:MobileBackend>/app_config.json
    COMMENT "Copying app_config.json to build directory"
)

# Build tests
add_subdirectory(tests)

# Set common compilation flags (for security and quality)
# These flags enhance code quality, detect potential issues, and improve security.
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -Wpedantic -Werror -Wshadow -Wformat=2 -Wconversion")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fPIC -fstack-protector-strong -D_FORTIFY_SOURCE=2")
    set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -O2 -DNDEBUG")
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -O0 -g -fsanitize=address,undefined -fno-omit-frame-pointer")
endif()

# For a production build, consider profile-guided optimization (PGO) and link-time optimization (LTO)
# For example:
# set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -flto -fprofile-generate")
# set(CMAKE_EXE_LINKER_FLAGS_RELEASE "${CMAKE_EXE_LINKER_FLAGS_RELEASE} -flto -fprofile-generate")
# (Requires a two-pass build: run with profile-generate, then rebuild with profile-use)
# Or just LTO: set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -flto")
# set(CMAKE_EXE_LINKER_FLAGS_RELEASE "${CMAKE_EXE_LINKER_FLAGS_RELEASE} -flto")

message(STATUS "MobileBackend project configured.")
message(STATUS "Server port: ${SERVER_PORT}")
message(STATUS "Config file: ${CONFIG_FILE}")