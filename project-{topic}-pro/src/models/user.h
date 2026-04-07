```cpp
#ifndef WEBSCRAPER_USER_H
#define WEBSCRAPER_USER_H

#include <string>
#include <chrono>
#include <nlohmann/json.hpp>

struct User {
    std::string id;
    std::string username;
    std::string email;
    std::string passwordHash; // Store hashed password
    std::chrono::system_clock::time_point createdAt;
    std::chrono::system_clock::time_point updatedAt;

    // Default constructor
    User() = default;

    // Constructor with ID
    User(const std::string& id, const std::string& username, const std::string& email, const std::string& passwordHash,
         const std::chrono::system_clock::time_point& createdAt, const std::chrono::system_clock::time_point& updatedAt)
        : id(id), username(username), email(email), passwordHash(passwordHash), createdAt(createdAt), updatedAt(updatedAt) {}

    // Convert to JSON
    nlohmann::json toJson() const {
        nlohmann::json j;
        j["id"] = id;
        j["username"] = username;
        j["email"] = email;
        // Do NOT expose passwordHash
        j["createdAt"] = std::chrono::duration_cast<std::chrono::seconds>(createdAt.time_since_epoch()).count();
        j["updatedAt"] = std::chrono::duration_cast<std::chrono::seconds>(updatedAt.time_since_epoch()).count();
        return j;
    }
};

#endif // WEBSCRAPER_USER_H
```