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
class Task;
using TaskPtr = std::shared_ptr<Task>;
using ConstTaskPtr = std::shared_ptr<const Task>;
}

namespace drogon::orm
{
    template<>
    const std::string &
    modelTableName<TaskManager::Task>();
    template<>
    const std::vector<std::string> &
    modelPrimaryKeys<TaskManager::Task>();
    template<>
    const std::string &
    modelPrimKeyName<TaskManager::Task>();
    template<>
    const std::vector<bool> &
    modelIsAutoInc<TaskManager::Task>();
    template<>
    const std::vector<bool> &
    modelIsNullable<TaskManager::Task>();
    template<>
    const std::unordered_map<std::string, size_t> &
    modelColumnMap<TaskManager::Task>();
    template<>
    void set<TaskManager::Task>(const Field &field, TaskManager::Task &obj);
    template<>
    std::string get<TaskManager::Task>(const TaskManager::Task &obj, const std::string &fieldName);
} // namespace drogon::orm
namespace TaskManager
{

class Task
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
    Task(const drogon::orm::Row &r,
         const std::vector<std::string> &fields = {});
    Task(const primary_key &key);
    Task(int32_t pkey, const drogon::orm::DbClientPtr &client = nullptr);
    Task(const primary_key &key, const drogon::orm::DbClientPtr &client = nullptr);
    Task(const Json::Value &pJson,
         const std::vector<std::string> &fields = {});
    Task(const std::map<std::string, std::string> &pMas,
         const std::vector<std::string> &fields = {});
    Task(const drogon::orm::DbClientPtr &client);
    Task(const Task &other);
    static const std::string &tableName();
    static const std::vector<std::string> &primaryKeys();
    static const std::string &primaryKeyName();
    static const std::vector<bool> &isAutoInc();
    static const std::vector<bool> &isNullable();
    static const std::unordered_map<std::string, size_t> &columnMap();

    const int32_t &getId() const;
    void setId(const int32_t &pId);
    const drogon::orm::Field &getIdField() const;

    const int32_t &getProjectId() const;
    void setProjectId(const int32_t &pProjectId);
    const drogon::orm::Field &getProjectIdField() const;

    const std::string &getTitle() const;
    void setTitle(const std::string &pTitle);
    void setTitle(std::string &&pTitle);
    const drogon::orm::Field &getTitleField() const;

    const std::optional<std::string> &getDescription() const;
    void setDescription(const std::optional<std::string> &pDescription);
    void setDescription(std::optional<std::string> &&pDescription);
    const drogon::orm::Field &getDescriptionField() const;

    // Drogon models map enum types to std::string.
    // For proper type safety, service layer converts strings to enums and vice-versa.
    const std::string &getStatus() const; // Maps to task_status ENUM
    void setStatus(const std::string &pStatus);
    void setStatus(std::string &&pStatus);
    const drogon::orm::Field &getStatusField() const;

    const std::string &getPriority() const; // Maps to task_priority ENUM
    void setPriority(const std::string &pPriority);
    void setPriority(std::string &&pPriority);
    const drogon::orm::Field &getPriorityField() const;

    const std::optional<trantor::Date> &getDueDate() const;
    void setDueDate(const std::optional<trantor::Date> &pDueDate);
    void setDueDate(std::optional<trantor::Date> &&pDueDate);
    const drogon::orm::Field &getDueDateField() const;

    const std::optional<int32_t> &getAssignedTo() const;
    void setAssignedTo(const std::optional<int32_t> &pAssignedTo);
    void setAssignedTo(std::optional<int32_t> &&pAssignedTo);
    const drogon::orm::Field &getAssignedToField() const;

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

    static TaskPtr fromJson(const Json::Value &pJson);
    static ConstTaskPtr fromJson(const Json::Value &pJson);

  private:
    friend drogon::orm::Mapper<Task>;
    friend drogon::orm::CoroutineMapper<Task>;
    static const std::vector<std::string> _colNames;
    static const std::vector<std::string> _colPrimaryKeys;
    static const std::vector<bool> _colIsAutoInc;
    static const std::vector<bool> _colIsNullable;
    static const std::unordered_map<std::string, size_t> _colNameToIdxMap;
    std::string _id;
    int32_t _id_ = 0;
    bool _idIsSet = false;
    std::string _projectId;
    int32_t _projectId_ = 0;
    bool _projectIdIsSet = false;
    std::string _title;
    bool _titleIsSet = false;
    std::string _description;
    std::optional<std::string> _descriptionOptional;
    bool _descriptionIsSet = false;
    std::string _status;
    bool _statusIsSet = false;
    std::string _priority;
    bool _priorityIsSet = false;
    trantor::Date _dueDate;
    std::optional<trantor::Date> _dueDateOptional;
    bool _dueDateIsSet = false;
    std::string _assignedTo;
    std::optional<int32_t> _assignedToOptional;
    bool _assignedToIsSet = false;
    trantor::Date _createdAt;
    bool _createdAtIsSet = false;
    trantor::Date _updatedAt;
    bool _updatedAtIsSet = false;
};
} // namespace TaskManager
```