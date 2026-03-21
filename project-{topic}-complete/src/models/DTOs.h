```cpp
#ifndef DTOS_H
#define DTOS_H

#include <string>
#include <vector>
#include <nlohmann/json.hpp>
#include "User.h"
#include "Account.h"
#include "Transaction.h"

namespace PaymentProcessor {
namespace Models {

// --- Auth DTOs ---
struct RegisterUserRequestDTO {
    std::string username;
    std::string password;
    std::string email;
    std::string role; // ADMIN, MERCHANT, VIEWER

    void from_json(const nlohmann::json& j) {
        j.at("username").get_to(username);
        j.at("password").get_to(password);
        j.at("email").get_to(email);
        j.at("role").get_to(role);
    }
};

struct LoginRequestDTO {
    std::string username;
    std::string password;

    void from_json(const nlohmann::json& j) {
        j.at("username").get_to(username);
        j.at("password").get_to(password);
    }
};

struct LoginResponseDTO {
    std::string token;
    User user;

    nlohmann::json toJson() const {
        nlohmann::json j;
        j["token"] = token;
        j["user"] = user.toJson();
        return j;
    }
};

// --- Account DTOs ---
struct CreateAccountRequestDTO {
    long long userId;
    std::string name;
    std::string currency;
    double initialBalance;

    void from_json(const nlohmann::json& j) {
        j.at("userId").get_to(userId);
        j.at("name").get_to(name);
        j.at("currency").get_to(currency);
        j.at("initialBalance").get_to(initialBalance);
    }
};

struct UpdateAccountRequestDTO {
    std::string name;
    std::string status; // ACTIVE, INACTIVE, SUSPENDED

    void from_json(const nlohmann::json& j) {
        if (j.contains("name")) j.at("name").get_to(name);
        if (j.contains("status")) j.at("status").get_to(status);
    }
};

// --- Transaction DTOs ---
struct ProcessTransactionRequestDTO {
    long long accountId;
    std::string externalId; // e.g., payment gateway reference
    std::string type;       // PAYMENT, REFUND, WITHDRAWAL, DEPOSIT
    double amount;
    std::string currency;
    std::string description;

    void from_json(const nlohmann::json& j) {
        j.at("accountId").get_to(accountId);
        j.at("externalId").get_to(externalId);
        j.at("type").get_to(type);
        j.at("amount").get_to(amount);
        j.at("currency").get_to(currency);
        j.at("description").get_to(description);
    }
};

struct UpdateTransactionStatusRequestDTO {
    std::string status; // PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED

    void from_json(const nlohmann::json& j) {
        j.at("status").get_to(status);
    }
};

// --- Pagination/List DTOs ---
template <typename T>
struct PaginatedResponseDTO {
    std::vector<T> items;
    int totalItems;
    int page;
    int pageSize;

    nlohmann::json toJson() const {
        nlohmann::json j;
        j["items"] = nlohmann::json::array();
        for (const auto& item : items) {
            j["items"].push_back(item.toJson());
        }
        j["totalItems"] = totalItems;
        j["page"] = page;
        j["pageSize"] = pageSize;
        return j;
    }
};

} // namespace Models
} // namespace PaymentProcessor

#endif // DTOS_H
```