```cmake
cmake_minimum_required(VERSION 3.15 FATAL_ERROR)
project(TaskManagementSystem LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17) # Or 20 for newer features
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Find Drogon
find_package(Drogon REQUIRED)

# Set common include directories
include_directories(src)
include_directories(src/models)
include_directories(src/services)
include_directories(src/controllers)
include_directories(src/filters)
include_directories(src/utils)

# Define source files for the main application
set(APP_SRCS
    src/main.cpp
    src/models/User.cc
    src/models/Task.cc
    src/models/Category.cc
    src/services/AuthService.cpp
    src/services/TaskService.cpp
    src/controllers/AuthController.cpp
    src/controllers/TaskController.cpp
    src/controllers/CategoryController.cpp
    src/filters/AuthFilter.cpp
    src/filters/RateLimitFilter.cpp
)

# Add Drogon ORM models to the build
# This command generates ORM code based on database tables.
# It should be run *after* schema is applied.
# For simplicity, we define models manually in .h files first.
# Drogon's `drogon_add_orm_target` would generate .h and .cc files
# but requires a running database connection at build time,
# which is more complex for this example. We'll handle models manually.

# Add the executable
add_executable(TaskManagementSystem ${APP_SRCS})
target_link_libraries(TaskManagementSystem PRIVATE Drogon::Drogon)

# Configuration files and static assets
file(COPY config.json DESTINATION ${CMAKE_BINARY_DIR})
file(COPY web/index.html DESTINATION ${CMAKE_BINARY_DIR}/web)
file(COPY web/main.js DESTINATION ${CMAKE_BINARY_DIR}/web)

# Add Google Test for tests
enable_testing()
find_package(GTest REQUIRED)
include_directories(${GTEST_INCLUDE_DIRS})

# Add tests subdirectory
add_subdirectory(tests)

# Define a target for running tests
add_custom_target(run_tests COMMAND ${CMAKE_COMMAND} --build . --target TaskManagementSystem_tests)

# Add a target to clean generated ORM files if any (conceptual)
add_custom_target(clean_orm COMMAND ${CMAKE_COMMAND} -E rm -rf build/models_generated)

# Add a target for Doxygen documentation
find_package(Doxygen)
if (DOXYGEN_FOUND)
    configure_file(${CMAKE_CURRENT_SOURCE_DIR}/Doxyfile ${CMAKE_CURRENT_BINARY_DIR}/Doxyfile @ONLY)
    add_custom_target(doc ALL
        COMMAND ${DOXYGEN_EXECUTABLE} ${CMAKE_CURRENT_BINARY_DIR}/Doxyfile
        WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
        COMMENT "Generating API documentation with Doxygen"
    )
endif()
```