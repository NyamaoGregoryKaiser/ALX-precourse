```cmake
cmake_minimum_required(VERSION 3.10)
project(PerformanceMonitoringSystem CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Enable sanitizers for debugging/quality (optional)
# set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fsanitize=address,undefined -fno-omit-frame-pointer")
# set(CMAKE_LINK_FLAGS "${CMAKE_LINK_FLAGS} -fsanitize=address,undefined")

# Define build type if not set (e.g., Release for optimal performance)
if (NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Dependencies
# Crow (header-only, clone or add as submodule)
# Find Crow library (assuming it's in a 'lib' directory or accessible via path)
# If Crow is cloned into a `libs/crow` directory:
add_subdirectory(libs/crow) # Use the subdirectory to include Crow directly
# If you prefer to download it as header-only and put it in includes:
# find_path(CROW_INCLUDE_DIR crow.h PATHS libs/crow/include NO_DEFAULT_PATH)
# if (NOT CROW_INCLUDE_DIR)
#     message(FATAL_ERROR "Crow not found. Please place it in libs/crow or specify its path.")
# endif()

# nlohmann/json (header-only)
# Assuming nlohmann/json is in libs/nlohmann_json/include
find_path(NLOHMANN_JSON_INCLUDE_DIR nlohmann/json.hpp PATHS libs/nlohmann_json/include NO_DEFAULT_PATH)
if (NOT NLOHMANN_JSON_INCLUDE_DIR)
    message(FATAL_ERROR "nlohmann/json not found. Please place it in libs/nlohmann_json/include or specify its path.")
endif()

# spdlog
find_package(spdlog CONFIG REQUIRED) # Assumes spdlog is installed or found by CMake

# pqxx
find_package(pqxx CONFIG REQUIRED) # Assumes libpqxx is installed or found by CMake

# jwt-cpp
# If jwt-cpp is installed via system package manager:
find_package(jwt-cpp CONFIG REQUIRED)
# If jwt-cpp is cloned as a submodule into libs/jwt-cpp:
# add_subdirectory(libs/jwt-cpp)
# Or manually include headers and link to libcrypto/libssl:
# find_path(JWT_CPP_INCLUDE_DIR jwt-cpp/jwt.h PATHS libs/jwt-cpp/include NO_DEFAULT_PATH)
# if (NOT JWT_CPP_INCLUDE_DIR)
#     message(FATAL_ERROR "jwt-cpp not found.")
# endif()
# find_library(OPENSSL_SSL_LIBRARY NAMES ssl)
# find_library(OPENSSL_CRYPTO_LIBRARY NAMES crypto)
# if (NOT OPENSSL_SSL_LIBRARY OR NOT OPENSSL_CRYPTO_LIBRARY)
#     message(FATAL_ERROR "OpenSSL libraries not found.")
# endif()

# cpp-bcrypt (or another bcrypt library)
# Assuming cpp-bcrypt is cloned into libs/cpp-bcrypt
add_subdirectory(libs/cpp-bcrypt)

# --- Define Source Files ---
file(GLOB_RECURSE APP_SOURCES "src/*.cpp")
file(GLOB_RECURSE APP_HEADERS "src/*.h")

# Create the executable
add_executable(performance_monitor ${APP_SOURCES} ${APP_HEADERS})

# Link libraries
target_link_libraries(performance_monitor
    PRIVATE
    Crow
    spdlog::spdlog
    pqxx::pqxx
    jwt-cpp::jwt-cpp # Or manual linkage: ${OPENSSL_SSL_LIBRARY} ${OPENSSL_CRYPTO_LIBRARY}
    bcrypt
)

# Include directories
target_include_directories(performance_monitor
    PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${NLOHMANN_JSON_INCLUDE_DIR}
    ${CROW_INCLUDE_DIR} # If not using add_subdirectory for Crow
)

# --- Testing ---
enable_testing()
add_subdirectory(tests)

# Install rules (optional, for system-wide installation)
install(TARGETS performance_monitor DESTINATION bin)
install(FILES ${APP_HEADERS} DESTINATION include/performance_monitor)

```

**Dependencies (Crow, nlohmann/json, spdlog, pqxx, jwt-cpp, cpp-bcrypt)**:
The `CMakeLists.txt` assumes these are either installed system-wide (like `spdlog`, `pqxx`, `jwt-cpp`) or placed in a `libs/` directory relative to the project root. For `Crow` and `nlohmann/json`, they are header-only and included directly. `cpp-bcrypt` is added as a subdirectory.

**To set up `libs`**:
```bash
mkdir libs
cd libs
git clone https://github.com/nlohmann/json.git nlohmann_json # For nlohmann/json
git clone https://github.com/CrowCpp/Crow.git crow # For Crow
git clone https://github.com/mariuself/jwt-cpp.git jwt-cpp # For jwt-cpp if not using system installed
git clone https://github.com/mariuself/cpp-bcrypt.git cpp-bcrypt # For cpp-bcrypt
```
**Note**: `jwt-cpp` requires OpenSSL dev libraries. Make sure `libssl-dev` and `libcrypto-dev` (or equivalent) are installed. `cpp-bcrypt` might require additional build tools or setup depending on your system, but it's often simpler.