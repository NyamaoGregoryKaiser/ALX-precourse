```cpp
#include "DashboardController.h"
#include "util/ErrorHandler.h"
#include "core/config/ConfigManager.h"

#include <nlohmann/json.hpp>

// Mock Http Client Implementation
namespace Http {
    std::string Client::get(const std::string& path, const std::map<std::string, std::string>& headers) {
        VisuFlow::Util::Logger::log(spdlog::level::debug, "Mock HTTP GET request to {}/{}", m_baseUrl, path);
        // Simulate API responses based on path
        if (path.find("/api/v1/dashboards/") != std::string::npos && path.find("/api/v1/dashboards/1") != std::string::npos) {
            // Mock response for dashboard config
            return R"({
                "id": 1,
                "name": "Sales Overview",
                "description": "Dashboard showing key sales metrics",
                "layoutJson": "{ \"widgets\": [ {\"id\": \"widget1\", \"chartType\": \"bar\", \"title\": \"Sales by Category\", \"dataSourceId\": 101, \"groupBy\": \"category\", \"metric\": \"sales\"}, {\"id\": \"widget2\", \"chartType\": \"line\", \"title\": \"Monthly Revenue\", \"dataSourceId\": 102, \"groupBy\": \"month\", \"metric\": \"revenue\"} ] }",
                "userId": 10
            })";
        }
        if (path.find("/api/v1/data") != std::string::npos) {
            // Mock response for processed data
            return R"({
                "columns": [ {"name": "category", "type": "STRING"}, {"name": "sales_sum", "type": "DOUBLE"} ],
                "data": [ ["Electronics", 15000.50], ["Clothing", 8000.25], ["Books", 12000.00] ]
            })";
        }
        VisuFlow::Util::Logger::log(spdlog::level::error, "Mock HTTP GET: Unhandled path: {}", path);
        throw VisuFlow::Util::APIException("Mock API: Not Found", 404);
    }

    std::string Client::post(const std::string& path, const std::string& body, const std::map<std::string, std::string>& headers) {
        VisuFlow::Util::Logger::log(spdlog::level::debug, "Mock HTTP POST request to {}/{}, Body: {}", m_baseUrl, path, body);
        // Simulate API responses for POST
        if (path.find("/api/v1/auth/login") != std::string::npos) {
            return R"({"token": "mock_jwt_token_for_user_1", "userId": 1, "username": "testuser", "role": "editor"})";
        }
        VisuFlow::Util::Logger::log(spdlog::level::error, "Mock HTTP POST: Unhandled path: {}", path);
        throw VisuFlow::Util::APIException("Mock API: Not Implemented", 501);
    }
}


namespace VisuFlow {
namespace GUI {

DashboardController::DashboardController() {
    std::string apiBaseUrl = Core::Config::ConfigManager::getInstance().getString("api_base_url", "http://localhost:9080");
    m_apiClient = std::make_unique<Http::Client>(apiBaseUrl);
    VisuFlow::Util::Logger::log(spdlog::level::info, "DashboardController initialized, API Base URL: {}", apiBaseUrl);
}

API::DashboardInfoResponse DashboardController::fetchDashboardConfig(long long dashboardId, const std::string& token) {
    std::string path = "/api/v1/dashboards/" + std::to_string(dashboardId);
    std::map<std::string, std::string> headers = buildAuthHeaders(token);

    std::string responseJson = m_apiClient->get(path, headers);
    return parseApiResponse<API::DashboardInfoResponse>(responseJson);
}

API::ProcessedDataResponse DashboardController::fetchProcessedData(long long dataSourceId,
                                                                   const Data::Processor::ProcessingConfig& config,
                                                                   const std::string& token) {
    std::string path = "/api/v1/data?";
    path += "sourceId=" + std::to_string(dataSourceId);
    path += "&groupBy=" + config.groupByColumn;
    path += "&metric=" + config.metricColumn;
    path += "&aggregation=" + config.aggregationType;
    // Add filters to path as query params (encode them properly in real app)

    std::map<std::string, std::string> headers = buildAuthHeaders(token);

    std::string responseJson = m_apiClient->get(path, headers);
    return parseApiResponse<API::ProcessedDataResponse>(responseJson);
}

template<typename T>
T DashboardController::parseApiResponse(const std::string& jsonResponse) {
    try {
        nlohmann::json parsedJson = nlohmann::json::parse(jsonResponse);
        // Generic parsing logic (needs specific implementation for each DTO type)
        if constexpr (std::is_same<T, API::DashboardInfoResponse>::value) {
            T dto;
            dto.id = parsedJson.at("id").get<long long>();
            dto.name = parsedJson.at("name").get<std::string>();
            dto.description = parsedJson.at("description").get<std::string>();
            dto.layoutJson = parsedJson.at("layoutJson").get<std::string>();
            dto.userId = parsedJson.at("userId").get<long long>();
            return dto;
        } else if constexpr (std::is_same<T, API::ProcessedDataResponse>::value) {
            T dto;
            for (const auto& colJson : parsedJson.at("columns")) {
                dto.columns.push_back({colJson.at("name").get<std::string>(), colJson.at("type").get<std::string>()});
            }
            for (const auto& rowJson : parsedJson.at("data")) {
                API::DataRow row;
                for (const auto& cellJson : rowJson) {
                    if (cellJson.is_string()) row.push_back(cellJson.get<std::string>());
                    else if (cellJson.is_number_integer()) row.push_back(cellJson.get<long long>());
                    else if (cellJson.is_number_float()) row.push_back(cellJson.get<double>());
                    else if (cellJson.is_boolean()) row.push_back(cellJson.get<bool>());
                    else row.push_back(std::string("")); // Fallback
                }
                dto.data.push_back(row);
            }
            return dto;
        } else {
            // Fallback for unsupported types
            VisuFlow::Util::Logger::log(spdlog::level::error, "Attempted to parse unsupported DTO type from JSON: {}", jsonResponse);
            throw VisuFlow::Util::APIException("Failed to parse API response: Unknown DTO type.", 500);
        }
    } catch (const nlohmann::json::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "Failed to parse API response JSON: {}", e.what());
        throw VisuFlow::Util::APIException("Invalid API response format: " + std::string(e.what()), 500);
    } catch (const std::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "Unexpected error parsing API response: {}", e.what());
        throw VisuFlow::Util::APIException("An unexpected error occurred while processing API response.", 500);
    }
}
// Explicit template instantiation for types used
template API::DashboardInfoResponse DashboardController::parseApiResponse<API::DashboardInfoResponse>(const std::string& jsonResponse);
template API::ProcessedDataResponse DashboardController::parseApiResponse<API::ProcessedDataResponse>(const std::string& jsonResponse);


std::map<std::string, std::string> DashboardController::buildAuthHeaders(const std::string& token) {
    if (!token.empty()) {
        return {{"Authorization", "Bearer " + token}};
    }
    return {};
}

} // namespace GUI
} // namespace VisuFlow
```