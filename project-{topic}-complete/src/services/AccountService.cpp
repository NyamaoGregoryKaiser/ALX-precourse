```cpp
#include "AccountService.h"
#include "../config/AppConfig.h"

namespace PaymentProcessor {
namespace Services {

Account AccountService::createAccount(long long userId, const std::string& name, const std::string& currency, double initialBalance) {
    LOG_INFO("Attempting to create account '{}' for user ID {}", name, userId);

    if (name.empty() || currency.empty()) {
        LOG_WARN("Account creation failed: Missing required fields for user ID {}", userId);
        throw InvalidArgumentException("Account name and currency cannot be empty.");
    }
    if (initialBalance < 0) {
        LOG_WARN("Account creation failed: Initial balance cannot be negative for user ID {}", userId);
        throw InvalidArgumentException("Initial balance cannot be negative.");
    }

    // You might want to validate currency codes, e.g., against an ISO 4217 list
    // For simplicity, we assume any string is valid.

    // Check if the user exists
    if (!dbManager.findUserById(userId).has_value()) {
        LOG_WARN("Account creation failed: User ID {} does not exist.", userId);
        throw NotFoundException("User with ID " + std::to_string(userId) + " not found.");
    }

    Account newAccount(userId, name, currency, initialBalance, "ACTIVE"); // Default status
    long long newId = dbManager.createAccount(newAccount);
    if (newId == 0) {
        LOG_ERROR("Failed to create account in database for user ID {}, but no exception was thrown by dbManager.", userId);
        throw PaymentProcessorException("Failed to create account due to an unexpected database error.");
    }
    newAccount.id = newId;

    auto createdAccount = dbManager.findAccountById(newId);
    if (!createdAccount) {
        LOG_ERROR("Failed to retrieve newly created account (ID: {}) from database.", newId);
        throw PaymentProcessorException("Account created but could not be retrieved immediately.");
    }

    LOG_INFO("Account '{}' (ID: {}) created successfully for user ID {}.", name, newId, userId);
    return *createdAccount;
}

std::optional<Account> AccountService::getAccountById(long long accountId) {
    LOG_DEBUG("Retrieving account with ID: {}", accountId);
    auto account_opt = dbManager.findAccountById(accountId);
    if (!account_opt.has_value()) {
        LOG_DEBUG("Account with ID {} not found.", accountId);
    } else {
        LOG_DEBUG("Account with ID {} retrieved.", accountId);
    }
    return account_opt;
}

std::vector<Account> AccountService::getAccountsByUserId(long long userId) {
    LOG_DEBUG("Retrieving accounts for user ID: {}", userId);
    auto accounts = dbManager.findAccountsByUserId(userId);
    LOG_DEBUG("Found {} accounts for user ID {}.", accounts.size(), userId);
    return accounts;
}

Account AccountService::updateAccount(long long accountId, const std::string& name, const std::string& status) {
    LOG_INFO("Attempting to update account ID {}.", accountId);

    auto existingAccount_opt = dbManager.findAccountById(accountId);
    if (!existingAccount_opt.has_value()) {
        LOG_WARN("Account update failed: Account ID {} not found.", accountId);
        throw NotFoundException("Account with ID " + std::to_string(accountId) + " not found.");
    }
    Account existingAccount = existingAccount_opt.value();

    if (!name.empty()) {
        existingAccount.name = name;
    }
    if (!status.empty()) {
        // Validate status if necessary (e.g., "ACTIVE", "INACTIVE", "SUSPENDED")
        if (status != "ACTIVE" && status != "INACTIVE" && status != "SUSPENDED") {
            LOG_WARN("Account update failed: Invalid status '{}' for account ID {}.", status, accountId);
            throw InvalidArgumentException("Invalid account status: " + status);
        }
        existingAccount.status = status;
    }

    if (!dbManager.updateAccount(existingAccount)) {
        LOG_ERROR("Failed to update account ID {} in database, but no exception was thrown by dbManager.", accountId);
        throw PaymentProcessorException("Failed to update account due to an unexpected database error.");
    }

    // Retrieve the updated account to ensure consistency and get latest timestamps
    auto updatedAccount = dbManager.findAccountById(accountId);
    if (!updatedAccount) {
        LOG_ERROR("Failed to retrieve updated account (ID: {}) from database.", accountId);
        throw PaymentProcessorException("Account updated but could not be retrieved immediately.");
    }

    LOG_INFO("Account ID {} updated successfully.", accountId);
    return *updatedAccount;
}

bool AccountService::deleteAccount(long long accountId) {
    LOG_INFO("Attempting to delete account ID {}.", accountId);
    if (!dbManager.findAccountById(accountId).has_value()) {
        LOG_WARN("Account deletion failed: Account ID {} not found.", accountId);
        throw NotFoundException("Account with ID " + std::to_string(accountId) + " not found.");
    }
    bool success = dbManager.deleteAccount(accountId);
    if (success) {
        LOG_INFO("Account ID {} deleted successfully.", accountId);
    } else {
        LOG_ERROR("Failed to delete account ID {} from database.", accountId);
        throw PaymentProcessorException("Failed to delete account due to a database error.");
    }
    return success;
}

bool AccountService::updateAccountBalance(long long accountId, double amountChange) {
    LOG_DEBUG("Updating balance for account ID {} by {}.", accountId, amountChange);
    auto account_opt = dbManager.findAccountById(accountId);
    if (!account_opt.has_value()) {
        LOG_WARN("Balance update failed: Account ID {} not found.", accountId);
        throw NotFoundException("Account with ID " + std::to_string(accountId) + " not found.");
    }

    Account account = account_opt.value();
    double newBalance = account.balance + amountChange;

    if (newBalance < 0) {
        LOG_WARN("Balance update failed: Insufficient funds for account ID {}. Current balance: {}, Change: {}. New balance would be {}.", accountId, account.balance, amountChange, newBalance);
        throw InvalidArgumentException("Insufficient funds for account ID " + std::to_string(accountId));
    }

    account.balance = newBalance;
    bool success = dbManager.updateAccount(account);
    if (success) {
        LOG_INFO("Account ID {} balance updated to {}.", accountId, newBalance);
    } else {
        LOG_ERROR("Failed to update account ID {} balance in database.", accountId);
        throw PaymentProcessorException("Failed to update account balance due to a database error.");
    }
    return success;
}

} // namespace Services
} // namespace PaymentProcessor
```