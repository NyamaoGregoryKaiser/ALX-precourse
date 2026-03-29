```cpp
#include "ErrorMiddleware.h"

void ErrorMiddleware::before_handle(crow::request& req, crow::response& res, context& ctx) {
    // No specific action before handling the request
}

void ErrorMiddleware::after_handle(crow::request& req, crow::response& res, context& ctx) {
    // Crow's error handling is often done via exceptions caught at the route handler level,
    // or by setting `res.code` and `res.write` directly in routes/middleware.
    // This middleware primarily catches unhandled exceptions that propagate up.
    // Crow's own error handling usually formats HTML for server errors.
    // We want JSON error responses for API.

    // If an error code is set and the response body is empty, we can provide a default JSON error.
    if (res.code >= 400 && res.body.empty()) {
        std::string error_message = "An unexpected error occurred.";
        int status_code = res.code;

        if (status_code == 400) error_message = "Bad Request.";
        else if (status_code == 401) error_message = "Unauthorized.";
        else if (status_code == 403) error_message = "Forbidden.";
        else if (status_code == 404) error_message = "Not Found.";
        else if (status_code == 500) error_message = "Internal Server Error.";

        Logger::error("ErrorMiddleware: Catching empty response for status {} on path {}. Defaulting to: {}", status_code, req.url, error_message);
        res.write(JsonUtils::createErrorResponse(error_message, status_code).dump());
        res.set_header("Content-Type", "application/json");
    }
}
```