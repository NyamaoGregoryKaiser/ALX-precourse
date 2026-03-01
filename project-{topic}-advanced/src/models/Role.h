#ifndef ROLE_H
#define ROLE_H

#include <drogon/orm/Mapper.h>
#include <drogon/orm/Result.h>
#include <json/json.h>
#include <optional>
#include <string>
#include <vector>

namespace drogon_model {
namespace auth_system {

class Role : public drogon::orm::Result {
public:
    struct primary_key_type
    {
        using type = int;
        std::vector<type> operator()(const Role& c) const { return {c.id()}; }
    };
    static const std::string &tableName() { return tableName_; }
    static const std::vector<std::string> &primaryKeyName() { return primaryKeyName_; }
    static const std::map<std::string, bool> &getTableColumns() { return tableColumns_; }

    Role(const drogon::orm::Result &r) : drogon::orm::Result(r) {}
    Role(const Json::Value &pJson = Json::Value());
    Role(const std::map<std::string, std::any> &pMas, const std::vector<std::string> &pAttrs = {});

    int id() const { return getValueOf<int>("id"); }
    void setId(int id) { setValueOf("id", id); }

    const std::string &name() const { return getValueOf<const std::string &>("name"); }
    void setName(const std::string &name) { setValueOf("name", name); }

    const std::string &description() const { return getValueOf<const std::string &>("description"); }
    void setDescription(const std::string &description) { setValueOf("description", description); }

    Json::Value toJson() const;

private:
    static const std::string tableName_;
    static const std::vector<std::string> primaryKeyName_;
    static const std::map<std::string, bool> tableColumns_;
};

using RoleMapper = drogon::orm::Mapper<Role>;

} // namespace auth_system
} // namespace drogon_model

#endif // ROLE_H
```