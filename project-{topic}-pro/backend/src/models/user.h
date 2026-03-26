#pragma once
#include <string>
#include <vector>
#include <ctime>
#include <optional>

enum class UserRole {
    GUEST,
    USER,
    EDITOR,
    ADMIN
};

struct User {
    std::optional<long long> id;
    std::string username;
    std::string email;
    std::string password_hash; // Store hashed passwords
    UserRole role;
    std::time_t created_at;
    std::time_t updated_at;

    // Default constructor
    User() : role(UserRole::GUEST), created_at(0), updated_at(0) {}

    // Constructor for creating new users (without ID yet)
    User(const std::string& username, const std::string& email, const std::string& password_hash,
         UserRole role = UserRole::USER)
        : username(username), email(email), password_hash(password_hash), role(role) {
        std::time(&created_at);
        updated_at = created_at;
    }

    // Full constructor (e.g., when loading from DB)
    User(long long id, const std::string& username, const std::string& email, const std::string& password_hash,
         UserRole role, std::time_t created_at, std::time_t updated_at)
        : id(id), username(username), email(email), password_hash(password_hash),
          role(role), created_at(created_at), updated_at(updated_at) {}

    // Convert UserRole to string
    static std::string role_to_string(UserRole role) {
        switch (role) {
            case UserRole::GUEST: return "guest";
            case UserRole::USER: return "user";
            case UserRole::EDITOR: return "editor";
            case UserRole::ADMIN: return "admin";
            default: return "unknown";
        }
    }

    // Convert string to UserRole
    static UserRole string_to_role(const std::string& role_str) {
        if (role_str == "guest") return UserRole::GUEST;
        if (role_str == "user") return UserRole::USER;
        if (role_str == "editor") return UserRole::EDITOR;
        if (role_str == "admin") return UserRole::ADMIN;
        return UserRole::GUEST; // Default or throw error
    }
};

// Simple DTOs for API requests/responses
struct UserCreateDTO {
    std::string username;
    std::string email;
    std::string password;
    std::optional<std::string> role; // Admin only can set roles
};

struct UserUpdateDTO {
    std::optional<std::string> username;
    std::optional<std::string> email;
    std::optional<std::string> password;
    std::optional<std::string> role;
};

struct UserResponseDTO {
    long long id;
    std::string username;
    std::string email;
    std::string role;
    std::time_t created_at;
    std::time_t updated_at;

    static UserResponseDTO from_user(const User& user) {
        if (!user.id) {
            throw std::runtime_error("User must have an ID to create a response DTO");
        }
        return UserResponseDTO{
            user.id.value(),
            user.username,
            user.email,
            User::role_to_string(user.role),
            user.created_at,
            user.updated_at
        };
    }
};