#ifndef SESSION_H
#define SESSION_H

#include <drogon/orm/Mapper.h>
#include <drogon/orm/Result.h>
#include <json/json.h>
#include <string>
#include <vector>

namespace drogon_model {
namespace auth_system {

class Session : public drogon::orm::Result {
public:
    struct primary_key_type
    {
        using type = std::string;
        std::vector<type> operator()(const Session& c) const { return {c.jwtToken()}; }
    };
    static const std::string &tableName() { return tableName_; }
    static const std::vector<std::string> &primaryKeyName() { return primaryKeyName_; }
    static const std::map<std::string, bool> &getTableColumns() { return tableColumns_; }

    Session(const drogon::orm::Result &r) : drogon::orm::Result(r) {}
    Session(const Json::Value &pJson = Json::Value());
    Session(const std::map<std::string, std::any> &pMas, const std::vector<std::string> &pAttrs = {});

    const std::string &jwtToken() const { return getValueOf<const std::string &>("jwt_token"); }
    void setJwtToken(const std::string &jwtToken) { setValueOf("jwt_token", jwtToken); }

    int64_t userId() const { return getValueOf<int64_t>("user_id"); }
    void setUserId(int64_t userId) { setValueOf("user_id", userId); }

    const trantor::Date &expiresAt() const { return getValueOf<const trantor::Date &>("expires_at"); }
    void setExpiresAt(const trantor::Date &expiresAt) { setValueOf("expires_at", expiresAt); }

    const trantor::Date &createdAt() const { return getValueOf<const trantor::Date &>("created_at"); }
    void setCreatedAt(const trantor::Date &createdAt) { setValueOf("created_at", createdAt); }

    Json::Value toJson() const;

private:
    static const std::string tableName_;
    static const std::vector<std::string> primaryKeyName_;
    static const std::map<std::string, bool> tableColumns_;
};

using SessionMapper = drogon::orm::Mapper<Session>;

} // namespace auth_system
} // namespace drogon_model

#endif // SESSION_H
```