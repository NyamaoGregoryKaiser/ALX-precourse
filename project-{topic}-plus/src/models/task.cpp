#include "task.h"
#include <sstream>
#include <iomanip> // For std::put_time
#include <chrono>  // For std::chrono::system_clock
#include <algorithm> // For std::transform

#include "src/utils/logger.h"
#include "src/utils/exceptions.h"

// Helper function to get current timestamp in ISO 8601 format
std::string Task::get_current_timestamp() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::localtime(&in_time_t), "%Y-%m-%dT%H:%M:%S%z");
    std::string timestamp = ss.str();

    // Adjust timezone format from '+0000' to '+00:00' if necessary
    if (timestamp.length() > 2 && timestamp[timestamp.length() - 3] != ':') {
        timestamp.insert(timestamp.length() - 2, ":");
    }
    return timestamp;
}

std::string task_status_to_string(TaskStatus status) {
    switch (status) {
        case TaskStatus::PENDING: return "pending";
        case TaskStatus::IN_PROGRESS: return "in_progress";
        case TaskStatus::COMPLETED: return "completed";
        case TaskStatus::CANCELLED: return "cancelled";
        default: return "unknown";
    }
}

TaskStatus string_to_task_status(const std::string& status_str) {
    std::string lower_str = status_str;
    std::transform(lower_str.begin(), lower_str.end(), lower_str.begin(), ::tolower);
    if (lower_str == "in_progress") {
        return TaskStatus::IN_PROGRESS;
    }
    if (lower_str == "completed") {
        return TaskStatus::COMPLETED;
    }
    if (lower_str == "cancelled") {
        return TaskStatus::CANCELLED;
    }
    return TaskStatus::PENDING; // Default to PENDING
}

Task::Task(long id, const std::string& title, const std::string& description,
           TaskStatus status, const std::string& due_date, long user_id,
           const std::string& created_at, const std::string& updated_at)
    : id(id), title(title), description(description), status(status),
      due_date(due_date), user_id(user_id), created_at(created_at), updated_at(updated_at) {}

std::optional<Task> Task::from_db_row(const DbRow& row) {
    if (row.columns.empty()) {
        return std::nullopt;
    }

    try {
        Task task;
        task.id = std::stoll(row.columns.at("id"));
        task.title = row.columns.at("title");
        task.description = row.columns.at("description");
        task.status = string_to_task_status(row.columns.at("status"));
        task.due_date = row.columns.at("due_date");
        task.user_id = std::stoll(row.columns.at("user_id"));
        task.created_at = row.columns.at("created_at");
        task.updated_at = row.columns.at("updated_at");
        return task;
    } catch (const std::out_of_range& e) {
        LOG_ERROR("Missing column in DbRow for Task: " + std::string(e.what()));
        return std::nullopt;
    } catch (const std::exception& e) {
        LOG_ERROR("Error converting DbRow to Task: " + std::string(e.what()));
        return std::nullopt;
    }
}

Json::Value Task::to_json() const {
    Json::Value task_json;
    task_json["id"] = (Json::Int64)id;
    task_json["title"] = title;
    task_json["description"] = description;
    task_json["status"] = task_status_to_string(status);
    task_json["due_date"] = due_date;
    task_json["user_id"] = (Json::Int64)user_id;
    task_json["created_at"] = created_at;
    task_json["updated_at"] = updated_at;
    return task_json;
}

std::optional<Task> Task::create(const std::string& title, const std::string& description,
                                 TaskStatus status, const std::string& due_date, long user_id) {
    DatabaseManager& db = DatabaseManager::getInstance();
    std::string current_time = get_current_timestamp();

    std::string sql = "INSERT INTO tasks (title, description, status, due_date, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);";
    std::vector<std::pair<int, std::string>> params = {
        {1, title},
        {2, description},
        {3, task_status_to_string(status)},
        {4, due_date},
        {5, std::to_string(user_id)},
        {6, current_time},
        {7, current_time}
    };

    try {
        db.execute_non_query_prepared(sql, params);
        long new_id = db.last_insert_rowid();
        return Task(new_id, title, description, status, due_date, user_id, current_time, current_time);
    } catch (const DatabaseException& e) {
        LOG_ERROR("Failed to create task: " + std::string(e.what()));
        throw;
    }
}

