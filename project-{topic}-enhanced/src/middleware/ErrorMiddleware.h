```cpp
#ifndef ERRORMIDDLEWARE_H
#define ERRORMIDDLEWARE_H

#include <crow.h>
#include <nlohmann/json.hpp>

#include "../exceptions/ApiException.h"
#include "../utils/Logger.h"

class ErrorMiddleware {
public:
    struct context {}; // No specific context needed for this middleware

    void before_handle(crow::request& /*req*/, crow::response& /*res*/, context& /*ctx*/) {
        // No operations needed before handling
    }

    void after_handle(crow::request& req, crow::response& res, context& /*ctx*/) {
        // Only handle errors if the response hasn't already been sent
        if (res.is_completed()) {
            return;
        }

        // Check if an error code has been set (e.g., by a route handler or AuthMiddleware)
        if (res.code >= crow::BAD_REQUEST && res.body.empty()) {
            // If the body is empty but an error code is present, provide a default error message
            std::string error_msg = "An error occurred.";
            if (res.code == crow::BAD_REQUEST) error_msg = "Bad Request";
            else if (res.code == crow::UNAUTHORIZED) error_msg = "Unauthorized";
            else if (res.code == crow::FORBIDDEN) error_msg = "Forbidden";
            else if (res.code == crow::NOT_FOUND) error_msg = "Not Found";
            else if (res.code == crow::METHOD_NOT_ALLOWED) error_msg = "Method Not Allowed";
            else if (res.code == crow::INTERNAL_SERVER_ERROR) error_msg = "Internal Server Error";
            else if (res.code == crow::TOO_MANY_REQUESTS) error_msg = "Too Many Requests";
            else if (res.code == crow::CONFLICT) error_msg = "Conflict";


            res.write(nlohmann::json{{"error", error_msg}, {"message", "No specific error message provided."}}.dump());
            res.set_header("Content-Type", "application/json");
            res.end();
        }
    }

    // This method is called by Crow when an exception is caught during route handling
    void error_handle(crow::request& req, crow::response& res, context& /*ctx*/, const std::exception& e) {
        // Ensure response is not already completed
        if (res.is_completed()) {
            return;
        }

        crow::status status_code = crow::INTERNAL_SERVER_ERROR;
        std::string error_message = "Internal Server Error";
        std::string detail_message = e.what();

        // Custom exception handling
        const ApiException* api_exception = dynamic_cast<const ApiException*>(&e);
        if (api_exception) {
            status_code = api_exception->get_status_code();
            error_message = crow::status_text(status_code);
            detail_message = api_exception->what();
            LOG_WARN("API Exception caught: {}: {}", status_code, detail_message);
        } else if (dynamic_cast<const nlohmann::json::exception*>(&e)) {
            status_code = crow::BAD_REQUEST;
            error_message = "Bad Request";
            detail_message = "Invalid JSON payload: " + detail_message;
            LOG_WARN("JSON parsing error: {}", detail_message);
        } else {
            LOG_ERROR("Unhandled exception caught: {}", detail_message);
        }

        res.code = status_code;
        res.set_header("Content-Type", "application/json");
        res.write(nlohmann::json{
            {"error", error_message},
            {"message", detail_message},
            {"path", req.url},
            {"method", crow::method_name(req.method)}
        }.dump());
        res.end();
    }
};

#endif // ERRORMIDDLEWARE_H
```