#include "project_service.h"
#include "../utils/logger.h"
#include <algorithm>

ProjectService::ProjectService(DbManager& db_manager) : db_manager_(db_manager) {}

Project ProjectService::createProject(Project& project, const std::string& requester_user_id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        // 1. Create the project
        std::string query = "INSERT INTO projects (name, description, start_date, end_date, status, owner_id, team_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at, updated_at;";
        pqxx::result r = txn.exec_params(
            query,
            project.name,
            project.description,
            project.start_date,
            project.end_date,
            project.status,
            project.owner_id,
            project.team_id
        );

        if (!r.empty()) {
            project.id = r[0]["id"].as<std::string>();
            project.created_at = r[0]["created_at"].as<std::chrono::system_clock::time_point>();
            project.updated_at = r[0]["updated_at"].as<std::chrono::system_clock::time_point>();

            // 2. Add the owner as a project member with 'admin' role
            std::string user_project_query = "INSERT INTO user_project (user_id, project_id, role) VALUES ($1, $2, $3);";
            txn.exec_params(user_project_query, project.owner_id, project.id, "admin");

            txn.commit();
            Logger::info("Project created: {} by user {}", project.name, requester_user_id);
            return project;
        }
        throw std::runtime_error("Failed to create project: No ID returned.");
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error creating project: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error creating project.");
    }
}

std::optional<Project> ProjectService::getProjectById(const std::string& id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());

    try {
        std::string query = "SELECT id, name, description, start_date, end_date, status, owner_id, team_id, created_at, updated_at FROM projects WHERE id = $1;";
        pqxx::result r = N.exec_params(query, id);

        if (!r.empty()) {
            Project p;
            p.id = r[0]["id"].as<std::string>();
            p.name = r[0]["name"].as<std::string>();
            p.description = r[0]["description"].is_null() ? std::nullopt : std::make_optional(r[0]["description"].as<std::string>());
            p.start_date = r[0]["start_date"].is_null() ? std::nullopt : std::make_optional(r[0]["start_date"].as<std::string>());
            p.end_date = r[0]["end_date"].is_null() ? std::nullopt : std::make_optional(r[0]["end_date"].as<std::string>());
            p.status = r[0]["status"].as<std::string>();
            p.owner_id = r[0]["owner_id"].as<std::string>();
            p.team_id = r[0]["team_id"].is_null() ? std::nullopt : std::make_optional(r[0]["team_id"].as<std::string>());
            p.created_at = r[0]["created_at"].as<std::chrono::system_clock::time_point>();
            p.updated_at = r[0]["updated_at"].as<std::chrono::system_clock::time_point>();
            return p;
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting project by ID: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error retrieving project.");
    }
    return std::nullopt;
}

std::vector<Project> ProjectService::getAllProjects() {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());
    std::vector<Project> projects;

    try {
        std::string query = "SELECT id, name, description, start_date, end_date, status, owner_id, team_id, created_at, updated_at FROM projects ORDER BY created_at DESC;";
        pqxx::result r = N.exec(query);

        for (const auto& row : r) {
            Project p;
            p.id = row["id"].as<std::string>();
            p.name = row["name"].as<std::string>();
            p.description = row["description"].is_null() ? std::nullopt : std::make_optional(row["description"].as<std::string>());
            p.start_date = row["start_date"].is_null() ? std::nullopt : std::make_optional(row["start_date"].as<std::string>());
            p.end_date = row["end_date"].is_null() ? std::nullopt : std::make_optional(row["end_date"].as<std::string>());
            p.status = row["status"].as<std::string>();
            p.owner_id = row["owner_id"].as<std::string>();
            p.team_id = row["team_id"].is_null() ? std::nullopt : std::make_optional(row["team_id"].as<std::string>());
            p.created_at = row["created_at"].as<std::chrono::system_clock::time_point>();
            p.updated_at = row["updated_at"].as<std::chrono::system_clock::time_point>();
            projects.push_back(p);
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting all projects: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error retrieving projects.");
    }
    return projects;
}