std::optional<Task> Task::find_by_id(long id) {
    DatabaseManager& db = DatabaseManager::getInstance();
    std::string sql = "SELECT id, title, description, status, due_date, user_id, created_at, updated_at FROM tasks WHERE id = ?;";
    std::vector<std::pair<int, std::string>> params = {
        {1, std::to_string(id)}
    };

    try {
        std::vector<DbRow> rows = db.execute_query_prepared(sql, params);
        if (rows.empty()) {
            return std::nullopt;
        }
        return from_db_row(rows[0]);
    } catch (const DatabaseException& e) {
        LOG_ERROR("Failed to find task by ID: " + std::string(e.what()));
        throw;
    }
}

std::vector<Task> Task::find_all() {
    DatabaseManager& db = DatabaseManager::getInstance();
    std::string sql = "SELECT id, title, description, status, due_date, user_id, created_at, updated_at FROM tasks;";

    try {
        std::vector<DbRow> rows = db.query(sql);
        std::vector<Task> tasks;
        for (const auto& row : rows) {
            if (auto task = from_db_row(row)) {
                tasks.push_back(*task);
            }
        }
        return tasks;
    } catch (const DatabaseException& e) {
        LOG_ERROR("Failed to find all tasks: " + std::string(e.what()));
        throw;
    }
}

std::vector<Task> Task::find_by_user_id(long user_id) {
    DatabaseManager& db = DatabaseManager::getInstance();
    std::string sql = "SELECT id, title, description, status, due_date, user_id, created_at, updated_at FROM tasks WHERE user_id = ?;";
    std::vector<std::pair<int, std::string>> params = {
        {1, std::to_string(user_id)}
    };

    try {
        std::vector<DbRow> rows = db.execute_query_prepared(sql, params);
        std::vector<Task> tasks;
        for (const auto& row : rows) {
            if (auto task = from_db_row(row)) {
                tasks.push_back(*task);
            }
        }
        return tasks;
    } catch (const DatabaseException& e) {
        LOG_ERROR("Failed to find tasks by user ID: " + std::string(e.what()));
        throw;
    }
}

bool Task::update() {
    DatabaseManager& db = DatabaseManager::getInstance();
    std::string current_time = get_current_timestamp();

    std::string sql = "UPDATE tasks SET title = ?, description = ?, status = ?, due_date = ?, updated_at = ? WHERE id = ?;";
    std::vector<std::pair<int, std::string>> params = {
        {1, title},
        {2, description},
        {3, task_status_to_string(status)},
        {4, due_date},
        {5, current_time},
        {6, std::to_string(id)}
    };

    try {
        int affected_rows = db.execute_non_query_prepared(sql, params);
        if (affected_rows > 0) {
            updated_at = current_time; // Update object's timestamp
            return true;
        }
        return false;
    } catch (const DatabaseException& e) {
        LOG_ERROR("Failed to update task ID " + std::to_string(id) + ": " + std::string(e.what()));
        throw;
    }
}

bool Task::remove() {
    DatabaseManager& db = DatabaseManager::getInstance();
    std::string sql = "DELETE FROM tasks WHERE id = ?;";
    std::vector<std::pair<int, std::string>> params = {
        {1, std::to_string(id)}
    };

    try {
        int affected_rows = db.execute_non_query_prepared(sql, params);
        return affected_rows > 0;
    } catch (const DatabaseException& e) {
        LOG_ERROR("Failed to delete task ID " + std::to_string(id) + ": " + std::string(e.what()));
        throw;
    }
}
```