#include "DBManager.h"
#include <fstream>
#include <stdexcept>
#include <filesystem> // C++17 for directory iteration
#include <algorithm> // For std::sort
#include <boost/uuid/uuid.hpp>
#include <boost/uuid/uuid_generators.hpp>
#include <boost/uuid/uuid_io.hpp>

// --- UUID Implementation (Boost UUID) ---
std::string UUID::generate() {
    boost::uuids::uuid uuid = boost::uuids::random_generator()();
    return boost::uuids::to_string(uuid);
}

// --- DBManager Implementation ---

DBManager::DBManager(const std::string& connection_string)
    : connection_string_(connection_string) {}

DBManager::~DBManager() {
    disconnect();
}

void DBManager::connect() {
    try {
        conn_ = std::make_unique<pqxx::connection>(connection_string_);
        if (conn_->is_open()) {
            Logger::info("Successfully connected to database: " + conn_->dbname());
        } else {
            Logger::error("Failed to connect to database: " + connection_string_);
            throw std::runtime_error("Failed to connect to database.");
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("Database connection error: " + std::string(e.what()));
        throw;
    }
}

void DBManager::disconnect() {
    if (conn_ && conn_->is_open()) {
        conn_->disconnect();
        Logger::info("Database disconnected.");
    }
}

void DBManager::initializeSchema() {
    Logger::info("Running database migrations...");
    const std::string migrations_dir = "database/migrations";
    if (!std::filesystem::exists(migrations_dir)) {
        Logger::warn("Migrations directory not found: " + migrations_dir);
        return;
    }

    std::vector<std::string> migration_files;
    for (const auto& entry : std::filesystem::directory_iterator(migrations_dir)) {
        if (entry.is_regular_file() && entry.path().extension() == ".sql") {
            migration_files.push_back(entry.path().string());
        }
    }

    // Sort migration files to ensure correct order (e.g., 001_..., 002_...)
    std::sort(migration_files.begin(), migration_files.end());

    pqxx::work w(*conn_);
    try {
        // Create migrations tracking table if it doesn't exist
        w.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());");
        w.commit();
    } catch (const std::exception& e) {
        Logger::error("Error creating schema_migrations table: " + std::string(e.what()));
        throw;
    }

    for (const std::string& file_path : migration_files) {
        std::string version = std::filesystem::path(file_path).stem().string(); // e.g., "001_initial_schema"
        pqxx::work check_w(*conn_);
        pqxx::result r = check_w.exec_params("SELECT COUNT(*) FROM schema_migrations WHERE version = $1", version);
        check_w.commit();

        if (r[0][0].as<long>() == 0) {
            // Migration not applied, run it
            std::ifstream file(file_path);
            if (!file.is_open()) {
                Logger::error("Could not open migration file: " + file_path);
                throw std::runtime_error("Could not open migration file: " + file_path);
            }
            std::stringstream buffer;
            buffer << file.rdbuf();
            std::string sql_content = buffer.str();

            pqxx::work migrate_w(*conn_);
            try {
                migrate_w.exec(sql_content);
                migrate_w.exec_params("INSERT INTO schema_migrations (version) VALUES ($1)", version);
                migrate_w.commit();
                Logger::info("Applied migration: " + version);
            } catch (const pqxx::sql_error& e) {
                migrate_w.abort();
                Logger::error("Failed to apply migration " + version + ": " + std::string(e.what()));
                throw;
            }
        } else {
            Logger::debug("Migration already applied, skipping: " + version);
        }
    }
    Logger::info("Database migrations complete.");
}


// --- User Operations ---
void DBManager::createUser(const User& user) {
    pqxx::work w(*conn_);
    w.exec_params(
        "INSERT INTO users (id, username, email, password_hash, created_at, updated_at) "
        "VALUES ($1, $2, $3, $4, $5, $6)",
        user.id, user.username, user.email, user.password_hash,
        user.created_at, user.updated_at
    );
    w.commit();
}

User DBManager::findUserByEmail(const std::string& email) {
    pqxx::nontransaction n(*conn_);
    pqxx::result r = n.exec_params("SELECT id, username, email, password_hash FROM users WHERE email = $1", email);
    if (!r.empty()) {
        const auto& row = r[0];
        User user;
        user.id = row["id"].as<std::string>();
        user.username = row["username"].as<std::string>();
        user.email = row["email"].as<std::string>();
        user.password_hash = row["password_hash"].as<std::string>();
        return user;
    }
    return User(); // Return an empty User if not found
}

