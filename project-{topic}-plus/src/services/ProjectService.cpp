```cpp
#include "ProjectService.h"
#include "../utils/TimeUtil.h"

namespace TaskManager {
namespace Services {

ProjectService::ProjectService(Database::Database& db, Cache::Cache& cache)
    : db_(db), cache_(cache) {}

std::string ProjectService::generateCacheKey(long long projectId) {
    return "project_" + std::to_string(projectId);
}

void ProjectService::invalidateProjectCache(long long projectId) {
    cache_.remove(generateCacheKey(projectId));
}

Models::Project ProjectService::createProject(Models::Project project) {
    if (project.name.empty() || project.owner_id == 0) {
        throw Exceptions::ValidationException("Project name and owner ID are required.");
    }

    std::string sql = "INSERT INTO projects (name, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)";
    std::vector<std::string> params;
    params.push_back(project.name);
    params.push_back(project.description ? *project.description : "");
    params.push_back(std::to_string(project.owner_id));
    params.push_back(Utils::TimeUtil::getCurrentTimestamp());
    params.push_back(Utils::TimeUtil::getCurrentTimestamp());

    try {
        db_.preparedExecute(sql, params);
        project.id = db_.getLastInsertRowId();
        project.created_at = Utils::TimeUtil::getCurrentTimestamp();
        project.updated_at = Utils::TimeUtil::getCurrentTimestamp();
        Utils::Logger::getLogger()->info("Project created: {}", project.name);
        return project;
    } catch (const Exceptions::DatabaseException& e) {
        if (std::string(e.what()).find("FOREIGN KEY constraint failed") != std::string::npos) {
            throw Exceptions::BadRequestException("Owner user ID does not exist.");
        }
        throw;
    }
}

std::optional<Models::Project> ProjectService::getProjectById(long long id) {
    auto cached_project_json = cache_.get(generateCacheKey(id));
    if (cached_project_json) {
        Utils::Logger::getLogger()->debug("Cache hit for project ID: {}", id);
        return Models::Project::fromJson(*cached_project_json);
    }

    std::string sql = "SELECT id, name, description, owner_id, created_at, updated_at FROM projects WHERE id = ?";
    std::vector<std::string> params = {std::to_string(id)};
    
    ResultSet results = db_.preparedQuery(sql, params);
    if (!results.empty()) {
        auto project = mapRowToProject(results[0]);
        if (project) {
            cache_.set(generateCacheKey(id), project->toJson());
        }
        return project;
    }
    return std::nullopt;
}

std::vector<Models::Project> ProjectService::getAllProjects(int limit, int offset) {
    std::string sql = "SELECT id, name, description, owner_id, created_at, updated_at FROM projects LIMIT ? OFFSET ?";
    std::vector<std::string> params = {std::to_string(limit), std::to_string(offset)};
    
    ResultSet results = db_.preparedQuery(sql, params);
    std::vector<Models::Project> projects;
    for (const auto& row : results) {
        if (auto project = mapRowToProject(row)) {
            projects.push_back(*project);
        }
    }
    return projects;
}

std::vector<Models::Project> ProjectService::getProjectsByOwner(long long owner_id, int limit, int offset) {
    std::string sql = "SELECT id, name, description, owner_id, created_at, updated_at FROM projects WHERE owner_id = ? LIMIT ? OFFSET ?";
    std::vector<std::string> params = {std::to_string(owner_id), std::to_string(limit), std::to_string(offset)};
    
    ResultSet results = db_.preparedQuery(sql, params);
    std::vector<Models::Project> projects;
    for (const auto& row : results) {
        if (auto project = mapRowToProject(row)) {
            projects.push_back(*project);
        }
    }
    return projects;
}

Models::Project ProjectService::updateProject(long long id, const Models::Project& project_updates) {
    std::optional<Models::Project> existing_project = getProjectById(id);
    if (!existing_project) {
        throw Exceptions::NotFoundException("Project not found with ID: " + std::to_string(id));
    }

    std::string sql = "UPDATE projects SET name = ?, description = ?, owner_id = ?, updated_at = ? WHERE id = ?";
    std::vector<std::string> params;
    params.push_back(project_updates.name.empty() ? existing_project->name : project_updates.name);
    params.push_back(project_updates.description ? *project_updates.description : (existing_project->description ? *existing_project->description : ""));
    params.push_back(project_updates.owner_id == 0 ? std::to_string(existing_project->owner_id) : std::to_string(project_updates.owner_id));
    params.push_back(Utils::TimeUtil::getCurrentTimestamp());
    params.push_back(std::to_string(id));

    try {
        db_.preparedExecute(sql, params);
    } catch (const Exceptions::DatabaseException& e) {
        if (std::string(e.what()).find("FOREIGN KEY constraint failed") != std::string::npos) {
            throw Exceptions::BadRequestException("New owner user ID does not exist.");
        }
        throw;
    }
    
    invalidateProjectCache(id);
    std::optional<Models::Project> updated_project = getProjectById(id);
    if (!updated_project) {
        throw Exceptions::InternalServerError("Failed to retrieve updated project data after update.");
    }
    Utils::Logger::getLogger()->info("Project updated: ID {}", id);
    return *updated_project;
}

void ProjectService::deleteProject(long long id) {
    if (!getProjectById(id)) {
        throw Exceptions::NotFoundException("Project not found with ID: " + std::to_string(id));
    }

    std::string sql = "DELETE FROM projects WHERE id = ?";
    db_.preparedExecute(sql, {std::to_string(id)});
    invalidateProjectCache(id);
    Utils::Logger::getLogger()->info("Project deleted: ID {}", id);
}

std::optional<Models::Project> ProjectService::mapRowToProject(const Database::Row& row) {
    if (row.empty()) return std::nullopt;

    Models::Project project;
    try {
        if (row.count("id")) project.id = std::stoll(row.at("id"));
        if (row.count("name")) project.name = row.at("name");
        if (row.count("description")) project.description = row.at("description");
        if (row.count("owner_id")) project.owner_id = std::stoll(row.at("owner_id"));
        if (row.count("created_at")) project.created_at = row.at("created_at");
        if (row.count("updated_at")) project.updated_at = row.at("updated_at");
        return project;
    } catch (const std::exception& e) {
        Utils::Logger::getLogger()->error("Error mapping database row to Project: {}", e.what());
        return std::nullopt;
    }
}

} // namespace Services
} // namespace TaskManager
```