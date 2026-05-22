```cpp
#pragma once

#include "pistache/http.h"
#include "pistache/endpoint.h"
#include "pistache/router.h"

class UserController {
public:
    static void registerUser(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    static void loginUser(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
};
```