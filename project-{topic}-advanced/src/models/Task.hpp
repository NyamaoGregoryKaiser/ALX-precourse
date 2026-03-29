```cpp
#ifndef TASK_HPP
#define TASK_HPP

#include <string>
#include <optional>
#include "json.hpp"

enum class TaskStatus {
    TODO,
    IN_PROGRESS,
    DONE
};

// Helper to convert string to TaskStatus
static TaskStatus stringToTaskStatus(const std::string& status_str) {
    if (status_str == "IN_PROGRESS") return TaskStatus::IN_PROGRESS;
    if (status_str == "DONE") return TaskStatus::DONE;
    return TaskStatus::TODO; // Default
}

// Helper to convert TaskStatus to string
static std::string taskStatusToString(TaskStatus status) {
    switch (status) {
        case TaskStatus::TODO: return "TODO";
        case TaskStatus::IN_PROGRESS: return "IN_PROGRESS";
        case TaskStatus::DONE: return "DONE";
        default: return "UNKNOWN";
    }
}

struct Task {
    std::optional<int> id;
    std::string title;
    std::string description;
    TaskStatus status;
    int project_id;
    std::optional<int> assigned_user_id; // User assigned to the task

    Task() : status(TaskStatus::TODO), project_id(0) {} // Default values

    Task(int id, const std::string& title, const std::string& description, TaskStatus status, int project_id, std::optional<int> assigned_user_id = std::nullopt)
        : id(id), title(title), description(description), status(status), project_id(project_id), assigned_user_id(assigned_user_id) {}

    Task(const std::string& title, const std::string& description, TaskStatus status, int project_id, std::optional<int> assigned_user_id = std::nullopt)
        : title(title), description(description), status(status), project_id(project_id), assigned_user_id(assigned_user_id) {}

    nlohmann::json toJson() const {
        nlohmann::json j;
        if (id.has_value()) {
            j["id"] = id.value();
        }
        j["title"] = title;
        j["description"] = description;
        j["status"] = taskStatusToString(status);
        j["project_id"] = project_id;
        if (assigned_user_id.has_value()) {
            j["assigned_user_id"] = assigned_user_id.value();
        } else {
            j["assigned_user_id"] = nullptr;
        }
        return j;
    }
};

#endif // TASK_HPP
```