```cpp
#ifndef WEBSCRAPER_AUTH_CONTROLLER_H
#define WEBSCRAPER_AUTH_CONTROLLER_H

#include <pistache/router.h>
#include <pistache/http.h>
#include <nlohmann/json.hpp>
#include "../services/user_service.h"
#include "../common/error_handler.h"
#include "../common/logger.h"

class AuthController {
public:
    AuthController(UserService& userService);

    void setupRoutes(Pistache::Rest::Router& router);

private:
    UserService& userService;

    void registerUser(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    void loginUser(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
};

#endif // WEBSCRAPER_AUTH_CONTROLLER_H
```