#include "User.h"
#include "Role.h" // Include Role header for getRoles method

namespace drogon_model {
namespace auth_system {

const std::string User::tableName_ = "users";
const std::vector<std::string> User::primaryKeyName_ = {"id"};
const std::map<std::string, bool> User::tableColumns_ = {
    {"id", false},
    {"username", true},
    {"email", true},
    {"password_hash", true},
    {"created_at", true},
    {"updated_at", true},
    {"enabled", true}
};

User::User(const Json::Value &pJson)
    : drogon::orm::Result(drogon::orm::Result(nullptr)) // Initialize base class properly
{
    if (pJson.isMember("id")) {
        setId(pJson["id"].asInt64());
    }
    if (pJson.isMember("username")) {
        setUsername(pJson["username"].asString());
    }
    if (pJson.isMember("email")) {
        setEmail(pJson["email"].asString());
    }
    if (pJson.isMember("password_hash")) {
        setPasswordHash(pJson["password_hash"].asString());
    }
    if (pJson.isMember("created_at")) {
        setCreatedAt(trantor::Date(pJson["created_at"].asString()));
    }
    if (pJson.isMember("updated_at")) {
        setUpdatedAt(trantor::Date(pJson["updated_at"].asString()));
    }
    if (pJson.isMember("enabled")) {
        setEnabled(pJson["enabled"].asBool());
    }
}

User::User(const std::map<std::string, std::any> &pMas, const std::vector<std::string> &pAttrs)
    : drogon::orm::Result(pMas, pAttrs)
{
}


Json::Value User::toJson() const {
    Json::Value json;
    json["id"] = (Json::Int64)id();
    json["username"] = username();
    json["email"] = email();
    json["created_at"] = createdAt().toFormattedString(false);
    json["updated_at"] = updatedAt().toFormattedString(false);
    json["enabled"] = enabled();
    return json;
}

std::vector<drogon_model::auth_system::Role> User::getRoles(drogon::orm::DbClientPtr dbClient) const {
    std::vector<drogon_model::auth_system::Role> roles;
    if (!dbClient) {
        LOG_ERROR << "Database client is null.";
        return roles;
    }

    std::string sql = "SELECT r.* FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1";
    try {
        auto result = dbClient->execSqlSync(sql, id());
        for (const auto& row : result) {
            roles.emplace_back(row);
        }
    } catch (const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Failed to fetch roles for user " << id() << ": " << e.what();
    }
    return roles;
}

} // namespace auth_system
} // namespace drogon_model
```