```cpp
#ifndef ACCOUNT_H
#define ACCOUNT_H

#include <string>
#include <optional>
#include <nlohmann/json.hpp>

namespace PaymentProcessor {
namespace Models {

struct Account {
    std::optional<long long> id;
    long long userId; // Owner of the account (e.g., merchant)
    std::string name;
    std::string currency; // e.g., "USD", "EUR"
    double balance;
    std::string status; // e.g., "ACTIVE", "INACTIVE", "SUSPENDED"
    std::string createdAt;
    std::string updatedAt;

    Account() : userId(0), balance(0.0) {} // Default constructor

    // Constructor for creating new account
    Account(long long userId, std::string name, std::string currency, double balance, std::string status)
        : userId(userId), name(std::move(name)), currency(std::move(currency)), balance(balance), status(std::move(status)) {}

    // Constructor for loading from DB
    Account(long long id, long long userId, std::string name, std::string currency, double balance, std::string status, std::string createdAt, std::string updatedAt)
        : id(id), userId(userId), name(std::move(name)), currency(std::move(currency)), balance(balance), status(std::move(status)), createdAt(std::move(createdAt)), updatedAt(std::move(updatedAt)) {}

    nlohmann::json toJson() const {
        nlohmann::json j;
        if (id) j["id"] = *id;
        j["userId"] = userId;
        j["name"] = name;
        j["currency"] = currency;
        j["balance"] = balance;
        j["status"] = status;
        j["createdAt"] = createdAt;
        j["updatedAt"] = updatedAt;
        return j;
    }
};

} // namespace Models
} // namespace PaymentProcessor

#endif // ACCOUNT_H
```