std::vector<Project> ProjectService::getProjectsByOwner(const std::string& owner_id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());
    std::vector<Project> projects;

    try {
        std::string query = "SELECT id, name, description, start_date, end_date, status, owner_id, team_id, created_at, updated_at FROM projects WHERE owner_id = $1 ORDER BY created_at DESC;";
        pqxx::result r = N.exec_params(query, owner_id);

        for (const auto& row : r) {
            Project p;
            p.id = row["id"].as<std::string>();
            p.name = row["name"].as<std::string>();
            p.description = row["description"].is_null() ? std::nullopt : std::make_optional(row["description"].as<std::string>());
            p.start_date = row["start_date"].is_null() ? std::nullopt : std::make_optional(row["start_date"].as<std::string>());
            p.end_date = row["end_date"].is_null() ? std::nullopt : std::make_optional(row["end_date"].as<std::string>());
            p.status = row["status"].as<std::string>();
            p.owner_id = row["owner_id"].as<std::string>();
            p.team_id = row["team_id"].is_null() ? std::nullopt : std::make_optional(row["team_id"].as<std::string>());
            p.created_at = row["created_at"].as<std::chrono::system_clock::time_point>();
            p.updated_at = row["updated_at"].as<std::chrono::system_clock::time_point>();
            projects.push_back(p);
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting projects by owner: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error retrieving projects.");
    }
    return projects;
}

std::vector<Project> ProjectService::getProjectsByUser(const std::string& user_id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());
    std::vector<Project> projects;

    try {
        std::string query = R"(
            SELECT DISTINCT p.id, p.name, p.description, p.start_date, p.end_date, p.status, p.owner_id, p.team_id, p.created_at, p.updated_at
            FROM projects p
            LEFT JOIN user_project up ON p.id = up.project_id
            WHERE p.owner_id = $1 OR up.user_id = $1
            ORDER BY p.created_at DESC;
        )";
        pqxx::result r = N.exec_params(query, user_id);

        for (const auto& row : r) {
            Project p;
            p.id = row["id"].as<std::string>();
            p.name = row["name"].as<std::string>();
            p.description = row["description"].is_null() ? std::nullopt : std::make_optional(row["description"].as<std::string>());
            p.start_date = row["start_date"].is_null() ? std::nullopt : std::make_optional(row["start_date"].as<std::string>());
            p.end_date = row["end_date"].is_null() ? std::nullopt : std::make_optional(row["end_date"].as<std::string>());
            p.status = row["status"].as<std::string>();
            p.owner_id = row["owner_id"].as<std::string>();
            p.team_id = row["team_id"].is_null() ? std::nullopt : std::make_optional(row["team_id"].as<std::string>());
            p.created_at = row["created_at"].as<std::chrono::system_clock::time_point>();
            p.updated_at = row["updated_at"].as<std::chrono::system_clock::time_point>();
            projects.push_back(p);
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting projects by user: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error retrieving projects.");
    }
    return projects;
}


Project ProjectService::updateProject(const std::string& id, const Project& project_updates) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        std::string query = "UPDATE projects SET ";
        std::vector<std::string> set_clauses;
        std::vector<pqxx::param_type> params;
        int param_idx = 1;

        if (!project_updates.name.empty()) {
            set_clauses.push_back("name = $" + std::to_string(param_idx++));
            params.push_back(project_updates.name);
        }
        if (project_updates.description.has_value()) {
            set_clauses.push_back("description = $" + std::to_string(param_idx++));
            params.push_back(project_updates.description);
        }
        if (project_updates.start_date.has_value()) {
            set_clauses.push_back("start_date = $" + std::to_string(param_idx++));
            params.push_back(project_updates.start_date);
        }
        if (project_updates.end_date.has_value()) {
            set_clauses.push_back("end_date = $" + std::to_string(param_idx++));
            params.push_back(project_updates.end_date);
        }
        if (!project_updates.status.empty()) {
            set_clauses.push_back("status = $" + std::to_string(param_idx++));
            params.push_back(project_updates.status);
        }
        if (!project_updates.owner_id.empty()) { // Only allow owner_id update if explicitly allowed by logic
            set_clauses.push_back("owner_id = $" + std::to_string(param_idx++));
            params.push_back(project_updates.owner_id);
        }
        if (project_updates.team_id.has_value()) {
            set_clauses.push_back("team_id = $" + std::to_string(param_idx++));
            params.push_back(project_updates.team_id);
        }

        if (set_clauses.empty()) {
            // No fields to update, return current project state.
            // A better approach might be to fetch current and return or throw an error.
            txn.abort(); // No changes made
            auto existing_project = getProjectById(id);
            if(existing_project) return *existing_project;
            throw ProjectNotFoundException("Project not found for update (no fields changed): " + id);
        }

        query += pqxx::to_string(pqxx::join(set_clauses, ", "));
        query += ", updated_at = CURRENT_TIMESTAMP WHERE id = $" + std::to_string(param_idx++) + " RETURNING *;";
        params.push_back(id);

        pqxx::result r = txn.exec_params(query, params);

        if (!r.empty()) {
            txn.commit();
            Logger::info("Project updated: {}", id);
            Project p;
            p.id = r[0]["id"].as<std::string>();
            p.name = r[0]["name"].as<std::string>();
            p.description = r[0]["description"].is_null() ? std::nullopt : std::make_optional(r[0]["description"].as<std::string>());
            p.start_date = r[0]["start_date"].is_null() ? std::nullopt : std::make_optional(r[0]["start_date"].as<std::string>());
            p.end_date = r[0]["end_date"].is_null() ? std::nullopt : std::make_optional(r[0]["end_date"].as<std::string>());
            p.status = r[0]["status"].as<std::string>();
            p.owner_id = r[0]["owner_id"].as<std::string>();
            p.team_id = r[0]["team_id"].is_null() ? std::nullopt : std::make_optional(r[0]["team_id"].as<std::string>());
            p.created_at = r[0]["created_at"].as<std::chrono::system_clock::time_point>();
            p.updated_at = r[0]["updated_at"].as<std::chrono::system_clock::time_point>();
            return p;
        }
        throw ProjectNotFoundException("Project not found for update: " + id);
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error updating project: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error updating project.");
    }
}

