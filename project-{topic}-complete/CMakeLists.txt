```cmake
cmake_minimum_required(VERSION 3.10)
project(payment_processor CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON) # Required for shared libraries and some deployments

# Find SQLite3 (assuming it's installed or provided by a dependency manager)
find_package(SQLite3 REQUIRED)
# If SQLite3 is not found system-wide, you might need to add:
# set(SQLITE3_INCLUDE_DIR /path/to/sqlite/include)
# set(SQLITE3_LIBRARY /path/to/sqlite/lib/libsqlite3.so)

# Fetch Crow C++ framework
# Using FetchContent for easy dependency management
include(FetchContent)
FetchContent_Declare(
  crow_repo
  GIT_REPOSITORY https://github.com/ipkn/crow.git
  GIT_TAG        v1.0+5
)
FetchContent_MakeAvailable(crow_repo)

# Fetch nlohmann/json
FetchContent_Declare(
  json_repo
  GIT_REPOSITORY https://github.com/nlohmann/json.git
  GIT_TAG        v3.11.2 # Or a recent stable version
)
FetchContent_MakeAvailable(json_repo)

# Fetch spdlog
FetchContent_Declare(
  spdlog_repo
  GIT_REPOSITORY https://github.com/gabime/spdlog.git
  GIT_TAG        v1.11.0 # Or a recent stable version
)
FetchContent_MakeAvailable(spdlog_repo)

# Fetch sqlite3pp wrapper
# This is a header-only library, so we just need to include its directory.
# For simplicity, let's assume it's directly in the project or fetched similarly.
# If manually placed, update path:
# add_subdirectory(deps/sqlite3pp)
FetchContent_Declare(
  sqlite3pp_repo
  GIT_REPOSITORY https://github.iwxxm.org/iwxxm/sqlite3pp.git
  GIT_TAG        v1.1.0 # Or a recent stable version
)
FetchContent_MakeAvailable(sqlite3pp_repo)

# Add application source files
set(SOURCE_FILES
    src/main.cpp
    src/database/DatabaseManager.cpp
    src/services/AuthService.cpp
    src/services/AccountService.cpp
    src/services/TransactionService.cpp
    src/controllers/AuthController.cpp
    src/controllers/AccountController.cpp
    src/controllers/TransactionController.cpp
)

add_executable(payment_processor ${SOURCE_FILES}
    # Add header files for IDEs/syntax highlighting, not strictly needed for compilation
    src/exceptions/CustomExceptions.h
    src/utils/Hasher.h
    src/utils/JwtManager.h
    src/utils/Logger.h
    src/models/User.h
    src/models/Account.h
    src/models/Transaction.h
    src/models/DTOs.h
    src/database/DatabaseManager.h
    src/services/AuthService.h
    src/services/AccountService.h
    src/services/TransactionService.h
    src/controllers/AuthController.h
    src/controllers/AccountController.h
    src/controllers/TransactionController.h
    src/middleware/AuthMiddleware.h
    src/middleware/ErrorHandlerMiddleware.h
    src/config/AppConfig.h
)

# Set include directories
target_include_directories(payment_processor PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${Crow_SOURCE_DIR}/include # For Crow
    ${nlohmann_json_SOURCE_DIR}/include # For nlohmann/json
    ${SPDLOG_SOURCE_DIR}/include # For spdlog
    ${sqlite3pp_repo_SOURCE_DIR}/include # For sqlite3pp
)

# Link libraries
target_link_libraries(payment_processor PRIVATE
    Crow
    nlohmann_json
    spdlog
    sqlite3pp
    ${SQLITE3_LIBRARIES} # Link against system SQLite3
    Threads::Threads # For multithreaded Crow
)

# If using Google Test (for testing section)
# FetchContent_Declare(
#   googletest
#   GIT_REPOSITORY https://github.com/google/googletest.git
#   GIT_TAG        release-1.12.1
# )
# FetchContent_MakeAvailable(googletest)
# add_subdirectory(tests/unit) # Assuming tests/unit has its own CMakeLists.txt

# Install target (optional)
install(TARGETS payment_processor DESTINATION bin)
install(FILES config/app.config.json DESTINATION config)
```