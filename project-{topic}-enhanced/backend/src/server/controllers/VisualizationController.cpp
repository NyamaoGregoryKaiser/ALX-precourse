#include "VisualizationController.h"
#include "core/CsvParser.h" // For reading CSV data

VisualizationController::VisualizationController(DBManager& db_manager)
    : db_manager_(db_manager), data_processor_() {}

HttpResponse VisualizationController::createVisualization(const HttpRequest& req) {
    try {
        nlohmann::json body = nlohmann::json::parse(req.body);

        Visualization new_viz;
        new_viz.id = UUID::generate();
        new_viz.user_id = req.user_id;
        new_viz.name = body["name"];
        new_viz.description = body.value("description", "");
        new_viz.data_source_id = body["data_source_id"];
        new_viz.type = body["type"]; // e.g., "bar_chart", "line_chart", "scatter_plot"
        new_viz.configuration = body["configuration"].dump(); // Store visualization config as JSON string
        new_viz.created_at = std::chrono::system_clock::now();
        new_viz.updated_at = new_viz.created_at;

        // Verify data source exists and belongs to the user
        DataSource ds = db_manager_.findDataSourceById(new_viz.data_source_id);
        if (ds.id.empty() || ds.user_id != req.user_id) {
            return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Data source not found or unauthorized"}}).dump());
        }

        db_manager_.createVisualization(new_viz);
        Logger::info("Visualization created: " + new_viz.name + " (" + new_viz.id + ")");

        nlohmann::json response_json = {
            {"message", "Visualization created successfully"},
            {"id", new_viz.id},
            {"name", new_viz.name}
        };
        return HttpResponse(http::status::created, response_json.dump());

    } catch (const nlohmann::json::parse_error& e) {
        Logger::error("JSON Parse Error in createVisualization: " + std::string(e.what()));
        return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Invalid JSON format"}}).dump());
    } catch (const std::exception& e) {
        Logger::error("Error creating visualization: " + std::string(e.what()));
        return HttpResponse(http::status::internal_server_error, nlohmann::json({{"error", "Failed to create visualization", "details", e.what()}}).dump());
    }
}

HttpResponse VisualizationController::getVisualizations(const HttpRequest& req) {
    try {
        std::vector<Visualization> visualizations = db_manager_.findVisualizationsByUserId(req.user_id);
        nlohmann::json response_json = nlohmann::json::array();
        for (const auto& viz : visualizations) {
            response_json.push_back(viz.toJson());
        }
        return HttpResponse(http::status::ok, response_json.dump());
    } catch (const std::exception& e) {
        Logger::error("Error getting visualizations: " + std::string(e.what()));
        return HttpResponse(http::status::internal_server_error, nlohmann::json({{"error", "Failed to retrieve visualizations", "details", e.what()}}).dump());
    }
}

HttpResponse VisualizationController::getVisualizationById(const HttpRequest& req) {
    try {
        std::string viz_id = req.params.at("id");
        Visualization viz = db_manager_.findVisualizationById(viz_id);
        if (viz.id.empty() || viz.user_id != req.user_id) {
            return HttpResponse(http::status::not_found, nlohmann::json({{"error", "Visualization not found or unauthorized"}}).dump());
        }
        return HttpResponse(http::status::ok, viz.toJson().dump());
    } catch (const std::out_of_range& e) {
        return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Missing visualization ID"}}).dump());
    } catch (const std::exception& e) {
        Logger::error("Error getting visualization by ID: " + std::string(e.what()));
        return HttpResponse(http::status::internal_server_error, nlohmann::json({{"error", "Failed to retrieve visualization", "details", e.what()}}).dump());
    }
}

HttpResponse VisualizationController::updateVisualization(const HttpRequest& req) {
    try {
        std::string viz_id = req.params.at("id");
        Visualization existing_viz = db_manager_.findVisualizationById(viz_id);
        if (existing_viz.id.empty() || existing_viz.user_id != req.user_id) {
            return HttpResponse(http::status::not_found, nlohmann::json({{"error", "Visualization not found or unauthorized"}}).dump());
        }

        nlohmann::json body = nlohmann::json::parse(req.body);
        if (body.contains("name")) existing_viz.name = body["name"];
        if (body.contains("description")) existing_viz.description = body["description"];
        if (body.contains("data_source_id")) existing_viz.data_source_id = body["data_source_id"];
        if (body.contains("type")) existing_viz.type = body["type"];
        if (body.contains("configuration")) existing_viz.configuration = body["configuration"].dump();
        existing_viz.updated_at = std::chrono::system_clock::now();

        // Verify updated data source if changed
        if (body.contains("data_source_id")) {
            DataSource ds = db_manager_.findDataSourceById(existing_viz.data_source_id);
            if (ds.id.empty() || ds.user_id != req.user_id) {
                return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "New data source not found or unauthorized"}}).dump());
            }
        }

        db_manager_.updateVisualization(existing_viz);
        Logger::info("Visualization updated: " + existing_viz.id);

        return HttpResponse(http::status::ok, nlohmann::json({{"message", "Visualization updated successfully"}}).dump());

    } catch (const std::out_of_range& e) {
        return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Missing visualization ID"}}).dump());
    } catch (const nlohmann::json::parse_error& e) {
        Logger::error("JSON Parse Error in updateVisualization: " + std::string(e.what()));
        return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Invalid JSON format"}}).dump());
    } catch (const std::exception& e) {
        Logger::error("Error updating visualization: " + std::string(e.what()));
        return HttpResponse(http::status::internal_server_error, nlohmann::json({{"error", "Failed to update visualization", "details", e.what()}}).dump());
    }
}

