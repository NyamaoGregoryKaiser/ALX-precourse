#include "UserService.h"
#include "../models/User.h"
#include "../models/Role.h"
#include "../utils/StringUtil.h"
#include <drogon/orm/Exception.h>
#include <drogon/drogon.h> // For LOG_INFO, LOG_ERROR

using namespace drogon_model::auth_system;

UserService::UserService(drogon::orm::DbClientPtr dbClient)
    : dbClient_(dbClient) {}

drogon::AsyncTask<std::optional<Json::Value>> UserService::getUserById(int64_t userId) {
    try {
        UserMapper userMapper(dbClient_);
        auto user = co_await userMapper.findByPrimaryKey(userId);
        if (user.has_value()) {
            LOG_DEBUG << "User found with ID: " << userId;
            co_return user->toJson();
        } else {
            LOG_DEBUG << "User not found with ID: " << userId;
            co_return std::nullopt;
        }
    } catch (const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Database error retrieving user by ID " << userId << ": " << e.what();
    } catch (const std::exception &e) {
        LOG_ERROR << "General error retrieving user by ID " << userId << ": " << e.what();
    }
    co_return std::nullopt;
}

drogon::AsyncTask<std::vector<Json::Value>> UserService::getAllUsers() {
    std::vector<Json::Value> usersJson;
    try {
        UserMapper userMapper(dbClient_);
        auto users = co_await userMapper.findAll();
        for (const auto& user : users) {
            usersJson.push_back(user.toJson());
        }
        LOG_DEBUG << "Retrieved " << usersJson.size() << " users.";
    } catch (const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Database error retrieving all users: " << e.what();
    } catch (const std::exception &e) {
        LOG_ERROR << "General error retrieving all users: " << e.what();
    }
    co_return usersJson;
}

drogon::AsyncTask<std::optional<Json::Value>> UserService::updateUser(int64_t userId, const Json::Value& userData) {
    try {
        UserMapper userMapper(dbClient_);
        auto userOpt = co_await userMapper.findByPrimaryKey(userId);

        if (!userOpt.has_value()) {
            LOG_WARN << "Update failed: User with ID " << userId << " not found.";
            co_return std::nullopt;
        }

        User user = userOpt.value();
        bool changed = false;

        if (userData.isMember("username") && userData["username"].isString()) {
            std::string newUsername = StringUtil::trim(userData["username"].asString());
            if (newUsername != user.username()) {
                // Check for duplicate username
                auto existingUser = co_await userMapper.findOne(drogon::orm::Criteria("username", drogon::orm::CompareOperator::EQ, newUsername));
                if (existingUser.has_value() && existingUser->id() != user.id()) {
                    LOG_WARN << "Update failed: Username '" << newUsername << "' already taken.";
                    co_return std::nullopt; // Username already taken by another user
                }
                user.setUsername(newUsername);
                changed = true;
            }
        }
        if (userData.isMember("email") && userData["email"].isString()) {
            std::string newEmail = StringUtil::trim(userData["email"].asString());
            if (newEmail != user.email()) {
                // Check for duplicate email
                auto existingUser = co_await userMapper.findOne(drogon::orm::Criteria("email", drogon::orm::CompareOperator::EQ, newEmail));
                if (existingUser.has_value() && existingUser->id() != user.id()) {
                    LOG_WARN << "Update failed: Email '" << newEmail << "' already taken.";
                    co_return std::nullopt; // Email already taken by another user
                }
                user.setEmail(newEmail);
                changed = true;
            }
        }
        if (userData.isMember("enabled") && userData["enabled"].isBool()) {
            if (userData["enabled"].asBool() != user.enabled()) {
                user.setEnabled(userData["enabled"].asBool());
                changed = true;
            }
        }

        if (changed) {
            user.setUpdatedAt(trantor::Date::now());
            User updatedUser = co_await userMapper.update(user);
            LOG_INFO << "User with ID " << userId << " updated successfully.";
            co_return updatedUser.toJson();
        } else {
            LOG_INFO << "No changes detected for user with ID " << userId << ".";
            co_return user.toJson(); // Return current state if no changes
        }

    } catch (const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Database error updating user " << userId << ": " << e.what();
    } catch (const std::exception &e) {
        LOG_ERROR << "General error updating user " << userId << ": " << e.what();
    }
    co_return std::nullopt;
}

