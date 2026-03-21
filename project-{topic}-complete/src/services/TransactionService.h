```cpp
#ifndef TRANSACTION_SERVICE_H
#define TRANSACTION_SERVICE_H

#include <string>
#include <vector>
#include <optional>
#include "../models/Transaction.h"
#include "../models/Account.h"
#include "../database/DatabaseManager.h"
#include "../exceptions/CustomExceptions.h"
#include "../utils/Logger.h"
#include "../config/AppConfig.h"

namespace PaymentProcessor {
namespace Services {

using namespace PaymentProcessor::Models;
using namespace PaymentProcessor::Database;
using namespace PaymentProcessor::Exceptions;
using namespace PaymentProcessor::Utils;
using namespace PaymentProcessor::Config;

class TransactionService {
public:
    explicit TransactionService(DatabaseManager& dbManager) : dbManager(dbManager) {}

    // Process a new payment transaction
    Transaction processTransaction(long long accountId, const std::string& externalId, TransactionType type, double amount, const std::string& currency, const std::string& description);

    // Get a transaction by its ID
    std::optional<Transaction> getTransactionById(long long transactionId);

    // Get all transactions for a specific account, with pagination
    PaginatedResponseDTO<Transaction> getTransactionsByAccountId(long long accountId, int page, int pageSize);

    // Update the status of a transaction
    Transaction updateTransactionStatus(long long transactionId, TransactionStatus newStatus);

    // Simulate a refund (creates a new REFUND transaction linked to original, or updates original)
    Transaction refundTransaction(long long originalTransactionId, const std::string& refundExternalId, double refundAmount, const std::string& description);

private:
    DatabaseManager& dbManager;

    // Helper to validate transaction fields (e.g., amount, currency)
    void validateTransactionInput(long long accountId, double amount, const std::string& currency);
};

} // namespace Services
} // namespace PaymentProcessor

#endif // TRANSACTION_SERVICE_H
```