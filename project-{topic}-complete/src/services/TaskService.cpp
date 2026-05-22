```cpp
#include "TaskService.h"
#include "db/Database.h"
#include "utils/Logger.h"
#include <sstream>
#include <algorithm> // For std::remove_if

// Initialize static members for caching
std::map<long, Task> TaskService::s_task_cache;
std::mutex TaskService::s_cache_mutex;
const std::chrono::seconds TaskService::s_cache_ttl = std::chrono::minutes(5); // Cache for 5 minutes

Task TaskService::createTask(const Task& newTask) {
    if (newTask.title.empty() || newTask.userId == 0) {
        throw std::runtime_error("Task title and user ID cannot be empty.");
    }

    std::string sql = "INSERT INTO tasks (user_id, title, description, status, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, title, description, status, due_date, created_at, updated_at;";
    std::vector<std::string> params = {
        std::to_string(newTask.userId),
        newTask.title,
        newTask.description.has_value() ? newTask.description.value() : "",
        newTask.status,
        newTask.dueDate.has_value() ? newTask.dueDate.value() : ""
    };

    try {
        std::vector<pqxx::row> rows = Database::executeQuery(sql, params);
        if (rows.empty()) {
            throw std::runtime_error("Failed to create task, no data returned.");
        }
        const pqxx::row& row = rows[0];
        Task createdTask;
        createdTask.id = row["id"].as<long>();
        createdTask.userId = row["user_id"].as<long>();
        createdTask.title = row["title"].as<std::string>();
        createdTask.description = row["description"].is_null() ? std::nullopt : std::make_optional(row["description"].as<std::string>());
        createdTask.status = row["status"].as<std::string>();
        createdTask.dueDate = row["due_date"].is_null() ? std::nullopt : std::make_optional(row["due_date"].as<std::string>());
        createdTask.createdAt = row["created_at"].as<std::string>();
        createdTask.updatedAt = row["updated_at"].as<std::string>();

        addToCache(createdTask); // Add to cache
        LOG_INFO("Task created: ID={}, UserID={}, Title='{}'", createdTask.id, createdTask.userId, createdTask.title);
        return createdTask;
    } catch (const DbException& e) {
        LOG_ERROR("Database error creating task: {}", e.what());
        throw std::runtime_error("Database error creating task.");
    }
}

std::optional<Task> TaskService::getTaskById(long taskId, long userId) {
    // Try to get from cache first
    std::lock_guard<std::mutex> lock(s_cache_mutex);
    if (s_task_cache.count(taskId)) {
        Task cachedTask = s_task_cache[taskId];
        // Basic cache validation: check user ID and TTL (if a timestamp was stored)
        if (cachedTask.userId == userId) { // && (now - cachedTask.timestamp) < s_cache_ttl
            LOG_DEBUG("Task {} retrieved from cache.", taskId);
            return cachedTask;
        } else {
            // Task in cache belongs to different user or is invalid for this request
            removeFromCache(taskId);
        }
    }
    lock.unlock(); // Release lock before going to DB

    std::string sql = "SELECT id, user_id, title, description, status, due_date, created_at, updated_at FROM tasks WHERE id = $1 AND user_id = $2;";
    std::vector<std::string> params = {std::to_string(taskId), std::to_string(userId)};

    try {
        std::vector<pqxx::row> rows = Database::executeQuery(sql, params);
        if (rows.empty()) {
            return std::nullopt;
        }
        const pqxx::row& row = rows[0];
        Task task;
        task.id = row["id"].as<long>();
        task.userId = row["user_id"].as<long>();
        task.title = row["title"].as<std::string>();
        task.description = row["description"].is_null() ? std::nullopt : std::make_optional(row["description"].as<std::string>());
        task.status = row["status"].as<std::string>();
        task.dueDate = row["due_date"].is_null() ? std::nullopt : std::make_optional(row["due_date"].as<std::string>());
        task.createdAt = row["created_at"].as<std::string>();
        task.updatedAt = row["updated_at"].as<std::string>();

        addToCache(task); // Add to cache after retrieval
        LOG_DEBUG("Task {} retrieved from DB.", taskId);
        return task;
    } catch (const DbException& e) {
        LOG_ERROR("Database error getting task by ID {}: {}", taskId, e.what());
        throw std::runtime_error("Database error retrieving task.");
    }
}

std::vector<Task> TaskService::getTasksByUserId(long userId) {
    std::vector<Task> tasks;
    std::string sql = "SELECT id, user_id, title, description, status, due_date, created_at, updated_at FROM tasks WHERE user_id = $1 ORDER BY created_at DESC;";
    std::vector<std::string> params = {std::to_string(userId)};

    try {
        std::vector<pqxx::row> rows = Database::executeQuery(sql, params);
        for (const auto& row : rows) {
            Task task;
            task.id = row["id"].as<long>();
            task.userId = row["user_id"].as<long>();
            task.title = row["title"].as<std::string>();
            task.description = row["description"].is_null() ? std::nullopt : std::make_optional(row["description"].as<std::string>());
            task.status = row["status"].as<std::string>();
            task.dueDate = row["due_date"].is_null() ? std::nullopt : std::make_optional(row["due_date"].as<std::string>());
            task.createdAt = row["created_at"].as<std::string>();
            task.updatedAt = row["updated_at"].as<std::string>();
            tasks.push_back(task);
        }
        LOG_DEBUG("Retrieved {} tasks for user ID {}.", tasks.size(), userId);
        return tasks;
    } catch (const DbException& e) {
        LOG_ERROR("Database error getting tasks for user ID {}: {}", userId, e.what());
        throw std::runtime_error("Database error retrieving tasks.");
    }
}

Task TaskService::updateTask(long taskId, long userId, const Task& updatedTaskData) {
    std::stringstream ss;
    ss << "UPDATE tasks SET ";
    std::vector<std::string> params;
    int param_idx = 1;

    // Dynamically build update query based on provided fields
    if (!updatedTaskData.title.empty()) {
        ss << "title = $" << param_idx++ << ", ";
        params.push_back(updatedTaskData.title);
    }
    if (updatedTaskData.description.has_value()) {
        ss << "description = $" << param_idx++ << ", ";
        params.push_back(updatedTaskData.description.value());
    } else if (updatedTaskData.description.has_value() == false && updatedTaskData.description.value() == "") {
        // If an empty string is explicitly provided for description, set it to NULL
        ss << "description = NULL, ";
    }

    // Validate status against enum values
    if (!updatedTaskData.status.empty()) {
        if (updatedTaskData.status != "TODO" && updatedTaskData.status != "IN_PROGRESS" && updatedTaskData.status != "DONE") {
            throw std::runtime_error("Invalid task status: " + updatedTaskData.status);
        }
        ss << "status = $" << param_idx++ << ", ";
        params.push_back(updatedTaskData.status);
    }
    if (updatedTaskData.dueDate.has_value()) {
        ss << "due_date = $" << param_idx++ << ", ";
        params.push_back(updatedTaskData.dueDate.value());
    } else if (updatedTaskData.dueDate.has_value() == false && updatedTaskData.dueDate.value() == "") {
        // If an empty string is explicitly provided for due_date, set it to NULL
        ss << "due_date = NULL, ";
    }

    ss << "updated_at = CURRENT_TIMESTAMP WHERE id = $" << param_idx++ << " AND user_id = $" << param_idx++ << " RETURNING id, user_id, title, description, status, due_date, created_at, updated_at;";
    
    // Remove trailing ", " if any
    std::string sql = ss.str();
    if (sql.find(", updated_at") != std::string::npos) { // Check if there was at least one field updated before updated_at
        sql.replace(sql.find("updated_at") - 2, 2, ""); // Remove ", "
    }

    params.push_back(std::to_string(taskId));
    params.push_back(std::to_string(userId));

    try {
        std::vector<pqxx::row> rows = Database::executeQuery(sql, params);
        if (rows.empty()) {
            throw std::runtime_error("Task not found or unauthorized to update.");
        }
        const pqxx::row& row = rows[0];
        Task updatedTask;
        updatedTask.id = row["id"].as<long>();
        updatedTask.userId = row["user_id"].as<long>();
        updatedTask.title = row["title"].as<std::string>();
        updatedTask.description = row["description"].is_null() ? std::nullopt : std::make_optional(row["description"].as<std::string>());
        updatedTask.status = row["status"].as<std::string>();
        updatedTask.dueDate = row["due_date"].is_null() ? std::nullopt : std::make_optional(row["due_date"].as<std::string>());
        updatedTask.createdAt = row["created_at"].as<std::string>();
        updatedTask.updatedAt = row["updated_at"].as<std::string>();

        updateCache(updatedTask); // Update cache
        LOG_INFO("Task updated: ID={}, UserID={}, Title='{}'", updatedTask.id, updatedTask.userId, updatedTask.title);
        return updatedTask;
    } catch (const DbException& e) {
        LOG_ERROR("Database error updating task {}: {}", taskId, e.what());
        throw std::runtime_error("Database error updating task.");
    }
}

bool TaskService::deleteTask(long taskId, long userId) {
    std::string sql = "DELETE FROM tasks WHERE id = $1 AND user_id = $2;";
    std::vector<std::string> params = {std::to_string(taskId), std::to_string(userId)};

    try {
        int affected_rows = Database::executeCommand(sql, params);
        if (affected_rows > 0) {
            removeFromCache(taskId); // Remove from cache
            LOG_INFO("Task deleted: ID={}, UserID={}", taskId, userId);
            return true;
        }
        LOG_WARN("Task not found or unauthorized to delete: ID={}, UserID={}", taskId, userId);
        return false;
    } catch (const DbException& e) {
        LOG_ERROR("Database error deleting task {}: {}", taskId, e.what());
        throw std::runtime_error("Database error deleting task.");
    }
}

void TaskService::addToCache(const Task& task) {
    std::lock_guard<std::mutex> lock(s_cache_mutex);
    s_task_cache[task.id] = task;
    LOG_DEBUG("Task {} added to cache.", task.id);
}

void TaskService::updateCache(const Task& task) {
    std::lock_guard<std::mutex> lock(s_cache_mutex);
    if (s_task_cache.count(task.id)) {
        s_task_cache[task.id] = task; // Overwrite with updated data
        LOG_DEBUG("Task {} updated in cache.", task.id);
    } else {
        s_task_cache[task.id] = task; // Add if not present
        LOG_DEBUG("Task {} added to cache during update (was not found).", task.id);
    }
}

void TaskService::removeFromCache(long taskId) {
    std::lock_guard<std::mutex> lock(s_cache_mutex);
    if (s_task_cache.count(taskId)) {
        s_task_cache.erase(taskId);
        LOG_DEBUG("Task {} removed from cache.", taskId);
    }
}

void TaskService::clearCacheForUser(long userId) {
    // For a map keyed by task ID, clearing for a specific user requires iterating.
    // In a production cache, you might have user-specific caches or a more complex eviction policy.
    std::lock_guard<std::mutex> lock(s_cache_mutex);
    auto it = s_task_cache.begin();
    while (it != s_task_cache.end()) {
        if (it->second.userId == userId) {
            it = s_task_cache.erase(it);
        } else {
            ++it;
        }
    }
    LOG_DEBUG("Cache cleared for tasks belonging to user {}.", userId);
}
```