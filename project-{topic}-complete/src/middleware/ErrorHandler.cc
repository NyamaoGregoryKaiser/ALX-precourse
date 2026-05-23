```cpp
#include "ErrorHandler.h"

namespace CMS::Middleware {

drogon::HttpResponsePtr ErrorHandler::jsonError(drogon::HttpStatusCode code, const std::string& message, const std::string& details) {
    Json::Value errorPayload;
    errorPayload["error"]["code"] = code;
    errorPayload["error"]["message"] = message;
    if (!details.empty()) {
        errorPayload["error"]["details"] = details;
    }
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setStatusCode(code);
    resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
    resp->setBody(errorPayload.toStyledString());
    return resp;
}

// Explicit instantiation for common use cases or keep it header-only if suitable
// template void ErrorHandler::handleException<void>(std::exception_ptr, std::function<void(const drogon::HttpResponsePtr&)>, const std::string&);
// template void ErrorHandler::handleException<std::string>(std::exception_ptr, std::function<void(const drogon::HttpResponsePtr&)>, const std::string&);

} // namespace CMS::Middleware
```