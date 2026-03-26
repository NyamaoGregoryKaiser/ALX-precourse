#pragma once
#include <string>
#include <pqxx/pqxx>
#include <spdlog/spdlog.h>
#include "../core/middleware.h" // For ApiException

class BaseRepository {
protected:
    std::string connection_string;

    // Helper to get a connection
    pqxx::connection get_connection() const {
        try {
            return pqxx::connection(connection_string);
        } catch (const pqxx::broken_connection& e) {
            spdlog::error("Database connection failed: {}", e.what());
            throw ApiException(Pistache::Http::Code::Internal_Server_Error, "Database connection error");
        } catch (const std::exception& e) {
            spdlog::error("Error getting database connection: {}", e.what());
            throw ApiException(Pistache::Http::Code::Internal_Server_Error, "Database error");
        }
    }

public:
    BaseRepository(const std::string& conn_str) : connection_string(conn_str) {}
    virtual ~BaseRepository() = default;

    // Define common CRUD interfaces (pure virtual methods) if useful for all repositories,
    // or keep it for common utility methods like error handling.
};