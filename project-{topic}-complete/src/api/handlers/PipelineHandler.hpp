```cpp
#ifndef MLTOOLKIT_PIPELINE_HANDLER_HPP
#define MLTOOLKIT_PIPELINE_HANDLER_HPP

#include <crow.h>
#include "../../database/DBManager.hpp"
#include "../../database/models/Pipeline.hpp"
#include "../../ml_utils/MLProcessor.hpp" // For executing pipelines
#include "../../common/Logger.hpp"
#include "../../common/Exceptions.hpp"
#include "../../middleware/ErrorHandler.hpp"
#include "../../middleware/Cache.hpp" // To cache processed data

namespace MLToolkit {
namespace API {
namespace Handlers {

// Cache for processed pipeline results (optional, for demo)
// Cache key could be pipeline ID + dataset ID + hash of input data/params
// Value would be the processed matrix (or path to it).
// For simplicity, we'll cache the JSON string representation of the output matrix for demo.
// A real cache would store binary data or file paths.
extern Middleware::LRUCache<std::string, std::string> pipeline_result_cache;

class PipelineHandler {
public:
    // Create Pipeline (POST /api/v1/pipelines)
    static crow::response create_pipeline(const crow::request& req) {
        return Middleware::handle_exceptions([&]() {
            auto json_body = crow::json::load(req.body);
            if (!json_body) {
                throw Common::InvalidArgumentException("Invalid JSON body.");
            }
            
            Database::Models::Pipeline new_pipeline = Database::Models::Pipeline::from_json(json_body);
            
            if (new_pipeline.name.empty() || new_pipeline.steps.empty()) {
                throw Common::InvalidArgumentException("Pipeline name and steps are required.");
            }
            
            // Validate dataset_id exists
            if (new_pipeline.dataset_id > 0) {
                auto dataset_opt = Database::DBManager::get_instance().get_dataset(new_pipeline.dataset_id);
                if (!dataset_opt) {
                    throw Common::InvalidArgumentException("Associated dataset with ID " + std::to_string(new_pipeline.dataset_id) + " not found.");
                }
            }

            long id = Database::DBManager::get_instance().create_pipeline(new_pipeline);
            new_pipeline.id = id;
            
            LOG_INFO("Pipeline created with ID: {}", id);
            return crow::response(201, new_pipeline.to_json().dump());
        });
    }

    // Get All Pipelines (GET /api/v1/pipelines)
    static crow::response get_all_pipelines(const crow::request& /*req*/) {
        return Middleware::handle_exceptions([&]() {
            std::vector<Database::Models::Pipeline> pipelines = Database::DBManager::get_instance().get_all_pipelines();
            nlohmann::json json_response = nlohmann::json::array();
            for (const auto& p : pipelines) {
                json_response.push_back(p.to_json());
            }
            LOG_INFO("Retrieved {} pipelines.", pipelines.size());
            return crow::response(200, json_response.dump());
        });
    }

    // Get Pipeline by ID (GET /api/v1/pipelines/{id})
    static crow::response get_pipeline_by_id(long id) {
        return Middleware::handle_exceptions([&]() {
            auto pipeline_opt = Database::DBManager::get_instance().get_pipeline(id);
            if (!pipeline_opt) {
                throw Common::NotFoundException("Pipeline with ID " + std::to_string(id) + " not found.");
            }
            LOG_INFO("Retrieved pipeline with ID: {}", id);
            return crow::response(200, pipeline_opt->to_json().dump());
        });
    }

    // Update Pipeline (PUT /api/v1/pipelines/{id})
    static crow::response update_pipeline(long id, const crow::request& req) {
        return Middleware::handle_exceptions([&]() {
            auto json_body = crow::json::load(req.body);
            if (!json_body) {
                throw Common::InvalidArgumentException("Invalid JSON body.");
            }

            Database::Models::Pipeline updated_pipeline = Database::Models::Pipeline::from_json(json_body);
            updated_pipeline.id = id; // Ensure ID from URL is used

            if (updated_pipeline.name.empty() && !json_body.contains("name")) {
                 throw Common::InvalidArgumentException("Pipeline name cannot be empty.");
            }
            if (updated_pipeline.steps.empty() && !json_body.contains("steps")) {
                 throw Common::InvalidArgumentException("Pipeline steps cannot be empty.");
            }

            bool success = Database::DBManager::get_instance().update_pipeline(updated_pipeline);
            if (!success) {
                throw Common::NotFoundException("Pipeline with ID " + std::to_string(id) + " not found for update.");
            }
            // Invalidate cache if pipeline definition changes
            pipeline_result_cache.clear(); // Simple global clear for demo
            LOG_INFO("Pipeline updated for ID: {}", id);
            return crow::response(200, crow::json::wvalue({{"status", "success"}, {"message", "Pipeline updated successfully."}}).dump());
        });
    }

    // Delete Pipeline (DELETE /api/v1/pipelines/{id})
    static crow::response delete_pipeline(long id) {
        return Middleware::handle_exceptions([&]() {
            bool success = Database::DBManager::get_instance().delete_pipeline(id);
            if (!success) {
                throw Common::NotFoundException("Pipeline with ID " + std::to_string(id) + " not found for deletion.");
            }
            // Invalidate cache if pipeline is deleted
            pipeline_result_cache.clear(); // Simple global clear for demo
            LOG_INFO("Pipeline deleted for ID: {}", id);
            return crow::response(204); // No Content
        });
    }

    // Execute Pipeline (POST /api/v1/pipelines/{id}/execute)
    static crow::response execute_pipeline(long id, const crow::request& req) {
        return Middleware::handle_exceptions([&]() {
            auto json_body = crow::json::load(req.body);
            if (!json_body || !json_body.has("data")) {
                throw Common::InvalidArgumentException("Invalid JSON body. 'data' field (2D array of doubles) is required.");
            }
            
            // Parse input data (expecting a 2D array of doubles)
            std::vector<std::vector<double>> input_data_vec = json_body.at("data").get<std::vector<std::vector<double>>>();
            Core::MatrixXd X_raw = Core::vector_to_eigen_matrix(input_data_vec);

            // Fetch pipeline definition
            auto pipeline_opt = Database::DBManager::get_instance().get_pipeline(id);
            if (!pipeline_opt) {
                throw Common::NotFoundException("Pipeline with ID " + std::to_string(id) + " not found.");
            }
            Database::Models::Pipeline pipeline_def = *pipeline_opt; // Make a copy to modify metadata

            // Create a cache key based on pipeline ID and input data hash (simplified)
            std::string cache_key = "pipeline_result_" + std::to_string(id) + "_" + std::to_string(std::hash<std::string>{}(req.body));
            
            auto cached_result = pipeline_result_cache.get(cache_key);
            if (cached_result) {
                LOG_INFO("Pipeline result retrieved from cache for pipeline ID {}.", id);
                return crow::response(200, *cached_result); // Return cached JSON string
            }

            MLUtils::MLProcessor processor;
            Core::MatrixXd X_processed = processor.execute_pipeline(X_raw, pipeline_def); // Metadata gets updated here

            // Update pipeline metadata in DB if it changed
            if (pipeline_def.metadata != pipeline_opt->metadata) {
                Database::DBManager::get_instance().update_pipeline(pipeline_def);
                LOG_DEBUG("Pipeline metadata updated in DB after execution.");
            }

            // Convert processed matrix back to JSON for response
            nlohmann::json result_json = Core::eigen_matrix_to_vector(X_processed);
            std::string response_body = result_json.dump();

            // Cache the result
            pipeline_result_cache.put(cache_key, response_body);
            
            LOG_INFO("Pipeline ID {} executed successfully. Output dimensions: {}x{}.", id, X_processed.rows(), X_processed.cols());
            return crow::response(200, response_body);
        });
    }

    // Evaluate Model using a Pipeline (POST /api/v1/models/{model_id}/evaluate)
    static crow::response evaluate_model(long model_id, const crow::request& req) {
        return Middleware::handle_exceptions([&]() {
            auto json_body = crow::json::load(req.body);
            if (!json_body || !json_body.has("data") || !json_body.has("true_labels") || !json_body.has("pipeline_id")) {
                throw Common::InvalidArgumentException("Invalid JSON body. 'data' (2D array), 'true_labels' (1D array), and 'pipeline_id' are required.");
            }

            // 1. Get Model
            auto model_opt = Database::DBManager::get_instance().get_model(model_id);
            if (!model_opt) {
                throw Common::NotFoundException("Model with ID " + std::to_string(model_id) + " not found.");
            }
            // In a real app, load the model artifact (e.g., weights) using model_opt->artifact_path

            // 2. Get Pipeline
            long pipeline_id = json_body.at("pipeline_id").get<long>();
            auto pipeline_opt = Database::DBManager::get_instance().get_pipeline(pipeline_id);
            if (!pipeline_opt) {
                throw Common::NotFoundException("Pipeline with ID " + std::to_string(pipeline_id) + " not found.");
            }
            Database::Models::Pipeline pipeline_def = *pipeline_opt; // Copy to allow metadata modification

            // 3. Process Input Data using Pipeline
            std::vector<std::vector<double>> input_data_vec = json_body.at("data").get<std::vector<std::vector<double>>>();
            Core::MatrixXd X_raw = Core::vector_to_eigen_matrix(input_data_vec);
            
            MLUtils::MLProcessor processor;
            Core::MatrixXd X_processed = processor.execute_pipeline(X_raw, pipeline_def);

            // 4. Get True Labels
            std::vector<double> y_true_vec = json_body.at("true_labels").get<std::vector<double>>();
            Core::VectorXd y_true = Core::VectorXd::Map(y_true_vec.data(), y_true_vec.size());

            // 5. Make Predictions (using dummy predict for now)
            Core::VectorXd y_pred = processor.predict(X_processed, model_id); // In real app: use loaded model

            if (y_true.size() != y_pred.size()) {
                throw Common::MLUtilityException("True labels and predicted labels have mismatched sizes for evaluation.");
            }

            // 6. Evaluate Metrics
            nlohmann::json metrics = processor.evaluate_regression_model(y_true, y_pred);

            // 7. Store metrics in model metadata (optional)
            model_opt->metadata["last_evaluation"] = metrics;
            model_opt->metadata["last_evaluation_timestamp"] = std::time(nullptr);
            Database::DBManager::get_instance().update_model(*model_opt);
            LOG_INFO("Model ID {} evaluated with Pipeline ID {}. Metrics stored.", model_id, pipeline_id);

            return crow::response(200, metrics.dump());
        });
    }
};

} // namespace Handlers
} // namespace API
} // namespace MLToolkit

#endif // MLTOOLKIT_PIPELINE_HANDLER_HPP
```