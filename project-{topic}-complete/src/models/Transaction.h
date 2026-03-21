```cpp
#ifndef TRANSACTION_H
#define TRANSACTION_H

#include <string>
#include <optional>
#include <nlohmann/json.hpp>

namespace PaymentProcessor {
namespace Models {

enum class TransactionType {
    PAYMENT,
    REFUND,
    WITHDRAWAL,
    DEPOSIT
};

enum class TransactionStatus {
    PENDING,
    COMPLETED,
    FAILED,
    REFUNDED,
    CANCELLED
};

// Helper for JSON serialization of enums
NLOHMANN_JSON_SERIALIZE_ENUM(TransactionType, {
    {TransactionType::PAYMENT, "PAYMENT"},
    {TransactionType::REFUND, "REFUND"},
    {TransactionType::WITHDRAWAL, "WITHDRAWAL"},
    {TransactionType::DEPOSIT, "DEPOSIT"}
})

NLOHMANN_JSON_SERIALIZE_ENUM(TransactionStatus, {
    {TransactionStatus::PENDING, "PENDING"},
    {TransactionStatus::COMPLETED, "COMPLETED"},
    {TransactionStatus::FAILED, "FAILED"},
    {TransactionStatus::REFUNDED, "REFUNDED"},
    {TransactionStatus::CANCELLED, "CANCELLED"}
})

struct Transaction {
    std::optional<long long> id;
    long long accountId;
    std::string externalId; // Transaction ID from external gateway
    TransactionType type;
    double amount;
    std::string currency;
    TransactionStatus status;
    std::string description;
    std::string createdAt;
    std::string updatedAt;

    Transaction() : accountId(0), type(TransactionType::PAYMENT), amount(0.0), status(TransactionStatus::PENDING) {}

    // Constructor for new transaction
    Transaction(long long accountId, std::string externalId, TransactionType type, double amount, std::string currency, std::string description)
        : accountId(accountId), externalId(std::move(externalId)), type(type), amount(amount), currency(std::move(currency)), status(TransactionStatus::PENDING), description(std::move(description)) {}

    // Constructor for loading from DB
    Transaction(long long id, long long accountId, std::string externalId, TransactionType type, double amount, std::string currency, TransactionStatus status, std::string description, std::string createdAt, std::string updatedAt)
        : id(id), accountId(accountId), externalId(std::move(externalId)), type(type), amount(amount), currency(std::move(currency)), status(status), description(std::move(description)), createdAt(std::move(createdAt)), updatedAt(std::move(updatedAt)) {}

    nlohmann::json toJson() const {
        nlohmann::json j;
        if (id) j["id"] = *id;
        j["accountId"] = accountId;
        j["externalId"] = externalId;
        j["type"] = type;
        j["amount"] = amount;
        j["currency"] = currency;
        j["status"] = status;
        j["description"] = description;
        j["createdAt"] = createdAt;
        j["updatedAt"] = updatedAt;
        return j;
    }
};

} // namespace Models
} // namespace PaymentProcessor

#endif // TRANSACTION_H
```