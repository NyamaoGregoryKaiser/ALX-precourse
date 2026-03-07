```cpp
#include "TaskService.h"
#include <chrono>
#include <ctime>
#include <iomanip>
#include <sstream>

TaskService::TaskService(drogon::orm::DbClientPtr dbClient) : dbClient_(dbClient) {}

std::string TaskService::getCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_c = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::localtime(&now_c), "%Y-%m-%d %H:%M:%S");
    return ss.str();
}

drogon::Task<Task> TaskService::createTask(int userId, const Json::Value& taskJson) {
    Task newTask;
    newTask.user_id = userId;
    newTask.title = taskJson["title"].asString();
    newTask.description = taskJson.isMember("description") ? taskJson["description"].asString() : "";
    newTask.status = Task::stringToStatus(taskJson.isMember("status") ? taskJson["status"].asString() : "TODO");
    newTask.due_date = taskJson.isMember("due_date") ? taskJson["due_date"].asString() : "";
    newTask.created_at = getCurrentTimestamp();
    newTask.updated_at = newTask.created_at;

    if (taskJson.isMember("category_id") && taskJson["category_id"].isInt()) {
        newTask.category_id = taskJson["category_id"].asInt();
        // Optional: validate if category_id exists and belongs to the user
        // This would require a CategoryService dependency.
    }

    try {
        auto result = co_await dbClient_->execSqlCoro(
            "INSERT INTO tasks (title, description, status, user_id, category_id, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id;",
            newTask.title,
            newTask.description,
            Task::statusToString(newTask.status),
            newTask.user_id,
            newTask.category_id == 0 ? drogon::orm::internal::SqlValue(nullptr) : drogon::orm::internal::SqlValue(newTask.category_id), // Handle optional category_id
            newTask.due_date,
            newTask.created_at,
            newTask.updated_at
        );
        newTask.id = result[0]["id"].as<int>();
        co_return newTask;
    } catch (const drogon::orm::DrogonDbException& e) {
        LOG_ERROR << "Database error creating task: " << e.what();
        throw drogon::HttpException("Failed to create task due to database error", drogon::k500InternalServerError);
    }
}

drogon::Task<std::vector<Task>> TaskService::getTasksByUserId(int userId, std::optional<Task::Status> statusFilter, std::optional<int> categoryIdFilter) {
    std::string sql = "SELECT * FROM tasks WHERE user_id = ?";
    std::vector<drogon::orm::internal::SqlValue> params;
    params.push_back(userId);

    if (statusFilter.has_value()) {
        sql += " AND status = ?";
        params.push_back(Task::statusToString(statusFilter.value()));
    }
    if (categoryIdFilter.has_value() && categoryIdFilter.value() != 0) {
        sql += " AND category_id = ?";
        params.push_back(categoryIdFilter.value());
    }

    try {
        auto result = co_await dbClient_->execSqlCoro(sql, params);
        std::vector<Task> tasks;
        for (size_t i = 0; i < result.size(); ++i) {
            tasks.push_back(Task::fromDbResult(result, i));
        }
        co_return tasks;
    } catch (const drogon::orm::DrogonDbException& e) {
        LOG_ERROR << "Database error fetching tasks: " << e.what();
        throw drogon::HttpException("Failed to fetch tasks due to database error", drogon::k500InternalServerError);
    }
}

drogon::Task<std::optional<Task>> TaskService::getTaskByIdAndUserId(int taskId, int userId) {
    try {
        auto result = co_await dbClient_->execSqlCoro("SELECT * FROM tasks WHERE id = ? AND user_id = ?;", taskId, userId);
        if (result.empty()) {
            co_return std::nullopt;
        }
        co_return Task::fromDbResult(result, 0);
    } catch (const drogon::orm::DrogonDbException& e) {
        LOG_ERROR << "Database error fetching task by ID and user ID: " << e.what();
        co_return std::nullopt;
    }
}

drogon::Task<Task> TaskService::updateTask(int taskId, int userId, const Json::Value& taskJson) {
    auto existingTaskOpt = co_await getTaskByIdAndUserId(taskId, userId);
    if (!existingTaskOpt.has_value()) {
        throw drogon::HttpException("Task not found or not owned by user", drogon::k404NotFound);
    }

    Task existingTask = existingTaskOpt.value();
    
    if (taskJson.isMember("title")) existingTask.title = taskJson["title"].asString();
    if (taskJson.isMember("description")) existingTask.description = taskJson["description"].asString();
    if (taskJson.isMember("status")) existingTask.status = Task::stringToStatus(taskJson["status"].asString());
    if (taskJson.isMember("due_date")) existingTask.due_date = taskJson["due_date"].asString();
    if (taskJson.isMember("category_id")) {
        existingTask.category_id = taskJson["category_id"].asInt();
        // Handle case where category_id is 0 or null to represent no category
        if (existingTask.category_id == 0) {
            // Treat 0 as effectively null for foreign key constraints if desired, or ensure it's a valid category ID.
            // For now, we'll allow 0 to be stored, assuming DB allows it or will be handled by the ORM.
        }
    }
    existingTask.updated_at = getCurrentTimestamp();

    try {
        auto result = co_await dbClient_->execSqlCoro(
            "UPDATE tasks SET title = ?, description = ?, status = ?, category_id = ?, due_date = ?, updated_at = ? WHERE id = ? AND user_id = ? RETURNING *;",
            existingTask.title,
            existingTask.description,
            Task::statusToString(existingTask.status),
            existingTask.category_id == 0 ? drogon::orm::internal::SqlValue(nullptr) : drogon::orm::internal::SqlValue(existingTask.category_id),
            existingTask.due_date,
            existingTask.updated_at,
            taskId,
            userId
        );
        if (result.empty()) {
             throw drogon::HttpException("Failed to update task", drogon::k500InternalServerError);
        }
        co_return Task::fromDbResult(result, 0);
    } catch (const drogon::orm::DrogonDbException& e) {
        LOG_ERROR << "Database error updating task: " << e.what();
        throw drogon::HttpException("Failed to update task due to database error", drogon::k500InternalServerError);
    }
}

drogon::Task<void> TaskService::deleteTask(int taskId, int userId) {
    try {
        auto result = co_await dbClient_->execSqlCoro("DELETE FROM tasks WHERE id = ? AND user_id = ?;", taskId, userId);
        if (result.affectedRows() == 0) {
            throw drogon::HttpException("Task not found or not owned by user", drogon::k404NotFound);
        }
        co_return;
    } catch (const drogon::orm::DrogonDbException& e) {
        LOG_ERROR << "Database error deleting task: " << e.what();
        throw drogon::HttpException("Failed to delete task due to database error", drogon::k500InternalServerError);
    }
}
```