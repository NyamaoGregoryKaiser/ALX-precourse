```cmake
cmake_minimum_required(VERSION 3.10)
project(WebScraper)

set(CMAKE_CXX_STANDARD 17)

find_package(Boost REQUIRED COMPONENTS system filesystem)
find_package(SQLite3 REQUIRED)

add_executable(webscraper main.cpp scraper.cpp database.cpp api.cpp)
target_link_libraries(webscraper ${Boost_LIBRARIES} ${SQLite3_LIBRARIES})
```