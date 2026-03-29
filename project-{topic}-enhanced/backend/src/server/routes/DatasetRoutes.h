```cpp
#ifndef DATAVIZ_DATASETROUTES_H
#define DATAVIZ_DATASETROUTES_H

#include <crow.h>
#include <memory>
#include "../../db/DatasetRepository.h"
#include "../../db/UserRepository.h" // For AuthMiddleware
#include "../../data/DatasetManager.h"
#include "../../data/DataProcessor.h"
#include "../utils/JsonUtils.h"
#include "../../utils/Logger.h"
#include "../middleware/AuthMiddleware.h" // For AuthContext

class DatasetRoutes {
public:
    template <typename App>
    static void setupRoutes(App& app,
                            std::shared_ptr<DatasetRepository> dataset_repo,
                            std::shared_ptr<DatasetManager> dataset_manager,
                            std::shared_ptr<DataProcessor> data_processor);
};

template <typename App>
void DatasetRoutes::setupRoutes(App& app,
                                std::shared_ptr<DatasetRepository> dataset_repo,
                                std::shared_ptr<DatasetManager> dataset_manager,
                                std::shared_ptr<DataProcessor> data_processor) {

    // Helper for authorization and error responses
    auto sendAuthError = [](crow::response& res, const std::string& msg, int code = 403) {
        res.code = code;
        res.write(JsonUtils::createErrorResponse(msg, code).dump());
        res.end();
    };

    // Get all datasets (Admin or User's own)
    CROW_ROUTE(app, "/api/datasets")
        .middlewares<App, AuthMiddleware>() // Protect this route
        .methods("GET"_method)
        ([dataset_repo](const crow::request& req, crow::response& res, AuthContext& ctx) {
            if (!ctx.is_authenticated) { sendAuthError(res, "Authentication required.", 401); return; }

            std::vector<Dataset> datasets;
            if (ctx.user_role == "admin") {
                datasets = dataset_repo->findAll();
            } else {
                datasets = dataset_repo->findByUserId(ctx.current_user.getId().value());
            }

            json data = json::array();
            for (const auto& ds : datasets) {
                data.push_back(ds.toJson());
            }
            res.code = 200;
            res.write(JsonUtils::createSuccessResponse("Datasets retrieved successfully.", data).dump());
        });

    // Get a specific dataset by ID
    CROW_ROUTE(app, "/api/datasets/<int>")
        .middlewares<App, AuthMiddleware>()
        .methods("GET"_method)
        ([dataset_repo](const crow::request& req, crow::response& res, AuthContext& ctx, int dataset_id) {
            if (!ctx.is_authenticated) { sendAuthError(res, "Authentication required.", 401); return; }

            auto dataset_opt = dataset_repo->findById(dataset_id);
            if (!dataset_opt) {
                res.code = 404;
                res.write(JsonUtils::createErrorResponse("Dataset not found.", 404).dump());
                return;
            }

            if (!AuthMiddleware::authorize_owner(ctx, dataset_opt->getUserId())) {
                sendAuthError(res, "Forbidden: You do not own this dataset.", 403);
                return;
            }

            res.code = 200;
            res.write(JsonUtils::createSuccessResponse("Dataset retrieved successfully.", dataset_opt->toJson()).dump());
        });

    // Upload a new dataset (requires file upload mechanism)
    // For simplicity, this example assumes the 'content' of the file is directly in the request body
    // In a real app, you'd handle multipart/form-data for file uploads.
    CROW_ROUTE(app, "/api/datasets")
        .middlewares<App, AuthMiddleware>()
        .methods("POST"_method)
        ([dataset_repo, dataset_manager](const crow::request& req, crow::response& res, AuthContext& ctx) {
            if (!ctx.is_authenticated) { sendAuthError(res, "Authentication required.", 401); return; }

            json req_body;
            if (!JsonUtils::parseRequestBody(req, req_body, res)) {
                return;
            }

            if (!req_body.contains("name") || !req_body.contains("fileContent") || !req_body.contains("fileName") || !req_body.contains("fileType")) {
                res.code = 400;
                res.write(JsonUtils::createErrorResponse("Name, fileName, fileType, and fileContent are required.", 400).dump());
                return;
            }

            std::string name = req_body["name"].get<std::string>();
            std::string description = req_body.value("description", "");
            std::string file_name = req_body["fileName"].get<std::string>();
            std::string file_content = req_body["fileContent"].get<std::string>();
            std::string file_type = req_body["fileType"].get<std::string>(); // e.g., "csv"

            if (file_type != "csv") { // Extend for other types
                res.code = 400;
                res.write(JsonUtils::createErrorResponse("Only 'csv' file type is currently supported.", 400).dump());
                return;
            }

            // Save the file
            std::string stored_filepath = dataset_manager->saveFile(file_name, file_content);
            if (stored_filepath.empty()) {
                res.code = 500;
                res.write(JsonUtils::createErrorResponse("Failed to save dataset file.", 500).dump());
                return;
            }
            
            // Try to infer columns from the saved file
            auto inferred_data_opt = dataset_manager->loadCsvFile(stored_filepath);
            if (!inferred_data_opt) {
                dataset_manager->deleteFile(stored_filepath); // Clean up
                res.code = 400;
                res.write(JsonUtils::createErrorResponse("Failed to parse CSV file content. Ensure it's valid.", 400).dump());
                return;
            }
            auto inferred_columns = dataset_manager->inferColumns(inferred_data_opt.value());

            Dataset new_dataset(ctx.current_user.getId().value(), name, description, stored_filepath, file_type);
            new_dataset.setColumns(inferred_columns); // Set the inferred columns metadata

            if (auto created_dataset = dataset_repo->create(new_dataset)) {
                // Cache the data table after successful creation
                dataset_manager->getOrLoadData(created_dataset->getId().value(), created_dataset->getFilePath());
                dataset_manager->getOrInferColumns(created_dataset->getId().value(), created_dataset->getFilePath());

                res.code = 201;
                res.write(JsonUtils::createSuccessResponse("Dataset uploaded and metadata created.", created_dataset->toJson()).dump());
            } else {
                dataset_manager->deleteFile(stored_filepath); // Clean up file if DB creation failed
                res.code = 500;
                res.write(JsonUtils::createErrorResponse("Failed to create dataset metadata in database.", 500).dump());
            }
        });

    // Update a dataset
    CROW_ROUTE(app, "/api/datasets/<int>")
        .middlewares<App, AuthMiddleware>()
        .methods("PUT"_method)
        ([dataset_repo, dataset_manager](const crow::request& req, crow::response& res, AuthContext& ctx, int dataset_id) {
            if (!ctx.is_authenticated) { sendAuthError(res, "Authentication required.", 401); return; }

            auto dataset_opt = dataset_repo->findById(dataset_id);
            if (!dataset_opt) {
                res.code = 404;
                res.write(JsonUtils::createErrorResponse("Dataset not found.", 404).dump());
                return;
            }

            if (!AuthMiddleware::authorize_owner(ctx, dataset_opt->getUserId())) {
                sendAuthError(res, "Forbidden: You do not own this dataset.", 403);
                return;
            }

            json req_body;
            if (!JsonUtils::parseRequestBody(req, req_body, res)) {
                return;
            }

            // Update only allowed fields
            if (req_body.contains("name")) dataset_opt->setName(req_body["name"].get<std::string>());
            if (req_body.contains("description")) dataset_opt->setDescription(req_body["description"].get<std::string>());
            // file_path and file_type are not typically updated directly, but through a new upload process.
            // If new file content is provided, need to handle re-saving and updating file_path, and invalidating cache.
            // For now, assume no file content update via PUT.

            if (dataset_repo->update(dataset_opt.value())) {
                // Clear cache if metadata might have changed (e.g., if new file uploaded implied or schema adjusted)
                dataset_manager->clearCache(dataset_id);
                res.code = 200;
                res.write(JsonUtils::createSuccessResponse("Dataset updated successfully.", dataset_opt->toJson()).dump());
            } else {
                res.code = 500;
                res.write(JsonUtils::createErrorResponse("Failed to update dataset.", 500).dump());
            }
        });

    // Delete a dataset
    CROW_ROUTE(app, "/api/datasets/<int>")
        .middlewares<App, AuthMiddleware>()
        .methods("DELETE"_method)
        ([dataset_repo, dataset_manager](const crow::request& req, crow::response& res, AuthContext& ctx, int dataset_id) {
            if (!ctx.is_authenticated) { sendAuthError(res, "Authentication required.", 401); return; }

            auto dataset_opt = dataset_repo->findById(dataset_id);
            if (!dataset_opt) {
                res.code = 404;
                res.write(JsonUtils::createErrorResponse("Dataset not found.", 404).dump());
                return;
            }

            if (!AuthMiddleware::authorize_owner(ctx, dataset_opt->getUserId())) {
                sendAuthError(res, "Forbidden: You do not own this dataset.", 403);
                return;
            }

            // First, delete the file from storage
            dataset_manager->deleteFile(dataset_opt->getFilePath());
            // Then, clear cache
            dataset_manager->clearCache(dataset_id);

            // Finally, delete metadata from DB
            if (dataset_repo->remove(dataset_id)) {
                res.code = 200;
                res.write(JsonUtils::createSuccessResponse("Dataset deleted successfully.").dump());
            } else {
                res.code = 500;
                res.write(JsonUtils::createErrorResponse("Failed to delete dataset metadata.", 500).dump());
            }
        });

    // Get processed data for a dataset
    CROW_ROUTE(app, "/api/datasets/<int>/data")
        .middlewares<App, AuthMiddleware>()
        .methods("POST"_method) // POST for complex query body
        ([dataset_repo, dataset_manager, data_processor](const crow::request& req, crow::response& res, AuthContext& ctx, int dataset_id) {
            if (!ctx.is_authenticated) { sendAuthError(res, "Authentication required.", 401); return; }

            auto dataset_opt = dataset_repo->findById(dataset_id);
            if (!dataset_opt) {
                res.code = 404;
                res.write(JsonUtils::createErrorResponse("Dataset not found.", 404).dump());
                return;
            }

            if (!AuthMiddleware::authorize_owner(ctx, dataset_opt->getUserId())) {
                sendAuthError(res, "Forbidden: You do not own this dataset.", 403);
                return;
            }

            json req_body_json;
            if (!JsonUtils::parseRequestBody(req, req_body_json, res)) {
                return;
            }

            // Parse DataRequest from JSON body
            auto data_request_opt = DataRequest::fromJson(req_body_json);
            if (!data_request_opt) {
                res.code = 400;
                res.write(JsonUtils::createErrorResponse("Invalid data processing request format.", 400).dump());
                return;
            }
            DataRequest data_request = *data_request_opt;
            data_request.dataset_id = dataset_id; // Ensure dataset ID matches URL parameter

            // Get raw data and column metadata
            auto raw_data_opt = dataset_manager->getOrLoadData(dataset_id, dataset_opt->getFilePath());
            if (!raw_data_opt) {
                res.code = 500;
                res.write(JsonUtils::createErrorResponse("Failed to load raw data for processing.", 500).dump());
                return;
            }

            auto columns_metadata_opt = dataset_manager->getOrInferColumns(dataset_id, dataset_opt->getFilePath());
            if (!columns_metadata_opt) {
                res.code = 500;
                res.write(JsonUtils::createErrorResponse("Failed to retrieve column metadata for processing.", 500).dump());
                return;
            }

            // Process data
            auto processed_data_opt = data_processor->processData(raw_data_opt.value(), columns_metadata_opt.value(), data_request);
            if (!processed_data_opt) {
                res.code = 500;
                res.write(JsonUtils::createErrorResponse("Failed to process data.", 500).dump());
                return;
            }

            res.code = 200;
            res.write(JsonUtils::createSuccessResponse("Data processed successfully.", processed_data_opt->toJson()).dump());
        });


    Logger::info("Dataset routes registered.");
}

#endif // DATAVIZ_DATASETROUTES_H
```