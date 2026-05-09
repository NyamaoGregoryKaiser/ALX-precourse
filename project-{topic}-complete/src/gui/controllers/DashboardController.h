```cpp
#ifndef VISUFLOW_DASHBOARD_CONTROLLER_H
#define VISUFLOW_DASHBOARD_CONTROLLER_H

#include "api/dto/DataTransferObjects.h"
#include "data/processor/DataProcessor.h" // For ProcessingConfig struct
#include "util/Logger.h"

#include <string>
#include <vector>
#include <map>
#include <memory>

// Forward declarations for mock HTTP Client
namespace Http {
    class Client {
    public:
        Client(const std::string& baseUrl) : m_baseUrl(baseUrl) {}
        std::string get(const std::string& path, const std::map<std::string, std::string>& headers = {});
        std::string post(const std::string& path, const std::string& body, const std::map<std::string, std::string>& headers = {});
    private:
        std::string m_baseUrl;
    };
}

namespace VisuFlow {
namespace GUI {

/**
 * @brief Manages the interaction between the GUI and the VisuFlow API for dashboard operations.
 */
class DashboardController {
public:
    DashboardController();

    /**
     * @brief Fetches the configuration for a specific dashboard from the API.
     * @param dashboardId The ID of the dashboard.
     * @param token The user's authentication token.
     * @return DashboardInfoResponse containing dashboard metadata and layout.
     * @throws Util::APIException if API call fails.
     */
    API::DashboardInfoResponse fetchDashboardConfig(long long dashboardId, const std::string& token);

    /**
     * @brief Fetches and processes data for a specific visualization.
     * This method calls the backend API to retrieve data based on a data source ID and processing config.
     * @param dataSourceId The ID of the data source.
     * @param config The processing configuration (grouping, aggregation, filters).
     * @param token The user's authentication token.
     * @return ProcessedDataResponse containing the data ready for visualization.
     * @throws Util::APIException if API call fails.
     */
    API::ProcessedDataResponse fetchProcessedData(long long dataSourceId,
                                                const Data::Processor::ProcessingConfig& config,
                                                const std::string& token);

    // Other CRUD operations for dashboards and data sources could be added here.

private:
    std::unique_ptr<Http::Client> m_apiClient; // Conceptual HTTP client

    // Helper functions for API client interaction and response parsing
    template<typename T>
    T parseApiResponse(const std::string& jsonResponse);

    std::map<std::string, std::string> buildAuthHeaders(const std::string& token);
};

} // namespace GUI
} // namespace VisuFlow

#endif // VISUFLOW_DASHBOARD_CONTROLLER_H
```