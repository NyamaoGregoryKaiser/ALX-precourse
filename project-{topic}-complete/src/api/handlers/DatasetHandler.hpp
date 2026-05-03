```cpp
#ifndef MLTOOLKIT_DATASET_HANDLER_HPP
#define MLTOOLKIT_DATASET_HANDLER_HPP

#include <crow.h>
#include "../../database/DBManager.hpp"
#include "../../database/models/Dataset.hpp"
#include "../../common/Logger.hpp"
#include "../../common/Exceptions.hpp"
#include "../../middleware/ErrorHandler.hpp"

namespace MLToolkit {
namespace API {
namespace Handlers {

class DatasetHandler {
public:
    // Create Dataset (POST /api/v1/datasets)
    static crow::response create_dataset(const crow::request& req) {
        return Middleware::handle_exceptions([&]() {
            auto json_body = crow::json::load(req.body);
            if (!json_body) {
                throw Common::InvalidArgumentException("Invalid JSON body.");
            }
            
            Database::Models::Dataset new_dataset = Database::Models::Dataset::from_json(json_body);
            
            if (new_dataset.name.empty() || new_dataset.file_path.empty()) {
                throw Common::InvalidArgumentException("Dataset name and file_path are required.");
            }

            // Simulate file path existence check, in real app, files would be uploaded/referenced
            if (new_dataset.file_path.find("fake_path") == std::string::npos) {
                LOG_WARN("Dataset file_path '{}' is not a dummy path, real file upload/validation needed.", new_dataset.file_path);
            }

            long id = Database::DBManager::get_instance().create_dataset(new_dataset);
            new_dataset.id = id;
            
            LOG_INFO("Dataset created with ID: {}", id);
            return crow::response(201, new_dataset.to_json().dump());
        });
    }

    // Get All Datasets (GET /api/v1/datasets)
    static crow::response get_all_datasets(const crow::request& /*req*/) {
        return Middleware::handle_exceptions([&]() {
            std::vector<Database::Models::Dataset> datasets = Database::DBManager::get_instance().get_all_datasets();
            nlohmann::json json_response = nlohmann::json::array();
            for (const auto& ds : datasets) {
                json_response.push_back(ds.to_json());
            }
            LOG_INFO("Retrieved {} datasets.", datasets.size());
            return crow::response(200, json_response.dump());
        });
    }

    // Get Dataset by ID (GET /api/v1/datasets/{id})
    static crow::response get_dataset_by_id(long id) {
        return Middleware::handle_exceptions([&]() {
            auto dataset_opt = Database::DBManager::get_instance().get_dataset(id);
            if (!dataset_opt) {
                throw Common::NotFoundException("Dataset with ID " + std::to_string(id) + " not found.");
            }
            LOG_INFO("Retrieved dataset with ID: {}", id);
            return crow::response(200, dataset_opt->to_json().dump());
        });
    }

    // Update Dataset (PUT /api/v1/datasets/{id})
    static crow::response update_dataset(long id, const crow::request& req) {
        return Middleware::handle_exceptions([&]() {
            auto json_body = crow::json::load(req.body);
            if (!json_body) {
                throw Common::InvalidArgumentException("Invalid JSON body.");
            }

            Database::Models::Dataset updated_dataset = Database::Models::Dataset::from_json(json_body);
            updated_dataset.id = id; // Ensure ID from URL is used

            // Optional: validate fields
            if (updated_dataset.name.empty() && !json_body.contains("name")) {
                 throw Common::InvalidArgumentException("Dataset name cannot be empty.");
            }
            if (updated_dataset.file_path.empty() && !json_body.contains("file_path")) {
                 throw Common::InvalidArgumentException("Dataset file_path cannot be empty.");
            }

            bool success = Database::DBManager::get_instance().update_dataset(updated_dataset);
            if (!success) {
                throw Common::NotFoundException("Dataset with ID " + std::to_string(id) + " not found for update.");
            }
            LOG_INFO("Dataset updated for ID: {}", id);
            return crow::response(200, crow::json::wvalue({{"status", "success"}, {"message", "Dataset updated successfully."}}).dump());
        });
    }

    // Delete Dataset (DELETE /api/v1/datasets/{id})
    static crow::response delete_dataset(long id) {
        return Middleware::handle_exceptions([&]() {
            bool success = Database::DBManager::get_instance().delete_dataset(id);
            if (!success) {
                throw Common::NotFoundException("Dataset with ID " + std::to_string(id) + " not found for deletion.");
            }
            LOG_INFO("Dataset deleted for ID: {}", id);
            return crow::response(204); // No Content
        });
    }
};

} // namespace Handlers
} // namespace API
} // namespace MLToolkit

#endif // MLTOOLKIT_DATASET_HANDLER_HPP
```