```cpp
#include "ErrorHandlerMiddleware.hpp"
#include "../logger/Logger.hpp"
#include "../utils/AppException.hpp"

#include "crow.h"
#include <nlohmann/json.hpp>
#include <stdexcept>
#include <string>

ErrorHandlerMiddleware::ErrorHandlerMiddleware() {
    // Constructor
}

// Called before the route handler. Not used for error handling directly.
void ErrorHandlerMiddleware::before_handle(crow::request& req, crow::response& res, Context& ctx) {
    // No specific logic needed before for error handling itself.
}

// Called after the route handler (or if an exception is thrown during before_handle/route_handle).
void ErrorHandlerMiddleware::after_handle(crow::request& req, crow::response& res, Context& ctx) {
    // If an exception was thrown and caught by Crow's internal mechanism,
    // the response will likely have a non-2xx status code.
    // This middleware aims to standardize the error response format.

    // If response status is not 2xx, or an exception was caught by Crow's default handler,
    // we want to reformat it.
    // Crow's exception handling flow is a bit tricky: if an exception is thrown in `before_handle`
    // or the route handler, Crow often catches it, sets a default error response, and then
    // calls `after_handle`. We intercept this to provide a consistent JSON format.

    // Check if the response is already an error (non-2xx)
    // or if ctx.exception_ptr has been set (indicating an uncaught exception)
    if (res.code >= 400 || ctx.exception_ptr) {
        // Retrieve exception information if available, or use generic message
        std::string errorMessage = "An unknown server error occurred.";
        int statusCode = 500;
        std::string errorDetails = "";

        if (ctx.exception_ptr) {
            try {
                std::rethrow_exception(ctx.exception_ptr);
            } catch (const AppException& e) {
                statusCode = e.getStatusCode();
                errorMessage = e.what();
                errorDetails = e.getDetails();
                Logger::error("ErrorHandler: Caught AppException ({}) for route {}: {}", statusCode, req.url, errorMessage);
            } catch (const std::exception& e) {
                // Catch any other standard exceptions
                errorMessage = e.what();
                statusCode = 500;
                Logger::error("ErrorHandler: Caught std::exception for route {}: {}", req.url, errorMessage);
            } catch (...) {
                // Catch all other unknown exceptions
                Logger::critical("ErrorHandler: Caught unknown exception for route {}.", req.url);
            }
            // Clear the exception pointer so Crow doesn't re-handle it
            ctx.exception_ptr = nullptr;
        } else {
            // If no exception_ptr but res.code is an error, use existing code and message (or generic)
            statusCode = res.code;
            if (res.body.empty() || res.body.find("error") == std::string::npos) {
                 // If Crow provided a non-JSON error or no body, provide a generic message
                 if (statusCode == 404) errorMessage = "Not Found.";
                 else if (statusCode == 401) errorMessage = "Unauthorized.";
                 else if (statusCode == 403) errorMessage = "Forbidden.";
                 else if (statusCode == 429) errorMessage = "Too Many Requests.";
                 else errorMessage = "An error occurred.";
            } else {
                // Try to parse Crow's default error body if it exists and is potentially JSON
                try {
                    nlohmann::json existingBody = nlohmann::json::parse(res.body);
                    if (existingBody.contains("message")) {
                        errorMessage = existingBody["message"].get<std::string>();
                    } else if (existingBody.contains("error")) {
                         errorMessage = existingBody["error"].get<std::string>();
                    }
                } catch (const nlohmann::json::parse_error&) {
                    // Not JSON, just use generic message
                }
            }
             Logger::error("ErrorHandler: Non-2xx response without explicit exception for route {}. Status: {}, Message: {}", 
                           req.url, statusCode, errorMessage);
        }

        // Construct a standardized JSON error response
        nlohmann::json errorResponse;
        errorResponse["status"] = "error";
        errorResponse["message"] = errorMessage;
        errorResponse["code"] = statusCode;
        if (!errorDetails.empty()) {
            errorResponse["details"] = errorDetails;
        }

        res.code = static_cast<crow::status>(statusCode);
        res.set_header("Content-Type", "application/json");
        res.body = errorResponse.dump();
    }
}
```