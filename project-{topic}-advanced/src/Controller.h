```cpp
#ifndef VISGENIUS_CONTROLLER_H
#define VISGENIUS_CONTROLLER_H

#include <memory>
#include <string>
#include <vector>
#include <map>
#include <chrono>

#include "Models.h"
#include "Database.h"
#include "DataProcessor.h"
#include "VisualizationEngine.h"
#include "AuthManager.h"
#include "Cache.h"
#include "Logger.h"
#include "HttpUtils.h"
#include "ErrorHandling.h"

// Forward declaration of nlohmann::json (assuming it's a dependency for JSON handling)
// #include <nlohmann/json.hpp>
// namespace nlohmann { class json; }

// --- Request/Response DTOs (Data Transfer Objects) ---
// These would typically be mapped to/from JSON.
// For this example, we use simple std::map<string,string> or direct parsing from HttpRequest.body
// and manually construct HttpResponse.body.

namespace VisGenius {

class Controller {
public:
    Controller(
        std::shared_ptr<Database> db,
        std::shared_ptr<DataProcessor> data_processor,
        std::shared_ptr<VisualizationEngine> viz_engine,
        std::shared_ptr<AuthManager> auth_manager,
        std::shared_ptr<Cache<DataTable>> data_cache,
        std::shared_ptr<Cache<ChartData>> chart_cache
    );

    // --- Authentication Endpoints ---
    HttpResponse handleLogin(const HttpRequest& request);
    HttpResponse handleRegister(const HttpRequest& request);

    // --- Data Source Endpoints ---
    HttpResponse handleCreateDataSource(const HttpRequest& request, const AuthToken& auth);
    HttpResponse handleGetAllDataSources(const HttpRequest& request, const AuthToken& auth);
    HttpResponse handleGetDataSource(const HttpRequest& request, const AuthToken& auth);
    HttpResponse handleUpdateDataSource(const HttpRequest& request, const AuthToken& auth);
    HttpResponse handleDeleteDataSource(const HttpRequest& request, const AuthToken& auth);

    // --- Visualization Endpoints ---
    HttpResponse handleCreateVisualization(const HttpRequest& request, const AuthToken& auth);
    HttpResponse handleGetAllVisualizations(const HttpRequest& request, const AuthToken& auth);
    HttpResponse handleGetVisualization(const HttpRequest& request, const AuthToken& auth);
    HttpResponse handleUpdateVisualization(const HttpRequest& request, const AuthToken& auth);
    HttpResponse handleDeleteVisualization(const HttpRequest& request, const AuthToken& auth);
    HttpResponse handleGetVisualizationData(const HttpRequest& request, const AuthToken& auth);

    // --- Dashboard Endpoints ---
    HttpResponse handleCreateDashboard(const HttpRequest& request, const AuthToken& auth);
    HttpResponse handleGetAllDashboards(const HttpRequest& request, const AuthToken& auth);
    HttpResponse handleGetDashboard(const HttpRequest& request, const AuthToken& auth);
    HttpResponse handleUpdateDashboard(const HttpRequest& request, const AuthToken& auth);
    HttpResponse handleDeleteDashboard(const HttpRequest& request, const AuthToken& auth);

private:
    std::shared_ptr<Database> m_db;
    std::shared_ptr<DataProcessor> m_dataProcessor;
    std::shared_ptr<VisualizationEngine> m_vizEngine;
    std::shared_ptr<AuthManager> m_authManager;
    std::shared_ptr<Cache<DataTable>> m_dataCache;
    std::shared_ptr<Cache<ChartData>> m_chartCache;

    // Helper to parse JSON body (string to map<string, string>)
    std::map<std::string, std::string> parseJsonBodyToMap(const std::string& json_str) const;

    // Helper to convert map to JSON string
    std::string mapToJsonString(const std::map<std::string, std::string>& data_map) const;

    // Helper to convert DataSources vector to JSON array string
    std::string dataSourcesToJsonArray(const std::vector<DataSource>& dss) const;
    std::string visualizationToJson(const Visualization& viz) const;
    std::string visualizationsToJsonArray(const std::vector<Visualization>& vizs) const;
    std::string dashboardToJson(const Dashboard& dash) const;
    std::string dashboardsToJsonArray(const std::vector<Dashboard>& dashes) const;
    std::string userToJson(const User& user) const;
    std::string chartDataToJson(const ChartData& chart_data) const;
    std::string fieldDefinitionToJsonArray(const std::vector<FieldDefinition>& schema) const;

    // Utility for creating error responses
    HttpResponse createErrorResponse(ErrorCode code, const std::string& message, int http_status = 500) const;
    HttpResponse createSuccessResponse(const std::string& body, int http_status = 200) const;

    // Check authorization helper
    bool checkAuthorization(const AuthToken& auth, const std::string& required_role, HttpResponse& response) const;
    bool checkAuthAndGetId(const HttpRequest& request, const AuthToken& auth, int& id, HttpResponse& response) const;
};

} // namespace VisGenius

#endif // VISGENIUS_CONTROLLER_H
```