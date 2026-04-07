```cpp
#include "user_repository.h"
#include <pqxx/except>

std::optional<User> UserRepository::createUser(const std::string& username, const std::string& email, const std::string& passwordHash) {
    return executeTransaction([&](pqxx::work& W) -> std::optional<User> {
        std::string new_id = generateUuid();
        auto now = std::chrono::system_clock::now();
        std::string now_str = toPgTimestamp(now);

        std::string query = R"(
            INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, username, email, password_hash, created_at, updated_at;
        )";
        pqxx::result R = W.exec_params(query,
                                       new_id, username, email, passwordHash, now_str, now_str);

        if (!R.empty()) {
            const pqxx::row& row = R[0];
            return User(row["id"].as<std::string>(),
                        row["username"].as<std::string>(),
                        row["email"].as<std::string>(),
                        row["password_hash"].as<std::string>(),
                        fromPgTimestamp(row["created_at"].as<std::string>()),
                        fromPgTimestamp(row["updated_at"].as<std::string>()));
        }
        return std::nullopt;
    });
}

std::optional<User> UserRepository::findById(const std::string& id) {
    return executeNontransaction([&](pqxx::nontransaction& N) -> std::optional<User> {
        std::string query = "SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE id = $1;";
        pqxx::result R = N.exec_params(query, id);

        if (!R.empty()) {
            const pqxx::row& row = R[0];
            return User(row["id"].as<std::string>(),
                        row["username"].as<std::string>(),
                        row["email"].as<std::string>(),
                        row["password_hash"].as<std::string>(),
                        fromPgTimestamp(row["created_at"].as<std::string>()),
                        fromPgTimestamp(row["updated_at"].as<std::string>()));
        }
        return std::nullopt;
    });
}

std::optional<User> UserRepository::findByUsername(const std::string& username) {
    return executeNontransaction([&](pqxx::nontransaction& N) -> std::optional<User> {
        std::string query = "SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE username = $1;";
        pqxx::result R = N.exec_params(query, username);

        if (!R.empty()) {
            const pqxx::row& row = R[0];
            return User(row["id"].as<std::string>(),
                        row["username"].as<std::string>(),
                        row["email"].as<std::string>(),
                        row["password_hash"].as<std::string>(),
                        fromPgTimestamp(row["created_at"].as<std::string>()),
                        fromPgTimestamp(row["updated_at"].as<std::string>()));
        }
        return std::nullopt;
    });
}

std::optional<User> UserRepository::findByEmail(const std::string& email) {
    return executeNontransaction([&](pqxx::nontransaction& N) -> std::optional<User> {
        std::string query = "SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE email = $1;";
        pqxx::result R = N.exec_params(query, email);

        if (!R.empty()) {
            const pqxx::row& row = R[0];
            return User(row["id"].as<std::string>(),
                        row["username"].as<std::string>(),
                        row["email"].as<std::string>(),
                        row["password_hash"].as<std::string>(),
                        fromPgTimestamp(row["created_at"].as<std::string>()),
                        fromPgTimestamp(row["updated_at"].as<std::string>()));
        }
        return std::nullopt;
    });
}

bool UserRepository::updateUser(const User& user) {
    return executeTransaction([&](pqxx::work& W) -> bool {
        auto now = std::chrono::system_clock::now();
        std::string now_str = toPgTimestamp(now);
        std::string query = R"(
            UPDATE users SET username = $1, email = $2, password_hash = $3, updated_at = $4
            WHERE id = $5;
        )";
        pqxx::result R = W.exec_params(query,
                                       user.username, user.email, user.passwordHash, now_str, user.id);
        return R.affected_rows() == 1;
    });
}

bool UserRepository::deleteUser(const std::string& id) {
    return executeTransaction([&](pqxx::work& W) -> bool {
        std::string query = "DELETE FROM users WHERE id = $1;";
        pqxx::result R = W.exec_params(query, id);
        return R.affected_rows() == 1;
    });
}
```