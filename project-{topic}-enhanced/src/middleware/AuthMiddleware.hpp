```cpp
#ifndef AUTH_MIDDLEWARE_HPP
#define AUTH_MIDDLEWARE_HPP

#include "crow.h"
#include <string>

// AuthMiddleware class. Inherits from crow::IMiddleware.
class AuthMiddleware : public crow::IMiddleware {
public:
    // Context structure to pass data from middleware to route handlers.
    // This is how you share authenticated user info.
    struct Context {
        int user_id = 0;
        std::string user_role = "";
    };

    AuthMiddleware();

    // This method is called before the route handler.
    // It performs token validation and sets user info in context.
    void before_handle(crow::request& req, crow::response& res, Context& ctx);

    // This method is called after the route handler.
    void after_handle(crow::request& req, crow::response& res, Context& ctx);
};

#endif // AUTH_MIDDLEWARE_HPP
```