User DBManager::findUserById(const std::string& id) {
    pqxx::nontransaction n(*conn_);
    pqxx::result r = n.exec_params("SELECT id, username, email, password_hash FROM users WHERE id = $1", id);
    if (!r.empty()) {
        const auto& row = r[0];
        User user;
        user.id = row["id"].as<std::string>();
        user.username = row["username"].as<std::string>();
        user.email = row["email"].as<std::string>();
        user.password_hash = row["password_hash"].as<std::string>();
        return user;
    }
    return User();
}

// --- Data Source Operations ---
void DBManager::createDataSource(const DataSource& ds) {
    pqxx::work w(*conn_);
    w.exec_params(
        "INSERT INTO data_sources (id, user_id, name, type, connection_string, schema_definition, file_path, created_at, updated_at) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        ds.id, ds.user_id, ds.name, ds.type, ds.connection_string, ds.schema_definition, ds.file_path,
        ds.created_at, ds.updated_at
    );
    w.commit();
}

DataSource DBManager::findDataSourceById(const std::string& id) {
    pqxx::nontransaction n(*conn_);
    pqxx::result r = n.exec_params("SELECT id, user_id, name, type, connection_string, schema_definition, file_path, created_at, updated_at FROM data_sources WHERE id = $1", id);
    if (!r.empty()) {
        const auto& row = r[0];
        DataSource ds;
        ds.id = row["id"].as<std::string>();
        ds.user_id = row["user_id"].as<std::string>();
        ds.name = row["name"].as<std::string>();
        ds.type = row["type"].as<std::string>();
        ds.connection_string = get_optional(row, "connection_string", std::string());
        ds.schema_definition = get_optional(row, "schema_definition", std::string());
        ds.file_path = get_optional(row, "file_path", std::string());
        ds.created_at = row["created_at"].as<std::chrono::system_clock::time_point>();
        ds.updated_at = row["updated_at"].as<std::chrono::system_clock::time_point>();
        return ds;
    }
    return DataSource();
}

std::vector<DataSource> DBManager::findDataSourcesByUserId(const std::string& user_id) {
    std::vector<DataSource> data_sources;
    pqxx::nontransaction n(*conn_);
    pqxx::result r = n.exec_params("SELECT id, user_id, name, type, connection_string, schema_definition, file_path, created_at, updated_at FROM data_sources WHERE user_id = $1", user_id);
    for (const auto& row : r) {
        DataSource ds;
        ds.id = row["id"].as<std::string>();
        ds.user_id = row["user_id"].as<std::string>();
        ds.name = row["name"].as<std::string>();
        ds.type = row["type"].as<std::string>();
        ds.connection_string = get_optional(row, "connection_string", std::string());
        ds.schema_definition = get_optional(row, "schema_definition", std::string());
        ds.file_path = get_optional(row, "file_path", std::string());
        ds.created_at = row["created_at"].as<std::chrono::system_clock::time_point>();
        ds.updated_at = row["updated_at"].as<std::chrono::system_clock::time_point>();
        data_sources.push_back(ds);
    }
    return data_sources;
}

void DBManager::updateDataSource(const DataSource& ds) {
    pqxx::work w(*conn_);
    w.exec_params(
        "UPDATE data_sources SET name = $1, type = $2, connection_string = $3, schema_definition = $4, file_path = $5, updated_at = $6 WHERE id = $7 AND user_id = $8",
        ds.name, ds.type, ds.connection_string, ds.schema_definition, ds.file_path,
        ds.updated_at, ds.id, ds.user_id
    );
    w.commit();
}

void DBManager::deleteDataSource(const std::string& id) {
    pqxx::work w(*conn_);
    w.exec_params("DELETE FROM data_sources WHERE id = $1", id);
    w.commit();
}

// --- Visualization Operations ---
void DBManager::createVisualization(const Visualization& viz) {
    pqxx::work w(*conn_);
    w.exec_params(
        "INSERT INTO visualizations (id, user_id, name, description, data_source_id, type, configuration, created_at, updated_at) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        viz.id, viz.user_id, viz.name, viz.description, viz.data_source_id, viz.type, viz.configuration,
        viz.created_at, viz.updated_at
    );
    w.commit();
}

Visualization DBManager::findVisualizationById(const std::string& id) {
    pqxx::nontransaction n(*conn_);
    pqxx::result r = n.exec_params("SELECT id, user_id, name, description, data_source_id, type, configuration, created_at, updated_at FROM visualizations WHERE id = $1", id);
    if (!r.empty()) {
        const auto& row = r[0];
        Visualization viz;
        viz.id = row["id"].as<std::string>();
        viz.user_id = row["user_id"].as<std::string>();
        viz.name = row["name"].as<std::string>();
        viz.description = get_optional(row, "description", std::string());
        viz.data_source_id = row["data_source_id"].as<std::string>();
        viz.type = row["type"].as<std::string>();
        viz.configuration = row["configuration"].as<std::string>();
        viz.created_at = row["created_at"].as<std::chrono::system_clock::time_point>();
        viz.updated_at = row["updated_at"].as<std::chrono::system_clock::time_point>();
        return viz;
    }
    return Visualization();
}

