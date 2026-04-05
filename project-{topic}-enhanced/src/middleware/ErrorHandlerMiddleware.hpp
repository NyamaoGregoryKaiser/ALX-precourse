```cpp
#ifndef ERROR_HANDLER_MIDDLEWARE_HPP
#define ERROR_HANDLER_MIDDLEWARE_HPP

#include "crow.h"
#include <stdexcept>
#include <string>

// ErrorHandlerMiddleware class. Inherits from crow::IMiddleware.
// This middleware catches exceptions and formats error responses consistently.
class ErrorHandlerMiddleware : public crow::IMiddleware {
public:
    // Context structure. Not strictly necessary for error handling,
    // but useful if middleware needs to share any state.
    // Crow's Context also has an `exception_ptr` that can be used.
    struct Context {
        // No specific context data needed for this middleware
    };

    ErrorHandlerMiddleware();

    // This method is called before the route handler.
    void before_handle(crow::request& req, crow::response& res, Context& ctx);

    // This method is called after the route handler.
    // It's the primary place for error handling in Crow middleware.
    void after_handle(crow::request& req, crow::response& res, Context& ctx);
};

#endif // ERROR_HANDLER_MIDDLEWARE_HPP
```