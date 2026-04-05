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
class TaskTag;
using TaskTagPtr = std::shared_ptr<TaskTag>;
using ConstTaskTagPtr = std::shared_ptr<const TaskTag>;
}

namespace drogon::orm
{
    template<>
    const std::string &
    modelTableName<TaskManager::TaskTag>();
    template<>
    const std::vector<std::string> &
    modelPrimaryKeys<TaskManager::TaskTag>();
    template<>
    const std::string &
    modelPrimKeyName<TaskManager::TaskTag>();
    template<>
    const std::vector<bool> &
    modelIsAutoInc<TaskManager::TaskTag>();
    template<>
    const std::vector<bool> &
    modelIsNullable<TaskManager::TaskTag>();
    template<>
    const std::unordered_map<std::string, size_t> &
    modelColumnMap<TaskManager::TaskTag>();
    template<>
    void set<TaskManager::TaskTag>(const Field &field, TaskManager::TaskTag &obj);
    template<>
    std::string get<TaskManager::TaskTag>(const TaskManager::TaskTag &obj, const std::string &fieldName);
} // namespace drogon::orm
namespace TaskManager
{

class TaskTag
{
  public:
    struct primary_key
    {
        int32_t taskId;
        int32_t tagId;
        bool operator==(const primary_key &other) const { return taskId == other.taskId && tagId == other.tagId; }
        operator std::tuple<int32_t,int32_t>() const { return std::make_tuple(taskId,tagId); }
        /**
         * @brief Construct a new primary_key object from a row
         *
         * @param r the row object
         */
        primary_key(const drogon::orm::Row &r) : taskId(r["task_id"].as<int32_t>()), tagId(r["tag_id"].as<int32_t>()) {}
        /**
         * @brief Construct a new primary_key object from a json object
         *
         * @param json the json object
         */
        primary_key(const Json::Value &json) : taskId(json["task_id"].asInt()), tagId(json["tag_id"].asInt()) {}
        /**
         * @brief Construct a new primary_key object from a map<string,string> object
         *
         * @param m the map object
         */
        primary_key(const std::map<std::string, std::string> &m) : taskId(std::stoi(m.at("task_id"))), tagId(std::stoi(m.at("tag_id"))) {}
    };

  public:
    TaskTag(const drogon::orm::Row &r,
            const std::vector<std::string> &fields = {});
    /// Constructor for an object with a primary key
    TaskTag(const primary_key &key);
    /// Constructor with only the primary key column,
    /// no data from the database is loaded.
    TaskTag(int32_t pTaskId, int32_t pTagId, const drogon::orm::DbClientPtr &client = nullptr);
    TaskTag(const primary_key &key, const drogon::orm::DbClientPtr &client = nullptr);
    TaskTag(const Json::Value &pJson,
            const std::vector<std::string> &fields = {});
    TaskTag(const std::map<std::string, std::string> &pMas,
            const std::vector<std::string> &fields = {});
    // A db client must be provided for some methods to work
    TaskTag(const drogon::orm::DbClientPtr &client);
    TaskTag(const TaskTag &other);
    static const std::string &tableName();
    static const std::vector<std::string> &primaryKeys();
    static const std::string &primaryKeyName();
    static const std::vector<bool> &isAutoInc();
    static const std::vector<bool> &isNullable();
    static const std::unordered_map<std::string, size_t> &columnMap();

    const int32_t &getTaskId() const;
    void setTaskId(const int32_t &pTaskId);
    const drogon::orm::Field &getTaskIdField() const;

    const int32_t &getTagId() const;
    void setTagId(const int32_t &pTagId);
    const drogon::orm::Field &getTagIdField() const;

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

    static TaskTagPtr fromJson(const Json::Value &pJson);
    static ConstTaskTagPtr fromJson(const Json::Value &pJson);

  private:
    friend drogon::orm::Mapper<TaskTag>;
    friend drogon::orm::CoroutineMapper<TaskTag>;
    static const std::vector<std::string> _colNames;
    static const std::vector<std::string> _colPrimaryKeys;
    static const std::vector<bool> _colIsAutoInc;
    static const std::vector<bool> _colIsNullable;
    static const std::unordered_map<std::string, size_t> _colNameToIdxMap;
    std::string _taskId;
    int32_t _taskId_ = 0;
    bool _taskIdIsSet = false;
    std::string _tagId;
    int32_t _tagId_ = 0;
    bool _tagIdIsSet = false;
};
} // namespace TaskManager
```