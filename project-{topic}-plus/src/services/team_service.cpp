#include "team_service.h"
#include "../utils/logger.h"
#include <algorithm>

TeamService::TeamService(DbManager& db_manager) : db_manager_(db_manager) {}

Team TeamService::createTeam(Team& team) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        std::string query = "INSERT INTO teams (name, description) VALUES ($1, $2) RETURNING id, created_at, updated_at;";
        pqxx::result r = txn.exec_params(
            query,
            team.name,
            team.description
        );

        if (!r.empty()) {
            team.id = r[0]["id"].as<std::string>();
            team.created_at = r[0]["created_at"].as<std::chrono::system_clock::time_point>();
            team.updated_at = r[0]["updated_at"].as<std::chrono::system_clock::time_point>();
            txn.commit();
            Logger::info("Team created: {}", team.name);
            return team;
        }
        throw std::runtime_error("Failed to create team: No ID returned.");
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error creating team: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error creating team.");
    }
}

std::optional<Team> TeamService::getTeamById(const std::string& id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());

    try {
        std::string query = "SELECT id, name, description, created_at, updated_at FROM teams WHERE id = $1;";
        pqxx::result r = N.exec_params(query, id);

        if (!r.empty()) {
            Team t;
            t.id = r[0]["id"].as<std::string>();
            t.name = r[0]["name"].as<std::string>();
            t.description = r[0]["description"].is_null() ? std::nullopt : std::make_optional(r[0]["description"].as<std::string>());
            t.created_at = r[0]["created_at"].as<std::chrono::system_clock::time_point>();
            t.updated_at = r[0]["updated_at"].as<std::chrono::system_clock::time_point>();
            // Also retrieve members
            t.member_ids = getTeamMembers(id);
            return t;
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting team by ID: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error retrieving team.");
    }
    return std::nullopt;
}

std::vector<Team> TeamService::getAllTeams() {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());
    std::vector<Team> teams;

    try {
        std::string query = "SELECT id, name, description, created_at, updated_at FROM teams ORDER BY name;";
        pqxx::result r = N.exec(query);

        for (const auto& row : r) {
            Team t;
            t.id = row["id"].as<std::string>();
            t.name = row["name"].as<std::string>();
            t.description = row["description"].is_null() ? std::nullopt : std::make_optional(row["description"].as<std::string>());
            t.created_at = row["created_at"].as<std::chrono::system_clock::time_point>();
            t.updated_at = row["updated_at"].as<std::chrono::system_clock::time_point>();
            // Optionally retrieve members for all teams, but can be heavy
            // t.member_ids = getTeamMembers(t.id);
            teams.push_back(t);
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting all teams: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error retrieving teams.");
    }
    return teams;
}

Team TeamService::updateTeam(const std::string& id, const Team& team_updates) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        std::string query = "UPDATE teams SET ";
        std::vector<std::string> set_clauses;
        std::vector<pqxx::param_type> params;
        int param_idx = 1;

        if (!team_updates.name.empty()) {
            set_clauses.push_back("name = $" + std::to_string(param_idx++));
            params.push_back(team_updates.name);
        }
        if (team_updates.description.has_value()) {
            set_clauses.push_back("description = $" + std::to_string(param_idx++));
            params.push_back(team_updates.description);
        }

        if (set_clauses.empty()) {
            txn.abort();
            auto existing_team = getTeamById(id);
            if(existing_team) return *existing_team;
            throw TeamNotFoundException("Team not found for update (no fields changed): " + id);
        }

        query += pqxx::to_string(pqxx::join(set_clauses, ", "));
        query += ", updated_at = CURRENT_TIMESTAMP WHERE id = $" + std::to_string(param_idx++) + " RETURNING *;";
        params.push_back(id);

        pqxx::result r = txn.exec_params(query, params);

        if (!r.empty()) {
            txn.commit();
            Logger::info("Team updated: {}", id);
            Team t;
            t.id = r[0]["id"].as<std::string>();
            t.name = r[0]["name"].as<std::string>();
            t.description = r[0]["description"].is_null() ? std::nullopt : std::make_optional(r[0]["description"].as<std::string>());
            t.created_at = r[0]["created_at"].as<std::chrono::system_clock::time_point>();
            t.updated_at = r[0]["updated_at"].as<std::chrono::system_clock::time_point>();
            t.member_ids = getTeamMembers(id);
            return t;
        }
        throw TeamNotFoundException("Team not found for update: " + id);
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error updating team: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error updating team.");
    }
}

void TeamService::deleteTeam(const std::string& id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        std::string query = "DELETE FROM teams WHERE id = $1;";
        pqxx::result r = txn.exec_params(query, id);

        if (r.affected_rows() == 0) {
            throw TeamNotFoundException("Team not found for deletion: " + id);
        }
        txn.commit();
        Logger::info("Team deleted: {}", id);
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error deleting team: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error deleting team.");
    }
}

void TeamService::addMemberToTeam(const std::string& team_id, const std::string& user_id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        // Check if already a member
        if (isUserTeamMember(team_id, user_id)) {
            Logger::warn("User {} is already a member of team {}", user_id, team_id);
            txn.abort(); // No change needed
            return;
        }

        std::string query = "INSERT INTO user_team (user_id, team_id) VALUES ($1, $2);";
        txn.exec_params(query, user_id, team_id);
        txn.commit();
        Logger::info("User {} added to team {}", user_id, team_id);
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error adding user to team: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error adding user to team.");
    }
}

void TeamService::removeMemberFromTeam(const std::string& team_id, const std::string& user_id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        std::string query = "DELETE FROM user_team WHERE user_id = $1 AND team_id = $2;";
        pqxx::result r = txn.exec_params(query, user_id, team_id);

        if (r.affected_rows() == 0) {
            Logger::warn("User {} was not found as a member of team {}", user_id, team_id);
            // Optionally throw UserNotFoundException or similar
        } else {
            txn.commit();
            Logger::info("User {} removed from team {}", user_id, team_id);
        }
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error removing user from team: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error removing user from team.");
    }
}

std::vector<std::string> TeamService::getTeamMembers(const std::string& team_id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());
    std::vector<std::string> members;

    try {
        std::string query = "SELECT user_id FROM user_team WHERE team_id = $1;";
        pqxx::result r = N.exec_params(query, team_id);

        for (const auto& row : r) {
            members.push_back(row["user_id"].as<std::string>());
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting team members: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error retrieving team members.");
    }
    return members;
}

bool TeamService::isUserTeamMember(const std::string& team_id, const std::string& user_id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());

    try {
        std::string query = "SELECT 1 FROM user_team WHERE team_id = $1 AND user_id = $2;";
        pqxx::result r = N.exec_params(query, team_id, user_id);
        return !r.empty();
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error checking user team membership: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error checking user team membership.");
    }
}
```