```cpp
#include "User.hpp"
#include "../logger/Logger.hpp"
#include "../database/Database.hpp" // For SQLiteException

#include <chrono>
#include <ctime>
#include <iomanip> // For std::put_time
#include <sstream> // For std::ostringstream
#include <stdexcept>
#include <optional>
#include <vector>

// Helper to get current timestamp string
std::string getCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_c = std::chrono::system_clock::to_time_t(now);
    std::tm* ptm = std::localtime(&now_c); // NOLINT(concurrency-tsan-resource-leak) - std::localtime is not thread-safe. For high concurrency, consider `std::gmtime_r` or `boost::local_time`.
    std::ostringstream oss;
    oss << std::put_time(ptm, "%Y-%m-%d %H:%M:%S");
    return oss.str();
}

User::User(int id, const std::string& username, const std::string& passwordHash, const std::string& email, const std::string& role,
           const std::string& createdAt, const std::string& updatedAt)
    : id(id), username(username), passwordHash(passwordHash), email(email), role(role),
      createdAt(createdAt.empty() ? getCurrentTimestamp() : createdAt),
      updatedAt(updatedAt.empty() ? getCurrentTimestamp() : updatedAt) {
    // Basic validation for role
    if (!(role == "user" || role == "admin")) {
        Logger::warn("User: Invalid role '{}' provided for user '{}'. Defaulting to 'user'.", role, username);
        this->role = "user";
    }
}

// Getters
int User::getId() const { return id; }
const std::string& User::getUsername() const { return username; }
const std::string& User::getPasswordHash() const { return passwordHash; }
const std::string& User::getEmail() const { return email; }
const std::string& User::getRole() const { return role; }
const std::string& User::getCreatedAt() const { return createdAt; }
const std::string& User::getUpdatedAt() const { return updatedAt; }

// Setters
void User::setUsername(const std::string& newUsername) { username = newUsername; updateTimestamp(); }
void User::setPasswordHash(const std::string& newPasswordHash) { passwordHash = newPasswordHash; updateTimestamp(); }
void User::setEmail(const std::string& newEmail) { email = newEmail; updateTimestamp(); }
void User::setRole(const std::string& newRole) {
    if (!(newRole == "user" || newRole == "admin")) {
        Logger::warn("User: Attempted to set invalid role '{}' for user '{}'. Role not changed.", newRole, username);
        throw std::runtime_error("Invalid role. Must be 'user' or 'admin'.");
    }
    role = newRole;
    updateTimestamp();
}

void User::updateTimestamp() {
    updatedAt = getCurrentTimestamp();
}

// Converts the User object to a JSON object.
nlohmann::json User::toJson() const {
    nlohmann::json j;
    j["id"] = id;
    j["username"] = username;
    j["password_hash"] = passwordHash; // In production, this should NOT be returned to clients
    j["email"] = email;
    j["role"] = role;
    j["created_at"] = createdAt;
    j["updated_at"] = updatedAt;
    return j;
}

// --- Static Database Operations ---

// Creates a new user in the database.
int User::create(Database& db, const User& user) {
    std::string query = "INSERT INTO users (username, password_hash, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);";
    auto stmt = db.prepare(query);
    stmt.bind(1, user.getUsername());
    stmt.bind(2, user.getPasswordHash());
    stmt.bind(3, user.getEmail());
    stmt.bind(4, user.getRole());
    stmt.bind(5, user.getCreatedAt());
    stmt.bind(6, user.getUpdatedAt());

    if (stmt.execute()) {
        Logger::debug("UserModel: Created user '{}'.", user.getUsername());
        return db.getLastInsertRowId();
    } else {
        Logger::error("UserModel: Failed to create user '{}'.", user.getUsername());
        throw std::runtime_error("Failed to create user.");
    }
}

// Finds a user by ID. Returns std::nullopt if not found.
std::optional<User> User::findById(Database& db, int id) {
    std::string query = "SELECT id, username, password_hash, email, role, created_at, updated_at FROM users WHERE id = ?;";
    auto stmt = db.prepare(query);
    stmt.bind(1, id);

    if (stmt.step()) {
        Logger::debug("UserModel: Found user with ID {}.", id);
        return User(stmt.getInt(0), stmt.getString(1), stmt.getString(2), stmt.getString(3),
                    stmt.getString(4), stmt.getString(5), stmt.getString(6));
    }
    Logger::debug("UserModel: User with ID {} not found.", id);
    return std::nullopt;
}

// Finds a user by username. Returns std::nullopt if not found.
std::optional<User> User::findByUsername(Database& db, const std::string& username) {
    std::string query = "SELECT id, username, password_hash, email, role, created_at, updated_at FROM users WHERE username = ?;";
    auto stmt = db.prepare(query);
    stmt.bind(1, username);

    if (stmt.step()) {
        Logger::debug("UserModel: Found user with username '{}'.", username);
        return User(stmt.getInt(0), stmt.getString(1), stmt.getString(2), stmt.getString(3),
                    stmt.getString(4), stmt.getString(5), stmt.getString(6));
    }
    Logger::debug("UserModel: User with username '{}' not found.", username);
    return std::nullopt;
}

// Finds a user by email. Returns std::nullopt if not found.
std::optional<User> User::findByEmail(Database& db, const std::string& email) {
    std::string query = "SELECT id, username, password_hash, email, role, created_at, updated_at FROM users WHERE email = ?;";
    auto stmt = db.prepare(query);
    stmt.bind(1, email);

    if (stmt.step()) {
        Logger::debug("UserModel: Found user with email '{}'.", email);
        return User(stmt.getInt(0), stmt.getString(1), stmt.getString(2), stmt.getString(3),
                    stmt.getString(4), stmt.getString(5), stmt.getString(6));
    }
    Logger::debug("UserModel: User with email '{}' not found.", email);
    return std::nullopt;
}

// Retrieves all users from the database.
std::vector<User> User::findAll(Database& db) {
    std::vector<User> users;
    std::string query = "SELECT id, username, password_hash, email, role, created_at, updated_at FROM users ORDER BY username;";
    auto stmt = db.prepare(query);

    while (stmt.step()) {
        users.emplace_back(stmt.getInt(0), stmt.getString(1), stmt.getString(2), stmt.getString(3),
                           stmt.getString(4), stmt.getString(5), stmt.getString(6));
    }
    Logger::debug("UserModel: Found {} total users.", users.size());
    return users;
}

// Updates an existing user in the database.
bool User::update(Database& db, const User& user) {
    std::string query = "UPDATE users SET username = ?, password_hash = ?, email = ?, role = ?, updated_at = ? WHERE id = ?;";
    auto stmt = db.prepare(query);
    stmt.bind(1, user.getUsername());
    stmt.bind(2, user.getPasswordHash());
    stmt.bind(3, user.getEmail());
    stmt.bind(4, user.getRole());
    stmt.bind(5, user.getUpdatedAt());
    stmt.bind(6, user.getId());

    if (stmt.execute()) {
        Logger::debug("UserModel: Updated user with ID {}.", user.getId());
        return true;
    } else {
        Logger::error("UserModel: Failed to update user with ID {}.", user.getId());
        throw std::runtime_error("Failed to update user.");
    }
}

// Deletes a user by ID.
bool User::remove(Database& db, int id) {
    std::string query = "DELETE FROM users WHERE id = ?;";
    auto stmt = db.prepare(query);
    stmt.bind(1, id);

    if (stmt.execute()) {
        Logger::debug("UserModel: Deleted user with ID {}.", id);
        return true;
    } else {
        Logger::error("UserModel: Failed to delete user with ID {}.", id);
        throw std::runtime_error("Failed to delete user.");
    }
}
```