#pragma once

#include <drogon/drogon.h>
#include <drogon/orm/Mapper.h>
#include "models/User.h"
#include <optional>
#include <vector>

namespace repositories {

class UserRepository {
public:
    explicit UserRepository(drogon::orm::DbClientPtr dbClient);

    // CRUD operations
    std::optional<models::User> findById(long long id);
    std::optional<models::User> findByUsername(const std::string& username);
    std::optional<models::User> findByEmail(const std::string& email);
    std::vector<models::User> findAll();
    long long create(const models::User& user); // Returns the ID of the new user
    bool update(const models::User& user);
    bool remove(long long id);

private:
    drogon::orm::DbClientPtr dbClient_;
};

} // namespace repositories