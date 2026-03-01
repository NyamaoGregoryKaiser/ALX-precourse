#ifndef USER_H
#define USER_H

#include <drogon/orm/Mapper.h>
#include <drogon/orm/Result.h>
#include <drogon/orm/DbClient.h>
#include <json/json.h>
#include <optional>
#include <string>
#include <vector>

// Forward declaration of the Role model to avoid circular dependency if needed.
// For now, assume a direct mapping or handle via services.
namespace drogon_model { namespace auth_system { class Role; } }

namespace drogon_model {
namespace auth_system {

class User : public drogon::orm::Result {
public:
    struct primary_key_type
    {
        using type = int64_t;
        std::vector<type> operator()(const User& c) const { return {c.id()}; }
    };
    static const std::string &tableName() { return tableName_; }
    static const std::vector<std::string> &primaryKeyName() { return primaryKeyName_; }
    static const std::map<std::string, bool> &getTableColumns() { return tableColumns_; }

    User(const drogon::orm::Result &r) : drogon::orm::Result(r) {}
    User(const Json::Value &pJson = Json::Value());
    User(const std::map<std::string, std::any> &pMas, const std::vector<std::string> &pAttrs = {});

    int64_t id() const { return getValueOf<int64_t>("id"); }
    void setId(int64_t id) { setValueOf("id", id); }

    const std::string &username() const { return getValueOf<const std::string &>("username"); }
    void setUsername(const std::string &username) { setValueOf("username", username); }

    const std::string &email() const { return getValueOf<const std::string &>("email"); }
    void setEmail(const std::string &email) { setValueOf("email", email); }

    const std::string &passwordHash() const { return getValueOf<const std::string &>("password_hash"); }
    void setPasswordHash(const std::string &passwordHash) { setValueOf("password_hash", passwordHash); }

    const trantor::Date &createdAt() const { return getValueOf<const trantor::Date &>("created_at"); }
    void setCreatedAt(const trantor::Date &createdAt) { setValueOf("created_at", createdAt); }

    const trantor::Date &updatedAt() const { return getValueOf<const trantor::Date &>("updated_at"); }
    void setUpdatedAt(const trantor::Date &updatedAt) { setValueOf("updated_at", updatedAt); }

    bool enabled() const { return getValueOf<bool>("enabled"); }
    void setEnabled(bool enabled) { setValueOf("enabled", enabled); }

    Json::Value toJson() const;

    // Helper to fetch roles (not part of direct ORM mapping, but useful)
    std::vector<drogon_model::auth_system::Role> getRoles(drogon::orm::DbClientPtr dbClient) const;

private:
    static const std::string tableName_;
    static const std::vector<std::string> primaryKeyName_;
    static const std::map<std::string, bool> tableColumns_;
};

using UserMapper = drogon::orm::Mapper<User>;

} // namespace auth_system
} // namespace drogon_model

#endif // USER_H
```