```cpp
#ifndef WEBSCRAPER_BASE_REPOSITORY_H
#define WEBSCRAPER_BASE_REPOSITORY_H

#include "db_manager.h"
#include "../common/error_handler.h"
#include "../common/logger.h"
#include <string>
#include <chrono>
#include <uuid/uuid.h> // For UUID generation

// Helper to convert C++ time_point to PostgreSQL timestamp string
inline std::string toPgTimestamp(const std::chrono::system_clock::time_point& tp) {
    auto in_time_t = std::chrono::system_clock::to_time_t(tp);
    std::stringstream ss;
    ss << std::put_time(std::gmtime(&in_time_t), "%Y-%m-%d %H:%M:%S UTC");
    return ss.str();
}

// Helper to convert PostgreSQL timestamp string to C++ time_point
inline std::chrono::system_clock::time_point fromPgTimestamp(const std::string& ts_str) {
    std::tm t{};
    std::istringstream ss(ts_str);
    ss >> std::get_time(&t, "%Y-%m-%d %H:%M:%S"); // Note: ignores UTC for simplicity
    return std::chrono::system_clock::from_time_t(std::mktime(&t));
}

// Helper to generate UUID
inline std::string generateUuid() {
    uuid_t uuid;
    uuid_generate_random(uuid);
    char uuid_str[37]; // 36 chars + null terminator
    uuid_unparse_lower(uuid, uuid_str);
    return uuid_str;
}

class BaseRepository {
protected:
    std::shared_ptr<pqxx::connection> getConnection() {
        return DatabaseManager::getInstance().getConnection();
    }

    void releaseConnection(std::shared_ptr<pqxx::connection> conn) {
        DatabaseManager::getInstance().releaseConnection(conn);
    }

    // Common transaction wrapper
    template<typename Func>
    auto executeTransaction(Func func) {
        std::shared_ptr<pqxx::connection> conn = nullptr;
        try {
            conn = getConnection();
            pqxx::work W(*conn);
            auto result = func(W);
            W.commit();
            return result;
        } catch (const pqxx::sql_error& e) {
            Logger::error("BaseRepository", "SQL Error: {} Query: {}", e.what(), e.query());
            throw DatabaseException("Database error: " + std::string(e.what()));
        } catch (const std::exception& e) {
            Logger::error("BaseRepository", "Generic database operation error: {}", e.what());
            throw DatabaseException("An unexpected database error occurred: " + std::string(e.what()));
        } finally {
            if (conn) {
                releaseConnection(conn);
            }
        }
    }

    // Common non-transaction wrapper
    template<typename Func>
    auto executeNontransaction(Func func) {
        std::shared_ptr<pqxx::connection> conn = nullptr;
        try {
            conn = getConnection();
            pqxx::nontransaction N(*conn);
            auto result = func(N);
            return result;
        } catch (const pqxx::sql_error& e) {
            Logger::error("BaseRepository", "SQL Error: {} Query: {}", e.what(), e.query());
            throw DatabaseException("Database error: " + std::string(e.what()));
        } catch (const std::exception& e) {
            Logger::error("BaseRepository", "Generic database operation error: {}", e.what());
            throw DatabaseException("An unexpected database error occurred: " + std::string(e.what()));
        } finally {
            if (conn) {
                releaseConnection(conn);
            }
        }
    }
};

#endif // WEBSCRAPER_BASE_REPOSITORY_H
```