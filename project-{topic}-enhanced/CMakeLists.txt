```cmake
cmake_minimum_required(VERSION 3.10)
project(TaskManagementSystem CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)
set(CMAKE_POSITION_INDEPENDENT_CODE ON) # Required for shared libraries on some systems

# Add Crow framework (Assuming it's available or downloaded, typically it's header-only)
# For simplicity, we'll assume Crow is in a 'lib/crow' directory or globally installed.
# If using vcpkg or similar, this would be:
# find_package(crow CONFIG REQUIRED)
# target_link_libraries(${PROJECT_NAME} PRIVATE crow::crow)
# For manual install, you might just need to include the headers:
# If you download crow and put it in `lib/crow`
# include_directories(lib/crow)

# For this example, we'll assume Crow headers are available via system path or manually linked.
# A common way to get Crow is to clone its repo and include its headers.
# For simplicity in this comprehensive example, we'll assume standard installation or direct inclusion.
# If you place Crow's header files directly into a 'include' directory:
# include_directories(include)

# Find SQLite3
find_package(SQLite3 REQUIRED)

# Find spdlog
# For spdlog, if installed via system package manager (e.g., apt, brew)
find_package(spdlog CONFIG REQUIRED)
# If using vcpkg:
# find_package(spdlog CONFIG REQUIRED)

# Source files
set(APP_SRCS
    src/main.cpp
    src/auth/AuthService.cpp
    src/auth/JwtManager.cpp
    src/config/Config.cpp
    src/controllers/AuthController.cpp
    src/controllers/TaskController.cpp
    src/controllers/UserController.cpp
    src/database/Database.cpp
    src/logger/Logger.cpp
    src/middleware/AuthMiddleware.cpp
    src/middleware/ErrorHandlerMiddleware.cpp
    src/middleware/RateLimitMiddleware.cpp
    src/models/Task.cpp
    src/models/User.cpp
    src/services/CacheService.cpp
    src/services/TaskService.cpp
    src/services/UserService.cpp
    src/utils/CryptoUtils.cpp
)

# Include directories
include_directories(
    src/
    src/auth
    src/config
    src/controllers
    src/database
    src/logger
    src/middleware
    src/models
    src/services
    src/utils
)

# Add executable
add_executable(${PROJECT_NAME} ${APP_SRCS})

# Link libraries
target_link_libraries(${PROJECT_NAME} PRIVATE
    SQLite3::SQLite3
    spdlog::spdlog
    # Crow might not need explicit linking if header-only and path is included
    # If Crow is compiled as a library, uncomment and link it.
    # For many Crow setups, simply having the headers in an included path is enough.
)

# Set common compiler flags for security and warnings
if (CMAKE_CXX_COMPILER_ID MATCHES "(GNU|Clang)")
    target_compile_options(${PROJECT_NAME} PRIVATE
        -Wall
        -Wextra
        -Wpedantic
        -Werror # Treat warnings as errors
        -Wshadow # Warn about shadowed variables
        -Wformat=2 # More format string checks
        -fstack-protector-strong # Enable stack smashing protection
        -fPIC # Position-independent code
        # -D_FORTIFY_SOURCE=2 # Runtime checks for buffer overflows
        # -O2 # Optimization level
        -D_GLIBCXX_DEBUG # Enable libstdc++ debug mode for extra checks (dev only)
    )
elseif (CMAKE_CXX_COMPILER_ID MATCHES "MSVC")
    target_compile_options(${PROJECT_NAME} PRIVATE
        /W4 # Enable level 4 warnings
        /WX # Treat warnings as errors
        /GS # Buffer security check
        /sdl # Enable SDL (Security Development Lifecycle) checks
        /INCREMENTAL:NO # Disable incremental linking for more robust linking
        /OPT:REF # Remove unreferenced functions/data
        /OPT:ICF # Fold identical COMDATs
        /Zi # Debug information (PDB)
        /O2 # Optimization level
    )
endif()

# --- Testing Setup ---
enable_testing()
add_subdirectory(tests/unit)

# Example to add a custom target for running API tests (shell script)
add_custom_target(run_api_tests COMMAND ${CMAKE_COMMAND} -E chdir ${CMAKE_SOURCE_DIR}/tests/api ./api_tests.sh
                  COMMENT "Running API integration tests")
```