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
class User;
using UserPtr = std::shared_ptr<User>;
using ConstUserPtr = std::shared_ptr<const User>;
}

namespace drogon::orm
{
    // For User
    template<>
    const std::string &
    modelTableName<TaskManager::User>();
    template<>
    const std::vector<std::string> &
    modelPrimaryKeys<TaskManager::User>();
    template<>
    const std::string &
    modelPrimKeyName<TaskManager::User>();
    template<>
    const std::vector<bool> &
    modelIsAutoInc<TaskManager::User>();
    template<>
    const std::vector<bool> &
    modelIs
    Nullable<TaskManager::User>();
    template<>
    const std::unordered_map<std::string, size_t> &
    modelColumnMap<TaskManager::User>();
    template<>
    void set       <TaskManager::User>(const Field &field, TaskManager::User &obj);
    template<>
    std::string get<TaskManager::User>(const TaskManager::User &obj, const std::string &fieldName);
} // namespace drogon::orm
namespace TaskManager
{

class User
{
  public:
    struct primary_key
    {
        int32_t id;
        operator int32_t() const { return id; }
        /**
         * @brief Construct a new primary_key object from a row
         *
         * @param r the row object
         */
        primary_key(const drogon::orm::Row &r) : id(r["id"].as<int32_t>()) {}
        /**
         * @brief Construct a new primary_key object from a json object
         *
         * @param json the json object
         */
        primary_key(const Json::Value &json) : id(json["id"].asInt()) {}
        /**
         * @brief Construct a new primary_key object from a map<string,string> object
         *
         * @param m the map object
         */
        primary_key(const std::map<std::string, std::string> &m) : id(std::stoi(m.at("id"))) {}
    };

  public:
    User(const drogon::orm::Row &r,
         const std::vector<std::string> &fields = {});
    /// Constructor for an object with a primary key
    User(const primary_key &key);
    /// Constructor with only the primary key column,
    /// no data from the database is loaded.
    User(int32_t pkey, const drogon::orm::DbClientPtr &client = nullptr);
    User(const primary_key &key, const drogon::orm::DbClientPtr &client = nullptr);
    User(const Json::Value &pJson,
         const std::vector<std::string> &fields = {});
    User(const std::map<std::string, std::string> &pMas,
         const std::vector<std::string> &fields = {});
    // A db client must be provided for some methods to work
    User(const drogon::orm::DbClientPtr &client);
    User(const User &other);
    static const std::string &tableName();
    static const std::vector<std::string> &primaryKeys();
    static const std::string &primaryKeyName();
    static const std::vector<bool> &isAutoInc();
    static const std::vector<bool> &isNullable();
    static const std::unordered_map<std::string, size_t> &columnMap();

    /**
     * @brief Get the value of the column id, returns
     * empty if the column has not been set.
     */
    const int32_t &getId() const;
    void setId(const int32_t &pId);
    const drogon::orm::Field &getIdField() const;

    /**
     * @brief Get the value of the column username, returns
     * empty if the column has not been set.
     */
    const std::string &getUsername() const;
    void setUsername(const std::string &pUsername);
    void setUsername(std::string &&pUsername);
    const drogon::orm::Field &getUsernameField() const;

    /**
     * @brief Get the value of the column email, returns
     * empty if the column has not been set.
     */
    const std::string &getEmail() const;
    void setEmail(const std::string &pEmail);
    void setEmail(std::string &&pEmail);
    const drogon::orm::Field &getEmailField() const;

    /**
     * @brief Get the value of the column password_hash, returns
     * empty if the column has not been set.
     */
    const std::string &getPasswordHash() const;
    void setPasswordHash(const std::string &pPasswordHash);
    void setPasswordHash(std::string &&pPasswordHash);
    const drogon::orm::Field &getPasswordHashField() const;

    /**
     * @brief Get the value of the column role, returns
     * empty if the column has not been set.
     */
    const std::string &getRole() const;
    void setRole(const std::string &pRole);
    void setRole(std::string &&pRole);
    const drogon::orm::Field &getRoleField() const;

    /**
     * @brief Get the value of the column created_at, returns
     * empty if the column has not been set.
     */
    const trantor::Date &getCreatedAt() const;
    void setCreatedAt(const trantor::Date &pCreatedAt);
    const drogon::orm::Field &getCreatedAtField() const;

    /**
     * @brief Get the value of the column updated_at, returns
     * empty if the column has not been set.
     */
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
    //
    void update(const drogon::orm::TransactionPtr &transaction);
    void insert(const drogon::orm::TransactionPtr &transaction);
    void save(const drogon::orm::TransactionPtr &transaction);
    void destroy(const drogon::orm::TransactionPtr &transaction);

    Json::Value toJson() const;

    static UserPtr fromJson(const Json::Value &pJson);
    static ConstUserPtr fromJson(const Json::Value &pJson);

  private:
    friend drogon::orm::Mapper<User>;
    friend drogon::orm::CoroutineMapper<User>;
    static const std::vector<std::string> _colNames;
    static const std::vector<std::string> _colPrimaryKeys;
    static const std::vector<bool> _colIsAutoInc;
    static const std::vector<bool> _colIsNullable;
    static const std::unordered_map<std::string, size_t> _colNameToIdxMap;
    std::string _id;
    int32_t _id_ = 0;
    bool _idIsSet = false;
    std::string _username;
    bool _usernameIsSet = false;
    std::string _email;
    bool _emailIsSet = false;
    std::string _passwordHash;
    bool _passwordHashIsSet = false;
    std::string _role;
    bool _roleIsSet = false;
    trantor::Date _createdAt;
    bool _createdAtIsSet = false;
    trantor::Date _updatedAt;
    bool _updatedAtIsSet = false;
};
} // namespace TaskManager
```