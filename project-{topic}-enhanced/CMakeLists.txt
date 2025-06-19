```cmake
cmake_minimum_required(VERSION 3.10)
project(chat_server)

# Find and link necessary libraries (websocketpp and your database library)
find_package(Threads REQUIRED)
find_package(PkgConfig REQUIRED)
pkg_check_modules(WEBSOCKETPP REQUIRED websocketpp)

add_executable(chat_server server.cpp)
target_link_libraries(chat_server ${WEBSOCKETPP_LIBRARIES} ${CMAKE_THREAD_LIBS_INIT})
```