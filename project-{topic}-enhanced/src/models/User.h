#pragma once

#include <string>
#include <vector>
#include <optional>
#include <chrono>

enum class UserRole {
    USER,
    ADMIN
};

// Helper for string conversion of UserRole
inline std::string user_role_to_string(UserRole role) {
    switch (role) {
        case UserRole::USER: return "USER";
        case UserRole::ADMIN: return "ADMIN";
        default: return "UNKNOWN";
    }
}

inline std::optional<UserRole> string_to_user_role(const std::string& s) {
    if (s == "USER") return UserRole::USER;
    if (s == "ADMIN") return UserRole::ADMIN;
    return std::nullopt;
}

struct User {
    int id = 0;
    std::string username;
    std::string email;
    std::string password_hash; // Hashed password
    UserRole role = UserRole::USER;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;

    bool is_admin() const { return role == UserRole::ADMIN; }
};