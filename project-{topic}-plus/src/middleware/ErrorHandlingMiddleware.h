```cpp
#ifndef ERROR_HANDLING_MIDDLEWARE_H
#define ERROR_HANDLING_MIDDLEWARE_H

#include <crow.h>
#include "../exceptions/CustomExceptions.h"
#include "../utils/Logger.h"

namespace TaskManager {
namespace Middleware {

struct ErrorHandlingMiddleware {
    struct context {}; // No specific context data needed for this middleware

    template <typename Next>
    void call(crow::request& req, crow::response& res, Next&& next) {
        try {
            next(req, res);
        } catch (const Exceptions::NotFoundException& e) {
            res.code = crow::status::NOT_FOUND;
            res.set_header("Content-Type", "application/json");
            res.write(nlohmann::json{{"error", e.what()}, {"code", static_cast<int>(e.getErrorCode())}}.dump());
            Utils::Logger::getLogger()->warn("Request {} {} -> 404 Not Found: {}", req.method_string(), req.url, e.what());
        } catch (const Exceptions::BadRequestException& e) {
            res.code = crow::status::BAD_REQUEST;
            res.set_header("Content-Type", "application/json");
            res.write(nlohmann::json{{"error", e.what()}, {"code", static_cast<int>(e.getErrorCode())}}.dump());
            Utils::Logger::getLogger()->warn("Request {} {} -> 400 Bad Request: {}", req.method_string(), req.url, e.what());
        } catch (const Exceptions::UnauthorizedException& e) {
            res.code = crow::status::UNAUTHORIZED;
            res.set_header("Content-Type", "application/json");
            res.write(nlohmann::json{{"error", e.what()}, {"code", static_cast<int>(e.getErrorCode())}}.dump());
            res.set_header("WWW-Authenticate", "Bearer"); // Indicate JWT is expected
            Utils::Logger::getLogger()->warn("Request {} {} -> 401 Unauthorized: {}", req.method_string(), req.url, e.what());
        } catch (const Exceptions::ForbiddenException& e) {
            res.code = crow::status::FORBIDDEN;
            res.set_header("Content-Type", "application/json");
            res.write(nlohmann::json{{"error", e.what()}, {"code", static_cast<int>(e.getErrorCode())}}.dump());
            Utils::Logger::getLogger()->warn("Request {} {} -> 403 Forbidden: {}", req.method_string(), req.url, e.what());
        } catch (const Exceptions::ConflictException& e) {
            res.code = crow::status::CONFLICT;
            res.set_header("Content-Type", "application/json");
            res.write(nlohmann::json{{"error", e.what()}, {"code", static_cast<int>(e.getErrorCode())}}.dump());
            Utils::Logger::getLogger()->warn("Request {} {} -> 409 Conflict: {}", req.method_string(), req.url, e.what());
        } catch (const Exceptions::ValidationException& e) {
            res.code = crow::status::UNPROCESSABLE_ENTITY; // 422 for validation errors
            res.set_header("Content-Type", "application/json");
            res.write(nlohmann::json{{"error", e.what()}, {"code", static_cast<int>(e.getErrorCode())}}.dump());
            Utils::Logger::getLogger()->warn("Request {} {} -> 422 Unprocessable Entity: {}", req.method_string(), req.url, e.what());
        } catch (const Exceptions::DatabaseException& e) {
            res.code = crow::status::INTERNAL_SERVER_ERROR;
            res.set_header("Content-Type", "application/json");
            res.write(nlohmann::json{{"error", "Database Error: " + std::string(e.what())}, {"code", static_cast<int>(e.getErrorCode())}}.dump());
            Utils::Logger::getLogger()->error("Request {} {} -> 500 Database Error: {}", req.method_string(), req.url, e.what());
        } catch (const nlohmann::json::parse_error& e) {
            res.code = crow::status::BAD_REQUEST;
            res.set_header("Content-Type", "application/json");
            res.write(nlohmann::json{{"error", "Invalid JSON format: " + std::string(e.what())}, {"code", static_cast<int>(Exceptions::ErrorCode::BAD_REQUEST)}}.dump());
            Utils::Logger::getLogger()->warn("Request {} {} -> 400 JSON Parse Error: {}", req.method_string(), req.url, e.what());
        } catch (const std::exception& e) {
            res.code = crow::status::INTERNAL_SERVER_ERROR;
            res.set_header("Content-Type", "application/json");
            res.write(nlohmann::json{{"error", "Internal Server Error: " + std::string(e.what())}, {"code", static_cast<int>(Exceptions::ErrorCode::INTERNAL_SERVER_ERROR)}}.dump());
            Utils::Logger::getLogger()->error("Request {} {} -> 500 Internal Server Error: {}", req.method_string(), req.url, e.what());
        } catch (...) {
            res.code = crow::status::INTERNAL_SERVER_ERROR;
            res.set_header("Content-Type", "application/json");
            res.write(nlohmann::json{{"error", "An unknown error occurred."}, {"code", static_cast<int>(Exceptions::ErrorCode::UNKNOWN_ERROR)}}.dump());
            Utils::Logger::getLogger()->critical("Request {} {} -> 500 Unknown Error.", req.method_string(), req.url);
        }

        if (res.code >= crow::status::BAD_REQUEST && !res.body.empty() && res.get_header("Content-Type") != "application/json") {
            // Ensure error responses always have JSON content type
            res.set_header("Content-Type", "application/json");
        }
        res.end(); // Ensure the response is sent
    }
};

} // namespace Middleware
} // namespace TaskManager

#endif // ERROR_HANDLING_MIDDLEWARE_H
```