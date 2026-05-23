#ifndef USER_H
#define USER_H

#include "BaseEntity.h"
#include <string>
#include <optional>
#include <nlohmann/json.hpp>

enum class UserRole {
    CUSTOMER,
    ADMIN,
    UNKNOWN // Default or error state
};

// Helper function to convert string to UserRole
UserRole string_to_user_role(const std::string& role_str);
// Helper function to convert UserRole to string
std::string user_role_to_string(UserRole role);

struct User : public BaseEntity {
    std::string username;
    std::string email;
    std::string password_hash; // Stored securely
    UserRole role;
    std::string first_name;
    std::optional<std::string> last_name; // Optional field
    std::optional<std::string> phone_number;
    std::optional<std::string> address;

    User() : BaseEntity(), role(UserRole::CUSTOMER) {} // Default role customer

    // Constructor for creating new users
    User(const std::string& username, const std::string& email, const std::string& password_hash,
         const std::string& first_name, UserRole role = UserRole::CUSTOMER);

    // Constructor for loading from DB (with all fields including optional)
    User(const std::string& id, const std::string& username, const std::string& email,
         const std::string& password_hash, UserRole role,
         const std::string& first_name, const std::optional<std::string>& last_name,
         const std::optional<std::string>& phone_number, const std::optional<std::string>& address,
         std::chrono::system_clock::time_point created_at, std::chrono::system_clock::time_point updated_at);

    // Convert User object to JSON
    nlohmann::json toJson() const override;

    // Static method to create User from JSON (e.g., from request body)
    static User fromJson(const nlohmann::json& j);

    // Static method to create User from database query result
    static User fromSql(const std::string& id, const std::string& username, const std::string& email,
                        const std::string& password_hash, const std::string& role_str,
                        const std::string& first_name, const std::optional<std::string>& last_name,
                        const std::optional<std::string>& phone_number, const std::optional<std::string>& address,
                        const std::string& created_at_str, const std::string& updated_at_str);
};

#endif // USER_H