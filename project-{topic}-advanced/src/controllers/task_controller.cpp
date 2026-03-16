```cpp
#include "task_controller.h"

namespace mobile_backend {
namespace controllers {

crow::response TaskController::create_task(const crow::request& req, crow::response& res,
                                           const utils::AuthMiddleware::context& ctx) {
    if (!ctx.user_id) {
        throw utils::UnauthorizedException("Authentication context missing user ID.");
    }

    crow::json::rvalue json_body;
    try {
        json_body = crow::json::load(req.body);
    } catch (const std::runtime_error& e) {
        LOG_WARN("Task: Bad JSON format for create task (User: {}): {}", *ctx.user_id, e.what());
        throw utils::BadRequestException("Invalid JSON format in request body.");
    }

    if (!json_body.has("title")) {
        throw utils::BadRequestException("Missing 'title' in request for task creation.");
    }

    std::string title = json_body["title"].s();
    std::string description = json_body.has("description") ? json_body["description"].s() : "";

    try {
        models::Task new_task = task_service.create_task(*ctx.user_id, title, description);
        crow::json::wvalue res_json;
        res_json["message"] = "Task created successfully.";
        res_json["task"] = new_task.to_json();
        return crow::response(201, res_json);
    } catch (const services::TaskServiceException& e) {
        throw utils::BadRequestException(e.what());
    } catch (const utils::AppException& e) {
        throw;
    } catch (const std::exception& e) {
        LOG_ERROR("Task: Unexpected error creating task (User: {}): {}", *ctx.user_id, e.what());
        throw utils::InternalServerException("Failed to create task.");
    }
}

crow::response TaskController::get_task_by_id(const crow::request& req, crow::response& res,
                                              const utils::AuthMiddleware::context& ctx, int task_id) {
    if (!ctx.user_id) {
        throw utils::UnauthorizedException("Authentication context missing user ID.");
    }

    if (task_id <= 0) {
        throw utils::BadRequestException("Invalid task ID.");
    }

    try {
        std::optional<models::Task> task = task_service.get_task_by_id(task_id, *ctx.user_id);
        if (!task) {
            throw utils::NotFoundException("Task not found or does not belong to the user.");
        }

        crow::json::wvalue res_json;
        res_json["message"] = "Task retrieved successfully.";
        res_json["task"] = task->to_json();
        return crow::response(200, res_json);
    } catch (const services::TaskServiceException& e) {
        throw utils::InternalServerException(e.what()); // Should not happen for get
    } catch (const utils::AppException& e) {
        throw;
    } catch (const std::exception& e) {
        LOG_ERROR("Task: Unexpected error getting task ID {} (User: {}): {}", task_id, *ctx.user_id, e.what());
        throw utils::InternalServerException("Failed to retrieve task.");
    }
}

crow::response TaskController::get_all_tasks(const crow::request& req, crow::response& res,
                                             const utils::AuthMiddleware::context& ctx) {
    if (!ctx.user_id) {
        throw utils::UnauthorizedException("Authentication context missing user ID.");
    }

    bool completed_filter = false;
    if (req.url_params.get("completed")) {
        std::string completed_str = req.url_params.get("completed");
        if (completed_str == "true" || completed_str == "1") {
            completed_filter = true;
        } else if (completed_str == "false" || completed_str == "0") {
            completed_filter = false;
        } else {
            throw utils::BadRequestException("Invalid value for 'completed' query parameter. Use 'true'/'false' or '1'/'0'.");
        }
    }


    try {
        std::vector<models::Task> tasks = task_service.get_all_tasks_for_user(*ctx.user_id, completed_filter);
        crow::json::wvalue res_json;
        res_json["message"] = "Tasks retrieved successfully.";
        
        crow::json::wvalue tasks_array = crow::json::wvalue::list();
        for (const auto& task : tasks) {
            tasks_array.add(task.to_json());
        }
        res_json["tasks"] = std::move(tasks_array);
        
        return crow::response(200, res_json);
    } catch (const services::TaskServiceException& e) {
        throw utils::InternalServerException(e.what());
    } catch (const utils::AppException& e) {
        throw;
    } catch (const std::exception& e) {
        LOG_ERROR("Task: Unexpected error getting all tasks (User: {}): {}", *ctx.user_id, e.what());
        throw utils::InternalServerException("Failed to retrieve tasks.");
    }
}

crow::response TaskController::update_task(const crow::request& req, crow::response& res,
                                           const utils::AuthMiddleware::context& ctx, int task_id) {
    if (!ctx.user_id) {
        throw utils::UnauthorizedException("Authentication context missing user ID.");
    }

    if (task_id <= 0) {
        throw utils::BadRequestException("Invalid task ID.");
    }

    crow::json::rvalue json_body;
    try {
        json_body = crow::json::load(req.body);
    } catch (const std::runtime_error& e) {
        LOG_WARN("Task: Bad JSON format for update task ID {} (User: {}): {}", task_id, *ctx.user_id, e.what());
        throw utils::BadRequestException("Invalid JSON format in request body.");
    }

    std::optional<std::string> title;
    if (json_body.has("title")) {
        title = json_body["title"].s();
    }

    std::optional<std::string> description;
    if (json_body.has("description")) {
        description = json_body["description"].s();
    }

    std::optional<bool> completed;
    if (json_body.has("completed")) {
        completed = json_body["completed"].b();
    }

    if (!title && !description && !completed) {
        throw utils::BadRequestException("No valid fields provided for task update (title, description, or completed required).");
    }

    try {
        models::Task updated_task = task_service.update_task(*ctx.user_id, task_id, title, description, completed);
        crow::json::wvalue res_json;
        res_json["message"] = "Task updated successfully.";
        res_json["task"] = updated_task.to_json();
        return crow::response(200, res_json);
    } catch (const services::TaskServiceException& e) {
        throw utils::NotFoundException(e.what()); // e.g., task not found or belongs to another user
    } catch (const utils::AppException& e) {
        throw;
    } catch (const std::exception& e) {
        LOG_ERROR("Task: Unexpected error updating task ID {} (User: {}): {}", task_id, *ctx.user_id, e.what());
        throw utils::InternalServerException("Failed to update task.");
    }
}

crow::response TaskController::delete_task(const crow::request& req, crow::response& res,
                                           const utils::AuthMiddleware::context& ctx, int task_id) {
    if (!ctx.user_id) {
        throw utils::UnauthorizedException("Authentication context missing user ID.");
    }

    if (task_id <= 0) {
        throw utils::BadRequestException("Invalid task ID.");
    }

    try {
        task_service.delete_task(task_id, *ctx.user_id);
        crow::json::wvalue res_json;
        res_json["message"] = "Task deleted successfully.";
        return crow::response(200, res_json);
    } catch (const services::TaskServiceException& e) {
        throw utils::NotFoundException(e.what()); // e.g., task not found or belongs to another user
    } catch (const utils::AppException& e) {
        throw;
    } catch (const std::exception& e) {
        LOG_ERROR("Task: Unexpected error deleting task ID {} (User: {}): {}", task_id, *ctx.user_id, e.what());
        throw utils::InternalServerException("Failed to delete task.");
    }
}

} // namespace controllers
} // namespace mobile_backend
```