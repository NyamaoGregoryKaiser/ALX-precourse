#ifndef ERROR_HANDLER_H
#define ERROR_HANDLER_H

#include <crow.h>
#include "Logger.h"
#include <stdexcept>
#include <string>

// --- Custom Exception Classes ---
// Base custom exception
class AppException : public std::runtime_error {
public:
    int status_code;
    std::string error_type;

    AppException(int status, const std::string& type, const std::string& message)
        : std::runtime_error(message), status_code(status), error_type(type) {}

    crow::json::wvalue to_json() const {
        crow::json::wvalue json_resp;
        json_resp["status_code"] = status_code;
        json_resp["error"] = error_type;
        json_resp["message"] = what();
        return json_resp;
    }
};

// 400 Bad Request
class BadRequestException : public AppException {
public:
    BadRequestException(const std::string& message = "Bad Request")
        : AppException(400, "Bad Request", message) {}
};

// 401 Unauthorized
class UnauthorizedException : public AppException {
public:
    UnauthorizedException(const std::string& message = "Unauthorized")
        : AppException(401, "Unauthorized", message) {}
};

// 403 Forbidden
class ForbiddenException : public AppException {
public:
    ForbiddenException(const std::string& message = "Forbidden")
        : AppException(403, "Forbidden", message) {}
};

// 404 Not Found
class NotFoundException : public AppException {
public:
    NotFoundException(const std::string& message = "Not Found")
        : AppException(404, "Not Found", message) {}
};

// 409 Conflict
class ConflictException : public AppException {
public:
    ConflictException(const std::string& message = "Conflict")
        : AppException(409, "Conflict", message) {}
};

// 500 Internal Server Error (Generic fallback)
class InternalServerException : public AppException {
public:
    InternalServerException(const std::string& message = "Internal Server Error")
        : AppException(500, "Internal Server Error", message) {}
};


// --- Error Handling Middleware ---
// This middleware catches exceptions and formats responses
struct ErrorHandlerMiddleware {
    struct context {};

    void before_handle(crow::request& req, crow::response& res, context& ctx) {
        // No-op for before_handle for error handling
    }

    void after_handle(crow::request& req, crow::response& res, context& ctx) {
        // No-op for after_handle, errors are typically handled in `handle_error`
    }

    void handle_error(crow::request& req, crow::response& res, std::exception_ptr ep, context& ctx) {
        try {
            if (ep) {
                std::rethrow_exception(ep);
            }
        } catch (const AppException& e) {
            // Custom application exceptions
            LOG_WARN("API Error [{}] from {}: {}", e.error_type, req.url, e.what());
            res.code = static_cast<crow::status>(e.status_code);
            res.set_header("Content-Type", "application/json");
            res.write(e.to_json().dump());
        } catch (const crow::json::rvalue::exception& e) {
            // JSON parsing errors
            LOG_WARN("JSON Parsing Error from {}: {}", req.url, e.what());
            res.code = crow::status::BAD_REQUEST;
            res.set_header("Content-Type", "application/json");
            res.write(BadRequestException("Invalid JSON format in request body.").to_json().dump());
        } catch (const std::exception& e) {
            // Generic standard exceptions
            LOG_ERROR("Unhandled Standard Exception from {}: {}", req.url, e.what());
            res.code = crow::status::INTERNAL_SERVER_ERROR;
            res.set_header("Content-Type", "application/json");
            res.write(InternalServerException(e.what()).to_json().dump());
        } catch (...) {
            // Catch-all for unknown exceptions
            LOG_CRITICAL("Unknown Exception from {}:", req.url);
            res.code = crow::status::INTERNAL_SERVER_ERROR;
            res.set_header("Content-Type", "application/json");
            res.write(InternalServerException("An unexpected error occurred.").to_json().dump());
        }
    }
};

#endif // ERROR_HANDLER_H