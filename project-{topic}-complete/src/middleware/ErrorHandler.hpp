```cpp
#ifndef MLTOOLKIT_ERROR_HANDLER_HPP
#define MLTOOLKIT_ERROR_HANDLER_HPP

#include <crow.h>
#include "../common/Exceptions.hpp"
#include "../common/Logger.hpp"

namespace MLToolkit {
namespace Middleware {

// This is not a traditional Crow middleware, but a function to handle exceptions
// and format API responses. Crow handles exceptions by allowing you to set an error handler.
inline void setup_error_handler(crow::App<>& app) {
    app.error_handler([&](crow::request& req, crow::response& res, crow::Error err) {
        int status_code = 500;
        std::string error_message = "An unexpected error occurred.";
        
        LOG_ERROR("API Error caught for request {}:{} -> {}. Crow Error Type: {}, Message: {}", 
                  req.method_string(), req.url, req.remote_ip_address, (int)err, res.body);

        switch (err) {
            case crow::Error::BadMethod:
                status_code = 405; // Method Not Allowed
                error_message = "Method Not Allowed.";
                break;
            case crow::Error::NotFound:
                status_code = 404; // Not Found
                error_message = "Endpoint not found.";
                break;
            case crow::Error::ParserError:
            case crow::Error::InvalidJSON:
                status_code = 400; // Bad Request
                error_message = "Invalid JSON or request body.";
                break;
            case crow::Error::NotHandled: // Not Handled is a generic internal Crow error
            default:
                // For unhandled exceptions, or generic internal errors
                // If a specific C++ exception was caught, it would be logged earlier
                // or handled by custom catch blocks in handlers.
                status_code = 500;
                error_message = "Internal server error.";
                break;
        }

        res.code = status_code;
        res.set_header("Content-Type", "application/json");
        res.write(crow::json::wvalue({{"status", "error"}, {"message", error_message}}).dump());
        res.end();
    });
}

// Global exception handling function for Crow routes to wrap business logic
template <typename Func>
crow::response handle_exceptions(Func&& f) {
    try {
        return f();
    } catch (const Common::InvalidArgumentException& e) {
        LOG_WARN("Caught InvalidArgumentException: {}", e.what());
        return crow::response(400, crow::json::wvalue({{"status", "error"}, {"message", e.what()}}).dump());
    } catch (const Common::NotFoundException& e) {
        LOG_WARN("Caught NotFoundException: {}", e.what());
        return crow::response(404, crow::json::wvalue({{"status", "error"}, {"message", e.what()}}).dump());
    } catch (const Common::AuthException& e) {
        LOG_WARN("Caught AuthException: {}", e.what());
        return crow::response(403, crow::json::wvalue({{"status", "error"}, {"message", e.what()}}).dump());
    } catch (const Common::DatabaseException& e) {
        LOG_ERROR("Caught DatabaseException: {}", e.what());
        return crow::response(500, crow::json::wvalue({{"status", "error"}, {"message", "Database error: " + std::string(e.what())}}).dump());
    } catch (const Common::MLUtilityException& e) {
        LOG_ERROR("Caught MLUtilityException: {}", e.what());
        return crow::response(500, crow::json::wvalue({{"status", "error"}, {"message", "ML utility error: " + std::string(e.what())}}).dump());
    } catch (const Common::ApiException& e) {
        LOG_ERROR("Caught ApiException with status {}: {}", e.get_status_code(), e.what());
        return crow::response(e.get_status_code(), crow::json::wvalue({{"status", "error"}, {"message", e.what()}}).dump());
    } catch (const std::exception& e) {
        LOG_CRITICAL("Caught unhandled std::exception: {}", e.what());
        return crow::response(500, crow::json::wvalue({{"status", "error"}, {"message", "An unexpected server error occurred: " + std::string(e.what())}}).dump());
    } catch (...) {
        LOG_CRITICAL("Caught unknown exception type.");
        return crow::response(500, crow::json::wvalue({{"status", "error"}, {"message", "An unknown server error occurred."}}).dump());
    }
}

} // namespace Middleware
} // namespace MLToolkit

#endif // MLTOOLKIT_ERROR_HANDLER_HPP
```