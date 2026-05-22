```cpp
#include "TaskController.h"
#include "services/TaskService.h"
#include "utils/JsonUtils.h"
#include "utils/Logger.h"
#include "middleware/AuthMiddleware.h"
#include "middleware/ErrorHandlingMiddleware.h"

long TaskController::getAuthenticatedUserId(const Pistache::Rest::Request& request) {
    // Retrieve user ID from request context (set by AuthMiddleware)
    // This is the workaround method based on AuthMiddleware's simplified context storage.
    try {
        if (request.hasParam(AuthMiddleware::CONTEXT_USER_KEY + "_id")) {
            return std::stol(request.param(AuthMiddleware::CONTEXT_USER_KEY + "_id").as<std::string>());
        }
    } catch (const std::exception& e) {
        LOG_ERROR("Error retrieving authenticated user ID from request: {}", e.what());
    }
    throw HttpError(Pistache::Http::Code::Unauthorized, "User not authenticated or ID missing from context.");
}


void TaskController::getTasks(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        long userId = getAuthenticatedUserId(request);
        std::vector<Task> tasks = TaskService::getTasksByUserId(userId);

        Json::Value tasksJson(Json::arrayValue);
        for (const auto& task : tasks) {
            tasksJson.append(task.toJson());
        }

        response.headers().add<Pistache::Http::Header::ContentType>(MIME(Application, Json));
        response.send(Pistache::Http::Code::Ok, JsonUtils::stringifyJson(tasksJson));
        LOG_INFO("User {} retrieved {} tasks.", userId, tasks.size());

    } catch (const HttpError& e) {
        ErrorHandlingMiddleware::handle(response, e);
    } catch (const std::runtime_error& e) {
        ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Internal_Server_Error, e.what()));
    } catch (const std::exception& e) {
        ErrorHandlingMiddleware::handle(response, e);
    }
}

void TaskController::createTask(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        long userId = getAuthenticatedUserId(request);
        Json::Value requestBody = JsonUtils::parseJson(request.body());

        Task newTask;
        newTask.userId = userId;
        newTask.title = JsonUtils::getStringField(requestBody, "title");
        newTask.description = JsonUtils::getOptionalStringField(requestBody, "description");
        newTask.status = JsonUtils::getStringField(requestBody, "status", "TODO"); // Default to TODO
        newTask.dueDate = JsonUtils::getOptionalStringField(requestBody, "due_date");

        Task createdTask = TaskService::createTask(newTask);

        response.headers().add<Pistache::Http::Header::ContentType>(MIME(Application, Json));
        response.send(Pistache::Http::Code::Created, JsonUtils::stringifyJson(createdTask.toJson()));
        LOG_INFO("User {} created task {}: '{}'", userId, createdTask.id, createdTask.title);

    } catch (const JsonParseException& e) {
        ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Bad_Request, e.what()));
    } catch (const JsonFieldException& e) {
        ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Bad_Request, e.what()));
    } catch (const HttpError& e) {
        ErrorHandlingMiddleware::handle(response, e);
    } catch (const std::runtime_error& e) {
        ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Bad_Request, e.what()));
    } catch (const std::exception& e) {
        ErrorHandlingMiddleware::handle(response, e);
    }
}

void TaskController::getTaskById(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        long userId = getAuthenticatedUserId(request);
        long taskId = request.param(":id").as<long>();

        std::optional<Task> task = TaskService::getTaskById(taskId, userId);

        if (task.has_value()) {
            response.headers().add<Pistache::Http::Header::ContentType>(MIME(Application, Json));
            response.send(Pistache::Http::Code::Ok, JsonUtils::stringifyJson(task->toJson()));
            LOG_INFO("User {} retrieved task {}.", userId, taskId);
        } else {
            ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Not_Found, "Task not found or unauthorized."));
        }

    } catch (const HttpError& e) {
        ErrorHandlingMiddleware::handle(response, e);
    } catch (const std::runtime_error& e) {
        ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Bad_Request, e.what())); // e.g. invalid task ID format
    } catch (const std::exception& e) {
        ErrorHandlingMiddleware::handle(response, e);
    }
}

void TaskController::updateTask(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        long userId = getAuthenticatedUserId(request);
        long taskId = request.param(":id").as<long>();
        Json::Value requestBody = JsonUtils::parseJson(request.body());

        Task updatedTaskData;
        updatedTaskData.title = JsonUtils::getOptionalStringField(requestBody, "title").value_or(""); // Use empty string for optional values not present
        updatedTaskData.description = JsonUtils::getOptionalStringField(requestBody, "description");
        updatedTaskData.status = JsonUtils::getOptionalStringField(requestBody, "status").value_or("");
        updatedTaskData.dueDate = JsonUtils::getOptionalStringField(requestBody, "due_date");

        Task updatedTask = TaskService::updateTask(taskId, userId, updatedTaskData);

        response.headers().add<Pistache::Http::Header::ContentType>(MIME(Application, Json));
        response.send(Pistache::Http::Code::Ok, JsonUtils::stringifyJson(updatedTask.toJson()));
        LOG_INFO("User {} updated task {}: '{}'", userId, updatedTask.id, updatedTask.title);

    } catch (const JsonParseException& e) {
        ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Bad_Request, e.what()));
    } catch (const JsonFieldException& e) {
        ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Bad_Request, e.what()));
    } catch (const HttpError& e) {
        ErrorHandlingMiddleware::handle(response, e);
    } catch (const std::runtime_error& e) { // Catch business logic errors from TaskService
        // Differentiate between Not Found and other Bad Request errors if needed
        if (std::string(e.what()).find("Task not found or unauthorized") != std::string::npos) {
            ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Not_Found, e.what()));
        } else if (std::string(e.what()).find("Invalid task status") != std::string::npos) {
            ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Bad_Request, e.what()));
        }
        else {
            ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Internal_Server_Error, e.what()));
        }
    } catch (const std::exception& e) {
        ErrorHandlingMiddleware::handle(response, e);
    }
}

void TaskController::deleteTask(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        long userId = getAuthenticatedUserId(request);
        long taskId = request.param(":id").as<long>();

        bool deleted = TaskService::deleteTask(taskId, userId);

        if (deleted) {
            response.send(Pistache::Http::Code::No_Content); // 204 No Content
            LOG_INFO("User {} deleted task {}.", userId, taskId);
        } else {
            ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Not_Found, "Task not found or unauthorized."));
        }

    } catch (const HttpError& e) {
        ErrorHandlingMiddleware::handle(response, e);
    } catch (const std::runtime_error& e) {
        ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Internal_Server_Error, e.what()));
    } catch (const std::exception& e) {
        ErrorHandlingMiddleware::handle(response, e);
    }
}
```