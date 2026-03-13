#ifndef CMS_USER_REPOSITORY_HPP
#define CMS_USER_REPOSITORY_HPP

#include <string>
#include <vector>
#include <optional>
#include <chrono>
#include <pqxx/pqxx>
#include "db_connection.hpp"
#include "../models/user.hpp"
#include "../common/logger.hpp"
#include "../common/uuid.hpp"
#include "../common/error.hpp"

namespace cms::database {

class UserRepository {
public:
    UserRepository() = default;

    std::optional<cms::models::User> find_by_id(const std::string& id) {
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::nontransaction N(*conn);
        std::stringstream ss;
        ss << "SELECT id, username, email, password_hash, role, created_at, updated_at FROM users WHERE id = " << N.quote(id);
        
        pqxx::result R = N.exec(ss.str());

        if (R.empty()) {
            return std::nullopt;
        }
        return row_to_user(R[0]);
    }

    std::optional<cms::models::User> find_by_username(const std::string& username) {
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::nontransaction N(*conn);
        std::stringstream ss;
        ss << "SELECT id, username, email, password_hash, role, created_at, updated_at FROM users WHERE username = " << N.quote(username);
        
        pqxx::result R = N.exec(ss.str());

        if (R.empty()) {
            return std::nullopt;
        }
        return row_to_user(R[0]);
    }

    std::optional<cms::models::User> find_by_email(const std::string& email) {
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::nontransaction N(*conn);
        std::stringstream ss;
        ss << "SELECT id, username, email, password_hash, role, created_at, updated_at FROM users WHERE email = " << N.quote(email);
        
        pqxx::result R = N.exec(ss.str());

        if (R.empty()) {
            return std::nullopt;
        }
        return row_to_user(R[0]);
    }

    std::vector<cms::models::User> find_all(int limit, int offset) {
        std::vector<cms::models::User> users;
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::nontransaction N(*conn);
        
        std::stringstream ss;
        ss << "SELECT id, username, email, password_hash, role, created_at, updated_at FROM users "
           << "ORDER BY created_at DESC LIMIT " << N.quote(limit) << " OFFSET " << N.quote(offset);

        pqxx::result R = N.exec(ss.str());

        for (const auto& row : R) {
            users.push_back(row_to_user(row));
        }
        return users;
    }

    cms::models::User create(const cms::models::User& user) {
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::work W(*conn);
        
        // Check for existing username or email before inserting
        if (find_by_username(user.username)) {
            throw cms::common::ConflictException("Username already exists");
        }
        if (find_by_email(user.email)) {
            throw cms::common::ConflictException("Email already exists");
        }

        std::stringstream ss;
        ss << "INSERT INTO users (username, email, password_hash, role) VALUES ("
           << W.quote(user.username) << ", "
           << W.quote(user.email) << ", "
           << W.quote(user.password_hash) << ", "
           << W.quote(cms::models::user_role_to_string(user.role))
           << ") RETURNING id, username, email, password_hash, role, created_at, updated_at";
        
        pqxx::result R = W.exec(ss.str());
        W.commit();
        
        return row_to_user(R[0]);
    }

    std::optional<cms::models::User> update(const std::string& id, const cms::models::User::UpdateFields& updates) {
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::work W(*conn);
        
        std::string query_str = "UPDATE users SET ";
        bool first = true;

        if (updates.username) {
            if (!first) query_str += ", ";
            query_str += "username = " + W.quote(*updates.username);
            first = false;
        }
        if (updates.email) {
            if (!first) query_str += ", ";
            query_str += "email = " + W.quote(*updates.email);
            first = false;
        }
        if (updates.password) {
            if (!first) query_str += ", ";
            query_str += "password_hash = " + W.quote(*updates.password); // This should be the hashed password
            first = false;
        }
        if (updates.role) {
            if (!first) query_str += ", ";
            query_str += "role = " + W.quote(cms::models::user_role_to_string(*updates.role));
            first = false;
        }
        
        query_str += " WHERE id = " + W.quote(id) + " RETURNING id, username, email, password_hash, role, created_at, updated_at";
        
        if (first) { // No fields to update
            return find_by_id(id); // Return existing user if no fields specified
        }

        pqxx::result R = W.exec(query_str);
        W.commit();

        if (R.empty()) {
            return std::nullopt; // User not found
        }
        return row_to_user(R[0]);
    }

    bool remove(const std::string& id) {
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::work W(*conn);
        std::stringstream ss;
        ss << "DELETE FROM users WHERE id = " << W.quote(id);
        pqxx::result R = W.exec(ss.str());
        W.commit();
        return R.affected_rows() > 0;
    }

private:
    cms::models::User row_to_user(const pqxx::row& row) {
        cms::models::User user;
        user.id = row["id"].as<std::string>();
        user.username = row["username"].as<std::string>();
        user.email = row["email"].as<std::string>();
        user.password_hash = row["password_hash"].as<std::string>();
        user.role = cms::models::string_to_user_role(row["role"].as<std::string>());
        user.created_at = row["created_at"].as<std::chrono::system_clock::time_point>();
        user.updated_at = row["updated_at"].as<std::chrono::system_clock::time_point>();
        return user;
    }
};

} // namespace cms::database

#endif // CMS_USER_REPOSITORY_HPP
```