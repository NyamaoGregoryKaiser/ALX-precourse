```cpp
#ifndef PROJECT_SERVICE_H
#define PROJECT_SERVICE_H

#include <drogon/drogon.h>
#include <drogon/orm/Mapper.h>
#include <json/json.h>
#include <string>
#include <vector>
#include <memory>
#include <optional>
#include "models/Project.h"
#include "models/User.h" // To check owner existence
#include "utils/AppErrors.h"

namespace TaskManager {

/**
 * @brief Service class for project related business logic.
 * Handles CRUD operations for projects.
 */
class ProjectService {
public:
    ProjectService(drogon::orm::DbClientPtr dbClient)
        : _dbClient(dbClient), _projectMapper(dbClient), _userMapper(dbClient) {}

    /**
     * @brief Creates a new project.
     * @param ownerId The ID of the user who owns the project.
     * @param name The name of the project.
     * @param description Optional description of the project.
     * @return The created Project object.
     * @throws ValidationException if input is invalid.
     * @throws NotFoundException if owner does not exist.
     * @throws InternalServerException on database errors.
     */
    Project createProject(int ownerId, const std::string& name, const std::optional<std::string>& description) {
        if (name.empty()) {
            throw ValidationException("Project name cannot be empty.");
        }

        try {
            // Verify owner exists
            _userMapper.findByPrimaryKey(ownerId); // Will throw if not found

            Project newProject(_dbClient);
            newProject.setOwnerId(ownerId);
            newProject.setName(name);
            if (description) {
                newProject.setDescription(*description);
            }
            newProject.insert();
            LOG_INFO << "Project created: " << name << " by user ID " << ownerId;
            return newProject;
        } catch (const drogon::orm::DrogonDbException& e) {
            if (e.what() && std::string(e.what()).find("result is empty") != std::string::npos) {
                throw NotFoundException("Owner user with ID " + std::to_string(ownerId) + " not found.");
            }
            LOG_ERROR << "Database error creating project: " << e.what();
            throw InternalServerException("Database error creating project.");
        } catch (const NotFoundException& e) {
            throw; // Re-throw specific exception
        } catch (const ValidationException& e) {
            throw; // Re-throw specific exception
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error creating project: " << e.what();
            throw InternalServerException("Failed to create project due to an unexpected error.");
        }
    }

    /**
     * @brief Retrieves a project by its ID.
     * @param projectId The ID of the project.
     * @return The Project object.
     * @throws NotFoundException if project does not exist.
     * @throws InternalServerException on database errors.
     */
    Project getProjectById(int projectId) {
        try {
            return _projectMapper.findByPrimaryKey(projectId);
        } catch (const drogon::orm::DrogonDbException& e) {
            if (e.what() && std::string(e.what()).find("result is empty") != std::string::npos) {
                throw NotFoundException("Project with ID " + std::to_string(projectId) + " not found.");
            }
            LOG_ERROR << "Database error fetching project by ID: " << e.what();
            throw InternalServerException("Database error fetching project.");
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error fetching project by ID: " << e.what();
            throw InternalServerException("Failed to fetch project due to an unexpected error.");
        }
    }

    /**
     * @brief Retrieves all projects owned by a specific user.
     * @param ownerId The ID of the project owner.
     * @return A vector of Project objects.
     * @throws InternalServerException on database errors.
     */
    std::vector<Project> getProjectsByOwner(int ownerId) {
        try {
            return _projectMapper.findBy(drogon::orm::Criteria("owner_id", drogon::orm::EQ, ownerId));
        } catch (const drogon::orm::DrogonDbException& e) {
            LOG_ERROR << "Database error fetching projects by owner ID: " << e.what();
            throw InternalServerException("Database error fetching projects.");
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error fetching projects by owner ID: " << e.what();
            throw InternalServerException("Failed to fetch projects due to an unexpected error.");
        }
    }

    /**
     * @brief Retrieves all projects.
     * @return A vector of Project objects.
     * @throws InternalServerException on database errors.
     */
    std::vector<Project> getAllProjects() {
        try {
            return _projectMapper.findAll();
        } catch (const drogon::orm::DrogonDbException& e) {
            LOG_ERROR << "Database error fetching all projects: " << e.what();
            throw InternalServerException("Database error fetching projects.");
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error fetching all projects: " << e.what();
            throw InternalServerException("Failed to fetch projects due to an unexpected error.");
        }
    }

    /**
     * @brief Updates an existing project.
     * @param projectId The ID of the project to update.
     * @param userId The ID of the user performing the update (for authorization).
     * @param name_opt Optional new name for the project.
     * @param description_opt Optional new description for the project.
     * @return The updated Project object.
     * @throws NotFoundException if project does not exist.
     * @throws AuthException if user is not the project owner.
     * @throws ValidationException if input is invalid.
     * @throws InternalServerException on database errors.
     */
    Project updateProject(int projectId, int userId,
                          const std::optional<std::string>& name_opt,
                          const std::optional<std::string>& description_opt) {
        try {
            Project project = _projectMapper.findByPrimaryKey(projectId);

            if (project.getOwnerId() != userId) {
                throw AuthException("You are not authorized to update this project.");
            }

            if (name_opt) {
                if (name_opt->empty()) {
                    throw ValidationException("Project name cannot be empty.");
                }
                project.setName(*name_opt);
            }
            if (description_opt) {
                project.setDescription(*description_opt);
            } else if (project.getDescription().has_value()) {
                // If description_opt is nullopt and current has value, clear it
                project.setDescription(std::nullopt);
            }

            project.update();
            LOG_INFO << "Project ID " << projectId << " updated by user ID " << userId;
            return project;
        } catch (const drogon::orm::DrogonDbException& e) {
            if (e.what() && std::string(e.what()).find("result is empty") != std::string::npos) {
                throw NotFoundException("Project with ID " + std::to_string(projectId) + " not found.");
            }
            LOG_ERROR << "Database error updating project: " << e.what();
            throw InternalServerException("Database error updating project.");
        } catch (const NotFoundException& e) {
            throw;
        } catch (const AuthException& e) {
            throw;
        } catch (const ValidationException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error updating project: " << e.what();
            throw InternalServerException("Failed to update project due to an unexpected error.");
        }
    }

    /**
     * @brief Deletes a project by its ID.
     * @param projectId The ID of the project to delete.
     * @param userId The ID of the user performing the deletion (for authorization).
     * @return True if deleted, false if not found.
     * @throws NotFoundException if project does not exist.
     * @throws AuthException if user is not the project owner.
     * @throws InternalServerException on database errors.
     */
    void deleteProject(int projectId, int userId) {
        try {
            Project project = _projectMapper.findByPrimaryKey(projectId);

            if (project.getOwnerId() != userId) {
                throw AuthException("You are not authorized to delete this project.");
            }

            project.destroy();
            LOG_INFO << "Project ID " << projectId << " deleted by user ID " << userId;
        } catch (const drogon::orm::DrogonDbException& e) {
            if (e.what() && std::string(e.what()).find("result is empty") != std::string::npos) {
                throw NotFoundException("Project with ID " + std::to_string(projectId) + " not found.");
            }
            LOG_ERROR << "Database error deleting project: " << e.what();
            throw InternalServerException("Database error deleting project.");
        } catch (const NotFoundException& e) {
            throw;
        } catch (const AuthException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error deleting project: " << e.what();
            throw InternalServerException("Failed to delete project due to an unexpected error.");
        }
    }

private:
    drogon::orm::DbClientPtr _dbClient;
    drogon::orm::Mapper<Project> _projectMapper;
    drogon::orm::Mapper<User> _userMapper; // To verify owner existence
};

} // namespace TaskManager

#endif // PROJECT_SERVICE_H
```