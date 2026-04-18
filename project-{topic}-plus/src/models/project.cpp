#include "project.h"
#include <ctime>
#include <iomanip>
#include <sstream>

extern std::string to_iso8601(const std::chrono::system_clock::time_point& tp); // From user.cpp

void to_json(nlohmann::json& j, const Project& p) {
    j["id"] = p.id;
    j["name"] = p.name;
    j["description"] = p.description;
    j["start_date"] = p.start_date;
    j["end_date"] = p.end_date;
    j["status"] = p.status;
    j["owner_id"] = p.owner_id;
    j["team_id"] = p.team_id;
    j["created_at"] = to_iso8601(p.created_at);
    j["updated_at"] = to_iso8601(p.updated_at);
}

void from_json(const nlohmann::json& j, Project& p) {
    if (j.contains("name")) j.at("name").get_to(p.name);
    if (j.contains("description")) p.description = j.at("description").get<std::optional<std::string>>();
    if (j.contains("start_date")) p.start_date = j.at("start_date").get<std::optional<std::string>>();
    if (j.contains("end_date")) p.end_date = j.at("end_date").get<std::optional<std::string>>();
    if (j.contains("status")) j.at("status").get_to(p.status);
    if (j.contains("owner_id")) j.at("owner_id").get_to(p.owner_id);
    if (j.contains("team_id")) p.team_id = j.at("team_id").get<std::optional<std::string>>();
}
```