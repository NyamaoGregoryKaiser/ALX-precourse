```cpp
#ifndef USER_HPP
#define USER_HPP

#include "../database/Database.hpp"
#include <nlohmann/json.hpp>
#include <string>
#include <optional>
#include <vector>

// User class represents a user in the system.
class User {
public:
    // Constructor for creating a new User object.
    User(int id, const std::string& username, const std::string& passwordHash, const std::string& email,
         const std::string& role = "user", const std::string& createdAt = "", const std::string& updatedAt = "");

    // Getters
    int getId() const;
    const std::string& getUsername() const;
    const std::string& getPasswordHash() const;
    const std::string& getEmail() const;
    const std::string& getRole() const;
    const std::string& getCreatedAt() const;
    const std::string& getUpdatedAt() const;

    // Setters (automatically updates `updatedAt` timestamp)
    void setUsername(const std::string& newUsername);
    void setPasswordHash(const std::string& newPasswordHash);
    void setEmail(const std::string& newEmail);
    void setRole(const std::string& newRole); // Validates role value

    // Converts the User object to a JSON object.
    nlohmann::json toJson() const;

    // --- Static Database Operations ---

    // Creates a new user in the database. Returns the ID of the new user.
    static int create(Database& db, const User& user);

    // Finds a user by ID. Returns std::nullopt if not found.
    static std::optional<User> findById(Database& db, int id);

    // Finds a user by username. Returns std::nullopt if not found.
    static std::optional<User> findByUsername(Database& db, const std::string& username);

    // Finds a user by email. Returns std::nullopt if not found.
    static std::optional<User> findByEmail(Database& db, const std::string& email);

    // Retrieves all users from the database.
    static std::vector<User> findAll(Database& db);

    // Updates an existing user in the database.
    static bool update(Database& db, const User& user);

    // Deletes a user by ID.
    static bool remove(Database& db, int id);

private:
    int id;
    std::string username;
    std::string passwordHash;
    std::string email;
    std::string role; // "user", "admin"
    std::string createdAt;
    std::string updatedAt;

    // Helper to update the 'updatedAt' timestamp.
    void updateTimestamp();
};

#endif // USER_HPP
```