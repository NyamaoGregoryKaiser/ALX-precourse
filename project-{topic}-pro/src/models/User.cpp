```cpp
#include "models/User.hpp"
#include <stdexcept>

nlohmann::json User::toJson() const {
    nlohmann::json j;
    j["id"] = id;
    j["username"] = username;
    j["email"] = email;
    j["role"] = role; // Uses the NLOHMANN_JSON_SERIALIZE_ENUM
    j["createdAt"] = createdAt;
    j["updatedAt"] = updatedAt;
    // Don't include hashedPassword in public JSON representation
    return j;
}

User User::fromJson(const nlohmann::json& j) {
    User user;
    if (j.contains("id")) user.id = j.at("id").get<long>();
    if (j.contains("username")) user.username = j.at("username").get<std::string>();
    if (j.contains("email")) user.email = j.at("email").get<std::string>();
    if (j.contains("hashedPassword")) user.hashedPassword = j.at("hashedPassword").get<std::string>();
    if (j.contains("role")) user.role = j.at("role").get<UserRole>();
    if (j.contains("createdAt")) user.createdAt = j.at("createdAt").get<std::string>();
    if (j.contains("updatedAt")) user.updatedAt = j.at("updatedAt").get<std::string>();
    return user;
}
```