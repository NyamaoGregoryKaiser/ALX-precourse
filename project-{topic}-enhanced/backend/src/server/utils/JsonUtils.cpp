```cpp
#include "JsonUtils.h"
#include "../../utils/Logger.h"

json JsonUtils::createSuccessResponse(const std::string& message, json data) {
    json response;
    response["status"] = "success";
    response["message"] = message;
    if (!data.empty()) {
        response["data"] = data;
    }
    return response;
}

json JsonUtils::createErrorResponse(const std::string& message, int status_code) {
    json response;
    response["status"] = "error";
    response["message"] = message;
    response["statusCode"] = status_code;
    return response;
}

bool JsonUtils::parseRequestBody(const crow::request& req, json& out_json, crow::response& res) {
    try {
        out_json = json::parse(req.body);
        return true;
    } catch (const json::parse_error& e) {
        Logger::warn("JSON parse error in request body: {}", e.what());
        res.code = 400;
        res.write(createErrorResponse("Invalid JSON format in request body.", 400).dump());
        res.end();
        return false;
    }
}
```