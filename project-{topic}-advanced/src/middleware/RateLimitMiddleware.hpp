```cpp
#ifndef RATE_LIMIT_MIDDLEWARE_HPP
#define RATE_LIMIT_MIDDLEWARE_HPP

#include "crow.h"
#include "../utils/RateLimiter.hpp"
#include "../utils/Logger.hpp"
#include "../exceptions/CustomExceptions.hpp" // For TooManyRequestsException
#include "../utils/ErrorHandler.hpp"

// No context needed for rate limiting in this simple example, just global shared state.
// Crow middleware doesn't strictly require a context.
class RateLimitMiddleware {
public:
    RateLimitMiddleware(std::shared_ptr<RateLimiter> rate_limiter);

    // The 'before_handle' method is called before the endpoint handler
    void before_handle(crow::request& req, crow::response& res, void* /*ctx*/);

    // The 'after_handle' method is called after the endpoint handler (optional)
    void after_handle(crow::request& req, crow::response& res, void* /*ctx*/);

private:
    std::shared_ptr<RateLimiter> rate_limiter_;
};

#endif // RATE_LIMIT_MIDDLEWARE_HPP
```