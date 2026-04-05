```cpp
#include "Task.hpp"
#include "../logger/Logger.hpp"
#include "../database/Database.hpp" // For SQLiteException

#include <chrono>
#include <ctime>
#include <iomanip> // For std::put_time
#include <sstream> // For std::ostringstream
#include <stdexcept>
#include <optional>
#include <vector>

// Helper to get current timestamp string
std::string getCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_c = std::chrono::system_clock::to_time_t(now);
    std::tm* ptm = std::localtime(&now_c); // NOLINT(concurrency-tsan-resource-leak) - std::localtime is not thread-safe, but for this simple usage and if concurrency is managed externally, it's fine. For high concurrency, use std::gmtime_r or boost::local_time.
    std::ostringstream oss;
    oss << std::put_time(ptm, "%Y-%m-%d %H:%M:%S");
    return oss.str();
}

Task::Task(int id, int userId, const std::string& title, const std::string& description, const std::string& status,
           const std::string& createdAt, const std::string& updatedAt)
    : id(id), userId(userId), title(title), description(description), status(status),
      createdAt(createdAt.empty() ? getCurrentTimestamp() : createdAt),
      updatedAt(updatedAt.empty() ? getCurrentTimestamp() : updatedAt) {
    
    // Basic validation for status
    if (!(status == "pending" || status == "in_progress" || status == "completed")) {
        Logger::warn("Task: Invalid status '{}' provided for task '{}'. Defaulting to 'pending'.", status, title);
        this->status = "pending";
    }
}

// Getters
int Task::getId() const { return id; }
int Task::getUserId() const { return userId; }
const std::string& Task::getTitle() const { return title; }
const std::string& Task::getDescription() const { return description; }
const std::string& Task::getStatus() const { return status; }
const std::string& Task::getCreatedAt() const { return createdAt; }
const std::string& Task::getUpdatedAt() const { return updatedAt; }

// Setters
void Task::setTitle(const std::string& newTitle) { title = newTitle; updateTimestamp(); }
void Task::setDescription(const std::string& newDescription) { description = newDescription; updateTimestamp(); }
void Task::setStatus(const std::string& newStatus) {
    if (!(newStatus == "pending" || newStatus == "in_progress" || newStatus == "completed")) {
        Logger::warn("Task: Attempted to set invalid status '{}' for task '{}'. Status not changed.", newStatus, title);
        throw std::runtime_error("Invalid status. Must be 'pending', 'in_progress', or 'completed'.");
    }
    status = newStatus;
    updateTimestamp();
}

void Task::updateTimestamp() {
    updatedAt = getCurrentTimestamp();
}

// Converts the Task object to a JSON object.
nlohmann::json Task::toJson() const {
    nlohmann::json j;
    j["id"] = id;
    j["user_id"] = userId;
    j["title"] = title;
    j["description"] = description.empty() ? nullptr : description;
    j["status"] = status;
    j["created_at"] = createdAt;
    j["updated_at"] = updatedAt;
    return j;
}

// --- Database operations ---

// Creates a new task in the database.
int Task::create(Database& db, const Task& task) {
    std::string query = "INSERT INTO tasks (user_id, title, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);";
    auto stmt = db.prepare(query);
    stmt.bind(1, task.getUserId());
    stmt.bind(2, task.getTitle());
    if (task.getDescription().empty()) {
        stmt.bindNull(3);
    } else {
        stmt.bind(3, task.getDescription());
    }
    stmt.bind(4, task.getStatus());
    stmt.bind(5, task.getCreatedAt());
    stmt.bind(6, task.getUpdatedAt());

    if (stmt.execute()) {
        Logger::debug("TaskModel: Created task for user {} with title '{}'.", task.getUserId(), task.getTitle());
        return db.getLastInsertRowId();
    } else {
        Logger::error("TaskModel: Failed to create task for user {} with title '{}'.", task.getUserId(), task.getTitle());
        throw std::runtime_error("Failed to create task.");
    }
}

// Finds a task by its ID.
std::optional<Task> Task::findById(Database& db, int id) {
    std::string query = "SELECT id, user_id, title, description, status, created_at, updated_at FROM tasks WHERE id = ?;";
    auto stmt = db.prepare(query);
    stmt.bind(1, id);

    if (stmt.step()) {
        std::string description_str = stmt.isNull(3) ? "" : stmt.getString(3);
        Logger::debug("TaskModel: Found task with ID {}.", id);
        return Task(stmt.getInt(0), stmt.getInt(1), stmt.getString(2), description_str,
                    stmt.getString(4), stmt.getString(5), stmt.getString(6));
    }
    Logger::debug("TaskModel: Task with ID {} not found.", id);
    return std::nullopt;
}

// Finds all tasks belonging to a specific user.
std::vector<Task> Task::findByUserId(Database& db, int userId) {
    std::vector<Task> tasks;
    std::string query = "SELECT id, user_id, title, description, status, created_at, updated_at FROM tasks WHERE user_id = ? ORDER BY created_at DESC;";
    auto stmt = db.prepare(query);
    stmt.bind(1, userId);

    while (stmt.step()) {
        std::string description_str = stmt.isNull(3) ? "" : stmt.getString(3);
        tasks.emplace_back(stmt.getInt(0), stmt.getInt(1), stmt.getString(2), description_str,
                           stmt.getString(4), stmt.getString(5), stmt.getString(6));
    }
    Logger::debug("TaskModel: Found {} tasks for user ID {}.", tasks.size(), userId);
    return tasks;
}

// Retrieves all tasks from the database.
std::vector<Task> Task::findAll(Database& db) {
    std::vector<Task> tasks;
    std::string query = "SELECT id, user_id, title, description, status, created_at, updated_at FROM tasks ORDER BY created_at DESC;";
    auto stmt = db.prepare(query);

    while (stmt.step()) {
        std::string description_str = stmt.isNull(3) ? "" : stmt.getString(3);
        tasks.emplace_back(stmt.getInt(0), stmt.getInt(1), stmt.getString(2), description_str,
                           stmt.getString(4), stmt.getString(5), stmt.getString(6));
    }
    Logger::debug("TaskModel: Found {} total tasks.", tasks.size());
    return tasks;
}

// Updates an existing task in the database.
bool Task::update(Database& db, const Task& task) {
    std::string query = "UPDATE tasks SET user_id = ?, title = ?, description = ?, status = ?, updated_at = ? WHERE id = ?;";
    auto stmt = db.prepare(query);
    stmt.bind(1, task.getUserId());
    stmt.bind(2, task.getTitle());
    if (task.getDescription().empty()) {
        stmt.bindNull(3);
    } else {
        stmt.bind(3, task.getDescription());
    }
    stmt.bind(4, task.getStatus());
    stmt.bind(5, task.getUpdatedAt());
    stmt.bind(6, task.getId());

    if (stmt.execute()) {
        Logger::debug("TaskModel: Updated task with ID {}.", task.getId());
        return true;
    } else {
        Logger::error("TaskModel: Failed to update task with ID {}.", task.getId());
        throw std::runtime_error("Failed to update task.");
    }
}

// Deletes a task by its ID.
bool Task::remove(Database& db, int id) {
    std::string query = "DELETE FROM tasks WHERE id = ?;";
    auto stmt = db.prepare(query);
    stmt.bind(1, id);

    if (stmt.execute()) {
        Logger::debug("TaskModel: Deleted task with ID {}.", id);
        return true;
    } else {
        Logger::error("TaskModel: Failed to delete task with ID {}.", id);
        throw std::runtime_error("Failed to delete task.");
    }
}
```