```cpp
#ifndef VISUFLOW_DASHBOARD_HANDLER_H
#define VISUFLOW_DASHBOARD_HANDLER_H

#include "data/db/repositories/DashboardRepository.h"
#include "util/Logger.h"
#include "api/dto/DataTransferObjects.h"

#include <string>
#include <vector>
#include <map>

// Forward declarations for mock HTTP types
namespace Http {
    namespace Rest {
        using Request = std::string;
        using Response = std::string;
    }
}

namespace VisuFlow {
namespace API {

/**
 * @brief Handles dashboard-related API requests (CRUD operations).
 */
class DashboardHandler {
public:
    DashboardHandler();

    void getAllDashboards(const Http::Rest::Request& req, Http::Rest::Response& res);
    void getDashboardById(const Http::Rest::Request& req, Http::Rest::Response& res);
    void createDashboard(const Http::Rest::Request& req, Http::Rest::Response& res);
    void updateDashboard(const Http::Rest::Request& req, Http::Rest::Response& res);
    void deleteDashboard(const Http::Rest::Request& req, Http::Rest::Response& res);

private:
    Data::DB::DashboardRepository m_dashboardRepository;

    // Helper functions for parsing and sending responses
    DashboardCreateRequest parseCreateRequest(const Http::Rest::Request& req);
    DashboardUpdateRequest parseUpdateRequest(long long id, const Http::Rest::Request& req);
    long long extractDashboardId(const Http::Rest::Request& req); // For extracting from URL like /dashboards/:id

    void sendDashboardResponse(const DashboardInfoResponse& dashboardRes, Http::Rest::Response& res, int statusCode = 200);
    void sendDashboardsListResponse(const std::vector<DashboardInfoResponse>& dashboards, Http::Rest::Response& res, int statusCode = 200);
};

} // namespace API
} // namespace VisuFlow

#endif // VISUFLOW_DASHBOARD_HANDLER_H
```