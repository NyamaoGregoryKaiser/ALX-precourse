cmake_minimum_required(VERSION 3.10)
project(RealtimeChat)

add_executable(realtime_chat main.cpp chat_server.cpp database.cpp)

# Add libraries and dependencies here as needed (e.g., networking libraries)