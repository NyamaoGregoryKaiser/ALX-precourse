```cmake
add_executable(TaskAPI
    main.cpp
    config/Config.cpp
    controllers/TaskController.cpp
    controllers/UserController.cpp
    db/Database.cpp
    middleware/AuthMiddleware.cpp
    middleware/ErrorHandlingMiddleware.cpp
    middleware/RateLimitMiddleware.cpp
    services/TaskService.cpp
    services/UserService.cpp
    utils/JsonUtils.cpp
    utils/JwtManager.cpp
    utils/Logger.cpp
    utils/PasswordHasher.cpp
)

target_include_directories(TaskAPI PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Link all necessary libraries
target_link_libraries(TaskAPI PRIVATE
    Pistache::Pistache
    jsoncpp::jsoncpp
    PQXX::pqxx
    spdlog::spdlog
    jwt-cpp::jwt-cpp
    # Assuming argon2_cpp is linked like this or via find_package
    # For a simple demo, we might implement a basic hash, but Argon2 is production-grade.
    # To truly link argon2, you might need:
    # `argon2` or `argon2_shared` depending on how it's installed/built.
    # For this example, let's assume `libargon2.a` is available and linked implicitly
    # or that the PasswordHasher uses a placeholder `std::hash` if `argon2_cpp` setup
    # becomes overly complex for a single file response.
    # We will try to include a basic argon2_cpp usage.
    argon2
)

# Copy static assets (e.g., public/index.html)
file(COPY ${CMAKE_SOURCE_DIR}/public DESTINATION ${CMAKE_BINARY_DIR})
```