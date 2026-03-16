```cpp
#ifndef MOBILE_BACKEND_ERROR_MIDDLEWARE_H
#define MOBILE_BACKEND_ERROR_MIDDLEWARE_H

#include <crow/crow.h>
#include "logger.h"
#include <string>
#include <exception>

namespace mobile_backend {
namespace utils {

// Custom exception types for structured error handling
struct AppException : public std::runtime_error {
    int status_code;
    std::string details;

    AppException(int status, const std::string& message, const std::string& detail = "")
        : std::runtime_error(message), status_code(status), details(detail) {}
};

struct NotFoundException : public AppException {
    NotFoundException(const std::string& message = "Resource not found", const std::string& detail = "")
        : AppException(404, message, detail) {}
};

struct BadRequestException : public AppException {
    BadRequestException(const std::string& message = "Bad request", const std::string& detail = "")
        : AppException(400, message, detail) {}
};

struct UnauthorizedException : public AppException {
    UnauthorizedException(const std::string& message = "Unauthorized", const std::string& detail = "")
        : AppException(401, message, detail) {}
};

struct ForbiddenException : public AppException {
    ForbiddenException(const std::string& message = "Forbidden", const std::string& detail = "")
        : AppException(403, message, detail) {}
};

struct InternalServerException : public AppException {
    InternalServerException(const std::string& message = "Internal server error", const std::string& detail = "")
        : AppException(500, message, detail) {}
};


// Crow Middleware for centralized error handling
struct ErrorMiddleware {
    struct context {}; // No specific context needed for this middleware

    void before_handle(crow::request& req, crow::response& res, context& ctx) {
        // No operations before handling for this middleware.
        // The magic happens after the handler has potentially thrown an exception.
    }

    void after_handle(crow::request& req, crow::response& res, context& ctx) {
        // If the response is already sent (e.g., by AuthMiddleware), do nothing.
        if (res.is_done()) {
            return;
        }

        // This `after_handle` is called even if an exception was caught by Crow's default
        // error handling mechanism. For our custom exceptions, we typically catch them
        // inside the route handler or a higher-level try-catch block to generate
        // the response before it even reaches this `after_handle` (as Crow's
        // middleware system doesn't directly catch exceptions from route handlers
        // and pass them to `after_handle`).

        // To truly handle exceptions in a middleware fashion, Crow often expects
        // you to call `end()` on the response in `before_handle` if an error occurs.
        // For *uncaught* exceptions from the route handler itself, Crow has a default
        // error page. To override that, you often register custom error handlers with `app.error_handler`.

        // However, we can use this `after_handle` to catch generic non-2xx responses
        // that might have been set by the main handler or other middlewares
        // (e.g., `res.code = 404;`).
        if (res.code >= 400 && res.body.empty()) {
            crow::json::wvalue error_json;
            error_json["error"] = "An unknown error occurred.";
            error_json["status"] = res.code;
            if (res.code == 404) {
                error_json["error"] = "Not Found";
            } else if (res.code == 400) {
                error_json["error"] = "Bad Request";
            } else if (res.code == 401) {
                 error_json["error"] = "Unauthorized"; // Should be caught by AuthMiddleware
            } else if (res.code == 500) {
                 error_json["error"] = "Internal Server Error";
            }
            res.write(error_json.dump());
            res.set_header("Content-Type", "application/json");
        }
    }
};

} // namespace utils
} // namespace mobile_backend

#endif // MOBILE_BACKEND_ERROR_MIDDLEWARE_H
```