```cpp
#include "DashboardHandler.h"
#include "util/ErrorHandler.h"
#include "core/common/Constants.h"

#include <nlohmann/json.hpp>

namespace VisuFlow {
namespace API {

DashboardHandler::DashboardHandler() : m_dashboardRepository() {}

void DashboardHandler::getAllDashboards(const Http::Rest::Request& req, Http::Rest::Response& res) {
    try {
        // Conceptual: Get userId from authenticated request context
        long long userId = 1; // Mocking user ID

        std::vector<Data::Model::Dashboard> dashboards = m_dashboardRepository.findByUserId(userId);
        std::vector<DashboardInfoResponse> responseList;
        for (const auto& db : dashboards) {
            responseList.push_back({db.id, db.name, db.description, db.layoutJson, db.userId});
        }
        sendDashboardsListResponse(responseList, res);
    } catch (const Util::APIException& e) {
        Util::ErrorHandler::handleAPIException(e, res);
    } catch (const std::exception& e) {
        Util::ErrorHandler::handleGenericError(e, res);
    }
}

void DashboardHandler::getDashboardById(const Http::Rest::Request& req, Http::Rest::Response& res) {
    try {
        long long dashboardId = extractDashboardId(req);
        // Conceptual: Get userId from authenticated request context
        long long userId = 1; // Mocking user ID for authorization

        Data::Model::Dashboard dashboard = m_dashboardRepository.findById(dashboardId);
        if (dashboard.id == 0 || dashboard.userId != userId) { // Not found or not authorized
            throw Util::APIException("Dashboard not found or unauthorized", 404);
        }

        DashboardInfoResponse response = {dashboard.id, dashboard.name, dashboard.description, dashboard.layoutJson, dashboard.userId};
        sendDashboardResponse(response, res);
    } catch (const Util::APIException& e) {
        Util::ErrorHandler::handleAPIException(e, res);
    } catch (const std::exception& e) {
        Util::ErrorHandler::handleGenericError(e, res);
    }
}

void DashboardHandler::createDashboard(const Http::Rest::Request& req, Http::Rest::Response& res) {
    try {
        DashboardCreateRequest createReq = parseCreateRequest(req);
        // Conceptual: Get userId from authenticated request context
        long long userId = 1; // Mocking user ID

        Data::Model::Dashboard newDashboard = m_dashboardRepository.create(
            createReq.name, createReq.description, createReq.layoutJson, userId
        );

        DashboardInfoResponse response = {newDashboard.id, newDashboard.name, newDashboard.description, newDashboard.layoutJson, newDashboard.userId};
        sendDashboardResponse(response, res, 201); // 201 Created
    } catch (const Util::APIException& e) {
        Util::ErrorHandler::handleAPIException(e, res);
    } catch (const nlohmann::json::exception& e) {
        Util::ErrorHandler::handleAPIException(Util::APIException("Invalid JSON payload", 400), res);
    } catch (const std::exception& e) {
        Util::ErrorHandler::handleGenericError(e, res);
    }
}

void DashboardHandler::updateDashboard(const Http::Rest::Request& req, Http::Rest::Response& res) {
    try {
        long long dashboardId = extractDashboardId(req);
        DashboardUpdateRequest updateReq = parseUpdateRequest(dashboardId, req);
        // Conceptual: Get userId from authenticated request context
        long long userId = 1; // Mocking user ID for authorization

        Data::Model::Dashboard existingDashboard = m_dashboardRepository.findById(dashboardId);
        if (existingDashboard.id == 0 || existingDashboard.userId != userId) {
            throw Util::APIException("Dashboard not found or unauthorized", 404);
        }

        Data::Model::Dashboard updatedDashboard = m_dashboardRepository.update(
            updateReq.id, updateReq.name, updateReq.description, updateReq.layoutJson, userId
        );

        DashboardInfoResponse response = {updatedDashboard.id, updatedDashboard.name, updatedDashboard.description, updatedDashboard.layoutJson, updatedDashboard.userId};
        sendDashboardResponse(response, res);
    } catch (const Util::APIException& e) {
        Util::ErrorHandler::handleAPIException(e, res);
    } catch (const nlohmann::json::exception& e) {
        Util::ErrorHandler::handleAPIException(Util::APIException("Invalid JSON payload", 400), res);
    } catch (const std::exception& e) {
        Util::ErrorHandler::handleGenericError(e, res);
    }
}

void DashboardHandler::deleteDashboard(const Http::Rest::Request& req, Http::Rest::Response& res) {
    try {
        long long dashboardId = extractDashboardId(req);
        // Conceptual: Get userId from authenticated request context
        long long userId = 1; // Mocking user ID for authorization

        Data::Model::Dashboard existingDashboard = m_dashboardRepository.findById(dashboardId);
        if (existingDashboard.id == 0 || existingDashboard.userId != userId) {
            throw Util::APIException("Dashboard not found or unauthorized", 404);
        }

        m_dashboardRepository.remove(dashboardId);
        res = "{\"message\": \"Dashboard deleted successfully\"}"; // For mock
        // In real Pistache: res.send(Http::Code::NoContent);
    } catch (const Util::APIException& e) {
        Util::ErrorHandler::handleAPIException(e, res);
    } catch (const std::exception& e) {
        Util::ErrorHandler::handleGenericError(e, res);
    }
}

long long DashboardHandler::extractDashboardId(const Http::Rest::Request& req) {
    // Conceptual: In a real Pistache/Crow/etc. app, you'd extract path parameters like `req.param(":id").as<long long>()`.
    // For this mock, assume the ID is passed as part of the request string, e.g., "GET /api/v1/dashboards/123"
    std::string path = req; // Mock request string
    size_t lastSlash = path.find_last_of('/');
    if (lastSlash != std::string::npos) {
        std::string idStr = path.substr(lastSlash + 1);
        try {
            return std::stoll(idStr);
        } catch (const std::exception&) {
            throw Util::APIException("Invalid dashboard ID format", 400);
        }
    }
    throw Util::APIException("Dashboard ID not found in request path", 400);
}

DashboardCreateRequest DashboardHandler::parseCreateRequest(const Http::Rest::Request& req) {
    nlohmann::json jsonBody = nlohmann::json::parse(req); // Assume req is JSON string
    DashboardCreateRequest createReq;
    createReq.name = jsonBody.at("name").get<std::string>();
    createReq.description = jsonBody.count("description") ? jsonBody.at("description").get<std::string>() : "";
    createReq.layoutJson = jsonBody.count("layoutJson") ? jsonBody.at("layoutJson").get<std::string>() : "{}";
    return createReq;
}

DashboardUpdateRequest DashboardHandler::parseUpdateRequest(long long id, const Http::Rest::Request& req) {
    nlohmann::json jsonBody = nlohmann::json::parse(req); // Assume req is JSON string
    DashboardUpdateRequest updateReq;
    updateReq.id = id;
    if (jsonBody.count("name")) updateReq.name = jsonBody.at("name").get<std::string>();
    if (jsonBody.count("description")) updateReq.description = jsonBody.at("description").get<std::string>();
    if (jsonBody.count("layoutJson")) updateReq.layoutJson = jsonBody.at("layoutJson").get<std::string>();
    return updateReq;
}

void DashboardHandler::sendDashboardResponse(const DashboardInfoResponse& dashboardRes, Http::Rest::Response& res, int statusCode) {
    nlohmann::json responseJson;
    responseJson["id"] = dashboardRes.id;
    responseJson["name"] = dashboardRes.name;
    responseJson["description"] = dashboardRes.description;
    responseJson["layoutJson"] = dashboardRes.layoutJson;
    responseJson["userId"] = dashboardRes.userId;

    res = responseJson.dump();
    Util::Logger::log(spdlog::level::debug, "DashboardHandler sending dashboard response. Status: {}", statusCode);
}

void DashboardHandler::sendDashboardsListResponse(const std::vector<DashboardInfoResponse>& dashboards, Http::Rest::Response& res, int statusCode) {
    nlohmann::json responseJson = nlohmann::json::array();
    for (const auto& db : dashboards) {
        responseJson.push_back({
            {"id", db.id},
            {"name", db.name},
            {"description", db.description},
            {"layoutJson", db.layoutJson},
            {"userId", db.userId}
        });
    }

    res = responseJson.dump();
    Util::Logger::log(spdlog::level::debug, "DashboardHandler sending dashboards list response. Status: {}", statusCode);
}

} // namespace API
} // namespace VisuFlow
```