drogon::AsyncTask<bool> UserService::deleteUser(int64_t userId) {
    try {
        UserMapper userMapper(dbClient_);
        // First, check if the user exists
        auto userOpt = co_await userMapper.findByPrimaryKey(userId);
        if (!userOpt.has_value()) {
            LOG_WARN << "Delete failed: User with ID " << userId << " not found.";
            co_return false;
        }

        // Delete associated user_roles entries first
        co_await dbClient_->execSqlCoro("DELETE FROM user_roles WHERE user_id = $1", userId);
        LOG_DEBUG << "Deleted user_roles for user ID: " << userId;

        // Delete associated sessions
        co_await dbClient_->execSqlCoro("DELETE FROM sessions WHERE user_id = $1", userId);
        LOG_DEBUG << "Deleted sessions for user ID: " << userId;

        // Then delete the user
        size_t deletedRows = co_await userMapper.deleteByPrimaryKey(userId);
        if (deletedRows > 0) {
            LOG_INFO << "User with ID " << userId << " deleted successfully.";
            co_return true;
        }
    } catch (const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Database error deleting user " << userId << ": " << e.what();
    } catch (const std::exception &e) {
        LOG_ERROR << "General error deleting user " << userId << ": " << e.what();
    }
    co_return false;
}

drogon::AsyncTask<bool> UserService::assignRolesToUser(int64_t userId, const std::vector<std::string>& roleNames) {
    try {
        // Verify user exists
        UserMapper userMapper(dbClient_);
        auto userOpt = co_await userMapper.findByPrimaryKey(userId);
        if (!userOpt.has_value()) {
            LOG_WARN << "Assign roles failed: User with ID " << userId << " not found.";
            co_return false;
        }

        RoleMapper roleMapper(dbClient_);
        // Fetch all role IDs for the given names
        std::vector<int> roleIdsToAssign;
        for (const auto& roleName : roleNames) {
            auto roles = co_await roleMapper.findBy(drogon::orm::Criteria("name", drogon::orm::CompareOperator::EQ, roleName));
            if (!roles.empty()) {
                roleIdsToAssign.push_back(roles[0].id());
            } else {
                LOG_WARN << "Role '" << roleName << "' not found, skipping assignment.";
            }
        }

        if (roleIdsToAssign.empty() && !roleNames.empty()) {
            LOG_WARN << "No valid roles found to assign for user ID: " << userId;
            co_return false; // No valid roles to assign
        }

        // Use a transaction for atomicity
        auto transaction = co_await dbClient_->newTransactionCoro();

        // Clear existing roles for the user (or implement additive/subtractive logic)
        co_await transaction->execSqlCoro("DELETE FROM user_roles WHERE user_id = $1", userId);

        // Insert new roles
        for (int roleId : roleIdsToAssign) {
            co_await transaction->execSqlCoro("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
                                            userId, roleId);
        }
        co_await transaction->commitCoro();

        LOG_INFO << "Roles assigned to user " << userId << " successfully.";
        co_return true;

    } catch (const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Database error assigning roles to user " << userId << ": " << e.what();
    } catch (const std::exception &e) {
        LOG_ERROR << "General error assigning roles to user " << userId << ": " << e.what();
    }
    co_return false;
}

drogon::AsyncTask<std::vector<std::string>> UserService::getUserRoles(int64_t userId) {
    std::vector<std::string> roleNames;
    try {
        UserMapper userMapper(dbClient_);
        auto userOpt = co_await userMapper.findByPrimaryKey(userId);
        if (!userOpt.has_value()) {
            LOG_WARN << "User " << userId << " not found, cannot get roles.";
            co_return roleNames;
        }
        User user = userOpt.value();
        std::vector<drogon_model::auth_system::Role> roles = user.getRoles(dbClient_);
        for (const auto& role : roles) {
            roleNames.push_back(role.name());
        }
        LOG_DEBUG << "Retrieved roles for user " << userId << ": " << roleNames.size();
    } catch (const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Database error getting roles for user " << userId << ": " << e.what();
    } catch (const std::exception &e) {
        LOG_ERROR << "General error getting roles for user " << userId << ": " << e.what();
    }
    co_return roleNames;
}
```