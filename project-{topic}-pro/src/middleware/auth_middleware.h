```cpp
#ifndef WEBSCRAPER_AUTH_MIDDLEWARE_H
#define WEBSCRAPER_AUTH_MIDDLEWARE_H

#include <pistache/http.h>
#include <pistache/router.h>
#include "../common/jwt_manager.h"
#include "../common/error_handler.h"
#include "../common/logger.h"

namespace Middleware {
    class AuthMiddleware {
    public:
        // This is a static method that can be used as a filter in Pistache::Rest::Router
        static void authenticate(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);

        // Helper to extract user ID from a validated request
        static std::string getUserId(const Pistache::Rest::Request& request);
    };
} // namespace Middleware

#endif // WEBSCRAPER_AUTH_MIDDLEWARE_H
```