HttpResponse VisualizationController::deleteVisualization(const HttpRequest& req) {
    try {
        std::string viz_id = req.params.at("id");
        Visualization existing_viz = db_manager_.findVisualizationById(viz_id);
        if (existing_viz.id.empty() || existing_viz.user_id != req.user_id) {
            return HttpResponse(http::status::not_found, nlohmann::json({{"error", "Visualization not found or unauthorized"}}).dump());
        }

        db_manager_.deleteVisualization(viz_id);
        Logger::info("Visualization deleted: " + viz_id);

        return HttpResponse(http::status::no_content, ""); // 204 No Content
    } catch (const std::out_of_range& e) {
        return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Missing visualization ID"}}).dump());
    } catch (const std::exception& e) {
        Logger::error("Error deleting visualization: " + std::string(e.what()));
        return HttpResponse(http::status::internal_server_error, nlohmann::json({{"error", "Failed to delete visualization", "details", e.what()}}).dump());
    }
}

HttpResponse VisualizationController::getVisualizationData(const HttpRequest& req) {
    try {
        std::string viz_id = req.params.at("id");
        Visualization viz = db_manager_.findVisualizationById(viz_id);
        if (viz.id.empty() || viz.user_id != req.user_id) {
            return HttpResponse(http::status::not_found, nlohmann::json({{"error", "Visualization not found or unauthorized"}}).dump());
        }

        DataSource ds = db_manager_.findDataSourceById(viz.data_source_id);
        if (ds.id.empty() || ds.user_id != req.user_id) {
            return HttpResponse(http::status::not_found, nlohmann::json({{"error", "Associated data source not found or unauthorized"}}).dump());
        }

        // Get raw data based on data source type
        std::vector<std::map<std::string, std::string>> raw_data;
        if (ds.type == "CSV" && !ds.file_path.empty()) {
            CsvParser parser;
            raw_data = parser.parseFile(ds.file_path);
        } else if (ds.type == "PostgreSQL") {
            // Connect to external PostgreSQL, execute query
            // This would involve a separate DBManager instance or query logic
            Logger::warn("PostgreSQL data retrieval not fully implemented for visualization data.");
            return HttpResponse(http::status::not_implemented, nlohmann::json({{"error", "PostgreSQL data retrieval for visualization not yet implemented"}}).dump());
        } else {
            return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Unsupported data source type for visualization"}}).dump());
        }

        // Apply visualization-specific transformations from viz.configuration
        nlohmann::json viz_config = nlohmann::json::parse(viz.configuration);
        // This is where DataProcessor would apply filters, aggregations, etc.,
        // based on the `viz_config` (e.g., x-axis, y-axis, group by, sum, average)
        
        // For demonstration, just return raw data for now.
        // In reality, this would be `data_processor_.process(raw_data, viz_config);`
        
        nlohmann::json processed_data = nlohmann::json::array();
        for (const auto& row : raw_data) {
            nlohmann::json row_json;
            for (const auto& [header, value] : row) {
                row_json[header] = value;
            }
            processed_data.push_back(row_json);
        }

        return HttpResponse(http::status::ok, processed_data.dump());

    } catch (const std::out_of_range& e) {
        return HttpResponse(http::status::bad_request, nlohmann::json({{"error", "Missing visualization ID"}}).dump());
    } catch (const nlohmann::json::parse_error& e) {
        Logger::error("JSON Parse Error in getVisualizationData (config): " + std::string(e.what()));
        return HttpResponse(http::status::internal_server_error, nlohmann::json({{"error", "Invalid visualization configuration JSON"}}).dump());
    } catch (const std::exception& e) {
        Logger::error("Error getting visualization data for " + req.params.at("id") + ": " + std::string(e.what()));
        return HttpResponse(http::status::internal_server_error, nlohmann::json({{"error", "Failed to retrieve visualization data", "details", e.what()}}).dump());
    }
}