```cpp
#ifndef MLTOOLKIT_MODEL_HANDLER_HPP
#define MLTOOLKIT_MODEL_HANDLER_HPP

#include <crow.h>
#include "../../database/DBManager.hpp"
#include "../../database/models/Model.hpp"
#include "../../common/Logger.hpp"
#include "../../common/Exceptions.hpp"
#include "../../middleware/ErrorHandler.hpp"

namespace MLToolkit {
namespace API {
namespace Handlers {

class ModelHandler {
public:
    // Create Model (POST /api/v1/models)
    static crow::response create_model(const crow::request& req) {
        return Middleware::handle_exceptions([&]() {
            auto json_body = crow::json::load(req.body);
            if (!json_body) {
                throw Common::InvalidArgumentException("Invalid JSON body.");
            }
            
            Database::Models::Model new_model = Database::Models::Model::from_json(json_body);
            
            if (new_model.name.empty() || new_model.artifact_path.empty() || new_model.type == Database::Models::ModelType::UNKNOWN) {
                throw Common::InvalidArgumentException("Model name, artifact_path, and type are required.");
            }
            
            // Validate dataset_id exists
            if (new_model.dataset_id > 0) {
                auto dataset_opt = Database::DBManager::get_instance().get_dataset(new_model.dataset_id);
                if (!dataset_opt) {
                    throw Common::InvalidArgumentException("Associated dataset with ID " + std::to_string(new_model.dataset_id) + " not found.");
                }
            }

            long id = Database::DBManager::get_instance().create_model(new_model);
            new_model.id = id;
            
            LOG_INFO("Model created with ID: {}", id);
            return crow::response(201, new_model.to_json().dump());
        });
    }

    // Get All Models (GET /api/v1/models)
    static crow::response get_all_models(const crow::request& /*req*/) {
        return Middleware::handle_exceptions([&]() {
            std::vector<Database::Models::Model> models = Database::DBManager::get_instance().get_all_models();
            nlohmann::json json_response = nlohmann::json::array();
            for (const auto& m : models) {
                json_response.push_back(m.to_json());
            }
            LOG_INFO("Retrieved {} models.", models.size());
            return crow::response(200, json_response.dump());
        });
    }

    // Get Model by ID (GET /api/v1/models/{id})
    static crow::response get_model_by_id(long id) {
        return Middleware::handle_exceptions([&]() {
            auto model_opt = Database::DBManager::get_instance().get_model(id);
            if (!model_opt) {
                throw Common::NotFoundException("Model with ID " + std::to_string(id) + " not found.");
            }
            LOG_INFO("Retrieved model with ID: {}", id);
            return crow::response(200, model_opt->to_json().dump());
        });
    }

    // Update Model (PUT /api/v1/models/{id})
    static crow::response update_model(long id, const crow::request& req) {
        return Middleware::handle_exceptions([&]() {
            auto json_body = crow::json::load(req.body);
            if (!json_body) {
                throw Common::InvalidArgumentException("Invalid JSON body.");
            }

            Database::Models::Model updated_model = Database::Models::Model::from_json(json_body);
            updated_model.id = id; // Ensure ID from URL is used

            if (updated_model.name.empty() && !json_body.contains("name")) {
                 throw Common::InvalidArgumentException("Model name cannot be empty.");
            }
            if (updated_model.artifact_path.empty() && !json_body.contains("artifact_path")) {
                 throw Common::InvalidArgumentException("Model artifact_path cannot be empty.");
            }
            if (updated_model.type == Database::Models::ModelType::UNKNOWN && !json_body.contains("type")) {
                 throw Common::InvalidArgumentException("Model type cannot be UNKNOWN.");
            }

            bool success = Database::DBManager::get_instance().update_model(updated_model);
            if (!success) {
                throw Common::NotFoundException("Model with ID " + std::to_string(id) + " not found for update.");
            }
            LOG_INFO("Model updated for ID: {}", id);
            return crow::response(200, crow::json::wvalue({{"status", "success"}, {"message", "Model updated successfully."}}).dump());
        });
    }

    // Delete Model (DELETE /api/v1/models/{id})
    static crow::response delete_model(long id) {
        return Middleware::handle_exceptions([&]() {
            bool success = Database::DBManager::get_instance().delete_model(id);
            if (!success) {
                throw Common::NotFoundException("Model with ID " + std::to_string(id) + " not found for deletion.");
            }
            LOG_INFO("Model deleted for ID: {}", id);
            return crow::response(204); // No Content
        });
    }
};

} // namespace Handlers
} // namespace API
} // namespace MLToolkit

#endif // MLTOOLKIT_MODEL_HANDLER_HPP
```