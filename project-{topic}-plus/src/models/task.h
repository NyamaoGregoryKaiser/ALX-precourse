#pragma once

#include <string>
#include <chrono>
#include <optional>
#include <nlohmann/json.hpp>

struct Task {
    std::string id;
    std::string project_id;
    std::string title;
    std::optional<std::string> description;
    std::optional<std::string> due_date; // YYYY-MM-DD format
    std::string status; // e.g., 'todo', 'in-progress', 'done', 'blocked'
    std::optional<std::string> assigned_to_id;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;

    Task() = default;

    Task(const std::string& project_id, const std::string& title,
         const std::optional<std::string>& description = std::nullopt,
         const std::optional<std::string>& due_date = std::nullopt,
         const std::string& status = "todo",
         const std::optional<std::string>& assigned_to_id = std::nullopt)
        : project_id(project_id), title(title), description(description), due_date(due_date),
          status(status), assigned_to_id(assigned_to_id) {}
};

void to_json(nlohmann::json& j, const Task& t);
void from_json(const nlohmann::json& j, Task& t);
```