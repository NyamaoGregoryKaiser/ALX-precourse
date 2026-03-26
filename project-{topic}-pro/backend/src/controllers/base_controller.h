#pragma once
#include "../core/server.h" // For CMS_Server
#include <nlohmann/json.hpp> // For JSON parsing

// A base controller that provides common functionality like JSON parsing
class BaseController {
protected:
    // Helper to parse JSON body
    nlohmann::json parse_json_body(const Pistache::Rest::Request& request) const {
        try {
            return nlohmann::json::parse(request.body());
        } catch (const nlohmann::json::parse_error& e) {
            spdlog::error("JSON parse error: {}", e.what());
            throw ApiException(Pistache::Http::Code::Bad_Request, "Invalid JSON body", e.what());
        }
    }
    
public:
    virtual void setup_routes(CMS_Server& server) = 0;
    virtual ~BaseController() = default;
};