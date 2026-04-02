```cpp
#include "TaskService.h"
#include "../utils/TimeUtil.h"

namespace TaskManager {
namespace Services {

TaskService::TaskService(Database::Database& db, Cache::Cache& cache)
    : db_(db), cache_(cache) {}

std::string TaskService::generateCacheKey(long long taskId) {
    return "task_" + std::to_string(taskId);
}

void TaskService::invalidateTaskCache(long long taskId) {
    cache_.remove(generateCacheKey(taskId));
}

Models::Task TaskService::createTask(Models::Task task) {
    if (task.title.empty()) {
        throw Exceptions::ValidationException("Task title is required.");
    }
    if (!task.project_id) {
        throw Exceptions::ValidationException("Task must belong to a project.");
    }

    std::string sql = "INSERT INTO tasks (title, description, status, priority, due_date, project_id, assigned_to, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    std::vector<std::string> params;
    params.push_back(task.title);
    params.push_back(task.description ? *task.description : "");
    params.push_back(Models::taskStatusToString(task.status));
    params.push_back(Models::taskPriorityToString(task.priority));
    params.push_back(task.due_date ? *task.due_date : "");
    params.push_back(std::to_string(*task.project_id));
    params.push_back(task.assigned_to ? std::to_string(*task.assigned_to) : "");
    params.push_back(Utils::TimeUtil::getCurrentTimestamp());
    params.push_back(Utils::TimeUtil::getCurrentTimestamp());

    try {
        db_.preparedExecute(sql, params);
        task.id = db_.getLastInsertRowId();
        task.created_at = Utils::TimeUtil::getCurrentTimestamp();
        task.updated_at = Utils::TimeUtil::getCurrentTimestamp();
        Utils::Logger::getLogger()->info("Task created: {}", task.title);
        return task;
    } catch (const Exceptions::DatabaseException& e) {
        if (std::string(e.what()).find("FOREIGN KEY constraint failed") != std::string::npos) {
            throw Exceptions::BadRequestException("Invalid project_id or assigned_to user ID.");
        }
        throw;
    }
}

std::optional<Models::Task> TaskService::getTaskById(long long id) {
    auto cached_task_json = cache_.get(generateCacheKey(id));
    if (cached_task_json) {
        Utils::Logger::getLogger()->debug("Cache hit for task ID: {}", id);
        return Models::Task::fromJson(*cached_task_json);
    }

    std::string sql = "SELECT id, title, description, status, priority, due_date, project_id, assigned_to, created_at, updated_at FROM tasks WHERE id = ?";
    std::vector<std::string> params = {std::to_string(id)};
    
    ResultSet results = db_.preparedQuery(sql, params);
    if (!results.empty()) {
        auto task = mapRowToTask(results[0]);
        if (task) {
            cache_.set(generateCacheKey(id), task->toJson());
        }
        return task;
    }
    return std::nullopt;
}

std::vector<Models::Task> TaskService::getAllTasks(int limit, int offset) {
    std::string sql = "SELECT id, title, description, status, priority, due_date, project_id, assigned_to, created_at, updated_at FROM tasks LIMIT ? OFFSET ?";
    std::vector<std::string> params = {std::to_string(limit), std::to_string(offset)};
    
    ResultSet results = db_.preparedQuery(sql, params);
    std::vector<Models::Task> tasks;
    for (const auto& row : results) {
        if (auto task = mapRowToTask(row)) {
            tasks.push_back(*task);
        }
    }
    return tasks;
}

std::vector<Models::Task> TaskService::getTasksByProject(long long project_id, int limit, int offset) {
    std::string sql = "SELECT id, title, description, status, priority, due_date, project_id, assigned_to, created_at, updated_at FROM tasks WHERE project_id = ? LIMIT ? OFFSET ?";
    std::vector<std::string> params = {std::to_string(project_id), std::to_string(limit), std::to_string(offset)};
    
    ResultSet results = db_.preparedQuery(sql, params);
    std::vector<Models::Task> tasks;
    for (const auto& row : results) {
        if (auto task = mapRowToTask(row)) {
            tasks.push_back(*task);
        }
    }
    return tasks;
}

std::vector<Models::Task> TaskService::getTasksAssignedToUser(long long assigned_to_id, int limit, int offset) {
    std::string sql = "SELECT id, title, description, status, priority, due_date, project_id, assigned_to, created_at, updated_at FROM tasks WHERE assigned_to = ? LIMIT ? OFFSET ?";
    std::vector<std::string> params = {std::to_string(assigned_to_id), std::to_string(limit), std::to_string(offset)};
    
    ResultSet results = db_.preparedQuery(sql, params);
    std::vector<Models::Task> tasks;
    for (const auto& row : results) {
        if (auto task = mapRowToTask(row)) {
            tasks.push_back(*task);
        }
    }
    return tasks;
}

Models::Task TaskService::updateTask(long long id, const Models::Task& task_updates) {
    std::optional<Models::Task> existing_task = getTaskById(id);
    if (!existing_task) {
        throw Exceptions::NotFoundException("Task not found with ID: " + std::to_string(id));
    }

    std::string sql = "UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, project_id = ?, assigned_to = ?, updated_at = ? WHERE id = ?";
    std::vector<std::string> params;
    params.push_back(task_updates.title.empty() ? existing_task->title : task_updates.title);
    params.push_back(task_updates.description ? *task_updates.description : (existing_task->description ? *existing_task->description : ""));
    params.push_back(Models::taskStatusToString(task_updates.status == Models::TaskStatus::UNKNOWN ? existing_task->status : task_updates.status));
    params.push_back(Models::taskPriorityToString(task_updates.priority == Models::TaskPriority::UNKNOWN ? existing_task->priority : task_updates.priority));
    params.push_back(task_updates.due_date ? *task_updates.due_date : (existing_task->due_date ? *existing_task->due_date : ""));
    params.push_back(task_updates.project_id ? std::to_string(*task_updates.project_id) : (existing_task->project_id ? std::to_string(*existing_task->project_id) : ""));
    params.push_back(task_updates.assigned_to ? std::to_string(*task_updates.assigned_to) : (existing_task->assigned_to ? std::to_string(*existing_task->assigned_to) : ""));
    params.push_back(Utils::TimeUtil::getCurrentTimestamp());
    params.push_back(std::to_string(id));

    try {
        db_.preparedExecute(sql, params);
    } catch (const Exceptions::DatabaseException& e) {
        if (std::string(e.what()).find("FOREIGN KEY constraint failed") != std::string::npos) {
            throw Exceptions::BadRequestException("Invalid project_id or assigned_to user ID provided for update.");
        }
        throw;
    }
    
    invalidateTaskCache(id);
    std::optional<Models::Task> updated_task = getTaskById(id);
    if (!updated_task) {
        throw Exceptions::InternalServerError("Failed to retrieve updated task data after update.");
    }
    Utils::Logger::getLogger()->info("Task updated: ID {}", id);
    return *updated_task;
}

void TaskService::deleteTask(long long id) {
    if (!getTaskById(id)) {
        throw Exceptions::NotFoundException("Task not found with ID: " + std::to_string(id));
    }

    std::string sql = "DELETE FROM tasks WHERE id = ?";
    db_.preparedExecute(sql, {std::to_string(id)});
    invalidateTaskCache(id);
    Utils::Logger::getLogger()->info("Task deleted: ID {}", id);
}

std::optional<Models::Task> TaskService::mapRowToTask(const Database::Row& row) {
    if (row.empty()) return std::nullopt;

    Models::Task task;
    try {
        if (row.count("id")) task.id = std::stoll(row.at("id"));
        if (row.count("title")) task.title = row.at("title");
        if (row.count("description")) task.description = row.at("description");
        if (row.count("status")) task.status = Models::stringToTaskStatus(row.at("status"));
        if (row.count("priority")) task.priority = Models::stringToTaskPriority(row.at("priority"));
        if (row.count("due_date")) task.due_date = row.at("due_date");
        if (row.count("project_id") && !row.at("project_id").empty()) task.project_id = std::stoll(row.at("project_id"));
        if (row.count("assigned_to") && !row.at("assigned_to").empty()) task.assigned_to = std::stoll(row.at("assigned_to"));
        if (row.count("created_at")) task.created_at = row.at("created_at");
        if (row.count("updated_at")) task.updated_at = row.at("updated_at");
        return task;
    } catch (const std::exception& e) {
        Utils::Logger::getLogger()->error("Error mapping database row to Task: {}", e.what());
        return std::nullopt;
    }
}

} // namespace Services
} // namespace TaskManager
```