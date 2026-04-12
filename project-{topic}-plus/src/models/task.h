#pragma once

#include <string>
#include <vector>
#include <optional>
#include <json/json.h>

#include "src/database/database_manager.h" // For DbRow

// Enum for task status
enum class TaskStatus {
    PENDING,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED
};

std::string task_status_to_string(TaskStatus status);
TaskStatus string_to_task_status(const std::string& status_str);

class Task {
public:
    long id = 0;
    std::string title;
    std::string description;
    TaskStatus status = TaskStatus::PENDING;
    std::string due_date; // ISO 8601 date string (YYYY-MM-DD)
    long user_id = 0; // Foreign key to the User table
    std::string created_at;
    std::string updated_at;

    Task() = default;
    Task(long id, const std::string& title, const std::string& description,
         TaskStatus status, const std::string& due_date, long user_id,
         const std::string& created_at, const std::string& updated_at);

    // Convert DbRow to Task object
    static std::optional<Task> from_db_row(const DbRow& row);

    // Convert Task object to JSON
    Json::Value to_json() const;

    // CRUD operations
    static std::optional<Task> create(const std::string& title, const std::string& description,
                                      TaskStatus status, const std::string& due_date, long user_id);
    static std::optional<Task> find_by_id(long id);
    static std::vector<Task> find_all();
    static std::vector<Task> find_by_user_id(long user_id);
    bool update(); // Updates current task object in DB
    bool remove(); // Deletes current task object from DB

private:
    static std::string get_current_timestamp();
};
```