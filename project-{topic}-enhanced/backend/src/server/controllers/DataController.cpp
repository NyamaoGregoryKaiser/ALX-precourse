#include "DataController.h"
#include <fstream>
#include <filesystem> // C++17 for file operations

DataController::DataController(DBManager& db_manager)
    : db_manager_(db_manager), data_processor_() {}

HttpResponse DataController::createDataSource(const HttpRequest& req) {
    try {
        nlohmann::json body = nlohmann::json::parse(req.body);
        
        DataSource new_ds;
        new_ds.id = UUID::generate();
        new_ds.user_id = req.user_id; // From AuthMiddleware
        new_ds.name = body["name"];
        new_ds.type = body["type"]; // e.g., "CSV", "PostgreSQL", "API"
        new_ds.connection_string = body.value("connection_string", ""); // Optional
        new_ds.schema_definition = body.value("schema_definition", ""); // Optional
        new_ds.created_at = std::chrono::system_clock::now();
        new_ds.updated_at = new_ds.created_at;

        // Save raw data if it's a file upload (e.g., CSV)
        if (new_ds.type == "CSV" && body.contains("data_base64")) {
            std::string base64_data = body["data_base64"];
            // Decode base64 and save to a file
            // NOTE: This is a simplified approach. For large files, direct upload is better.
            std::string decoded_data = JWT::base64UrlDecode(base64_data); // Reuse base64 util for simplicity
            
            std::filesystem::path data_dir = "data_uploads";
            if (!std::filesystem::exists(data_dir)) {
                std::filesystem::create_directory(data_dir);
            }
            new_ds.file_path = data_dir.string() + "/" + new_ds.id + ".csv";
            std::ofstream ofs(new_ds.file_path);
            if (!ofs.is_open()) {
                throw std::runtime_error("Could not save uploaded CSV file.");
            }
            ofs << decoded_data;
            ofs.close();
            Logger::info("Saved CSV for data source " + new_ds.id + " to " + new_ds.file_path);
        }

        db_manager_.createDataSource(new_ds);
        Logger::info("Data source created: " + new_ds.name + " (" + new_ds.id + ")");

        nlohmann::json response_json = {
            {"message", "Data source created successfully"},
            {"id", new_ds.id},
            {"name", new_ds.name}
        };
        return HttpResponse(http::status::created, response_json.dump());

    } catch (const nlohmann::json::parse_error& e) {
        Logger::error("JSON Parse Error in createDataSource: " + std::string(e.what()));
        return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Invalid JSON format"}}).dump());
    } catch (const std::exception& e) {
        Logger::error("Error creating data source: " + std::string(e.what()));
        return HttpResponse(http::status::internal_server_error, nlohmann::json({{"error", "Failed to create data source", "details", e.what()}}).dump());
    }
}

HttpResponse DataController::getDataSources(const HttpRequest& req) {
    try {
        std::vector<DataSource> data_sources = db_manager_.findDataSourcesByUserId(req.user_id);
        nlohmann::json response_json = nlohmann::json::array();
        for (const auto& ds : data_sources) {
            response_json.push_back(ds.toJson());
        }
        return HttpResponse(http::status::ok, response_json.dump());
    } catch (const std::exception& e) {
        Logger::error("Error getting data sources: " + std::string(e.what()));
        return HttpResponse(http::status::internal_server_error, nlohmann::json({{"error", "Failed to retrieve data sources", "details", e.what()}}).dump());
    }
}

HttpResponse DataController::getDataSourceById(const HttpRequest& req) {
    try {
        std::string ds_id = req.params.at("id");
        DataSource ds = db_manager_.findDataSourceById(ds_id);
        if (ds.id.empty() || ds.user_id != req.user_id) {
            return HttpResponse(http::status::not_found, nlohmann::json({{"error", "Data source not found or unauthorized"}}).dump());
        }
        return HttpResponse(http::status::ok, ds.toJson().dump());
    } catch (const std::out_of_range& e) {
        return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Missing data source ID"}}).dump());
    } catch (const std::exception& e) {
        Logger::error("Error getting data source by ID: " + std::string(e.what()));
        return HttpResponse(http::status::internal_server_error, nlohmann::json({{"error", "Failed to retrieve data source", "details", e.what()}}).dump());
    }
}

