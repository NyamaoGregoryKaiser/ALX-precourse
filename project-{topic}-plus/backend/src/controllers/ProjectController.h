```cpp
#ifndef PROJECT_CONTROLLER_H
#define PROJECT_CONTROLLER_H

#include <drogon/HttpController.h>
#include <drogon/orm/DbClient.h>
#include "services/ProjectService.h"
#include "services/TaskService.h" // For listing tasks within a project
#include "utils/AppErrors.h"
#include "utils/JsonUtils.h"
#include "filters/AuthFilter.h"

using namespace drogon;
using namespace drogon::orm;
using namespace TaskManager;

/**
 * @brief Controller for project management endpoints.
 * All endpoints require authentication. Project ownership is enforced by service layer.
 */
class ProjectController : public drogon::HttpController<ProjectController> {
public:
    METHOD_LIST_BEGIN
    // POST /projects - Create a new project
    ADD_METHOD_TO(ProjectController::createProject, "/projects", Post, "AuthFilter");
    // GET /projects - Get all projects owned by the authenticated user
    ADD_METHOD_TO(ProjectController::getAllProjects, "/projects", Get, "AuthFilter");
    // GET /projects/{id} - Get a specific project by ID
    ADD_METHOD_TO(ProjectController::getProjectById, "/projects/{id}", Get, "AuthFilter");
    // PATCH /projects/{id} - Update a specific project by ID
    ADD_METHOD_TO(ProjectController::updateProject, "/projects/{id}", Patch, "AuthFilter");
    // DELETE /projects/{id} - Delete a specific project by ID
    ADD_METHOD_TO(ProjectController::deleteProject, "/projects/{id}", Delete, "AuthFilter");

    // GET /projects/{id}/tasks - Get all tasks for a specific project
    ADD_METHOD_TO(ProjectController::getProjectTasks, "/projects/{id}/tasks", Get, "AuthFilter");
    METHOD_LIST_END

    ProjectController();

    /**
     * @brief Creates a new project.
     * POST /projects
     * Request Body: { "name": "...", "description": "..." }
     * Response: { "message": "Project created", "project": { ... } }
     */
    void createProject(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback);

    /**
     * @brief Retrieves all projects owned by the authenticated user.
     * GET /projects
     * Response: [ { "id": ..., "name": "...", ... }, ... ]
     */
    void getAllProjects(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback);

    /**
     * @brief Retrieves a specific project by ID.
     * GET /projects/{id}
     * Response: { "id": ..., "name": "...", ... }
     */
    void getProjectById(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, int id);

    /**
     * @brief Updates a specific project by ID.
     * PATCH /projects/{id}
     * Request Body: { "name": "...", "description": "..." } (fields are optional)
     * Response: { "message": "Project updated", "project": { ... } }
     */
    void updateProject(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, int id);

    /**
     * @brief Deletes a specific project by ID.
     * DELETE /projects/{id}
     * Response: { "message": "Project deleted successfully" }
     */
    void deleteProject(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, int id);

    /**
     * @brief Retrieves all tasks for a specific project.
     * GET /projects/{id}/tasks
     * Response: [ { "id": ..., "title": "...", ... }, ... ]
     */
    void getProjectTasks(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, int id);


private:
    std::shared_ptr<ProjectService> _projectService;
    std::shared_ptr<TaskService> _taskService; // Dependency for listing tasks within project

    // Helper for sending error responses
    HttpResponsePtr createErrorResponse(const std::string& message, HttpStatusCode code) {
        Json::Value respJson;
        respJson["message"] = message;
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(code);
        return resp;
    }

    // Helper to convert Project model to JSON (excluding sensitive data)
    Json::Value projectToJson(const Project& project) {
        Json::Value projectJson;
        projectJson["id"] = project.getId();
        projectJson["owner_id"] = project.getOwnerId();
        projectJson["name"] = project.getName();
        if (project.getDescription().has_value()) {
            projectJson["description"] = project.getDescription().value();
        } else {
            projectJson["description"] = Json::nullValue;
        }
        projectJson["created_at"] = project.getCreatedAt().toFormattedString(false);
        projectJson["updated_at"] = project.getUpdatedAt().toFormattedString(false);
        return projectJson;
    }

    // Helper to convert Task model to JSON (forward declaration, assuming taskToJson exists in TaskController)
    Json::Value taskToJson(const Task& task);
};

} // namespace TaskManager

#endif // PROJECT_CONTROLLER_H
```