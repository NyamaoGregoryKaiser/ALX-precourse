#pragma once

#include <string>
#include <vector>
#include <optional>
#include <stdexcept>
#include "../models/project.h"
#include "../database/db_manager.h"

class ProjectNotFoundException : public std::runtime_error {
public:
    explicit ProjectNotFoundException(const std::string& msg) : std::runtime_error(msg) {}
};

class ProjectService {
public:
    explicit ProjectService(DbManager& db_manager);

    Project createProject(Project& project, const std::string& requester_user_id);
    std::optional<Project> getProjectById(const std::string& id);
    std::vector<Project> getAllProjects(); // Might need filtering for real app
    std::vector<Project> getProjectsByOwner(const std::string& owner_id);
    std::vector<Project> getProjectsByUser(const std::string& user_id); // Projects where user is owner or member
    Project updateProject(const std::string& id, const Project& project_updates);
    void deleteProject(const std::string& id);

    bool isUserProjectOwner(const std::string& project_id, const std::string& user_id);
    bool isUserProjectMember(const std::string& project_id, const std::string& user_id);
    void addUserToProject(const std::string& project_id, const std::string& user_id, const std::string& role);
    void removeUserFromProject(const std::string& project_id, const std::string& user_id);
    std::vector<std::pair<std::string, std::string>> getProjectMembers(const std::string& project_id); // returns {user_id, role}

private:
    DbManager& db_manager_;
};
```