HttpResponse DataController::updateDataSource(const HttpRequest& req) {
    try {
        std::string ds_id = req.params.at("id");
        DataSource existing_ds = db_manager_.findDataSourceById(ds_id);
        if (existing_ds.id.empty() || existing_ds.user_id != req.user_id) {
            return HttpResponse(http::status::not_found, nlohmann::json({{"error", "Data source not found or unauthorized"}}).dump());
        }

        nlohmann::json body = nlohmann::json::parse(req.body);
        if (body.contains("name")) existing_ds.name = body["name"];
        if (body.contains("type")) existing_ds.type = body["type"];
        if (body.contains("connection_string")) existing_ds.connection_string = body["connection_string"];
        if (body.contains("schema_definition")) existing_ds.schema_definition = body["schema_definition"];
        existing_ds.updated_at = std::chrono::system_clock::now();

        db_manager_.updateDataSource(existing_ds);
        Logger::info("Data source updated: " + existing_ds.id);

        return HttpResponse(http::status::ok, nlohmann::json({{"message", "Data source updated successfully"}}).dump());

    } catch (const std::out_of_range& e) {
        return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Missing data source ID"}}).dump());
    } catch (const nlohmann::json::parse_error& e) {
        Logger::error("JSON Parse Error in updateDataSource: " + std::string(e.what()));
        return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Invalid JSON format"}}).dump());
    } catch (const std::exception& e) {
        Logger::error("Error updating data source: " + std::string(e.what()));
        return HttpResponse(http::status::internal_server_error, nlohmann::json({{"error", "Failed to update data source", "details", e.what()}}).dump());
    }
}

HttpResponse DataController::deleteDataSource(const HttpRequest& req) {
    try {
        std::string ds_id = req.params.at("id");
        DataSource existing_ds = db_manager_.findDataSourceById(ds_id);
        if (existing_ds.id.empty() || existing_ds.user_id != req.user_id) {
            return HttpResponse(http::status::not_found, nlohmann::json({{"error", "Data source not found or unauthorized"}}).dump());
        }

        // Also delete associated file if it's a file-based data source
        if (!existing_ds.file_path.empty() && std::filesystem::exists(existing_ds.file_path)) {
            std::filesystem::remove(existing_ds.file_path);
            Logger::info("Deleted file for data source: " + existing_ds.file_path);
        }

        db_manager_.deleteDataSource(ds_id);
        Logger::info("Data source deleted: " + ds_id);

        return HttpResponse(http::status::no_content, ""); // 204 No Content
    } catch (const std::out_of_range& e) {
        return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Missing data source ID"}}).dump());
    } catch (const std::exception& e) {
        Logger::error("Error deleting data source: " + std::string(e.what()));
        return HttpResponse(http::status::internal_server_error, nlohmann::json({{"error", "Failed to delete data source", "details", e.what()}}).dump());
    }
}

HttpResponse DataController::processDataSource(const HttpRequest& req) {
    try {
        std::string ds_id = req.params.at("id");
        DataSource ds = db_manager_.findDataSourceById(ds_id);
        if (ds.id.empty() || ds.user_id != req.user_id) {
            return HttpResponse(http::status::not_found, nlohmann::json({{"error", "Data source not found or unauthorized"}}).dump());
        }

        // Example: Process a CSV file
        if (ds.type == "CSV" && !ds.file_path.empty()) {
            CsvParser parser;
            auto raw_data = parser.parseFile(ds.file_path);
            
            // Apply transformations / aggregations using DataProcessor
            // For now, just return raw data as JSON
            nlohmann::json response_data = nlohmann::json::array();
            for (const auto& row : raw_data) {
                nlohmann::json row_json;
                for (const auto& [header, value] : row) {
                    row_json[header] = value;
                }
                response_data.push_back(row_json);
            }
            return HttpResponse(http::status::ok, response_data.dump());
        } else if (ds.type == "PostgreSQL") {
            // Connect to external PostgreSQL, query, and return data
            // This would involve creating a new DBManager instance for the external DB
            return HttpResponse(http::status::not_implemented, nlohmann::json({{"error", "PostgreSQL data source processing not fully implemented"}}).dump());
        } else {
            return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Unsupported data source type or missing file path"}}).dump());
        }

    } catch (const std::out_of_range& e) {
        return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Missing data source ID"}}).dump());
    } catch (const std::exception& e) {
        Logger::error("Error processing data source " + req.params.at("id") + ": " + std::string(e.what()));
        return HttpResponse(http::status::internal_server_error, nlohmann::json({{"error", "Failed to process data source", "details", e.what()}}).dump());
    }
}