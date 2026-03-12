```cpp
#ifndef PAYMENT_PROCESSOR_USER_REPOSITORY_HPP
#define PAYMENT_PROCESSOR_USER_REPOSITORY_HPP

#include "models/User.hpp"
#include <optional>
#include <vector>
#include <memory>
#include <pqxx/pqxx>

class UserRepository {
public:
    UserRepository() = default;

    std::optional<User> findById(long id);
    std::optional<User> findByUsername(const std::string& username);
    std::optional<User> findByEmail(const std::string& email);
    User create(const User& user);
    User update(const User& user);
    void deleteById(long id);
    std::vector<User> findAll();

private:
    std::unique_ptr<pqxx::connection> getConnection();
    User mapRowToUser(const pqxx::row& row);
};

#endif // PAYMENT_PROCESSOR_USER_REPOSITORY_HPP
```