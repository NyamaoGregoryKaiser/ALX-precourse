#ifndef JSON_UTIL_H
#define JSON_UTIL_H

#include <drogon/HttpResponse.h>
#include <json/json.h>
#include <string>

namespace JsonUtil {

    drogon::HttpResponsePtr createJsonResponse(
        drogon::HttpStatusCode status,
        const std::string& message = "",
        const Json::Value& data = Json::Value()
    );

    drogon::HttpResponsePtr createSuccessResponse(
        const std::string& message = "",
        const Json::Value& data = Json::Value()
    );

    drogon::HttpResponsePtr createErrorResponse(
        drogon::HttpStatusCode status,
        const std::string& message = ""
    );

    drogon::HttpResponsePtr createNotFoundResponse(const std::string& message = "Resource not found");
    drogon::HttpResponsePtr createBadRequestResponse(const std::string& message = "Bad request");
    drogon::HttpResponsePtr createUnauthorizedResponse(const std::string& message = "Unauthorized");
    drogon::HttpResponsePtr createForbiddenResponse(const std::string& message = "Forbidden");
    drogon::HttpResponsePtr createInternalErrorResponse(const std::string& message = "Internal server error");

} // namespace JsonUtil

#endif // JSON_UTIL_H
```