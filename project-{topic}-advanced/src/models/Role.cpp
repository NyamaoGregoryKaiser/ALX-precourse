#include "Role.h"

namespace drogon_model {
namespace auth_system {

const std::string Role::tableName_ = "roles";
const std::vector<std::string> Role::primaryKeyName_ = {"id"};
const std::map<std::string, bool> Role::tableColumns_ = {
    {"id", false},
    {"name", true},
    {"description", true}
};

Role::Role(const Json::Value &pJson)
    : drogon::orm::Result(drogon::orm::Result(nullptr))
{
    if (pJson.isMember("id")) {
        setId(pJson["id"].asInt());
    }
    if (pJson.isMember("name")) {
        setName(pJson["name"].asString());
    }
    if (pJson.isMember("description")) {
        setDescription(pJson["description"].asString());
    }
}

Role::Role(const std::map<std::string, std::any> &pMas, const std::vector<std::string> &pAttrs)
    : drogon::orm::Result(pMas, pAttrs)
{
}

Json::Value Role::toJson() const {
    Json::Value json;
    json["id"] = id();
    json["name"] = name();
    json["description"] = description();
    return json;
}

} // namespace auth_system
} // namespace drogon_model
```