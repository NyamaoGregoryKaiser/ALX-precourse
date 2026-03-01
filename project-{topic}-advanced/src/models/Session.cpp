#include "Session.h"

namespace drogon_model {
namespace auth_system {

const std::string Session::tableName_ = "sessions";
const std::vector<std::string> Session::primaryKeyName_ = {"jwt_token"};
const std::map<std::string, bool> Session::tableColumns_ = {
    {"jwt_token", false},
    {"user_id", true},
    {"expires_at", true},
    {"created_at", true}
};

Session::Session(const Json::Value &pJson)
    : drogon::orm::Result(drogon::orm::Result(nullptr))
{
    if (pJson.isMember("jwt_token")) {
        setJwtToken(pJson["jwt_token"].asString());
    }
    if (pJson.isMember("user_id")) {
        setUserId(pJson["user_id"].asInt64());
    }
    if (pJson.isMember("expires_at")) {
        setExpiresAt(trantor::Date(pJson["expires_at"].asString()));
    }
    if (pJson.isMember("created_at")) {
        setCreatedAt(trantor::Date(pJson["created_at"].asString()));
    }
}

Session::Session(const std::map<std::string, std::any> &pMas, const std::vector<std::string> &pAttrs)
    : drogon::orm::Result(pMas, pAttrs)
{
}

Json::Value Session::toJson() const {
    Json::Value json;
    json["jwt_token"] = jwtToken();
    json["user_id"] = (Json::Int64)userId();
    json["expires_at"] = expiresAt().toFormattedString(false);
    json["created_at"] = createdAt().toFormattedString(false);
    return json;
}

} // namespace auth_system
} // namespace drogon_model
```