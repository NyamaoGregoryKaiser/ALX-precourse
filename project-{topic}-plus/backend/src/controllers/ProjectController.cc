```cpp
#include "ProjectController.h"
#include "controllers/TaskController.h" // For taskToJson helper
#include <json/json.h>

using namespace TaskManager;

// Reimplement taskToJson locally or ensure TaskController::taskToJson is accessible
// For a production system, common JSON conversion logic would be in a shared utility.
Json::Value ProjectController::taskToJson(const Task& task) {
    Json::Value taskJson;
    taskJson["id"] = task.getId();
    taskJson["project_id"] = task.getProjectId();
    taskJson["title"] = task.getTitle();
    if (task.getDescription().has_value()) {
        taskJson["description"] = task.getDescription().value();
    } else {
        taskJson["description"] = Json::nullValue;
    }
    taskJson["status"] = task.getStatus();
    taskJson["priority"] = task.getPriority();
    if (task.getDueDate().has_value()) {
        taskJson["due_date"] = task.getDueDate().value().toFormattedString(false);
    } else {
        taskJson["due_date"] = Json::nullValue;
    }
    if (task.getAssignedTo().has_value()) {
        taskJson["assigned_to"] = task.getAssignedTo().value();
    } else {
        taskJson["assigned_to"] = Json::nullValue;
    }
    taskJson["created_at"] = task.getCreatedAt().toFormattedString(false);
    taskJson["updated_at"] = task.getUpdatedAt().toFormattedString(false);
    return taskJson;
}


ProjectController::ProjectController() {
    auto dbClient = drogon::app().getDbClient();
    if (!dbClient) {
        LOG_FATAL << "Database client not available!";
        throw std::runtime_error("Database client not available for ProjectController.");
    }
    _projectService = std::make_shared<ProjectService>(dbClient);
    _taskService = std::make_shared<TaskService>(dbClient);
}

void ProjectController::createProject(const HttpRequestPtr& req,
                                       std::function<void(const HttpResponsePtr&)>&& callback) {
    Json::Value reqJson;
    try {
        reqJson = *req->get  >jsonObject();
    } catch (const std::exception& e) {
        callback(createErrorResponse("Invalid JSON body: " + std::string(e.what()), k400BadRequest));
        return;
    }

    try {
        int ownerId = req->attributes()->get<int>("user_id");
        std::string name = JsonUtils::getString(reqJson, "name");
        std::optional<std::string> description = JsonUtils::getOptionalString(reqJson, "description");

        Project newProject = _projectService->createProject(ownerId, name, description);

        Json::Value respJson;
        respJson["message"] = "Project created successfully";
        respJson["project"] = projectToJson(newProject);
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(k201Created);
        callback(resp);

    } catch (const ValidationException& e) {
        callback(createErrorResponse(e.what(), k400BadRequest));
    } catch (const NotFoundException& e) { // For owner_id not found
        callback(createErrorResponse(e.what(), k404NotFound));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in createProject: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void ProjectController::getAllProjects(const HttpRequestPtr& req,
                                        std::function<void(const HttpResponsePtr&)>&& callback) {
    try {
        int ownerId = req->attributes()->get<int>("user_id");
        std::vector<Project> projects = _projectService->getProjectsByOwner(ownerId);

        Json::Value respJsonArray(Json::arrayValue);
        for (const auto& project : projects) {
            respJsonArray.append(projectToJson(project));
        }
        auto resp = HttpResponse::newHttpJsonResponse(respJsonArray);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in getAllProjects: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void ProjectController::getProjectById(const HttpRequestPtr& req,
                                        std::function<void(const HttpResponsePtr&)>&& callback,
                                        int id) {
    try {
        int userId = req->attributes()->get<int>("user_id");
        Project project = _projectService->getProjectById(id);

        // Authorization: Only owner can view their projects
        if (project.getOwnerId() != userId) {
            throw AuthException("You are not authorized to view this project.");
        }

        Json::Value respJson = projectToJson(project);
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const NotFoundException& e) {
        callback(createErrorResponse(e.what(), k404NotFound));
    } catch (const AuthException& e) {
        callback(createErrorResponse(e.what(), k403Forbidden));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in getProjectById: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void ProjectController::updateProject(const HttpRequestPtr& req,
                                       std::function<void(const HttpResponsePtr&)>&& callback,
                                       int id) {
    Json::Value reqJson;
    try {
        reqJson = *req->get  >jsonObject();
    } catch (const std::exception& e) {
        callback(createErrorResponse("Invalid JSON body: " + std::string(e.what()), k400BadRequest));
        return;
    }

    try {
        int userId = req->attributes()->get<int>("user_id");
        std::optional<std::string> name_opt = JsonUtils::getOptionalString(reqJson, "name");
        std::optional<std::string> description_opt = JsonUtils::getOptionalString(reqJson, "description");

        if (!name_opt && !description_opt) {
            callback(createErrorResponse("No fields provided for update.", k400BadRequest));
            return;
        }

        Project updatedProject = _projectService->updateProject(id, userId, name_opt, description_opt);

        Json::Value respJson;
        respJson["message"] = "Project updated successfully";
        respJson["project"] = projectToJson(updatedProject);
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const ValidationException& e) {
        callback(createErrorResponse(e.what(), k400BadRequest));
    } catch (const NotFoundException& e) {
        callback(createErrorResponse(e.what(), k404NotFound));
    } catch (const AuthException& e) {
        callback(createErrorResponse(e.what(), k403Forbidden));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in updateProject: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void ProjectController::deleteProject(const HttpRequestPtr& req,
                                       std::function<void(const HttpResponsePtr&)>&& callback,
                                       int id) {
    try {
        int userId = req->attributes()->get<int>("user_id");
        _projectService->deleteProject(id, userId);

        Json::Value respJson;
        respJson["message"] = "Project deleted successfully";
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const NotFoundException& e) {
        callback(createErrorResponse(e.what(), k404NotFound));
    } catch (const AuthException& e) {
        callback(createErrorResponse(e.what(), k403Forbidden));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in deleteProject: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void ProjectController::getProjectTasks(const HttpRequestPtr& req,
                                         std::function<void(const HttpResponsePtr&)>&& callback,
                                         int id) {
    try {
        int userId = req->attributes()->get<int>("user_id");
        std::vector<Task> tasks = _taskService->getTasksByProjectId(id, userId);

        Json::Value respJsonArray(Json::arrayValue);
        for (const auto& task : tasks) {
            respJsonArray.append(taskToJson(task));
        }
        auto resp = HttpResponse::newHttpJsonResponse(respJsonArray);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const NotFoundException& e) {
        callback(createErrorResponse(e.what(), k404NotFound));
    } catch (const AuthException& e) {
        callback(createErrorResponse(e.what(), k403Forbidden));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in getProjectTasks: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}
```