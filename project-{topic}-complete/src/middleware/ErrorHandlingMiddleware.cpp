```cpp
#include "ErrorHandlingMiddleware.h"
#include "utils/Logger.h"
#include "utils/JsonUtils.h"
#include <json/json.h>

void ErrorHandlingMiddleware::handle(Pistache::Http::ResponseWriter& response, const HttpError& error) {
    LOG_ERROR("HTTP Error {}: {}", static_cast<int>(error.statusCode), error.what());
    Json::Value error_json;
    error_json["message"] = error.what();
    response.send(error.statusCode, JsonUtils::stringifyJson(error_json));
}

void ErrorHandlingMiddleware::handle(Pistache::Http::ResponseWriter& response, const std::exception& ex) {
    LOG_ERROR("Unhandled exception: {}", ex.what());
    Json::Value error_json;
    error_json["message"] = "An unexpected error occurred.";
    response.send(Pistache::Http::Code::Internal_Server_Error, JsonUtils::stringifyJson(error_json));
}

void ErrorHandlingMiddleware::handleNotFound(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    LOG_WARN("Not Found: No route matches {} {}", request.method().toString(), request.resource());
    Json::Value error_json;
    error_json["message"] = "The requested resource was not found.";
    response.send(Pistache::Http::Code::Not_Found, JsonUtils::stringifyJson(error_json));
}
```