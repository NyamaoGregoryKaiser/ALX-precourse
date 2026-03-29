```cpp
#include "ProjectService.hpp"

ProjectService::ProjectService(std::shared_ptr<DatabaseManager> db_manager)
    : db_manager_(db_manager) {}

Project ProjectService::createProject(const ProjectCreateDTO& project_dto, int auth_user_id) {
    Logger::log(LogLevel::INFO, "Attempting to create project: " + project_dto.name + " by user ID: " + std::to_string(auth_user_id));

    // Validate owner_id if provided. If not provided, the authenticated user is the owner.
    std::optional<int> actual_owner_id = project_dto.owner_id;
    if (!actual_owner_id.has_value()) {
        actual_owner_id = auth_user_id;
    } else {
        // If owner_id is explicitly provided and different from auth_user_id,
        // we might need an authorization check (e.g., only admins can set other owners)
        // For now, assume a user can only create projects owned by themselves or leave it implicit.
        // If an admin provides an owner_id, we'll use it.
        // For non-admin, if owner_id is provided and it's not auth_user_id, reject.
        // This logic will be handled in the controller based on user role.
    }

    Project new_project(project_dto.name, project_dto.description, actual_owner_id);

    try {
        int new_project_id = db_manager_->createProject(new_project);
        new_project.id = new_project_id;
        Logger::log(LogLevel::INFO, "Project " + new_project.name + " created successfully with ID " + std::to_string(new_project_id));
        return new_project;
    } catch (const DatabaseException& e) {
        Logger::log(LogLevel::ERROR, "Database error during project creation: " + std::string(e.what()));
        throw ServiceException("Failed to create project due to database error.");
    }
}

std::optional<Project> ProjectService::getProjectById(int id) {
    Logger::log(LogLevel::DEBUG, "Attempting to retrieve project with ID: " + std::to_string(id));
    auto project = db_manager_->getProjectById(id);
    if (!project.has_value()) {
        throw NotFoundException("Project with ID " + std::to_string(id) + " not found.");
    }
    return project;
}

std::vector<Project> ProjectService::getAllProjects() {
    Logger::log(LogLevel::DEBUG, "Attempting to retrieve all projects.");
    return db_manager_->getAllProjects();
}

Project ProjectService::updateProject(int id, const ProjectUpdateDTO& project_dto) {
    Logger::log(LogLevel::INFO, "Attempting to update project with ID: " + std::to_string(id));

    std::optional<Project> existing_project_opt = db_manager_->getProjectById(id);
    if (!existing_project_opt.has_value()) {
        throw NotFoundException("Project with ID " + std::to_string(id) + " not found.");
    }

    Project updated_project = existing_project_opt.value();
    updated_project.id = id; // Ensure ID is set for the update operation

    if (project_dto.name.has_value()) {
        updated_project.name = project_dto.name.value();
    }
    if (project_dto.description.has_value()) {
        updated_project.description = project_dto.description.value();
    }
    if (project_dto.owner_id.has_value()) {
        // Validate if new owner_id exists
        if (project_dto.owner_id.value() != 0 && !db_manager_->getUserById(project_dto.owner_id.value()).has_value()) {
            throw BadRequestException("Owner user with ID " + std::to_string(project_dto.owner_id.value()) + " does not exist.");
        }
        updated_project.owner_id = project_dto.owner_id.value();
    } else if (project_dto.owner_id == std::nullopt) { // Explicitly setting to null
        updated_project.owner_id = std::nullopt;
    }


    try {
        db_manager_->updateProject(updated_project);
        Logger::log(LogLevel::INFO, "Project with ID " + std::to_string(id) + " updated successfully.");
        return updated_project;
    } catch (const DatabaseException& e) {
        Logger::log(LogLevel::ERROR, "Database error updating project " + std::to_string(id) + ": " + std::string(e.what()));
        throw ServiceException("Failed to update project due to database error.");
    }
}

bool ProjectService::deleteProject(int id) {
    Logger::log(LogLevel::INFO, "Attempting to delete project with ID: " + std::to_string(id));

    if (!db_manager_->getProjectById(id).has_value()) {
        throw NotFoundException("Project with ID " + std::to_string(id) + " not found.");
    }

    try {
        db_manager_->deleteProject(id);
        Logger::log(LogLevel::INFO, "Project with ID " + std::to_string(id) + " deleted successfully.");
        return true;
    } catch (const DatabaseException& e) {
        Logger::log(LogLevel::ERROR, "Database error deleting project " + std::to_string(id) + ": " + std::string(e.what()));
        throw ServiceException("Failed to delete project due to database error.");
    }
}

bool ProjectService::isProjectOwner(int project_id, int user_id) {
    Logger::log(LogLevel::DEBUG, "Checking if user " + std::to_string(user_id) + " is owner of project " + std::to_string(project_id));
    std::optional<Project> project_opt = db_manager_->getProjectById(project_id);
    if (project_opt.has_value() && project_opt->owner_id.has_value()) {
        return project_opt->owner_id.value() == user_id;
    }
    return false;
}
```