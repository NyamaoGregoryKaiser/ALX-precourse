# Find required libraries
# We'll use FindPackage where possible, or define paths/include directories
# For a real project, use vcpkg/Conan for dependency management.
# Assuming libraries are installed or their paths are provided.

# Crow Framework
# If Crow is cloned as a submodule:
# add_subdirectory(${CMAKE_SOURCE_DIR}/lib/Crow)
# If Crow is installed system-wide:
find_package(Crow REQUIRED)
# If Crow is included via header-only or specific path
# include_directories(${CMAKE_SOURCE_DIR}/lib/Crow/include) # Adjust path as needed

# soci (with PostgreSQL backend)
find_package(soci REQUIRED)
find_package(PostgreSQL REQUIRED)
# Ensure soci_postgresql is linked
list(APPEND LIBRARIES ${SOCI_LIBRARIES} ${PostgreSQL_LIBRARIES})

# jwt-cpp
find_package(jwt-cpp REQUIRED)
list(APPEND LIBRARIES jwt-cpp::jwt-cpp)

# spdlog
find_package(spdlog REQUIRED)
list(APPEND LIBRARIES spdlog::spdlog)

# cURLpp
find_package(CURLPP REQUIRED) # Or find_package(CURL) and link libcurl.
list(APPEND LIBRARIES CURLPP::CURLPP)

# gumbo-parser
find_package(Gumbo REQUIRED)
list(APPEND LIBRARIES Gumbo::gumbo)

# hiredis
find_package(hiredis REQUIRED)
list(APPEND LIBRARIES hiredis)

# nlohmann/json (header-only, often just included)
# find_package(nlohmann_json REQUIRED)
# list(APPEND LIBRARIES nlohmann_json::json) # If installed via vcpkg/Conan

# Define source files
file(GLOB_RECURSE SRC_FILES
    "*.cpp"
    "cache/*.cpp"
    "config/*.cpp"
    "controllers/*.cpp"
    "database/*.cpp"
    "middleware/*.cpp"
    "models/*.cpp"
    "scraper/*.cpp"
    "services/*.cpp"
    "utils/*.cpp"
)

add_executable(webscraper ${SRC_FILES} ${CMAKE_SOURCE_DIR}/src/main.cpp)

# Link libraries
target_link_libraries(webscraper PRIVATE
    ${LIBRARIES}
    Crow::Crow # Link Crow, assuming it's an imported target
    # Other libraries if not added to ${LIBRARIES} directly
)

# Set include directories
target_include_directories(webscraper PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${CURLPP_INCLUDE_DIRS}
    ${Gumbo_INCLUDE_DIRS}
    ${HIREDIS_INCLUDE_DIRS}
)

# For a production build, add specific optimizations
if (CMAKE_BUILD_TYPE MATCHES "Release")
    target_compile_options(webscraper PRIVATE -O3 -DNDEBUG)
endif()