void ProjectService::deleteProject(const std::string& id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        std::string query = "DELETE FROM projects WHERE id = $1;";
        pqxx::result r = txn.exec_params(query, id);

        if (r.affected_rows() == 0) {
            throw ProjectNotFoundException("Project not found for deletion: " + id);
        }
        txn.commit();
        Logger::info("Project deleted: {}", id);
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error deleting project: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error deleting project.");
    }
}

bool ProjectService::isUserProjectOwner(const std::string& project_id, const std::string& user_id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());

    try {
        std::string query = "SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2;";
        pqxx::result r = N.exec_params(query, project_id, user_id);
        return !r.empty();
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error checking project owner: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error checking project owner.");
    }
}

bool ProjectService::isUserProjectMember(const std::string& project_id, const std::string& user_id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());

    try {
        std::string query = "SELECT 1 FROM user_project WHERE project_id = $1 AND user_id = $2;";
        pqxx::result r = N.exec_params(query, project_id, user_id);
        return !r.empty();
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error checking project member: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error checking project member.");
    }
}

void ProjectService::addUserToProject(const std::string& project_id, const std::string& user_id, const std::string& role) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        // Check if user or project exists (optional, but good for robust error handling)
        // Check if already a member
        if (isUserProjectMember(project_id, user_id)) {
            Logger::warn("User {} is already a member of project {}", user_id, project_id);
            // Optionally update role here
            std::string update_query = "UPDATE user_project SET role = $3 WHERE user_id = $1 AND project_id = $2 RETURNING role;";
            pqxx::result r_update = txn.exec_params(update_query, user_id, project_id, role);
            if (!r_update.empty()) {
                 Logger::info("Updated user {} role in project {} to {}", user_id, project_id, role);
                 txn.commit();
                 return;
            }
        }

        std::string query = "INSERT INTO user_project (user_id, project_id, role) VALUES ($1, $2, $3);";
        txn.exec_params(query, user_id, project_id, role);
        txn.commit();
        Logger::info("User {} added to project {} with role {}", user_id, project_id, role);
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error adding user to project: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error adding user to project.");
    }
}

void ProjectService::removeUserFromProject(const std::string& project_id, const std::string& user_id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        std::string query = "DELETE FROM user_project WHERE user_id = $1 AND project_id = $2;";
        pqxx::result r = txn.exec_params(query, user_id, project_id);

        if (r.affected_rows() == 0) {
            Logger::warn("User {} was not found as a member of project {}", user_id, project_id);
            // Optionally throw UserNotFoundException or similar
        } else {
            txn.commit();
            Logger::info("User {} removed from project {}", user_id, project_id);
        }
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error removing user from project: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error removing user from project.");
    }
}

std::vector<std::pair<std::string, std::string>> ProjectService::getProjectMembers(const std::string& project_id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());
    std::vector<std::pair<std::string, std::string>> members;

    try {
        std::string query = "SELECT user_id, role FROM user_project WHERE project_id = $1;";
        pqxx::result r = N.exec_params(query, project_id);

        for (const auto& row : r) {
            members.push_back({row["user_id"].as<std::string>(), row["role"].as<std::string>()});
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting project members: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error retrieving project members.");
    }
    return members;
}
```