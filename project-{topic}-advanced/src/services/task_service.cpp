```cpp
#include "task_service.h"
#include <algorithm> // For std::transform

namespace mobile_backend {
namespace services {

TaskService::TaskService(utils::Database& db_instance, utils::Cache<models::Task>& task_cache_instance)
    : db(db_instance), task_cache(task_cache_instance) {}

std::optional<models::Task> TaskService::map_db_row_to_task(const utils::DbRow& row) {
    if (row.columns.empty()) return std::nullopt;

    models::Task task;
    for (const auto& col : row.columns) {
        if (col.first == "id") task.id = std::stoi(col.second);
        else if (col.first == "user_id") task.user_id = std::stoi(col.second);
        else if (col.first == "title") task.title = col.second;
        else if (col.first == "description") task.description = col.second;
        else if (col.first == "completed") task.completed = (col.second == "1"); // SQLite stores BOOLEAN as 0/1
        else if (col.first == "created_at") task.created_at = col.second;
        else if (col.first == "updated_at") task.updated_at = col.second;
    }
    return task;
}

models::Task TaskService::create_task(int user_id, const std::string& title, const std::string& description) {
    if (user_id <= 0) {
        throw TaskServiceException("Invalid user ID for task creation.");
    }
    if (title.empty()) {
        throw TaskServiceException("Task title cannot be empty.");
    }

    std::string sql = "INSERT INTO tasks (user_id, title, description) VALUES (?, ?, ?);";
    std::vector<std::string> params = {std::to_string(user_id), title, description};

    if (!db.execute_query(sql, params)) {
        LOG_ERROR("Failed to create task for user ID {}. Title: {}", user_id, title);
        throw TaskServiceException("Failed to create task due to database error.");
    }

    models::Task new_task;
    new_task.id = static_cast<int>(db.get_last_insert_rowid());
    new_task.user_id = user_id;
    new_task.title = title;
    new_task.description = description;
    new_task.completed = false; // Default value
    new_task.created_at = utils::Database::get_current_timestamp();
    new_task.updated_at = new_task.created_at;

    // Invalidate relevant cache entries, e.g., "all tasks for user_id" or add new task to cache
    // For simplicity, we won't add it to task_cache by ID immediately as it might not be accessed soon.
    // If we had a cache for `get_all_tasks_for_user`, we'd invalidate that here.
    LOG_INFO("Task ID {} created for user ID {}.", new_task.id, user_id);
    return new_task;
}

std::optional<models::Task> TaskService::get_task_by_id(int task_id, int user_id) {
    if (task_id <= 0 || user_id <= 0) {
        LOG_WARN("Attempted to get task with invalid task ID {} or user ID {}.", task_id, user_id);
        return std::nullopt;
    }

    std::string cache_key = "task_id_" + std::to_string(task_id) + "_user_" + std::to_string(user_id);
    if (auto cached_task = task_cache.get(cache_key)) {
        LOG_DEBUG("Task ID {} (user {}) found in cache.", task_id, user_id);
        return cached_task;
    }

    std::string sql = "SELECT id, user_id, title, description, completed, created_at, updated_at FROM tasks WHERE id = ? AND user_id = ?;";
    std::vector<std::string> params = {std::to_string(task_id), std::to_string(user_id)};

    auto results = db.fetch_query(sql, params);

    if (results.empty()) {
        LOG_INFO("Task ID {} not found for user ID {}.", task_id, user_id);
        return std::nullopt;
    }

    std::optional<models::Task> task = map_db_row_to_task(results[0]);
    if (task) {
        task_cache.put(cache_key, *task);
        LOG_DEBUG("Task ID {} (user {}) retrieved from DB and cached.", task_id, user_id);
    }
    return task;
}

std::vector<models::Task> TaskService::get_all_tasks_for_user(int user_id, bool completed_filter) {
    if (user_id <= 0) {
        LOG_WARN("Attempted to get tasks for invalid user ID {}.", user_id);
        return {};
    }

    // For simplicity, not caching entire lists. Could implement a "list cache" with invalidation logic.
    std::vector<models::Task> tasks;
    std::string sql = "SELECT id, user_id, title, description, completed, created_at, updated_at FROM tasks WHERE user_id = ?";
    std::vector<std::string> params = {std::to_string(user_id)};

    if (completed_filter) {
        sql += " AND completed = 1";
    }
    sql += " ORDER BY created_at DESC;"; // Order for consistency

    auto results = db.fetch_query(sql, params);

    for (const auto& row : results) {
        if (auto task = map_db_row_to_task(row)) {
            tasks.push_back(*task);
        }
    }
    LOG_DEBUG("Retrieved {} tasks for user ID {}.", tasks.size(), user_id);
    return tasks;
}

models::Task TaskService::update_task(int task_id, int user_id,
                                     const std::optional<std::string>& title,
                                     const std::optional<std::string>& description,
                                     const std::optional<bool>& completed) {
    if (task_id <= 0 || user_id <= 0) {
        throw TaskServiceException("Invalid task ID or user ID for update.");
    }

    // Ensure task belongs to user and exists
    if (!get_task_by_id(task_id, user_id)) {
        throw TaskServiceException("Task not found or does not belong to the user.");
    }

    std::string sql = "UPDATE tasks SET ";
    std::vector<std::string> params;
    std::vector<std::string> set_clauses;

    if (title) {
        if (title->empty()) {
            throw TaskServiceException("Task title cannot be empty.");
        }
        set_clauses.push_back("title = ?");
        params.push_back(*title);
    }
    if (description) {
        set_clauses.push_back("description = ?");
        params.push_back(*description);
    }
    if (completed) {
        set_clauses.push_back("completed = ?");
        params.push_back(*completed ? "1" : "0");
    }

    if (set_clauses.empty()) {
        throw TaskServiceException("No valid fields provided for task update.");
    }

    set_clauses.push_back("updated_at = ?");
    params.push_back(utils::Database::get_current_timestamp());

    sql += crow::detail::join(set_clauses, ", ");
    sql += " WHERE id = ? AND user_id = ?;";
    params.push_back(std::to_string(task_id));
    params.push_back(std::to_string(user_id));

    if (!db.execute_query(sql, params)) {
        LOG_ERROR("Failed to update task ID {} for user ID {}.", task_id, user_id);
        throw TaskServiceException("Failed to update task due to database error.");
    }

    // Invalidate cache for this specific task
    std::string cache_key = "task_id_" + std::to_string(task_id) + "_user_" + std::to_string(user_id);
    task_cache.remove(cache_key);

    // Retrieve and return the updated task
    std::optional<models::Task> updated_task = get_task_by_id(task_id, user_id);
    if (!updated_task) {
        throw TaskServiceException("Failed to retrieve updated task data.");
    }
    LOG_INFO("Task ID {} updated for user ID {}.", task_id, user_id);
    return *updated_task;
}

void TaskService::delete_task(int task_id, int user_id) {
    if (task_id <= 0 || user_id <= 0) {
        throw TaskServiceException("Invalid task ID or user ID for deletion.");
    }

    // Ensure task belongs to user and exists
    if (!get_task_by_id(task_id, user_id)) {
        throw TaskServiceException("Task not found or does not belong to the user.");
    }

    std::string sql = "DELETE FROM tasks WHERE id = ? AND user_id = ?;";
    std::vector<std::string> params = {std::to_string(task_id), std::to_string(user_id)};

    if (!db.execute_query(sql, params)) {
        LOG_ERROR("Failed to delete task ID {} for user ID {}.", task_id, user_id);
        throw TaskServiceException("Failed to delete task due to database error.");
    }

    // Invalidate cache for this specific task
    std::string cache_key = "task_id_" + std::to_string(task_id) + "_user_" + std::to_string(user_id);
    task_cache.remove(cache_key);
    LOG_INFO("Task ID {} deleted for user ID {}.", task_id, user_id);
}

} // namespace services
} // namespace mobile_backend
```