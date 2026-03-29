```cpp
#include "User.h"

User::User(int id, std::string email, std::string password_hash, std::string role, std::string created_at, std::string updated_at)
    : id_(id), email_(std::move(email)), password_hash_(std::move(password_hash)), role_(std::move(role)), created_at_(std::move(created_at)), updated_at_(std::move(updated_at)) {}

User::User(std::string email, std::string password_hash, std::string role)
    : email_(std::move(email)), password_hash_(std::move(password_hash)), role_(std::move(role)) {}

nlohmann::json User::toJson() const {
    nlohmann::json j;
    if (id_) {
        j["id"] = *id_;
    }
    j["email"] = email_;
    j["role"] = role_;
    if (!created_at_.empty()) {
        j["createdAt"] = created_at_;
    }
    if (!updated_at_.empty()) {
        j["updatedAt"] = updated_at_;
    }
    return j;
}
```