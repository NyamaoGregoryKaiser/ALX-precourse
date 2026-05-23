```cpp
#pragma once

#include <drogon/drogon.h>
#include <json/json.h>

namespace CMS::Middleware {

// Custom error handling utility functions
class ErrorHandler {
public:
    // Generates a JSON error response
    static drogon::HttpResponsePtr jsonError(drogon::HttpStatusCode code, const std::string& message, const std::string& details = "");

    // Centralized exception handling for async operations
    template <typename T>
    static void handleException(std::exception_ptr eptr,
                                std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                const std::string& defaultErrorMessage = "Internal server error") {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);

        try {
            if (eptr) std::rethrow_exception(eptr);
        } catch (const drogon::orm::UnexpectedRows& ex) {
            // Specific database errors like "not found"
            LOG_WARN << "DB Error (UnexpectedRows): " << ex.what();
            resp->setStatusCode(drogon::k404NotFound);
            resp->setBody(jsonError(drogon::k404NotFound, "Resource not found", ex.what())->getBody());
        } catch (const drogon::orm::DrogonDbException& ex) {
            // General database errors
            LOG_ERROR << "DB Error: " << ex.what();
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(jsonError(drogon::k500InternalServerError, "Database error", ex.what())->getBody());
        } catch (const drogon::Exception& ex) {
            // Other Drogon specific exceptions
            LOG_ERROR << "Drogon Error: " << ex.what();
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(jsonError(drogon::k500InternalServerError, "Application error", ex.what())->getBody());
        } catch (const std::invalid_argument& ex) {
            // Invalid input
            LOG_WARN << "Invalid argument: " << ex.what();
            resp->setStatusCode(drogon::k400BadRequest);
            resp->setBody(jsonError(drogon::k400BadRequest, "Invalid input", ex.what())->getBody());
        } catch (const std::runtime_error& ex) {
            // General runtime errors
            LOG_ERROR << "Runtime Error: " << ex.what();
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(jsonError(drogon::k500InternalServerError, defaultErrorMessage, ex.what())->getBody());
        } catch (const std::exception& ex) {
            // Catch all other standard exceptions
            LOG_ERROR << "Generic Error: " << ex.what();
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(jsonError(drogon::k500InternalServerError, defaultErrorMessage, ex.what())->getBody());
        } catch (...) {
            // Catch any unknown exception
            LOG_CRITICAL << "Unknown critical error!";
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(jsonError(drogon::k500InternalServerError, "Unknown internal server error")->getBody());
        }
        callback(resp);
    }
};

} // namespace CMS::Middleware
```