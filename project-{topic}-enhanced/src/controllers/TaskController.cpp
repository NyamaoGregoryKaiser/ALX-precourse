```cpp
#include "TaskController.hpp"
#include "../logger/Logger.hpp"
#include "../utils/AppException.hpp"
#include "../middleware/AuthMiddleware.hpp" // To access user claims from request

#include "crow.h"
#include <nlohmann/json.hpp>
#include <stdexcept>
#include <string>
#include <vector>

TaskController::TaskController(TaskService& taskService, UserService& userService)
    : taskService(taskService), userService(userService) {}

// Helper to get authenticated user ID and role
std::pair<int, std::string> getAuthenticatedUserClaims(const crow::request& req) {
    int userId = req.get_context<AuthMiddleware::Context>().user_id;
    std::string userRole = req.get_context<AuthMiddleware::Context>().user_role;
    return {userId, userRole};
}

crow::response TaskController::createTask(const crow::request& req) {
    try {
        auto [userId, userRole] = getAuthenticatedUserClaims(req);
        nlohmann::json reqBody = nlohmann::json::parse(req.body);

        if (!reqBody.contains("title")) {
            throw BadRequestException("Task title is required.");
        }

        std::string title = reqBody["title"].get<std::string>();
        std::string description = reqBody.contains("description") ? reqBody["description"].get<std::string>() : "";
        std::string status = reqBody.contains("status") ? reqBody["status"].get<std::string>() : "pending";

        if (title.empty()) {
            throw BadRequestException("Task title cannot be empty.");
        }
        // Validate status if provided
        if (!(status == "pending" || status == "in_progress" || status == "completed")) {
            throw BadRequestException("Invalid task status. Must be 'pending', 'in_progress', or 'completed'.");
        }

        Task newTask(0, userId, title, description, status); // ID will be set by service
        int newTaskId = taskService.createTask(newTask);

        Logger::info("TaskController: User {} created task {}.", userId, newTaskId);
        nlohmann::json resBody;
        resBody["status"] = "success";
        resBody["message"] = "Task created successfully";
        resBody["task_id"] = newTaskId;
        return crow::response(201, resBody.dump());

    } catch (const nlohmann::json::parse_error& e) {
        throw BadRequestException("Invalid JSON in request body.");
    } catch (const std::runtime_error& e) {
        throw BadRequestException(e.what());
    }
}

crow::response TaskController::getTasks(const crow::request& req) {
    try {
        auto [userId, userRole] = getAuthenticatedUserClaims(req);

        std::vector<Task> tasks;
        // Admins can see all tasks if `all=true` query param is present
        if (userRole == "admin" && req.url_params.get("all") == std::string("true")) {
            Logger::info("TaskController: Admin user {} fetching all tasks.", userId);
            tasks = taskService.getAllTasks();
        } else {
            Logger::info("TaskController: User {} fetching their own tasks.", userId);
            tasks = taskService.getTasksByUserId(userId);
        }

        nlohmann::json taskArray = nlohmann::json::array();
        for (const auto& task : tasks) {
            taskArray.push_back(task.toJson());
        }

        nlohmann::json resBody;
        resBody["status"] = "success";
        resBody["tasks"] = taskArray;
        return crow::response(200, resBody.dump());

    } catch (const std::runtime_error& e) {
        throw InternalServerErrorException(e.what());
    }
}

crow::response TaskController::getTaskById(const crow::request& req, int taskId) {
    try {
        auto [userId, userRole] = getAuthenticatedUserClaims(req);

        std::optional<Task> taskOpt = taskService.getTaskById(taskId);
        if (!taskOpt) {
            throw NotFoundException("Task not found.");
        }

        Task task = taskOpt.value();

        // Authorization check: Only owner or admin can view
        if (task.getUserId() != userId && userRole != "admin") {
            Logger::warn("TaskController: User {} (role: {}) attempted to access task {} belonging to user {}.",
                         userId, userRole, taskId, task.getUserId());
            throw ForbiddenException("You are not authorized to view this task.");
        }

        Logger::info("TaskController: User {} (role: {}) fetched task {}.", userId, userRole, taskId);
        nlohmann::json resBody;
        resBody["status"] = "success";
        resBody["task"] = task.toJson();
        return crow::response(200, resBody.dump());

    } catch (const std::runtime_error& e) {
        if (std::string(e.what()).find("not found") != std::string::npos) {
            throw NotFoundException(e.what());
        }
        throw e; // Re-throw other exceptions to be caught by ErrorHandlerMiddleware
    }
}

crow::response TaskController::updateTask(const crow::request& req, int taskId) {
    try {
        auto [userId, userRole] = getAuthenticatedUserClaims(req);

        std::optional<Task> existingTaskOpt = taskService.getTaskById(taskId);
        if (!existingTaskOpt) {
            throw NotFoundException("Task not found.");
        }
        Task existingTask = existingTaskOpt.value();

        // Authorization check: Only owner or admin can update
        if (existingTask.getUserId() != userId && userRole != "admin") {
             Logger::warn("TaskController: User {} (role: {}) attempted to update task {} belonging to user {}.",
                         userId, userRole, taskId, existingTask.getUserId());
            throw ForbiddenException("You are not authorized to update this task.");
        }

        nlohmann::json reqBody = nlohmann::json::parse(req.body);

        // Update fields if present in request body
        if (reqBody.contains("title")) {
            existingTask.setTitle(reqBody["title"].get<std::string>());
        }
        if (reqBody.contains("description")) {
            existingTask.setDescription(reqBody["description"].get<std::string>());
        }
        if (reqBody.contains("status")) {
            std::string newStatus = reqBody["status"].get<std::string>();
            if (!(newStatus == "pending" || newStatus == "in_progress" || newStatus == "completed")) {
                throw BadRequestException("Invalid task status. Must be 'pending', 'in_progress', or 'completed'.");
            }
            existingTask.setStatus(newStatus);
        }

        taskService.updateTask(taskId, existingTask);
        Logger::info("TaskController: User {} (role: {}) updated task {}.", userId, userRole, taskId);
        
        nlohmann::json resBody;
        resBody["status"] = "success";
        resBody["message"] = "Task updated successfully";
        return crow::response(200, resBody.dump());

    } catch (const nlohmann::json::parse_error& e) {
        throw BadRequestException("Invalid JSON in request body.");
    } catch (const std::runtime_error& e) {
        if (std::string(e.what()).find("not found") != std::string::npos) {
            throw NotFoundException(e.what());
        }
        throw e;
    }
}

crow::response TaskController::deleteTask(const crow::request& req, int taskId) {
    try {
        auto [userId, userRole] = getAuthenticatedUserClaims(req);

        std::optional<Task> existingTaskOpt = taskService.getTaskById(taskId);
        if (!existingTaskOpt) {
            throw NotFoundException("Task not found.");
        }
        Task existingTask = existingTaskOpt.value();

        // Authorization check: Only owner or admin can delete
        if (existingTask.getUserId() != userId && userRole != "admin") {
            Logger::warn("TaskController: User {} (role: {}) attempted to delete task {} belonging to user {}.",
                         userId, userRole, taskId, existingTask.getUserId());
            throw ForbiddenException("You are not authorized to delete this task.");
        }

        taskService.deleteTask(taskId);
        Logger::info("TaskController: User {} (role: {}) deleted task {}.", userId, userRole, taskId);

        nlohmann::json resBody;
        resBody["status"] = "success";
        resBody["message"] = "Task deleted successfully";
        return crow::response(200, resBody.dump());

    } catch (const std::runtime_error& e) {
        if (std::string(e.what()).find("not found") != std::string::npos) {
            throw NotFoundException(e.what());
        }
        throw e;
    }
}
```