#include "DBManager.h"
#include "../logger/Logger.h"
#include <chrono>
#include <thread>
#include <stdexcept>

DBManager& DBManager::get_instance() {
    static DBManager instance;
    return instance;
}

DBManager::DBManager() : _config(AppConfig::get_instance()) {
    _max_pool_size = _config.db_pool_size;
    _current_connections = 0;
    init_pool();
}

DBManager::~DBManager() {
    // Ensure all connections are closed when DBManager is destroyed
    std::lock_guard<std::mutex> lock(_pool_mutex);
    while (!_connection_pool.empty()) {
        auto conn = _connection_pool.front();
        _connection_pool.pop();
        if (conn && conn->is_open()) {
            conn->disconnect();
            Logger::get_logger()->info("Disconnected from database.");
        }
    }
}

std::string DBManager::get_connection_string() const {
    return "dbname=" + _config.db_name +
           " user=" + _config.db_user +
           " password=" + _config.db_password +
           " host=" + _config.db_host +
           " port=" + _config.db_port;
}

void DBManager::init_pool() {
    std::lock_guard<std::mutex> lock(_pool_mutex);
    std::string conn_str = get_connection_string();
    for (int i = 0; i < _max_pool_size / 2; ++i) { // Initialize with half the pool size
        try {
            auto conn = std::make_shared<pqxx::connection>(conn_str);
            if (conn->is_open()) {
                _connection_pool.push(conn);
                _current_connections++;
                Logger::get_logger()->info("DB connection {} initialized successfully.", i + 1);
            } else {
                Logger::get_logger()->error("Failed to open DB connection {}.", i + 1);
            }
        } catch (const pqxx::broken_connection& e) {
            Logger::get_logger()->critical("Database connection broken during initialization: {}", e.what());
            throw DatabaseException("Critical: Could not establish initial database connections.");
        } catch (const std::exception& e) {
            Logger::get_logger()->critical("Database error during initialization: {}", e.what());
            throw DatabaseException("Critical: Database initialization failed: " + std::string(e.what()));
        }
    }
    Logger::get_logger()->info("DB connection pool initialized with {} connections. Max size: {}", _current_connections, _max_pool_size);
}

std::shared_ptr<pqxx::connection> DBManager::getConnection() {
    std::unique_lock<std::mutex> lock(_pool_mutex);
    // Wait until a connection is available or we can create a new one within limits
    _pool_cond.wait(lock, [this]{
        return !_connection_pool.empty() || _current_connections < _max_pool_size;
    });

    if (!_connection_pool.empty()) {
        auto conn = _connection_pool.front();
        _connection_pool.pop();
        if (!conn->is_open()) { // Reconnect if connection is broken
            try {
                Logger::get_logger()->warn("Detected broken connection, attempting to reconnect...");
                conn->reconnect();
                Logger::get_logger()->info("Connection re-established.");
            } catch (const pqxx::broken_connection& e) {
                Logger::get_logger()->error("Failed to reconnect to database: {}", e.what());
                // Decrement current connections and try getting another one or create new
                _current_connections--;
                return getConnection(); // Recursive call, handle carefully to avoid infinite loop
            }
        }
        return conn;
    } else { // Pool is empty, but we can still create more connections
        try {
            std::string conn_str = get_connection_string();
            auto conn = std::make_shared<pqxx::connection>(conn_str);
            if (conn->is_open()) {
                _current_connections++;
                Logger::get_logger()->debug("Created new DB connection. Current connections: {}", _current_connections);
                return conn;
            } else {
                Logger::get_logger()->error("Failed to open new DB connection.");
                throw DatabaseException("Failed to open new database connection.");
            }
        } catch (const pqxx::broken_connection& e) {
            Logger::get_logger()->error("Database connection broken when creating new connection: {}", e.what());
            throw DatabaseException("Failed to create new database connection: " + std::string(e.what()));
        } catch (const std::exception& e) {
            Logger::get_logger()->error("Database error when creating new connection: {}", e.what());
            throw DatabaseException("Database error: " + std::string(e.what()));
        }
    }
}

void DBManager::returnConnection(std::shared_ptr<pqxx::connection> conn) {
    std::lock_guard<std::mutex> lock(_pool_mutex);
    if (conn) {
        _connection_pool.push(conn);
        _pool_cond.notify_one(); // Notify one waiting thread that a connection is available
    }
}

void DBManager::executeCommand(const std::string& sql) {
    auto conn = getConnection();
    try {
        pqxx::work T(*conn);
        T.exec(sql);
        T.commit();
    } catch (const pqxx::sql_error& e) {
        Logger::get_logger()->error("SQL error in executeCommand: {} -- Query: {}", e.what(), e.query());
        throw DatabaseException("SQL command failed: " + std::string(e.what()));
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Database error in executeCommand: {}", e.what());
        throw DatabaseException("Database error: " + std::string(e.what()));
    }
    returnConnection(conn);
}

pqxx::result DBManager::executeQuery(const std::string& sql) {
    auto conn = getConnection();
    try {
        pqxx::nontransaction N(*conn); // Nontransaction for SELECTs
        pqxx::result R = N.exec(sql);
        returnConnection(conn);
        return R;
    } catch (const pqxx::sql_error& e) {
        Logger::get_logger()->error("SQL error in executeQuery: {} -- Query: {}", e.what(), e.query());
        returnConnection(conn);
        throw DatabaseException("SQL query failed: " + std::string(e.what()));
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Database error in executeQuery: {}", e.what());
        returnConnection(conn);
        throw DatabaseException("Database error: " + std::string(e.what()));
    }
}

pqxx::result DBManager::executeParameterizedQuery(const std::string& sql, const std::vector<std::string>& params) {
    auto conn = getConnection();
    try {
        pqxx::nontransaction N(*conn);
        pqxx::result R = N.exec_params(sql, params);
        returnConnection(conn);
        return R;
    } catch (const pqxx::sql_error& e) {
        Logger::get_logger()->error("SQL error in executeParameterizedQuery: {} -- Query: {}", e.what(), e.query());
        returnConnection(conn);
        throw DatabaseException("SQL query failed: " + std::string(e.what()));
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Database error in executeParameterizedQuery: {}", e.what());
        returnConnection(conn);
        throw DatabaseException("Database error: " + std::string(e.what()));
    }
}

std::unique_ptr<pqxx::work> DBManager::beginTransaction() {
    auto conn = getConnection();
    // pqxx::work manages its own connection, it gets a raw pointer from shared_ptr
    // and returns it to the pool when commit/rollback is called (or on destruction)
    return std::make_unique<pqxx::work>(*conn.get());
}