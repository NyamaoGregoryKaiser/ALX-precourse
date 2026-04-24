```cpp
#ifndef ECOMMERCE_ERROR_MIDDLEWARE_H
#define ECOMMERCE_ERROR_MIDDLEWARE_H

#include "crow.h"
#include <string>
#include <exception>
#include <spdlog/spdlog.h>
#include "../utils/json_util.h" // For to_json error objects

// Base custom exception class
class BaseException : public std::runtime_error {
public:
    explicit BaseException(const std::string& msg, int status_code = 500)
        : std::runtime_error(msg), status_code_(status_code) {}

    int get_status_code() const {
        return status_code_;
    }

private:
    int status_code_;
};

// Specific HTTP error exceptions
class BadRequestException : public BaseException {
public:
    explicit BadRequestException(const std::string& msg = "Bad Request") : BaseException(msg, 400) {}
};

class UnauthorizedException : public BaseException {
public:
    explicit UnauthorizedException(const std::string& msg = "Unauthorized") : BaseException(msg, 401) {}
};

class ForbiddenException : public BaseException {
public:
    explicit ForbiddenException(const std::string& msg = "Forbidden") : BaseException(msg, 403) {}
};

class NotFoundException : public BaseException {
public:
    explicit NotFoundException(const std::string& msg = "Not Found") : BaseException(msg, 404) {}
};

class ConflictException : public BaseException {
public:
    explicit ConflictException(const std::string& msg = "Conflict") : BaseException(msg, 409) {}
};

class InternalServerErrorException : public BaseException {
public:
    explicit InternalServerErrorException(const std::string& msg = "Internal Server Error") : BaseException(msg, 500) {}
};

// Database specific exceptions
class DBConnectionException : public InternalServerErrorException {
public:
    explicit DBConnectionException(const std::string& msg = "Database Connection Error") : InternalServerErrorException(msg) {}
};

class DBSQLException : public InternalServerErrorException {
public:
    explicit DBSQLException(const std::string& msg = "Database SQL Error") : InternalServerErrorException(msg) {}
};

class DBGenericException : public InternalServerErrorException {
public:
    explicit DBGenericException(const std::string& msg = "Generic Database Error") : InternalServerErrorException(msg) {}
};


class ErrorHandlingMiddleware {
public:
    // No context needed for error handling, but Crow requires a Context struct
    struct Context {};

    ErrorHandlingMiddleware() : logger_(spdlog::get("ecommerce_logger")) {
        if (!logger_) {
            logger_ = spdlog::stdout_color_mt("error_middleware_logger");
        }
    }

    void before_handle(crow::request& req, crow::response& res, Context& ctx) {
        // No pre-processing needed for error handling
    }

    void after_handle(crow::request& req, crow::response& res, Context& ctx) {
        // If an exception was thrown and caught by Crow, it will already have set the response.
        // This middleware specifically handles exceptions thrown *by your handlers*
        // and converts them to standard JSON error responses.

        // Crow's error handling will catch exceptions from routes and call after_handle.
        // If an exception was caught and processed, 'res' might already be set.
        // However, if no exception, or if we want to standardize the final response.

        // The best way to integrate custom error handling with Crow's `after_handle`
        // is to wrap the route handler logic in a try-catch block within Crow's route definition
        // and throw specific exceptions that the middleware (or the main loop) can catch.
        // For Crow, `CROW_CATCHALL_ROUTE` or `set_custom_error_handler` is better for global errors.

        // For this specific setup, we're letting exceptions propagate out of the CROW_ROUTE lambda
        // which the application's overall error handler will catch. Crow's default behavior will catch it,
        // but we want a custom format.

        // Alternative: Crow's `error_handler` method for application-level error handling.
        // This `ErrorHandlingMiddleware` class is more for demonstrating custom exceptions
        // than for Crow's global catch-all.
        // The Crow app's `set_custom_error_handler` (see main.cpp implicit logic) will be used.
    }
};

#endif // ECOMMERCE_ERROR_MIDDLEWARE_H
```