```cpp
#ifndef DATAVIZ_USER_H
#define DATAVIZ_USER_H

#include <string>
#include <optional>
#include <nlohmann/json.hpp>

// Forward declaration for Crow::json::wvalue
namespace crow {
    struct response;
    namespace json {
        class wvalue;
    }
}

class User {
private:
    std::optional<int> id_;
    std::string email_;
    std::string password_hash_; // Stores the hashed password
    std::string role_;          // e.g., "user", "admin"
    std::string created_at_;    // ISO 8601 string
    std::string updated_at_;    // ISO 8601 string

public:
    User() = default;
    User(int id, std::string email, std::string password_hash, std::string role, std::string created_at, std::string updated_at);
    User(std::string email, std::string password_hash, std::string role); // For new users

    // Getters
    std::optional<int> getId() const { return id_; }
    const std::string& getEmail() const { return email_; }
    const std::string& getPasswordHash() const { return password_hash_; }
    const std::string& getRole() const { return role_; }
    const std::string& getCreatedAt() const { return created_at_; }
    const std::string& getUpdatedAt() const { return updated_at_; }

    // Setters (for new users or updates)
    void setId(int id) { id_ = id; }
    void setEmail(const std::string& email) { email_ = email; }
    void setPasswordHash(const std::string& hash) { password_hash_ = hash; }
    void setRole(const std::string& role) { role_ = role; }
    void setCreatedAt(const std::string& created_at) { created_at_ = created_at; }
    void setUpdatedAt(const std::string& updated_at) { updated_at_ = updated_at; }

    // Convert User object to JSON (excluding password_hash)
    nlohmann::json toJson() const;
};

#endif // DATAVIZ_USER_H
```