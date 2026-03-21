```cpp
#ifndef ERROR_HANDLER_MIDDLEWARE_H
#define ERROR_HANDLER_MIDDLEWARE_H

#include <crow.h>
#include <string>
#include <stdexcept>
#include "../exceptions/CustomExceptions.h"
#include "../utils/Logger.h"

namespace PaymentProcessor {
namespace Middleware {

using namespace PaymentProcessor::Exceptions;
using namespace PaymentProcessor::Utils;

// Crow middleware for global error handling
struct ErrorHandlerMiddleware {
    struct Context {}; // No specific context needed for this middleware

    template <typename Next>
    void call(crow::request& req, crow::response& res, Next&& next) {
        try {
            next(req, res);
        } catch (const UnauthorizedException& e) {
            LOG_WARN("Unauthorized error on {}: {}", req.url, e.what());
            res.code = 401;
            res.set_header("WWW-Authenticate", "Bearer realm=\"PaymentProcessor\"");
            res.write(nlohmann::json{{"error", e.what()}}.dump());
            res.end();
        } catch (const ForbiddenException& e) {
            LOG_WARN("Forbidden error on {}: {}", req.url, e.what());
            res.code = 403;
            res.write(nlohmann::json{{"error", e.what()}}.dump());
            res.end();
        } catch (const NotFoundException& e) {
            LOG_WARN("Not Found error on {}: {}", req.url, e.what());
            res.code = 404;
            res.write(nlohmann::json{{"error", e.what()}}.dump());
            res.end();
        } catch (const InvalidArgumentException& e) {
            LOG_WARN("Bad Request (Invalid Argument) error on {}: {}", req.url, e.what());
            res.code = 400;
            res.write(nlohmann::json{{"error", e.what()}}.dump());
            res.end();
        } catch (const ValidationException& e) {
            LOG_WARN("Bad Request (Validation) error on {}: {}", req.url, e.what());
            res.code = 400;
            res.write(nlohmann::json{{"error", e.what()}}.dump());
            res.end();
        } catch (const DatabaseException& e) {
            LOG_ERROR("Database error on {}: {}", req.url, e.what());
            res.code = 500; // Internal Server Error
            res.write(nlohmann::json{{"error", "Database operation failed. Please try again later."}}.dump());
            res.end();
        } catch (const PaymentProcessorException& e) {
            LOG_ERROR("Application error on {}: {}", req.url, e.what());
            res.code = 500; // Internal Server Error
            res.write(nlohmann::json{{"error", "An unexpected application error occurred."}}.dump());
            res.end();
        } catch (const nlohmann::json::exception& e) {
            LOG_WARN("JSON parsing error on {}: {}", req.url, e.what());
            res.code = 400; // Bad Request
            res.write(nlohmann::json{{"error", "Invalid JSON format in request body: " + std::string(e.what())}}.dump());
            res.end();
        } catch (const std::exception& e) {
            LOG_CRITICAL("Unhandled exception on {}: {}", req.url, e.what());
            res.code = 500;
            res.write(nlohmann::json{{"error", "An unexpected internal server error occurred."}}.dump());
            res.end();
        } catch (...) {
            LOG_CRITICAL("Unknown unhandled exception on {}.", req.url);
            res.code = 500;
            res.write(nlohmann::json{{"error", "An unknown internal server error occurred."}}.dump());
            res.end();
        }
    }
};

} // namespace Middleware
} // namespace PaymentProcessor

#endif // ERROR_HANDLER_MIDDLEWARE_H
```