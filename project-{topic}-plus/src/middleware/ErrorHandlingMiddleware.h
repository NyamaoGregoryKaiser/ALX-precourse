#ifndef ERROR_HANDLING_MIDDLEWARE_H
#define ERROR_HANDLING_MIDDLEWARE_H

#include <crow.h>
#include "../logger/Logger.h"
#include "../database/DBManager.h" // For DatabaseException
#include "../services/UserService.h" // For UserServiceException, etc.

namespace ErrorHandlingMiddleware {

    // Global error handler function for Crow
    void setup_error_handler(crow::App& app);

    // Helper to generate a standardized error JSON response
    nlohmann::json create_error_response(const std::string& message, int status_code = 500, const std::string& error_code = "SERVER_ERROR");

} // namespace ErrorHandlingMiddleware

#endif // ERROR_HANDLING_MIDDLEWARE_H