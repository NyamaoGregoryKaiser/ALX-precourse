```cpp
#pragma once

#include <drogon/drogon.h>
#include <drogon/orm/Mapper.h>
#include <vector>
#include <optional>
#include "../models/Task.h"

class TaskService {
public:
    TaskService(drogon::orm::DbClientPtr dbClient);

    // Create a new task
    drogon::Task<Task> createTask(int userId, const Json::Value& taskJson);

    // Get all tasks for a specific user, with optional filters
    drogon::Task<std::vector<Task>> getTasksByUserId(int userId, std::optional<Task::Status> statusFilter = std::nullopt, std::optional<int> categoryIdFilter = std::nullopt);

    // Get a specific task by ID and user ID
    drogon::Task<std::optional<Task>> getTaskByIdAndUserId(int taskId, int userId);

    // Update an existing task
    drogon::Task<Task> updateTask(int taskId, int userId, const Json::Value& taskJson);

    // Delete a task
    drogon::Task<void> deleteTask(int taskId, int userId);

private:
    drogon::orm::DbClientPtr dbClient_;

    // Get current timestamp in YYYY-MM-DD HH:MM:SS format
    std::string getCurrentTimestamp();
};
```