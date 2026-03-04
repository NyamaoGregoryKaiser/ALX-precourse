# Add Catch2 library (assuming it's in third_party/Catch2)
add_library(Catch2 INTERFACE)
target_include_directories(Catch2 INTERFACE ${CMAKE_CURRENT_SOURCE_DIR}/../third_party/Catch2/src)

# Add Test Executable
add_executable(DataVizToolTests
    unit/TestDataProcessor.cpp
    unit/TestCsvParser.cpp
    integration/TestDBManager.cpp
    api/TestControllers.cpp
)

target_link_libraries(DataVizToolTests
    dataviztool # Link against your main application library/executable
    Catch2::Catch2 # Link against Catch2
    ${Boost_LIBRARIES}
    ${LIBPQXX_LIBRARIES}
    pthread
)

# Enable Catch2's automatic test discovery
target_compile_definitions(DataVizToolTests PRIVATE CATCH_CONFIG_MAIN)

# Add tests to CTest
add_test(NAME DataVizToolTests COMMAND DataVizToolTests)