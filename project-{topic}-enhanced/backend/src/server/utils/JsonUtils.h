```cpp
#ifndef DATAVIZ_JSONUTILS_H
#define DATAVIZ_JSONUTILS_H

#include <nlohmann/json.hpp>
#include <string>

using json = nlohmann::json;

class JsonUtils {
public:
    // Create a standardized success response
    static json createSuccessResponse(const std::string& message = "Operation successful", json data = json::object());

    // Create a standardized error response
    static json createErrorResponse(const std::string& message, int status_code = 500);

    // Parse request body into JSON, handle errors
    static bool parseRequestBody(const crow::request& req, json& out_json, crow::response& res);
};

#endif // DATAVIZ_JSONUTILS_H
```