#pragma once

#include <pistache/http.h>
#include <pistache/router.h>
#include <json/json.h>

#include "src/auth/auth_service.h"
#include "src/utils/logger.h"
#include "src/utils/json_util.h"
#include "src/utils/exceptions.h"

class AuthController {
public:
    explicit AuthController(AuthService& auth_service);

    // Endpoint handlers
    Pistache::Rest::RouteCallback register_user();
    Pistache::Rest::RouteCallback login_user();

private:
    AuthService& auth_service_;
};
```