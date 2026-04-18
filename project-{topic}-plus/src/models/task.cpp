#include "task.h"
#include <ctime>
#include <iomanip>
#include <sstream>

extern std::string to_iso8601(const std::chrono::system_clock::time_point& tp); // From user.cpp

void to_json(nlohmann::json& j, const Task& t) {
    j["id"] = t.id;
    j["project_id"] = t.project_id;
    j["title"] = t.title;
    j["description"] = t.description;
    j["due_date"] = t.due_date;
    j["status"] = t.status;
    j["assigned_to_id"] = t.assigned_to_id;
    j["created_at"] = to_iso8601(t.created_at);
    j["updated_at"] = to_iso8601(t.updated_at);
}

void from_json(const nlohmann::json& j, Task& t) {
    if (j.contains("project_id")) j.at("project_id").get_to(t.project_id);
    if (j.contains("title")) j.at("title").get_to(t.title);
    if (j.contains("description")) t.description = j.at("description").get<std::optional<std::string>>();
    if (j.contains("due_date")) t.due_date = j.at("due_date").get<std::optional<std::string>>();
    if (j.contains("status")) j.at("status").get_to(t.status);
    if (j.contains("assigned_to_id")) t.assigned_to_id = j.at("assigned_to_id").get<std::optional<std::string>>();
}
```