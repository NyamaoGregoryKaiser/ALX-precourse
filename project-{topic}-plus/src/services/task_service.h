#pragma once

#include <string>
#include <vector>
#include <optional>
#include <stdexcept>
#include "../models/task.h"
#include "../database/db_manager.h"

class TaskNotFoundException : public std::runtime_error {
public:
    explicit TaskNotFoundException(const std::string& msg) : std::runtime_error(msg) {}
};

class TaskService {
public:
    explicit TaskService(DbManager& db_manager);

    Task createTask(Task& task);
    std::optional<Task> getTaskById(const std::string& id);
    std::vector<Task> getTasksByProjectId(const std::string& project_id);
    std::vector<Task> getTasksAssignedToUser(const std::string& user_id);
    Task updateTask(const std::string& id, const Task& task_updates);
    void deleteTask(const std::string& id);

private:
    DbManager& db_manager_;
};
```