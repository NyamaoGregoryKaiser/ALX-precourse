```cpp
#include "TransactionService.h"
#include "AccountService.h" // Needed for account balance updates

namespace PaymentProcessor {
namespace Services {

void TransactionService::validateTransactionInput(long long accountId, double amount, const std::string& currency) {
    if (accountId <= 0) {
        throw InvalidArgumentException("Invalid account ID.");
    }
    if (amount <= 0) {
        throw InvalidArgumentException("Transaction amount must be positive.");
    }
    if (currency.empty()) {
        throw InvalidArgumentException("Transaction currency cannot be empty.");
    }
    // Further currency validation (e.g., ISO 4217 code check) can be added here.
}

Transaction TransactionService::processTransaction(long long accountId, const std::string& externalId, TransactionType type, double amount, const std::string& currency, const std::string& description) {
    LOG_INFO("Processing transaction for account ID {}. Type: {}, Amount: {}", accountId, nlohmann::json(type).get<std::string>(), amount);

    validateTransactionInput(accountId, amount, currency);

    AccountService accountService(dbManager); // Create a temporary service instance

    // Check if account exists and is active
    auto account_opt = accountService.getAccountById(accountId);
    if (!account_opt.has_value()) {
        LOG_WARN("Transaction failed: Account ID {} not found.", accountId);
        throw NotFoundException("Account with ID " + std::to_string(accountId) + " not found.");
    }
    Account account = account_opt.value();
    if (account.status != "ACTIVE") {
        LOG_WARN("Transaction failed: Account ID {} is not active (status: {}).", accountId, account.status);
        throw InvalidArgumentException("Account is not active.");
    }
    if (account.currency != currency) {
        LOG_WARN("Transaction failed: Account currency '{}' mismatch with transaction currency '{}' for account ID {}.", account.currency, currency, accountId);
        throw InvalidArgumentException("Account currency mismatch with transaction currency.");
    }

    // Determine impact on account balance
    double balanceChange = 0;
    TransactionStatus initialStatus = TransactionStatus::PENDING;

    switch (type) {
        case TransactionType::PAYMENT:
        case TransactionType::WITHDRAWAL:
            balanceChange = -amount; // Debit from account
            break;
        case TransactionType::REFUND:
        case TransactionType::DEPOSIT:
            balanceChange = amount;  // Credit to account
            break;
        default:
            LOG_ERROR("Unsupported transaction type: {} for account ID {}.", nlohmann::json(type).get<std::string>(), accountId);
            throw InvalidArgumentException("Unsupported transaction type.");
    }

    // Simulate external gateway processing. In a real system, this would involve API calls
    // to Stripe, PayPal, etc., and handling their webhooks for final status.
    // For this example, we'll assume it generally succeeds or fails immediately.
    TransactionStatus finalStatus = TransactionStatus::COMPLETED;
    try {
        // Attempt to update account balance first (if payment processing is synchronous and affects internal balance immediately)
        // This should ideally be part of a larger, atomic transaction if using a more complex DB or distributed transactions.
        accountService.updateAccountBalance(accountId, balanceChange);
        LOG_DEBUG("Account ID {} balance updated by {}.", accountId, balanceChange);
    } catch (const InvalidArgumentException& e) { // Catching InsufficientFunds from AccountService
        finalStatus = TransactionStatus::FAILED;
        LOG_ERROR("Transaction failed due to insufficient funds for account ID {}: {}", accountId, e.what());
        // Re-throw if it's a critical business error
        throw;
    } catch (const PaymentProcessorException& e) {
        finalStatus = TransactionStatus::FAILED;
        LOG_ERROR("Transaction failed due to account balance update error for account ID {}: {}", accountId, e.what());
        throw PaymentProcessorException("Transaction processing failed due to account error.");
    }


    // Create the transaction record
    Transaction newTransaction(accountId, externalId, type, amount, currency, description);
    newTransaction.status = finalStatus; // Set the determined final status
    long long newId = dbManager.createTransaction(newTransaction);
    if (newId == 0) {
        LOG_ERROR("Failed to create transaction record in database for account ID {}.", accountId);
        throw PaymentProcessorException("Failed to record transaction due to an unexpected database error.");
    }
    newTransaction.id = newId;

    // Retrieve the created transaction to ensure consistency and get timestamps
    auto createdTransaction = dbManager.findTransactionById(newId);
    if (!createdTransaction) {
        LOG_ERROR("Failed to retrieve newly created transaction (ID: {}) from database.", newId);
        throw PaymentProcessorException("Transaction created but could not be retrieved immediately.");
    }

    if (createdTransaction->status == TransactionStatus::COMPLETED) {
        LOG_INFO("Transaction ID {} (Type: {}, Amount: {}) processed and completed for account ID {}.", newId, nlohmann::json(type).get<std::string>(), amount, accountId);
    } else {
        LOG_WARN("Transaction ID {} (Type: {}, Amount: {}) processed but failed for account ID {}.", newId, nlohmann::json(type).get<std::string>(), amount, accountId);
    }

    return *createdTransaction;
}

std::optional<Transaction> TransactionService::getTransactionById(long long transactionId) {
    LOG_DEBUG("Retrieving transaction with ID: {}", transactionId);
    auto transaction_opt = dbManager.findTransactionById(transactionId);
    if (!transaction_opt.has_value()) {
        LOG_DEBUG("Transaction with ID {} not found.", transactionId);
    } else {
        LOG_DEBUG("Transaction with ID {} retrieved.", transactionId);
    }
    return transaction_opt;
}

PaginatedResponseDTO<Transaction> TransactionService::getTransactionsByAccountId(long long accountId, int page, int pageSize) {
    LOG_DEBUG("Retrieving transactions for account ID {}. Page: {}, PageSize: {}", accountId, page, pageSize);

    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 20; // Default page size
    if (pageSize > 100) pageSize = 100; // Max page size

    int offset = (page - 1) * pageSize;

    // First, count total items for pagination metadata
    // (This requires adding a count method to DatabaseManager or running a separate query)
    // For now, we'll mock totalItems or simplify. In a real system:
    // int totalItems = dbManager.countTransactionsByAccountId(accountId);
    // For demo, let's assume we can query directly
    int totalItems = 0;
    try {
        sqlite3pp::query qry(*dbManager.db, "SELECT COUNT(*) FROM transactions WHERE account_id = ?");
        qry.bind(1, accountId);
        for (auto& row : qry) {
            totalItems = row.get<int>(0);
        }
    } catch (const sqlite3pp::database_error& e) {
        LOG_ERROR("Failed to count transactions for account ID {}: {}", accountId, e.what());
        throw DatabaseException("Failed to count transactions: " + std::string(e.what()));
    }


    std::vector<Transaction> transactions = dbManager.findTransactionsByAccountId(accountId, pageSize, offset);

    LOG_DEBUG("Found {} transactions (total: {}) for account ID {} on page {} (pageSize {}).", transactions.size(), totalItems, accountId, page, pageSize);

    PaginatedResponseDTO<Transaction> response;
    response.items = transactions;
    response.totalItems = totalItems;
    response.page = page;
    response.pageSize = pageSize;
    return response;
}

Transaction TransactionService::updateTransactionStatus(long long transactionId, TransactionStatus newStatus) {
    LOG_INFO("Updating status for transaction ID {} to {}.", transactionId, nlohmann::json(newStatus).get<std::string>());

    auto transaction_opt = dbManager.findTransactionById(transactionId);
    if (!transaction_opt.has_value()) {
        LOG_WARN("Transaction status update failed: Transaction ID {} not found.", transactionId);
        throw NotFoundException("Transaction with ID " + std::to_string(transactionId) + " not found.");
    }
    Transaction transaction = transaction_opt.value();

    // Prevent updating status if it's already finalized (e.g., COMPLETED, FAILED, REFUNDED) unless specific logic dictates.
    if (transaction.status == TransactionStatus::COMPLETED ||
        transaction.status == TransactionStatus::FAILED ||
        transaction.status == TransactionStatus::REFUNDED) {
        LOG_WARN("Transaction status update failed: Transaction ID {} is already in a final state ({}).", transactionId, nlohmann::json(transaction.status).get<std::string>());
        // Consider if a specific newStatus (e.g., REFUNDED from COMPLETED) is allowed.
        // For simplicity, we'll allow it only if newStatus makes sense (e.g. COMPLETED -> REFUNDED).
        if (transaction.status == TransactionStatus::COMPLETED && newStatus == TransactionStatus::REFUNDED) {
            // This is allowed, proceed.
        } else {
             throw InvalidArgumentException("Transaction status cannot be changed from a final state.");
        }
    }

    transaction.status = newStatus;
    if (!dbManager.updateTransactionStatus(transactionId, newStatus)) {
        LOG_ERROR("Failed to update transaction ID {} status in database.", transactionId);
        throw PaymentProcessorException("Failed to update transaction status due to a database error.");
    }

    // Retrieve updated transaction to get latest timestamps
    auto updatedTransaction = dbManager.findTransactionById(transactionId);
    if (!updatedTransaction) {
        LOG_ERROR("Failed to retrieve updated transaction (ID: {}) from database.", transactionId);
        throw PaymentProcessorException("Transaction updated but could not be retrieved immediately.");
    }

    LOG_INFO("Transaction ID {} status updated to {}.", transactionId, nlohmann::json(newStatus).get<std::string>());
    return *updatedTransaction;
}

Transaction TransactionService::refundTransaction(long long originalTransactionId, const std::string& refundExternalId, double refundAmount, const std::string& description) {
    LOG_INFO("Initiating refund for original transaction ID {}. Amount: {}", originalTransactionId, refundAmount);

    auto originalTransaction_opt = dbManager.findTransactionById(originalTransactionId);
    if (!originalTransaction_opt.has_value()) {
        LOG_WARN("Refund failed: Original transaction ID {} not found.", originalTransactionId);
        throw NotFoundException("Original transaction with ID " + std::to_string(originalTransactionId) + " not found.");
    }
    Transaction originalTransaction = originalTransaction_opt.value();

    if (originalTransaction.status != TransactionStatus::COMPLETED) {
        LOG_WARN("Refund failed: Original transaction ID {} is not in 'COMPLETED' status (current: {}).", originalTransactionId, nlohmann::json(originalTransaction.status).get<std::string>());
        throw InvalidArgumentException("Only 'COMPLETED' transactions can be refunded.");
    }
    if (originalTransaction.type != TransactionType::PAYMENT) {
        LOG_WARN("Refund failed: Original transaction ID {} is not a 'PAYMENT' type (current: {}).", originalTransactionId, nlohmann::json(originalTransaction.type).get<std::string>());
        throw InvalidArgumentException("Only 'PAYMENT' transactions can be refunded.");
    }
    if (refundAmount <= 0 || refundAmount > originalTransaction.amount) {
        LOG_WARN("Refund failed: Invalid refund amount {} for original transaction ID {}. Max allowed: {}", refundAmount, originalTransactionId, originalTransaction.amount);
        throw InvalidArgumentException("Invalid refund amount. Must be positive and not exceed original transaction amount.");
    }

    // Create a new REFUND transaction
    Transaction refundTransaction(
        originalTransaction.accountId,
        refundExternalId, // New external ID for the refund
        TransactionType::REFUND,
        refundAmount,
        originalTransaction.currency,
        description.empty() ? "Refund for transaction " + std::to_string(originalTransactionId) : description
    );

    // This will credit the account and set initial status
    Transaction createdRefund = processTransaction(
        refundTransaction.accountId,
        refundTransaction.externalId,
        refundTransaction.type,
        refundTransaction.amount,
        refundTransaction.currency,
        refundTransaction.description
    );

    // Optionally update the original transaction's status to REFUNDED if fully refunded, or partially_refunded (if we had such a status)
    if (refundAmount == originalTransaction.amount) {
        updateTransactionStatus(originalTransactionId, TransactionStatus::REFUNDED);
    } else {
        // For partial refunds, you might need a "PARTIALLY_REFUNDED" status or link refunds explicitly.
        // For simplicity, we just log and keep original status COMPLETED.
        LOG_INFO("Partial refund processed for transaction ID {}. Original transaction status remains COMPLETED.", originalTransactionId);
    }


    LOG_INFO("Refund transaction ID {} created for original transaction ID {}.", *createdRefund.id, originalTransactionId);
    return createdRefund;
}

} // namespace Services
} // namespace PaymentProcessor
```