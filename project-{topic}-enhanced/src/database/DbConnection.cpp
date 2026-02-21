```cpp
#include "DbConnection.h"
#include <fstream>
#include <sstream>
#include <algorithm> // For std::sort

// Static member definitions
std::string DbConnection::conn_string;
std::vector<std::shared_ptr<pqxx::connection>> DbConnection::connection_pool;
std::mutex DbConnection::pool_mutex;
std::condition_variable DbConnection::condition;
bool DbConnection::pool_initialized = false;
bool DbConnection::shutting_down = false;
int DbConnection::max_pool_size = 0;

void DbConnection::init_pool(const std::string& host, int port, const std::string& dbname,
                             const std::string& user, const std::string& password, int pool_size) {
    std::lock_guard<std::mutex> lock(pool_mutex);
    if (pool_initialized) {
        LOG_WARN("Database connection pool already initialized.");
        return;
    }

    conn_string = "host=" + host + " port=" + std::to_string(port) +
                  " dbname=" + dbname + " user=" + user + " password=" + password;
    max_pool_size = pool_size;

    LOG_INFO("Initializing database connection pool with {} connections...", pool_size);

    for (int i = 0; i < pool_size; ++i) {
        try {
            connection_pool.push_back(std::make_shared<pqxx::connection>(conn_string));
            LOG_INFO("Connection {} established.", i + 1);
        } catch (const pqxx::sql_error& e) {
            LOG_CRITICAL("Failed to establish DB connection {}: {}. Query: {}", i + 1, e.what(), e.query());
            throw;
        } catch (const std::exception& e) {
            LOG_CRITICAL("Failed to establish DB connection {}: {}", i + 1, e.what());
            throw;
        }
    }
    pool_initialized = true;
    LOG_INFO("Database connection pool created successfully.");
}

std::shared_ptr<pqxx::connection> DbConnection::get_connection() {
    std::unique_lock<std::mutex> lock(pool_mutex);
    condition.wait(lock, [] { return !connection_pool.empty() || shutting_down; });

    if (shutting_down) {
        throw std::runtime_error("Connection pool is shutting down.");
    }

    if (connection_pool.empty()) {
        // This case should ideally not be reached if condition.wait functions correctly
        // and connections are returned, but as a fallback, create one if possible and within limits.
        if (max_pool_size > 0 && connection_pool.size() < max_pool_size) {
            LOG_WARN("No connections available in pool, attempting to create a new one (might exceed initial size temporarily).");
            try {
                connection_pool.push_back(std::make_shared<pqxx::connection>(conn_string));
                LOG_INFO("New connection created due to pool exhaustion.");
            } catch (const std::exception& e) {
                LOG_ERROR("Failed to create new connection: {}", e.what());
                throw std::runtime_error("Failed to get database connection from pool.");
            }
        } else {
            LOG_ERROR("No connections available in pool and cannot create more.");
            throw std::runtime_error("Failed to get database connection from pool (exhausted).");
        }
    }
    
    std::shared_ptr<pqxx::connection> conn = connection_pool.back();
    connection_pool.pop_back();
    return conn;
}

void DbConnection::release_connection(std::shared_ptr<pqxx::connection> conn) {
    std::unique_lock<std::mutex> lock(pool_mutex);
    if (!shutting_down) {
        connection_pool.push_back(conn);
        lock.unlock();
        condition.notify_one();
    } else {
        LOG_INFO("Releasing connection during shutdown, connection will be closed.");
    }
}

void DbConnection::shutdown_pool() {
    std::lock_guard<std::mutex> lock(pool_mutex);
    shutting_down = true;
    condition.notify_all(); // Notify all waiting threads that shutdown is happening

    LOG_INFO("Shutting down database connection pool...");
    for (auto& conn : connection_pool) {
        if (conn->is_open()) {
            conn->disconnect();
        }
    }
    connection_pool.clear();
    pool_initialized = false;
    LOG_INFO("Database connection pool shut down.");
}

void DbConnection::execute_sql_file(pqxx::connection& conn, const std::string& filepath, const std::string& description) {
    LOG_INFO("Executing {} from: {}", description, filepath);
    std::ifstream file(filepath);
    if (!file.is_open()) {
        throw std::runtime_error("Could not open SQL file: " + filepath);
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string sql = buffer.str();

    try {
        pqxx::work w(conn);
        w.exec(sql);
        w.commit();
        LOG_INFO("{} '{}' executed successfully.", description, filepath);
    } catch (const pqxx::sql_error& e) {
        LOG_ERROR("Failed to execute {} '{}': {}. Query: {}", description, filepath, e.what(), e.query());
        throw;
    }
}

void DbConnection::apply_migrations() {
    auto conn_ptr = get_connection();
    pqxx::connection& conn = *conn_ptr;
    
    try {
        pqxx::work w(conn);
        w.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMP DEFAULT NOW())");
        w.commit();
    } catch (const pqxx::sql_error& e) {
        LOG_ERROR("Failed to create schema_migrations table: {}. Query: {}", e.what(), e.query());
        release_connection(conn_ptr);
        throw;
    }

    std::vector<std::string> migration_files;
    for (const auto& entry : std::filesystem::directory_iterator("src/database/migrations")) {
        if (entry.is_regular_file() && entry.path().extension() == ".sql") {
            migration_files.push_back(entry.path().filename().string());
        }
    }
    std::sort(migration_files.begin(), migration_files.end());

    for (const std::string& filename : migration_files) {
        std::string version = filename.substr(0, filename.find('_'));
        
        try {
            pqxx::nontransaction n(conn);
            pqxx::result r = n.exec_params("SELECT COUNT(*) FROM schema_migrations WHERE version = $1", version);
            if (r[0][0].as<long>() == 0) {
                LOG_INFO("Applying migration: {}", filename);
                execute_sql_file(conn, "src/database/migrations/" + filename, "Migration");
                pqxx::work w_insert(conn);
                w_insert.exec_params("INSERT INTO schema_migrations (version) VALUES ($1)", version);
                w_insert.commit();
            } else {
                LOG_INFO("Migration {} already applied. Skipping.", filename);
            }
        } catch (const std::exception& e) {
            LOG_CRITICAL("Failed to apply migration {}: {}", filename, e.what());
            release_connection(conn_ptr);
            throw;
        }
    }
    release_connection(conn_ptr);
}

void DbConnection::seed_data() {
    auto conn_ptr = get_connection();
    pqxx::connection& conn = *conn_ptr;

    std::string seed_filepath = "src/database/seed/seed_data.sql";
    std::ifstream file(seed_filepath);
    if (!file.is_open()) {
        LOG_INFO("No seed data file found at '{}'. Skipping seeding.", seed_filepath);
        release_connection(conn_ptr);
        return;
    }

    // Check if seed data has already been applied by looking for a specific table or entry
    // This is a simple check; more robust solutions might involve a 'seed_migrations' table.
    try {
        pqxx::nontransaction n(conn);
        pqxx::result r = n.exec("SELECT COUNT(*) FROM users WHERE email = 'admin@example.com'");
        if (r[0][0].as<long>() > 0) {
            LOG_INFO("Seed data appears to be already present. Skipping seeding.");
            release_connection(conn_ptr);
            return;
        }
    } catch (const pqxx::sql_error& e) {
        // Table might not exist, proceed with seeding
        LOG_WARN("Could not check for existing seed data (table 'users' might not exist yet): {}", e.what());
    }


    try {
        LOG_INFO("Applying seed data from: {}", seed_filepath);
        execute_sql_file(conn, seed_filepath, "Seed data");
        LOG_INFO("Seed data applied successfully.");
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to apply seed data: {}", e.what());
        release_connection(conn_ptr);
        throw;
    }
    release_connection(conn_ptr);
}
```