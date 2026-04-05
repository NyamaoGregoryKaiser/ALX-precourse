```cpp
#include "TaskController.h"
#include <json/json.h>

using namespace TaskManager;

TaskController::TaskController() {
    auto dbClient = drogon::app().getDbClient();
    if (!dbClient) {
        LOG_FATAL << "Database client not available!";
        throw std::runtime_error("Database client not available for TaskController.");
    }
    _taskService = std::make_shared<TaskService>(dbClient);
    _tagService = std::make_shared<TagService>(dbClient);
}

void TaskController::createTask(const HttpRequestPtr& req,
                                  std::function<void(const HttpResponsePtr&)>&& callback) {
    Json::Value reqJson;
    try {
        reqJson = *req->get  >jsonObject();
    } catch (const std::exception& e) {
        callback(createErrorResponse("Invalid JSON body: " + std::string(e.what()), k400BadRequest));
        return;
    }

    try {
        int userId = req->attributes()->get<int>("user_id");
        int projectId = JsonUtils::getInt(reqJson, "project_id");
        std::string title = JsonUtils::getString(reqJson, "title");
        std::optional<std::string> description = JsonUtils::getOptionalString(reqJson, "description");
        std::optional<std::string> status = JsonUtils::getOptionalString(reqJson, "status");
        std::optional<std::string> priority = JsonUtils::getOptionalString(reqJson, "priority");
        std::optional<trantor::Date> dueDate = parseDate(JsonUtils::getOptionalString(reqJson, "due_date"));
        std::optional<int> assignedTo = JsonUtils::getOptionalInt(reqJson, "assigned_to");

        std::vector<int> tagIds;
        if (reqJson.isMember("tag_ids") && reqJson["tag_ids"].isArray()) {
            for (const auto& tagIdJson : reqJson["tag_ids"]) {
                if (tagIdJson.isInt()) {
                    tagIds.push_back(tagIdJson.asInt());
                } else {
                    throw ValidationException("Invalid value in 'tag_ids' array (expected integer).");
                }
            }
        }

        Task newTask = _taskService->createTask(
            projectId, userId, title, description, status, priority, dueDate, assignedTo, tagIds
        );

        Json::Value respJson;
        respJson["message"] = "Task created successfully";
        respJson["task"] = taskToJson(newTask);
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(k201Created);
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
        LOG_ERROR << "Unhandled exception in createTask: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void TaskController::getAssignedTasks(const HttpRequestPtr& req,
                                        std::function<void(const HttpResponsePtr&)>&& callback) {
    try {
        int userId = req->attributes()->get<int>("user_id");
        std::vector<Task> tasks = _taskService->getTasksAssignedToUser(userId);

        Json::Value respJsonArray(Json::arrayValue);
        for (const auto& task : tasks) {
            respJsonArray.append(taskToJson(task));
        }
        auto resp = HttpResponse::newHttpJsonResponse(respJsonArray);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const NotFoundException& e) { // If the user itself is not found (unlikely after auth)
        callback(createErrorResponse(e.what(), k404NotFound));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in getAssignedTasks: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void TaskController::getTaskById(const HttpRequestPtr& req,
                                   std::function<void(const HttpResponsePtr&)>&& callback,
                                   int id) {
    try {
        int userId = req->attributes()->get<int>("user_id");
        Task task = _taskService->getTaskById(id, userId);

        Json::Value respJson = taskToJson(task);
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
        LOG_ERROR << "Unhandled exception in getTaskById: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void TaskController::updateTask(const HttpRequestPtr& req,
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

        std::optional<std::string> title = JsonUtils::getOptionalString(reqJson, "title");
        std::optional<std::string> description = JsonUtils::getOptionalString(reqJson, "description");
        std::optional<std::string> status = JsonUtils::getOptionalString(reqJson, "status");
        std::optional<std::string> priority = JsonUtils::getOptionalString(reqJson, "priority");
        std::optional<trantor::Date> dueDate = parseDate(JsonUtils::getOptionalString(reqJson, "due_date"));
        std::optional<int> assignedTo = JsonUtils::getOptionalInt(reqJson, "assigned_to");

        std::optional<std::vector<int>> tagIds_opt;
        if (reqJson.isMember("tag_ids")) {
            std::vector<int> tagIds;
            if (reqJson["tag_ids"].isArray()) {
                for (const auto& tagIdJson : reqJson["tag_ids"]) {
                    if (tagIdJson.isInt()) {
                        tagIds.push_back(tagIdJson.asInt());
                    } else {
                        throw ValidationException("Invalid value in 'tag_ids' array (expected integer).");
                    }
                }
            } else if (!reqJson["tag_ids"].isNull()) {
                throw ValidationException("'tag_ids' must be an array or null.");
            }
            tagIds_opt = tagIds;
        }

        // If no fields provided, return early
        if (!title && !description && !status && !priority && !dueDate && !assignedTo && !tagIds_opt) {
            callback(createErrorResponse("No fields provided for update.", k400BadRequest));
            return;
        }

        Task updatedTask = _taskService->updateTask(
            id, userId, title, description, status, priority, dueDate, assignedTo, tagIds_opt
        );

        Json::Value respJson;
        respJson["message"] = "Task updated successfully";
        respJson["task"] = taskToJson(updatedTask);
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
        LOG_ERROR << "Unhandled exception in updateTask: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void TaskController::deleteTask(const HttpRequestPtr& req,
                                  std::function<void(const HttpResponsePtr&)>&& callback,
                                  int id) {
    try {
        int userId = req->attributes()->get<int>("user_id");
        _taskService->deleteTask(id, userId);

        Json::Value respJson;
        respJson["message"] = "Task deleted successfully";
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
        LOG_ERROR << "Unhandled exception in deleteTask: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void TaskController::getTaskTags(const HttpRequestPtr& req,
                                  std::function<void(const HttpResponsePtr&)>&& callback,
                                  int id) {
    try {
        int userId = req->attributes()->get<int>("user_id");
        // Ensure user has access to the task before getting its tags
        _taskService->getTaskById(id, userId); // This will throw AuthException or NotFoundException if needed

        std::vector<Tag> tags = _tagService->getTagsForTask(id);

        Json::Value respJsonArray(Json::arrayValue);
        for (const auto& tag : tags) {
            respJsonArray.append(tagToJson(tag));
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
        LOG_ERROR << "Unhandled exception in getTaskTags: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}
```