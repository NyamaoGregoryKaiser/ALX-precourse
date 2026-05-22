```cpp
#include "Database.h"
#include "utils/Logger.h"
#include <fstream>
#include <filesystem>
#include <algorithm>
#include <chrono>

std::unique_ptr<DbConnectionPool> Database::s_pool = nullptr;

DbConnectionPool::DbConnectionPool(const std::string& connString, size_t poolSize)
    : _connString(connString), _poolSize(poolSize) {
    LOG_INFO("Initializing DB connection pool with {} connections.", _poolSize);
    for (size_t i = 0; i < _poolSize; ++i) {
        try {
            _connections.push(createConnection());
        } catch (const pqxx::broken_connection& e) {
            LOG_ERROR("Failed to create initial DB connection: {}", e.what());
            // It might be acceptable to start with fewer connections if some fail,
            // but for robustness, we might want to throw or retry.
            // For now, let's log and continue with available connections.
        }
    }
    if (_connections.empty()) {
        throw DbException("Failed to establish any initial database connections.");
    }
}

DbConnectionPool::~DbConnectionPool() {
    closeAllConnections();
    LOG_INFO("DB connection pool destroyed.");
}

std::shared_ptr<pqxx::connection> DbConnectionPool::createConnection() {
    try {
        auto conn = std::make_shared<pqxx::connection>(_connString);
        if (!conn->is_open()) {
            throw DbException("Failed to open connection.");
        }
        LOG_DEBUG("New DB connection created.");
        return conn;
    } catch (const pqxx::broken_connection& e) {
        throw DbException(std::string("Broken connection while creating: ") + e.what());
    } catch (const std::exception& e) {
        throw DbException(std::string("Error creating connection: ") + e.what());
    }
}

void DbConnectionPool::expandPoolIfNeeded() {
    // This simple expansion logic only adds if the queue is empty AND less than max pool size
    // More robust logic might check current active connections vs. max.
    // For this example, we keep it basic.
    if (_connections.empty() && _connections.size() < _poolSize) {
        try {
            _connections.push(createConnection());
            LOG_WARN("Expanded DB pool with one new connection due to demand.");
        } catch (const DbException& e) {
            LOG_ERROR("Failed to expand DB pool: {}", e.what());
        }
    }
}

std::shared_ptr<pqxx::connection> DbConnectionPool::getConnection() {
    std::unique_lock<std::mutex> lock(_mutex);
    // Wait until a connection is available or timeout (optional)
    _condition.wait(lock, [this]{ return !_connections.empty(); });

    std::shared_ptr<pqxx::connection> conn = _connections.front();
    _connections.pop();

    // Revalidate connection (e.g., if it's been idle too long)
    if (!conn->is_open() || !conn->is_live()) {
        LOG_WARN("Found dead connection in pool. Replacing...");
        try {
            conn = createConnection(); // Create a new one
        } catch (const DbException& e) {
            LOG_ERROR("Failed to replace dead connection: {}", e.what());
            // If cannot create new, try to get another one from pool or throw.
            // For now, will try to get another.
            if (!_connections.empty()) {
                 conn = _connections.front();
                 _connections.pop();
            } else {
                throw DbException("Failed to get a live database connection.");
            }
        }
    }
    LOG_DEBUG("DB connection acquired from pool. Remaining: {}", _connections.size());
    return conn;
}

void DbConnectionPool::releaseConnection(std::shared_ptr<pqxx::connection> conn) {
    std::unique_lock<std::mutex> lock(_mutex);
    if (conn && conn->is_open()) {
        _connections.push(conn);
        _condition.notify_one(); // Notify waiting threads that a connection is available
        LOG_DEBUG("DB connection released to pool. Current size: {}", _connections.size());
    } else {
        LOG_WARN("Attempted to release a null or closed connection to the pool.");
    }
}

void DbConnectionPool::closeAllConnections() {
    std::lock_guard<std::mutex> lock(_mutex);
    while (!_connections.empty()) {
        auto conn = _connections.front();
        _connections.pop();
        if (conn->is_open()) {
            conn->disconnect();
        }
    }
    LOG_INFO("All DB connections in pool closed.");
}

void Database::initPool(const std::string& host, const std::string& user,
                        const std::string& password, const std::string& dbname,
                        int port, size_t poolSize) {
    std::string connString = "host=" + host + " user=" + user + " password=" + password +
                             " dbname=" + dbname + " port=" + std::to_string(port);
    s_pool = std::make_unique<DbConnectionPool>(connString, poolSize);
}

std::shared_ptr<pqxx::connection> Database::getConnection() {
    if (!s_pool) {
        throw DbException("Database pool not initialized.");
    }
    return s_pool->getConnection();
}

void Database::releaseConnection(std::shared_ptr<pqxx::connection> conn) {
    if (!s_pool) {
        throw DbException("Database pool not initialized.");
    }
    s_pool->releaseConnection(conn);
}

void Database::shutdownPool() {
    if (s_pool) {
        s_pool.reset(); // Calls the destructor of DbConnectionPool
    }
}

void Database::runMigrations(const std::string& migrationsPath) {
    LOG_INFO("Running database migrations from: {}", migrationsPath);
    auto conn = getConnection();
    try {
        pqxx::work txn(*conn);
        txn.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);");
        txn.commit();
        LOG_INFO("Schema migrations table checked/created.");

        std::vector<std::string> migrationFiles;
        for (const auto& entry : std::filesystem::directory_iterator(migrationsPath)) {
            if (entry.is_regular_file() && entry.path().extension() == ".sql") {
                migrationFiles.push_back(entry.path().filename().string());
            }
        }
        std::sort(migrationFiles.begin(), migrationFiles.end());

        for (const auto& filename : migrationFiles) {
            std::string version = filename.substr(0, filename.find("__"));
            std::string checkSql = "SELECT COUNT(*) FROM schema_migrations WHERE version = " + txn.quote(version) + ";";
            pqxx::result result = txn.exec(checkSql);

            if (result[0][0].as<long>() == 0) {
                std::string filePath = migrationsPath + "/" + filename;
                std::ifstream file(filePath);
                if (file.is_open()) {
                    std::string sql((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
                    txn.exec(sql);
                    std::string insertSql = "INSERT INTO schema_migrations (version) VALUES (" + txn.quote(version) + ");";
                    txn.exec(insertSql);
                    LOG_INFO("Applied migration: {}", filename);
                } else {
                    LOG_ERROR("Failed to open migration file: {}", filePath);
                }
            } else {
                LOG_DEBUG("Migration already applied: {}", filename);
            }
        }
        txn.commit(); // Final commit after all migrations
        LOG_INFO("All database migrations processed successfully.");
    } catch (const pqxx::pqxx_exception& e) {
        LOG_ERROR("Database migration failed: {}", e.what());
        if (conn && conn->is_open()) conn->disconnect(); // Ensure connection is closed
        throw DbException(std::string("Migration error: ") + e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("General error during database migration: {}", e.what());
        if (conn && conn->is_open()) conn->disconnect();
        throw DbException(std::string("Migration error: ") + e.what());
    }
    releaseConnection(conn);
}

std::vector<pqxx::row> Database::executeQuery(const std::string& sql,
                                              const std::vector<std::string>& params) {
    auto conn = getConnection();
    try {
        pqxx::nontransaction N(*conn); // Use nontransaction for read-only queries
        pqxx::result R;
        if (params.empty()) {
            R = N.exec(sql);
        } else {
            // Prepared statement example (simplified, needs more robust binding for types)
            // For now, this is a basic placeholder; in a real app, use txn.prepare
            // and txn.exec_prepared with proper type handling.
            std::string parameterized_sql = sql;
            for (size_t i = 0; i < params.size(); ++i) {
                // This is a highly simplified parameter replacement.
                // It's vulnerable to SQL injection if params can contain specific characters.
                // **DO NOT USE IN PRODUCTION WITHOUT PROPER PARAMETER BINDING.**
                // For a production system, use `pqxx::work::exec_prepared` with parameters.
                size_t pos = parameterized_sql.find("$" + std::to_string(i + 1));
                if (pos != std::string::npos) {
                    parameterized_sql.replace(pos, 2, N.quote(params[i]));
                }
            }
            R = N.exec(parameterized_sql);
        }
        N.commit(); // Nontransaction commit does nothing
        releaseConnection(conn);
        return {R.begin(), R.end()};
    } catch (const pqxx::pqxx_exception& e) {
        LOG_ERROR("Database query failed: {} - SQL: {}", e.what(), sql);
        releaseConnection(conn);
        throw DbException(std::string("Query error: ") + e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("General error during database query: {}", e.what());
        releaseConnection(conn);
        throw DbException(std::string("Query error: ") + e.what());
    }
}

int Database::executeCommand(const std::string& sql,
                             const std::vector<std::string>& params) {
    auto conn = getConnection();
    try {
        pqxx::work txn(*conn); // Use work for transactional commands
        pqxx::result R;
        if (params.empty()) {
            R = txn.exec(sql);
        } else {
            std::string parameterized_sql = sql;
            for (size_t i = 0; i < params.size(); ++i) {
                // Again, simplified placeholder for parameter binding.
                // Production-grade requires `txn.prepare` and `txn.exec_prepared`.
                size_t pos = parameterized_sql.find("$" + std::to_string(i + 1));
                if (pos != std::string::npos) {
                    parameterized_sql.replace(pos, 2, txn.quote(params[i]));
                }
            }
            R = txn.exec(parameterized_sql);
        }
        txn.commit();
        releaseConnection(conn);
        return R.affected_rows();
    } catch (const pqxx::pqxx_exception& e) {
        LOG_ERROR("Database command failed: {} - SQL: {}", e.what(), sql);
        releaseConnection(conn);
        throw DbException(std::string("Command error: ") + e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("General error during database command: {}", e.what());
        releaseConnection(conn);
        throw DbException(std::string("Command error: ") + e.what());
    }
}
```