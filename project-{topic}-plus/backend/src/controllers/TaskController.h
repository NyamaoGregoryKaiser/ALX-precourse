```cpp
#ifndef TASK_CONTROLLER_H
#define TASK_CONTROLLER_H

#include <drogon/HttpController.h>
#include <drogon/orm/DbClient.h>
#include <trantor/utils/Date.h> // For parsing dates
#include "services/TaskService.h"
#include "services/TagService.h" // For getting tags related to a task
#include "utils/AppErrors.h"
#include "utils/JsonUtils.h"
#include "filters/AuthFilter.h"

using namespace drogon;
using namespace drogon::orm;
using namespace TaskManager;

/**
 * @brief Controller for task management endpoints.
 * All endpoints require authentication. Project ownership/task assignment enforced by service layer.
 */
class TaskController : public drogon::HttpController<TaskController> {
public:
    METHOD_LIST_BEGIN
    // POST /tasks - Create a new task
    ADD_METHOD_TO(TaskController::createTask, "/tasks", Post, "AuthFilter");
    // GET /tasks - Get tasks assigned to the authenticated user
    ADD_METHOD_TO(TaskController::getAssignedTasks, "/tasks", Get, "AuthFilter");
    // GET /tasks/{id} - Get a specific task by ID
    ADD_METHOD_TO(TaskController::getTaskById, "/tasks/{id}", Get, "AuthFilter");
    // PATCH /tasks/{id} - Update a specific task by ID
    ADD_METHOD_TO(TaskController::updateTask, "/tasks/{id}", Patch, "AuthFilter");
    // DELETE /tasks/{id} - Delete a specific task by ID
    ADD_METHOD_TO(TaskController::deleteTask, "/tasks/{id}", Delete, "AuthFilter");

    // GET /tasks/{id}/tags - Get tags associated with a specific task
    ADD_METHOD_TO(TaskController::getTaskTags, "/tasks/{id}/tags", Get, "AuthFilter");
    METHOD_LIST_END

    TaskController();

    /**
     * @brief Creates a new task.
     * POST /tasks
     * Request Body: { "project_id": 1, "title": "...", "description": "...", "status": "Open",
     *                 "priority": "Medium", "due_date": "YYYY-MM-DD HH:MM:SS", "assigned_to": 2, "tag_ids": [1, 2] }
     * Response: { "message": "Task created", "task": { ... } }
     */
    void createTask(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback);

    /**
     * @brief Retrieves tasks assigned to the authenticated user.
     * GET /tasks
     * Response: [ { "id": ..., "title": "...", ... }, ... ]
     */
    void getAssignedTasks(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback);

    /**
     * @brief Retrieves a specific task by ID.
     * GET /tasks/{id}
     * Response: { "id": ..., "title": "...", ... }
     */
    void getTaskById(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, int id);

    /**
     * @brief Updates a specific task by ID.
     * PATCH /tasks/{id}
     * Request Body: { "title": "...", "status": "InProgress", ... } (fields are optional)
     * Response: { "message": "Task updated", "task": { ... } }
     */
    void updateTask(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, int id);

    /**
     * @brief Deletes a specific task by ID.
     * DELETE /tasks/{id}
     * Response: { "message": "Task deleted successfully" }
     */
    void deleteTask(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, int id);

    /**
     * @brief Retrieves tags associated with a specific task.
     * GET /tasks/{id}/tags
     * Response: [ { "id": ..., "name": "..." }, ... ]
     */
    void getTaskTags(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, int id);

private:
    std::shared_ptr<TaskService> _taskService;
    std::shared_ptr<TagService> _tagService;

    // Helper for sending error responses
    HttpResponsePtr createErrorResponse(const std::string& message, HttpStatusCode code) {
        Json::Value respJson;
        respJson["message"] = message;
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(code);
        return resp;
    }

    // Helper to convert Task model to JSON (excluding sensitive data)
    Json::Value taskToJson(const Task& task) {
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

    // Helper to convert Tag model to JSON (similar to TagController::tagToJson)
    Json::Value tagToJson(const Tag& tag) {
        Json::Value tagJson;
        tagJson["id"] = tag.getId();
        tagJson["name"] = tag.getName();
        tagJson["created_at"] = tag.getCreatedAt().toFormattedString(false);
        tagJson["updated_at"] = tag.getUpdatedAt().toFormattedString(false);
        return tagJson;
    }

    // Helper to parse trantor::Date from string
    std::optional<trantor::Date> parseDate(const std::optional<std::string>& dateStr) {
        if (!dateStr || dateStr->empty()) {
            return std::nullopt;
        }
        // Drogon's trantor::Date::fromFormattedString can parse various formats
        // For consistency, we might enforce YYYY-MM-DD HH:MM:SS
        return trantor::Date::fromFormattedString(*dateStr, false); // false for no timezone
    }
};

} // namespace TaskManager

#endif // TASK_CONTROLLER_H
```