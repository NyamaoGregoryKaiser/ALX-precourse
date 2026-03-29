```cpp
#ifndef DATAVIZ_ERRORMIDDLEWARE_H
#define DATAVIZ_ERRORMIDDLEWARE_H

#include <crow.h>
#include "../../utils/Logger.h"
#include "../utils/JsonUtils.h"
#include <stdexcept>

// Custom exception types for better error handling
struct BadRequestException : public std::runtime_error {
    explicit BadRequestException(const std::string& msg) : std::runtime_error(msg) {}
};

struct NotFoundException : public std::runtime_error {
    explicit NotFoundException(const std::string& msg) : std::runtime_error(msg) {}
};

struct UnauthorizedException : public std::runtime_error {
    explicit UnauthorizedException(const std::string& msg) : std::runtime_error(msg) {}
};

struct ForbiddenException : public std::runtime_error {
    explicit ForbiddenException(const std::string& msg) : std::runtime_error(msg) {}
};

class ErrorMiddleware {
public:
    struct context {}; // No specific context needed

    void before_handle(crow::request& req, crow::response& res, context& ctx);
    void after_handle(crow::request& req, crow::response& res, context& ctx);
};

#endif // DATAVIZ_ERRORMIDDLEWARE_H
```