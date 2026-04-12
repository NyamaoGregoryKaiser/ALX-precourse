#pragma once

#include "crow.h"
#include "utils/Logger.h"

namespace crow {
    class ErrorMiddleware {
    public:
        // Before_handle for Crow is often used for request preprocessing.
        // For error handling, after_handle or custom error routes are more common.
        void before_handle(crow::request& req, crow::response& res, crow::context<void>& ctx) {
            // No specific action before, but we could set up a custom exception handler
            // for this thread if needed, or register a global one.
        }

        void after_handle(crow::request& req, crow::response& res, crow::context<void>& ctx) {
            if (res.code >= 400 && res.body.empty()) {
                // Default error message for generic HTTP errors if no body was set
                std::string error_msg = "{\"error\": \"An unexpected error occurred.\"}";
                if (res.code == 400) error_msg = "{\"error\": \"Bad Request.\"}";
                if (res.code == 401) error_msg = "{\"error\": \"Unauthorized. Please login.\"}";
                if (res.code == 403) error_msg = "{\"error\": \"Forbidden. You don't have permission to access this resource.\"}";
                if (res.code == 404) error_msg = "{\"error\": \"Not Found.\"}";
                if (res.code == 500) error_msg = "{\"error\": \"Internal Server Error.\"}";

                res.set_header("Content-Type", "application/json");
                res.write(error_msg);
                LOG_ERROR("ErrorMiddleware: Request to {} responded with status {} and empty body. Defaulting error message.", req.url, res.code);
            }
        }
    };
} // namespace crow