std::vector<Visualization> DBManager::findVisualizationsByUserId(const std::string& user_id) {
    std::vector<Visualization> visualizations;
    pqxx::nontransaction n(*conn_);
    pqxx::result r = n.exec_params("SELECT id, user_id, name, description, data_source_id, type, configuration, created_at, updated_at FROM visualizations WHERE user_id = $1", user_id);
    for (const auto& row : r) {
        Visualization viz;
        viz.id = row["id"].as<std::string>();
        viz.user_id = row["user_id"].as<std::string>();
        viz.name = row["name"].as<std::string>();
        viz.description = get_optional(row, "description", std::string());
        viz.data_source_id = row["data_source_id"].as<std::string>();
        viz.type = row["type"].as<std::string>();
        viz.configuration = row["configuration"].as<std::string>();
        viz.created_at = row["created_at"].as<std::chrono::system_clock::time_point>();
        viz.updated_at = row["updated_at"].as<std::chrono::system_clock::time_point>();
        visualizations.push_back(viz);
    }
    return visualizations;
}

void DBManager::updateVisualization(const Visualization& viz) {
    pqxx::work w(*conn_);
    w.exec_params(
        "UPDATE visualizations SET name = $1, description = $2, data_source_id = $3, type = $4, configuration = $5, updated_at = $6 WHERE id = $7 AND user_id = $8",
        viz.name, viz.description, viz.data_source_id, viz.type, viz.configuration,
        viz.updated_at, viz.id, viz.user_id
    );
    w.commit();
}

void DBManager::deleteVisualization(const std::string& id) {
    pqxx::work w(*conn_);
    w.exec_params("DELETE FROM visualizations WHERE id = $1", id);
    w.commit();
}

// --- Dashboard Operations ---
void DBManager::createDashboard(const Dashboard& dash) {
    pqxx::work w(*conn_);
    w.exec_params(
        "INSERT INTO dashboards (id, user_id, name, description, layout_config, created_at, updated_at) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7)",
        dash.id, dash.user_id, dash.name, dash.description, dash.layout_config,
        dash.created_at, dash.updated_at
    );
    w.commit();
}

Dashboard DBManager::findDashboardById(const std::string& id) {
    pqxx::nontransaction n(*conn_);
    pqxx::result r = n.exec_params("SELECT id, user_id, name, description, layout_config, created_at, updated_at FROM dashboards WHERE id = $1", id);
    if (!r.empty()) {
        const auto& row = r[0];
        Dashboard dash;
        dash.id = row["id"].as<std::string>();
        dash.user_id = row["user_id"].as<std::string>();
        dash.name = row["name"].as<std::string>();
        dash.description = get_optional(row, "description", std::string());
        dash.layout_config = row["layout_config"].as<std::string>();
        dash.created_at = row["created_at"].as<std::chrono::system_clock::time_point>();
        dash.updated_at = row["updated_at"].as<std::chrono::system_clock::time_point>();
        return dash;
    }
    return Dashboard();
}

std::vector<Dashboard> DBManager::findDashboardsByUserId(const std::string& user_id) {
    std::vector<Dashboard> dashboards;
    pqxx::nontransaction n(*conn_);
    pqxx::result r = n.exec_params("SELECT id, user_id, name, description, layout_config, created_at, updated_at FROM dashboards WHERE user_id = $1", user_id);
    for (const auto& row : r) {
        Dashboard dash;
        dash.id = row["id"].as<std::string>();
        dash.user_id = row["user_id"].as<std::string>();
        dash.name = row["name"].as<std::string>();
        dash.description = get_optional(row, "description", std::string());
        dash.layout_config = row["layout_config"].as<std::string>();
        dash.created_at = row["created_at"].as<std::chrono::system_clock::time_point>();
        dash.updated_at = row["updated_at"].as<std::chrono::system_clock::time_point>();
        dashboards.push_back(dash);
    }
    return dashboards;
}

void DBManager::updateDashboard(const Dashboard& dash) {
    pqxx::work w(*conn_);
    w.exec_params(
        "UPDATE dashboards SET name = $1, description = $2, layout_config = $3, updated_at = $4 WHERE id = $5 AND user_id = $6",
        dash.name, dash.description, dash.layout_config,
        dash.updated_at, dash.id, dash.user_id
    );
    w.commit();
}

void DBManager::deleteDashboard(const std::string& id) {
    pqxx::work w(*conn_);
    w.exec_params("DELETE FROM dashboards WHERE id = $1", id);
    w.commit();
}