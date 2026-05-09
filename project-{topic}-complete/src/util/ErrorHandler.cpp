```cpp
#include "ErrorHandler.h"

namespace VisuFlow {
namespace Util {

void ErrorHandler::handleAPIException(const APIException& ex, Http::Rest::Response& res) {
    Logger::log(spdlog::level::warn, "API Exception: Status={}, Message={}", ex.statusCode(), ex.what());
    res = formatErrorResponse(ex.what(), ex.statusCode());
    // In a real Pistache/Crow/cpprestsdk app, you'd set the actual HTTP status code:
    // res.send(Http::Code(ex.statusCode()), formatErrorResponse(ex.what(), ex.statusCode()));
    // res.headers().add<Http::Header::ContentType>(MIME(Application, Json));
}

void ErrorHandler::handleGenericError(const std::exception& ex, Http::Rest::Response& res) {
    Logger::log(spdlog::level::error, "Generic Exception: Message={}", ex.what());
    res = formatErrorResponse("Internal Server Error: " + std::string(ex.what()), 500);
    // res.send(Http::Code::Internal_Server_Error, formatErrorResponse(...));
}

void ErrorHandler::handleUnknownError(Http::Rest::Response& res) {
    Logger::log(spdlog::level::critical, "Unknown Exception caught.");
    res = formatErrorResponse("An unexpected error occurred.", 500);
    // res.send(Http::Code::Internal_Server_Error, formatErrorResponse(...));
}

std::string ErrorHandler::formatErrorResponse(const std::string& message, int statusCode) {
    nlohmann::json errorJson;
    errorJson["status"] = statusCode;
    errorJson["message"] = message;
    errorJson["timestamp"] = spdlog::details::fmt_helper::now_formatted("%Y-%m-%d %H:%M:%S.%e");
    return errorJson.dump();
}

} // namespace Util
} // namespace VisuFlow
```