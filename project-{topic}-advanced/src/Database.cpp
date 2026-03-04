```cpp
#include "Database.h"
#include <iostream>
#include <sstream>
#include <algorithm> // For std::replace

namespace VisGenius {

// --- Private Helpers ---

// Converts std::map<string, string> to a simple string representation for DB storage
static std::string configMapToString(const std::map<std::string, std::string>& config) {
    if (config.empty()) return "{}"; // Empty JSON object

    std::ostringstream oss;
    oss << "{";
    bool first = true;
    for (const auto& pair : config) {
        if (!first) oss << ",";
        oss << "\"" << pair.first << "\":\"" << pair.second << "\"";
        first = false;
    }
    oss << "}";
    return oss.str();
}

// Converts string representation to std::map<string, string>
// This is a VERY basic parser and would typically use nlohmann::json
static std::map<std::string, std::string> configStringToMap(const std::string& config_str) {
    std::map<std::string, std::string> config;
    if (config_str.empty() || config_str == "{}") return config;

    // Remove outer braces
    std::string inner_str = config_str.substr(1, config_str.length() - 2);
    std::string current_key;
    std::string current_value;
    bool in_key = true;
    bool in_value = false;
    bool in_quote = false;

    for (size_t i = 0; i < inner_str.length(); ++i) {
        char c = inner_str[i];

        if (c == '"') {
            in_quote = !in_quote;
            continue;
        }

        if (in_quote) {
            if (in_key) current_key += c;
            else current_value += c;
        } else {
            if (c == ':') {
                in_key = false;
                in_value = true;
            } else if (c == ',') {
                if (!current_key.empty()) {
                    config[current_key] = current_value;
                }
                current_key.clear();
                current_value.clear();
                in_key = true;
                in_value = false;
            } else if (!std::isspace(c)) { // ignore spaces outside quotes
                if (in_key) current_key += c;
                else current_value += c;
            }
        }
    }
    if (!current_key.empty()) {
        config[current_key] = current_value;
    }
    return config;
}

// Converts vector<int> to comma-separated string for DB
static std::string vectorIntToString(const std::vector<int>& vec) {
    std::ostringstream oss;
    for (size_t i = 0; i < vec.size(); ++i) {
        oss << vec[i];
        if (i < vec.size() - 1) oss << ",";
    }
    return oss.str();
}

// Converts comma-separated string to vector<int>
static std::vector<int> stringToVectorInt(const std::string& str) {
    std::vector<int> vec;
    if (str.empty()) return vec;

    std::stringstream ss(str);
    std::string segment;
    while(std::getline(ss, segment, ',')) {
        try {
            vec.push_back(std::stoi(segment));
        } catch (const std::exception& e) {
            LOG_WARN("Failed to convert segment '{}' to int in stringToVectorInt: {}", segment, e.what());
        }
    }
    return vec;
}

// Converts vector<FieldDefinition> to a JSON string for DB storage
static std::string schemaVectorToJson(const std::vector<FieldDefinition>& schema) {
    if (schema.empty()) return "[]";
    std::ostringstream oss;
    oss << "[";
    for (size_t i = 0; i < schema.size(); ++i) {
        if (i > 0) oss << ",";
        oss << "{\"name\":\"" << schema[i].name << "\",\"type\":\"" << schema[i].type << "\"}";
    }
    oss << "]";
    return oss.str();
}

// Converts JSON string from DB to vector<FieldDefinition>
static std::vector<FieldDefinition> jsonToSchemaVector(const std::string& json_str) {
    std::vector<FieldDefinition> schema;
    if (json_str.empty() || json_str == "[]") return schema;

    // This is a very basic JSON parser for a specific format.
    // A real system would use a robust JSON library (e.g., nlohmann/json).
    std::string temp_str = json_str;
    if (temp_str.front() == '[' && temp_str.back() == ']') {
        temp_str = temp_str.substr(1, temp_str.length() - 2);
    }

    std::string::size_type pos = 0;
    while (pos < temp_str.length()) {
        std::string::size_type obj_start = temp_str.find("{", pos);
        if (obj_start == std::string::npos) break;
        std::string::size_type obj_end = temp_str.find("}", obj_start);
        if (obj_end == std::string::npos) break;

        std::string obj_str = temp_str.substr(obj_start + 1, obj_end - obj_start - 1);
        FieldDefinition field;

        std::string::size_type name_start = obj_str.find("\"name\":\"");
        if (name_start != std::string::npos) {
            name_start += 8;
            std::string::size_type name_end = obj_str.find("\"", name_start);
            if (name_end != std::string::npos) {
                field.name = obj_str.substr(name_start, name_end - name_start);
            }
        }

        std::string::size_type type_start = obj_str.find("\"type\":\"");
        if (type_start != std::string::npos) {
            type_start += 8;
            std::string::size_type type_end = obj_str.find("\"", type_start);
            if (type_end != std::string::npos) {
                field.type = obj_str.substr(type_start, type_end - type_start);
            }
        }
        schema.push_back(field);
        pos = obj_end + 1;
    }
    return schema;
}


// --- Row Mappers for Models ---
DataSource mapToDataSource(sqlite3_stmt* stmt) {
    DataSource ds;
    ds.id = sqlite3_column_int(stmt, 0);
    ds.name = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
    ds.type = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
    ds.connection_string = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
    ds.created_at.timestamp_ms = sqlite3_column_int64(stmt, 4);
    ds.updated_at.timestamp_ms = sqlite3_column_int64(stmt, 5);
    ds.schema = jsonToSchemaVector(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6)));
    return ds;
}

Visualization mapToVisualization(sqlite3_stmt* stmt) {
    Visualization viz;
    viz.id = sqlite3_column_int(stmt, 0);
    viz.name = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
    viz.data_source_id = sqlite3_column_int(stmt, 2);
    viz.type = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
    viz.config = configStringToMap(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4)));
    viz.created_at.timestamp_ms = sqlite3_column_int64(stmt, 5);
    viz.updated_at.timestamp_ms = sqlite3_column_int64(stmt, 6);
    return viz;
}

Dashboard mapToDashboard(sqlite3_stmt* stmt) {
    Dashboard dash;
    dash.id = sqlite3_column_int(stmt, 0);
    dash.name = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
    dash.description = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
    dash.visualization_ids = stringToVectorInt(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3)));
    dash.created_at.timestamp_ms = sqlite3_column_int64(stmt, 4);
    dash.updated_at.timestamp_ms = sqlite3_column_int64(stmt, 5);
    return dash;
}

User mapToUser(sqlite3_stmt* stmt) {
    User user;
    user.id = sqlite3_column_int(stmt, 0);
    user.username = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
    user.hashed_password = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
    user.role = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
    user.created_at.timestamp_ms = sqlite3_column_int64(stmt, 4);
    user.updated_at.timestamp_ms = sqlite3_column_int64(stmt, 5);
    return user;
}

// --- Database Class Implementation ---

Database::Database(const std::string& db_path) : m_db(nullptr), m_db_path(db_path) {
    int rc = sqlite3_open(m_db_path.c_str(), &m_db);
    if (rc) {
        LOG_FATAL("Can't open database: {}", sqlite3_errmsg(m_db));
        // Consider throwing an exception here if failing to open DB is critical
        throw DbException("Failed to open database: " + std::string(sqlite3_errmsg(m_db)));
    } else {
        LOG_INFO("Opened database successfully: {}", m_db_path);
    }
}

Database::~Database() {
    if (m_db) {
        sqlite3_close(m_db);
        LOG_INFO("Closed database: {}", m_db_path);
    }
}

void Database::initialize() {
    LOG_INFO("Initializing database schema...");
    // Migration scripts would be handled here in a more complex system.
    // For now, simple CREATE TABLE IF NOT EXISTS.
    std::string sql_datasource = R"(
        CREATE TABLE IF NOT EXISTS data_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            type TEXT NOT NULL,
            connection_string TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            schema TEXT NOT NULL DEFAULT '[]'
        );
    )";
    std::string sql_visualization = R"(
        CREATE TABLE IF NOT EXISTS visualizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            data_source_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            config TEXT NOT NULL DEFAULT '{}',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (data_source_id) REFERENCES data_sources(id) ON DELETE CASCADE
        );
    )";
    std::string sql_dashboard = R"(
        CREATE TABLE IF NOT EXISTS dashboards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            visualization_ids TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
    )";
    std::string sql_users = R"(
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            hashed_password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'viewer',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
    )";

    execute(sql_datasource);
    execute(sql_visualization);
    execute(sql_dashboard);
    execute(sql_users);

    LOG_INFO("Database schema initialization complete.");
}

bool Database::execute(const std::string& sql) {
    char* err_msg = nullptr;
    int rc = sqlite3_exec(m_db, sql.c_str(), nullptr, nullptr, &err_msg);
    if (rc != SQLITE_OK) {
        LOG_ERROR("SQL error (execute): {} - {}", sql, err_msg);
        std::string error_message = err_msg;
        sqlite3_free(err_msg);
        throw DbException("Failed to execute SQL: " + error_message);
    }
    return true;
}

int Database::prepareStatement(const std::string& sql, sqlite3_stmt** stmt) {
    int rc = sqlite3_prepare_v2(m_db, sql.c_str(), -1, stmt, nullptr);
    if (rc != SQLITE_OK) {
        LOG_ERROR("SQL error (prepare): {} - {}", sql, sqlite3_errmsg(m_db));
        throw DbException("Failed to prepare statement: " + std::string(sqlite3_errmsg(m_db)));
    }
    return rc;
}

// --- CRUD for Data Sources ---

int Database::createDataSource(const DataSource& ds) {
    const char* sql = "INSERT INTO data_sources (name, type, connection_string, created_at, updated_at, schema) VALUES (?, ?, ?, ?, ?, ?);";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);

    sqlite3_bind_text(stmt, 1, ds.name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, ds.type.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, ds.connection_string.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int64(stmt, 4, ds.created_at.timestamp_ms);
    sqlite3_bind_int64(stmt, 5, ds.updated_at.timestamp_ms);
    sqlite3_bind_text(stmt, 6, schemaVectorToJson(ds.schema).c_str(), -1, SQLITE_TRANSIENT);

    int rc = sqlite3_step(stmt);
    if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (createDataSource): {} - {}", sqlite3_errmsg(m_db), sql);
        sqlite3_finalize(stmt);
        throw DbException("Failed to create data source: " + std::string(sqlite3_errmsg(m_db)));
    }
    int last_id = static_cast<int>(sqlite3_last_insert_rowid(m_db));
    sqlite3_finalize(stmt);
    return last_id;
}

std::unique_ptr<DataSource> Database::getDataSource(int id) {
    const char* sql = "SELECT id, name, type, connection_string, created_at, updated_at, schema FROM data_sources WHERE id = ?;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);
    sqlite3_bind_int(stmt, 1, id);

    int rc = sqlite3_step(stmt);
    if (rc == SQLITE_ROW) {
        auto ds = std::make_unique<DataSource>(mapToDataSource(stmt));
        sqlite3_finalize(stmt);
        return ds;
    } else if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (getDataSource): {} - ID {}", sqlite3_errmsg(m_db), id);
        sqlite3_finalize(stmt);
        throw DbException("Failed to get data source: " + std::string(sqlite3_errmsg(m_db)));
    }
    sqlite3_finalize(stmt);
    return nullptr; // Not found
}

std::vector<DataSource> Database::getAllDataSources() {
    const char* sql = "SELECT id, name, type, connection_string, created_at, updated_at, schema FROM data_sources;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);

    std::vector<DataSource> data_sources;
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        data_sources.push_back(mapToDataSource(stmt));
    }
    sqlite3_finalize(stmt);
    return data_sources;
}

bool Database::updateDataSource(const DataSource& ds) {
    const char* sql = "UPDATE data_sources SET name = ?, type = ?, connection_string = ?, updated_at = ?, schema = ? WHERE id = ?;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);

    sqlite3_bind_text(stmt, 1, ds.name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, ds.type.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, ds.connection_string.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int64(stmt, 4, ds.updated_at.timestamp_ms);
    sqlite3_bind_text(stmt, 5, schemaVectorToJson(ds.schema).c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 6, ds.id);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (updateDataSource): {} - ID {}", sqlite3_errmsg(m_db), ds.id);
        throw DbException("Failed to update data source: " + std::string(sqlite3_errmsg(m_db)));
    }
    return sqlite3_changes(m_db) > 0;
}

bool Database::deleteDataSource(int id) {
    const char* sql = "DELETE FROM data_sources WHERE id = ?;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);
    sqlite3_bind_int(stmt, 1, id);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (deleteDataSource): {} - ID {}", sqlite3_errmsg(m_db), id);
        throw DbException("Failed to delete data source: " + std::string(sqlite3_errmsg(m_db)));
    }
    return sqlite3_changes(m_db) > 0;
}

// --- CRUD for Visualizations ---

int Database::createVisualization(const Visualization& viz) {
    const char* sql = "INSERT INTO visualizations (name, data_source_id, type, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);

    sqlite3_bind_text(stmt, 1, viz.name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, viz.data_source_id);
    sqlite3_bind_text(stmt, 3, viz.type.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, configMapToString(viz.config).c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int64(stmt, 5, viz.created_at.timestamp_ms);
    sqlite3_bind_int64(stmt, 6, viz.updated_at.timestamp_ms);

    int rc = sqlite3_step(stmt);
    if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (createVisualization): {} - {}", sqlite3_errmsg(m_db), sql);
        sqlite3_finalize(stmt);
        throw DbException("Failed to create visualization: " + std::string(sqlite3_errmsg(m_db)));
    }
    int last_id = static_cast<int>(sqlite3_last_insert_rowid(m_db));
    sqlite3_finalize(stmt);
    return last_id;
}

std::unique_ptr<Visualization> Database::getVisualization(int id) {
    const char* sql = "SELECT id, name, data_source_id, type, config, created_at, updated_at FROM visualizations WHERE id = ?;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);
    sqlite3_bind_int(stmt, 1, id);

    int rc = sqlite3_step(stmt);
    if (rc == SQLITE_ROW) {
        auto viz = std::make_unique<Visualization>(mapToVisualization(stmt));
        sqlite3_finalize(stmt);
        return viz;
    } else if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (getVisualization): {} - ID {}", sqlite3_errmsg(m_db), id);
        sqlite3_finalize(stmt);
        throw DbException("Failed to get visualization: " + std::string(sqlite3_errmsg(m_db)));
    }
    sqlite3_finalize(stmt);
    return nullptr; // Not found
}

std::vector<Visualization> Database::getAllVisualizations() {
    const char* sql = "SELECT id, name, data_source_id, type, config, created_at, updated_at FROM visualizations;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);

    std::vector<Visualization> visualizations;
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        visualizations.push_back(mapToVisualization(stmt));
    }
    sqlite3_finalize(stmt);
    return visualizations;
}

bool Database::updateVisualization(const Visualization& viz) {
    const char* sql = "UPDATE visualizations SET name = ?, data_source_id = ?, type = ?, config = ?, updated_at = ? WHERE id = ?;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);

    sqlite3_bind_text(stmt, 1, viz.name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, viz.data_source_id);
    sqlite3_bind_text(stmt, 3, viz.type.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, configMapToString(viz.config).c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int64(stmt, 5, viz.updated_at.timestamp_ms);
    sqlite3_bind_int(stmt, 6, viz.id);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (updateVisualization): {} - ID {}", sqlite3_errmsg(m_db), viz.id);
        throw DbException("Failed to update visualization: " + std::string(sqlite3_errmsg(m_db)));
    }
    return sqlite3_changes(m_db) > 0;
}

bool Database::deleteVisualization(int id) {
    const char* sql = "DELETE FROM visualizations WHERE id = ?;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);
    sqlite3_bind_int(stmt, 1, id);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (deleteVisualization): {} - ID {}", sqlite3_errmsg(m_db), id);
        throw DbException("Failed to delete visualization: " + std::string(sqlite3_errmsg(m_db)));
    }
    return sqlite3_changes(m_db) > 0;
}

// --- CRUD for Dashboards ---

int Database::createDashboard(const Dashboard& dash) {
    const char* sql = "INSERT INTO dashboards (name, description, visualization_ids, created_at, updated_at) VALUES (?, ?, ?, ?, ?);";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);

    sqlite3_bind_text(stmt, 1, dash.name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, dash.description.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, vectorIntToString(dash.visualization_ids).c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int64(stmt, 4, dash.created_at.timestamp_ms);
    sqlite3_bind_int64(stmt, 5, dash.updated_at.timestamp_ms);

    int rc = sqlite3_step(stmt);
    if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (createDashboard): {} - {}", sqlite3_errmsg(m_db), sql);
        sqlite3_finalize(stmt);
        throw DbException("Failed to create dashboard: " + std::string(sqlite3_errmsg(m_db)));
    }
    int last_id = static_cast<int>(sqlite3_last_insert_rowid(m_db));
    sqlite3_finalize(stmt);
    return last_id;
}

std::unique_ptr<Dashboard> Database::getDashboard(int id) {
    const char* sql = "SELECT id, name, description, visualization_ids, created_at, updated_at FROM dashboards WHERE id = ?;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);
    sqlite3_bind_int(stmt, 1, id);

    int rc = sqlite3_step(stmt);
    if (rc == SQLITE_ROW) {
        auto dash = std::make_unique<Dashboard>(mapToDashboard(stmt));
        sqlite3_finalize(stmt);
        return dash;
    } else if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (getDashboard): {} - ID {}", sqlite3_errmsg(m_db), id);
        sqlite3_finalize(stmt);
        throw DbException("Failed to get dashboard: " + std::string(sqlite3_errmsg(m_db)));
    }
    sqlite3_finalize(stmt);
    return nullptr; // Not found
}

std::vector<Dashboard> Database::getAllDashboards() {
    const char* sql = "SELECT id, name, description, visualization_ids, created_at, updated_at FROM dashboards;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);

    std::vector<Dashboard> dashboards;
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        dashboards.push_back(mapToDashboard(stmt));
    }
    sqlite3_finalize(stmt);
    return dashboards;
}

bool Database::updateDashboard(const Dashboard& dash) {
    const char* sql = "UPDATE dashboards SET name = ?, description = ?, visualization_ids = ?, updated_at = ? WHERE id = ?;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);

    sqlite3_bind_text(stmt, 1, dash.name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, dash.description.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, vectorIntToString(dash.visualization_ids).c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int64(stmt, 4, dash.updated_at.timestamp_ms);
    sqlite3_bind_int(stmt, 5, dash.id);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (updateDashboard): {} - ID {}", sqlite3_errmsg(m_db), dash.id);
        throw DbException("Failed to update dashboard: " + std::string(sqlite3_errmsg(m_db)));
    }
    return sqlite3_changes(m_db) > 0;
}

bool Database::deleteDashboard(int id) {
    const char* sql = "DELETE FROM dashboards WHERE id = ?;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);
    sqlite3_bind_int(stmt, 1, id);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (deleteDashboard): {} - ID {}", sqlite3_errmsg(m_db), id);
        throw DbException("Failed to delete dashboard: " + std::string(sqlite3_errmsg(m_db)));
    }
    return sqlite3_changes(m_db) > 0;
}

// --- CRUD for Users ---

int Database::createUser(const User& user) {
    const char* sql = "INSERT INTO users (username, hashed_password, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?);";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);

    sqlite3_bind_text(stmt, 1, user.username.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, user.hashed_password.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, user.role.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int64(stmt, 4, user.created_at.timestamp_ms);
    sqlite3_bind_int64(stmt, 5, user.updated_at.timestamp_ms);

    int rc = sqlite3_step(stmt);
    if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (createUser): {} - {}", sqlite3_errmsg(m_db), sql);
        sqlite3_finalize(stmt);
        throw DbException("Failed to create user: " + std::string(sqlite3_errmsg(m_db)));
    }
    int last_id = static_cast<int>(sqlite3_last_insert_rowid(m_db));
    sqlite3_finalize(stmt);
    return last_id;
}

std::unique_ptr<User> Database::getUser(int id) {
    const char* sql = "SELECT id, username, hashed_password, role, created_at, updated_at FROM users WHERE id = ?;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);
    sqlite3_bind_int(stmt, 1, id);

    int rc = sqlite3_step(stmt);
    if (rc == SQLITE_ROW) {
        auto user = std::make_unique<User>(mapToUser(stmt));
        sqlite3_finalize(stmt);
        return user;
    } else if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (getUser): {} - ID {}", sqlite3_errmsg(m_db), id);
        sqlite3_finalize(stmt);
        throw DbException("Failed to get user: " + std::string(sqlite3_errmsg(m_db)));
    }
    sqlite3_finalize(stmt);
    return nullptr; // Not found
}

std::unique_ptr<User> Database::getUserByUsername(const std::string& username) {
    const char* sql = "SELECT id, username, hashed_password, role, created_at, updated_at FROM users WHERE username = ?;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);
    sqlite3_bind_text(stmt, 1, username.c_str(), -1, SQLITE_TRANSIENT);

    int rc = sqlite3_step(stmt);
    if (rc == SQLITE_ROW) {
        auto user = std::make_unique<User>(mapToUser(stmt));
        sqlite3_finalize(stmt);
        return user;
    } else if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (getUserByUsername): {} - Username {}", sqlite3_errmsg(m_db), username);
        sqlite3_finalize(stmt);
        throw DbException("Failed to get user by username: " + std::string(sqlite3_errmsg(m_db)));
    }
    sqlite3_finalize(stmt);
    return nullptr; // Not found
}

std::vector<User> Database::getAllUsers() {
    const char* sql = "SELECT id, username, hashed_password, role, created_at, updated_at FROM users;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);

    std::vector<User> users;
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        users.push_back(mapToUser(stmt));
    }
    sqlite3_finalize(stmt);
    return users;
}

bool Database::updateUser(const User& user) {
    const char* sql = "UPDATE users SET username = ?, hashed_password = ?, role = ?, updated_at = ? WHERE id = ?;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);

    sqlite3_bind_text(stmt, 1, user.username.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, user.hashed_password.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, user.role.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int64(stmt, 4, user.updated_at.timestamp_ms);
    sqlite3_bind_int(stmt, 5, user.id);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (updateUser): {} - ID {}", sqlite3_errmsg(m_db), user.id);
        throw DbException("Failed to update user: " + std::string(sqlite3_errmsg(m_db)));
    }
    return sqlite3_changes(m_db) > 0;
}

bool Database::deleteUser(int id) {
    const char* sql = "DELETE FROM users WHERE id = ?;";
    sqlite3_stmt* stmt;
    prepareStatement(sql, &stmt);
    sqlite3_bind_int(stmt, 1, id);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE) {
        LOG_ERROR("SQL error (deleteUser): {} - ID {}", sqlite3_errmsg(m_db), id);
        throw DbException("Failed to delete user: " + std::string(sqlite3_errmsg(m_db)));
    }
    return sqlite3_changes(m_db) > 0;
}

} // namespace VisGenius
```