#include "ErrorHandler.h"
#include "../utils/JsonUtil.h"
#include <drogon/drogon.h>

namespace ErrorHandler {

    drogon::HttpResponsePtr customErrorHandler(
        drogon::HttpStatusCode statusCode,
        const std::string& matchedPath
    ) {
        std::string message;
        switch (statusCode) {
            case drogon::k400BadRequest:
                message = "Bad Request";
                break;
            case drogon::k401Unauthorized:
                message = "Unauthorized";
                break;
            case drogon::k403Forbidden:
                message = "Forbidden";
                break;
            case drogon::k404NotFound:
                message = "Not Found";
                break;
            case drogon::k429TooManyRequests:
                message = "Too Many Requests";
                break;
            case drogon::k500InternalServerError:
                message = "Internal Server Error";
                break;
            default:
                message = "An error occurred";
                break;
        }

        // For API paths, return JSON
        if (matchedPath.rfind("/api/", 0) == 0) { // Check if path starts with /api/
            LOG_WARN << "API Error " << static_cast<int>(statusCode) << " on path: " << matchedPath << " - " << message;
            return JsonUtil::createErrorResponse(statusCode, message);
        } else {
            // For web pages, return a simple HTML error page
            // You might have specific error pages (e.g., 404.html)
            LOG_WARN << "Web Error " << static_cast<int>(statusCode) << " on path: " << matchedPath << " - " << message;
            std::string body = "<html><body><h1>Error " + std::to_string(static_cast<int>(statusCode)) + "</h1><p>" + message + "</p></body></html>";
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setStatusCode(statusCode);
            resp->setContentTypeCode(drogon::CT_TEXT_HTML);
            resp->setBody(body);
            return resp;
        }
    }

} // namespace ErrorHandler
```