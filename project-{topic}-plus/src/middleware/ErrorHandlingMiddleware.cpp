#include "ErrorHandlingMiddleware.h"
#include <exception> // For std::exception
#include <stdexcept> // For std::runtime_error
#include <nlohmann/json.hpp>

namespace ErrorHandlingMiddleware {

nlohmann::json create_error_response(const std::string& message, int status_code, const std::string& error_code) {
    nlohmann::json response;
    response["success"] = false;
    response["error"] = {
        {"code", error_code},
        {"message", message},
        {"status", status_code}
    };
    return response;
}

void setup_error_handler(crow::App& app) {
    app.set_error_handler([](crow::request& req, crow::response& res, std::exception_ptr ep) {
        try {
            std::rethrow_exception(ep);
        } catch (const crow::json::error& e) {
            // JSON parsing error from request body
            Logger::get_logger()->warn("JSON parsing error in request from {}: {}", req.remote_ip_address, e.what());
            res.code = 400;
            res.write(create_error_response("Invalid JSON format in request body.", 400, "BAD_REQUEST").dump());
        } catch (const DatabaseException& e) {
            Logger::get_logger()->error("Database error processing request from {}: {}", req.remote_ip_address, e.what());
            res.code = 500;
            res.write(create_error_response("A database error occurred.", 500, "DB_ERROR").dump());
        } catch (const UserServiceException& e) {
            Logger::get_logger()->warn("User service error processing request from {}: {}", req.remote_ip_address, e.what());
            // Map service exceptions to appropriate HTTP codes
            if (dynamic_cast<const UserAlreadyExistsException*>(&e)) {
                res.code = 409; // Conflict
                res.write(create_error_response(e.what(), 409, "CONFLICT").dump());
            } else if (dynamic_cast<const UserNotFoundException*>(&e)) {
                res.code = 404; // Not Found
                res.write(create_error_response(e.what(), 404, "NOT_FOUND").dump());
            } else if (dynamic_cast<const InvalidCredentialsException*>(&e)) {
                res.code = 401; // Unauthorized
                res.write(create_error_response(e.what(), 401, "UNAUTHORIZED").dump());
            } else {
                res.code = 400; // Generic bad request for other service errors
                res.write(create_error_response(e.what(), 400, "BAD_REQUEST").dump());
            }
        } catch (const std::runtime_error& e) {
            // Catch other runtime errors (e.g., from JwtUtils, general validation)
            Logger::get_logger()->warn("Runtime error processing request from {}: {}", req.remote_ip_address, e.what());
            res.code = 400; // Assume bad request for general runtime errors not explicitly handled
            res.write(create_error_response(e.what(), 400, "BAD_REQUEST").dump());
        } catch (const std::exception& e) {
            Logger::get_logger()->error("Unhandled exception processing request from {}: {}", req.remote_ip_address, e.what());
            res.code = 500;
            res.write(create_error_response("An unexpected server error occurred.", 500, "SERVER_ERROR").dump());
        } catch (...) {
            Logger::get_logger()->critical("Unknown exception type caught processing request from {}.", req.remote_ip_address);
            res.code = 500;
            res.write(create_error_response("An unknown server error occurred.", 500, "UNKNOWN_ERROR").dump());
        }
        res.set_header("Content-Type", "application/json");
        res.end();
    });
}

} // namespace ErrorHandlingMiddleware