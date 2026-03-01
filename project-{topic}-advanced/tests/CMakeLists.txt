# Define the test executable
add_executable(run_tests
    unit/TestPasswordHasher.cpp
    unit/TestJWTHelper.cpp
    unit/TestCacheService.cpp
    integration/TestAuthAPI.cpp
    integration/TestUserAPI.cpp
)

# Link against Drogon's library, Google Test, and other dependencies
target_link_libraries(run_tests
    drogon
    drogon_ctl
    jsoncpp
    jwt-cpp::jwt-cpp
    gtest_main
    gmock_main
    # Link against your application's compiled objects/libraries for unit tests
    # If services/models are built into a static library, link that.
    # Otherwise, include relevant source files directly or link to main executable objects.
    # For this example, we'll compile and link relevant app sources directly.
    # A cleaner approach would be to create a shared/static lib for app logic.
    $<TARGET_OBJECTS:auth_system_objects> # Link to objects from main application
)

# Add test discovery
include(GoogleTest)
gtest_discover_tests(run_tests)
```
*(Note: `auth_system_objects` requires modifying the main `CMakeLists.txt` to export objects. A simpler approach is to compile the service/model files directly into the test executable for unit testing, and then use HTTP requests for integration tests.)*

**Correction for CMakeLists.txt (main app)**: To link `$<TARGET_OBJECTS:auth_system_objects>`, `src` files should be added as objects, not directly into the main executable, and then `auth_system` target depends on `auth_system_objects`.

```cmake
# (Partial) Main CMakeLists.txt modification for linking objects
# src/CMakeLists.txt (or directly in root CMakeLists.txt)
add_library(auth_system_objects OBJECT
    src/main.cpp
    src/controllers/AuthController.cpp
    src/controllers/UserController.cpp
    src/controllers/WebController.cpp
    src/models/User.cpp
    src/models/Role.cpp
    src/models/Session.cpp
    src/services/AuthService.cpp
    src/services/UserService.cpp
    src/services/JWTHelper.cpp
    src/services/PasswordHasher.cpp
    src/services/CacheService.cpp
    src/services/RateLimiter.cpp
    src/middleware/AuthMiddleware.cpp
    src/middleware/ErrorHandler.cpp
    src/middleware/LoggingMiddleware.cpp
    src/middleware/RateLimiterFilter.cpp
    src/utils/JsonUtil.cpp
    src/utils/StringUtil.cpp
)
add_executable(auth_system $<TARGET_OBJECTS:auth_system_objects>)
target_link_libraries(auth_system PRIVATE drogon jsoncpp jwt-cpp::jwt-cpp)
```

#### Unit Tests (Examples)

##### `tests/unit/TestPasswordHasher.cpp`

```cpp