```cpp
#ifndef SYSTEMSERVICE_H
#define SYSTEMSERVICE_H

#include <string>
#include <vector>
#include <memory>
#include <pqxx/pqxx>
#include <optional>

#include "../models/System.h"
#include "../utils/Logger.h"
#include "../utils/Crypto.h"
#include "../exceptions/ApiException.h"
#include "CacheService.h"

class SystemService {
public:
    SystemService(std::shared_ptr<pqxx::connection> conn) : db_conn(std::move(conn)) {}

    // Create a new system
    System create_system(const std::string& user_id, const std::string& name, const std::optional<std::string>& description) {
        if (name.empty()) {
            throw ApiException(crow::BAD_REQUEST, "System name cannot be empty.");
        }

        std::string system_id = Crypto::generate_uuid();
        std::string api_key = Crypto::generate_uuid(); // Use UUID as a simple API key

        try {
            pqxx::work w(*db_conn);
            pqxx::result r;
            if (description) {
                r = w.exec_params(
                    "INSERT INTO systems (id, user_id, name, description, api_key) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, name, description, api_key, created_at, updated_at",
                    system_id, user_id, name, *description, api_key
                );
            } else {
                r = w.exec_params(
                    "INSERT INTO systems (id, user_id, name, api_key) VALUES ($1, $2, $3, $4) RETURNING id, user_id, name, description, api_key, created_at, updated_at",
                    system_id, user_id, name, api_key
                );
            }
            w.commit();

            if (r.empty()) {
                throw ApiException(crow::INTERNAL_SERVER_ERROR, "Failed to create system, no data returned.");
            }

            System system;
            system.id = r[0]["id"].as<std::string>();
            system.user_id = r[0]["user_id"].as<std::string>();
            system.name = r[0]["name"].as<std::string>();
            system.description = r[0]["description"].is_null() ? std::nullopt : std::make_optional(r[0]["description"].as<std::string>());
            system.api_key = r[0]["api_key"].as<std::string>();
            system.created_at = r[0]["created_at"].as<std::string>();
            system.updated_at = r[0]["updated_at"].as<std::string>();

            // Add to cache
            CacheService::set("system:" + system.id, system.to_json().dump());

            LOG_INFO("System created: {}({}) for user {}", system.name, system.id, user_id);
            return system;

        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error creating system for user {}: {}. Query: {}", user_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error creating system.");
        } catch (const ApiException&) {
            throw; // Re-throw specific API exceptions
        } catch (const std::exception& e) {
            LOG_ERROR("Error creating system for user {}: {}", user_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during system creation.");
        }
    }

    // Get a system by its ID
    std::optional<System> get_system(const std::string& user_id, const std::string& system_id) {
        // Try to retrieve from cache first
        std::optional<std::string> cached_system_json = CacheService::get("system:" + system_id);
        if (cached_system_json) {
            try {
                System cached_system = System::from_json(nlohmann::json::parse(*cached_system_json));
                // Ensure the system belongs to the requesting user
                if (cached_system.user_id == user_id) {
                    LOG_DEBUG("System {} found in cache.", system_id);
                    return cached_system;
                } else {
                    LOG_WARN("System {} found in cache but belongs to different user {}. Cache might be stale/incorrect.", system_id, cached_system.user_id);
                    // Invalidate potentially incorrect cache entry
                    CacheService::remove("system:" + system_id);
                }
            } catch (const std::exception& e) {
                LOG_ERROR("Failed to parse cached system data for {}: {}. Invalidating cache.", system_id, e.what());
                CacheService::remove("system:" + system_id);
            }
        }


        try {
            pqxx::nontransaction n(*db_conn);
            pqxx::result r = n.exec_params(
                "SELECT id, user_id, name, description, api_key, created_at, updated_at FROM systems WHERE id = $1 AND user_id = $2",
                system_id, user_id
            );

            if (r.empty()) {
                return std::nullopt;
            }

            System system;
            system.id = r[0]["id"].as<std::string>();
            system.user_id = r[0]["user_id"].as<std::string>();
            system.name = r[0]["name"].as<std::string>();
            system.description = r[0]["description"].is_null() ? std::nullopt : std::make_optional(r[0]["description"].as<std::string>());
            system.api_key = r[0]["api_key"].as<std::string>();
            system.created_at = r[0]["created_at"].as<std::string>();
            system.updated_at = r[0]["updated_at"].as<std::string>();
            
            // Update cache
            CacheService::set("system:" + system.id, system.to_json().dump());

            return system;
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error fetching system {}: {}. Query: {}", system_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error fetching system.");
        } catch (const std::exception& e) {
            LOG_ERROR("Error fetching system {}: {}", system_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }
    
    // Get a system by its API Key (for metric ingestion)
    std::optional<System> get_system_by_api_key(const std::string& api_key) {
        // Caching for API key lookup can be complex if API keys are often rotated
        // For simplicity, we directly query the DB here.
        try {
            pqxx::nontransaction n(*db_conn);
            pqxx::result r = n.exec_params(
                "SELECT id, user_id, name, description, api_key, created_at, updated_at FROM systems WHERE api_key = $1",
                api_key
            );

            if (r.empty()) {
                return std::nullopt;
            }

            System system;
            system.id = r[0]["id"].as<std::string>();
            system.user_id = r[0]["user_id"].as<std::string>();
            system.name = r[0]["name"].as<std::string>();
            system.description = r[0]["description"].is_null() ? std::nullopt : std::make_optional(r[0]["description"].as<std::string>());
            system.api_key = r[0]["api_key"].as<std::string>();
            system.created_at = r[0]["created_at"].as<std::string>();
            system.updated_at = r[0]["updated_at"].as<std::string>();
            return system;
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error fetching system by API Key: {}. Query: {}", e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error fetching system by API key.");
        } catch (const std::exception& e) {
            LOG_ERROR("Error fetching system by API Key: {}", e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }

    // Get all systems for a user
    std::vector<System> get_systems_for_user(const std::string& user_id) {
        std::vector<System> systems;
        try {
            pqxx::nontransaction n(*db_conn);
            pqxx::result r = n.exec_params(
                "SELECT id, user_id, name, description, api_key, created_at, updated_at FROM systems WHERE user_id = $1 ORDER BY name",
                user_id
            );

            for (const auto& row : r) {
                System system;
                system.id = row["id"].as<std::string>();
                system.user_id = row["user_id"].as<std::string>();
                system.name = row["name"].as<std::string>();
                system.description = row["description"].is_null() ? std::nullopt : std::make_optional(row["description"].as<std::string>());
                system.api_key = row["api_key"].as<std::string>();
                system.created_at = row["created_at"].as<std::string>();
                system.updated_at = row["updated_at"].as<std::string>();
                systems.push_back(system);
                // Also update cache for these systems
                CacheService::set("system:" + system.id, system.to_json().dump());
            }
            return systems;
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error fetching systems for user {}: {}. Query: {}", user_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error fetching systems.");
        } catch (const std::exception& e) {
            LOG_ERROR("Error fetching systems for user {}: {}", user_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }

    // Update an existing system
    System update_system(const std::string& user_id, const std::string& system_id,
                         const std::optional<std::string>& name, const std::optional<std::string>& description) {
        
        if (!name && !description) {
            throw ApiException(crow::BAD_REQUEST, "No fields provided for update.");
        }

        std::vector<std::string> set_clauses;
        std::vector<pqxx::param_type> params;
        int param_idx = 1;

        if (name) {
            set_clauses.push_back("name = $" + std::to_string(param_idx++));
            params.push_back(*name);
        }
        if (description) {
            set_clauses.push_back("description = $" + std::to_string(param_idx++));
            params.push_back(*description);
        } else if (description.has_value() && description->empty()) { // Allow setting description to NULL
            set_clauses.push_back("description = NULL");
        }

        std::string update_query = "UPDATE systems SET " + set_clauses[0];
        for (size_t i = 1; i < set_clauses.size(); ++i) {
            update_query += ", " + set_clauses[i];
        }
        update_query += " WHERE id = $" + std::to_string(param_idx++) + " AND user_id = $" + std::to_string(param_idx++) + " RETURNING id, user_id, name, description, api_key, created_at, updated_at";
        params.push_back(system_id);
        params.push_back(user_id);

        try {
            pqxx::work w(*db_conn);
            pqxx::result r = w.exec_params(update_query, params);
            w.commit();

            if (r.empty()) {
                throw ApiException(crow::NOT_FOUND, "System not found or no changes made.");
            }

            System updated_system;
            updated_system.id = r[0]["id"].as<std::string>();
            updated_system.user_id = r[0]["user_id"].as<std::string>();
            updated_system.name = r[0]["name"].as<std::string>();
            updated_system.description = r[0]["description"].is_null() ? std::nullopt : std::make_optional(r[0]["description"].as<std::string>());
            updated_system.api_key = r[0]["api_key"].as<std::string>();
            updated_system.created_at = r[0]["created_at"].as<std::string>();
            updated_system.updated_at = r[0]["updated_at"].as<std::string>();
            
            // Invalidate/update cache
            CacheService::remove("system:" + updated_system.id);
            CacheService::set("system:" + updated_system.id, updated_system.to_json().dump());

            LOG_INFO("System {}({}) updated for user {}", updated_system.name, updated_system.id, user_id);
            return updated_system;

        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error updating system {}: {}. Query: {}", system_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error updating system.");
        } catch (const ApiException&) {
            throw; // Re-throw specific API exceptions
        } catch (const std::exception& e) {
            LOG_ERROR("Error updating system {}: {}", system_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during system update.");
        }
    }

    // Delete a system
    void delete_system(const std::string& user_id, const std::string& system_id) {
        try {
            pqxx::work w(*db_conn);
            pqxx::result r = w.exec_params(
                "DELETE FROM systems WHERE id = $1 AND user_id = $2 RETURNING id",
                system_id, user_id
            );
            w.commit();

            if (r.empty()) {
                throw ApiException(crow::NOT_FOUND, "System not found or not owned by user.");
            }
            
            // Invalidate cache
            CacheService::remove("system:" + system_id);

            LOG_INFO("System {} deleted for user {}.", system_id, user_id);
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error deleting system {}: {}. Query: {}", system_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error deleting system.");
        } catch (const ApiException&) {
            throw; // Re-throw specific API exceptions
        } catch (const std::exception& e) {
            LOG_ERROR("Error deleting system {}: {}", system_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during system deletion.");
        }
    }

private:
    std::shared_ptr<pqxx::connection> db_conn;
};

#endif // SYSTEMSERVICE_H
```