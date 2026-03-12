```cpp
#ifndef PAYMENT_PROCESSOR_USER_HPP
#define PAYMENT_PROCESSOR_USER_HPP

#include <string>
#include <vector>
#include <nlohmann/json.hpp>
#include <optional>

enum class UserRole {
    Admin,
    Merchant,
    Customer
};

NLOHMANN_JSON_SERIALIZE_ENUM(UserRole, {
    {UserRole::Admin, "admin"},
    {UserRole::Merchant, "merchant"},
    {UserRole::Customer, "customer"}
})

class User {
public:
    long id;
    std::string username;
    std::string email;
    std::string hashedPassword; // Store hashed password
    UserRole role;
    std::string createdAt; // ISO 8601 string
    std::string updatedAt; // ISO 8601 string

    User() : id(0), role(UserRole::Customer) {} // Default constructor

    User(long id, std::string username, std::string email, std::string hashedPassword,
         UserRole role, std::string createdAt, std::string updatedAt)
        : id(id), username(std::move(username)), email(std::move(email)),
          hashedPassword(std::move(hashedPassword)), role(role),
          createdAt(std::move(createdAt)), updatedAt(std::move(updatedAt)) {}

    nlohmann::json toJson() const;
    static User fromJson(const nlohmann::json& j);

    // Equality operator for testing
    bool operator==(const User& other) const {
        return id == other.id &&
               username == other.username &&
               email == other.email &&
               role == other.role; // Don't compare hashed password for simple equality
    }
};

#endif // PAYMENT_PROCESSOR_USER_HPP
```