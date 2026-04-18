#include "team.h"
#include <ctime>
#include <iomanip>
#include <sstream>

extern std::string to_iso8601(const std::chrono::system_clock::time_point& tp); // From user.cpp

void to_json(nlohmann::json& j, const Team& t) {
    j["id"] = t.id;
    j["name"] = t.name;
    j["description"] = t.description;
    j["created_at"] = to_iso8601(t.created_at);
    j["updated_at"] = to_iso8601(t.updated_at);
    if (!t.member_ids.empty()) {
        j["member_ids"] = t.member_ids;
    }
}

void from_json(const nlohmann::json& j, Team& t) {
    if (j.contains("name")) j.at("name").get_to(t.name);
    if (j.contains("description")) t.description = j.at("description").get<std::optional<std::string>>();
}
```