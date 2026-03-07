```cpp
#pragma once

#include <drogon/drogon.h>
#include <json/json.h>
#include <string>

namespace ApiResponse {

    inline drogon::HttpResponsePtr makeSuccessResponse(const Json::Value& data, const std::string& message = "Success") {
        Json::Value response;
        response["status"] = "success";
        response["message"] = message;
        response["data"] = data;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(response);
        resp->setStatusCode(drogon::k200OK);
        return resp;
    }

    inline drogon::HttpResponsePtr makeErrorResponse(const std::string& message, drogon::HttpStatusCode code = drogon::k400BadRequest, const std::string& error_code = "") {
        Json::Value response;
        response["status"] = "error";
        response["message"] = message;
        if (!error_code.empty()) {
            response["error_code"] = error_code;
        }
        auto resp = drogon::HttpResponse::newHttpJsonResponse(response);
        resp->setStatusCode(code);
        return resp;
    }

    inline drogon::HttpResponsePtr makeNotFoundResponse(const std::string& resource = "Resource") {
        return makeErrorResponse(resource + " not found", drogon::k404NotFound, "NOT_FOUND");
    }

    inline drogon::HttpResponsePtr makeUnauthorizedResponse(const std::string& message = "Authentication required.") {
        return makeErrorResponse(message, drogon::k401Unauthorized, "UNAUTHORIZED");
    }

    inline drogon::HttpResponsePtr makeForbiddenResponse(const std::string& message = "Permission denied.") {
        return makeErrorResponse(message, drogon::k403Forbidden, "FORBIDDEN");
    }

    inline drogon::HttpResponsePtr makeInternalServerErrorResponse(const std::string& message = "An internal server error occurred.") {
        return makeErrorResponse(message, drogon::k500InternalServerError, "INTERNAL_SERVER_ERROR");
    }
}
```