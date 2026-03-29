```cpp
#ifndef DATAVIZ_VISUALIZATIONROUTES_H
#define DATAVIZ_VISUALIZATIONROUTES_H

#include <crow.h>
#include <memory>
#include "../../db/VisualizationRepository.h"
#include "../../db/DatasetRepository.h"
#include "../../data/DataProcessor.h"
#include "../utils/JsonUtils.h"
#include "../../utils/Logger.h"
#include "../middleware/AuthMiddleware.h" // For AuthContext

class VisualizationRoutes {
public:
    template <typename App>
    static void setupRoutes(App& app,
                            std::shared_ptr<VisualizationRepository> viz_repo,
                            std::shared_ptr<DatasetRepository> dataset_repo,
                            std::shared_ptr<DataProcessor> data_processor);
};

template <typename App>
void VisualizationRoutes::setupRoutes(App& app,
                                     std::shared_ptr<VisualizationRepository> viz_repo,
                                     std::shared_ptr<DatasetRepository> dataset_repo,
                                     std::shared_ptr<DataProcessor> data_processor) {

    // Helper for authorization and error responses
    auto sendAuthError = [](crow::response& res, const std::string& msg, int code = 403) {
        res.code = code;
        res.write(JsonUtils::createErrorResponse(msg, code).dump());
        res.end();
    };

    // Get all visualizations for the current user
    CROW_ROUTE(app, "/api/visualizations")
        .middlewares<App, AuthMiddleware>()
        .methods("GET"_method)
        ([viz_repo](const crow::request& req, crow::response& res, AuthContext& ctx) {
            if (!ctx.is_authenticated) { sendAuthError(res, "Authentication required.", 401); return; }

            std::vector<Visualization> visualizations;
            if (ctx.user_role == "admin") {
                visualizations = viz_repo->findAll(); // Admin can see all
            } else {
                visualizations = viz_repo->findByUserId(ctx.current_user.getId().value());
            }

            json data = json::array();
            for (const auto& viz : visualizations) {
                data.push_back(viz.toJson());
            }
            res.code = 200;
            res.write(JsonUtils::createSuccessResponse("Visualizations retrieved successfully.", data).dump());
        });

    // Get a specific visualization by ID
    CROW_ROUTE(app, "/api/visualizations/<int>")
        .middlewares<App, AuthMiddleware>()
        .methods("GET"_method)
        ([viz_repo](const crow::request& req, crow::response& res, AuthContext& ctx, int viz_id) {
            if (!ctx.is_authenticated) { sendAuthError(res, "Authentication required.", 401); return; }

            auto viz_opt = viz_repo->findById(viz_id);
            if (!viz_opt) {
                res.code = 404;
                res.write(JsonUtils::createErrorResponse("Visualization not found.", 404).dump());
                return;
            }

            if (!AuthMiddleware::authorize_owner(ctx, viz_opt->getUserId())) {
                sendAuthError(res, "Forbidden: You do not own this visualization.", 403);
                return;
            }

            res.code = 200;
            res.write(JsonUtils::createSuccessResponse("Visualization retrieved successfully.", viz_opt->toJson()).dump());
        });

    // Create a new visualization
    CROW_ROUTE(app, "/api/visualizations")
        .middlewares<App, AuthMiddleware>()
        .methods("POST"_method)
        ([viz_repo, dataset_repo](const crow::request& req, crow::response& res, AuthContext& ctx) {
            if (!ctx.is_authenticated) { sendAuthError(res, "Authentication required.", 401); return; }

            json req_body;
            if (!JsonUtils::parseRequestBody(req, req_body, res)) {
                return;
            }

            if (!req_body.contains("datasetId") || !req_body.contains("name") || !req_body.contains("chartType") || !req_body.contains("config")) {
                res.code = 400;
                res.write(JsonUtils::createErrorResponse("Dataset ID, name, chart type, and config are required.", 400).dump());
                return;
            }

            int dataset_id = req_body["datasetId"].get<int>();
            // Verify dataset exists and user owns it
            auto dataset_opt = dataset_repo->findById(dataset_id);
            if (!dataset_opt) {
                res.code = 404;
                res.write(JsonUtils::createErrorResponse("Referenced dataset not found.", 404).dump());
                return;
            }
            if (!AuthMiddleware::authorize_owner(ctx, dataset_opt->getUserId())) {
                sendAuthError(res, "Forbidden: You do not own the referenced dataset.", 403);
                return;
            }

            std::string name = req_body["name"].get<std::string>();
            std::string description = req_body.value("description", "");
            std::string chart_type = req_body["chartType"].get<std::string>();
            json config = req_body["config"];

            Visualization new_viz(ctx.current_user.getId().value(), dataset_id, name, description, chart_type, config);

            if (auto created_viz = viz_repo->create(new_viz)) {
                res.code = 201;
                res.write(JsonUtils::createSuccessResponse("Visualization created successfully.", created_viz->toJson()).dump());
            } else {
                res.code = 500;
                res.write(JsonUtils::createErrorResponse("Failed to create visualization.", 500).dump());
            }
        });

    // Update a visualization
    CROW_ROUTE(app, "/api/visualizations/<int>")
        .middlewares<App, AuthMiddleware>()
        .methods("PUT"_method)
        ([viz_repo, dataset_repo](const crow::request& req, crow::response& res, AuthContext& ctx, int viz_id) {
            if (!ctx.is_authenticated) { sendAuthError(res, "Authentication required.", 401); return; }

            auto viz_opt = viz_repo->findById(viz_id);
            if (!viz_opt) {
                res.code = 404;
                res.write(JsonUtils::createErrorResponse("Visualization not found.", 404).dump());
                return;
            }

            if (!AuthMiddleware::authorize_owner(ctx, viz_opt->getUserId())) {
                sendAuthError(res, "Forbidden: You do not own this visualization.", 403);
                return;
            }

            json req_body;
            if (!JsonUtils::parseRequestBody(req, req_body, res)) {
                return;
            }

            // Update fields if present
            if (req_body.contains("name")) viz_opt->setName(req_body["name"].get<std::string>());
            if (req_body.contains("description")) viz_opt->setDescription(req_body["description"].get<std::string>());
            if (req_body.contains("chartType")) viz_opt->setChartType(req_body["chartType"].get<std::string>());
            if (req_body.contains("config")) viz_opt->setConfig(req_body["config"]);
            
            // If datasetId is updated, verify ownership of the new dataset
            if (req_body.contains("datasetId")) {
                int new_dataset_id = req_body["datasetId"].get<int>();
                auto new_dataset_opt = dataset_repo->findById(new_dataset_id);
                if (!new_dataset_opt) {
                    res.code = 400;
                    res.write(JsonUtils::createErrorResponse("New dataset not found.", 400).dump());
                    return;
                }
                if (!AuthMiddleware::authorize_owner(ctx, new_dataset_opt->getUserId())) {
                    sendAuthError(res, "Forbidden: You do not own the new referenced dataset.", 403);
                    return;
                }
                viz_opt->setDatasetId(new_dataset_id);
            }

            if (viz_repo->update(viz_opt.value())) {
                res.code = 200;
                res.write(JsonUtils::createSuccessResponse("Visualization updated successfully.", viz_opt->toJson()).dump());
            } else {
                res.code = 500;
                res.write(JsonUtils::createErrorResponse("Failed to update visualization.", 500).dump());
            }
        });

    // Delete a visualization
    CROW_ROUTE(app, "/api/visualizations/<int>")
        .middlewares<App, AuthMiddleware>()
        .methods("DELETE"_method)
        ([viz_repo](const crow::request& req, crow::response& res, AuthContext& ctx, int viz_id) {
            if (!ctx.is_authenticated) { sendAuthError(res, "Authentication required.", 401); return; }

            auto viz_opt = viz_repo->findById(viz_id);
            if (!viz_opt) {
                res.code = 404;
                res.write(JsonUtils::createErrorResponse("Visualization not found.", 404).dump());
                return;
            }

            if (!AuthMiddleware::authorize_owner(ctx, viz_opt->getUserId())) {
                sendAuthError(res, "Forbidden: You do not own this visualization.", 403);
                return;
            }

            if (viz_repo->remove(viz_id)) {
                res.code = 200;
                res.write(JsonUtils::createSuccessResponse("Visualization deleted successfully.").dump());
            } else {
                res.code = 500;
                res.write(JsonUtils::createErrorResponse("Failed to delete visualization.", 500).dump());
            }
        });

    Logger::info("Visualization routes registered.");
}

#endif // DATAVIZ_VISUALIZATIONROUTES_H
```