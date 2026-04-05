```cpp
#pragma once
#include <drogon/orm/Mapper.h>
#include <drogon/orm/Result.h>
#include <drogon/orm/Row.h>
#include <drogon/orm/Field.h>
#include <drogon/orm/SqlBinder.h>
#ifdef __cpp_impl_coroutine
#include <drogon/orm/CoroMapper.h>
#endif
#include <trantor/utils/Date.h>
#include <trantor/utils/Logger.h>
#include <json/json.h>
#include <string>
#include <memory>
#include <vector>
#include <tuple>
#include <stdint.h>
#include <optional>

namespace drogon
{
namespace orm
{
class DbClient;
class Transaction;
}
}
namespace TaskManager
{
class Tag;
using TagPtr = std::shared_ptr<Tag>;
using ConstTagPtr = std::shared_ptr<const Tag>;
}

namespace drogon::orm
{
    template<>
    const std::string &
    modelTableName<TaskManager::Tag>();
    template<>
    const std::vector<std::string> &
    modelPrimaryKeys<TaskManager::Tag>();
    template<>
    const std::string &
    modelPrimKeyName<TaskManager::Tag>();
    template<>
    const std::vector<bool> &
    modelIsAutoInc<TaskManager::Tag>();
    template<>
    const std::vector<bool> &
    modelIsNullable<TaskManager::Tag>();
    template<>
    const std::unordered_map<std::string, size_t> &
    modelColumnMap<TaskManager::Tag>();
    template<>
    void set<TaskManager::Tag>(const Field &field, TaskManager::Tag &obj);
    template<>
    std::string get<TaskManager::Tag>(const TaskManager::Tag &obj, const std::string &fieldName);
} // namespace drogon::orm
namespace TaskManager
{

class Tag
{
  public:
    struct primary_key
    {
        int32_t id;
        operator int32_t() const { return id; }
        primary_key(const drogon::orm::Row &r) : id(r["id"].as<int32_t>()) {}
        primary_key(const Json::Value &json) : id(json["id"].asInt()) {}
        primary_key(const std::map<std::string, std::string> &m) : id(std::stoi(m.at("id"))) {}
    };

  public:
    Tag(const drogon::orm::Row &r,
        const std::vector<std::string> &fields = {});
    Tag(const primary_key &key);
    Tag(int32_t pkey, const drogon::orm::DbClientPtr &client = nullptr);
    Tag(const primary_key &key, const drogon::orm::DbClientPtr &client = nullptr);
    Tag(const Json::Value &pJson,
        const std::vector<std::string> &fields = {});
    Tag(const std::map<std::string, std::string> &pMas,
        const std::vector<std::string> &fields = {});
    Tag(const drogon::orm::DbClientPtr &client);
    Tag(const Tag &other);
    static const std::string &tableName();
    static const std::vector<std::string> &primaryKeys();
    static const std::string &primaryKeyName();
    static const std::vector<bool> &isAutoInc();
    static const std::vector<bool> &isNullable();
    static const std::unordered_map<std::string, size_t> &columnMap();

    const int32_t &getId() const;
    void setId(const int32_t &pId);
    const drogon::orm::Field &getIdField() const;

    const std::string &getName() const;
    void setName(const std::string &pName);
    void setName(std::string &&pName);
    const drogon::orm::Field &getNameField() const;

    const trantor::Date &getCreatedAt() const;
    void setCreatedAt(const trantor::Date &pCreatedAt);
    const drogon::orm::Field &getCreatedAtField() const;

    const trantor::Date &getUpdatedAt() const;
    void setUpdatedAt(const trantor::Date &pUpdatedAt);
    const drogon::orm::Field &getUpdatedAtField() const;

    void update(const drogon::orm::DbClientPtr &client = nullptr);
    void insert(const drogon::orm::DbClientPtr &client = nullptr);
    void save(const drogon::orm::DbClientPtr &client = nullptr);
    void destroy(const drogon::orm::DbClientPtr &client = nullptr);
    static void update(const Json::Value &pJson,
                       const drogon::orm::DbClientPtr &client = nullptr);
    static void insert(const Json::Value &pJson,
                       const drogon::orm::DbClientPtr &client = nullptr);
    static void save(const Json::Value &pJson,
                     const drogon::orm::DbClientPtr &client = nullptr);
    static void destroy(const Json::Value &pJson,
                        const drogon::orm::DbClientPtr &client = nullptr);
    void update(const drogon::orm::TransactionPtr &transaction);
    void insert(const drogon::orm::TransactionPtr &transaction);
    void save(const drogon::orm::TransactionPtr &transaction);
    void destroy(const drogon::orm::TransactionPtr &transaction);

    Json::Value toJson() const;

    static TagPtr fromJson(const Json::Value &pJson);
    static ConstTagPtr fromJson(const Json::Value &pJson);

  private:
    friend drogon::orm::Mapper<Tag>;
    friend drogon::orm::CoroutineMapper<Tag>;
    static const std::vector<std::string> _colNames;
    static const std::vector<std::string> _colPrimaryKeys;
    static const std::vector<bool> _colIsAutoInc;
    static const std::vector<bool> _colIsNullable;
    static const std::unordered_map<std::string, size_t> _colNameToIdxMap;
    std::string _id;
    int32_t _id_ = 0;
    bool _idIsSet = false;
    std::string _name;
    bool _nameIsSet = false;
    trantor::Date _createdAt;
    bool _createdAtIsSet = false;
    trantor::Date _updatedAt;
    bool _updatedAtIsSet = false;
};
} // namespace TaskManager
```