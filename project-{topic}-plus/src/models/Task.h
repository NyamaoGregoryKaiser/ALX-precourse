```cpp
#ifndef TASK_H
#define TASK_H

#include <string>
#include <json/json.hpp>
#include <optional>
#include "BaseModels.h"

namespace TaskManager {
namespace Models {

struct Task {
    std::optional<long long> id;
    std::string title;
    std::optional<std::string> description;
    TaskStatus status;
    TaskPriority priority;
    std::optional<std::string> due_date; // ISO 8601 format
    std::optional<long long> project_id; // Foreign key to Project
    std::optional<long long> assigned_to; // Foreign key to User
    std::optional<std::string> created_at;
    std::optional<std::string> updated_at;

    Task() : status(TaskStatus::TODO), priority(TaskPriority::MEDIUM) {}

    // Convert Task object to JSON
    nlohmann::json toJson() const {
        nlohmann::json j;
        if (id) j["id"] = *id;
        j["title"] = title;
        if (description) j["description"] = *description;
        j["status"] = taskStatusToString(status);
        j["priority"] = taskPriorityToString(priority);
        if (due_date) j["due_date"] = *due_date;
        if (project_id) j["project_id"] = *project_id;
        if (assigned_to) j["assigned_to"] = *assigned_to;
        if (created_at) j["created_at"] = *created_at;
        if (updated_at) j["updated_at"] = *updated_at;
        return j;
    }

    // Convert JSON to Task object
    static Task fromJson(const nlohmann::json& j) {
        Task task;
        if (j.contains("id") && j["id"].is_number()) task.id = j["id"].get<long long>();
        if (j.contains("title") && j["title"].is_string()) task.title = j["title"].get<std::string>();
        if (j.contains("description") && j["description"].is_string()) task.description = j["description"].get<std::string>();
        if (j.contains("status") && j["status"].is_string()) task.status = stringToTaskStatus(j["status"].get<std::string>());
        if (j.contains("priority") && j["priority"].is_string()) task.priority = stringToTaskPriority(j["priority"].get<std::string>());
        if (j.contains("due_date") && j["due_date"].is_string()) task.due_date = j["due_date"].get<std::string>();
        if (j.contains("project_id") && j["project_id"].is_number()) task.project_id = j["project_id"].get<long long>();
        if (j.contains("assigned_to") && j["assigned_to"].is_number()) task.assigned_to = j["assigned_to"].get<long long>();
        if (j.contains("created_at") && j["created_at"].is_string()) task.created_at = j["created_at"].get<std::string>();
        if (j.contains("updated_at") && j["updated_at"].is_string()) task.updated_at = j["updated_at"].get<std::string>();
        return task;
    }
};

} // namespace Models
} // namespace TaskManager

#endif // TASK_H
```