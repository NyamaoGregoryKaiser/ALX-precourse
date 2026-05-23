#ifndef USER_DAO_H
#define USER_DAO_H

#include "../models/User.h"
#include "DBManager.h"
#include <string>
#include <vector>
#include <optional>

class UserDAO {
public:
    UserDAO();
    
    std::optional<User> createUser(const User& user);
    std::optional<User> findUserById(const std::string& id);
    std::optional<User> findUserByUsername(const std::string& username);
    std::optional<User> findUserByEmail(const std::string& email);
    std::vector<User> findAllUsers(int limit = 100, int offset = 0);
    bool updateUser(const User& user);
    bool deleteUser(const std::string& id);

private:
    DBManager& _db_manager;
    User user_from_row(const pqxx::row& row); // Helper to convert DB row to User object
};

#endif // USER_DAO_H