```cpp
#ifndef ECOMMERCE_USER_H
#define ECOMMERCE_USER_H

#include <string>
#include <chrono>

enum class UserRole {
    CUSTOMER,
    ADMIN
};

// Helper to convert string to UserRole
inline UserRole string_to_user_role(const std::string& role_str) {
    if (role_str == "admin") {
        return UserRole::ADMIN;
    }
    return UserRole::CUSTOMER; // Default or 'customer'
}

// Helper to convert UserRole to string
inline std::string user_role_to_string(UserRole role) {
    switch (role) {
        case UserRole::ADMIN: return "admin";
        case UserRole::CUSTOMER: return "customer";
    }
    return "unknown"; // Should not happen
}

struct User {
    int id;
    std::string username;
    std::string email;
    std::string password_hash;
    UserRole role;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;

    User() : id(0), role(UserRole::CUSTOMER), created_at(), updated_at() {}

    bool is_admin() const {
        return role == UserRole::ADMIN;
    }
    bool is_customer() const {
        return role == UserRole::CUSTOMER;
    }
};

#endif // ECOMMERCE_USER_H
```