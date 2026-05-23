```cmake
cmake_minimum_required(VERSION 3.15)

# Add headers
target_include_directories(cms_server PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/models
    ${CMAKE_CURRENT_SOURCE_DIR}/controllers
    ${CMAKE_CURRENT_SOURCE_DIR}/controllers/api/v1
    ${CMAKE_CURRENT_SOURCE_DIR}/controllers/web
    ${CMAKE_CURRENT_SOURCE_DIR}/services
    ${CMAKE_CURRENT_SOURCE_DIR}/filters
    ${CMAKE_CURRENT_SOURCE_DIR}/middleware
    ${CMAKE_CURRENT_SOURCE_DIR}/utils
)

# Source files
file(GLOB_RECURSE CMS_SOURCES
    "${CMAKE_CURRENT_SOURCE_DIR}/*.cc"
    "${CMAKE_CURRENT_SOURCE_DIR}/models/*.cc"
    "${CMAKE_CURRENT_SOURCE_DIR}/controllers/api/v1/*.cc"
    "${CMAKE_CURRENT_SOURCE_DIR}/controllers/web/*.cc"
    "${CMAKE_CURRENT_SOURCE_DIR}/services/*.cc"
    "${CMAKE_CURRENT_SOURCE_DIR}/filters/*.cc"
    "${CMAKE_CURRENT_SOURCE_DIR}/middleware/*.cc"
    "${CMAKE_CURRENT_SOURCE_DIR}/utils/*.cc"
)

# Define the executable
add_executable(cms_server ${CMS_SOURCES})

# Link libraries
target_link_libraries(cms_server PRIVATE
    drogon::drogon
    json-cpp::json-cpp
    jwt-cpp::jwt-cpp
    libpq::libpq
)

# Copy views to build directory
file(GLOB VIEWS_FILES "${CMAKE_SOURCE_DIR}/views/*.csp")
add_custom_command(TARGET cms_server POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different ${VIEWS_FILES} $<TARGET_FILE_DIR:cms_server>/views/
    COMMENT "Copying Drogon view templates"
)

# Copy config.json to build directory
add_custom_command(TARGET cms_server POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different ${CMAKE_SOURCE_DIR}/config.json $<TARGET_FILE_DIR:cms_server>/config.json
    COMMENT "Copying Drogon configuration file"
)

# Set runtime path for executables (important for shared libraries)
if(UNIX)
    set_target_properties(cms_server PROPERTIES BUILD_RPATH "$ORIGIN/lib")
    set_target_properties(cms_server PROPERTIES INSTALL_RPATH "$ORIGIN/lib")
endif()
```