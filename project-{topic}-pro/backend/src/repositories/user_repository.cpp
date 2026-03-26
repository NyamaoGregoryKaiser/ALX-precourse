#include "user_repository.h"
#include <pqxx/transaction>

std::optional<User> UserRepository::create(User& user) {
    try {
        pqxx::connection C = get_connection();
        pqxx::work W(C);

        std::string sql = "INSERT INTO users (username, email, password_hash, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;";
        pqxx::result R = W.exec_params(sql,
            user.username,
            user.email,
            user.password_hash,
            User::role_to_string(user.role),
            user.created_at,
            user.updated_at
        );

        W.commit();

        if (!R.empty()) {
            user.id = R[0][0].as<long long>();
            return user;
        }
        return std::nullopt;
    } catch (const pqxx::sql_error& e) {
        spdlog::error("SQL error in UserRepository::create: {}", e.what());
        throw ApiException(Pistache::Http::Code::Bad_Request, "Database error creating user", e.what());
    } catch (const std::exception& e) {
        spdlog::error("Error in UserRepository::create: {}", e.what());
        throw;
    }
}

std::optional<User> UserRepository::find_by_id(long long id) {
    try {
        pqxx::connection C = get_connection();
        pqxx::nontransaction N(C);

        pqxx::result R = N.exec_params("SELECT id, username, email, password_hash, role, created_at, updated_at FROM users WHERE id = $1;", id);

        if (!R.empty()) {
            return User(
                R[0][0].as<long long>(),
                R[0][1].as<std::string>(),
                R[0][2].as<std::string>(),
                R[0][3].as<std::string>(),
                User::string_to_role(R[0][4].as<std::string>()),
                R[0][5].as<std::time_t>(),
                R[0][6].as<std::time_t>()
            );
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        spdlog::error("Error in UserRepository::find_by_id: {}", e.what());
        throw;
    }
}

std::optional<User> UserRepository::find_by_email(const std::string& email) {
    try {
        pqxx::connection C = get_connection();
        pqxx::nontransaction N(C);

        pqxx::result R = N.exec_params("SELECT id, username, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1;", email);

        if (!R.empty()) {
            return User(
                R[0][0].as<long long>(),
                R[0][1].as<std::string>(),
                R[0][2].as<std::string>(),
                R[0][3].as<std::string>(),
                User::string_to_role(R[0][4].as<std::string>()),
                R[0][5].as<std::time_t>(),
                R[0][6].as<std::time_t>()
            );
        }
        return std::nullopt;
    } catch (const std::exception& e) {
        spdlog::error("Error in UserRepository::find_by_email: {}", e.what());
        throw;
    }
}

std::vector<User> UserRepository::find_all(int limit, int offset) {
    std::vector<User> users;
    try {
        pqxx::connection C = get_connection();
        pqxx::nontransaction N(C);

        pqxx::result R = N.exec_params("SELECT id, username, email, password_hash, role, created_at, updated_at FROM users ORDER BY id LIMIT $1 OFFSET $2;", limit, offset);

        for (const auto& row : R) {
            users.emplace_back(
                row[0].as<long long>(),
                row[1].as<std::string>(),
                row[2].as<std::string>(),
                row[3].as<std::string>(),
                User::string_to_role(row[4].as<std::string>()),
                row[5].as<std::time_t>(),
                row[6].as<std::time_t>()
            );
        }
    } catch (const std::exception& e) {
        spdlog::error("Error in UserRepository::find_all: {}", e.what());
        throw;
    }
    return users;
}

bool UserRepository::update(const User& user) {
    if (!user.id) {
        spdlog::error("Attempted to update user without an ID.");
        return false;
    }
    try {
        pqxx::connection C = get_connection();
        pqxx::work W(C);

        std::string sql = "UPDATE users SET username = $1, email = $2, password_hash = $3, role = $4, updated_at = $5 WHERE id = $6;";
        pqxx::result R = W.exec_params(sql,
            user.username,
            user.email,
            user.password_hash,
            User::role_to_string(user.role),
            user.updated_at,
            user.id.value()
        );

        W.commit();
        return R.affected_rows() == 1;
    } catch (const pqxx::sql_error& e) {
        spdlog::error("SQL error in UserRepository::update: {}", e.what());
        throw ApiException(Pistache::Http::Code::Bad_Request, "Database error updating user", e.what());
    } catch (const std::exception& e) {
        spdlog::error("Error in UserRepository::update: {}", e.what());
        throw;
    }
}

bool UserRepository::remove(long long id) {
    try {
        pqxx::connection C = get_connection();
        pqxx::work W(C);

        pqxx::result R = W.exec_params("DELETE FROM users WHERE id = $1;", id);

        W.commit();
        return R.affected_rows() == 1;
    } catch (const std::exception& e) {
        spdlog::error("Error in UserRepository::remove: {}", e.what());
        throw;
    }
}

long long UserRepository::count() {
    try {
        pqxx::connection C = get_connection();
        pqxx::nontransaction N(C);
        pqxx::result R = N.exec("SELECT COUNT(*) FROM users;");
        if (!R.empty()) {
            return R[0][0].as<long long>();
        }
        return 0;
    } catch (const std::exception& e) {
        spdlog::error("Error in UserRepository::count: {}", e.what());
        throw;
    }
}