#include "JsonUtil.h"

namespace JsonUtil {

    drogon::HttpResponsePtr createJsonResponse(
        drogon::HttpStatusCode status,
        const std::string& message,
        const Json::Value& data
    ) {
        Json::Value result;
        result["status"] = static_cast<int>(status);
        result["message"] = message;
        if (!data.empty()) {
            result["data"] = data;
        }
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        resp->setStatusCode(status);
        return resp;
    }

    drogon::HttpResponsePtr createSuccessResponse(
        const std::string& message,
        const Json::Value& data
    ) {
        return createJsonResponse(drogon::k200OK, message, data);
    }

    drogon::HttpResponsePtr createErrorResponse(
        drogon::HttpStatusCode status,
        const std::string& message
    ) {
        return createJsonResponse(status, message);
    }

    drogon::HttpResponsePtr createNotFoundResponse(const std::string& message) {
        return createErrorResponse(drogon::k404NotFound, message);
    }

    drogon::HttpResponsePtr createBadRequestResponse(const std::string& message) {
        return createErrorResponse(drogon::k400BadRequest, message);
    }

    drogon::HttpResponsePtr createUnauthorizedResponse(const std::string& message) {
        return createErrorResponse(drogon::k401Unauthorized, message);
    }

    drogon::HttpResponsePtr createForbiddenResponse(const std::string& message) {
        return createErrorResponse(drogon::k403Forbidden, message);
    }

    drogon::HttpResponsePtr createInternalErrorResponse(const std::string& message) {
        return createErrorResponse(drogon::k500InternalServerError, message);
    }

} // namespace JsonUtil
```