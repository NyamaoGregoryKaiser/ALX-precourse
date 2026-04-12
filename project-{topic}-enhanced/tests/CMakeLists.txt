find_package(GTest REQUIRED)
find_package(soci REQUIRED)
find_package(PostgreSQL REQUIRED)
find_package(jwt-cpp REQUIRED)
find_package(spdlog REQUIRED)
find_package(CURLPP REQUIRED)
find_package(Gumbo REQUIRED)
find_package(hiredis REQUIRED)

add_executable(webscraper_tests
    main.cpp
    unit/test_models.cpp
    unit/test_scraper.cpp
    integration/test_database.cpp
)

target_link_libraries(webscraper_tests PRIVATE
    GTest::gtest_main
    ${SOCI_LIBRARIES} ${PostgreSQL_LIBRARIES} # Link soci and postgres
    jwt-cpp::jwt-cpp
    spdlog::spdlog
    CURLPP::CURLPP
    Gumbo::gumbo
    hiredis
    # Link all application source files, or specific libraries
    # This is often done by creating a 'static library' for the main app
    # and linking against it in tests, or directly linking the object files.
    # For simplicity, we'll include necessary source folders.
)

target_include_directories(webscraper_tests PRIVATE
    ${CMAKE_SOURCE_DIR}/src # Include main app's headers
    ${CMAKE_SOURCE_DIR}/src/config
    ${CMAKE_SOURCE_DIR}/src/database
    ${CMAKE_SOURCE_DIR}/src/models
    ${CMAKE_SOURCE_DIR}/src/services
    ${CMAKE_SOURCE_DIR}/src/scraper
    ${CMAKE_SOURCE_DIR}/src/utils
    ${CMAKE_SOURCE_DIR}/src/cache
    ${CURLPP_INCLUDE_DIRS}
    ${Gumbo_INCLUDE_DIRS}
    ${HIREDIS_INCLUDE_DIRS}
)

# For coverage, compile with GCOV flags
if (CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(webscraper_tests PRIVATE --coverage)
    target_link_libraries(webscraper_tests PRIVATE gcov)
endif()