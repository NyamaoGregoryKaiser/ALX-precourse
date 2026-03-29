```cmake
cmake_minimum_required(VERSION 3.10)
project(ALXProjectManagementAPI LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# --- External Dependencies ---

# Crow
# You might need to clone Crow into your project or install it globally.
# For simplicity, we assume Crow is available via FetchContent or installed.
# Using FetchContent for nlohmann/json and jwt-cpp for easier setup.

# nlohmann/json
include(FetchContent)
FetchContent_Declare(
  json_external
  GIT_REPOSITORY https://github.com/nlohmann/json.git
  GIT_TAG v3.11.2
)
FetchContent_MakeAvailable(json_external)

# jwt-cpp
FetchContent_Declare(
  jwt_cpp_external
  GIT_REPOSITORY https://github.com/Thalhammer/jwt-cpp.git
  GIT_TAG v0.6.0
)
FetchContent_MakeAvailable(jwt_cpp_external)

# SQLite3 (system library, ensure it's installed or link statically)
find_package(SQLite3 REQUIRED)

# Google Test (for testing)
FetchContent_Declare(
  googletest
  GIT_REPOSITORY https://github.com/google/googletest.git
  GIT_TAG release-1.12.1
)
FetchContent_MakeAvailable(googletest)

# --- Source Files ---
# Configuration
set(CONFIG_SRCS
    src/config/AppConfig.cpp
)
set(CONFIG_HDRS
    src/config/AppConfig.hpp
)

# Models
set(MODELS_SRCS)
set(MODELS_HDRS
    src/models/User.hpp
    src/models/Project.hpp
    src/models/Task.hpp
    src/models/DTOs.hpp
)

# Database
set(DATABASE_SRCS
    src/database/SQLiteDatabaseManager.cpp
)
set(DATABASE_HDRS
    src/database/DatabaseManager.hpp
    src/database/SQLiteDatabaseManager.hpp
)

# Services
set(SERVICES_SRCS
    src/services/AuthService.cpp
    src/services/UserService.cpp
    src/services/ProjectService.cpp
    src/services/TaskService.cpp
)
set(SERVICES_HDRS
    src/services/AuthService.hpp
    src/services/UserService.hpp
    src/services/ProjectService.hpp
    src/services/TaskService.hpp
)

# Utilities
set(UTILS_SRCS
    src/utils/Logger.cpp
    src/utils/JWTManager.cpp
    src/utils/CachingManager.cpp
    src/utils/RateLimiter.cpp
    src/utils/ErrorHandler.cpp
    src/utils/JSONConverter.cpp
)
set(UTILS_HDRS
    src/utils/Logger.hpp
    src/utils/JWTManager.hpp
    src/utils/CachingManager.hpp
    src/utils/RateLimiter.hpp
    src/utils/ErrorHandler.hpp
    src/utils/JSONConverter.hpp
)

# Middleware
set(MIDDLEWARE_SRCS
    src/middleware/AuthMiddleware.cpp
    src/middleware/RateLimitMiddleware.cpp
)
set(MIDDLEWARE_HDRS
    src/middleware/AuthMiddleware.hpp
    src/middleware/RateLimitMiddleware.hpp
)

# Controllers
set(CONTROLLERS_SRCS
    src/controllers/AuthController.cpp
    src/controllers/UserController.cpp
    src/controllers/ProjectController.cpp
    src/controllers/TaskController.cpp
    src/controllers/APIController.cpp
)
set(CONTROLLERS_HDRS
    src/controllers/AuthController.hpp
    src/controllers/UserController.hpp
    src/controllers/ProjectController.hpp
    src/controllers/TaskController.hpp
    src/controllers/APIController.hpp
)

# Exceptions
set(EXCEPTIONS_SRCS)
set(EXCEPTIONS_HDRS
    src/exceptions/CustomExceptions.hpp
)

# Main application
set(APP_SRCS
    src/main.cpp
    ${CONFIG_SRCS}
    ${MODELS_SRCS}
    ${DATABASE_SRCS}
    ${SERVICES_SRCS}
    ${UTILS_SRCS}
    ${MIDDLEWARE_SRCS}
    ${CONTROLLERS_SRCS}
    ${EXCEPTIONS_SRCS}
)
set(APP_HDRS
    ${CONFIG_HDRS}
    ${MODELS_HDRS}
    ${DATABASE_HDRS}
    ${SERVICES_HDRS}
    ${UTILS_HDRS}
    ${MIDDLEWARE_HDRS}
    ${CONTROLLERS_HDRS}
    ${EXCEPTIONS_HDRS}
)

# --- Include Directories ---
include_directories(
    src/
    src/config/
    src/models/
    src/database/
    src/services/
    src/utils/
    src/middleware/
    src/controllers/
    src/exceptions/
)

# --- Add Executable ---
add_executable(${PROJECT_NAME} ${APP_SRCS} ${APP_HDRS})

# Link libraries
target_link_libraries(${PROJECT_NAME} PRIVATE
    Crow
    json_external
    jwt_cpp_external
    SQLite3::SQLite3
)

# --- Build for testing ---
enable_testing()

set(TEST_SRCS
    tests/unit/TestAuthService.cpp
    tests/unit/TestJWTManager.cpp
    tests/unit/TestSQLiteDatabaseManager.cpp
    tests/unit/TestCachingManager.cpp
    tests/integration/TestUserProjectIntegration.cpp
)

add_executable(run_tests ${TEST_SRCS} ${APP_SRCS} ${APP_HDRS}) # Compile test runner with app code

target_link_libraries(run_tests PRIVATE
    gtest_main
    gtest
    Crow
    json_external
    jwt_cpp_external
    SQLite3::SQLite3
)

# Configure the test executable to be run by CTest
# This allows running specific tests, but for a general "make test"
# it's usually sufficient to just have the executable.
# Add tests will register individual test cases if structured that way.
# For simplicity, we'll just have one test executable 'run_tests'.
# For more granular tests, each test file would be its own add_test block.

# --- Database Init/Migration Tool ---
add_executable(init_db scripts/init_db.cpp ${DATABASE_SRCS} ${DATABASE_HDRS} ${UTILS_SRCS} ${UTILS_HDRS})
target_link_libraries(init_db PRIVATE
    SQLite3::SQLite3
    json_external
)

# --- Crow specific build options ---
# Crow uses some C++20 features, for C++17 compatibility,
# ensure you're using a recent GCC/Clang and it might require some flags.
# For example, Crow might require -DCROW_HAVE_CPP17_OPTIONAL,
# or for older compilers, some features need to be disabled.
# This CMakeLists assumes a modern compiler where Crow can build with C++17 default.

# Example: if Crow uses Boost and you want to use it
# find_package(Boost 1.70 COMPONENTS system thread filesystem REQUIRED)
# target_link_libraries(${PROJECT_NAME} PRIVATE Boost::system Boost::thread Boost::filesystem)

# For Docker, ensure Crow is cloned into /usr/local/include/crow or similar.
# In this setup, we assume Crow is installed or path is set for the build environment.
# For a robust Docker setup, we'd add Crow as a git submodule or install it via package manager.
# For the Dockerfile, I will assume Crow is installed via `vcpkg` or built manually from source.
```