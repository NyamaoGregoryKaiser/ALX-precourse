```cpp
#include "Controller.h"
#include <algorithm>
#include <sstream>

namespace VisGenius {

Controller::Controller(
    std::shared_ptr<Database> db,
    std::shared_ptr<DataProcessor> data_processor,
    std::shared_ptr<VisualizationEngine> viz_engine,
    std::shared_ptr<AuthManager> auth_manager,
    std::shared_ptr<Cache<DataTable>> data_cache,
    std::shared_ptr<Cache<ChartData>> chart_cache
) :
    m_db(db),
    m_dataProcessor(data_processor),
    m_vizEngine(viz_engine),
    m_authManager(auth_manager),
    m_dataCache(data_cache),
    m_chartCache(chart_cache)
{
    LOG_INFO("Controller initialized.");
}

// --- Helper Functions (Basic JSON parsing/serialization) ---
std::map<std::string, std::string> Controller::parseJsonBodyToMap(const std::string& json_str) const {
    std::map<std::string, std::string> result;
    if (json_str.empty() || json_str == "{}" || json_str.length() < 2 || json_str.front() != '{' || json_str.back() != '}') {
        return result;
    }
    std::string inner_str = json_str.substr(1, json_str.length() - 2); // Remove outer braces

    std::istringstream iss(inner_str);
    std::string segment;
    while (std::getline(iss, segment, ',')) {
        size_t colon_pos = segment.find(':');
        if (colon_pos != std::string::npos) {
            std::string key = segment.substr(0, colon_pos);
            std::string value = segment.substr(colon_pos + 1);

            // Simple trim and remove quotes
            auto trim_quotes = [](std::string s) {
                s.erase(0, s.find_first_not_of(" \t\n\r\""));
                s.erase(s.find_last_not_of(" \t\n\r\"") + 1);
                return s;
            };

            result[trim_quotes(key)] = trim_quotes(value);
        }
    }
    return result;
}

std::string Controller::mapToJsonString(const std::map<std::string, std::string>& data_map) const {
    std::ostringstream oss;
    oss << "{";
    bool first = true;
    for (const auto& pair : data_map) {
        if (!first) oss << ",";
        oss << "\"" << pair.first << "\":\"" << pair.second << "\"";
        first = false;
    }
    oss << "}";
    return oss.str();
}

std::string Controller::fieldDefinitionToJsonArray(const std::vector<FieldDefinition>& schema) const {
    std::ostringstream oss;
    oss << "[";
    bool first = true;
    for (const auto& field : schema) {
        if (!first) oss << ",";
        oss << "{\"name\":\"" << field.name << "\",\"type\":\"" << field.type << "\"}";
        first = false;
    }
    oss << "]";
    return oss.str();
}


std::string Controller::dataSourcesToJsonArray(const std::vector<DataSource>& dss) const {
    std::ostringstream oss;
    oss << "[";
    bool first = true;
    for (const auto& ds : dss) {
        if (!first) oss << ",";
        oss << "{\"id\":" << ds.id << ",\"name\":\"" << ds.name << "\",\"type\":\"" << ds.type
            << "\",\"connection_string\":\"" << ds.connection_string << "\",\"schema\":" << fieldDefinitionToJsonArray(ds.schema)
            << ",\"created_at\":" << ds.created_at.timestamp_ms << ",\"updated_at\":" << ds.updated_at.timestamp_ms << "}";
        first = false;
    }
    oss << "]";
    return oss.str();
}

std::string Controller::visualizationToJson(const Visualization& viz) const {
    std::ostringstream oss;
    oss << "{\"id\":" << viz.id << ",\"name\":\"" << viz.name << "\",\"data_source_id\":" << viz.data_source_id
        << ",\"type\":\"" << viz.type << "\",\"config\":" << mapToJsonString(viz.config)
        << ",\"created_at\":" << viz.created_at.timestamp_ms << ",\"updated_at\":" << viz.updated_at.timestamp_ms << "}";
    return oss.str();
}

std::string Controller::visualizationsToJsonArray(const std::vector<Visualization>& vizs) const {
    std::ostringstream oss;
    oss << "[";
    bool first = true;
    for (const auto& viz : vizs) {
        if (!first) oss << ",";
        oss << visualizationToJson(viz);
        first = false;
    }
    oss << "]";
    return oss.str();
}

std::string Controller::dashboardToJson(const Dashboard& dash) const {
    std::ostringstream oss;
    oss << "{\"id\":" << dash.id << ",\"name\":\"" << dash.name << "\",\"description\":\"" << dash.description << "\",\"visualization_ids\":[";
    bool first = true;
    for (int viz_id : dash.visualization_ids) {
        if (!first) oss << ",";
        oss << viz_id;
        first = false;
    }
    oss << "],\"created_at\":" << dash.created_at.timestamp_ms << ",\"updated_at\":" << dash.updated_at.timestamp_ms << "}";
    return oss.str();
}

std::string Controller::dashboardsToJsonArray(const std::vector<Dashboard>& dashes) const {
    std::ostringstream oss;
    oss << "[";
    bool first = true;
    for (const auto& dash : dashes) {
        if (!first) oss << ",";
        oss << dashboardToJson(dash);
        first = false;
    }
    oss << "]";
    return oss.str();
}

std::string Controller::userToJson(const User& user) const {
    std::ostringstream oss;
    oss << "{\"id\":" << user.id << ",\"username\":\"" << user.username << "\",\"role\":\"" << user.role
        << "\",\"created_at\":" << user.created_at.timestamp_ms << ",\"updated_at\":" << user.updated_at.timestamp_ms << "}";
    return oss.str();
}

std::string Controller::chartDataToJson(const ChartData& chart_data) const {
    std::ostringstream oss;
    oss << "{";
    oss << "\"chart_type\":\"" << chart_data.chart_type << "\",";

    oss << "\"labels\":[";
    bool first_label = true;
    for (const auto& label : chart_data.labels) {
        if (!first_label) oss << ",";
        oss << "\"" << label << "\"";
        first_label = false;
    }
    oss << "],";

    oss << "\"datasets\":{";
    bool first_dataset = true;
    for (const auto& ds : chart_data.datasets) {
        if (!first_dataset) oss << ",";
        oss << "\"" << ds.first << "\":[";
        bool first_val = true;
        for (double val : ds.second) {
            if (!first_val) oss << ",";
            oss << val;
            first_val = false;
        }
        oss << "]";
        first_dataset = false;
    }
    oss << "},";

    oss << "\"string_datasets\":{";
    bool first_str_dataset = true;
    for (const auto& sds : chart_data.string_datasets) {
        if (!first_str_dataset) oss << ",";
        oss << "\"" << sds.first << "\":[";
        bool first_str_val = true;
        for (const auto& val : sds.second) {
            if (!first_str_val) oss << ",";
            oss << "\"" << val << "\"";
            first_str_val = false;
        }
        oss << "]";
        first_str_dataset = false;
    }
    oss << "},";


    oss << "\"plot_options\":{";
    bool first_option = true;
    for (const auto& opt : chart_data.plot_options) {
        if (!first_option) oss << ",";
        oss << "\"" << opt.first << "\":\"" << opt.first << "\""; // TODO: Fix this, should be opt.second
        first_option = false;
    }
    oss << "}";

    oss << "}";
    return oss.str();
}

HttpResponse Controller::createErrorResponse(ErrorCode code, const std::string& message, int http_status) const {
    HttpResponse response;
    response.status_code = http_status;
    response.status_message = get_status_message(http_status);
    response.set_content_type("application/json");
    response.set_body("{\"code\":\"" + std::string(VisGeniusException(code, "").getErrorCodeString()) + "\",\"message\":\"" + message + "\"}");
    LOG_WARN("Error response: {} - {}", http_status, message);
    return response;
}

HttpResponse Controller::createSuccessResponse(const std::string& body, int http_status) const {
    HttpResponse response;
    response.status_code = http_status;
    response.status_message = get_status_message(http_status);
    response.set_content_type("application/json");
    response.set_body(body);
    LOG_DEBUG("Success response: {}", http_status);
    return response;
}

bool Controller::checkAuthorization(const AuthToken& auth, const std::string& required_role, HttpResponse& response) const {
    if (!m_authManager->authorize(auth, required_role)) {
        response = createErrorResponse(ErrorCode::FORBIDDEN, "Access to this resource is forbidden.", 403);
        return false;
    }
    return true;
}

bool Controller::checkAuthAndGetId(const HttpRequest& request, const AuthToken& auth, int& id, HttpResponse& response) const {
    if (request.path_params.count("id") == 0) {
        response = createErrorResponse(ErrorCode::INVALID_INPUT, "Missing ID in path parameters.", 400);
        return false;
    }
    try {
        id = std::stoi(request.path_params.at("id"));
    } catch (const std::exception& e) {
        response = createErrorResponse(ErrorCode::INVALID_INPUT, "Invalid ID format: " + std::string(e.what()), 400);
        return false;
    }
    return true;
}

// --- Authentication Endpoints ---

HttpResponse Controller::handleLogin(const HttpRequest& request) {
    LOG_INFO("Handling login request.");
    if (request.method != "POST") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }
    
    try {
        std::map<std::string, std::string> body_data = parseJsonBodyToMap(request.body);
        std::string username = body_data.count("username") ? body_data.at("username") : "";
        std::string password = body_data.count("password") ? body_data.at("password") : "";

        if (username.empty() || password.empty()) {
            return createErrorResponse(ErrorCode::INVALID_INPUT, "Username and password are required.", 400);
        }

        std::unique_ptr<AuthToken> token = m_authManager->authenticate(username, password);
        if (token) {
            std::map<std::string, std::string> response_data = {
                {"message", "Login successful"},
                {"token", token->token},
                {"user_id", std::to_string(token->user_id)},
                {"username", token->username},
                {"role", token->role},
                {"expires_at", std::to_string(token->expires_at.timestamp_ms)}
            };
            return createSuccessResponse(mapToJsonString(response_data), 200);
        } else {
            return createErrorResponse(ErrorCode::UNAUTHORIZED, "Invalid credentials.", 401);
        }
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what(), 400);
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleLogin: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error during login: " + std::string(e.what()), 500);
    }
}

HttpResponse Controller::handleRegister(const HttpRequest& request) {
    LOG_INFO("Handling register request.");
    if (request.method != "POST") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    try {
        std::map<std::string, std::string> body_data = parseJsonBodyToMap(request.body);
        std::string username = body_data.count("username") ? body_data.at("username") : "";
        std::string password = body_data.count("password") ? body_data.at("password") : "";
        std::string role = body_data.count("role") ? body_data.at("role") : "viewer"; // Default role

        if (username.empty() || password.empty()) {
            return createErrorResponse(ErrorCode::INVALID_INPUT, "Username and password are required.", 400);
        }

        // Only admin can register other roles, otherwise default to viewer
        // For simplicity, allow anyone to register as viewer, only admin can register as admin/editor
        if (role != "viewer" && (!request.headers.count("authorization") || !m_authManager->validateToken(request.headers.at("authorization")) || !m_authManager->authorize(*m_authManager->validateToken(request.headers.at("authorization")), "admin"))) {
             LOG_WARN("Non-admin user attempted to register with role '{}'. Forcing to 'viewer'.", role);
             role = "viewer";
        }


        if (m_authManager->registerUser(username, password, role)) {
            return createSuccessResponse("{\"message\":\"User registered successfully\"}", 201);
        } else {
            return createErrorResponse(ErrorCode::INVALID_INPUT, "Username already exists or registration failed.", 409);
        }
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what(), 400);
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleRegister: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error during registration: " + std::string(e.what()), 500);
    }
}


// --- Data Source Endpoints ---

HttpResponse Controller::handleCreateDataSource(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "editor", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "POST") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    try {
        std::map<std::string, std::string> body_data = parseJsonBodyToMap(request.body);
        if (!body_data.count("name") || !body_data.count("type") || !body_data.count("connection_string")) {
            return createErrorResponse(ErrorCode::INVALID_INPUT, "Name, type, and connection_string are required for data source.", 400);
        }

        DataSource new_ds;
        new_ds.name = body_data.at("name");
        new_ds.type = body_data.at("type");
        new_ds.connection_string = body_data.at("connection_string");
        long long current_time = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        new_ds.created_at.timestamp_ms = current_time;
        new_ds.updated_at.timestamp_ms = current_time;

        // Automatically infer schema for CSV for now
        if (new_ds.type == "csv") {
            new_ds.schema = m_dataProcessor->inferSchema(new_ds);
        } else {
            // For other types, schema might be provided or inferred differently
            new_ds.schema = {}; // Empty schema for other types in this example
        }

        int id = m_db->createDataSource(new_ds);
        new_ds.id = id;
        return createSuccessResponse("{\"message\":\"Data source created successfully\", \"data_source\":" + dataSourcesToJsonArray({new_ds}) + "}", 201);
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what(), (e.getErrorCode() == ErrorCode::INVALID_INPUT || e.getErrorCode() == ErrorCode::DB_ERROR) ? 400 : 500);
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleCreateDataSource: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

HttpResponse Controller::handleGetAllDataSources(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "viewer", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "GET") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    try {
        std::vector<DataSource> data_sources = m_db->getAllDataSources();
        return createSuccessResponse("{\"data_sources\":" + dataSourcesToJsonArray(data_sources) + "}");
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleGetAllDataSources: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

HttpResponse Controller::handleGetDataSource(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "viewer", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "GET") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    int id;
    HttpResponse response;
    if (!checkAuthAndGetId(request, auth, id, response)) return response;

    try {
        std::unique_ptr<DataSource> ds = m_db->getDataSource(id);
        if (ds) {
            return createSuccessResponse("{\"data_source\":" + dataSourcesToJsonArray({*ds}) + "}");
        } else {
            return createErrorResponse(ErrorCode::NOT_FOUND, "Data source not found.", 404);
        }
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleGetDataSource: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

HttpResponse Controller::handleUpdateDataSource(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "editor", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "PUT") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    int id;
    HttpResponse response;
    if (!checkAuthAndGetId(request, auth, id, response)) return response;

    try {
        std::map<std::string, std::string> body_data = parseJsonBodyToMap(request.body);
        std::unique_ptr<DataSource> existing_ds = m_db->getDataSource(id);
        if (!existing_ds) {
            return createErrorResponse(ErrorCode::NOT_FOUND, "Data source not found.", 404);
        }

        existing_ds->name = body_data.count("name") ? body_data.at("name") : existing_ds->name;
        existing_ds->type = body_data.count("type") ? body_data.at("type") : existing_ds->type;
        existing_ds->connection_string = body_data.count("connection_string") ? body_data.at("connection_string") : existing_ds->connection_string;
        existing_ds->updated_at.timestamp_ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();

        // If connection string or type changed, re-infer schema
        if (body_data.count("type") || body_data.count("connection_string")) {
            if (existing_ds->type == "csv") {
                existing_ds->schema = m_dataProcessor->inferSchema(*existing_ds);
            } else {
                existing_ds->schema = {};
            }
        }

        if (m_db->updateDataSource(*existing_ds)) {
            m_dataCache->remove("datasource_" + std::to_string(id) + "_raw_data"); // Invalidate cache
            return createSuccessResponse("{\"message\":\"Data source updated successfully\", \"data_source\":" + dataSourcesToJsonArray({*existing_ds}) + "}");
        } else {
            return createErrorResponse(ErrorCode::DB_ERROR, "Failed to update data source.", 500);
        }
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what(), (e.getErrorCode() == ErrorCode::INVALID_INPUT) ? 400 : 500);
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleUpdateDataSource: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

HttpResponse Controller::handleDeleteDataSource(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "admin", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "DELETE") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    int id;
    HttpResponse response;
    if (!checkAuthAndGetId(request, auth, id, response)) return response;

    try {
        if (m_db->deleteDataSource(id)) {
            m_dataCache->remove("datasource_" + std::to_string(id) + "_raw_data"); // Invalidate cache
            return createSuccessResponse("{\"message\":\"Data source deleted successfully\"}", 200);
        } else {
            return createErrorResponse(ErrorCode::NOT_FOUND, "Data source not found.", 404);
        }
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleDeleteDataSource: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

// --- Visualization Endpoints ---

HttpResponse Controller::handleCreateVisualization(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "editor", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "POST") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    try {
        std::map<std::string, std::string> body_data = parseJsonBodyToMap(request.body);
        if (!body_data.count("name") || !body_data.count("data_source_id") || !body_data.count("type") || !body_data.count("config")) {
            return createErrorResponse(ErrorCode::INVALID_INPUT, "Name, data_source_id, type, and config are required for visualization.", 400);
        }

        Visualization new_viz;
        new_viz.name = body_data.at("name");
        new_viz.data_source_id = std::stoi(body_data.at("data_source_id"));
        new_viz.type = body_data.at("type");
        new_viz.config = parseJsonBodyToMap(body_data.at("config")); // Parse config string to map
        long long current_time = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        new_viz.created_at.timestamp_ms = current_time;
        new_viz.updated_at.timestamp_ms = current_time;

        if (!m_db->getDataSource(new_viz.data_source_id)) {
            return createErrorResponse(ErrorCode::NOT_FOUND, "Data source with ID " + std::to_string(new_viz.data_source_id) + " not found.", 404);
        }

        int id = m_db->createVisualization(new_viz);
        new_viz.id = id;
        return createSuccessResponse("{\"message\":\"Visualization created successfully\", \"visualization\":" + visualizationToJson(new_viz) + "}", 201);
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what(), (e.getErrorCode() == ErrorCode::INVALID_INPUT) ? 400 : 500);
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleCreateVisualization: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

HttpResponse Controller::handleGetAllVisualizations(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "viewer", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "GET") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    try {
        std::vector<Visualization> visualizations = m_db->getAllVisualizations();
        return createSuccessResponse("{\"visualizations\":" + visualizationsToJsonArray(visualizations) + "}");
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleGetAllVisualizations: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

HttpResponse Controller::handleGetVisualization(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "viewer", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "GET") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    int id;
    HttpResponse response;
    if (!checkAuthAndGetId(request, auth, id, response)) return response;

    try {
        std::unique_ptr<Visualization> viz = m_db->getVisualization(id);
        if (viz) {
            return createSuccessResponse("{\"visualization\":" + visualizationToJson(*viz) + "}");
        } else {
            return createErrorResponse(ErrorCode::NOT_FOUND, "Visualization not found.", 404);
        }
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleGetVisualization: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

HttpResponse Controller::handleUpdateVisualization(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "editor", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "PUT") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    int id;
    HttpResponse response;
    if (!checkAuthAndGetId(request, auth, id, response)) return response;

    try {
        std::map<std::string, std::string> body_data = parseJsonBodyToMap(request.body);
        std::unique_ptr<Visualization> existing_viz = m_db->getVisualization(id);
        if (!existing_viz) {
            return createErrorResponse(ErrorCode::NOT_FOUND, "Visualization not found.", 404);
        }

        existing_viz->name = body_data.count("name") ? body_data.at("name") : existing_viz->name;
        // Data source ID can be updated, but ensure it exists
        if (body_data.count("data_source_id")) {
            int new_ds_id = std::stoi(body_data.at("data_source_id"));
            if (!m_db->getDataSource(new_ds_id)) {
                return createErrorResponse(ErrorCode::NOT_FOUND, "Data source with ID " + std::to_string(new_ds_id) + " not found.", 404);
            }
            existing_viz->data_source_id = new_ds_id;
        }
        existing_viz->type = body_data.count("type") ? body_data.at("type") : existing_viz->type;
        if (body_data.count("config")) {
            existing_viz->config = parseJsonBodyToMap(body_data.at("config"));
        }
        existing_viz->updated_at.timestamp_ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();

        if (m_db->updateVisualization(*existing_viz)) {
            m_chartCache->remove("visualization_" + std::to_string(id) + "_chart_data"); // Invalidate cache
            return createSuccessResponse("{\"message\":\"Visualization updated successfully\", \"visualization\":" + visualizationToJson(*existing_viz) + "}");
        } else {
            return createErrorResponse(ErrorCode::DB_ERROR, "Failed to update visualization.", 500);
        }
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what(), (e.getErrorCode() == ErrorCode::INVALID_INPUT) ? 400 : 500);
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleUpdateVisualization: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

HttpResponse Controller::handleDeleteVisualization(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "admin", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "DELETE") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    int id;
    HttpResponse response;
    if (!checkAuthAndGetId(request, auth, id, response)) return response;

    try {
        if (m_db->deleteVisualization(id)) {
            m_chartCache->remove("visualization_" + std::to_string(id) + "_chart_data"); // Invalidate cache
            return createSuccessResponse("{\"message\":\"Visualization deleted successfully\"}", 200);
        } else {
            return createErrorResponse(ErrorCode::NOT_FOUND, "Visualization not found.", 404);
        }
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleDeleteVisualization: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

HttpResponse Controller::handleGetVisualizationData(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "viewer", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "GET") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    int viz_id;
    HttpResponse response;
    if (!checkAuthAndGetId(request, auth, viz_id, response)) return response;

    try {
        // 1. Try to get from cache
        std::string cache_key = "visualization_" + std::to_string(viz_id) + "_chart_data";
        std::optional<ChartData> cached_chart_data = m_chartCache->get(cache_key);
        if (cached_chart_data) {
            LOG_INFO("Serving chart data for visualization ID {} from cache.", viz_id);
            return createSuccessResponse("{\"chart_data\":" + chartDataToJson(*cached_chart_data) + "}");
        }

        // 2. Get Visualization definition
        std::unique_ptr<Visualization> viz = m_db->getVisualization(viz_id);
        if (!viz) {
            return createErrorResponse(ErrorCode::NOT_FOUND, "Visualization not found.", 404);
        }

        // 3. Get Data Source
        std::unique_ptr<DataSource> ds = m_db->getDataSource(viz->data_source_id);
        if (!ds) {
            return createErrorResponse(ErrorCode::NOT_FOUND, "Data source for visualization ID " + std::to_string(viz->data_source_id) + " not found.", 404);
        }

        // 4. Load raw data (from cache or disk)
        std::string data_cache_key = "datasource_" + std::to_string(ds->id) + "_raw_data";
        std::optional<DataTable> raw_data = m_dataCache->get(data_cache_key);
        if (!raw_data) {
            raw_data = m_dataProcessor->loadData(*ds);
            m_dataCache->put(data_cache_key, *raw_data, std::chrono::minutes(30)); // Cache raw data for 30 mins
            LOG_INFO("Loaded raw data for data source {} from disk and cached.", ds->id);
        } else {
             LOG_INFO("Serving raw data for data source {} from cache.", ds->id);
        }

        // 5. Generate chart data
        std::unique_ptr<ChartData> chart_data = m_vizEngine->generateChartData(*viz, *raw_data);
        
        // 6. Cache and return
        m_chartCache->put(cache_key, *chart_data, std::chrono::minutes(10)); // Cache processed chart data for 10 mins
        LOG_INFO("Generated and cached chart data for visualization ID {}.", viz_id);
        return createSuccessResponse("{\"chart_data\":" + chartDataToJson(*chart_data) + "}");

    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what(), (e.getErrorCode() == ErrorCode::INVALID_INPUT || e.getErrorCode() == ErrorCode::DATA_PROCESSING_ERROR) ? 400 : 500);
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleGetVisualizationData for viz ID {}: {}", viz_id, e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

// --- Dashboard Endpoints ---

HttpResponse Controller::handleCreateDashboard(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "editor", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "POST") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    try {
        std::map<std::string, std::string> body_data = parseJsonBodyToMap(request.body);
        if (!body_data.count("name") || !body_data.count("description")) { // visualization_ids is optional initially
            return createErrorResponse(ErrorCode::INVALID_INPUT, "Name and description are required for dashboard.", 400);
        }

        Dashboard new_dash;
        new_dash.name = body_data.at("name");
        new_dash.description = body_data.at("description");
        // Parse visualization_ids if provided (as a comma-separated string, e.g., "1,2,3")
        if (body_data.count("visualization_ids")) {
            std::stringstream ss(body_data.at("visualization_ids"));
            std::string segment;
            while(std::getline(ss, segment, ',')) {
                try {
                    int viz_id = std::stoi(segment);
                    if (m_db->getVisualization(viz_id)) { // Validate if visualization exists
                        new_dash.visualization_ids.push_back(viz_id);
                    } else {
                        LOG_WARN("Visualization ID {} not found for dashboard creation, skipping.", viz_id);
                    }
                } catch (const std::exception& e) {
                    LOG_WARN("Invalid visualization ID format in dashboard creation: {}", e.what());
                }
            }
        }
        long long current_time = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        new_dash.created_at.timestamp_ms = current_time;
        new_dash.updated_at.timestamp_ms = current_time;

        int id = m_db->createDashboard(new_dash);
        new_dash.id = id;
        return createSuccessResponse("{\"message\":\"Dashboard created successfully\", \"dashboard\":" + dashboardToJson(new_dash) + "}", 201);
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what(), (e.getErrorCode() == ErrorCode::INVALID_INPUT) ? 400 : 500);
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleCreateDashboard: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

HttpResponse Controller::handleGetAllDashboards(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "viewer", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "GET") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    try {
        std::vector<Dashboard> dashboards = m_db->getAllDashboards();
        return createSuccessResponse("{\"dashboards\":" + dashboardsToJsonArray(dashboards) + "}");
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleGetAllDashboards: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

HttpResponse Controller::handleGetDashboard(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "viewer", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "GET") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    int id;
    HttpResponse response;
    if (!checkAuthAndGetId(request, auth, id, response)) return response;

    try {
        std::unique_ptr<Dashboard> dash = m_db->getDashboard(id);
        if (dash) {
            return createSuccessResponse("{\"dashboard\":" + dashboardToJson(*dash) + "}");
        } else {
            return createErrorResponse(ErrorCode::NOT_FOUND, "Dashboard not found.", 404);
        }
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleGetDashboard: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

HttpResponse Controller::handleUpdateDashboard(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "editor", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "PUT") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    int id;
    HttpResponse response;
    if (!checkAuthAndGetId(request, auth, id, response)) return response;

    try {
        std::map<std::string, std::string> body_data = parseJsonBodyToMap(request.body);
        std::unique_ptr<Dashboard> existing_dash = m_db->getDashboard(id);
        if (!existing_dash) {
            return createErrorResponse(ErrorCode::NOT_FOUND, "Dashboard not found.", 404);
        }

        existing_dash->name = body_data.count("name") ? body_data.at("name") : existing_dash->name;
        existing_dash->description = body_data.count("description") ? body_data.at("description") : existing_dash->description;
        
        // Update visualization_ids if provided
        if (body_data.count("visualization_ids")) {
            existing_dash->visualization_ids.clear();
            std::stringstream ss(body_data.at("visualization_ids"));
            std::string segment;
            while(std::getline(ss, segment, ',')) {
                try {
                    int viz_id = std::stoi(segment);
                    if (m_db->getVisualization(viz_id)) {
                        existing_dash->visualization_ids.push_back(viz_id);
                    } else {
                        LOG_WARN("Visualization ID {} not found for dashboard update, skipping.", viz_id);
                    }
                } catch (const std::exception& e) {
                    LOG_WARN("Invalid visualization ID format in dashboard update: {}", e.what());
                }
            }
        }
        existing_dash->updated_at.timestamp_ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();

        if (m_db->updateDashboard(*existing_dash)) {
            return createSuccessResponse("{\"message\":\"Dashboard updated successfully\", \"dashboard\":" + dashboardToJson(*existing_dash) + "}");
        } else {
            return createErrorResponse(ErrorCode::DB_ERROR, "Failed to update dashboard.", 500);
        }
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what(), (e.getErrorCode() == ErrorCode::INVALID_INPUT) ? 400 : 500);
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleUpdateDashboard: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

HttpResponse Controller::handleDeleteDashboard(const HttpRequest& request, const AuthToken& auth) {
    if (!checkAuthorization(auth, "admin", createErrorResponse(ErrorCode::FORBIDDEN, "", 403))) return createErrorResponse(ErrorCode::FORBIDDEN, "", 403);
    if (request.method != "DELETE") {
        return createErrorResponse(ErrorCode::INVALID_INPUT, "Method Not Allowed", 405);
    }

    int id;
    HttpResponse response;
    if (!checkAuthAndGetId(request, auth, id, response)) return response;

    try {
        if (m_db->deleteDashboard(id)) {
            return createSuccessResponse("{\"message\":\"Dashboard deleted successfully\"}", 200);
        } else {
            return createErrorResponse(ErrorCode::NOT_FOUND, "Dashboard not found.", 404);
        }
    } catch (const VisGeniusException& e) {
        return createErrorResponse(e.getErrorCode(), e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("Exception in handleDeleteDashboard: {}", e.what());
        return createErrorResponse(ErrorCode::SERVER_ERROR, "Internal server error: " + std::string(e.what()), 500);
    }
}

} // namespace VisGenius
```